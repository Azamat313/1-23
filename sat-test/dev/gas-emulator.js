/**
 * Эмулятор Google Apps Script для локальной разработки и тестов.
 * Загружает настоящие файлы из apps-script/ в изолированный контекст Node и подставляет
 * in-memory таблицу вместо SpreadsheetApp. Форматирование, защита и триггеры — заглушки.
 *
 * Не деплоится: в браузер кандидата этот код не попадает.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const SCRIPT_DIR = path.join(__dirname, '..', 'apps-script');
const FILES = ['Config.gs', 'Validation.gs', 'Grading.gs', 'Store.gs', 'Api.gs', 'Notify.gs', 'Setup.gs'];

/** Объект, у которого любой неизвестный метод — ничего не делающая цепочка. */
function chainable(target) {
  const proxy = new Proxy(target, {
    get(t, key) {
      if (key in t) {
        const v = t[key];
        return typeof v === 'function' ? v.bind(t) : v;
      }
      if (key === 'then' || typeof key === 'symbol') return undefined;
      return () => proxy;
    },
  });
  return proxy;
}

function noopChain() {
  const p = new Proxy(function () {}, {
    get: (t, key) => (key === 'then' || typeof key === 'symbol' ? undefined : () => p),
    apply: () => p,
  });
  return p;
}

class Cell {
  constructor(value, formula) {
    this.value = value;
    this.formula = formula || '';
  }
}

/** Как Google Sheets понимает записанное значение: апостроф → текст, «=» → формула. */
function toCell(v) {
  if (typeof v === 'string') {
    if (v.startsWith("'")) return new Cell(v.slice(1));
    if (v.startsWith('=')) return new Cell('', v);
  }
  return new Cell(v === undefined || v === null ? '' : v);
}

class FakeRange {
  constructor(sheet, row, col, numRows, numCols) {
    if (row < 1 || col < 1 || numRows < 1 || numCols < 1) throw new Error(`Некорректный диапазон ${row},${col},${numRows},${numCols}`);
    if (row + numRows - 1 > sheet.maxRows) throw new Error(`Диапазон за пределами листа «${sheet.name}» (строк ${sheet.maxRows})`);
    if (col + numCols - 1 > sheet.maxCols) throw new Error(`Диапазон за пределами листа «${sheet.name}» (колонок ${sheet.maxCols})`);
    Object.assign(this, { sheet, row, col, numRows, numCols });
  }
  getRow() { return this.row; }
  getColumn() { return this.col; }
  getNumRows() { return this.numRows; }
  getNumColumns() { return this.numCols; }
  getSheet() { return this.sheet.proxy; }
  getValues() {
    const out = [];
    for (let r = 0; r < this.numRows; r++) {
      const line = [];
      for (let c = 0; c < this.numCols; c++) line.push(this.sheet.cell(this.row + r, this.col + c).value);
      out.push(line);
    }
    return out;
  }
  getValue() { return this.getValues()[0][0]; }
  getFormulas() {
    const out = [];
    for (let r = 0; r < this.numRows; r++) {
      const line = [];
      for (let c = 0; c < this.numCols; c++) line.push(this.sheet.cell(this.row + r, this.col + c).formula);
      out.push(line);
    }
    return out;
  }
  setValues(values) {
    if (values.length !== this.numRows || values.some((l) => l.length !== this.numCols)) {
      throw new Error(`Размер данных не совпадает с диапазоном ${this.numRows}×${this.numCols}`);
    }
    values.forEach((line, r) => line.forEach((v, c) => this.sheet.put(this.row + r, this.col + c, toCell(v))));
    return this.proxy;
  }
  setValue(v) { return this.setValues([[v]]); }
  setFormula(f) { this.sheet.put(this.row, this.col, new Cell('', f)); return this.proxy; }
  clearContent() {
    for (let r = 0; r < this.numRows; r++) for (let c = 0; c < this.numCols; c++) this.sheet.put(this.row + r, this.col + c, new Cell(''));
    return this.proxy;
  }
}

class FakeSheet {
  constructor(ss, name, id) {
    Object.assign(this, { ss, name, id, rows: [], maxRows: 1000, maxCols: 26, hidden: false });
    this.proxy = chainable(this);
  }
  cell(r, c) { return (this.rows[r - 1] && this.rows[r - 1][c - 1]) || new Cell(''); }
  put(r, c, cell) {
    while (this.rows.length < r) this.rows.push([]);
    this.rows[r - 1][c - 1] = cell;
  }
  getName() { return this.name; }
  getSheetId() { return this.id; }
  getMaxRows() { return this.maxRows; }
  getMaxColumns() { return this.maxCols; }
  insertRowsAfter(after, n) { this.maxRows += n; return this.proxy; }
  insertColumnsAfter(after, n) { this.maxCols += n; return this.proxy; }
  deleteColumns(start, n) {
    this.rows.forEach((line) => line.splice(start - 1, n));
    this.maxCols -= n;
    return this.proxy;
  }
  isEmptyCell(cell) { return !cell || (cell.value === '' && !cell.formula); }
  getLastRow() {
    for (let r = this.rows.length; r > 0; r--) if ((this.rows[r - 1] || []).some((c) => !this.isEmptyCell(c))) return r;
    return 0;
  }
  getLastColumn() {
    let max = 0;
    this.rows.forEach((line) => line.forEach((c, i) => { if (!this.isEmptyCell(c)) max = Math.max(max, i + 1); }));
    return max;
  }
  getRange(row, col, numRows, numCols) {
    const range = new FakeRange(this, row, col, numRows || 1, numCols || 1);
    range.proxy = chainable(range);
    return range.proxy;
  }
  getDataRange() { return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); }
  hideSheet() { this.hidden = true; return this.proxy; }
  getFilter() { return null; }
  getProtections() { return []; }
  protect() { return noopChain(); }
  /** Значения листа для отладки: формулы показываются как текст. */
  dump() {
    const width = this.getLastColumn();
    const out = [];
    for (let r = 1; r <= this.getLastRow(); r++) {
      const line = [];
      for (let c = 1; c <= width; c++) {
        const cell = this.cell(r, c);
        line.push(cell.formula ? cell.formula : cell.value);
      }
      out.push(line);
    }
    return out;
  }
}

class FakeSpreadsheet {
  constructor() {
    this.sheets = [];
    this.namedRanges = {};
    this.nextId = 1000;
    this.proxy = chainable(this);
    this.insertSheet('Sheet1');
  }
  getId() { return 'fake-spreadsheet'; }
  getUrl() { return 'http://localhost/fake-spreadsheet'; }
  getSheets() { return this.sheets.map((s) => s.proxy); }
  getSheetByName(name) {
    const s = this.sheets.find((x) => x.name === name);
    return s ? s.proxy : null;
  }
  insertSheet(name) {
    const s = new FakeSheet(this, name, this.nextId++);
    this.sheets.push(s);
    return s.proxy;
  }
  deleteSheet(proxy) {
    this.sheets = this.sheets.filter((s) => s.proxy !== proxy);
  }
  setNamedRange(name, range) { this.namedRanges[name] = range; }
  raw(name) { return this.sheets.find((x) => x.name === name); }
}

function formatDateTz(date, tz, pattern) {
  const parts = {};
  new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date(date.getTime())).forEach((p) => { parts[p.type] = p.value; });
  if (parts.hour === '24') parts.hour = '00';
  return pattern
    .replace('yyyy', parts.year).replace('MM', parts.month).replace('dd', parts.day)
    .replace('HH', parts.hour).replace('mm', parts.minute).replace('ss', parts.second);
}

/**
 * Создаёт окружение Apps Script.
 * @return {{ctx, ss, clock, mail, telegram, props, call, setup, sheet}}
 */
function createGas(options) {
  options = options || {};
  const clock = { offset: 0 };
  const realNow = () => Date.now() + clock.offset;
  class FakeDate extends Date {
    constructor(...args) {
      if (args.length === 0) super(realNow());
      else super(...args);
    }
    static now() { return realNow(); }
  }

  const ss = new FakeSpreadsheet();
  const props = {};
  const cache = new Map();
  const mail = [];
  const telegram = [];
  const logs = [];

  const context = {
    console: options.quiet ? { log() {}, warn() {}, error: (...a) => logs.push(a.join(' ')) } : console,
    Date: FakeDate,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss.proxy,
      openById: () => ss.proxy,
      flush() {},
      BorderStyle: { SOLID_MEDIUM: 'SOLID_MEDIUM' },
      ProtectionType: { RANGE: 'RANGE', SHEET: 'SHEET' },
      newDataValidation: noopChain,
      newConditionalFormatRule: noopChain,
      getUi: noopChain,
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (k in props ? props[k] : null),
        setProperty: (k, v) => { props[k] = String(v); },
        deleteProperty: (k) => { delete props[k]; },
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => {
          const e = cache.get(k);
          return e && e.exp > realNow() ? e.v : null;
        },
        put: (k, v, ttl) => { cache.set(k, { v, exp: realNow() + (ttl || 600) * 1000 }); },
        remove: (k) => cache.delete(k),
        removeAll: (keys) => keys.forEach((k) => cache.delete(k)),
      }),
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock: () => true, releaseLock() {} }) },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      formatDate: formatDateTz,
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (s) => chainable({ content: s, getContent() { return this.content; } }),
    },
    MailApp: { sendEmail: (m) => { mail.push(m); } },
    UrlFetchApp: {
      fetch: (url, params) => {
        telegram.push({ url, payload: JSON.parse(params.payload) });
        return { getResponseCode: () => 200, getContentText: () => '{"ok":true}' };
      },
    },
    ScriptApp: { getProjectTriggers: () => [], deleteTrigger() {}, newTrigger: noopChain },
    Logger: { log() {} },
  };
  vm.createContext(context);
  FILES.forEach((f) => vm.runInContext(fs.readFileSync(path.join(SCRIPT_DIR, f), 'utf8'), context, { filename: f }));

  const api = {
    ctx: context,
    ss,
    clock,
    mail,
    telegram,
    props,
    logs,
    /** Вызов Web App так же, как это делает браузер. */
    call(body) {
      const out = context.doPost({ postData: { contents: JSON.stringify(body) } });
      return JSON.parse(out.getContent());
    },
    eval(code) { return vm.runInContext(code, context); },
    setup() { context.setup(); },
    sheet(name) { return ss.raw(name); },
    /** Лист как массив объектов по заголовкам. */
    records(name) {
      const rows = ss.raw(name).dump();
      const header = rows[0] || [];
      return rows.slice(1).map((line) => Object.fromEntries(header.map((h, i) => [h, line[i]])));
    },
    /** Меняет значение в «Настройках» по названию параметра. */
    setSetting(label, value) {
      const sh = ss.raw('Настройки');
      for (let r = 2; r <= sh.getLastRow(); r++) {
        if (sh.cell(r, 1).value === label) {
          sh.put(r, 2, toCell(value));
          cache.clear();
          return;
        }
      }
      throw new Error('Нет параметра ' + label);
    },
    setCell(sheetName, row, header, value) {
      const sh = ss.raw(sheetName);
      const col = sh.dump()[0].indexOf(header) + 1;
      if (!col) throw new Error('Нет колонки ' + header);
      sh.put(row, col, toCell(value));
      cache.clear();
    },
    clearCache() { cache.clear(); },
  };
  return api;
}

module.exports = { createGas };
