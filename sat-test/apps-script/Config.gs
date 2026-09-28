/**
 * Константы проекта: названия листов, колонки, настройки по умолчанию, вопросы по умолчанию.
 * Код находит колонки по тексту заголовка, поэтому заголовки в таблице менять нельзя,
 * а порядок колонок — можно.
 */

const TZ = 'Asia/Almaty';
const DATE_TIME_FORMAT = 'dd.MM.yyyy HH:mm';
const EXPLANATION_MAX = 2000;
const ANSWER_MAX = 50;
const QUESTIONS_CACHE_SECONDS = 300;
const SETTINGS_CACHE_SECONDS = 30;

const SHEET = {
  RESULTS: 'Результаты',
  ANSWERS: 'Ответы',
  RESERVE: 'Резерв',
  QUESTIONS: 'Вопросы',
  SETTINGS: 'Настройки',
  ATTEMPTS: 'Попытки',
  LOG: 'Лог',
};

/** Лист «Результаты»: одна строка на попытку. */
const RES = {
  id: 'ID попытки',
  status: 'Статус попытки',
  start: 'Начало',
  end: 'Окончание',
  duration: 'Длительность',
  name: 'ФИО',
  phone: 'Телефон',
  email: 'Email',
  telegram: 'Telegram',
  satMath: 'SAT Math',
  satRW: 'SAT R&W',
  satTotal: 'SAT итого',
  ielts: 'IELTS',
  mathBg: 'Мат. база',
  experience: 'Опыт SAT',
  source: 'Источник',
  req: 'Баллы vs требования',
  math: 'Math',
  rw: 'R&W',
  total: 'Итого',
  auto: 'Автостатус',
  explMath: 'Объяснения Math',
  explRW: 'Объяснения R&W',
  rated: 'Оценено',
  final: 'Итог теста',
  flags: 'Флаги',
  blurCount: 'Уходы',
  blurSeconds: 'Время вне страницы, с',
  pasteCount: 'Вставки',
  pasteChars: 'Вставлено символов',
  copyCount: 'Копирования',
  late: 'Опоздание, мин',
  retake: 'Повторная попытка',
  answers: 'Ответы',
  reviewer: 'Проверил',
  comment: 'Комментарий',
  allowRetake: 'Разрешить пересдачу',
};
/** Колонки «Результатов», которые заполняют люди. Остальные защищены предупреждением. */
const RES_MANUAL = ['reviewer', 'comment', 'allowRetake'];

/** Лист «Ответы»: по строке на задание. */
const ANS = {
  id: 'ID попытки',
  name: 'ФИО',
  date: 'Дата',
  pos: '№',
  qid: 'ID вопроса',
  section: 'Раздел',
  text: 'Условие',
  answer: 'Ответ кандидата',
  key: 'Правильный ответ',
  correct: 'Верно',
  explanation: 'Объяснение',
  score: 'Оценка объяснения',
  comment: 'Комментарий проверяющего',
};
const ANS_MANUAL = ['score', 'comment'];

/** Лист «Вопросы». */
const QCOL = {
  id: 'ID',
  pos: 'Позиция',
  section: 'Раздел',
  domain: 'Домен',
  type: 'Тип',
  text: 'Условие',
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  suffix: 'Суффикс',
  key: 'Ключ',
  tolerance: 'Допуск',
  active: 'Активен',
};

/**
 * Служебный лист «Попытки». Первые колонки (до retake включительно) читаются
 * при каждом поиске, поэтому объёмные JSON-колонки стоят в конце.
 */
const ATT = {
  id: 'ID попытки',
  token: 'Токен',
  state: 'Состояние',
  phone: 'Телефон',
  email: 'Email',
  name: 'ФИО',
  startedAt: 'Начало',
  deadline: 'Дедлайн',
  retake: 'Повторная',
  savedAt: 'Сохранено',
  finishedAt: 'Завершено',
  finishReason: 'Причина завершения',
  consentAt: 'Согласие',
  candidate: 'Анкета (JSON)',
  questions: 'Вопросы (JSON)',
  draft: 'Черновик (JSON)',
  signals: 'Сигналы (JSON)',
};
const ATT_INDEX_WIDTH = 9; // id … retake

const LOG = {
  time: 'Время',
  level: 'Уровень',
  action: 'Действие',
  attemptId: 'ID попытки',
  message: 'Сообщение',
};

const ATTEMPT_STATE = { OPEN: 'in_progress', DONE: 'done' };

const RESULT_STATUS = {
  IN_PROGRESS: 'В процессе',
  FINISHED: 'Завершён',
  TIMER: 'Отправлен по таймеру',
  ABANDONED: 'Не завершён',
};

const AUTO_STATUS = {
  PASS: 'Прошёл',
  FAIL: 'Не прошёл',
  RESERVE_MATH: 'Резерв: Math',
  RESERVE_RW: 'Резерв: R&W',
};

const SECTION = { MATH: 'Math', RW: 'R&W' };

const EXPERIENCE_OPTIONS = ['нет', 'до 3 мес.', '3–6 мес.', '6–12 мес.', '1–2 года', 'больше 2 лет'];
const SOURCE_OPTIONS = ['hh.kz', 'LinkedIn', 'Telegram', 'карьерный центр вуза', 'SAT-сообщество', 'рекомендация', 'другое'];

/**
 * Лист «Настройки». Сервер ищет параметр по тексту в колонке «Параметр».
 * named — имя именованного диапазона для формул и условного форматирования таблицы.
 */
const SETTINGS_SCHEMA = [
  { key: 'open', label: 'Приём открыт', def: 'Да', type: 'bool', note: 'Да — сайт принимает новые попытки; Нет — показывает «Приём закрыт»' },
  { key: 'durationMin', label: 'Длительность теста, мин', def: 30, type: 'number' },
  { key: 'graceMin', label: 'Льгота на отправку после дедлайна, мин', def: 2, type: 'number', note: 'Позже — флаг «Опоздание»' },
  { key: 'passTotal', label: 'Порог «Итого»', def: 7, type: 'number', named: 'PASS_TOTAL' },
  { key: 'passSection', label: 'Порог секции', def: 3, type: 'number', named: 'PASS_SECTION' },
  { key: 'explPass', label: 'Порог объяснений «Прошёл»', def: 4, type: 'number', named: 'EXPL_PASS', note: 'Средняя оценка в каждой секции не ниже' },
  { key: 'explReview', label: 'Порог объяснений «На усмотрение»', def: 3, type: 'number', named: 'EXPL_REVIEW', note: 'Меньшая из двух средних не ниже' },
  { key: 'explMinChars', label: 'Рекомендуемый минимум объяснения, символов', def: 30, type: 'number' },
  { key: 'flagBlurCount', label: 'Флаг «Уходы»: раз', def: 3, type: 'number', named: 'FLAG_BLUR_COUNT' },
  { key: 'flagBlurSeconds', label: 'Флаг «Уходы»: секунд вне страницы', def: 60, type: 'number', named: 'FLAG_BLUR_SECONDS' },
  { key: 'flagPasteChars', label: 'Флаг «Вставки», символов', def: 100, type: 'number', named: 'FLAG_PASTE_CHARS' },
  { key: 'reqSatTotal', label: 'Требование: SAT итого не ниже', def: 1400, type: 'number', named: 'REQ_SAT_TOTAL' },
  { key: 'reqSatSection', label: 'Требование: каждая секция SAT не ниже', def: 680, type: 'number', named: 'REQ_SAT_SECTION' },
  { key: 'reqIelts', label: 'Требование: IELTS не ниже', def: 7.5, type: 'number', named: 'REQ_IELTS' },
  { key: 'calculator', label: 'Калькулятор и Desmos разрешены', def: 'Нет', type: 'bool' },
  { key: 'notifyEmail', label: 'Email для уведомлений', def: '', type: 'text', note: 'Несколько адресов — через запятую' },
  { key: 'telegramChatId', label: 'ID Telegram-чата HR', def: '', type: 'text', note: 'Токен бота — в Script Properties: TELEGRAM_BOT_TOKEN' },
  { key: 'hrContact', label: 'Контакт HR для кандидатов', def: '', type: 'text', note: 'Например @jts_hr' },
  { key: 'replyDays', label: 'Срок ответа кандидату, рабочих дней (N)', def: 3, type: 'number' },
  { key: 'thanksText', label: 'Текст «Спасибо»', def: 'Ответы отправлены. HR свяжется с вами в течение {N} рабочих дней.', type: 'text', note: '{N} заменяется сроком ответа' },
  { key: 'consentUrl', label: 'Ссылка на текст согласия на обработку персональных данных', def: '', type: 'text' },
];

/** Вопросы по умолчанию (п. 5 ТЗ). Пишутся в лист «Вопросы» при первой настройке. */
const DEFAULT_QUESTIONS = [
  { id: 'M1', pos: 1, section: 'Math', domain: 'Advanced Math', type: 'number',
    text: 'f(x) = 2x² − 12x + 7. Найдите минимальное значение f.', key: '-11', tolerance: 0.0001 },
  { id: 'M2', pos: 2, section: 'Math', domain: 'Algebra', type: 'line',
    text: 'Прямая проходит через точки (2, 5) и (6, 17). Найдите её уравнение.', key: '3;-1', tolerance: 0.0001 },
  { id: 'M3', pos: 3, section: 'Math', domain: 'Problem-Solving & Data Analysis', type: 'number',
    text: 'Цену повысили на 20%, затем снизили на 20%. Какой процент от исходной цены составляет итоговая?', suffix: '%', key: '96', tolerance: 0.0001 },
  { id: 'M4', pos: 4, section: 'Math', domain: 'Algebra', type: 'number',
    text: '2x + 3y = 12, x − y = 1. Найдите x + y.', key: '5', tolerance: 0.0001 },
  { id: 'RW1', pos: 5, section: 'R&W', domain: 'Expression of Ideas', type: 'choice',
    text: 'Coral reefs cover less than 1% of the ocean floor. ___, they support about 25% of marine species.',
    A: 'Therefore', B: 'Similarly', C: 'Nevertheless', D: 'For instance', key: 'C' },
  { id: 'RW2', pos: 6, section: 'R&W', domain: 'Standard English Conventions', type: 'choice',
    text: 'The results of the experiment ___ surprising to the researchers.',
    A: 'was', B: 'is', C: 'were', D: 'has been', key: 'C' },
  { id: 'RW3', pos: 7, section: 'R&W', domain: 'Standard English Conventions', type: 'choice',
    text: 'The exhibit features three artists___ a painter from Almaty, a sculptor from Tokyo, and a photographer from Lima.',
    A: ',', B: ':', C: ';', D: 'no punctuation', key: 'B' },
  { id: 'RW4', pos: 8, section: 'R&W', domain: 'Craft & Structure', type: 'choice',
    text: "Although the author's early novels were ignored, her later work was ___ by critics as groundbreaking.",
    A: 'dismissed', B: 'hailed', C: 'questioned', D: 'concealed', key: 'B' },
];
