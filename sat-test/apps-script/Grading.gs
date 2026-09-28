/**
 * Проверка ответов, баллы, автостатус, флаги (п. 5, 6 ТЗ).
 * Чистые функции без обращения к Google-сервисам.
 */

const DEFAULT_TOLERANCE = 0.0001;

/**
 * Распознаёт число, как его ввёл кандидат: убирает пробелы, заменяет «−», «–», «—» на минус,
 * запятую на точку, отбрасывает % в конце, понимает дроби a/b. Нераспознанное → null.
 */
function parseNumberInput(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return isFinite(raw) ? raw : null;
  let s = String(raw).replace(/[\s   ​﻿]/g, '');
  s = s.replace(/[−‒–—―]/g, '-').replace(/,/g, '.').replace(/%$/, '');
  if (!s) return null;
  const num = '([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+))';
  let m = s.match(new RegExp('^' + num + '$'));
  if (m) return parseFloat(m[1]);
  m = s.match(new RegExp('^' + num + '/' + num + '$'));
  if (m) {
    const d = parseFloat(m[2]);
    return d === 0 ? null : parseFloat(m[1]) / d;
  }
  return null;
}

function numbersMatch_(value, key, tolerance) {
  if (value === null || key === null) return false;
  return Math.abs(value - key) <= tolerance + 1e-12;
}

/** Строка уравнения для листа «Ответы»: m='3', b='-1' → 'y = 3x − 1'. */
function formatLine(mRaw, bRaw) {
  const m = String(mRaw == null ? '' : mRaw).trim();
  const b = String(bRaw == null ? '' : bRaw).trim();
  if (!m && !b) return '';
  const bNum = parseNumberInput(b);
  let tail;
  if (!b) tail = ' + ?';
  else if (bNum !== null && bNum < 0) tail = ' − ' + b.replace(/^[\s\-−‒–—―]+/, '');
  else tail = ' + ' + b.replace(/^\+\s*/, '');
  return 'y = ' + (m || '?') + 'x' + tail;
}

/**
 * Разбирает ключ вопроса из листа. number → число, line → [m, b], choice → буква.
 * Ошибка формата → null.
 */
function parseKey(type, rawKey) {
  const s = String(rawKey == null ? '' : rawKey).trim();
  if (!s) return null;
  if (type === 'number') return parseNumberInput(s);
  if (type === 'line') {
    const parts = s.split(';');
    if (parts.length !== 2) return null;
    const m = parseNumberInput(parts[0]);
    const b = parseNumberInput(parts[1]);
    return m === null || b === null ? null : [m, b];
  }
  if (type === 'choice') {
    const letter = s.toUpperCase();
    return /^[ABCD]$/.test(letter) ? letter : null;
  }
  return null;
}

/** Текст правильного ответа для листа «Ответы». */
function keyText(q) {
  if (q.type === 'line') {
    const parts = String(q.key).split(';');
    return formatLine(parts[0], parts[1]);
  }
  if (q.type === 'choice') return q.key + ') ' + ((q.options && q.options[q.key]) || '');
  return String(q.key) + (q.suffix || '');
}

/**
 * Проверяет один ответ.
 * @param {Object} q вопрос из листа (с ключом)
 * @param {Object} a ответ кандидата: {value} | {m, b} | {choice}, плюс explanation
 * @return {{correct: boolean, answerText: string, explanation: string, hasAnswer: boolean}}
 */
function gradeAnswer(q, a) {
  a = a || {};
  const tol = typeof q.tolerance === 'number' ? q.tolerance : DEFAULT_TOLERANCE;
  const key = parseKey(q.type, q.key);
  let correct = false;
  let answerText = '';
  if (q.type === 'number') {
    answerText = String(a.value == null ? '' : a.value).trim();
    correct = numbersMatch_(parseNumberInput(answerText), key, tol);
  } else if (q.type === 'line') {
    answerText = formatLine(a.m, a.b);
    correct = key !== null &&
      numbersMatch_(parseNumberInput(a.m), key[0], tol) &&
      numbersMatch_(parseNumberInput(a.b), key[1], tol);
  } else if (q.type === 'choice') {
    const letter = String(a.choice == null ? '' : a.choice).trim().toUpperCase();
    if (/^[ABCD]$/.test(letter)) {
      answerText = letter + ') ' + ((q.options && q.options[letter]) || '');
      correct = letter === key;
    }
  }
  return {
    correct: correct,
    answerText: answerText,
    hasAnswer: answerText !== '',
    explanation: String(a.explanation == null ? '' : a.explanation),
  };
}

/**
 * Проверяет всю попытку.
 * @return {{items: Array, math: number, rw: number, total: number, mathMax: number, rwMax: number}}
 */
function gradeAttempt(questions, answers) {
  answers = answers || {};
  const res = { items: [], math: 0, rw: 0, total: 0, mathMax: 0, rwMax: 0 };
  questions.forEach(function (q) {
    const g = gradeAnswer(q, answers[q.id]);
    g.question = q;
    res.items.push(g);
    const point = g.correct ? 1 : 0;
    if (q.section === SECTION.MATH) { res.math += point; res.mathMax += 1; }
    else { res.rw += point; res.rwMax += 1; }
    res.total += point;
  });
  return res;
}

/**
 * Автостатус (п. 6.1): «Прошёл» — итого ≥ порога и каждая секция ≥ порога секции;
 * «Резерв» — одна секция ≥ порога секции, другая ниже; иначе «Не прошёл».
 */
function autoStatus(math, rw, total, s) {
  const passTotal = s.passTotal;
  const passSection = s.passSection;
  if (total >= passTotal && math >= passSection && rw >= passSection) return AUTO_STATUS.PASS;
  if (math >= passSection && rw < passSection) return AUTO_STATUS.RESERVE_MATH;
  if (rw >= passSection && math < passSection) return AUTO_STATUS.RESERVE_RW;
  return AUTO_STATUS.FAIL;
}

/** 70 → '1 мин 10 с', 41 → '41 с'. */
function formatSecondsRu(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (!m) return s + ' с';
  return s ? m + ' мин ' + s + ' с' : m + ' мин';
}

/** Длительность в формате мм:сс (минуты могут быть больше 59). */
function formatDuration(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

const SIGNAL_KEYS = ['blurCount', 'blurSeconds', 'pasteCount', 'pasteChars', 'copyCount'];

/** Приводит сигналы из браузера к неотрицательным целым; берёт максимум с уже сохранёнными. */
function mergeSignals(stored, incoming) {
  stored = stored || {};
  incoming = incoming || {};
  const out = {};
  SIGNAL_KEYS.forEach(function (k) {
    const a = Number(stored[k]);
    const b = Number(incoming[k]);
    const va = isFinite(a) && a > 0 ? Math.floor(a) : 0;
    const vb = isFinite(b) && b > 0 ? Math.floor(b) : 0;
    out[k] = Math.min(Math.max(va, vb), 1e7);
  });
  return out;
}

/** Текст колонки «Флаги»: «Уходы: 4 (1 мин 10 с); вставки: 2 (340 симв.)». */
function flagsText(signals, lateMin, retake) {
  const parts = [];
  if (signals.blurCount) parts.push('Уходы: ' + signals.blurCount + ' (' + formatSecondsRu(signals.blurSeconds) + ')');
  if (signals.pasteCount) parts.push('вставки: ' + signals.pasteCount + ' (' + signals.pasteChars + ' симв.)');
  if (signals.copyCount) parts.push('копирования: ' + signals.copyCount);
  if (lateMin) parts.push('опоздание: ' + lateMin + ' мин');
  if (retake) parts.push('повторная попытка');
  const text = parts.join('; ');
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

/**
 * Проверяет строки листа «Вопросы» и возвращает активные вопросы по порядку позиций.
 * @param {Array<Object>} rows строки листа как объекты с ключами QCOL
 * @return {{questions: Array, errors: Array<string>}}
 */
function buildQuestions(rows) {
  const errors = [];
  const questions = [];
  const seenId = {};
  const seenPos = {};
  rows.forEach(function (r) {
    const active = String(r.active == null ? '' : r.active).trim().toLowerCase();
    if (['да', 'yes', 'true', '1'].indexOf(active) < 0 && r.active !== true) return;
    const id = String(r.id || '').trim();
    const where = 'Вопрос ' + (id || '(без ID)') + ': ';
    const q = {
      id: id,
      pos: Number(r.pos),
      section: String(r.section || '').trim(),
      domain: String(r.domain || '').trim(),
      type: String(r.type || '').trim().toLowerCase(),
      text: String(r.text || '').trim(),
      suffix: String(r.suffix == null ? '' : r.suffix).trim(),
      key: String(r.key == null ? '' : r.key).trim(),
      tolerance: r.tolerance === '' || r.tolerance == null ? DEFAULT_TOLERANCE : parseNumberInput(r.tolerance),
    };
    if (!id) errors.push(where + 'нет ID');
    else if (seenId[id]) errors.push(where + 'ID повторяется');
    seenId[id] = true;
    if (!(q.pos >= 1 && q.pos === Math.floor(q.pos))) errors.push(where + 'позиция должна быть целым числом от 1');
    else if (seenPos[q.pos]) errors.push(where + 'на позиции ' + q.pos + ' уже есть активный вопрос ' + seenPos[q.pos]);
    seenPos[q.pos] = id;
    if (q.section !== SECTION.MATH && q.section !== SECTION.RW) errors.push(where + 'раздел должен быть «Math» или «R&W»');
    if (['number', 'line', 'choice'].indexOf(q.type) < 0) errors.push(where + 'неизвестный тип «' + r.type + '» (нужно number / line / choice)');
    if (!q.text) errors.push(where + 'нет условия');
    if (q.tolerance === null || q.tolerance < 0) errors.push(where + 'неверный допуск');
    if (q.type === 'choice') {
      q.options = {};
      ['A', 'B', 'C', 'D'].forEach(function (L) {
        const v = String(r[L] == null ? '' : r[L]).trim();
        if (v) q.options[L] = v;
      });
      if (Object.keys(q.options).length < 2) errors.push(where + 'нужно минимум два варианта ответа');
      q.key = q.key.toUpperCase();
      if (parseKey('choice', q.key) === null) errors.push(where + 'ключ должен быть буквой A–D');
      else if (!q.options[q.key]) errors.push(where + 'ключ ' + q.key + ' указывает на пустой вариант');
    } else if (['number', 'line'].indexOf(q.type) >= 0 && parseKey(q.type, q.key) === null) {
      errors.push(where + (q.type === 'line' ? 'ключ должен быть в виде «m;b», например 3;-1' : 'ключ должен быть числом'));
    }
    questions.push(q);
  });
  if (!questions.length) errors.push('Нет ни одного активного вопроса');
  questions.sort(function (a, b) { return a.pos - b.pos; });
  return { questions: questions, errors: errors };
}

/** Вопрос без ключа и допуска — только это уходит в браузер. */
function publicQuestion(q) {
  const out = { id: q.id, pos: q.pos, section: q.section, type: q.type, text: q.text };
  if (q.suffix) out.suffix = q.suffix;
  if (q.type === 'choice') out.options = q.options;
  return out;
}

/** Очищает ответы из браузера: только известные вопросы, обрезка длины. */
function sanitizeAnswers(questions, raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  const cut = function (v, max) { return String(v == null ? '' : v).slice(0, max); };
  questions.forEach(function (q) {
    const a = raw[q.id];
    if (!a || typeof a !== 'object') return;
    const clean = { explanation: cut(a.explanation, EXPLANATION_MAX) };
    if (q.type === 'number') clean.value = cut(a.value, ANSWER_MAX);
    else if (q.type === 'line') { clean.m = cut(a.m, ANSWER_MAX); clean.b = cut(a.b, ANSWER_MAX); }
    else if (q.type === 'choice') {
      const c = cut(a.choice, 1).toUpperCase();
      clean.choice = /^[ABCD]$/.test(c) ? c : '';
    }
    out[q.id] = clean;
  });
  return out;
}
