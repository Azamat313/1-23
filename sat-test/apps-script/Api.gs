/**
 * Web App: один адрес, POST с JSON в теле (Content-Type: text/plain — без CORS-preflight).
 * Действия: config, check, start, resume, save, submit (п. 8.2 ТЗ).
 */

const MSG = {
  CLOSED: 'Приём ответов сейчас закрыт',
  SERVER: 'Что-то пошло не так, попробуйте ещё раз',
  UNAVAILABLE: 'Тест временно недоступен. Попробуйте позже или напишите HR',
  BAD_TOKEN: 'Попытка не найдена. Обновите страницу или напишите HR',
  VALIDATION: 'Проверьте поля анкеты',
  MISMATCH: 'Тест с этим телефоном или email уже начат. Чтобы продолжить, укажите те же телефон и email, что и при старте. Если это ошибка — напишите HR',
  ATTEMPT_CLOSED: 'Тест уже завершён',
};

function ApiError(code, message, extra) {
  this.name = 'ApiError';
  this.code = code;
  this.message = message;
  this.extra = extra || {};
}

function doPost(e) {
  let req = {};
  let res;
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || '{}') || {};
    res = handleRequest_(req);
  } catch (err) {
    res = errorResponse_(err, req);
  }
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, service: 'sat-test' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleRequest_(req) {
  switch (req.action) {
    case 'config': return actionConfig_();
    case 'check': return actionCheck_(req);
    case 'start': return actionStart_(req);
    case 'resume': return actionResume_(req);
    case 'save': return actionSave_(req);
    case 'submit': return actionSubmit_(req);
    default: throw new ApiError('VALIDATION', 'Неизвестное действие');
  }
}

function errorResponse_(err, req) {
  if (err instanceof ApiError) {
    const out = { ok: false, code: err.code, message: err.message };
    Object.keys(err.extra).forEach(function (k) { out[k] = err.extra[k]; });
    return out;
  }
  let hrContact = '';
  try { hrContact = getSettings_().hrContact; } catch (ignore) { /* настройки недоступны */ }
  logEvent_('ERROR', req && req.action, req && req.attemptId, (err && (err.stack || err.message)) || String(err));
  const message = err instanceof QuestionsError ? MSG.UNAVAILABLE : MSG.SERVER;
  return { ok: false, code: 'SERVER_ERROR', message: message, hrContact: hrContact };
}

/* ---------- Действия ---------- */

function actionConfig_() {
  const s = getSettings_();
  let qs = null;
  try {
    qs = getQuestions_();
  } catch (e) {
    logEvent_('ERROR', 'config', '', e.message || String(e));
  }
  const count = function (section) { return qs ? qs.filter(function (q) { return q.section === section; }).length : 0; };
  return {
    ok: true,
    open: s.open && qs !== null,
    durationMin: s.durationMin,
    questionCount: qs ? qs.length : 0,
    mathCount: count(SECTION.MATH),
    rwCount: count(SECTION.RW),
    calculator: s.calculator,
    explMinChars: s.explMinChars,
    explMaxChars: EXPLANATION_MAX,
    hrContact: s.hrContact,
    thanksText: String(s.thanksText).replace(/\{N\}/g, s.replyDays),
    consentUrl: s.consentUrl,
    experienceOptions: EXPERIENCE_OPTIONS,
    sourceOptions: SOURCE_OPTIONS,
  };
}

/** «Далее» в анкете: new / in_progress (данные для продолжения) / expired / ошибка ALREADY_COMPLETED. */
function actionCheck_(req) {
  const ctx = prepareCandidate_(req);
  const notes = [];
  try {
    return withLock_(function () {
      const found = lookupContact_(ctx.candidate, ctx.settings, notes);
      if (found.kind === 'new') {
        if (!ctx.settings.open) throw new ApiError('TEST_CLOSED', MSG.CLOSED, { hrContact: ctx.settings.hrContact });
        return { ok: true, status: 'new', retake: !!found.retake };
      }
      return respondExisting_(found, ctx.settings);
    });
  } finally {
    sendNotifications_(notes);
  }
}

/** «Начать тест»: повторная проверка дублей, создание попытки, старт таймера. */
function actionStart_(req) {
  const ctx = prepareCandidate_(req);
  const notes = [];
  try {
    return withLock_(function () {
      const found = lookupContact_(ctx.candidate, ctx.settings, notes);
      if (found.kind !== 'new') return respondExisting_(found, ctx.settings);
      if (!ctx.settings.open) throw new ApiError('TEST_CLOSED', MSG.CLOSED, { hrContact: ctx.settings.hrContact });
      const questions = getQuestions_();
      const att = createAttempt_(ctx.candidate, questions, ctx.settings, !!found.retake);
      const out = attemptPayload_(att);
      out.ok = true;
      out.status = 'in_progress';
      return out;
    });
  } finally {
    sendNotifications_(notes);
  }
}

/** Продолжение попытки на том же устройстве по токену (после перезагрузки страницы). */
function actionResume_(req) {
  const att = authAttempt_(req);
  if (att.state === ATTEMPT_STATE.DONE) return { ok: true, status: 'done' };
  const out = attemptPayload_(att);
  out.ok = true;
  out.status = 'in_progress';
  return out;
}

/** Автосохранение черновика и флагов. Ответы после дедлайна + льготы не принимаются. */
function actionSave_(req) {
  const att = authAttempt_(req);
  if (att.state === ATTEMPT_STATE.DONE) throw new ApiError('ATTEMPT_CLOSED', MSG.ATTEMPT_CLOSED);
  const s = getSettings_();
  const now = Date.now();
  const deadline = toMs_(att.deadline);
  const upd = { signals: text_(JSON.stringify(mergeSignals(att.signals, req.signals))) };
  if (now <= deadline + s.graceMin * 60000) {
    upd.draft = text_(JSON.stringify(sanitizeAnswers(att.questions, req.answers)));
    upd.savedAt = new Date(now);
  }
  writeCells_(SHEET.ATTEMPTS, ATT, att._row, upd);
  return { ok: true, savedAt: iso_(now), serverNow: iso_(Date.now()), deadline: iso_(deadline) };
}

/** Отправка. Идемпотентна: повтор для завершённой попытки возвращает ok. Баллы не возвращаются. */
function actionSubmit_(req) {
  const notes = [];
  try {
    return withLock_(function () {
      const att = authAttempt_(req);
      if (att.state === ATTEMPT_STATE.DONE) return { ok: true, already: true };
      const s = getSettings_();
      const answers = sanitizeAnswers(att.questions, req.answers);
      const signals = mergeSignals(att.signals, req.signals);
      notes.push(finalizeAttempt_(att, answers, signals, req.reason === 'timer' ? 'timer' : 'manual', s));
      return { ok: true };
    });
  } finally {
    sendNotifications_(notes);
  }
}

/** Триггер раз в 10 минут: закрывает попытки, у которых прошёл дедлайн + льгота. */
function closeExpiredAttempts() {
  const notes = [];
  try {
    withLock_(function () {
      const s = getSettings_();
      const now = Date.now();
      loadAttemptIndex_().forEach(function (a) {
        if (a.state !== ATTEMPT_STATE.OPEN || now <= toMs_(a.deadline) + s.graceMin * 60000) return;
        try {
          notes.push(finalizeAttempt_(loadAttempt_(a._row), null, null, 'abandoned', s));
        } catch (e) {
          logEvent_('ERROR', 'trigger', a.id, (e && e.stack) || String(e));
        }
      });
    });
  } finally {
    sendNotifications_(notes);
  }
  return notes.length;
}

/* ---------- Попытки ---------- */

function prepareCandidate_(req) {
  if (req.hp) {
    // Ловушка для ботов: отклоняем без записи в таблицу.
    console.warn('Сработала ловушка для ботов');
    throw new ApiError('VALIDATION', MSG.VALIDATION);
  }
  const v = validateCandidate(req.candidate);
  if (!v.ok) throw new ApiError('VALIDATION', MSG.VALIDATION, { errors: v.errors });
  return { candidate: v.candidate, settings: getSettings_() };
}

function toMs_(v) {
  if (v && typeof v.getTime === 'function') return v.getTime();
  const t = new Date(v).getTime();
  return isNaN(t) ? 0 : t;
}

function iso_(ms) {
  return new Date(ms).toISOString();
}

function parseJson_(v, def) {
  try { return v ? JSON.parse(String(v)) : def; } catch (e) { return def; }
}

function loadAttemptIndex_() {
  return readRecords_(SHEET.ATTEMPTS, ATT, ATT_INDEX_WIDTH);
}

function loadAttempt_(row) {
  const a = readRecordAt_(SHEET.ATTEMPTS, ATT, row);
  a.id = String(a.id);
  a.token = String(a.token);
  a.candidate = parseJson_(a.candidate, {});
  a.questions = parseJson_(a.questions, []);
  a.draft = parseJson_(a.draft, {});
  a.signals = parseJson_(a.signals, {});
  return a;
}

function authAttempt_(req) {
  const id = String(req.attemptId || '');
  const token = String(req.token || '');
  if (!id || !token) throw new ApiError('BAD_TOKEN', MSG.BAD_TOKEN);
  const row = findRow_(SHEET.ATTEMPTS, ATT, 'id', id);
  if (!row) throw new ApiError('BAD_TOKEN', MSG.BAD_TOKEN);
  const att = loadAttempt_(row);
  if (att.token !== token) throw new ApiError('BAD_TOKEN', MSG.BAD_TOKEN);
  return att;
}

/**
 * Ищет попытки с тем же телефоном или email. Просроченные незавершённые попытки
 * закрывает сразу (оценка по черновику). Вызывать под блокировкой.
 * @return {{kind: string, attempt?: Object, retake?: boolean}}
 *   kind: new | in_progress | expired | completed | mismatch
 */
function lookupContact_(c, s, notes) {
  const now = Date.now();
  const matches = loadAttemptIndex_().filter(function (a) {
    return String(a.phone) === c.phone || String(a.email).toLowerCase() === c.email;
  });
  if (!matches.length) return { kind: 'new' };
  matches.sort(function (a, b) { return toMs_(b.startedAt) - toMs_(a.startedAt); });

  let expiredNow = false;
  for (let i = 0; i < matches.length; i++) {
    const a = matches[i];
    if (a.state !== ATTEMPT_STATE.OPEN) continue;
    const same = String(a.phone) === c.phone && String(a.email).toLowerCase() === c.email;
    if (now > toMs_(a.deadline) + s.graceMin * 60000) {
      notes.push(finalizeAttempt_(loadAttempt_(a._row), null, null, 'abandoned', s));
      a.state = ATTEMPT_STATE.DONE;
      a.finishedAt = a.deadline;
      if (same) expiredNow = true;
      continue;
    }
    return same ? { kind: 'in_progress', attempt: a } : { kind: 'mismatch' };
  }
  if (expiredNow) return { kind: 'expired' };
  const latest = matches[0];
  if (isRetakeAllowed_(String(latest.id))) return { kind: 'new', retake: true };
  return { kind: 'completed', attempt: latest };
}

function respondExisting_(found, s) {
  if (found.kind === 'in_progress') {
    const out = attemptPayload_(loadAttempt_(found.attempt._row));
    out.ok = true;
    out.status = 'in_progress';
    return out;
  }
  if (found.kind === 'expired') return { ok: true, status: 'expired' };
  if (found.kind === 'mismatch') throw new ApiError('CONTACT_MISMATCH', MSG.MISMATCH, { hrContact: s.hrContact });
  const a = found.attempt;
  const date = formatDate_(new Date(toMs_(a.finishedAt) || toMs_(a.startedAt)), 'dd.MM.yyyy');
  throw new ApiError('ALREADY_COMPLETED', 'Вы уже проходили тест ' + date + '. Если это ошибка — напишите HR',
    { date: date, hrContact: s.hrContact });
}

function isRetakeAllowed_(attemptId) {
  const row = findRow_(SHEET.RESULTS, RES, 'id', attemptId);
  if (!row) return false;
  const v = sheet_(SHEET.RESULTS).getRange(row, cols_(SHEET.RESULTS, RES).allowRetake).getValue();
  return v === true || parseBool_(v);
}

function nextAttemptId_() {
  const props = PropertiesService.getScriptProperties();
  let n = Number(props.getProperty('LAST_ATTEMPT_NO')) || 0;
  if (!n) {
    readRecords_(SHEET.ATTEMPTS, ATT, 1).forEach(function (r) {
      const m = String(r.id).match(/(\d+)$/);
      if (m) n = Math.max(n, Number(m[1]));
    });
  }
  n += 1;
  props.setProperty('LAST_ATTEMPT_NO', String(n));
  return 'SAT-' + String(n).padStart(4, '0');
}

function createAttempt_(c, questions, s, retake) {
  const now = new Date();
  const deadline = new Date(now.getTime() + s.durationMin * 60000);
  const id = nextAttemptId_();
  const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  appendRecords_(SHEET.ATTEMPTS, ATT, [{
    id: id,
    token: text_(token),
    state: ATTEMPT_STATE.OPEN,
    phone: text_(c.phone),
    email: text_(c.email),
    name: text_(c.fullName),
    startedAt: now,
    deadline: deadline,
    retake: retake ? 'да' : '',
    consentAt: now,
    candidate: text_(JSON.stringify(c)),
    questions: text_(JSON.stringify(questions)),
    draft: text_('{}'),
    signals: text_('{}'),
  }]);
  createResultRow_(id, c, now, retake);
  return {
    id: id, token: token, state: ATTEMPT_STATE.OPEN, name: c.fullName, startedAt: now, deadline: deadline,
    questions: questions, draft: {}, signals: {},
  };
}

function attemptPayload_(att) {
  return {
    attemptId: att.id,
    token: att.token,
    fullName: String(att.name),
    startedAt: iso_(toMs_(att.startedAt)),
    deadline: iso_(toMs_(att.deadline)),
    serverNow: iso_(Date.now()),
    savedAt: toMs_(att.savedAt) ? iso_(toMs_(att.savedAt)) : null,
    questions: att.questions.map(publicQuestion),
    answers: att.draft || {},
    signals: att.signals || {},
  };
}

/* ---------- Результаты и ответы ---------- */

/** Формулы строки «Результатов». Ссылаются на свою строку и на «Ответы» по ID, не по номерам строк. */
function resultFormulas_(r) {
  const c = cols_(SHEET.RESULTS, RES);
  const a = cols_(SHEET.ANSWERS, ANS);
  const L = function (k) { return '$' + colLetter_(c[k]) + r; };
  const A = function (k) { return "'" + SHEET.ANSWERS + "'!$" + colLetter_(a[k]) + ':$' + colLetter_(a[k]); };
  const avg = function (section) {
    return '=IFERROR(AVERAGE(FILTER(VALUE(' + A('score') + '),' + A('id') + '=' + L('id') + ',' +
      A('section') + '="' + section + '",' + A('score') + '<>"")),"")';
  };
  const gid = sheet_(SHEET.ANSWERS).getSheetId();
  return {
    satTotal: '=IF(AND(ISNUMBER(' + L('satMath') + '),ISNUMBER(' + L('satRW') + ')),' + L('satMath') + '+' + L('satRW') + ',"")',
    req: '=IF(AND(ISNUMBER(' + L('satTotal') + '),N(' + L('satTotal') + ')>=REQ_SAT_TOTAL,N(' + L('satMath') +
      ')>=REQ_SAT_SECTION,N(' + L('satRW') + ')>=REQ_SAT_SECTION),"Соответствует",IF(AND(ISNUMBER(' + L('ielts') +
      '),N(' + L('ielts') + ')>=REQ_IELTS),"IELTS ≥ "&TO_TEXT(REQ_IELTS)&": проверить математику","Ниже требований"))',
    explMath: avg(SECTION.MATH),
    explRW: avg(SECTION.RW),
    rated: '=IF(COUNTIF(' + A('id') + ',' + L('id') + ')=0,"",COUNTIFS(' + A('id') + ',' + L('id') + ',' + A('score') +
      ',"<>")&" из "&COUNTIF(' + A('id') + ',' + L('id') + '))',
    final: '=LET(attId,' + L('id') + ',stat,' + L('status') + ',auto,' + L('auto') +
      ',qn,COUNTIF(' + A('id') + ',attId),qd,COUNTIFS(' + A('id') + ',attId,' + A('score') + ',"<>"),avgM,' + L('explMath') +
      ',avgW,' + L('explRW') + ',low,IF(avgM="",avgW,IF(avgW="",avgM,MIN(avgM,avgW))),' +
      'IF(attId="","",IF(stat="' + RESULT_STATUS.IN_PROGRESS + '","В процессе",IF(auto="' + AUTO_STATUS.FAIL +
      '","Не прошёл: баллы",IF(LEFT(auto,6)="Резерв",auto,IF(OR(qn=0,qd<qn),"Проверить объяснения",' +
      'IF(low>=EXPL_PASS,"Прошёл",IF(low>=EXPL_REVIEW,"На усмотрение","Не прошёл: объяснения"))))))))',
    answers: '=IFERROR(HYPERLINK("#gid=' + gid + '&range=' + colLetter_(a.id) + '"&MATCH(' + L('id') + ',' + A('id') +
      ',0),"Открыть"),"")',
  };
}

function createResultRow_(id, c, startedAt, retake) {
  const row = sheet_(SHEET.RESULTS).getLastRow() + 1;
  const rec = {
    id: id,
    status: RESULT_STATUS.IN_PROGRESS,
    start: startedAt,
    name: text_(c.fullName),
    phone: text_(c.phone),
    email: text_(c.email),
    telegram: text_(c.telegram),
    satMath: c.satMath === null || c.satMath === undefined ? '' : c.satMath,
    satRW: c.satRW === null || c.satRW === undefined ? '' : c.satRW,
    ielts: c.ielts === null || c.ielts === undefined ? '' : c.ielts,
    mathBg: text_(c.mathBackground),
    experience: text_(c.experience),
    source: text_(c.source),
    flags: retake ? 'Повторная попытка' : '',
    retake: retake ? 'да' : '',
    allowRetake: false,
  };
  const f = resultFormulas_(row);
  Object.keys(f).forEach(function (k) { rec[k] = f[k]; });
  appendRecords_(SHEET.RESULTS, RES, [rec]);
  sheet_(SHEET.RESULTS).getRange(row, cols_(SHEET.RESULTS, RES).allowRetake).insertCheckboxes();
  return row;
}

/**
 * Проверяет попытку и пишет результат: «Попытки» → «Результаты» → «Ответы».
 * reason: manual | timer | abandoned. answers/signals = null → берутся из черновика.
 * @return {Object} данные для уведомления HR
 */
function finalizeAttempt_(att, answers, signals, reason, s) {
  const nowMs = Date.now();
  const startMs = toMs_(att.startedAt);
  const deadlineMs = toMs_(att.deadline);
  if (answers === null) answers = sanitizeAnswers(att.questions, att.draft);
  if (signals === null) signals = mergeSignals(att.signals, {});
  const endMs = reason === 'abandoned' ? Math.min(nowMs, deadlineMs) : nowMs;
  const lateMin = reason !== 'abandoned' && nowMs > deadlineMs + s.graceMin * 60000
    ? Math.round((nowMs - deadlineMs) / 60000) : 0;
  const retake = String(att.retake) === 'да';
  const g = gradeAttempt(att.questions, answers);
  const status = autoStatus(g.math, g.rw, g.total, s);
  const label = { manual: RESULT_STATUS.FINISHED, timer: RESULT_STATUS.TIMER, abandoned: RESULT_STATUS.ABANDONED }[reason];
  const flags = flagsText(signals, lateMin, retake);

  writeCells_(SHEET.ATTEMPTS, ATT, att._row, {
    state: ATTEMPT_STATE.DONE,
    finishedAt: new Date(endMs),
    finishReason: reason,
    draft: text_(JSON.stringify(answers)),
    signals: text_(JSON.stringify(signals)),
  });

  let row = findRow_(SHEET.RESULTS, RES, 'id', att.id);
  if (!row) row = createResultRow_(att.id, att.candidate, new Date(startMs), retake);
  writeCells_(SHEET.RESULTS, RES, row, {
    status: label,
    end: new Date(endMs),
    duration: text_(formatDuration(endMs - startMs)),
    math: g.math,
    rw: g.rw,
    total: g.total,
    auto: status,
    flags: text_(flags),
    blurCount: signals.blurCount,
    blurSeconds: signals.blurSeconds,
    pasteCount: signals.pasteCount,
    pasteChars: signals.pasteChars,
    copyCount: signals.copyCount,
    late: lateMin || '',
    retake: retake ? 'да' : '',
  });

  const date = new Date(endMs);
  const first = appendRecords_(SHEET.ANSWERS, ANS, g.items.map(function (it) {
    const q = it.question;
    return {
      id: att.id,
      name: text_(att.name),
      date: date,
      pos: q.pos,
      qid: q.id,
      section: q.section,
      text: text_(q.text),
      answer: text_(it.answerText),
      key: text_(keyText(q)),
      correct: it.correct ? 'да' : 'нет',
      explanation: text_(it.explanation),
    };
  }));
  sheet_(SHEET.ANSWERS).getRange(first, 1, 1, cols_(SHEET.ANSWERS, ANS)._width)
    .setBorder(true, null, null, null, null, null, '#5f6368', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  return {
    attemptId: att.id, name: String(att.name), row: row, reason: reason,
    math: g.math, rw: g.rw, total: g.total, mathMax: g.mathMax, rwMax: g.rwMax,
    status: status, flags: flags,
  };
}
