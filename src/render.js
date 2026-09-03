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

function esc(s="") { return String(s).replace(/[&<>\"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch])); }
function wrap(text,max=28){const words=String(text||"").trim().split(/\s+/).filter(Boolean);const lines=[];let line="";for(const word of words){const t=(line+" "+word).trim();if(t.length<=max)line=t;else{if(line)lines.push(line);line=word;}}if(line)lines.push(line);return lines;}
function tspans(lines,x,y,dy){return lines.map((l,i)=>`<tspan x="${x}" y="${y+i*dy}">${esc(l)}</tspan>`).join("");}
function accentFor(section=""){if(section.includes("SEGURIDAD"))return c.security;if(section.includes("DEPORTES"))return c.sports;return c.copper;}
function categoryLabel(section=""){return String(section||"LOCAL/HIDALGO").replaceAll("/"," · ");}
function topo(opacity=0.11){return `<g opacity="${opacity}" stroke="${c.copper}" fill="none" stroke-width="1.2">${Array.from({length:14},(_,i)=>`<path d="M -80 ${90+i*72} C 210 ${38+i*70}, 470 ${150+i*58}, 1150 ${68+i*71}"/>`).join("")}</g>`;}
function chip(section,accent){return `<rect x="${M}" y="54" rx="11" width="455" height="66" fill="${c.mineral}" fill-opacity="0.96" stroke="${accent}" stroke-width="2"/><rect x="${M}" y="54" rx="11" width="11" height="66" fill="${accent}"/><text x="${M+31}" y="97" fill="${c.bone}" font-family="${UI}" font-size="27" font-weight="800">${esc(categoryLabel(section))}</text>`;}

async function prepareBackground(backgroundPath, format, mainH) {
  if (!backgroundPath || !fs.existsSync(backgroundPath)) return null;
  const position = format === "A" ? "right" : "attention";
  const img = sharp(backgroundPath).resize(W, mainH, { fit:"cover", position });
  if (format === "B") return img.modulate({ brightness:0.86, saturation:0.88 }).png().toBuffer();
  if (format === "A") return img.modulate({ brightness:0.76, saturation:0.80 }).png().toBuffer();
  return img.modulate({ brightness:0.48, saturation:0.62 }).blur(0.4).png().toBuffer();
}

function svgA({mainH,section,accent,p}) {
  const headline=wrap(p.headline.toUpperCase(),21).slice(0,4);
  const sub=wrap(p.subheadline,39).slice(0,3);
  const titleY=300, dy=82, divider=titleY+headline.length*dy+10, subY=divider+58;
  const stat=p.key_stat?`<rect x="${M}" y="${Math.min(subY+sub.length*38+45,880)}" width="420" height="145" rx="20" fill="${c.mineralDeep}" fill-opacity="0.92" stroke="${accent}" stroke-width="3"/><text x="${M+28}" y="${Math.min(subY+sub.length*38+105,940)}" fill="${accent}" font-family="${UI}" font-size="50" font-weight="800">${esc(p.key_stat)}</text><text x="${M+28}" y="${Math.min(subY+sub.length*38+142,977)}" fill="${c.bone}" font-family="${BODY}" font-size="19" font-weight="650">${esc(p.key_stat_label)}</text>`:"";
  return `<defs><linearGradient id="shadeA" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c.mineralDeep}" stop-opacity="0.99"/><stop offset="0.55" stop-color="${c.mineralDeep}" stop-opacity="0.90"/><stop offset="0.80" stop-color="${c.mineralDeep}" stop-opacity="0.48"/><stop offset="1" stop-color="${c.mineralDeep}" stop-opacity="0.08"/></linearGradient></defs><rect width="1080" height="${mainH}" fill="url(#shadeA)"/>${topo(0.08)}${chip(section,accent)}<text fill="${c.bone}" font-family="${HEADLINE}" font-size="67" font-weight="900">${tspans(headline,M,titleY,dy)}</text><rect x="${M}" y="${divider}" width="118" height="7" fill="${accent}"/><text fill="${c.sand}" font-family="${BODY}" font-size="26" font-weight="500">${tspans(sub,M,subY,38)}</text>${stat}`;
}

function svgB({mainH,section,accent,p}) {
  const headline=wrap(p.headline.toUpperCase(),24).slice(0,4);
  const sub=wrap(p.subheadline,43).slice(0,2);
  const dy=80, titleY=mainH-390-(headline.length-1)*dy, divider=titleY+headline.length*dy+8, subY=divider+52;
  const stat=p.key_stat?`<rect x="735" y="${mainH-255}" width="287" height="162" rx="20" fill="${c.mineralDeep}" fill-opacity="0.93" stroke="${accent}" stroke-width="3"/><text x="878" y="${mainH-186}" text-anchor="middle" fill="${accent}" font-family="${UI}" font-size="56" font-weight="800">${esc(p.key_stat)}</text><text x="878" y="${mainH-145}" text-anchor="middle" fill="${c.bone}" font-family="${BODY}" font-size="17" font-weight="650">${esc(p.key_stat_label)}</text>`:"";
  return `<defs><linearGradient id="shadeB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.mineralDeep}" stop-opacity="0.05"/><stop offset="0.42" stop-color="${c.mineralDeep}" stop-opacity="0.08"/><stop offset="0.70" stop-color="${c.mineralDeep}" stop-opacity="0.55"/><stop offset="1" stop-color="${c.mineralDeep}" stop-opacity="0.98"/></linearGradient></defs><rect width="1080" height="${mainH}" fill="url(#shadeB)"/>${topo(0.055)}${chip(section,accent)}<text fill="${c.bone}" font-family="${HEADLINE}" font-size="66" font-weight="900">${tspans(headline,M,titleY,dy)}</text><rect x="${M}" y="${divider}" width="118" height="7" fill="${accent}"/><text fill="${c.bone}" font-family="${BODY}" font-size="26" font-weight="600">${tspans(sub,M,subY,38)}</text>${stat}`;
}

function svgC({mainH,section,accent,p}) {
  const headline=wrap(p.headline.toUpperCase(),24).slice(0,3);
  const sub=wrap(p.subheadline,43).slice(0,2);
  const stat=p.key_stat || "DATO";
  const label=p.key_stat_label || "INFORMACIÓN CLAVE";
  const statFont=stat.length<=5?176:stat.length<=10?132:96;
  return `<rect width="1080" height="${mainH}" fill="${c.mineralDeep}" fill-opacity="0.78"/>${topo(0.10)}${chip(section,accent)}<text x="${M}" y="278" fill="${c.bone}" font-family="${HEADLINE}" font-size="58" font-weight="900">${tspans(headline,M,278,70)}</text><rect x="${M}" y="${310+headline.length*70}" width="118" height="7" fill="${accent}"/><rect x="${M}" y="600" width="968" height="330" rx="28" fill="${c.mineral}" fill-opacity="0.87" stroke="${accent}" stroke-width="3"/><text x="540" y="790" text-anchor="middle" fill="${accent}" font-family="${UI}" font-size="${statFont}" font-weight="800">${esc(stat)}</text><text x="540" y="858" text-anchor="middle" fill="${c.bone}" font-family="${UI}" font-size="28" font-weight="750">${esc(label)}</text><text fill="${c.sand}" font-family="${BODY}" font-size="25" font-weight="500">${tspans(sub,M,1010,36)}</text>`;
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
  const sourceY=mainH-30;
  const svg=Buffer.from(`<svg width="${W}" height="${mainH}" viewBox="0 0 ${W} ${mainH}" xmlns="http://www.w3.org/2000/svg">${base}${body}<text x="${M}" y="${sourceY}" fill="${c.sand}" font-family="${BODY}" font-size="16" font-weight="500">FUENTE: ${esc(p.source_name||story.source_name||"")}</text></svg>`);

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
