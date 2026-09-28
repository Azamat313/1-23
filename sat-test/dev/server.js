/**
 * Локальный сервер для разработки: раздаёт web/ и эмулирует Web App на /api
 * настоящим кодом из apps-script/ поверх таблицы в памяти.
 *
 *   node dev/server.js            → http://localhost:8080
 *   PORT=3000 DURATION_MIN=2 node dev/server.js
 *
 * Состояние таблицы: GET /dev/sheets (JSON), GET /dev/sheets/<лист>.
 * Сдвиг часов сервера: POST /dev/clock?minutes=31. Триггер: POST /dev/trigger.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { createGas } = require('./gas-emulator');

const PORT = Number(process.env.PORT || 8080);
const WEB_DIR = path.join(__dirname, '..', 'web');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

const gas = createGas({ quiet: !process.env.VERBOSE });
gas.setup();
if (process.env.DURATION_MIN) gas.setSetting('Длительность теста, мин', Number(process.env.DURATION_MIN));
gas.setSetting('Контакт HR для кандидатов', process.env.HR_CONTACT || '@jts_hr');
gas.setSetting('Email для уведомлений', 'hr@example.com');

// Триггер закрытия просроченных попыток: в Apps Script — раз в 10 минут, здесь — раз в 30 секунд.
setInterval(() => gas.ctx.closeExpiredAttempts(), 30000).unref();

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type || 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => resolve(data));
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const delay = Number(process.env.API_DELAY_MS || 0);

  if (url.pathname === '/api' && req.method === 'POST') {
    const body = await readBody(req);
    if (delay) await new Promise((r) => setTimeout(r, delay));
    const out = gas.ctx.doPost({ postData: { contents: body } });
    return send(res, 200, out.getContent());
  }
  if (url.pathname === '/config.js') {
    return send(res, 200, "window.SAT_CONFIG = { apiUrl: '/api' };", TYPES['.js']);
  }
  if (url.pathname.startsWith('/dev/sheets')) {
    const name = decodeURIComponent(url.pathname.slice('/dev/sheets/'.length));
    if (name) return send(res, 200, JSON.stringify(gas.records(name), null, 2));
    const all = {};
    gas.ss.sheets.forEach((s) => { all[s.name] = gas.records(s.name); });
    return send(res, 200, JSON.stringify(all, null, 2));
  }
  if (url.pathname === '/dev/mail') return send(res, 200, JSON.stringify(gas.mail, null, 2));
  if (url.pathname === '/dev/clock' && req.method === 'POST') {
    gas.clock.offset += Number(url.searchParams.get('minutes') || 0) * 60000;
    return send(res, 200, JSON.stringify({ offsetMin: gas.clock.offset / 60000 }));
  }
  if (url.pathname === '/dev/trigger' && req.method === 'POST') {
    return send(res, 200, JSON.stringify({ closed: gas.ctx.closeExpiredAttempts() }));
  }
  if (url.pathname === '/dev/setting' && req.method === 'POST') {
    gas.setSetting(url.searchParams.get('label'), url.searchParams.get('value'));
    return send(res, 200, '{"ok":true}');
  }
  if (url.pathname === '/dev/cell' && req.method === 'POST') {
    const p = url.searchParams;
    const v = p.get('value');
    gas.setCell(p.get('sheet'), Number(p.get('row')), p.get('header'), v === 'true' ? true : v === 'false' ? false : v);
    return send(res, 200, '{"ok":true}');
  }

  const file = path.normalize(path.join(WEB_DIR, url.pathname === '/' ? 'index.html' : url.pathname));
  if (!file.startsWith(WEB_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, 'Not found', 'text/plain');
  send(res, 200, fs.readFileSync(file), TYPES[path.extname(file)] || 'application/octet-stream');
});

server.listen(PORT, () => console.log(`SAT-тест: http://localhost:${PORT}  (таблица: /dev/sheets)`));
