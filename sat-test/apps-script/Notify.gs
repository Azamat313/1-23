/**
 * Уведомления HR (п. 10 ТЗ). Вызываются после записи в таблицу и снятия блокировки:
 * сбой отправки не теряет результат, а пишется в «Лог».
 */

function sendNotifications_(notes) {
  (notes || []).forEach(function (n) {
    try {
      notifyHr_(n);
    } catch (e) {
      logEvent_('ERROR', 'notify', n && n.attemptId, (e && e.stack) || String(e));
    }
  });
}

function resultRowUrl_(row) {
  return ss_().getUrl() + '#gid=' + sheet_(SHEET.RESULTS).getSheetId() + '&range=A' + row;
}

function notificationText_(n) {
  const max = n.mathMax + n.rwMax;
  let head = 'Тест SAT: ' + n.name + ' (' + n.attemptId + ')';
  if (n.reason === 'abandoned') head += ' — время вышло, оценено по автосохранению';
  const status = n.status === AUTO_STATUS.PASS ? n.status + ' — нужна проверка объяснений' : n.status;
  return {
    subject: head,
    body: [
      head,
      'Math ' + n.math + '/' + n.mathMax + ' · R&W ' + n.rw + '/' + n.rwMax + ' · Итого ' + n.total + '/' + max,
      'Автостатус: ' + status,
      'Флаги: ' + (n.flags ? n.flags.charAt(0).toLowerCase() + n.flags.slice(1) : 'нет'),
      'Открыть в таблице: ' + resultRowUrl_(n.row),
    ].join('\n'),
  };
}

function notifyHr_(n) {
  const s = getSettings_();
  const msg = notificationText_(n);
  let sent = false;

  if (s.notifyEmail) {
    try {
      MailApp.sendEmail({ to: s.notifyEmail, subject: msg.subject, body: msg.body });
      sent = true;
    } catch (e) {
      logEvent_('ERROR', 'notify-email', n.attemptId, (e && e.message) || String(e));
    }
  }

  const botToken = PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN');
  if (botToken && s.telegramChatId) {
    try {
      const resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + botToken + '/sendMessage', {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ chat_id: s.telegramChatId, text: msg.body, disable_web_page_preview: true }),
        muteHttpExceptions: true,
      });
      if (resp.getResponseCode() !== 200) {
        logEvent_('ERROR', 'notify-telegram', n.attemptId, 'Telegram ответил ' + resp.getResponseCode() + ': ' + resp.getContentText());
      } else {
        sent = true;
      }
    } catch (e) {
      logEvent_('ERROR', 'notify-telegram', n.attemptId, (e && e.message) || String(e));
    }
  }

  if (!sent && !s.notifyEmail && !(botToken && s.telegramChatId)) {
    logEvent_('WARN', 'notify', n.attemptId, 'Уведомление не отправлено: в «Настройках» не указан email для уведомлений');
  }
}
