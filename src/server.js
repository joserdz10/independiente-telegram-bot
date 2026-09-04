import "dotenv/config";
import express from "express";
import path from "node:path";
import cron from "node-cron";
import { tg } from "./telegram.js";
import { buildMesa, produceStory } from "./openai-news.js";
import { putStory, getStory, patchStory, recentHeadlines, saveMesa, getLatestMesa, getEditorialConfig, saveEditorialConfig } from "./store.js";
import { renderStory } from "./render.js";
import { generateVisualBackground } from "./image-background.js";
import { fetchRealSourceImage } from "./source-image.js";
import { BRAND } from "./brand-book.js";
import { driveConfigured, uploadApprovedPublication } from "./drive.js";

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
function rememberEditorialChat(chatId,userId,chatType="private"){
  if(!chatId||!userId||chatType!=="private")return;
  if(envEditorialChatId)return;
  const saved=getEditorialConfig();
  const currentAdmin=adminId();
  // Sin IDs manuales: el primer chat privado se registra como mesa editorial.
  // Si existe un ADMIN_TELEGRAM_USER_ID explícito, solo ese usuario puede registrar/mover el chat.
  if(!saved.chat_id){
    if(envAdminId&&String(userId)!==String(envAdminId))return;
    const patch={chat_id:String(chatId)};
    if(!currentAdmin)patch.admin_user_id=String(userId);
    saveEditorialConfig(patch);
    console.log(`Chat editorial registrado automaticamente: ${chatId} · usuario ${userId}`);
    return;
  }
  if(String(saved.chat_id)===String(chatId))return;
  if(currentAdmin&&String(userId)===String(currentAdmin)){
    saveEditorialConfig({chat_id:String(chatId)});
    console.log(`Chat editorial actualizado: ${chatId}`);
  }
}
const mesaTimezone=process.env.MESA_TIMEZONE||"America/Mexico_City";
const mesaCron=process.env.MESA_CRON||"0 8,12,17 * * *";

function isAdmin(userId){const id=adminId();return id ? String(userId)===String(id) : false;}
function isEditorialChat(chatId){const id=editorialChatId();return id ? String(chatId)===String(id) : false;}
function canProduce(chatId,userId){return isAdmin(userId)||isEditorialChat(chatId);}
function editionNow(){const hour=Number(new Intl.DateTimeFormat("es-MX",{timeZone:mesaTimezone,hour:"2-digit",hour12:false}).format(new Date()));if(hour<10)return"08:00";if(hour<15)return"12:00";return"17:00";}
function keyboard(id,allowed,_recommended){if(!allowed)return undefined;return{inline_keyboard:[[ {text:"🎨 Generar gráfica",callback_data:`approve:${id}`},{text:"♻️ Otro enfoque",callback_data:`reframe:${id}`} ],[{text:"❌ Descartar",callback_data:`discard:${id}`}]]};}
function producedKeyboard(id){return{inline_keyboard:[[{text:"✅ Aprobar y enviar a Drive",callback_data:`drive:${id}`}],[{text:"♻️ Regenerar gráfica",callback_data:`approve:${id}`},{text:"❌ Descartar",callback_data:`discard:${id}`}]]};}
function escapeHtml(s=""){return String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));}
function storyText(s){const points=(s.key_points||[]).map(x=>`• ${escapeHtml(x)}`).join("\n");return `<b>${s.number}. ${escapeHtml(s.section)}</b> · ${s.priority}\n<b>${escapeHtml(s.headline)}</b>\n\n${escapeHtml(s.summary)}\n\n<b>Datos clave</b>\n${points}\n\n<b>Copy sugerido Facebook</b>\n${escapeHtml(s.facebook_copy)}\n\n<b>Gráfica:</b> ${s.requires_graphic?"✅ SÍ":"— NO PRIORITARIA"} · <b>Formato:</b> ${s.format}\n<b>Tipo:</b> ${escapeHtml(s.visual_type)}\n<b>Motivo:</b> ${escapeHtml(s.graphic_reason)}\n\n<b>Fuente:</b> ${escapeHtml(s.source_name)}\n${escapeHtml(s.source_url)}`;}

async function sendMesa(chatId,edition="MANUAL",userId=adminId()){await tg.sendMessage(chatId,`📰 <b>MESA DE REDACCIÓN · ${edition}</b>\nEl Independiente de Hidalgo Digital\n\n🔎 Buscando, contrastando y priorizando noticias actuales…`);const stories=await buildMesa({edition,previousHeadlines:recentHeadlines(20)});stories.forEach(putStory);saveMesa(chatId,stories,edition);const allowed=canProduce(chatId,userId);for(const s of stories)await tg.sendMessage(chatId,storyText(s),keyboard(s.id,allowed,s.requires_graphic));const recommended=stories.filter(s=>s.requires_graphic).map(s=>s.number);await tg.sendMessage(chatId,`🎨 <b>Recomendadas para gráfica:</b> ${recommended.length?recommended.join(", "):"ninguna"}${allowed?"\n\nPulsa <b>🎨 Generar gráfica</b> debajo de cada nota o usa <code>/grafica 1,3</code>.":""}`);return stories;}

async function produceAndSend(chatId,story,angle="normal"){
  await tg.sendMessage(chatId,"✍️ Re-verificando, preparando copy y generando la pieza bajo el Brand Book…");
  const prod=await produceStory(story,angle);
  patchStory(story.id,{production:prod,status:"produced"});
  if(!prod.verified){
    await tg.sendMessage(chatId,`⚠️ <b>REQUIERE REVISIÓN EDITORIAL</b>
${escapeHtml(prod.verification_note)}`);
    return;
  }
  const realPhoto=await fetchRealSourceImage(story,prod);
  let bg=realPhoto?.path||null;
  if(prod.real_photo_required && !bg){
    // Nunca dejar la nota sin pieza: si no fue posible localizar una foto real usable,
    // renderiza una pieza editorial de marca SIN inventar a la persona/equipo.
    await tg.sendMessage(chatId,`⚠️ <b>FOTO REAL NO LOCALIZADA</b>

Busqué automáticamente en la fuente, sitios oficiales/periodísticos y Wikimedia una fotografía real de <b>${escapeHtml(prod.real_photo_subject||story.headline)}</b>, pero ninguna pasó los controles de tamaño/descarga.

Voy a entregar la pieza con fondo editorial de marca, sin fabricar una imagen falsa.`);
  }
  if(!bg && !prod.real_photo_required) bg=await generateVisualBackground(story,prod);
  const imagePath=await renderStory(story,prod,bg);
  patchStory(story.id,{production:prod,status:"produced",final_image_path:imagePath,photo_source_url:realPhoto?.pageUrl||null,photo_image_url:realPhoto?.imageUrl||null,photo_source_via:realPhoto?.via||null});
  const base=process.env.PUBLIC_BASE_URL?.replace(/\/$/,"");
  if(!base)throw new Error("Falta PUBLIC_BASE_URL");
  const photoUrl=`${base}/output/${path.basename(imagePath)}`;
  const photoNote=realPhoto?` · foto real (${escapeHtml(realPhoto.sourceName||realPhoto.via||"web")})`:prod.real_photo_required?" · pieza sin foto inventada":"";
  const caption=`✅ <b>PIEZA LISTA</b> · Formato ${escapeHtml(prod.format)}${photoNote}

<b>${escapeHtml(prod.headline)}</b>

<b>COPY FACEBOOK</b>
${escapeHtml(prod.facebook_copy)}

${prod.hashtags.map(escapeHtml).join(" ")}

<b>Fuente:</b> ${escapeHtml(prod.source_name)}${realPhoto?.pageUrl?`\n<b>Foto:</b> ${escapeHtml(realPhoto.sourceName||realPhoto.via||"fuente web")}`:""}
<b>Identidad:</b> ${escapeHtml(BRAND.system)} · v${escapeHtml(BRAND.version)}`;
  await tg.sendPhoto(chatId,photoUrl,caption,producedKeyboard(story.id));
}

app.get("/health",(_req,res)=>res.json({ok:true,version:"6.1.0",schedule:mesaCron,timezone:mesaTimezone,editorial_chat:!!editorialChatId(),editorial_chat_id:editorialChatId()?"registered":null,admin:!!adminId(),production_controls:!!editorialChatId()||!!adminId(),brand_book:BRAND.version,brand_system:BRAND.system,drive:driveConfigured()}));

app.post("/telegram-webhook",async(req,res)=>{const secret=req.get("x-telegram-bot-api-secret-token");if(process.env.TELEGRAM_WEBHOOK_SECRET&&secret!==process.env.TELEGRAM_WEBHOOK_SECRET)return res.sendStatus(403);res.sendStatus(200);const update=req.body;try{if(update.message){const chatId=update.message.chat.id,userId=update.message.from?.id,chatType=update.message.chat.type||"private",text=String(update.message.text||"").trim();rememberEditorialChat(chatId,userId,chatType);if(text==="/start")await tg.sendMessage(chatId,"📰 <b>El Independiente · Mesa de Redacción</b>\n\nEste chat quedó registrado como mesa editorial. Recibirás automáticamente las mesas de las 08:00, 12:00 y 17:00 (hora de Hidalgo). Cada nota tendrá botones para <b>🎨 Generar gráfica</b>, <b>♻️ Otro enfoque</b> y <b>❌ Descartar</b>.\n\nUsa /mesa para generar una mesa ahora, /ultima para ver la última mesa programada o /estado para verificar los controles." );else if(text==="/estado")await tg.sendMessage(chatId,`⚙️ <b>ESTADO EDITORIAL</b>\nVersión: 6.1.0\nChat editorial: ${isEditorialChat(chatId)?"✅ ESTE CHAT":"❌ NO REGISTRADO"}\nControles de producción: ${canProduce(chatId,userId)?"✅ ACTIVOS":"❌ INACTIVOS"}\nHorario: 08:00 · 12:00 · 17:00\nZona: ${escapeHtml(mesaTimezone)}\nGoogle Drive: ${driveConfigured()?"✅ CONFIGURADO":"❌ PENDIENTE"}`);else if(text==="/mesa")await sendMesa(chatId,"MANUAL",userId);else if(text==="/ultima"){const mesa=getLatestMesa(chatId)||getLatestMesa("__scheduled__");if(!mesa){await tg.sendMessage(chatId,"Aún no hay una mesa programada guardada. Usa /mesa para generar una ahora.");return;}await tg.sendMessage(chatId,`🗂️ <b>ÚLTIMA MESA · ${escapeHtml(mesa.edition||"GUARDADA")}</b>`);for(const s of mesa.stories)await tg.sendMessage(chatId,storyText(s),keyboard(s.id,canProduce(chatId,userId),s.requires_graphic));}else if(text.startsWith("/grafica")){if(!canProduce(chatId,userId)){await tg.sendMessage(chatId,"🔒 La generación de piezas está reservada al chat editorial.");return;}const mesa=getLatestMesa(chatId);if(!mesa){await tg.sendMessage(chatId,"No hay una mesa reciente. Usa /mesa primero.");return;}const nums=text.replace("/grafica","").trim().split(/[,\s]+/).map(Number).filter(n=>Number.isInteger(n)&&n>0);if(!nums.length){await tg.sendMessage(chatId,"Usa, por ejemplo: <code>/grafica 1,3</code>");return;}for(const n of nums){const story=mesa.stories.find(s=>s.number===n);if(story)await produceAndSend(chatId,story);}}}
if(update.callback_query){const q=update.callback_query,chatId=q.message.chat.id,userId=q.from?.id,[action,id]=String(q.data||"").split(":");if(!canProduce(chatId,userId)){await tg.answerCallback(q.id,"Solo el chat editorial puede producir piezas");return;}const story=getStory(id);if(!story){await tg.answerCallback(q.id,"La nota ya no está disponible");return;}if(action==="discard"){patchStory(id,{status:"discarded"});await tg.answerCallback(q.id,"Descartada");await tg.sendMessage(chatId,`❌ Descartada: <b>${escapeHtml(story.headline)}</b>`);}else if(action==="reframe"){await tg.answerCallback(q.id,"Buscando otro enfoque…");const prod=await produceStory(story,"Busca un ángulo editorial distinto pero fiel a los mismos hechos. Evita sensacionalismo.");patchStory(id,{production:prod,status:"reframed"});await tg.sendMessage(chatId,`♻️ <b>OTRO ENFOQUE</b>\n\n<b>${escapeHtml(prod.headline)}</b>\n${escapeHtml(prod.subheadline)}\n\n${escapeHtml(prod.facebook_copy)}\n\n${prod.hashtags.map(escapeHtml).join(" ")}`,keyboard(id,true,true));}else if(action==="drive"){await tg.answerCallback(q.id,"Aprobando y subiendo a Drive…");const current=getStory(id)||story;if(current.status==="approved_drive"&&current.drive?.folder_url){await tg.sendMessage(chatId,`✅ Esta publicación ya estaba aprobada y subida a Drive.\n\n<a href="${current.drive.folder_url}">📁 Abrir carpeta en Drive</a>`);return;}const prod=current.production;if(!prod){await tg.sendMessage(chatId,"⚠️ Primero genera la pieza antes de aprobarla para Drive.");return;}let imagePath=current.final_image_path;if(!imagePath){const realPhoto=await fetchRealSourceImage(current,prod);let bg=realPhoto?.path||null;if(!bg&&!prod.real_photo_required)bg=await generateVisualBackground(current,prod);imagePath=await renderStory(current,prod,bg);patchStory(id,{final_image_path:imagePath,photo_source_url:realPhoto?.pageUrl||null,photo_image_url:realPhoto?.imageUrl||null,photo_source_via:realPhoto?.via||null});}const driveResult=await uploadApprovedPublication({story:current,production:prod,imagePath});patchStory(id,{status:"approved_drive",drive:driveResult,approved_at:driveResult.approved_at});await tg.sendMessage(chatId,`✅ <b>PUBLICACIÓN APROBADA</b>

El arte, copy y metadata ya están en Google Drive para que otra persona los publique.

<a href="${driveResult.folder_url}">📁 Abrir carpeta en Drive</a>`);}else if(action==="approve"){await tg.answerCallback(q.id,"Generando pieza…");await produceAndSend(chatId,story);}}
}catch(e){console.error(e);const chatId=update.message?.chat?.id??update.callback_query?.message?.chat?.id;if(chatId)await tg.sendMessage(chatId,`⚠️ Error: ${escapeHtml(String(e.message).slice(0,600))}`).catch(()=>{});}});

cron.schedule(mesaCron,async()=>{try{const edition=editionNow();const target=editorialChatId();if(target){await sendMesa(target,edition,adminId());}else{console.warn(`Mesa ${edition}: aún no hay chat editorial registrado; se generará y guardará para /ultima.`);const stories=await buildMesa({edition,previousHeadlines:recentHeadlines(20)});stories.forEach(putStory);saveMesa("__scheduled__",stories,edition);}}catch(e){console.error("Error en mesa programada:",e);}}, {timezone:mesaTimezone});console.log(`Mesas programadas: ${mesaCron} · ${mesaTimezone} · destino ${editorialChatId()?"registrado":"se registrará al primer /start o /mesa"}`);

app.listen(port,()=>console.log(`Servidor listo en :${port}`));
