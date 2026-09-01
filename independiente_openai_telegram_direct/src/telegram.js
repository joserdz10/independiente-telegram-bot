const token = process.env.TELEGRAM_BOT_TOKEN;
const base = () => `https://api.telegram.org/bot${token}`;

async function call(method, body = {}) {
  const r = await fetch(`${base()}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!data.ok) throw new Error(`Telegram ${method}: ${JSON.stringify(data)}`);
  return data.result;
}

export const tg = {
  sendMessage(chatId, text, replyMarkup) {
    return call("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
  },
  sendPhoto(chatId, photoUrl, caption, replyMarkup) {
    return call("sendPhoto", {
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: "HTML",
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
  },
  answerCallback(callbackQueryId, text = "Listo") {
    return call("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text,
      show_alert: false,
    });
  },
};
