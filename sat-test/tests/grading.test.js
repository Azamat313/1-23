'use strict';
/* Unit-тесты чистых функций сервера: распознавание чисел, проверка ответов, статусы, анкета. */

const test = require('node:test');
const assert = require('node:assert/strict');
const { createGas } = require('../dev/gas-emulator');

const gas = createGas({ quiet: true });
const G = (code) => gas.eval(code);
const parse = (s) => gas.ctx.parseNumberInput(s);
const Q = G('DEFAULT_QUESTIONS').map((q) => Object.assign({}, q, q.type === 'choice'
  ? { options: { A: q.A, B: q.B, C: q.C, D: q.D } } : {}));
const byId = (id) => Q.find((q) => q.id === id);
const grade = (id, answer) => gas.ctx.gradeAnswer(byId(id), answer).correct;
const S = { passTotal: 7, passSection: 3 };

test('распознавание чисел (п. 5)', () => {
  assert.equal(parse('-11'), -11);
  assert.equal(parse('−11'), -11);
  assert.equal(parse('– 11'), -11);
  assert.equal(parse('- 11'), -11);
  assert.equal(parse('-11,0'), -11);
  assert.equal(parse('96%'), 96);
  assert.equal(parse('1 000'), 1000);
  assert.equal(parse('3/4'), 0.75);
  assert.equal(parse('-6/2'), -3);
  assert.equal(parse('1/0'), null);
  assert.equal(parse('abc'), null);
  assert.equal(parse(''), null);
  assert.equal(parse('1.2.3'), null);
});

test('кейс 5: M1 — «-11», «−11», «- 11», «-11,0» засчитаны, «11» — нет', () => {
  ['-11', '−11', '- 11', '-11,0'].forEach((v) => assert.equal(grade('M1', { value: v }), true, v));
  assert.equal(grade('M1', { value: '11' }), false);
  assert.equal(grade('M1', { value: '' }), false);
  assert.equal(grade('M1', {}), false);
});

test('кейс 6: M2 — m = 3, b = −1 засчитано; b = 1 и перестановка — нет', () => {
  assert.equal(grade('M2', { m: '3', b: '−1' }), true);
  assert.equal(grade('M2', { m: '3,0', b: '-1' }), true);
  assert.equal(grade('M2', { m: '3', b: '1' }), false);
  assert.equal(grade('M2', { m: '-1', b: '3' }), false);
  assert.equal(gas.ctx.gradeAnswer(byId('M2'), { m: '3', b: '-1' }).answerText, 'y = 3x − 1');
  assert.equal(gas.ctx.gradeAnswer(byId('M2'), { m: '3', b: '2' }).answerText, 'y = 3x + 2');
});

test('кейс 7: M3 — «96», «96,0», «96%» засчитаны, «0,96» и «4» — нет', () => {
  ['96', '96,0', '96%'].forEach((v) => assert.equal(grade('M3', { value: v }), true, v));
  ['0,96', '4'].forEach((v) => assert.equal(grade('M3', { value: v }), false, v));
});

test('M4 и R&W', () => {
  assert.equal(grade('M4', { value: '5,0' }), true);
  assert.equal(grade('M4', { value: '7' }), false);
  assert.equal(grade('RW1', { choice: 'C' }), true);
  assert.equal(grade('RW1', { choice: 'c' }), true);
  assert.equal(grade('RW1', { choice: 'A' }), false);
  assert.equal(gas.ctx.gradeAnswer(byId('RW1'), { choice: 'C' }).answerText, 'C) Nevertheless');
  assert.equal(grade('RW3', { choice: 'B' }), true);
});

test('автостатус (п. 6.1)', () => {
  const st = (m, r) => gas.ctx.autoStatus(m, r, m + r, S);
  assert.equal(st(4, 4), 'Прошёл');
  assert.equal(st(3, 4), 'Прошёл');
  assert.equal(st(4, 3), 'Прошёл');
  assert.equal(st(4, 2), 'Резерв: Math');
  assert.equal(st(3, 0), 'Резерв: Math');
  assert.equal(st(1, 4), 'Резерв: R&W');
  assert.equal(st(3, 3), 'Не прошёл');
  assert.equal(st(2, 2), 'Не прошёл');
  assert.equal(st(0, 0), 'Не прошёл');
  // При другом числе заданий проверяются оба условия.
  assert.equal(gas.ctx.autoStatus(2, 6, 8, S), 'Резерв: R&W');
});

test('флаги и форматирование', () => {
  assert.equal(gas.ctx.formatSecondsRu(70), '1 мин 10 с');
  assert.equal(gas.ctx.formatSecondsRu(41), '41 с');
  assert.equal(gas.ctx.formatDuration((27 * 60 + 41) * 1000), '27:41');
  assert.equal(gas.ctx.flagsText({ blurCount: 4, blurSeconds: 70, pasteCount: 2, pasteChars: 340, copyCount: 0 }, 0, false),
    'Уходы: 4 (1 мин 10 с); вставки: 2 (340 симв.)');
  assert.equal(gas.ctx.flagsText({ blurCount: 0, pasteCount: 0, copyCount: 1 }, 3, true),
    'Копирования: 1; опоздание: 3 мин; повторная попытка');
  const merged = gas.ctx.mergeSignals({ blurCount: 3, pasteChars: 10 }, { blurCount: 1, pasteChars: 20, copyCount: -5 });
  assert.deepEqual({ ...merged }, { blurCount: 3, blurSeconds: 0, pasteCount: 0, pasteChars: 20, copyCount: 0 });
});

test('публичный вопрос не содержит ключа и допуска', () => {
  const built = gas.ctx.buildQuestions(Q.map((q) => Object.assign({}, q, { active: 'да' })));
  assert.equal(built.errors.length, 0, built.errors.join('; '));
  built.questions.forEach((q) => {
    const pub = gas.ctx.publicQuestion(q);
    assert.equal('key' in pub, false);
    assert.equal('tolerance' in pub, false);
  });
});

test('ошибки заполнения листа «Вопросы»', () => {
  const rows = Q.map((q) => Object.assign({}, q, { active: 'да' }));
  rows[0] = Object.assign({}, rows[0], { key: '' });
  rows[1] = Object.assign({}, rows[1], { type: 'essay' });
  rows[4] = Object.assign({}, rows[4], { key: 'E' });
  rows[5] = Object.assign({}, rows[5], { pos: 5 });
  const { errors } = gas.ctx.buildQuestions(rows);
  assert.ok(errors.some((e) => e.includes('M1') && e.includes('числом')));
  assert.ok(errors.some((e) => e.includes('неизвестный тип')));
  assert.ok(errors.some((e) => e.includes('RW1') && e.includes('A–D')));
  assert.ok(errors.some((e) => e.includes('позиции 5')));
  assert.equal(gas.ctx.buildQuestions([]).errors.join(), 'Нет ни одного активного вопроса');
});

test('анкета (п. 4.2)', () => {
  const base = {
    fullName: '  Иванов   Иван ', phone: '8 (701) 123-45-67', email: ' Ivanov@Example.com ', telegram: 'ivanov_1',
    satMath: '740', satRW: 710, ielts: '', mathBackground: '', experience: '6–12 мес.', source: 'hh.kz', consent: true,
  };
  const v = gas.ctx.validateCandidate(base);
  assert.equal(v.ok, true, JSON.stringify(v.errors));
  assert.equal(v.candidate.fullName, 'Иванов Иван');
  assert.equal(v.candidate.phone, '+77011234567');
  assert.equal(v.candidate.email, 'ivanov@example.com');
  assert.equal(v.candidate.telegram, '@ivanov_1');
  assert.equal(v.candidate.satMath, 740);

  const err = (patch) => gas.ctx.validateCandidate(Object.assign({}, base, patch)).errors;
  assert.ok(err({ fullName: 'Иван' }).fullName);
  assert.ok(err({ phone: '+7 701 123' }).phone);
  assert.equal(gas.ctx.validateCandidate(Object.assign({}, base, { phone: '+996 555 123 456' })).candidate.phone, '+996555123456');
  assert.ok(err({ email: 'ivanov@' }).email);
  assert.ok(err({ telegram: '@abc' }).telegram);
  assert.ok(err({ satMath: 745 }).satMath);
  assert.ok(err({ satMath: 900 }).satMath);
  assert.ok(err({ satRW: '' }).satRW);
  assert.ok(err({ satMath: '', satRW: '' }).scores);
  assert.ok(err({ satMath: '', satRW: '', ielts: '7,5' }).mathBackground);
  assert.equal(gas.ctx.validateCandidate(Object.assign({}, base,
    { satMath: '', satRW: '', ielts: '7,5', mathBackground: 'РФМШ' })).ok, true);
  assert.ok(err({ ielts: '7.3' }).ielts);
  assert.ok(err({ experience: 'много' }).experience);
  assert.ok(err({ source: '' }).source);
  assert.ok(err({ consent: 'true' }).consent);
});
