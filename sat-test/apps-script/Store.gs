/**
 * Работа с таблицей: листы, колонки по заголовкам, чтение и запись строк, настройки, вопросы, лог.
 */

let SS_ = null;
const COLS_CACHE_ = {};

function ss_() {
  if (SS_) return SS_;
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  SS_ = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  return SS_;
}

function sheet_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('Нет листа «' + name + '». Запустите setup() в редакторе скрипта.');
  return sh;
}

/** Номера колонок листа по заголовкам: {key: номер колонки с 1}. */
function cols_(name, schema) {
  if (COLS_CACHE_[name]) return COLS_CACHE_[name];
  const sh = sheet_(name);
  const width = sh.getLastColumn();
  const header = width ? sh.getRange(1, 1, 1, width).getValues()[0].map(function (h) { return String(h).trim(); }) : [];
  const map = { _width: width };
  Object.keys(schema).forEach(function (k) {
    const i = header.indexOf(schema[k]);
    if (i < 0) throw new Error('На листе «' + name + '» нет колонки «' + schema[k] + '». Запустите setup().');
    map[k] = i + 1;
  });
  COLS_CACHE_[name] = map;
  return map;
}

function colLetter_(n) {
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/**
 * Текст от кандидата всегда пишется с апострофом в начале: таблица сохраняет его как текст,
 * не выполняет «=IMPORTXML(…)» и не превращает «5,0» в число или «01.10» в дату.
 */
function text_(value) {
  const s = String(value == null ? '' : value);
  return s === '' ? '' : "'" + s;
}

/** Читает строки листа как объекты. Возвращает [{_row, key: value, …}]. */
function readRecords_(name, schema, maxCol) {
  const sh = sheet_(name);
  const cols = cols_(name, schema);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const width = maxCol || cols._width;
  const values = sh.getRange(2, 1, last - 1, width).getValues();
  const keys = Object.keys(schema).filter(function (k) { return cols[k] <= width; });
  return values.map(function (row, i) {
    const rec = { _row: i + 2 };
    keys.forEach(function (k) { rec[k] = row[cols[k] - 1]; });
    return rec;
  });
}

function readRecordAt_(name, schema, row) {
  const cols = cols_(name, schema);
  const values = sheet_(name).getRange(row, 1, 1, cols._width).getValues()[0];
  const rec = { _row: row };
  Object.keys(schema).forEach(function (k) { rec[k] = values[cols[k] - 1]; });
  return rec;
}

/** Номер строки с данным ID в колонке idKey (поиск снизу вверх) или 0. */
function findRow_(name, schema, idKey, id) {
  const sh = sheet_(name);
  const col = cols_(name, schema)[idKey];
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const values = sh.getRange(2, col, last - 1, 1).getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (String(values[i][0]) === String(id)) return i + 2;
  }
  return 0;
}

/** Пишет значения {key: value} в строку, объединяя соседние колонки в одну запись. */
function writeCells_(name, schema, row, obj) {
  const sh = sheet_(name);
  const cols = cols_(name, schema);
  const entries = Object.keys(obj).map(function (k) { return [cols[k], obj[k]]; })
    .sort(function (a, b) { return a[0] - b[0]; });
  let i = 0;
  while (i < entries.length) {
    let j = i;
    while (j + 1 < entries.length && entries[j + 1][0] === entries[j][0] + 1) j++;
    const vals = entries.slice(i, j + 1).map(function (e) { return e[1]; });
    sh.getRange(row, entries[i][0], 1, vals.length).setValues([vals]);
    i = j + 1;
  }
}

/** Добавляет строки в конец листа. rows — массив объектов {key: value}. Возвращает номер первой строки. */
function appendRecords_(name, schema, rows) {
  const sh = sheet_(name);
  const cols = cols_(name, schema);
  const first = sh.getLastRow() + 1;
  const need = first + rows.length - 1 - sh.getMaxRows();
  if (need > 0) sh.insertRowsAfter(sh.getMaxRows(), need + 100);
  const matrix = rows.map(function (obj) {
    const line = [];
    for (let c = 0; c < cols._width; c++) line.push('');
    Object.keys(obj).forEach(function (k) { line[cols[k] - 1] = obj[k]; });
    return line;
  });
  sh.getRange(first, 1, rows.length, cols._width).setValues(matrix);
  return first;
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    return fn();
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

function formatDate_(date, pattern) {
  return Utilities.formatDate(date, TZ, pattern || DATE_TIME_FORMAT);
}

function logEvent_(level, action, attemptId, message) {
  try {
    appendRecords_(SHEET.LOG, LOG, [{
      time: new Date(), level: level, action: action || '', attemptId: attemptId || '', message: text_(String(message).slice(0, 5000)),
    }]);
  } catch (e) {
    console.error('Лог не записан: ' + e + ' / ' + message);
  }
}

/* ---------- Настройки ---------- */

function parseBool_(v) {
  if (v === true) return true;
  return ['да', 'yes', 'true', '1', 'вкл'].indexOf(String(v == null ? '' : v).trim().toLowerCase()) >= 0;
}

function getSettings_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('settings');
  if (cached) return JSON.parse(cached);
  const sh = sheet_(SHEET.SETTINGS);
  const last = sh.getLastRow();
  const byLabel = {};
  if (last >= 2) {
    sh.getRange(2, 1, last - 1, 2).getValues().forEach(function (r) { byLabel[String(r[0]).trim()] = r[1]; });
  }
  const s = {};
  SETTINGS_SCHEMA.forEach(function (p) {
    const raw = Object.prototype.hasOwnProperty.call(byLabel, p.label) ? byLabel[p.label] : '';
    const empty = raw === '' || raw === null;
    if (p.type === 'bool') s[p.key] = parseBool_(empty ? p.def : raw);
    else if (p.type === 'number') {
      const n = empty ? null : parseNumberInput(raw);
      s[p.key] = n === null ? p.def : n;
    } else s[p.key] = empty ? p.def : String(raw).trim();
  });
  cache.put('settings', JSON.stringify(s), SETTINGS_CACHE_SECONDS);
  return s;
}

/* ---------- Вопросы ---------- */

function QuestionsError(errors) {
  this.name = 'QuestionsError';
  this.errors = errors;
  this.message = 'Ошибки в листе «Вопросы»: ' + errors.join('; ');
}

/** Активные вопросы с ключами. Кэш 5 минут. Ошибки заполнения → QuestionsError. */
function getQuestions_(noCache) {
  const cache = CacheService.getScriptCache();
  if (!noCache) {
    const cached = cache.get('questions');
    if (cached) return JSON.parse(cached);
  }
  const built = buildQuestions(readRecords_(SHEET.QUESTIONS, QCOL));
  if (built.errors.length) throw new QuestionsError(built.errors);
  cache.put('questions', JSON.stringify(built.questions), QUESTIONS_CACHE_SECONDS);
  return built.questions;
}

function clearCaches_() {
  CacheService.getScriptCache().removeAll(['settings', 'questions']);
}
