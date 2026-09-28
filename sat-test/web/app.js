/**
 * Тестовое задание SAT — клиент.
 * Браузер знает только условия заданий: ключи, проверка и время старта хранятся на сервере.
 */
(function () {
  'use strict';

  var CFG = window.SAT_CONFIG || {};
  var API_URL = CFG.apiUrl || '';
  var SAVE_INTERVAL_MS = 30000;
  var RETRY_DELAYS = [2000, 4000, 8000, 16000];
  var RETRY_LATER_MS = 30000;
  var LS_ATTEMPT = 'sat.attempt';
  var LS_FORM = 'sat.form';
  var SIGNAL_KEYS = ['blurCount', 'blurSeconds', 'pasteCount', 'pasteChars', 'copyCount'];

  var S = {
    config: null,
    candidate: null,
    attempt: null, // {attemptId, token, questions, deadline, fullName}
    answers: {},
    signals: emptySignals(),
    current: 0,
    sync: null, // {remaining, perf}
    version: 0,
    savedVersion: 0,
    saving: false,
    retryIdx: 0,
    retryTimer: null,
    lastSavedAt: null,
    offline: false,
    locked: false,
    submitting: false,
    finished: false,
    expiredOnResume: false,
    warned: {},
    awaySince: null,
    loops: [],
  };

  /* ---------- Утилиты ---------- */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function emptySignals() { return { blurCount: 0, blurSeconds: 0, pasteCount: 0, pasteChars: 0, copyCount: 0 }; }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function lsGet(key) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* хранилище недоступно */ }
  }
  function lsDel(key) {
    try { localStorage.removeItem(key); } catch (e) { /* хранилище недоступно */ }
  }
  function draftKey(id) { return 'sat.draft.' + id; }

  function formatClock(ms) {
    var sec = Math.max(0, Math.ceil(ms / 1000));
    return pad(Math.floor(sec / 60)) + ':' + pad(sec % 60);
  }

  function retryDelay(i) { return i < RETRY_DELAYS.length ? RETRY_DELAYS[i] : RETRY_LATER_MS; }

  /* ---------- API ---------- */

  function NetworkError(message) { this.name = 'NetworkError'; this.message = message; }

  function api(action, body) {
    var payload = Object.assign({ action: action }, body || {});
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 25000);
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: ctrl ? ctrl.signal : undefined,
    }).then(function (resp) {
      clearTimeout(timer);
      if (!resp.ok) throw new NetworkError('HTTP ' + resp.status);
      return resp.json().catch(function () { throw new NetworkError('Некорректный ответ сервера'); });
    }, function (err) {
      clearTimeout(timer);
      throw new NetworkError(err && err.message);
    });
  }

  /* ---------- Экраны ---------- */

  function show(name) {
    $all('[data-screen]').forEach(function (el) { el.hidden = el.getAttribute('data-screen') !== name; });
    window.scrollTo(0, 0);
    var h = $('[data-screen="' + name + '"] h1');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }

  function hrContactHtml() {
    var c = S.config && S.config.hrContact;
    if (!c) return '';
    var link;
    if (/^@[A-Za-z0-9_]{3,}$/.test(c)) link = 'https://t.me/' + c.slice(1);
    else if (/^https?:\/\//.test(c)) link = c;
    var inner = link ? '<a href="' + escapeHtml(link) + '" target="_blank" rel="noopener">' + escapeHtml(c) + '</a>' : escapeHtml(c);
    return 'Контакт HR в Telegram: ' + inner;
  }

  function fillHrContacts() {
    $all('[data-hr-contact]').forEach(function (el) { el.innerHTML = hrContactHtml(); });
  }

  function showMessage(title, text, action) {
    $('#message-title').textContent = title;
    $('#message-text').textContent = text;
    fillHrContacts();
    var btn = $('#message-action');
    if (action) {
      btn.hidden = false;
      btn.textContent = action.label;
      btn.onclick = action.onClick;
    } else {
      btn.hidden = true;
      btn.onclick = null;
    }
    show('message');
  }

  function showServerError(retry) {
    showMessage('Что-то пошло не так', 'Что-то пошло не так, попробуйте ещё раз. Ваши ответы не потеряются.',
      { label: 'Попробовать ещё раз', onClick: retry || function () { location.reload(); } });
  }

  function showClosed() {
    showMessage('Приём закрыт', 'Приём ответов сейчас закрыт.');
  }

  function showThanks() {
    $('#thanks-title').textContent = S.expiredOnResume ? 'Время истекло' : 'Спасибо!';
    $('#thanks-text').textContent = S.expiredOnResume
      ? 'Время истекло, сохранённые ответы отправлены. ' + ((S.config && S.config.thanksText) || '')
      : (S.config && S.config.thanksText) || 'Ответы отправлены.';
    fillHrContacts();
    show('thanks');
  }

  var toastTimer = null;
  function toast(text, warn) {
    var el = $('#toast');
    el.textContent = text;
    el.className = 'toast' + (warn ? ' toast--warn' : '');
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 6000);
  }

  function overlay(text) {
    var el = $('#overlay');
    if (text === null) { el.hidden = true; return; }
    $('#overlay-text').textContent = text;
    el.hidden = false;
  }

  /** Модальное окно. Возвращает Promise<boolean>. */
  function modal(opts) {
    return new Promise(function (resolve) {
      var box = $('#modal');
      var prevFocus = document.activeElement;
      $('#modal-title').textContent = opts.title;
      $('#modal-body').innerHTML = opts.html;
      $('#modal-ok').textContent = opts.ok;
      $('#modal-cancel').textContent = opts.cancel;
      box.hidden = false;
      $('#modal-cancel').focus();
      function close(result) {
        box.hidden = true;
        document.removeEventListener('keydown', onKey);
        $('#modal-ok').onclick = null;
        $('#modal-cancel').onclick = null;
        if (prevFocus && prevFocus.focus) prevFocus.focus();
        resolve(result);
      }
      function onKey(e) { if (e.key === 'Escape') close(false); }
      document.addEventListener('keydown', onKey);
      $('#modal-ok').onclick = function () { close(true); };
      $('#modal-cancel').onclick = function () { close(false); };
    });
  }

  function setOffline(offline) {
    S.offline = offline;
    $('#net-banner').hidden = !offline || !S.attempt || S.finished;
    updateSaveStatus();
  }

  /* ---------- Запуск ---------- */

  function applyConfig() {
    var c = S.config;
    $all('[data-bind]').forEach(function (el) {
      var v = c[el.getAttribute('data-bind')];
      if (v !== undefined && v !== null && v !== 0) el.textContent = v;
    });
    fillSelect($('#f-experience'), c.experienceOptions || []);
    fillSelect($('#f-source'), c.sourceOptions || []);
    var link = $('#consent-link');
    if (c.consentUrl) link.href = c.consentUrl;
    else link.parentNode.replaceChild(document.createTextNode('текст согласия предоставит HR'), link);
    if (c.calculator) {
      $('#rule-calculator').textContent = 'Можно пользоваться черновиком, калькулятором и Desmos.';
    }
    fillHrContacts();
  }

  function fillSelect(sel, options) {
    sel.innerHTML = '<option value="">— выберите —</option>' + options.map(function (o) {
      return '<option value="' + escapeHtml(o) + '">' + escapeHtml(o) + '</option>';
    }).join('');
  }

  function boot() {
    show('loading');
    if (!API_URL) {
      showMessage('Сайт не настроен', 'В файле config.js не указан адрес сервера (apiUrl).');
      return;
    }
    api('config').then(function (cfg) {
      if (!cfg.ok) throw new NetworkError(cfg.message);
      S.config = cfg;
      applyConfig();
      restoreForm();
      var saved = lsGet(LS_ATTEMPT);
      if (saved && saved.attemptId && saved.token) return resumeSaved(saved);
      if (!cfg.open) return showClosed();
      show('start');
    }).catch(function () {
      showServerError(boot);
    });
  }

  function resumeSaved(saved) {
    return api('resume', { attemptId: saved.attemptId, token: saved.token }).then(function (res) {
      if (res.ok && res.status === 'done') {
        clearAttemptStorage(saved.attemptId);
        showThanks();
      } else if (res.ok) {
        enterTest(res, { resumed: true });
      } else if (res.code === 'BAD_TOKEN') {
        clearAttemptStorage(saved.attemptId);
        if (!S.config.open) showClosed(); else show('start');
      } else {
        showServerError(boot);
      }
    }, function () {
      // Нет связи: продолжаем по локальной копии, время — по часам устройства до первой синхронизации.
      if (saved.questions && saved.deadline) {
        enterTest({
          attemptId: saved.attemptId, token: saved.token, questions: saved.questions, fullName: saved.fullName,
          deadline: saved.deadline, serverNow: new Date().toISOString(), answers: {}, signals: {},
        }, { resumed: true, offline: true });
        setOffline(true);
        scheduleRetry();
      } else {
        showServerError(boot);
      }
    });
  }

  function clearAttemptStorage(id) {
    lsDel(LS_ATTEMPT);
    if (id) lsDel(draftKey(id));
  }

  /* ---------- Анкета ---------- */

  var FORM_FIELDS = ['fullName', 'phone', 'email', 'telegram', 'satMath', 'satRW', 'ielts', 'mathBackground', 'experience', 'source'];

  function formEl(name) { return $('#candidate-form').elements[name]; }

  function readForm() {
    var f = {};
    FORM_FIELDS.forEach(function (n) { f[n] = formEl(n).value; });
    f.consent = formEl('consent').checked;
    return f;
  }

  function restoreForm() {
    var saved = lsGet(LS_FORM);
    if (!saved) return;
    FORM_FIELDS.forEach(function (n) { if (saved[n] != null && saved[n] !== '') formEl(n).value = saved[n]; });
    updateMathBgRequired();
  }

  function collapse(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  function normalizePhone(raw) {
    var s = String(raw || '').trim().replace(/[\s()\-.]/g, '');
    if (/^8\d{10}$/.test(s)) s = '+7' + s.slice(1);
    else if (/^7\d{10}$/.test(s)) s = '+' + s;
    else if (/^\d{10}$/.test(s)) s = '+7' + s;
    if (!/^\+\d{8,15}$/.test(s)) return '';
    if (s.charAt(1) === '7' && s.length !== 12) return '';
    return s;
  }

  function parseScore(v) {
    var s = String(v || '').replace(/\s/g, '').replace(',', '.');
    if (!s) return null;
    return /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
  }

  /** Та же проверка, что на сервере; сервер всё равно проверяет повторно. */
  function validateForm(f) {
    var e = {};
    var name = collapse(f.fullName);
    if (name.length < 2 || name.length > 100) e.fullName = 'Укажите ФИО: от 2 до 100 символов';
    else if (name.split(' ').length < 2) e.fullName = 'Укажите фамилию и имя';
    if (!normalizePhone(f.phone)) e.phone = 'Проверьте номер телефона, например +7 701 123 45 67';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(f.email).trim())) e.email = 'Проверьте email';
    var tg = String(f.telegram || '').trim().replace(/^(https?:\/\/)?(t\.me|telegram\.me)\//i, '').replace(/^@/, '');
    if (tg && !/^[A-Za-z0-9_]{5,32}$/.test(tg)) e.telegram = 'Telegram: 5–32 символа — латиница, цифры и _';
    var m = parseScore(f.satMath);
    var r = parseScore(f.satRW);
    var i = parseScore(f.ielts);
    var sat = function (n) { return n >= 200 && n <= 800 && n % 10 === 0; };
    if (m !== null && !sat(m)) e.satMath = 'SAT: от 200 до 800, кратно 10';
    if (r !== null && !sat(r)) e.satRW = 'SAT: от 200 до 800, кратно 10';
    if (i !== null && !(i >= 0 && i <= 9 && Math.abs(i * 2 - Math.round(i * 2)) < 1e-9)) e.ielts = 'IELTS: от 0 до 9 с шагом 0,5';
    if ((m === null) !== (r === null)) {
      var missing = m === null ? 'satMath' : 'satRW';
      e[missing] = e[missing] || 'Укажите обе секции SAT';
    }
    var satBoth = m !== null && r !== null;
    if (!satBoth && i === null && !e.satMath && !e.satRW) e.scores = 'Укажите баллы SAT (обе секции) или IELTS';
    var bg = collapse(f.mathBackground);
    if (bg.length > 300) e.mathBackground = 'Не больше 300 символов';
    else if (!satBoth && i !== null && !bg) e.mathBackground = 'Если указан только IELTS, опишите математическую базу';
    if (!f.experience) e.experience = 'Выберите вариант';
    if (!f.source) e.source = 'Выберите вариант';
    if (!f.consent) e.consent = 'Нужно согласие на обработку персональных данных';
    return e;
  }

  function showFormErrors(errors, onlyField) {
    $all('#candidate-form [data-error]').forEach(function (p) {
      var k = p.getAttribute('data-error');
      if (onlyField && k !== onlyField) return;
      p.textContent = errors[k] || '';
      var input = formEl(k);
      if (input && input.classList) {
        input.classList.toggle('invalid', !!errors[k]);
        input.setAttribute('aria-invalid', errors[k] ? 'true' : 'false');
      }
    });
  }

  function candidatePayload(f) {
    var num = function (v) { var n = parseScore(v); return n === null || isNaN(n) ? null : n; };
    return {
      fullName: collapse(f.fullName),
      phone: normalizePhone(f.phone) || f.phone,
      email: String(f.email).trim().toLowerCase(),
      telegram: String(f.telegram || '').trim(),
      satMath: num(f.satMath),
      satRW: num(f.satRW),
      ielts: num(f.ielts),
      mathBackground: collapse(f.mathBackground),
      experience: f.experience,
      source: f.source,
      consent: !!f.consent,
    };
  }

  function formatPhoneInput(raw) {
    var hasPlus = /^\s*\+/.test(raw);
    var digits = raw.replace(/\D/g, '');
    if (!hasPlus && digits.charAt(0) === '8') digits = '7' + digits.slice(1);
    if (!digits) return '+';
    if (digits.charAt(0) === '7') {
      var r = digits.slice(1, 11);
      var out = '+7';
      if (r.length) out += ' ' + r.slice(0, 3);
      if (r.length > 3) out += ' ' + r.slice(3, 6);
      if (r.length > 6) out += ' ' + r.slice(6, 8);
      if (r.length > 8) out += ' ' + r.slice(8, 10);
      return out;
    }
    return '+' + digits.slice(0, 15);
  }

  function updateMathBgRequired() {
    var f = readForm();
    var satBoth = parseScore(f.satMath) !== null && parseScore(f.satRW) !== null;
    $('#mathbg-req').hidden = !(parseScore(f.ielts) !== null && !satBoth);
  }

  function initForm() {
    var form = $('#candidate-form');
    var phone = formEl('phone');
    phone.addEventListener('input', function () {
      var atEnd = phone.selectionStart === phone.value.length;
      if (atEnd) phone.value = formatPhoneInput(phone.value);
    });
    form.addEventListener('input', function (e) {
      var f = readForm();
      lsSet(LS_FORM, (function () { var c = Object.assign({}, f); delete c.consent; return c; })());
      updateMathBgRequired();
      var name = e.target && e.target.name;
      if (name && e.target.classList.contains('invalid')) showFormErrors(validateForm(f), name);
      $('#form-error').textContent = '';
    });
    form.addEventListener('focusout', function (e) {
      var name = e.target && e.target.name;
      if (!name || name === 'website' || !e.target.value) return;
      showFormErrors(validateForm(readForm()), name);
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitForm();
    });
  }

  function submitForm() {
    var f = readForm();
    var errors = validateForm(f);
    showFormErrors(errors);
    $('#form-error').textContent = '';
    if (Object.keys(errors).length) {
      var first = $('#candidate-form .invalid') || $('#candidate-form [data-error]:not(:empty)');
      if (first && first.focus) first.focus();
      $('#form-error').textContent = 'Проверьте отмеченные поля';
      return;
    }
    S.candidate = candidatePayload(f);
    var btn = $('#form-next');
    btn.disabled = true;
    btn.textContent = 'Проверяем…';
    api('check', { hp: formEl('website').value, candidate: S.candidate }).then(function (res) {
      handleEntryResponse(res, $('#form-error'));
      if (res.ok && res.status === 'new') {
        $('#rules-ok').checked = false;
        $('#rules-start').disabled = true;
        show('rules');
      }
    }, function () {
      $('#form-error').textContent = 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.';
    }).then(function () {
      btn.disabled = false;
      btn.textContent = 'Далее';
    });
  }

  /** Общая обработка ответов check и start (кроме status: new). */
  function handleEntryResponse(res, errorEl, isStart) {
    if (res.ok) {
      if (res.status === 'in_progress') {
        enterTest(res, { resumed: !isStart });
      } else if (res.status === 'expired') {
        S.expiredOnResume = true;
        showThanks();
      }
      return;
    }
    if (res.code === 'VALIDATION') {
      if (res.errors) {
        show('form');
        showFormErrors(res.errors);
      }
      errorEl.textContent = res.message || 'Проверьте поля анкеты';
    } else if (res.code === 'ALREADY_COMPLETED') {
      showMessage('Тест уже пройден', res.message || 'Вы уже проходили тест. Если это ошибка — напишите HR');
    } else if (res.code === 'TEST_CLOSED') {
      showClosed();
    } else {
      errorEl.textContent = res.message || 'Что-то пошло не так, попробуйте ещё раз';
      var hr = hrContactHtml();
      if (hr) errorEl.innerHTML = escapeHtml(errorEl.textContent) + '<br>' + hr;
    }
  }

  /* ---------- Правила и старт ---------- */

  function initRules() {
    $('#rules-ok').addEventListener('change', function () {
      $('#rules-start').disabled = !this.checked;
    });
    $('#rules-start').addEventListener('click', function () {
      modal({
        title: 'Начать тест?',
        html: '<p>Таймер запустится сразу. Начать?</p>',
        ok: 'Начать',
        cancel: 'Отмена',
      }).then(function (yes) {
        if (!yes) return;
        var btn = $('#rules-start');
        btn.disabled = true;
        btn.textContent = 'Запускаем…';
        $('#rules-error').textContent = '';
        api('start', { hp: formEl('website').value, candidate: S.candidate }).then(function (res) {
          handleEntryResponse(res, $('#rules-error'), true);
        }, function () {
          $('#rules-error').textContent = 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.';
        }).then(function () {
          btn.disabled = !$('#rules-ok').checked;
          btn.textContent = 'Начать тест';
        });
      });
    });
  }

  /* ---------- Тест ---------- */

  function enterTest(payload, opts) {
    opts = opts || {};
    S.attempt = {
      attemptId: payload.attemptId,
      token: payload.token,
      questions: payload.questions,
      deadline: payload.deadline,
      fullName: payload.fullName,
    };
    lsSet(LS_ATTEMPT, S.attempt);
    lsDel(LS_FORM);

    var local = lsGet(draftKey(payload.attemptId));
    var server = payload.answers || {};
    // Черновик устройства новее серверного, если в нём есть неотправленные правки
    // или сервер не получал сохранений позже последней работы на этом устройстве.
    var useLocal = !!(local && local.answers) && (opts.offline || local.unsaved || !payload.savedAt ||
      !Object.keys(server).length || local.updatedAt >= Date.parse(payload.savedAt));
    S.answers = useLocal ? local.answers : server;
    S.signals = emptySignals();
    SIGNAL_KEYS.forEach(function (k) {
      S.signals[k] = Math.max(Number((local && local.signals && local.signals[k]) || 0), Number((payload.signals || {})[k] || 0));
    });
    S.current = Math.min((local && local.current) || 0, payload.questions.length - 1);
    S.version = 1;
    S.savedVersion = useLocal && local.unsaved ? 0 : 1;
    syncTimer(payload.deadline, payload.serverNow);

    renderNav();
    renderQuestion();
    show('test');
    startLoops();
    persistLocal();

    var left = remainingMs();
    if (left <= 0) {
      S.expiredOnResume = true;
      timeUp();
    } else if (opts.resumed) {
      toast('Продолжаем ваш тест, осталось ' + formatClock(left));
    }
    if (S.savedVersion < S.version) save();
  }

  function syncTimer(deadlineIso, serverNowIso) {
    S.sync = { remaining: Date.parse(deadlineIso) - Date.parse(serverNowIso), perf: performance.now() };
  }

  function remainingMs() {
    return S.sync ? S.sync.remaining - (performance.now() - S.sync.perf) : 0;
  }

  function startLoops() {
    stopLoops();
    S.loops.push(setInterval(tick, 250));
    S.loops.push(setInterval(function () { if (S.savedVersion < S.version) save(); }, SAVE_INTERVAL_MS));
    tick();
  }

  function stopLoops() {
    S.loops.forEach(clearInterval);
    S.loops = [];
    clearTimeout(S.retryTimer);
  }

  function tick() {
    if (!S.attempt || S.finished) return;
    var left = remainingMs();
    var timer = $('#timer');
    timer.textContent = formatClock(left);
    timer.classList.toggle('timer--warn', left <= 5 * 60000);
    if (left <= 5 * 60000 && left > 4.5 * 60000 && !S.warned.five) {
      S.warned.five = true;
      toast('Осталось 5 минут', true);
    }
    if (left <= 60000 && left > 30000 && !S.warned.one) {
      S.warned.one = true;
      toast('Осталась 1 минута', true);
    }
    if (left <= 0 && !S.locked) timeUp();
  }

  function timeUp() {
    S.locked = true;
    $('#qcard').classList.add('locked');
    $all('#qcard input, #qcard textarea').forEach(function (el) { el.disabled = true; });
    submit('timer');
  }

  function answerOf(q) {
    if (!S.answers[q.id]) S.answers[q.id] = { explanation: '' };
    return S.answers[q.id];
  }

  function hasAnswer(q) {
    var a = S.answers[q.id];
    if (!a) return false;
    if (q.type === 'number') return !!String(a.value || '').trim();
    if (q.type === 'line') return !!String(a.m || '').trim() && !!String(a.b || '').trim();
    return !!a.choice;
  }

  function hasExplanation(q) {
    var a = S.answers[q.id];
    return !!(a && String(a.explanation || '').trim());
  }

  function renderNav() {
    var qs = S.attempt.questions;
    var groups = [];
    qs.forEach(function (q, i) {
      var g = groups[groups.length - 1];
      if (!g || g.section !== q.section) groups.push(g = { section: q.section, items: [] });
      g.items.push(i);
    });
    $('#qnav').innerHTML = groups.map(function (g) {
      var first = g.items[0] + 1;
      var last = g.items[g.items.length - 1] + 1;
      return '<div class="qnav__group" role="group" aria-label="' + escapeHtml(g.section) + '">' +
        '<span class="qnav__label">' + escapeHtml(g.section) + ' ' + first + (last > first ? '–' + last : '') + '</span>' +
        g.items.map(function (i) {
          return '<button type="button" class="qnav__btn" data-q="' + i + '">' + (i + 1) + '</button>';
        }).join('') + '</div>';
    }).join('');
    updateNav();
  }

  function updateNav() {
    var qs = S.attempt.questions;
    $all('#qnav .qnav__btn').forEach(function (btn) {
      var i = Number(btn.getAttribute('data-q'));
      var q = qs[i];
      var ans = hasAnswer(q);
      var expl = hasExplanation(q);
      btn.className = 'qnav__btn' + (ans && expl ? ' qnav__btn--done' : ans ? ' qnav__btn--partial' : '') +
        (i === S.current ? ' qnav__btn--current' : '');
      var state = ans && expl ? 'ответ и объяснение' : ans ? 'ответ без объяснения' : 'нет ответа';
      btn.setAttribute('aria-label', 'Задание ' + (i + 1) + ': ' + state);
      if (i === S.current) btn.setAttribute('aria-current', 'step'); else btn.removeAttribute('aria-current');
    });
    var answered = qs.filter(hasAnswer).length;
    $('#answered').textContent = 'Отвечено: ' + answered + ' из ' + qs.length;
    $('#btn-prev').disabled = S.current === 0;
    $('#btn-next').disabled = S.current === qs.length - 1;
  }

  function questionTextHtml(text) {
    return escapeHtml(text).replace(/_{3,}/g, '<span class="blank" aria-label="пропуск">___</span>');
  }

  function isPunct(opt) {
    return /^[^\p{L}\p{N}]{1,2}$/u.test(String(opt).trim());
  }

  function renderQuestion() {
    var qs = S.attempt.questions;
    var q = qs[S.current];
    var a = answerOf(q);
    var html = '<div class="qcard__label">' + escapeHtml(q.section) + ' · Задание ' + (S.current + 1) + ' из ' + qs.length + '</div>' +
      '<div class="qcard__text" id="qtext">' + questionTextHtml(q.text) + '</div>';

    if (q.type === 'number') {
      html += '<div class="answer"><label class="answer__label" for="ans-value">Ответ</label>' +
        '<div class="answer__row"><input id="ans-value" type="text" autocomplete="off" spellcheck="false" maxlength="50" data-field="value"' +
        ' value="' + escapeHtml(a.value || '') + '">' + (q.suffix ? '<span class="suffix">' + escapeHtml(q.suffix) + '</span>' : '') + '</div>' +
        '<p class="hint">Число; можно дробь вида a/b. Отрицательное — со знаком минус.</p></div>';
    } else if (q.type === 'line') {
      html += '<div class="answer"><span class="answer__label" id="ans-line-label">Ответ</span>' +
        '<div class="answer__row answer__row--line" role="group" aria-labelledby="ans-line-label">' +
        '<span class="eq">y =</span><input id="ans-m" type="text" autocomplete="off" spellcheck="false" maxlength="50" aria-label="m (коэффициент при x)" data-field="m" value="' + escapeHtml(a.m || '') + '">' +
        '<span class="eq">x +</span><input id="ans-b" type="text" autocomplete="off" spellcheck="false" maxlength="50" aria-label="b (свободный член)" data-field="b" value="' + escapeHtml(a.b || '') + '"></div>' +
        '<p class="hint">Если b отрицательное, введите его со знаком минус, например −4</p></div>';
    } else {
      html += '<fieldset class="answer options"><legend class="answer__label">Выберите ответ</legend>' +
        Object.keys(q.options).map(function (L) {
          var opt = q.options[L];
          return '<label class="option"><input type="radio" name="choice" value="' + L + '"' + (a.choice === L ? ' checked' : '') + '>' +
            '<span class="option__letter">' + L + ')</span>' +
            '<span class="option__text' + (isPunct(opt) ? ' option__text--punct' : '') + '">' + escapeHtml(opt) + '</span></label>';
        }).join('') + '</fieldset>';
    }

    var minChars = (S.config && S.config.explMinChars) || 0;
    var maxChars = (S.config && S.config.explMaxChars) || 2000;
    html += '<div class="explanation"><label class="answer__label" for="ans-expl">Объяснение</label>' +
      '<textarea id="ans-expl" maxlength="' + maxChars + '" data-field="explanation" ' +
      'placeholder="Объясните решение так, как объяснили бы ученику (2–5 предложений)">' + escapeHtml(a.explanation || '') + '</textarea>' +
      '<div class="explanation__meta"><span id="expl-hint"></span><span id="expl-count"></span></div></div>';

    var card = $('#qcard');
    card.innerHTML = html;
    card.classList.toggle('locked', S.locked);
    if (S.locked) $all('input, textarea', card).forEach(function (el) { el.disabled = true; });
    updateCounter(minChars, maxChars);
    updateNav();
    persistLocal();
  }

  function updateCounter(minChars, maxChars) {
    var ta = $('#ans-expl');
    if (!ta) return;
    var len = ta.value.length;
    $('#expl-count').textContent = len + ' / ' + maxChars;
    var hint = $('#expl-hint');
    if (minChars && len < minChars) {
      hint.textContent = 'Рекомендуем не меньше ' + minChars + ' символов';
      hint.className = len ? 'short' : '';
    } else {
      hint.textContent = '';
    }
  }

  function onAnswerInput(e) {
    if (S.locked) return;
    var t = e.target;
    var q = S.attempt.questions[S.current];
    var a = answerOf(q);
    if (t.name === 'choice') a.choice = t.value;
    else if (t.getAttribute('data-field')) a[t.getAttribute('data-field')] = t.value;
    else return;
    markDirty();
    if (t.id === 'ans-expl') updateCounter((S.config && S.config.explMinChars) || 0, (S.config && S.config.explMaxChars) || 2000);
    updateNav();
  }

  function markDirty() {
    S.version++;
    persistLocal();
    updateSaveStatus();
  }

  function persistLocal() {
    if (!S.attempt || S.finished) return;
    lsSet(draftKey(S.attempt.attemptId), {
      answers: S.answers,
      signals: currentSignals(),
      current: S.current,
      updatedAt: Date.now(),
      unsaved: S.savedVersion < S.version,
    });
  }

  function goTo(i) {
    var qs = S.attempt.questions;
    if (i < 0 || i >= qs.length) return;
    S.current = i;
    renderQuestion();
    var card = $('#qcard');
    if (card.getBoundingClientRect().top < 0) card.scrollIntoView({ block: 'start' });
  }

  function initTest() {
    var card = $('#qcard');
    card.addEventListener('input', onAnswerInput);
    card.addEventListener('change', onAnswerInput);
    card.addEventListener('paste', function (e) {
      if (e.target.id !== 'ans-expl') return;
      var text = (e.clipboardData || window.clipboardData).getData('text') || '';
      S.signals.pasteCount++;
      S.signals.pasteChars += text.length;
      markDirty();
    });
    card.addEventListener('copy', function () {
      var sel = window.getSelection && window.getSelection();
      var node = sel && sel.anchorNode;
      var el = node && (node.nodeType === 1 ? node : node.parentElement);
      if (!el || !el.closest || !(el.closest('#qtext') || el.closest('.options'))) return;
      S.signals.copyCount++;
      markDirty();
    });
    $('#qnav').addEventListener('click', function (e) {
      var btn = e.target.closest('.qnav__btn');
      if (btn) goTo(Number(btn.getAttribute('data-q')));
    });
    $('#btn-prev').addEventListener('click', function () { goTo(S.current - 1); });
    $('#btn-next').addEventListener('click', function () { goTo(S.current + 1); });
    $('#btn-finish').addEventListener('click', confirmFinish);
  }

  function confirmFinish() {
    if (S.submitting || S.finished) return;
    var qs = S.attempt.questions;
    var noAnswer = [];
    var noExpl = [];
    qs.forEach(function (q, i) {
      if (!hasAnswer(q)) noAnswer.push(i + 1);
      if (!hasExplanation(q)) noExpl.push(i + 1);
    });
    var lines = [];
    if (noAnswer.length) lines.push('Без ответа: № ' + noAnswer.join(', ') + '.');
    if (noExpl.length) lines.push('Без объяснения: № ' + noExpl.join(', ') + '.');
    var html = lines.length
      ? '<p>' + lines.map(escapeHtml).join('<br>') + '</p><p>Объяснения влияют на оценку.</p>'
      : '<p>Все задания с ответами и объяснениями.</p>';
    html += '<p class="muted">После отправки изменить ответы будет нельзя.</p>';
    modal({ title: 'Завершить тест?', html: html, ok: 'Отправить', cancel: 'Вернуться к заданиям' }).then(function (yes) {
      if (yes && !S.finished) submit('manual');
    });
  }

  /* ---------- Флаги: уходы со страницы ---------- */

  function testActive() {
    return !!S.attempt && !S.finished && !S.submitting && !$('[data-screen="test"]').hidden;
  }

  function markAway() {
    if (!testActive() || S.awaySince !== null) return;
    S.awaySince = performance.now();
    S.signals.blurCount++;
    markDirty();
  }

  function markBack() {
    if (S.awaySince === null) return;
    S.signals.blurSeconds += Math.round((performance.now() - S.awaySince) / 1000);
    S.awaySince = null;
    markDirty();
  }

  function currentSignals() {
    var s = Object.assign({}, S.signals);
    if (S.awaySince !== null) s.blurSeconds += Math.round((performance.now() - S.awaySince) / 1000);
    return s;
  }

  function initSignals() {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        markAway();
      } else {
        if (document.hasFocus()) markBack();
        if (S.attempt && !S.finished && !S.submitting) save(true);
      }
    });
    window.addEventListener('blur', markAway);
    window.addEventListener('focus', markBack);
  }

  /* ---------- Сохранение и отправка ---------- */

  function updateSaveStatus() {
    var el = $('#save-status');
    if (!el) return;
    el.classList.toggle('save-status--offline', S.offline);
    if (S.offline) el.textContent = 'Нет связи — ответы сохранены на устройстве';
    else if (S.lastSavedAt && S.savedVersion >= S.version) {
      el.textContent = 'Сохранено в ' + pad(S.lastSavedAt.getHours()) + ':' + pad(S.lastSavedAt.getMinutes());
    } else if (S.savedVersion < S.version) el.textContent = 'Изменения сохранены на устройстве';
    else el.textContent = '';
  }

  function savePayload() {
    return {
      attemptId: S.attempt.attemptId,
      token: S.attempt.token,
      answers: S.answers,
      signals: currentSignals(),
    };
  }

  function scheduleRetry() {
    clearTimeout(S.retryTimer);
    var delay = retryDelay(S.retryIdx++);
    S.retryTimer = setTimeout(function () { save(true); }, delay);
  }

  /** Сохранение на сервер. force — даже без изменений (синхронизация таймера). */
  function save(force) {
    if (!S.attempt || S.finished || S.submitting || S.saving) return;
    if (!force && S.savedVersion >= S.version) return;
    S.saving = true;
    var sentVersion = S.version;
    api('save', savePayload()).then(function (res) {
      if (res.ok) {
        S.savedVersion = Math.max(S.savedVersion, sentVersion);
        S.lastSavedAt = new Date();
        S.retryIdx = 0;
        clearTimeout(S.retryTimer);
        syncTimer(res.deadline, res.serverNow);
        setOffline(false);
        persistLocal();
      } else if (res.code === 'ATTEMPT_CLOSED') {
        finish();
      } else if (res.code === 'BAD_TOKEN') {
        stopLoops();
        clearAttemptStorage(S.attempt.attemptId);
        showMessage('Попытка не найдена', res.message || 'Обновите страницу или напишите HR');
      } else {
        throw new NetworkError(res.message);
      }
    }).catch(function () {
      setOffline(true);
      scheduleRetry();
    }).then(function () {
      S.saving = false;
      updateSaveStatus();
    });
  }

  function submit(reason) {
    if (S.submitting || S.finished) return;
    S.submitting = true;
    markBack();
    stopLoops();
    persistLocal();
    var attempt = 0;
    var waitText = reason === 'timer' ? 'Время вышло. Отправляем ответы…' : 'Отправляем ответы…';
    overlay(waitText);
    var body = Object.assign(savePayload(), { reason: reason });

    function trySend() {
      return api('submit', body).then(function (res) {
        if (res.ok || res.code === 'ATTEMPT_CLOSED') {
          setOffline(false);
          finish();
          return;
        }
        if (res.code === 'BAD_TOKEN') {
          overlay(null);
          S.submitting = false;
          clearAttemptStorage(S.attempt.attemptId);
          showMessage('Попытка не найдена', res.message || 'Обновите страницу или напишите HR');
          return;
        }
        overlay('Что-то пошло не так. Повторяем отправку… Ответы сохранены на устройстве, не закрывайте страницу.');
        return sleep(retryDelay(attempt++)).then(trySend);
      }, function () {
        setOffline(true);
        overlay('Нет связи. Ответы сохранены на устройстве, не закрывайте страницу — отправим, как только появится интернет.');
        return sleep(retryDelay(attempt++)).then(trySend);
      });
    }
    trySend();
  }

  function finish() {
    if (S.finished) return;
    S.finished = true;
    stopLoops();
    overlay(null);
    $('#net-banner').hidden = true;
    if (S.attempt) clearAttemptStorage(S.attempt.attemptId);
    showThanks();
  }

  function initLifecycle() {
    window.addEventListener('online', function () {
      if (S.attempt && !S.finished && !S.submitting) save(true);
    });
    window.addEventListener('beforeunload', function (e) {
      if (S.attempt && !S.finished && (S.offline || S.submitting || S.savedVersion < S.version)) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
    // При закрытии вкладки отправляем последнее сохранение без ожидания ответа.
    window.addEventListener('pagehide', function () {
      if (!S.attempt || S.finished || S.submitting || S.savedVersion >= S.version || !navigator.sendBeacon) return;
      try {
        var blob = new Blob([JSON.stringify(Object.assign({ action: 'save' }, savePayload()))], { type: 'text/plain;charset=utf-8' });
        navigator.sendBeacon(API_URL, blob);
      } catch (e) { /* не критично: черновик есть на устройстве */ }
    });
  }

  /* ---------- Навигация между экранами ---------- */

  function initNavigation() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      if (action === 'to-form') {
        if (!S.config.open) return showClosed();
        show('form');
      } else if (action === 'to-start') {
        show('start');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNavigation();
    initForm();
    initRules();
    initTest();
    initSignals();
    initLifecycle();
    boot();
  });
})();
