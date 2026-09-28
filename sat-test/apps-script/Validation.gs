/**
 * Проверка и нормализация анкеты кандидата (п. 4.2 ТЗ).
 * Чистые функции без обращения к Google-сервисам: их прогоняют unit-тесты в Node.
 */

function collapseSpaces_(value) {
  return String(value == null ? '' : value).replace(/[\s  ​]+/g, ' ').trim();
}

/** '+7 (701) 123-45-67', '87011234567', '7011234567' → '+77011234567'. Невалидный номер → ''. */
function normalizePhone(raw) {
  let s = String(raw == null ? '' : raw).trim().replace(/[\s ()\-.]/g, '');
  if (!s) return '';
  if (/^8\d{10}$/.test(s)) s = '+7' + s.slice(1);
  else if (/^7\d{10}$/.test(s)) s = '+' + s;
  else if (/^\d{10}$/.test(s)) s = '+7' + s;
  if (!/^\+\d{8,15}$/.test(s)) return '';
  if (s.charAt(1) === '7' && s.length !== 12) return '';
  return s;
}

function normalizeEmail(raw) {
  const s = String(raw == null ? '' : raw).trim().toLowerCase();
  if (s.length > 254) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? s : '';
}

/** '@ivanov', 'ivanov', 't.me/ivanov' → '@ivanov'. Пустое → ''. Невалидное → null. */
function normalizeTelegram(raw) {
  let s = String(raw == null ? '' : raw).trim();
  if (!s) return '';
  s = s.replace(/^(https?:\/\/)?(t\.me|telegram\.me)\//i, '').replace(/^@/, '');
  return /^[A-Za-z0-9_]{5,32}$/.test(s) ? '@' + s : null;
}

/** Пустое → null; число или строка → число; мусор → NaN. */
function toNumberOrNull_(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return isFinite(raw) ? raw : NaN;
  const s = String(raw).replace(/[\s ]/g, '').replace(',', '.');
  if (!s) return null;
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}

function isSatScore_(n) {
  return typeof n === 'number' && n >= 200 && n <= 800 && n % 10 === 0;
}

function isIelts_(n) {
  return typeof n === 'number' && n >= 0 && n <= 9 && Math.abs(n * 2 - Math.round(n * 2)) < 1e-9;
}

/**
 * @return {{ok: boolean, candidate: Object, errors: Object<string,string>}}
 */
function validateCandidate(input) {
  input = input || {};
  const errors = {};
  const c = {};

  c.fullName = collapseSpaces_(input.fullName);
  if (c.fullName.length < 2 || c.fullName.length > 100) {
    errors.fullName = 'Укажите ФИО: от 2 до 100 символов';
  } else if (c.fullName.split(' ').filter(function (w) { return /\p{L}/u.test(w); }).length < 2) {
    errors.fullName = 'Укажите фамилию и имя';
  }

  c.phone = normalizePhone(input.phone);
  if (!c.phone) errors.phone = 'Проверьте номер телефона, например +7 701 123 45 67';

  c.email = normalizeEmail(input.email);
  if (!c.email) errors.email = 'Проверьте email';

  const tg = normalizeTelegram(input.telegram);
  if (tg === null) errors.telegram = 'Telegram: 5–32 символа — латиница, цифры и _';
  c.telegram = tg || '';

  const satMath = toNumberOrNull_(input.satMath);
  const satRW = toNumberOrNull_(input.satRW);
  const ielts = toNumberOrNull_(input.ielts);
  if (satMath !== null && !isSatScore_(satMath)) errors.satMath = 'SAT: от 200 до 800, кратно 10';
  if (satRW !== null && !isSatScore_(satRW)) errors.satRW = 'SAT: от 200 до 800, кратно 10';
  if (ielts !== null && !isIelts_(ielts)) errors.ielts = 'IELTS: от 0 до 9 с шагом 0,5';
  c.satMath = isSatScore_(satMath) ? satMath : null;
  c.satRW = isSatScore_(satRW) ? satRW : null;
  c.ielts = isIelts_(ielts) ? ielts : null;

  const satBoth = satMath !== null && satRW !== null;
  if ((satMath === null) !== (satRW === null)) {
    errors[satMath === null ? 'satMath' : 'satRW'] = errors[satMath === null ? 'satMath' : 'satRW'] || 'Укажите обе секции SAT';
  }
  if (!satBoth && ielts === null && !errors.satMath && !errors.satRW) {
    errors.scores = 'Укажите баллы SAT (обе секции) или IELTS';
  }

  c.mathBackground = collapseSpaces_(input.mathBackground);
  if (c.mathBackground.length > 300) errors.mathBackground = 'Не больше 300 символов';
  else if (!satBoth && ielts !== null && !c.mathBackground) {
    errors.mathBackground = 'Если указан только IELTS, опишите математическую базу';
  }

  c.experience = String(input.experience || '');
  if (EXPERIENCE_OPTIONS.indexOf(c.experience) < 0) errors.experience = 'Выберите вариант';

  c.source = String(input.source || '');
  if (SOURCE_OPTIONS.indexOf(c.source) < 0) errors.source = 'Выберите вариант';

  c.consent = input.consent === true;
  if (!c.consent) errors.consent = 'Нужно согласие на обработку персональных данных';

  return { ok: Object.keys(errors).length === 0, candidate: c, errors: errors };
}
