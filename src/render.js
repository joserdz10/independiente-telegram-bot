import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { BRAND, validateProduction } from "./brand-book.js";

const require = createRequire(import.meta.url);
const fontkit = require("fontkit");

const W = BRAND.canvas.width, H = BRAND.canvas.height;
const footerPath = path.resolve("assets/footer_master.png");
const logoPath = path.resolve("assets/isotipo_i.png");
const OUT = path.resolve("output");
const c = BRAND.colors;
const M = BRAND.layout.margin;
const SAFE_RIGHT = W - M;
const HARD_SAFE_RIGHT = W - 74; // 18 px extra de seguridad respecto al margen del manual.

function esc(s="") { return String(s).replace(/[&<>\"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch])); }
function escFont(s="") { return String(s).replace(/["']/g, ""); }

function resolveFont(requested) {
  try {
    const r=spawnSync("fc-match",["-f","%{family[0]}|%{file}\\n",requested],{encoding:"utf8"});
    const line=String(r.stdout||"").trim().split("\n")[0];
    const [family,file]=line.split("|");
    if(file && fs.existsSync(file)) {
      const font=fontkit.openSync(file);
      return { requested, family:family||requested, file, font };
    }
  } catch (e) {
    console.warn(`No se pudo resolver la fuente ${requested}:`,e.message);
  }
  return { requested, family:requested, file:null, font:null };
}

const FONTS = {
  headline: resolveFont(BRAND.fonts.headline),
  ui: resolveFont(BRAND.fonts.ui),
  body: resolveFont(BRAND.fonts.body)
};

const HEADLINE = `'${escFont(FONTS.headline.family)}'`;
const UI = `'${escFont(FONTS.ui.family)}'`;
const BODY = `'${escFont(FONTS.body.family)}'`;

console.log(`Fuentes renderer: titular=${FONTS.headline.family}; UI=${FONTS.ui.family}; cuerpo=${FONTS.body.family}`);

const STRICT_FONTS = String(process.env.STRICT_BRAND_FONTS || "true").toLowerCase() !== "false";
function assertBrandFonts(){
  const checks=[
    ["Newsreader",FONTS.headline],
    ["Sora",FONTS.ui],
    ["Inter",FONTS.body]
  ];
  const missing=checks.filter(([name,info])=>!info?.file || !String(info.family||"").toLowerCase().includes(name.toLowerCase()));
  if(missing.length){
    const detail=missing.map(([name,info])=>`${name}=>${info?.family||"no instalada"}`).join(", ");
    const msg=`Fuentes de marca no disponibles: ${detail}. No se generarán piezas con fuentes sustitutas.`;
    if(STRICT_FONTS) throw new Error(msg);
    console.warn(msg);
  }
}
assertBrandFonts();

// Medición REAL de glifos. Esta es la diferencia clave de V5.2:
// ya no estimamos el ancho por número de caracteres, medimos la fuente que usa Railway.
function measuredWidth(text, fontSize, fontInfo, weight=400) {
  const s=String(text||"");
  if(fontInfo?.font){
    try {
      let face=fontInfo.font;
      if(face.variationAxes?.wght && typeof face.getVariation === "function") {
        const min=face.variationAxes.wght.min ?? weight;
        const max=face.variationAxes.wght.max ?? weight;
        face=face.getVariation({wght:Math.min(max,Math.max(min,weight))});
      }
      const run=face.layout(s);
      const units=face.unitsPerEm || 1000;
      const advance=run.positions.reduce((sum,p)=>sum+(p.xAdvance||0),0);
      return advance/units*fontSize;
    } catch {}
  }
  // Fallback deliberadamente conservador.
  return [...s].reduce((sum,ch)=>sum + (/[MWÁÉÍÓÚÜÑ%0-9]/i.test(ch)?0.82:/\s/.test(ch)?0.32:/[ilI1.,:;!|]/.test(ch)?0.36:0.64)*fontSize,0);
}

function wrapMeasured(text,maxPx,fontSize,fontInfo,maxLines=99,weight=400){
  const words=String(text||"").trim().split(/\s+/).filter(Boolean);
  const lines=[]; let line="";
  for(const word of words){
    const candidate=(line+" "+word).trim();
    if(!line || measuredWidth(candidate,fontSize,fontInfo,weight)<=maxPx){
      line=candidate;
    } else {
      lines.push(line);
      line=word;
      if(lines.length>=maxLines) break;
    }
  }
  if(line && lines.length<maxLines) lines.push(line);
  return lines;
}

function fitText(text,{maxPx,maxLines,startSize,minSize,step=1,uppercase=false,fontInfo=FONTS.body,weight=400}){
  const t=uppercase?String(text||"").toUpperCase():String(text||"");
  for(let size=startSize;size>=minSize;size-=step){
    const lines=wrapMeasured(t,maxPx,size,fontInfo,maxLines+1,weight);
    if(lines.length<=maxLines && lines.every(l=>measuredWidth(l,size,fontInfo,weight)<=maxPx)) return {lines,size,truncated:false};
  }
  const size=minSize;
  let lines=wrapMeasured(t,maxPx,size,fontInfo,maxLines+1,weight);
  let truncated=lines.length>maxLines;
  lines=lines.slice(0,maxLines);
  if(lines.length){
    let last=lines[lines.length-1];
    while(last && measuredWidth(last+(truncated?"…":""),size,fontInfo,weight)>maxPx) last=last.slice(0,-1).trimEnd();
    lines[lines.length-1]=last+(truncated?"…":"");
  }
  return {lines,size,truncated};
}

function tspans(lines,x,y,dy,anchor="start"){return lines.map((l,i)=>`<tspan x="${x}" y="${y+i*dy}" text-anchor="${anchor}">${esc(l)}</tspan>`).join("");}
function accentFor(section=""){if(section.includes("SEGURIDAD"))return c.security;if(section.includes("DEPORTES"))return c.sports;return c.copper;}
function categoryLabel(section=""){return String(section||"LOCAL/HIDALGO").replaceAll("/"," · ");}
function topo(opacity=0.11){return `<g opacity="${opacity}" stroke="${c.copper}" fill="none" stroke-width="1.2">${Array.from({length:14},(_,i)=>`<path d="M -80 ${90+i*72} C 210 ${38+i*70}, 470 ${150+i*58}, 1150 ${68+i*71}"/>`).join("")}</g>`;}
function chip(section,accent){
  const label=categoryLabel(section);
  const fit=fitText(label,{maxPx:390,maxLines:1,startSize:27,minSize:20,uppercase:false,fontInfo:FONTS.ui,weight:800});
  return `<rect x="${M}" y="54" rx="11" width="455" height="66" fill="${c.mineral}" fill-opacity="0.96" stroke="${accent}" stroke-width="2"/><rect x="${M}" y="54" rx="11" width="11" height="66" fill="${accent}"/><text x="${M+31}" y="97" fill="${c.bone}" font-family="${UI}" font-size="${fit.size}" font-weight="800">${esc(fit.lines[0]||label)}</text>`;
}
function fitStat(text,maxPx,maxLines=2,start=58,min=28){return fitText(text,{maxPx,maxLines,startSize:start,minSize:min,uppercase:false,fontInfo:FONTS.ui,weight:800});}

async function prepareBackground(backgroundPath,format,mainH){
  if(!backgroundPath||!fs.existsSync(backgroundPath))return null;
  const position=format==="A"?"right":"attention";
  const img=sharp(backgroundPath).resize(W,mainH,{fit:"cover",position});
  if(format==="B")return img.modulate({brightness:0.86,saturation:0.88}).png().toBuffer();
  if(format==="A")return img.modulate({brightness:0.76,saturation:0.80}).png().toBuffer();
  return img.modulate({brightness:0.48,saturation:0.62}).blur(0.4).png().toBuffer();
}

function svgA({mainH,section,accent,p}){
  const textWidth=605;
  const title=fitText(p.headline,{maxPx:textWidth,maxLines:4,startSize:64,minSize:43,uppercase:true,fontInfo:FONTS.headline,weight:900});
  const titleY=270,dy=Math.round(title.size*1.22);
  const divider=titleY+title.lines.length*dy+10;
  const sub=fitText(p.subheadline,{maxPx:505,maxLines:3,startSize:27,minSize:21,uppercase:false,fontInfo:FONTS.body,weight:500});
  const subY=divider+58,subDy=Math.round(sub.size*1.45);
  let stat="";
  if(p.key_stat){
    const boxX=M,boxW=425,boxH=190;
    const boxY=Math.min(subY+sub.lines.length*subDy+48,mainH-310);
    const statFit=fitStat(p.key_stat,boxW-60,2,52,28);
    const statY=boxY+64,statDy=Math.round(statFit.size*1.04);
    const label=fitText(p.key_stat_label,{maxPx:boxW-60,maxLines:2,startSize:19,minSize:14,uppercase:false,fontInfo:FONTS.body,weight:500});
    const labelY=statY+statFit.lines.length*statDy+32;
    stat=`<rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="20" fill="${c.mineralDeep}" fill-opacity="0.92" stroke="${accent}" stroke-width="3"/><text fill="${accent}" font-family="${UI}" font-size="${statFit.size}" font-weight="800">${tspans(statFit.lines,boxX+28,statY,statDy)}</text><text fill="${c.bone}" font-family="${BODY}" font-size="${label.size}" font-weight="650">${tspans(label.lines,boxX+28,labelY,Math.round(label.size*1.22))}</text>`;
  }
  return `<defs><linearGradient id="shadeA" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c.mineralDeep}" stop-opacity="0.99"/><stop offset="0.52" stop-color="${c.mineralDeep}" stop-opacity="0.88"/><stop offset="0.78" stop-color="${c.mineralDeep}" stop-opacity="0.42"/><stop offset="1" stop-color="${c.mineralDeep}" stop-opacity="0.06"/></linearGradient></defs><rect width="1080" height="${mainH}" fill="url(#shadeA)"/>${topo(0.08)}${chip(section,accent)}<text fill="${c.bone}" font-family="${HEADLINE}" font-size="${title.size}" font-weight="900">${tspans(title.lines,M,titleY,dy)}</text><rect x="${M}" y="${divider}" width="118" height="7" fill="${accent}"/><text fill="${c.sand}" font-family="${BODY}" font-size="${sub.size}" font-weight="500">${tspans(sub.lines,M,subY,subDy)}</text>${stat}`;
}

function svgB({mainH,section,accent,p}){
  // 880 px en vez de 935: conserva aire real en ambos lados y elimina el caso de desborde visto en producción.
  const title=fitText(p.headline,{maxPx:880,maxLines:4,startSize:62,minSize:42,uppercase:true,fontInfo:FONTS.headline,weight:900});
  const dy=Math.round(title.size*1.18);
  const sub=fitText(p.subheadline,{maxPx:610,maxLines:2,startSize:26,minSize:20,uppercase:false,fontInfo:FONTS.body,weight:500});
  const titleY=mainH-405-(title.lines.length-1)*dy;
  const divider=titleY+title.lines.length*dy+8;
  const subY=divider+52;
  let stat="";
  if(p.key_stat){
    const boxX=720,boxY=mainH-270,boxW=302,boxH=175;
    const statFit=fitStat(p.key_stat,boxW-44,2,52,26);
    const statY=boxY+62,statDy=Math.round(statFit.size*1.03);
    const label=fitText(p.key_stat_label,{maxPx:boxW-44,maxLines:2,startSize:17,minSize:13,uppercase:false,fontInfo:FONTS.body,weight:500});
    const labelY=statY+statFit.lines.length*statDy+18;
    stat=`<rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="20" fill="${c.mineralDeep}" fill-opacity="0.93" stroke="${accent}" stroke-width="3"/><text fill="${accent}" font-family="${UI}" font-size="${statFit.size}" font-weight="800">${tspans(statFit.lines,boxX+boxW/2,statY,statDy,"middle")}</text><text fill="${c.bone}" font-family="${BODY}" font-size="${label.size}" font-weight="650">${tspans(label.lines,boxX+boxW/2,labelY,Math.round(label.size*1.2),"middle")}</text>`;
  }
  return `<defs><linearGradient id="shadeB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.mineralDeep}" stop-opacity="0.05"/><stop offset="0.42" stop-color="${c.mineralDeep}" stop-opacity="0.08"/><stop offset="0.70" stop-color="${c.mineralDeep}" stop-opacity="0.55"/><stop offset="1" stop-color="${c.mineralDeep}" stop-opacity="0.98"/></linearGradient></defs><rect width="1080" height="${mainH}" fill="url(#shadeB)"/>${topo(0.055)}${chip(section,accent)}<text fill="${c.bone}" font-family="${HEADLINE}" font-size="${title.size}" font-weight="900">${tspans(title.lines,M,titleY,dy)}</text><rect x="${M}" y="${divider}" width="118" height="7" fill="${accent}"/><text fill="${c.bone}" font-family="${BODY}" font-size="${sub.size}" font-weight="600">${tspans(sub.lines,M,subY,Math.round(sub.size*1.42))}</text>${stat}`;
}

function svgC({mainH,section,accent,p}){
  const title=fitText(p.headline,{maxPx:880,maxLines:3,startSize:56,minSize:42,uppercase:true,fontInfo:FONTS.headline,weight:900});
  const sub=fitText(p.subheadline,{maxPx:880,maxLines:2,startSize:25,minSize:19,uppercase:false,fontInfo:FONTS.body,weight:500});
  const stat=p.key_stat||"DATO";
  const statFit=fitStat(stat,790,2,164,66);
  const label=fitText(p.key_stat_label||"INFORMACIÓN CLAVE",{maxPx:760,maxLines:2,startSize:28,minSize:19,uppercase:false,fontInfo:FONTS.ui,weight:800});
  const statY=745-(statFit.lines.length-1)*42;
  const statDy=Math.round(statFit.size*1.01);
  const labelY=statY+statFit.lines.length*statDy+18;
  return `<rect width="1080" height="${mainH}" fill="${c.mineralDeep}" fill-opacity="0.78"/>${topo(0.10)}${chip(section,accent)}<text x="${M}" y="278" fill="${c.bone}" font-family="${HEADLINE}" font-size="${title.size}" font-weight="900">${tspans(title.lines,M,278,Math.round(title.size*1.18))}</text><rect x="${M}" y="${325+title.lines.length*Math.round(title.size*1.18)}" width="118" height="7" fill="${accent}"/><rect x="${M}" y="585" width="968" height="345" rx="28" fill="${c.mineral}" fill-opacity="0.87" stroke="${accent}" stroke-width="3"/><text fill="${accent}" font-family="${UI}" font-size="${statFit.size}" font-weight="800">${tspans(statFit.lines,540,statY,statDy,"middle")}</text><text fill="${c.bone}" font-family="${UI}" font-size="${label.size}" font-weight="750">${tspans(label.lines,540,labelY,Math.round(label.size*1.16),"middle")}</text><text fill="${c.sand}" font-family="${BODY}" font-size="${sub.size}" font-weight="500">${tspans(sub.lines,M,1005,Math.round(sub.size*1.42))}</text>`;
}

function sourceSvg(source,mainH){
  const src=`FUENTE: ${String(source||"").trim()}`;
  const fit=fitText(src,{maxPx:HARD_SAFE_RIGHT-M,maxLines:2,startSize:16,minSize:12,uppercase:false,fontInfo:FONTS.body,weight:500});
  const dy=Math.round(fit.size*1.22),y=mainH-28-(fit.lines.length-1)*dy;
  return `<text fill="${c.sand}" font-family="${BODY}" font-size="${fit.size}" font-weight="500">${tspans(fit.lines,M,y,dy)}</text>`;
}

export async function renderStory(story,production,backgroundPath=null){
  fs.mkdirSync(OUT,{recursive:true});
  if(!fs.existsSync(footerPath))throw new Error(`No se encontró footer maestro: ${footerPath}`);
  if(!fs.existsSync(logoPath))throw new Error(`No se encontró isotipo maestro: ${logoPath}`);

  const validated=validateProduction(story,production);
  if(!validated.ok)throw new Error(`Brand Book: ${validated.errors.join("; ")}`);
  if(validated.warnings.length)console.warn("Brand Book warnings:",validated.warnings.join(" | "));
  const p=validated.production;

  const section=String(story.section||"LOCAL/HIDALGO"),accent=accentFor(section),format=p.format;
  const footer=await sharp(footerPath).resize({width:W}).png().toBuffer();
  const footerH=(await sharp(footer).metadata()).height||162;
  const mainH=H-footerH;
  const logo=await sharp(logoPath).resize({width:BRAND.layout.logoSize,height:BRAND.layout.logoSize,fit:"contain"}).png().toBuffer();
  const bg=await prepareBackground(backgroundPath,format,mainH);
  const base=bg?"":`<rect width="1080" height="${mainH}" fill="${c.mineralDeep}"/>`;
  const body=format==="A"?svgA({mainH,section,accent,p}):format==="C"?svgC({mainH,section,accent,p}):svgB({mainH,section,accent,p});
  const svg=Buffer.from(`<svg width="${W}" height="${mainH}" viewBox="0 0 ${W} ${mainH}" xmlns="http://www.w3.org/2000/svg">${base}${body}${sourceSvg(p.source_name||story.source_name||"",mainH)}</svg>`);
  const composites=[];
  if(bg)composites.push({input:bg,top:0,left:0});
  composites.push({input:await sharp(svg).png().toBuffer(),top:0,left:0},{input:logo,top:44,left:W-44-BRAND.layout.logoSize},{input:footer,top:H-footerH,left:0});
  const out=path.join(OUT,`${story.id}.png`);
  await sharp({create:{width:W,height:H,channels:4,background:c.mineral}}).composite(composites).png().toFile(out);
  return out;
}
