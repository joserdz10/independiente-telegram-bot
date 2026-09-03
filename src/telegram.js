import dns from "node:dns";

// En Railway a veces undici intenta varias rutas IPv4/IPv6 y una puede agotar el tiempo.
// Priorizar IPv4 reduce los ETIMEDOUT hacia api.telegram.org sin impedir fallback.
try { dns.setDefaultResultOrder("ipv4first"); } catch {}

const token = process.env.TELEGRAM_BOT_TOKEN;
const base = () => `https://api.telegram.org/bot${token}`;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function retryableStatus(status) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function retryableError(err) {
  const code = err?.cause?.code || err?.code || "";
  return ["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EAI_AGAIN", "ENETUNREACH", "UND_ERR_CONNECT_TIMEOUT"].includes(code)
    || /fetch failed|timeout|timed out|socket/i.test(String(err?.message || ""));
}

async function call(method, body = {}) {
  const attempts = Number(process.env.TELEGRAM_RETRY_ATTEMPTS || 4);
  const timeoutMs = Number(process.env.TELEGRAM_REQUEST_TIMEOUT_MS || 25000);
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const r = await fetch(`${base()}/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });

      let data;
      try { data = await r.json(); }
      catch { data = { ok: false, description: `HTTP ${r.status} sin JSON válido` }; }

      if (r.ok && data.ok) return data.result;

      const err = new Error(`Telegram ${method}: ${JSON.stringify(data)}`);
      err.status = r.status;

      if (!retryableStatus(r.status) || attempt === attempts) throw err;

      const retryAfterSec = Number(data?.parameters?.retry_after || 0);
      const delay = retryAfterSec > 0 ? retryAfterSec * 1000 : Math.min(1000 * (2 ** (attempt - 1)), 8000);
      console.warn(`Telegram ${method}: HTTP ${r.status}; reintento ${attempt}/${attempts} en ${delay}ms`);
      await sleep(delay);
    } catch (err) {
      lastError = err;
      if (!retryableError(err) || attempt === attempts) throw err;
      const delay = Math.min(1200 * (2 ** (attempt - 1)), 9000);
      const code = err?.cause?.code || err?.code || "network";
      console.warn(`Telegram ${method}: ${code}; reintento ${attempt}/${attempts} en ${delay}ms`);
      await sleep(delay);
    }
  }

  throw lastError || new Error(`Telegram ${method}: fallo desconocido`);
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
