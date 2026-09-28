/**
 * Сквозные проверки в браузере: node tests/e2e/run.mjs
 * Поднимает dev/server.js (Apps Script в эмуляторе) и проходит сценарии п. 12 ТЗ в Chromium.
 * Скриншоты — в tests/e2e/screenshots/.
 */
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
function loadPlaywright() {
  try { return require('playwright'); } catch (e) {
    return require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
  }
}
const { chromium } = loadPlaywright();

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SHOTS = path.join(ROOT, 'tests', 'e2e', 'screenshots');
mkdirSync(SHOTS, { recursive: true });
const PORT = 8123;
const BASE = `http://localhost:${PORT}`;

const server = spawn(process.execPath, [path.join(ROOT, 'dev', 'server.js')], {
  env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'inherit'],
});
await new Promise((resolve) => server.stdout.on('data', (d) => { if (String(d).includes('http://')) resolve(); }));

const post = (p) => fetch(BASE + p, { method: 'POST' }).then((r) => r.json());
const sheet = (name) => fetch(BASE + '/dev/sheets/' + encodeURIComponent(name)).then((r) => r.json());
const setSetting = (label, value) => post(`/dev/setting?label=${encodeURIComponent(label)}&value=${encodeURIComponent(value)}`);

const launchOpts = {};
try { execSync('test -x /opt/pw-browsers/chromium'); launchOpts.executablePath = '/opt/pw-browsers/chromium'; } catch (e) { /* браузер Playwright по умолчанию */ }
const browser = await chromium.launch(launchOpts);
let failures = 0;
let n = 0;

async function scenario(name, fn) {
  n++;
  const ctx = await browser.newContext({ locale: 'ru-RU' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await fn(page, ctx);
    assert.deepEqual(errors, [], 'ошибки JS на странице');
    console.log(`ok ${n} — ${name}`);
  } catch (e) {
    failures++;
    console.log(`not ok ${n} — ${name}\n  ${String(e.stack || e).split('\n').slice(0, 6).join('\n  ')}`);
    await page.screenshot({ path: path.join(SHOTS, `fail-${n}.png`), fullPage: true }).catch(() => {});
  } finally {
    await ctx.close();
  }
}

let phoneSeq = 1000;
async function fillForm(page, over = {}) {
  phoneSeq++;
  const v = {
    fullName: 'Тестов Тест Тестович',
    phone: '701 555 ' + String(phoneSeq).slice(0, 2) + ' ' + String(phoneSeq).slice(2),
    email: `e2e${phoneSeq}@example.com`,
    satMath: '740', satRW: '720', ...over,
  };
  await page.fill('#f-fullName', v.fullName);
  await page.fill('#f-phone', '');
  await page.type('#f-phone', '+7' + v.phone.replace(/\s/g, ''));
  await page.fill('#f-email', v.email);
  await page.fill('#f-satMath', v.satMath);
  await page.fill('#f-satRW', v.satRW);
  await page.selectOption('#f-experience', '1–2 года');
  await page.selectOption('#f-source', 'hh.kz');
  await page.check('#f-consent');
  return v;
}

async function startTest(page, over) {
  await page.goto(BASE);
  await page.click('[data-action="to-form"]');
  const v = await fillForm(page, over);
  await page.click('#form-next');
  await page.waitForSelector('[data-screen="rules"]:not([hidden])');
  await page.check('#rules-ok');
  await page.click('#rules-start');
  await page.click('#modal-ok');
  await page.waitForSelector('[data-screen="test"]:not([hidden])');
  return v;
}

const RIGHT = [
  { value: '−11' }, { m: '3', b: '-1' }, { value: '96' }, { value: '5,0' },
  { choice: 'C' }, { choice: 'C' }, { choice: 'B' }, { choice: 'B' },
];

async function answer(page, i, a, explanation) {
  await page.click(`.qnav__btn[data-q="${i}"]`);
  if (a.value !== undefined) await page.fill('#ans-value', a.value);
  if (a.m !== undefined) { await page.fill('#ans-m', a.m); await page.fill('#ans-b', a.b); }
  if (a.choice) await page.check(`input[name="choice"][value="${a.choice}"]`);
  if (explanation) await page.fill('#ans-expl', explanation);
}

async function noHorizontalScroll(page, label) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  assert.ok(sw <= iw, `${label}: горизонтальная прокрутка ${sw} > ${iw}`);
}

await scenario('1, 16, 18: полный сценарий, флаги, ключей нет в странице', async (page) => {
  const responses = [];
  page.on('response', async (r) => { if (r.url().endsWith('/api')) responses.push(await r.text()); });
  await page.goto(BASE);
  await page.screenshot({ path: path.join(SHOTS, '1-start.png') });
  await page.click('[data-action="to-form"]');
  await page.click('#form-next');
  assert.equal(await page.textContent('[data-error="fullName"]'), 'Укажите ФИО: от 2 до 100 символов');
  assert.match(await page.textContent('[data-error="scores"]'), /SAT \(обе секции\) или IELTS/);
  await page.screenshot({ path: path.join(SHOTS, '2-form-errors.png'), fullPage: true });
  await fillForm(page);
  assert.match(await page.inputValue('#f-phone'), /^\+7 701 555 \d\d \d\d$/);
  await page.click('#form-next');
  await page.waitForSelector('[data-screen="rules"]:not([hidden])');
  assert.equal(await page.isDisabled('#rules-start'), true);
  await page.check('#rules-ok');
  await page.click('#rules-start');
  assert.match(await page.textContent('#modal-body'), /Таймер запустится сразу/);
  await page.click('#modal-ok');
  await page.waitForSelector('[data-screen="test"]:not([hidden])');
  assert.match(await page.textContent('#timer'), /^(30:00|29:5\d)$/);
  assert.equal(await page.isVisible('#toast'), false, 'при новом старте нет «Продолжаем ваш тест»');

  for (let i = 0; i < 8; i++) await answer(page, i, RIGHT[i], i === 2 ? '' : 'Объяснение для ученика №' + (i + 1) + ': пошагово решаем.');
  await page.click('.qnav__btn[data-q="4"]');
  assert.equal(await page.locator('.qcard__text .blank').count(), 1);
  await page.screenshot({ path: path.join(SHOTS, '3-test-rw.png'), fullPage: true });
  await page.click('.qnav__btn[data-q="6"]');
  assert.equal(await page.locator('.option__text--punct').count(), 3);
  await page.click('.qnav__btn[data-q="1"]');
  await page.screenshot({ path: path.join(SHOTS, '4-test-line.png'), fullPage: true });

  // Вставка 150 символов в объяснение и копирование условия.
  await page.click('.qnav__btn[data-q="3"]');
  await page.evaluate(() => {
    const ta = document.querySelector('#ans-expl');
    const dt = new DataTransfer();
    dt.setData('text/plain', 'x'.repeat(150));
    ta.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    const sel = window.getSelection();
    sel.selectAllChildren(document.querySelector('#qtext'));
    document.querySelector('#qtext').dispatchEvent(new ClipboardEvent('copy', { bubbles: true }));
    // Три ухода со страницы.
    for (let k = 0; k < 3; k++) { window.dispatchEvent(new Event('blur')); window.dispatchEvent(new Event('focus')); }
  });

  assert.equal(await page.textContent('#answered'), 'Отвечено: 8 из 8');
  assert.equal(await page.locator('.qnav__btn--partial').count(), 1);
  await page.click('#btn-finish');
  assert.match(await page.textContent('#modal-body'), /Без объяснения: № 3\./);
  await page.screenshot({ path: path.join(SHOTS, '5-summary.png') });
  await page.click('#modal-cancel');
  await page.click('#btn-finish');
  await page.click('#modal-ok');
  await page.waitForSelector('[data-screen="thanks"]:not([hidden])');
  assert.match(await page.textContent('#thanks-text'), /HR свяжется с вами в течение 3 рабочих дней/);
  assert.match(await page.textContent('[data-screen="thanks"] .hr-contact'), /@jts_hr/);
  await page.screenshot({ path: path.join(SHOTS, '6-thanks.png') });

  const rows = await sheet('Результаты');
  const row = rows[rows.length - 1];
  assert.equal(row['Итого'], 8);
  assert.equal(row['Автостатус'], 'Прошёл');
  assert.equal(row['Статус попытки'], 'Завершён');
  assert.equal(row['Уходы'], 3);
  assert.equal(row['Вставлено символов'], 150);
  assert.equal(row['Копирования'], 1);
  const html = await page.content();
  [html, ...responses].forEach((t) => assert.doesNotMatch(t, /"key"|3;-1|tolerance/));
  assert.equal(await page.evaluate(() => localStorage.getItem('sat.attempt')), null);
});

await scenario('9, 11: перезагрузка — ответы на месте, таймер продолжается; часы устройства не влияют', async (page) => {
  await startTest(page);
  await answer(page, 0, RIGHT[0], 'Первое объяснение');
  await answer(page, 4, RIGHT[4], '');
  await post('/dev/clock?minutes=10');
  await page.reload();
  await page.waitForSelector('[data-screen="test"]:not([hidden])');
  assert.match(await page.textContent('#toast'), /Продолжаем ваш тест, осталось (20:00|19:5\d)/);
  assert.match(await page.textContent('#timer'), /^(20:00|19:5\d)$/);
  assert.equal(await page.textContent('#answered'), 'Отвечено: 2 из 8');
  await page.click('.qnav__btn[data-q="0"]');
  assert.equal(await page.inputValue('#ans-value'), '−11');
  assert.equal(await page.inputValue('#ans-expl'), 'Первое объяснение');
  // Перевод часов устройства на час назад: остаток считается по монотонным часам.
  const before = await page.textContent('#timer');
  await page.evaluate(() => {
    const realNow = Date.now;
    Date.now = () => realNow() - 3600 * 1000;
  });
  await page.waitForTimeout(1100);
  const after = await page.textContent('#timer');
  const sec = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  assert.ok(sec(before) - sec(after) >= 0 && sec(before) - sec(after) <= 2, `${before} → ${after}`);
  await post('/dev/clock?minutes=-10');
});

await scenario('10, 14: другое устройство продолжает попытку; после завершения — «уже проходили»', async (page, ctx) => {
  const v = await startTest(page);
  await answer(page, 1, RIGHT[1], 'Наклон 3');
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForFunction(() => /Сохранено в/.test(document.querySelector('#save-status').textContent));

  const other = await ctx.browser().newContext();
  const p2 = await other.newPage();
  await p2.goto(BASE);
  await p2.click('[data-action="to-form"]');
  await p2.fill('#f-fullName', v.fullName);
  await p2.fill('#f-phone', '+7' + v.phone.replace(/\s/g, ''));
  await p2.fill('#f-email', v.email);
  await p2.fill('#f-satMath', '740');
  await p2.fill('#f-satRW', '720');
  await p2.selectOption('#f-experience', '1–2 года');
  await p2.selectOption('#f-source', 'hh.kz');
  await p2.check('#f-consent');
  await p2.click('#form-next');
  await p2.waitForSelector('[data-screen="test"]:not([hidden])');
  await p2.click('.qnav__btn[data-q="1"]');
  assert.equal(await p2.inputValue('#ans-m'), '3');
  assert.equal(await p2.inputValue('#ans-expl'), 'Наклон 3');
  await p2.click('#btn-finish');
  await p2.click('#modal-ok');
  await p2.waitForSelector('[data-screen="thanks"]:not([hidden])');

  // Первое устройство узнаёт о завершении при следующем сохранении.
  await answer(page, 2, RIGHT[2], '');
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForSelector('[data-screen="thanks"]:not([hidden])');

  await p2.goto(BASE);
  await p2.click('[data-action="to-form"]');
  await p2.fill('#f-fullName', 'Другой Человек');
  await p2.fill('#f-phone', '+7' + v.phone.replace(/\s/g, ''));
  await p2.fill('#f-email', 'another@example.com');
  await p2.fill('#f-ielts', '8');
  await p2.fill('#f-mathBackground', 'РФМШ');
  await p2.selectOption('#f-experience', 'нет');
  await p2.selectOption('#f-source', 'LinkedIn');
  await p2.check('#f-consent');
  await p2.click('#form-next');
  await p2.waitForSelector('[data-screen="message"]:not([hidden])');
  assert.match(await p2.textContent('#message-text'), /^Вы уже проходили тест \d\d\.\d\d\.\d{4}\. Если это ошибка — напишите HR$/);
  await other.close();
});

await scenario('12: 00:00 — поля блокируются, автоотправка «Отправлен по таймеру»', async (page) => {
  await setSetting('Длительность теста, мин', '0,15');
  try {
    await startTest(page);
    await answer(page, 0, RIGHT[0], 'Успел');
    await page.waitForSelector('[data-screen="thanks"]:not([hidden])', { timeout: 20000 });
  } finally {
    await setSetting('Длительность теста, мин', '30');
  }
  const rows = await sheet('Результаты');
  const row = rows[rows.length - 1];
  assert.equal(row['Статус попытки'], 'Отправлен по таймеру');
  assert.equal(row.Math, 1);
});

await scenario('время вышло, пока вкладка была закрыта', async (page) => {
  await startTest(page);
  await answer(page, 0, RIGHT[0], 'x');
  await post('/dev/clock?minutes=31');
  try {
    await page.reload();
    await page.waitForSelector('[data-screen="thanks"]:not([hidden])');
    assert.equal(await page.textContent('#thanks-title'), 'Время истекло');
    assert.match(await page.textContent('#thanks-text'), /Время истекло, сохранённые ответы отправлены/);
  } finally {
    await post('/dev/clock?minutes=-31');
  }
});

await scenario('19: нет интернета при отправке — ответы доходят после восстановления, без дублей', async (page, ctx) => {
  await startTest(page);
  for (let i = 0; i < 8; i++) await answer(page, i, RIGHT[i], 'ok');
  await ctx.setOffline(true);
  await page.click('#btn-finish');
  await page.click('#modal-ok');
  await page.waitForFunction(() => /Нет связи/.test(document.querySelector('#overlay-text').textContent));
  assert.equal(await page.isVisible('#net-banner'), true);
  await page.screenshot({ path: path.join(SHOTS, '7-offline.png') });
  const before = (await sheet('Ответы')).length;
  await ctx.setOffline(false);
  await page.waitForSelector('[data-screen="thanks"]:not([hidden])', { timeout: 30000 });
  const after = await sheet('Ответы');
  assert.equal(after.length, before + 8);
});

await scenario('20: приём закрыт', async (page) => {
  await setSetting('Приём открыт', 'Нет');
  try {
    await page.goto(BASE);
    await page.waitForSelector('[data-screen="message"]:not([hidden])');
    assert.equal(await page.textContent('#message-text'), 'Приём ответов сейчас закрыт.');
  } finally {
    await setSetting('Приём открыт', 'Да');
  }
});

await scenario('23: телефон 360 px — без горизонтальной прокрутки, кнопки ≥ 44 px', async (page) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto(BASE);
  await noHorizontalScroll(page, 'старт');
  await page.click('[data-action="to-form"]');
  await noHorizontalScroll(page, 'анкета');
  await page.screenshot({ path: path.join(SHOTS, 'm1-form.png'), fullPage: true });
  await fillForm(page);
  await page.click('#form-next');
  await page.waitForSelector('[data-screen="rules"]:not([hidden])');
  await noHorizontalScroll(page, 'правила');
  await page.check('#rules-ok');
  await page.click('#rules-start');
  await page.click('#modal-ok');
  await page.waitForSelector('[data-screen="test"]:not([hidden])');
  for (let i = 0; i < 8; i++) {
    await page.click(`.qnav__btn[data-q="${i}"]`);
    await noHorizontalScroll(page, 'задание ' + (i + 1));
  }
  await page.click('.qnav__btn[data-q="1"]');
  await page.screenshot({ path: path.join(SHOTS, 'm2-test-line.png'), fullPage: true });
  await page.click('.qnav__btn[data-q="6"]');
  await page.screenshot({ path: path.join(SHOTS, 'm3-test-choice.png'), fullPage: true });
  const small = await page.evaluate(() => Array.from(document.querySelectorAll('[data-screen="test"] button, [data-screen="test"] .option'))
    .filter((b) => b.offsetParent && b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim()));
  assert.deepEqual(small, []);
});

await scenario('клавиатура: стрелки выбирают вариант', async (page) => {
  await startTest(page);
  await page.click('.qnav__btn[data-q="4"]');
  await page.focus('input[name="choice"][value="A"]');
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.isChecked('input[name="choice"][value="B"]'), true);
});

await browser.close();
server.kill();
console.log(failures ? `\n${failures} из ${n} сценариев упали` : `\nВсе ${n} сценариев пройдены`);
process.exit(failures ? 1 : 0);
