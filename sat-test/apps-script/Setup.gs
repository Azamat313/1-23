/**
 * Первичная настройка таблицы и меню «SAT-тест».
 * setup() можно запускать повторно: данные не стираются, недостающие листы, колонки
 * и параметры добавляются, форматирование и защита пересоздаются.
 */

const PROTECT_DESC = 'SAT-тест: автоколонка, заполняется сервером';
const HEADER_BG = '#1f3864';
const COLOR = {
  GREY: '#e0e0e0', RED: '#f4c7c3', BLUE: '#c9daf8', YELLOW: '#fce8b2', GREEN: '#b7e1cd', FLAG: '#ffe599',
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('SAT-тест')
    .addItem('Проверить лист «Вопросы»', 'menuCheckQuestions')
    .addItem('Закрыть просроченные попытки сейчас', 'menuCloseExpired')
    .addItem('Отправить тестовое уведомление', 'menuTestNotification')
    .addSeparator()
    .addItem('Настроить / обновить таблицу', 'setup')
    .addToUi();
}

/** Правки «Вопросов» и «Настроек» применяются сразу, не дожидаясь истечения кэша. */
function onEdit(e) {
  try {
    const name = e && e.range && e.range.getSheet().getName();
    if (name === SHEET.QUESTIONS || name === SHEET.SETTINGS) clearCaches_();
  } catch (ignore) { /* простой триггер не должен падать */ }
}

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  SS_ = ss;
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
  ss.setSpreadsheetTimeZone(TZ);
  try { ss.setSpreadsheetLocale('ru_RU'); } catch (ignore) { /* локаль не критична */ }

  setupSettings_(ss);
  setupQuestions_(ss);
  setupAnswers_(ss);
  setupResults_(ss);
  setupReserve_(ss);
  setupService_(ss, SHEET.ATTEMPTS, ATT, 3000, ['startedAt', 'deadline', 'savedAt', 'finishedAt', 'consentAt']);
  setupService_(ss, SHEET.LOG, LOG, 1000, ['time']);

  [SHEET.RESULTS, SHEET.ANSWERS, SHEET.RESERVE, SHEET.QUESTIONS, SHEET.SETTINGS, SHEET.ATTEMPTS, SHEET.LOG]
    .forEach(function (name, i) {
      ss.setActiveSheet(ss.getSheetByName(name));
      ss.moveActiveSheet(i + 1);
    });
  removeDefaultSheet_(ss);
  installTrigger_();
  clearCaches_();
  ss.setActiveSheet(ss.getSheetByName(SHEET.RESULTS));
  Logger.log('Готово. Разверните скрипт как веб-приложение (Deploy → New deployment → Web app).');
}

/* ---------- Общие помощники ---------- */

function ensureSheet_(ss, name, schema, minRows) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  const labels = Object.keys(schema).map(function (k) { return schema[k]; });
  const width = sh.getLastColumn();
  const header = width ? sh.getRange(1, 1, 1, width).getValues()[0].map(String) : [];
  const toAdd = header.filter(String).length ? labels.filter(function (l) { return header.indexOf(l) < 0; }) : labels;
  const startCol = header.filter(String).length ? width + 1 : 1;
  if (toAdd.length) {
    const need = startCol + toAdd.length - 1;
    if (sh.getMaxColumns() < need) sh.insertColumnsAfter(sh.getMaxColumns(), need - sh.getMaxColumns());
    sh.getRange(1, startCol, 1, toAdd.length).setValues([toAdd]);
  }
  const lastCol = sh.getLastColumn();
  if (sh.getMaxColumns() > lastCol) sh.deleteColumns(lastCol + 1, sh.getMaxColumns() - lastCol);
  if (sh.getMaxRows() < minRows) sh.insertRowsAfter(sh.getMaxRows(), minRows - sh.getMaxRows());
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, lastCol).setFontWeight('bold').setBackground(HEADER_BG).setFontColor('#ffffff')
    .setWrap(true).setVerticalAlignment('middle');
  sh.setRowHeight(1, 42);
  delete COLS_CACHE_[name];
  return sh;
}

function columnRange_(sh, col) {
  return sh.getRange(2, col, sh.getMaxRows() - 1, 1);
}

function setWidths_(sh, cols, widths) {
  Object.keys(widths).forEach(function (k) { sh.setColumnWidth(cols[k], widths[k]); });
}

/** Защита-предупреждение на автоколонках: правка возможна, но таблица спросит подтверждение. */
function protectAutoColumns_(sh, cols, schema, manual) {
  sh.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (p) {
    if (p.getDescription() === PROTECT_DESC) p.remove();
  });
  const auto = Object.keys(schema).filter(function (k) { return manual.indexOf(k) < 0; })
    .map(function (k) { return cols[k]; }).sort(function (a, b) { return a - b; });
  let i = 0;
  while (i < auto.length) {
    let j = i;
    while (j + 1 < auto.length && auto[j + 1] === auto[j] + 1) j++;
    sh.getRange(1, auto[i], sh.getMaxRows(), j - i + 1).protect().setDescription(PROTECT_DESC).setWarningOnly(true);
    i = j + 1;
  }
  sh.getRange(1, 1, 1, cols._width).protect().setDescription(PROTECT_DESC).setWarningOnly(true);
}

function ensureFilter_(sh) {
  const f = sh.getFilter();
  if (f && f.getRange().getNumRows() >= sh.getMaxRows()) return;
  if (f) f.remove();
  sh.getRange(1, 1, sh.getMaxRows(), sh.getLastColumn()).createFilter();
}

function listValidation_(values) {
  return SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(false).build();
}

/* ---------- Листы ---------- */

function setupSettings_(ss) {
  let sh = ss.getSheetByName(SHEET.SETTINGS);
  if (!sh) sh = ss.insertSheet(SHEET.SETTINGS);
  sh.getRange(1, 1, 1, 3).setValues([['Параметр', 'Значение', 'Пояснение']])
    .setFontWeight('bold').setBackground(HEADER_BG).setFontColor('#ffffff');
  sh.setFrozenRows(1);
  const last = sh.getLastRow();
  const existing = last >= 2 ? sh.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return String(r[0]).trim(); }) : [];
  const toAdd = SETTINGS_SCHEMA.filter(function (p) { return existing.indexOf(p.label) < 0; }).map(function (p) {
    return [p.label, p.def, p.note || ''];
  });
  if (toAdd.length) sh.getRange(sh.getLastRow() + 1, 1, toAdd.length, 3).setValues(toAdd);

  const labels = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]).trim(); });
  SETTINGS_SCHEMA.forEach(function (p) {
    const row = labels.indexOf(p.label) + 2;
    const cell = sh.getRange(row, 2);
    if (p.named) ss.setNamedRange(p.named, cell);
    if (p.type === 'bool') cell.setDataValidation(listValidation_(['Да', 'Нет']));
  });
  sh.setColumnWidth(1, 380);
  sh.setColumnWidth(2, 320);
  sh.setColumnWidth(3, 440);
  sh.getRange(2, 1, sh.getLastRow() - 1, 3).setWrap(true).setVerticalAlignment('top');
  sh.getRange(2, 2, sh.getLastRow() - 1, 1).setBackground('#fffdf0');
}

function setupQuestions_(ss) {
  const sh = ensureSheet_(ss, SHEET.QUESTIONS, QCOL, 100);
  const c = cols_(SHEET.QUESTIONS, QCOL);
  columnRange_(sh, c.key).setNumberFormat('@');
  if (sh.getLastRow() < 2) {
    const rows = DEFAULT_QUESTIONS.map(function (q) {
      const line = [];
      for (let i = 0; i < c._width; i++) line.push('');
      const put = function (k, v) { line[c[k] - 1] = v; };
      put('id', q.id);
      put('pos', q.pos);
      put('section', q.section);
      put('domain', q.domain);
      put('type', q.type);
      put('text', text_(q.text));
      ['A', 'B', 'C', 'D'].forEach(function (L) { put(L, text_(q[L] || '')); });
      put('suffix', text_(q.suffix || ''));
      put('key', q.key); // колонка в текстовом формате: «-11», «3;-1», «1/2» не превращаются в число или дату
      put('tolerance', q.type === 'choice' ? '' : q.tolerance);
      put('active', 'да');
      return line;
    });
    sh.getRange(2, 1, rows.length, c._width).setValues(rows);
  }
  columnRange_(sh, c.type).setDataValidation(listValidation_(['number', 'line', 'choice']));
  columnRange_(sh, c.section).setDataValidation(listValidation_([SECTION.MATH, SECTION.RW]));
  columnRange_(sh, c.active).setDataValidation(listValidation_(['да', 'нет']));
  columnRange_(sh, c.tolerance).setNumberFormat('0.####');
  sh.getRange(1, c.type).setNote('number — число; line — уравнение y = mx + b (два поля); choice — варианты A–D');
  sh.getRange(1, c.key).setNote('number: число, например -11\nline: «m;b», например 3;-1\nchoice: буква A–D');
  sh.getRange(1, c.tolerance).setNote('Допуск при сравнении чисел. Пусто = 0,0001');
  sh.getRange(1, c.active).setNote('На каждой позиции должен быть ровно один активный вопрос. ' +
    'После правок: меню «SAT-тест» → «Проверить лист „Вопросы“».');
  sh.getRange(1, c.suffix).setNote('Знак справа от поля ответа, например %');
  setWidths_(sh, c, { id: 60, pos: 80, section: 70, domain: 200, type: 80, text: 420, A: 110, B: 110, C: 110, D: 110, suffix: 80, key: 80, tolerance: 80, active: 80 });
  columnRange_(sh, c.text).setWrap(true);
  sh.getRange(2, 1, sh.getMaxRows() - 1, c._width).setVerticalAlignment('top');
}

function setupAnswers_(ss) {
  const sh = ensureSheet_(ss, SHEET.ANSWERS, ANS, 20000);
  const c = cols_(SHEET.ANSWERS, ANS);
  columnRange_(sh, c.date).setNumberFormat(DATE_TIME_FORMAT);
  columnRange_(sh, c.score).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['1', '2', '3', '4', '5'], true).setAllowInvalid(false)
      .setHelpText('Оценка 1–5: 5 — пошагово и понятно для ученика; 1 — нет объяснения или скопировано').build());
  setWidths_(sh, c, { id: 90, name: 170, date: 125, pos: 40, qid: 70, section: 60, text: 300, answer: 150, key: 150, correct: 60, explanation: 440, score: 90, comment: 240 });
  [c.text, c.explanation, c.comment, c.answer, c.key].forEach(function (col) { columnRange_(sh, col).setWrap(true); });
  sh.getRange(2, 1, sh.getMaxRows() - 1, c._width).setVerticalAlignment('top');
  columnRange_(sh, c.score).setBackground('#fffdf0').setHorizontalAlignment('center');
  columnRange_(sh, c.comment).setBackground('#fffdf0');
  const corr = columnRange_(sh, c.correct);
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('нет').setBackground(COLOR.RED).setRanges([corr]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('да').setBackground(COLOR.GREEN).setRanges([corr]).build(),
  ]);
  ensureFilter_(sh);
  protectAutoColumns_(sh, c, ANS, ANS_MANUAL);
}

function setupResults_(ss) {
  const sh = ensureSheet_(ss, SHEET.RESULTS, RES, 3000);
  const c = cols_(SHEET.RESULTS, RES);
  const col = function (k) { return columnRange_(sh, c[k]); };
  ['start', 'end'].forEach(function (k) { col(k).setNumberFormat(DATE_TIME_FORMAT); });
  ['explMath', 'explRW'].forEach(function (k) { col(k).setNumberFormat('0.0'); });
  col('ielts').setNumberFormat('0.0');
  // Чекбокс «Разрешить пересдачу» ставится в строку при её создании: чекбоксы на всю колонку
  // хранят FALSE, и getLastRow() считал бы их данными.
  setWidths_(sh, c, {
    id: 90, status: 150, start: 120, end: 120, duration: 90, name: 190, phone: 125, email: 190, telegram: 120,
    satMath: 70, satRW: 70, satTotal: 70, ielts: 60, mathBg: 200, experience: 110, source: 120, req: 200,
    math: 55, rw: 55, total: 60, auto: 120, explMath: 95, explRW: 95, rated: 80, final: 175, flags: 260,
    blurCount: 70, blurSeconds: 90, pasteCount: 70, pasteChars: 90, copyCount: 90, late: 90, retake: 90,
    answers: 80, reviewer: 110, comment: 240, allowRetake: 100,
  });
  ['mathBg', 'flags', 'comment', 'req'].forEach(function (k) { col(k).setWrap(true); });
  sh.getRange(2, 1, sh.getMaxRows() - 1, c._width).setVerticalAlignment('top');
  ['reviewer', 'comment', 'allowRetake'].forEach(function (k) { col(k).setBackground('#fffdf0'); });
  setResultsFormatting_(sh, c);
  ensureFilter_(sh);
  protectAutoColumns_(sh, c, RES, RES_MANUAL);
}

function setResultsFormatting_(sh, c) {
  const rng = function (k) { return columnRange_(sh, c[k]); };
  const L = function (k) { return '$' + colLetter_(c[k]) + '2'; };
  const rules = [];
  const add = function (ranges, build) {
    rules.push(build(SpreadsheetApp.newConditionalFormatRule()).setRanges([].concat(ranges)).build());
  };
  const fin = rng('final');
  add(fin, function (b) { return b.whenTextEqualTo('В процессе').setBackground(COLOR.GREY); });
  add(fin, function (b) { return b.whenTextStartsWith('Не прошёл').setBackground(COLOR.RED); });
  add(fin, function (b) { return b.whenTextStartsWith('Резерв').setBackground(COLOR.BLUE); });
  add(fin, function (b) { return b.whenTextEqualTo('Проверить объяснения').setBackground(COLOR.YELLOW); });
  add(fin, function (b) { return b.whenTextEqualTo('На усмотрение').setBackground(COLOR.YELLOW); });
  add(fin, function (b) { return b.whenTextEqualTo('Прошёл').setBackground(COLOR.GREEN); });
  const auto = rng('auto');
  add(auto, function (b) { return b.whenTextEqualTo(AUTO_STATUS.PASS).setBackground(COLOR.GREEN); });
  add(auto, function (b) { return b.whenTextEqualTo(AUTO_STATUS.FAIL).setBackground(COLOR.RED); });
  add(auto, function (b) { return b.whenTextStartsWith('Резерв').setBackground(COLOR.BLUE); });

  const blur = 'OR(N(' + L('blurCount') + ')>=INDIRECT("FLAG_BLUR_COUNT"),N(' + L('blurSeconds') + ')>=INDIRECT("FLAG_BLUR_SECONDS"))';
  const paste = 'N(' + L('pasteChars') + ')>=INDIRECT("FLAG_PASTE_CHARS")';
  const copy = 'N(' + L('copyCount') + ')>=1';
  const late = 'N(' + L('late') + ')>0';
  const retake = L('retake') + '="да"';
  const flag = function (ranges, formula) {
    add(ranges, function (b) { return b.whenFormulaSatisfied('=' + formula).setBackground(COLOR.FLAG); });
  };
  flag([rng('blurCount'), rng('blurSeconds')], blur);
  flag([rng('pasteCount'), rng('pasteChars')], paste);
  flag(rng('copyCount'), copy);
  flag(rng('late'), late);
  flag(rng('retake'), retake);
  flag(rng('flags'), 'OR(' + [blur, paste, copy, late, retake].join(',') + ')');
  sh.setConditionalFormatRules(rules);
}

function setupReserve_(ss) {
  let sh = ss.getSheetByName(SHEET.RESERVE);
  if (!sh) sh = ss.insertSheet(SHEET.RESERVE);
  const headers = ['ФИО', 'Телефон', 'Email', 'Telegram', 'Сильная секция', 'Math', 'R&W', 'Итого', 'Дата', 'Комментарий'];
  sh.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground(HEADER_BG).setFontColor('#ffffff');
  sh.setFrozenRows(1);
  const c = cols_(SHEET.RESULTS, RES);
  const R = function (k) { return "'" + SHEET.RESULTS + "'!" + colLetter_(c[k]) + '2:' + colLetter_(c[k]); };
  const formula = '=IFERROR(ARRAYFORMULA(FILTER({' + [
    R('name'), R('phone'), R('email'), R('telegram'), 'SUBSTITUTE(' + R('auto') + ',"Резерв: ","")',
    R('math'), R('rw'), R('total'), R('end'), R('comment'),
  ].join(',') + '},LEFT(' + R('auto') + ',6)="Резерв")),"")';
  sh.getRange(2, 1, sh.getMaxRows() - 1, headers.length).clearContent();
  sh.getRange(2, 1).setFormula(formula);
  sh.getRange(2, 9, sh.getMaxRows() - 1, 1).setNumberFormat(DATE_TIME_FORMAT);
  [190, 125, 190, 120, 110, 60, 60, 60, 120, 260].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (p) { p.remove(); });
  sh.protect().setDescription('Лист собирается формулой из «Результатов»').setWarningOnly(true);
}

function setupService_(ss, name, schema, minRows, dateKeys) {
  const sh = ensureSheet_(ss, name, schema, minRows);
  const c = cols_(name, schema);
  dateKeys.forEach(function (k) { columnRange_(sh, c[k]).setNumberFormat('dd.MM.yyyy HH:mm:ss'); });
  sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (p) { p.remove(); });
  sh.protect().setDescription('Служебный лист: заполняется сервером').setWarningOnly(true);
  sh.hideSheet();
}

function removeDefaultSheet_(ss) {
  ['Лист1', 'Sheet1'].forEach(function (n) {
    const sh = ss.getSheetByName(n);
    if (sh && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
  });
}

function installTrigger_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'closeExpiredAttempts') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('closeExpiredAttempts').timeBased().everyMinutes(10).create();
}

/* ---------- Пункты меню ---------- */

function menuCheckQuestions() {
  clearCaches_();
  let msg;
  try {
    const qs = getQuestions_(true);
    msg = 'Всё в порядке: активных вопросов — ' + qs.length + '.\n' +
      qs.map(function (q) { return q.pos + '. ' + q.id + ' (' + q.section + ', ' + q.type + ')'; }).join('\n');
  } catch (e) {
    msg = e.errors ? 'Тест не запустится, пока не исправлены ошибки:\n• ' + e.errors.join('\n• ') : String(e);
  }
  SpreadsheetApp.getUi().alert(msg);
}

function menuCloseExpired() {
  const n = closeExpiredAttempts();
  SpreadsheetApp.getUi().alert('Закрыто просроченных попыток: ' + n);
}

function menuTestNotification() {
  notifyHr_({
    attemptId: 'SAT-TEST', name: 'Тестовое уведомление', row: 2, reason: 'manual',
    math: 4, rw: 3, total: 7, mathMax: 4, rwMax: 4, status: AUTO_STATUS.PASS, flags: '',
  });
  SpreadsheetApp.getUi().alert('Уведомление отправлено. Если оно не пришло — посмотрите скрытый лист «Лог».');
}

/** Сбросить нумерацию попыток (после удаления тестовых строк перед запуском). */
function resetAttemptCounter() {
  PropertiesService.getScriptProperties().deleteProperty('LAST_ATTEMPT_NO');
}
