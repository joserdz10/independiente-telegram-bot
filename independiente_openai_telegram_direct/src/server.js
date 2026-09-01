import "dotenv/config";
import express from "express";
import path from "node:path";
import fs from "node:fs";
import { tg } from "./telegram.js";
import { buildMesa, produceStory } from "./openai-news.js";
import { putStory, getStory, patchStory } from "./store.js";
import { renderStory } from "./render.js";

const app = express();
app.use(express.json({limit:"2mb"}));
app.use("/output", express.static(path.resolve("output")));
const port = Number(process.env.PORT || 3000);
const allowed = process.env.ALLOWED_TELEGRAM_USER_ID ? String(process.env.ALLOWED_TELEGRAM_USER_ID) : null;

function permitted(update) {
  const id = update.message?.from?.id ?? update.callback_query?.from?.id;
  return !allowed || String(id) === allowed;
}
function keyboard(id) {
  return { inline_keyboard: [[
    { text:"✅ Producir", callback_data:`approve:${id}` },
    { text:"♻️ Otro enfoque", callback_data:`reframe:${id}` },
    { text:"❌ Descartar", callback_data:`discard:${id}` }
  ]]};
}
function storyText(s) {
  return `<b>${s.section}</b>\n<b>${s.headline}</b>\n\n${s.summary}\n\n<b>Por qué importa:</b> ${s.why_it_matters}\n<b>Prioridad:</b> ${s.priority} · <b>Formato:</b> ${s.format}\n<b>Fuente:</b> ${s.source_name}\n${s.source_url}`;
}

app.get("/health", (_req,res)=>res.json({ok:true}));

app.post("/telegram-webhook", async (req,res) => {
  const secret = req.get("x-telegram-bot-api-secret-token");
  if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) return res.sendStatus(403);
  res.sendStatus(200);
  const update = req.body;
  if (!permitted(update)) return;
  try {
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text || "";
      if (text === "/start") {
        await tg.sendMessage(chatId, "📰 <b>El Independiente · Mesa de Redacción</b>\n\nUsa /mesa para buscar las cinco noticias prioritarias del momento.");
      } else if (text === "/mesa") {
        await tg.sendMessage(chatId, "🔎 Buscando y verificando las noticias más relevantes de hoy…");
        const stories = await buildMesa();
        for (const s of stories) { putStory(s); await tg.sendMessage(chatId, storyText(s), keyboard(s.id)); }
      }
    }
    if (update.callback_query) {
      const q = update.callback_query;
      const chatId = q.message.chat.id;
      const [action,id] = String(q.data||"").split(":");
      const story = getStory(id);
      if (!story) { await tg.answerCallback(q.id,"La nota ya no está disponible"); return; }
      if (action === "discard") {
        patchStory(id,{status:"discarded"});
        await tg.answerCallback(q.id,"Descartada");
        await tg.sendMessage(chatId,`❌ Descartada: <b>${story.headline}</b>`);
      } else if (action === "reframe") {
        await tg.answerCallback(q.id,"Buscando otro enfoque…");
        const prod = await produceStory(story,"Busca un ángulo editorial distinto pero fiel a los mismos hechos. Evita sensacionalismo.");
        patchStory(id,{production:prod,status:"reframed"});
        await tg.sendMessage(chatId,`♻️ <b>OTRO ENFOQUE</b>\n\n<b>${prod.headline}</b>\n${prod.subheadline}\n\n${prod.facebook_copy}\n\n${prod.hashtags.join(" ")}`,keyboard(id));
      } else if (action === "approve") {
        await tg.answerCallback(q.id,"Produciendo…");
        await tg.sendMessage(chatId,"✍️ Re-verificando, redactando copy y generando arte con el footer maestro exacto…");
        const prod = await produceStory(story,"normal");
        patchStory(id,{production:prod,status:"produced"});
        if (!prod.verified) {
          await tg.sendMessage(chatId,`⚠️ <b>REQUIERE REVISIÓN EDITORIAL</b>\n${prod.verification_note}`);
          return;
        }
        const imagePath = await renderStory(story,prod);
        const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/,"");
        const photoUrl = `${base}/output/${path.basename(imagePath)}`;
        const caption = `✅ <b>PIEZA LISTA</b>\n\n<b>${prod.headline}</b>\n\n<b>COPY FACEBOOK</b>\n${prod.facebook_copy}\n\n${prod.hashtags.join(" ")}\n\n<b>Fuente:</b> ${prod.source_name}`;
        await tg.sendPhoto(chatId,photoUrl,caption);
      }
    }
  } catch (e) {
    console.error(e);
    const chatId = update.message?.chat?.id ?? update.callback_query?.message?.chat?.id;
    if (chatId) await tg.sendMessage(chatId,`⚠️ Error: ${String(e.message).slice(0,600)}`).catch(()=>{});
  }
});

app.listen(port,()=>console.log(`Servidor listo en :${port}`));
