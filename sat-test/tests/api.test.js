'use strict';
/*
 * Интеграционные тесты Web App: настоящий код apps-script/ поверх таблицы в памяти.
 * Номера в названиях — тест-кейсы приёмки из п. 12 ТЗ.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createGas } = require('../dev/gas-emulator');

let seq = 0;
function candidate(patch) {
  seq++;
  return Object.assign({
    fullName: 'Кандидат Номер' + seq, phone: '+7 701 000 ' + String(1000 + seq).slice(-4).replace(/(\d\d)(\d\d)/, '$1 $2'),
    email: 'c' + seq + '@example.com', telegram: '', satMath: 740, satRW: 710, ielts: null, mathBackground: '',
    experience: '1–2 года', source: 'hh.kz', consent: true,
  }, patch || {});
}

const ALL_RIGHT = {
  M1: { value: '-11', explanation: 'Вершина параболы x = 3, f(3) = -11.' },
  M2: { m: '3', b: '-1', explanation: 'Наклон 12/4 = 3, b = 5 - 6 = -1.' },
  M3: { value: '96', explanation: '1,2 · 0,8 = 0,96.' },
  M4: { value: '5', explanation: 'x = 3, y = 2.' },
  RW1: { choice: 'C', explanation: 'Контраст.' },
  RW2: { choice: 'C', explanation: 'Подлежащее results.' },
  RW3: { choice: 'B', explanation: 'Двоеточие перед списком.' },
  RW4: { choice: 'B', explanation: 'Hailed — восхваляли.' },
};

function answers(overrides) {
  const out = JSON.parse(JSON.stringify(ALL_RIGHT));
  Object.keys(overrides || {}).forEach((k) => { out[k] = Object.assign({}, out[k], overrides[k]); });
  return out;
}

function fresh() {
  const gas = createGas({ quiet: true });
  gas.setup();
  gas.setSetting('Email для уведомлений', 'hr@example.com');
  return gas;
}

function startAttempt(gas, cand) {
  const res = gas.call({ action: 'start', hp: '', candidate: cand || candidate() });
  assert.equal(res.ok, true, JSON.stringify(res));
  return res;
}

function submit(gas, st, ans, extra) {
  return gas.call(Object.assign({ action: 'submit', attemptId: st.attemptId, token: st.token, reason: 'manual', answers: ans, signals: {} }, extra));
}

function resultRow(gas, id) {
  return gas.records('Результаты').find((r) => r['ID попытки'] === id);
}

test('config отдаёт настройки без ключей', () => {
  const gas = fresh();
  const cfg = gas.call({ action: 'config' });
  assert.equal(cfg.ok, true);
  assert.equal(cfg.open, true);
  assert.equal(cfg.durationMin, 30);
  assert.equal(cfg.questionCount, 8);
  assert.equal(cfg.mathCount, 4);
  assert.equal(cfg.rwCount, 4);
});

test('1: все ответы верны → строка в «Результатах», 8 строк в «Ответах», уведомление', () => {
  const gas = fresh();
  const st = startAttempt(gas);
  assert.equal(resultRow(gas, st.attemptId)['Статус попытки'], 'В процессе');
  assert.deepEqual(submit(gas, st, answers()), { ok: true });
  const row = resultRow(gas, st.attemptId);
  assert.equal(row['Статус попытки'], 'Завершён');
  assert.equal(row.Math, 4);
  assert.equal(row['R&W'], 4);
  assert.equal(row['Итого'], 8);
  assert.equal(row['Автостатус'], 'Прошёл');
  assert.match(row['Итог теста'], /Проверить объяснения/);
  const ans = gas.records('Ответы').filter((r) => r['ID попытки'] === st.attemptId);
  assert.equal(ans.length, 8);
  assert.deepEqual(ans.map((r) => r['№']), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(ans.every((r) => r['Верно'] === 'да'));
  assert.equal(ans[4]['Ответ кандидата'], 'C) Nevertheless');
  assert.equal(ans[1]['Ответ кандидата'], 'y = 3x − 1');
  assert.equal(gas.mail.length, 1);
  assert.match(gas.mail[0].body, /Math 4\/4 · R&W 4\/4 · Итого 8\/8/);
  assert.match(gas.mail[0].body, /Автостатус: Прошёл — нужна проверка объяснений/);
  assert.match(gas.mail[0].body, /Открыть в таблице: .*#gid=\d+&range=A2/);
});

test('2–4: баллы и автостатусы, лист «Резерв» по автостатусу', () => {
  const gas = fresh();
  const cases = [
    [{ M1: { value: '11' } }, 3, 4, 'Прошёл'],
    [{ RW1: { choice: 'A' }, RW2: { choice: 'A' } }, 4, 2, 'Резерв: Math'],
    [{ M1: { value: '0' }, RW1: { choice: 'A' } }, 3, 3, 'Не прошёл'],
  ];
  cases.forEach(([over, m, r, status]) => {
    const st = startAttempt(gas);
    submit(gas, st, answers(over));
    const row = resultRow(gas, st.attemptId);
    assert.equal(row.Math, m);
    assert.equal(row['R&W'], r);
    assert.equal(row['Итого'], m + r);
    assert.equal(row['Автостатус'], status);
  });
  // «Резерв» собирается формулой FILTER по автостатусу (в Google Sheets она вычисляется сама).
  assert.match(gas.sheet('Резерв').dump()[1][0], /FILTER\(.*LEFT\('Результаты'!U2:U,6\)="Резерв"/);
});

test('9–10: продолжение попытки — по токену и с другого устройства по телефону и email', () => {
  const gas = fresh();
  const cand = candidate();
  const st = startAttempt(gas, cand);
  gas.clock.offset += 10 * 60000;
  const saved = gas.call({ action: 'save', attemptId: st.attemptId, token: st.token, answers: { M1: { value: '-11', explanation: 'x' } }, signals: { blurCount: 2 } });
  assert.equal(saved.ok, true);

  const resumed = gas.call({ action: 'resume', attemptId: st.attemptId, token: st.token });
  assert.equal(resumed.status, 'in_progress');
  assert.equal(resumed.deadline, st.deadline);
  assert.equal(resumed.answers.M1.value, '-11');
  const left = Date.parse(resumed.deadline) - Date.parse(resumed.serverNow);
  assert.ok(left <= 20 * 60000 && left > 19 * 60000, 'осталось ~20 минут: ' + left);

  const other = gas.call({ action: 'check', hp: '', candidate: cand });
  assert.equal(other.status, 'in_progress');
  assert.equal(other.attemptId, st.attemptId);
  assert.equal(other.deadline, st.deadline);
  assert.equal(other.signals.blurCount, 2);

  // Повторный start (двойной клик) не создаёт вторую попытку.
  const again = gas.call({ action: 'start', hp: '', candidate: cand });
  assert.equal(again.attemptId, st.attemptId);
  assert.equal(gas.records('Результаты').length, 1);

  // Совпал только телефон — продолжить нельзя.
  const mism = gas.call({ action: 'check', hp: '', candidate: Object.assign({}, cand, { email: 'other@example.com' }) });
  assert.equal(mism.code, 'CONTACT_MISMATCH');
});

test('12: отправка по таймеру; сохранения после дедлайна + льготы не принимаются', () => {
  const gas = fresh();
  const st = startAttempt(gas);
  gas.clock.offset += 33 * 60000;
  gas.call({ action: 'save', attemptId: st.attemptId, token: st.token, answers: answers() });
  const draft = JSON.parse(gas.records('Попытки')[0]['Черновик (JSON)']);
  assert.deepEqual(draft, {});
  gas.clock.offset -= 3 * 60000 - 5000; // 30:05 — внутри льготы
  assert.equal(submit(gas, st, answers(), { reason: 'timer' }).ok, true);
  const row = resultRow(gas, st.attemptId);
  assert.equal(row['Статус попытки'], 'Отправлен по таймеру');
  assert.equal(row['Опоздание, мин'], '');
});

test('опоздание: ответы после дедлайна + 2 минут принимаются с флагом', () => {
  const gas = fresh();
  const st = startAttempt(gas);
  gas.clock.offset += 35 * 60000;
  assert.equal(submit(gas, st, answers(), { reason: 'timer' }).ok, true);
  const row = resultRow(gas, st.attemptId);
  assert.equal(row['Опоздание, мин'], 5);
  assert.match(row['Флаги'], /опоздание: 5 мин/i);
});

test('13: брошенная попытка закрывается триггером по черновику', () => {
  const gas = fresh();
  const st = startAttempt(gas);
  gas.call({ action: 'save', attemptId: st.attemptId, token: st.token, answers: answers({ RW1: { choice: 'A' } }), signals: { blurCount: 1, blurSeconds: 5 } });
  gas.clock.offset += 31 * 60000;
  assert.equal(gas.ctx.closeExpiredAttempts(), 0, 'в пределах льготы не закрывается');
  gas.clock.offset += 2 * 60000;
  assert.equal(gas.ctx.closeExpiredAttempts(), 1);
  const row = resultRow(gas, st.attemptId);
  assert.equal(row['Статус попытки'], 'Не завершён');
  assert.equal(row['Итого'], 7);
  assert.equal(row['Длительность'], '30:00');
  assert.equal(row['Уходы'], 1);
  assert.match(gas.mail[0].subject, /время вышло, оценено по автосохранению/);
  // Повторный запуск ничего не делает; поздний submit идемпотентен.
  assert.equal(gas.ctx.closeExpiredAttempts(), 0);
  assert.deepEqual(submit(gas, st, answers()), { ok: true, already: true });
  assert.equal(gas.records('Ответы').length, 8);
});

test('кандидат вернулся после истечения времени → «Время истекло, ответы отправлены»', () => {
  const gas = fresh();
  const cand = candidate();
  const st = startAttempt(gas, cand);
  gas.call({ action: 'save', attemptId: st.attemptId, token: st.token, answers: answers() });
  gas.clock.offset += 40 * 60000;
  const res = gas.call({ action: 'check', hp: '', candidate: cand });
  assert.deepEqual(res, { ok: true, status: 'expired' });
  assert.equal(resultRow(gas, st.attemptId)['Статус попытки'], 'Не завершён');
  assert.equal(gas.call({ action: 'check', hp: '', candidate: cand }).code, 'ALREADY_COMPLETED');
});

test('14–15: повторный вход запрещён; пересдача по чекбоксу HR', () => {
  const gas = fresh();
  const cand = candidate();
  const st = startAttempt(gas, cand);
  submit(gas, st, answers());
  const byPhone = gas.call({ action: 'check', hp: '', candidate: Object.assign({}, cand, { email: 'new@example.com' }) });
  assert.equal(byPhone.code, 'ALREADY_COMPLETED');
  assert.match(byPhone.message, /^Вы уже проходили тест \d\d\.\d\d\.\d{4}\. Если это ошибка — напишите HR$/);
  const byEmail = gas.call({ action: 'start', hp: '', candidate: Object.assign({}, cand, { phone: '+77770000000' }) });
  assert.equal(byEmail.code, 'ALREADY_COMPLETED');
  assert.equal(gas.records('Результаты').length, 1);

  gas.setCell('Результаты', 2, 'Разрешить пересдачу', true);
  assert.equal(gas.call({ action: 'check', hp: '', candidate: cand }).retake, true);
  const st2 = startAttempt(gas, cand);
  assert.notEqual(st2.attemptId, st.attemptId);
  submit(gas, st2, answers());
  const rows = gas.records('Результаты');
  assert.equal(rows.length, 2);
  assert.equal(rows[1]['Повторная попытка'], 'да');
  assert.match(rows[1]['Флаги'], /повторная попытка/i);
  // Разрешение использовано: третьей попытки нет.
  assert.equal(gas.call({ action: 'check', hp: '', candidate: cand }).code, 'ALREADY_COMPLETED');
});

test('16: ключей нет ни в ответах сервера, ни в файлах сайта', () => {
  const gas = fresh();
  const cfg = JSON.stringify(gas.call({ action: 'config' }));
  const st = startAttempt(gas);
  const texts = [cfg, JSON.stringify(st), JSON.stringify(submit(gas, st, answers()))];
  texts.forEach((t) => {
    assert.doesNotMatch(t, /"key"|tolerance|3;-1|"score"|"math"\s*:\s*\d/);
  });
  st.questions.forEach((q) => assert.deepEqual(Object.keys(q).sort().filter((k) => !['id', 'pos', 'section', 'type', 'text', 'options', 'suffix'].includes(k)), []));
  const webDir = path.join(__dirname, '..', 'web');
  fs.readdirSync(webDir).forEach((f) => {
    const src = fs.readFileSync(path.join(webDir, f), 'utf8');
    assert.doesNotMatch(src, /Nevertheless|3;-1|hailed/i, f);
  });
  // Задания приходят только после старта.
  assert.equal('questions' in gas.call({ action: 'check', hp: '', candidate: candidate() }), false);
});

test('17: формулы от кандидата пишутся как текст', () => {
  const gas = fresh();
  const st = startAttempt(gas, candidate({ fullName: '=HYPERLINK("x") Иван', telegram: '@safe_name' }));
  submit(gas, st, answers({ M1: { value: '=1+1', explanation: '=IMPORTXML("https://example.com","//a")' }, M2: { explanation: '+cmd' } }));
  // Эмулятор, как и Google Sheets, превращает строку с «=» без апострофа в формулу.
  const ans = gas.sheet('Ответы');
  ans.rows.slice(1).forEach((line) => line.forEach((cell) => assert.equal(cell && cell.formula, '', 'формула в «Ответах»: ' + (cell && cell.formula))));
  const recs = gas.records('Ответы');
  assert.equal(recs[0]['Объяснение'], '=IMPORTXML("https://example.com","//a")');
  assert.equal(recs[0]['Ответ кандидата'], '=1+1');
  assert.equal(recs[1]['Объяснение'], '+cmd');
  assert.equal(resultRow(gas, st.attemptId)['ФИО'], '=HYPERLINK("x") Иван');
});

test('18: флаги уходов и вставок', () => {
  const gas = fresh();
  const st = startAttempt(gas);
  submit(gas, st, answers(), { signals: { blurCount: 3, blurSeconds: 20, pasteCount: 1, pasteChars: 150, copyCount: 1 } });
  const row = resultRow(gas, st.attemptId);
  assert.equal(row['Уходы'], 3);
  assert.equal(row['Вставлено символов'], 150);
  assert.equal(row['Копирования'], 1);
  assert.equal(row['Флаги'], 'Уходы: 3 (20 с); вставки: 1 (150 симв.); копирования: 1');
});

test('19: повторная отправка не создаёт дубль', () => {
  const gas = fresh();
  const st = startAttempt(gas);
  submit(gas, st, answers());
  assert.deepEqual(submit(gas, st, answers({ M1: { value: '0' } })), { ok: true, already: true });
  assert.equal(gas.records('Ответы').length, 8);
  assert.equal(resultRow(gas, st.attemptId)['Итого'], 8);
  assert.equal(gas.mail.length, 1);
});

test('20: «Приём открыт» = Нет → новые попытки не создаются', () => {
  const gas = fresh();
  gas.setSetting('Приём открыт', 'Нет');
  assert.equal(gas.call({ action: 'config' }).open, false);
  assert.equal(gas.call({ action: 'check', hp: '', candidate: candidate() }).code, 'TEST_CLOSED');
  assert.equal(gas.call({ action: 'start', hp: '', candidate: candidate() }).code, 'TEST_CLOSED');
  assert.equal(gas.records('Попытки').length, 0);
});

test('21: правки листа «Вопросы» применяются к новым попыткам', () => {
  const gas = fresh();
  const before = startAttempt(gas);
  gas.setCell('Вопросы', 2, 'Условие', 'f(x) = x² − 4x. Найдите минимальное значение f.');
  gas.setCell('Вопросы', 2, 'Ключ', '-4');
  const after = startAttempt(gas);
  assert.match(after.questions[0].text, /x² − 4x/);
  submit(gas, after, answers({ M1: { value: '-4' } }));
  assert.equal(resultRow(gas, after.attemptId).Math, 4);
  // Начатая раньше попытка проверяется по своим вопросам.
  submit(gas, before, answers());
  assert.equal(resultRow(gas, before.attemptId).Math, 4);
});

test('ошибка в «Вопросах» — тест не запускается, ошибка в «Логе»', () => {
  const gas = fresh();
  gas.setCell('Вопросы', 3, 'Тип', 'essay');
  const res = gas.call({ action: 'start', hp: '', candidate: candidate() });
  assert.equal(res.code, 'SERVER_ERROR');
  assert.match(res.message, /временно недоступен/);
  assert.ok(gas.records('Лог').some((r) => /неизвестный тип/.test(r['Сообщение'])));
  assert.equal(gas.call({ action: 'config' }).open, false);
});

test('22: 20 кандидатов — уникальные ID, ничего не перезаписано', () => {
  const gas = fresh();
  const sts = [];
  for (let i = 0; i < 20; i++) sts.push(startAttempt(gas));
  sts.forEach((st, i) => submit(gas, st, answers(i % 2 ? { M1: { value: '0' } } : {})));
  const rows = gas.records('Результаты');
  assert.equal(rows.length, 20);
  assert.equal(new Set(rows.map((r) => r['ID попытки'])).size, 20);
  assert.equal(rows[0]['ID попытки'], 'SAT-0001');
  assert.equal(rows[19]['ID попытки'], 'SAT-0020');
  assert.equal(gas.records('Ответы').length, 160);
  rows.forEach((r, i) => assert.equal(r['Итого'], i % 2 ? 7 : 8));
});

test('ловушка для ботов и неверный токен', () => {
  const gas = fresh();
  assert.equal(gas.call({ action: 'start', hp: 'http://spam', candidate: candidate() }).code, 'VALIDATION');
  assert.equal(gas.records('Попытки').length, 0);
  assert.equal(gas.records('Лог').length, 0);
  const st = startAttempt(gas);
  assert.equal(gas.call({ action: 'save', attemptId: st.attemptId, token: 'x', answers: {} }).code, 'BAD_TOKEN');
  assert.equal(gas.call({ action: 'submit', attemptId: 'SAT-9999', token: st.token }).code, 'BAD_TOKEN');
  const bad = gas.call({ action: 'check', hp: '', candidate: candidate({ email: 'bad' }) });
  assert.equal(bad.code, 'VALIDATION');
  assert.ok(bad.errors.email);
});

test('длинные объяснения обрезаются до 2000 символов, лишние поля отбрасываются', () => {
  const gas = fresh();
  const st = startAttempt(gas);
  submit(gas, st, answers({ M1: { explanation: 'а'.repeat(5000), evil: '=1' }, ZZZ: { value: '1' } }));
  const recs = gas.records('Ответы');
  assert.equal(recs[0]['Объяснение'].length, 2000);
  assert.equal(recs.length, 8);
});

test('Telegram-уведомление, если заданы бот и чат', () => {
  const gas = fresh();
  gas.props.TELEGRAM_BOT_TOKEN = '123:abc';
  gas.setSetting('ID Telegram-чата HR', '-100500');
  const st = startAttempt(gas);
  submit(gas, st, answers(), { signals: { blurCount: 4, blurSeconds: 70 } });
  assert.equal(gas.telegram.length, 1);
  assert.equal(gas.telegram[0].payload.chat_id, '-100500');
  assert.match(gas.telegram[0].payload.text, /Флаги: уходы: 4 \(1 мин 10 с\)/);
});
