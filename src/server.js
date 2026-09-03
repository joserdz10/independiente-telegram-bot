import "dotenv/config";
import express from "express";
import path from "node:path";
import cron from "node-cron";
import { tg } from "./telegram.js";
import { buildMesa, produceStory } from "./openai-news.js";
import { putStory, getStory, patchStory, recentHeadlines, saveMesa, getLatestMesa, getEditorialConfig, saveEditorialConfig } from "./store.js";
import { renderStory } from "./render.js";
import { generateVisualBackground } from "./image-background.js";
import { BRAND } from "./brand-book.js";

const app=express();
app.use(express.json({limit:"2mb"}));
app.use("/output",express.static(path.resolve("output")));
const port=Number(process.env.PORT||3000);
const envAdminId=String(process.env.ADMIN_TELEGRAM_USER_ID||process.env.ALLOWED_TELEGRAM_USER_ID||"").trim()||null;
const envEditorialChatId=String(process.env.EDITORIAL_CHAT_ID||"").trim()||null;

function adminId(){
  const saved=getEditorialConfig();
  return envAdminId||String(saved.admin_user_id||"").trim()||null;
}
function editorialChatId(){
  const saved=getEditorialConfig();
  return envEditorialChatId||String(saved.chat_id||"").trim()||adminId();
}
function rememberEditorialChat(chatId,userId){
  if(!chatId||!userId)return;
  const currentAdmin=adminId();
  // Si no hay administrador configurado, el primer usuario que habla con el bot
  // se convierte en el propietario editorial. Si ya existe, solo ese usuario
  // puede actualizar el chat de destino.
  if(!currentAdmin){
    saveEditorialConfig({admin_user_id:String(userId),chat_id:String(chatId)});
    console.log(`Chat editorial registrado automaticamente: ${chatId} · admin ${userId}`);
  }else if(String(userId)===String(currentAdmin)){
    saveEditorialConfig({admin_user_id:String(currentAdmin),chat_id:String(chatId)});
  }
}
const mesaTimezone=process.env.MESA_TIMEZONE||"America/Mexico_City";
const mesaCron=process.env.MESA_CRON||"0 8,12,17 * * *";

function isAdmin(userId){const id=adminId();return id ? String(userId)===String(id) : false;}
function editionNow(){const hour=Number(new Intl.DateTimeFormat("es-MX",{timeZone:mesaTimezone,hour:"2-digit",hour12:false}).format(new Date()));if(hour<10)return"08:00";if(hour<15)return"12:00";return"17:00";}
function keyboard(id,admin,recommended){if(!admin)return undefined;return{inline_keyboard:[[ {text:recommended?"🎨 Generar gráfica":"🎨 Generar de todos modos",callback_data:`approve:${id}`},{text:"♻️ Otro enfoque",callback_data:`reframe:${id}`} ],[{text:"❌ Descartar",callback_data:`discard:${id}`}]]};}
function escapeHtml(s=""){return String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));}
function storyText(s){const points=(s.key_points||[]).map(x=>`• ${escapeHtml(x)}`).join("\n");return `<b>${s.number}. ${escapeHtml(s.section)}</b> · ${s.priority}\n<b>${escapeHtml(s.headline)}</b>\n\n${escapeHtml(s.summary)}\n\n<b>Datos clave</b>\n${points}\n\n<b>Copy sugerido Facebook</b>\n${escapeHtml(s.facebook_copy)}\n\n<b>Gráfica:</b> ${s.requires_graphic?"✅ SÍ":"— NO PRIORITARIA"} · <b>Formato:</b> ${s.format}\n<b>Tipo:</b> ${escapeHtml(s.visual_type)}\n<b>Motivo:</b> ${escapeHtml(s.graphic_reason)}\n\n<b>Fuente:</b> ${escapeHtml(s.source_name)}\n${escapeHtml(s.source_url)}`;}

async function sendMesa(chatId,edition="MANUAL",userId=adminId()){await tg.sendMessage(chatId,`📰 <b>MESA DE REDACCIÓN · ${edition}</b>\nEl Independiente de Hidalgo Digital\n\n🔎 Buscando, contrastando y priorizando noticias actuales…`);const stories=await buildMesa({edition,previousHeadlines:recentHeadlines(20)});stories.forEach(putStory);saveMesa(chatId,stories,edition);for(const s of stories)await tg.sendMessage(chatId,storyText(s),keyboard(s.id,isAdmin(userId),s.requires_graphic));const recommended=stories.filter(s=>s.requires_graphic).map(s=>s.number);await tg.sendMessage(chatId,`🎨 <b>Recomendadas para gráfica:</b> ${recommended.length?recommended.join(", "):"ninguna"}${isAdmin(userId)?"\n\nPuedes pulsar el botón de cada nota o usar <code>/grafica 1,3</code>.":""}`);return stories;}

async function produceAndSend(chatId,story,angle="normal"){await tg.sendMessage(chatId,"✍️ Re-verificando, preparando copy y generando la pieza bajo el Brand Book…");const prod=await produceStory(story,angle);patchStory(story.id,{production:prod,status:"produced"});if(!prod.verified){await tg.sendMessage(chatId,`⚠️ <b>REQUIERE REVISIÓN EDITORIAL</b>\n${escapeHtml(prod.verification_note)}`);return;}const bg=await generateVisualBackground(story,prod);const imagePath=await renderStory(story,prod,bg);const base=process.env.PUBLIC_BASE_URL?.replace(/\/$/,"");if(!base)throw new Error("Falta PUBLIC_BASE_URL");const photoUrl=`${base}/output/${path.basename(imagePath)}`;const caption=`✅ <b>PIEZA LISTA</b> · Formato ${escapeHtml(prod.format)}\n\n<b>${escapeHtml(prod.headline)}</b>\n\n<b>COPY FACEBOOK</b>\n${escapeHtml(prod.facebook_copy)}\n\n${prod.hashtags.map(escapeHtml).join(" ")}\n\n<b>Fuente:</b> ${escapeHtml(prod.source_name)}\n<b>Identidad:</b> ${escapeHtml(BRAND.system)} · v${escapeHtml(BRAND.version)}`;await tg.sendPhoto(chatId,photoUrl,caption);}

app.get("/health",(_req,res)=>res.json({ok:true,schedule:mesaCron,timezone:mesaTimezone,editorial_chat:!!editorialChatId(),editorial_chat_id:editorialChatId()?"registered":null,admin:!!adminId(),brand_book:BRAND.version,brand_system:BRAND.system}));

app.post("/telegram-webhook",async(req,res)=>{const secret=req.get("x-telegram-bot-api-secret-token");if(process.env.TELEGRAM_WEBHOOK_SECRET&&secret!==process.env.TELEGRAM_WEBHOOK_SECRET)return res.sendStatus(403);res.sendStatus(200);const update=req.body;try{if(update.message){const chatId=update.message.chat.id,userId=update.message.from?.id,text=String(update.message.text||"").trim();rememberEditorialChat(chatId,userId);if(text==="/start")await tg.sendMessage(chatId,"📰 <b>El Independiente · Mesa de Redacción</b>\n\nEste chat quedó registrado como mesa editorial. Recibirás automáticamente las mesas de las 08:00, 12:00 y 17:00 (hora de Hidalgo).\n\nUsa /mesa para generar una mesa ahora o /ultima para ver la última mesa programada guardada." );else if(text==="/mesa")await sendMesa(chatId,"MANUAL",userId);else if(text==="/ultima"){const mesa=getLatestMesa(chatId)||getLatestMesa("__scheduled__");if(!mesa){await tg.sendMessage(chatId,"Aún no hay una mesa programada guardada. Usa /mesa para generar una ahora.");return;}await tg.sendMessage(chatId,`🗂️ <b>ÚLTIMA MESA · ${escapeHtml(mesa.edition||"GUARDADA")}</b>`);for(const s of mesa.stories)await tg.sendMessage(chatId,storyText(s),keyboard(s.id,isAdmin(userId),s.requires_graphic));}else if(text.startsWith("/grafica")){if(!isAdmin(userId)){await tg.sendMessage(chatId,"🔒 La generación de piezas está reservada a la dirección editorial.");return;}const mesa=getLatestMesa(chatId);if(!mesa){await tg.sendMessage(chatId,"No hay una mesa reciente. Usa /mesa primero.");return;}const nums=text.replace("/grafica","").trim().split(/[,\s]+/).map(Number).filter(n=>Number.isInteger(n)&&n>0);if(!nums.length){await tg.sendMessage(chatId,"Usa, por ejemplo: <code>/grafica 1,3</code>");return;}for(const n of nums){const story=mesa.stories.find(s=>s.number===n);if(story)await produceAndSend(chatId,story);}}}
if(update.callback_query){const q=update.callback_query,chatId=q.message.chat.id,userId=q.from?.id,[action,id]=String(q.data||"").split(":");if(!isAdmin(userId)){await tg.answerCallback(q.id,"Solo la dirección editorial puede producir piezas");return;}const story=getStory(id);if(!story){await tg.answerCallback(q.id,"La nota ya no está disponible");return;}if(action==="discard"){patchStory(id,{status:"discarded"});await tg.answerCallback(q.id,"Descartada");await tg.sendMessage(chatId,`❌ Descartada: <b>${escapeHtml(story.headline)}</b>`);}else if(action==="reframe"){await tg.answerCallback(q.id,"Buscando otro enfoque…");const prod=await produceStory(story,"Busca un ángulo editorial distinto pero fiel a los mismos hechos. Evita sensacionalismo.");patchStory(id,{production:prod,status:"reframed"});await tg.sendMessage(chatId,`♻️ <b>OTRO ENFOQUE</b>\n\n<b>${escapeHtml(prod.headline)}</b>\n${escapeHtml(prod.subheadline)}\n\n${escapeHtml(prod.facebook_copy)}\n\n${prod.hashtags.map(escapeHtml).join(" ")}`,keyboard(id,true,true));}else if(action==="approve"){await tg.answerCallback(q.id,"Generando pieza…");await produceAndSend(chatId,story);}}
}catch(e){console.error(e);const chatId=update.message?.chat?.id??update.callback_query?.message?.chat?.id;if(chatId)await tg.sendMessage(chatId,`⚠️ Error: ${escapeHtml(String(e.message).slice(0,600))}`).catch(()=>{});}});

cron.schedule(mesaCron,async()=>{try{const edition=editionNow();const target=editorialChatId();if(target){await sendMesa(target,edition,adminId());}else{console.warn(`Mesa ${edition}: aún no hay chat editorial registrado; se generará y guardará para /ultima.`);const stories=await buildMesa({edition,previousHeadlines:recentHeadlines(20)});stories.forEach(putStory);saveMesa("__scheduled__",stories,edition);}}catch(e){console.error("Error en mesa programada:",e);}}, {timezone:mesaTimezone});console.log(`Mesas programadas: ${mesaCron} · ${mesaTimezone} · destino ${editorialChatId()?"registrado":"se registrará al primer /start o /mesa"}`);

app.listen(port,()=>console.log(`Servidor listo en :${port}`));
