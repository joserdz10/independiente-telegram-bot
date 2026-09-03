import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";
import { BRAND, validateProduction } from "./brand-book.js";

const W = BRAND.canvas.width, H = BRAND.canvas.height;
const footerPath = path.resolve("assets/footer_master.png");
const logoPath = path.resolve("assets/isotipo_i.png");
const OUT = path.resolve("output");
const c = BRAND.colors;
const HEADLINE = `${BRAND.fonts.headline}, DejaVu Serif, serif`;
const UI = `${BRAND.fonts.ui}, DejaVu Sans, sans-serif`;
const BODY = `${BRAND.fonts.body}, DejaVu Sans, sans-serif`;
const M = BRAND.layout.margin;
const SAFE_RIGHT = W - M;

function esc(s="") { return String(s).replace(/[&<>\"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch])); }

// Estimate visual width so the renderer, not the model, is the final authority on text fitting.
function charFactor(ch) {
  if (/\s/.test(ch)) return 0.30;
  if (/[MWÁÉÍÓÚÜÑ]/i.test(ch)) return 0.82;
  if (/[ilI1.,:;!|]/.test(ch)) return 0.32;
  if (/[A-Z0-9%]/.test(ch)) return 0.62;
  return 0.54;
}
function estimatedWidth(text, fontSize) {
  return [...String(text||"")].reduce((sum,ch)=>sum + charFactor(ch)*fontSize, 0);
}
function wrapPx(text, maxPx, fontSize, maxLines=99) {
  const words=String(text||"").trim().split(/\s+/).filter(Boolean);
  const lines=[]; let line="";
  for (const word of words) {
    const candidate=(line+" "+word).trim();
    if (!line || estimatedWidth(candidate,fontSize)<=maxPx) line=candidate;
    else { lines.push(line); line=word; if(lines.length>=maxLines) break; }
  }
  if(line && lines.length<maxLines) lines.push(line);
  return lines;
}
function fitText(text, {maxPx, maxLines, startSize, minSize, step=2, uppercase=false}) {
  const t=uppercase?String(text||"").toUpperCase():String(text||"");
  for(let size=startSize; size>=minSize; size-=step){
    const lines=wrapPx(t,maxPx,size,maxLines+1);
    if(lines.length<=maxLines && lines.every(l=>estimatedWidth(l,size)<=maxPx)) return {lines,size};
  }
  // Last-resort: constrain lines and append ellipsis only if absolutely necessary.
  const size=minSize;
  let lines=wrapPx(t,maxPx,size,maxLines);
  if(lines.length>maxLines) lines=lines.slice(0,maxLines);
  if(lines.length){
    let last=lines[lines.length-1];
    while(last && estimatedWidth(last+"…",size)>maxPx) last=last.slice(0,-1).trimEnd();
    lines[lines.length-1]=last+(last!==t?"…":"");
  }
  return {lines,size};
}
function tspans(lines,x,y,dy,anchor="start"){return lines.map((l,i)=>`<tspan x="${x}" y="${y+i*dy}" text-anchor="${anchor}">${esc(l)}</tspan>`).join("");}
function accentFor(section=""){if(section.includes("SEGURIDAD"))return c.security;if(section.includes("DEPORTES"))return c.sports;return c.copper;}
function categoryLabel(section=""){return String(section||"LOCAL/HIDALGO").replaceAll("/"," · ");}
function topo(opacity=0.11){return `<g opacity="${opacity}" stroke="${c.copper}" fill="none" stroke-width="1.2">${Array.from({length:14},(_,i)=>`<path d="M -80 ${90+i*72} C 210 ${38+i*70}, 470 ${150+i*58}, 1150 ${68+i*71}"/>`).join("")}</g>`;}
function chip(section,accent){
  const label=categoryLabel(section);
  const fit=fitText(label,{maxPx:390,maxLines:1,startSize:27,minSize:21,uppercase:false});
  return `<rect x="${M}" y="54" rx="11" width="455" height="66" fill="${c.mineral}" fill-opacity="0.96" stroke="${accent}" stroke-width="2"/><rect x="${M}" y="54" rx="11" width="11" height="66" fill="${accent}"/><text x="${M+31}" y="97" fill="${c.bone}" font-family="${UI}" font-size="${fit.size}" font-weight="800">${esc(fit.lines[0]||label)}</text>`;
}

function fitStat(text, maxPx, maxLines=2, start=58, min=28) {
  return fitText(text,{maxPx,maxLines,startSize:start,minSize:min,uppercase:false});
}

async function prepareBackground(backgroundPath, format, mainH) {
  if (!backgroundPath || !fs.existsSync(backgroundPath)) return null;
  const position = format === "A" ? "right" : "attention";
  const img = sharp(backgroundPath).resize(W, mainH, { fit:"cover", position });
  if (format === "B") return img.modulate({ brightness:0.86, saturation:0.88 }).png().toBuffer();
  if (format === "A") return img.modulate({ brightness:0.76, saturation:0.80 }).png().toBuffer();
  return img.modulate({ brightness:0.48, saturation:0.62 }).blur(0.4).png().toBuffer();
}

function svgA({mainH,section,accent,p}) {
  // Approved visual target: copy lives in a protected left column; subject remains on the right.
  const textWidth=620;
  const title=fitText(p.headline,{maxPx:textWidth,maxLines:4,startSize:66,minSize:48,uppercase:true});
  const titleY=270, dy=Math.round(title.size*1.23);
  const divider=titleY+title.lines.length*dy+10;
  const sub=fitText(p.subheadline,{maxPx:520,maxLines:3,startSize:27,minSize:22,uppercase:false});
  const subY=divider+58, subDy=Math.round(sub.size*1.48);
  let stat="";
  if(p.key_stat){
    const boxX=M, boxW=425, boxH=190;
    const boxY=Math.min(subY+sub.lines.length*subDy+48, mainH-310);
    const statFit=fitStat(p.key_stat,boxW-56,2,54,30);
    const statY=boxY+65;
    const statDy=Math.round(statFit.size*1.05);
    const label=fitText(p.key_stat_label,{maxPx:boxW-56,maxLines:2,startSize:19,minSize:15,uppercase:false});
    const labelY=statY+statFit.lines.length*statDy+34;
    stat=`<rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="20" fill="${c.mineralDeep}" fill-opacity="0.92" stroke="${accent}" stroke-width="3"/><text fill="${accent}" font-family="${UI}" font-size="${statFit.size}" font-weight="800">${tspans(statFit.lines,boxX+28,statY,statDy)}</text><text fill="${c.bone}" font-family="${BODY}" font-size="${label.size}" font-weight="650">${tspans(label.lines,boxX+28,labelY,Math.round(label.size*1.25))}</text>`;
  }
  return `<defs><linearGradient id="shadeA" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c.mineralDeep}" stop-opacity="0.99"/><stop offset="0.52" stop-color="${c.mineralDeep}" stop-opacity="0.88"/><stop offset="0.78" stop-color="${c.mineralDeep}" stop-opacity="0.42"/><stop offset="1" stop-color="${c.mineralDeep}" stop-opacity="0.06"/></linearGradient></defs><rect width="1080" height="${mainH}" fill="url(#shadeA)"/>${topo(0.08)}${chip(section,accent)}<text fill="${c.bone}" font-family="${HEADLINE}" font-size="${title.size}" font-weight="900">${tspans(title.lines,M,titleY,dy)}</text><rect x="${M}" y="${divider}" width="118" height="7" fill="${accent}"/><text fill="${c.sand}" font-family="${BODY}" font-size="${sub.size}" font-weight="500">${tspans(sub.lines,M,subY,subDy)}</text>${stat}`;
}

function svgB({mainH,section,accent,p}) {
  const title=fitText(p.headline,{maxPx:935,maxLines:4,startSize:64,minSize:48,uppercase:true});
  const dy=Math.round(title.size*1.20);
  const sub=fitText(p.subheadline,{maxPx:620,maxLines:2,startSize:26,minSize:21,uppercase:false});
  const titleY=mainH-405-(title.lines.length-1)*dy;
  const divider=titleY+title.lines.length*dy+8;
  const subY=divider+52;
  let stat="";
  if(p.key_stat){
    const boxX=730, boxY=mainH-270, boxW=292, boxH=175;
    const statFit=fitStat(p.key_stat,boxW-36,2,54,27);
    const statY=boxY+62;
    const statDy=Math.round(statFit.size*1.04);
    const label=fitText(p.key_stat_label,{maxPx:boxW-36,maxLines:2,startSize:17,minSize:14,uppercase:false});
    const labelY=statY+statFit.lines.length*statDy+18;
    stat=`<rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="20" fill="${c.mineralDeep}" fill-opacity="0.93" stroke="${accent}" stroke-width="3"/><text fill="${accent}" font-family="${UI}" font-size="${statFit.size}" font-weight="800">${tspans(statFit.lines,boxX+boxW/2,statY,statDy,"middle")}</text><text fill="${c.bone}" font-family="${BODY}" font-size="${label.size}" font-weight="650">${tspans(label.lines,boxX+boxW/2,labelY,Math.round(label.size*1.2),"middle")}</text>`;
  }
  return `<defs><linearGradient id="shadeB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.mineralDeep}" stop-opacity="0.05"/><stop offset="0.42" stop-color="${c.mineralDeep}" stop-opacity="0.08"/><stop offset="0.70" stop-color="${c.mineralDeep}" stop-opacity="0.55"/><stop offset="1" stop-color="${c.mineralDeep}" stop-opacity="0.98"/></linearGradient></defs><rect width="1080" height="${mainH}" fill="url(#shadeB)"/>${topo(0.055)}${chip(section,accent)}<text fill="${c.bone}" font-family="${HEADLINE}" font-size="${title.size}" font-weight="900">${tspans(title.lines,M,titleY,dy)}</text><rect x="${M}" y="${divider}" width="118" height="7" fill="${accent}"/><text fill="${c.bone}" font-family="${BODY}" font-size="${sub.size}" font-weight="600">${tspans(sub.lines,M,subY,Math.round(sub.size*1.45))}</text>${stat}`;
}

function svgC({mainH,section,accent,p}) {
  // In C the stat is the hero. Headline is narrower and should not repeat the exact stat.
  const title=fitText(p.headline,{maxPx:935,maxLines:3,startSize:58,minSize:46,uppercase:true});
  const sub=fitText(p.subheadline,{maxPx:900,maxLines:2,startSize:25,minSize:20,uppercase:false});
  const stat=p.key_stat || "DATO";
  const statFit=fitStat(stat,820,2,170,70);
  const label=fitText(p.key_stat_label || "INFORMACIÓN CLAVE",{maxPx:780,maxLines:2,startSize:28,minSize:20,uppercase:false});
  const statY=745-(statFit.lines.length-1)*42;
  const statDy=Math.round(statFit.size*1.02);
  const labelY=statY+statFit.lines.length*statDy+20;
  return `<rect width="1080" height="${mainH}" fill="${c.mineralDeep}" fill-opacity="0.78"/>${topo(0.10)}${chip(section,accent)}<text x="${M}" y="278" fill="${c.bone}" font-family="${HEADLINE}" font-size="${title.size}" font-weight="900">${tspans(title.lines,M,278,Math.round(title.size*1.2))}</text><rect x="${M}" y="${325+title.lines.length*Math.round(title.size*1.2)}" width="118" height="7" fill="${accent}"/><rect x="${M}" y="585" width="968" height="345" rx="28" fill="${c.mineral}" fill-opacity="0.87" stroke="${accent}" stroke-width="3"/><text fill="${accent}" font-family="${UI}" font-size="${statFit.size}" font-weight="800">${tspans(statFit.lines,540,statY,statDy,"middle")}</text><text fill="${c.bone}" font-family="${UI}" font-size="${label.size}" font-weight="750">${tspans(label.lines,540,labelY,Math.round(label.size*1.18),"middle")}</text><text fill="${c.sand}" font-family="${BODY}" font-size="${sub.size}" font-weight="500">${tspans(sub.lines,M,1005,Math.round(sub.size*1.45))}</text>`;
}

function sourceSvg(source, mainH) {
  const src=`FUENTE: ${String(source||"").trim()}`;
  const fit=fitText(src,{maxPx:SAFE_RIGHT-M,maxLines:2,startSize:16,minSize:13,uppercase:false});
  const dy=Math.round(fit.size*1.25);
  const y=mainH-28-(fit.lines.length-1)*dy;
  return `<text fill="${c.sand}" font-family="${BODY}" font-size="${fit.size}" font-weight="500">${tspans(fit.lines,M,y,dy)}</text>`;
}

export async function renderStory(story, production, backgroundPath=null) {
  fs.mkdirSync(OUT,{recursive:true});
  if (!fs.existsSync(footerPath)) throw new Error(`No se encontró footer maestro: ${footerPath}`);
  if (!fs.existsSync(logoPath)) throw new Error(`No se encontró isotipo maestro: ${logoPath}`);

  const validated = validateProduction(story, production);
  if (!validated.ok) throw new Error(`Brand Book: ${validated.errors.join("; ")}`);
  if (validated.warnings.length) console.warn("Brand Book warnings:", validated.warnings.join(" | "));
  const p=validated.production;

  const section=String(story.section||"LOCAL/HIDALGO"), accent=accentFor(section), format=p.format;
  const footer=await sharp(footerPath).resize({width:W}).png().toBuffer();
  const footerH=(await sharp(footer).metadata()).height||162;
  const mainH=H-footerH;
  const logo=await sharp(logoPath).resize({width:BRAND.layout.logoSize,height:BRAND.layout.logoSize,fit:"contain"}).png().toBuffer();
  const bg=await prepareBackground(backgroundPath,format,mainH);

  const base = bg ? "" : `<rect width="1080" height="${mainH}" fill="${c.mineralDeep}"/>`;
  const body = format === "A" ? svgA({mainH,section,accent,p}) : format === "C" ? svgC({mainH,section,accent,p}) : svgB({mainH,section,accent,p});
  const svg=Buffer.from(`<svg width="${W}" height="${mainH}" viewBox="0 0 ${W} ${mainH}" xmlns="http://www.w3.org/2000/svg">${base}${body}${sourceSvg(p.source_name||story.source_name||"",mainH)}</svg>`);

  const composites=[];
  if(bg) composites.push({input:bg,top:0,left:0});
  composites.push(
    {input:await sharp(svg).png().toBuffer(),top:0,left:0},
    {input:logo,top:44,left:W-44-BRAND.layout.logoSize},
    {input:footer,top:H-footerH,left:0}
  );
  const out=path.join(OUT,`${story.id}.png`);
  await sharp({create:{width:W,height:H,channels:4,background:c.mineral}}).composite(composites).png().toFile(out);
  return out;
}
