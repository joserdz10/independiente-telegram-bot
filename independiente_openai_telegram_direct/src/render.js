import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";

const W = 1080, H = 1350;
const footerPath = path.resolve("assets/footer_master.png");
const logoPath = path.resolve("assets/isotipo_i.png");
const OUT = path.resolve("output");
const colors = { green: "#0E2A28", green2: "#173C3A", copper: "#C66A3D", bone: "#FAF8F3", muted: "#D9D2C5" };

function esc(s="") { return String(s).replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function wrap(text, max=28) {
  const words = String(text).split(/\s+/); const lines=[]; let line="";
  for (const word of words) { const t=(line+" "+word).trim(); if (t.length<=max) line=t; else { if(line) lines.push(line); line=word; } }
  if(line) lines.push(line); return lines;
}
function tspans(lines, x, y, dy) { return lines.map((l,i)=>`<tspan x="${x}" y="${y+i*dy}">${esc(l)}</tspan>`).join(""); }

export async function renderStory(story, production) {
  fs.mkdirSync(OUT,{recursive:true});
  const section = story.section;
  const headlineLines = wrap(production.headline.toUpperCase(), 23).slice(0,4);
  const subLines = wrap(production.subheadline, 48).slice(0,4);
  const chip = section.replace("/", " · ");
  const dataBlock = production.key_stat ? `
    <rect x="650" y="730" width="340" height="245" rx="24" fill="#0E2A28" stroke="${colors.copper}" stroke-width="3"/>
    <text x="820" y="835" text-anchor="middle" fill="${colors.copper}" font-family="Arial, sans-serif" font-weight="800" font-size="78">${esc(production.key_stat)}</text>
    <text x="820" y="900" text-anchor="middle" fill="${colors.bone}" font-family="Arial, sans-serif" font-weight="700" font-size="26">${esc(production.key_stat_label)}</text>` : "";
  const svg = Buffer.from(`
  <svg width="${W}" height="1188" viewBox="0 0 ${W} 1188" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${colors.green}"/><stop offset="1" stop-color="#071b1a"/></linearGradient></defs>
    <rect width="1080" height="1188" fill="url(#g)"/>
    <g opacity="0.22" stroke="${colors.copper}" fill="none">
      ${Array.from({length:14},(_,i)=>`<path d="M -60 ${90+i*72} C 220 ${35+i*72}, 430 ${145+i*58}, 1120 ${70+i*70}"/>`).join("")}
    </g>
    <rect x="54" y="54" rx="10" width="390" height="66" fill="#173C3A" stroke="${colors.copper}"/>
    <text x="82" y="98" fill="${colors.bone}" font-family="Arial, sans-serif" font-size="30" font-weight="800">${esc(chip)}</text>
    <text fill="${colors.bone}" font-family="Georgia, serif" font-size="70" font-weight="900">${tspans(headlineLines,54,250,82)}</text>
    <rect x="54" y="${270+headlineLines.length*82}" width="115" height="8" fill="${colors.copper}"/>
    <text fill="${colors.muted}" font-family="Arial, sans-serif" font-size="28">${tspans(subLines,54,360+headlineLines.length*82,40)}</text>
    ${dataBlock}
    <text x="54" y="1080" fill="${colors.muted}" font-family="Arial, sans-serif" font-size="20">FUENTE: ${esc(production.source_name)}</text>
    <text x="54" y="1114" fill="${colors.muted}" font-family="Arial, sans-serif" font-size="18">${esc(production.verified ? "VERIFICADA" : "REQUIERE REVISIÓN EDITORIAL")}</text>
  </svg>`);
  const footer = await sharp(footerPath).resize({ width: W }).png().toBuffer();
  const footerMeta = await sharp(footer).metadata();
  const footerH = footerMeta.height;
  const mainH = H - footerH;
  const main = await sharp(svg).resize(W, mainH, { fit:"fill" }).png().toBuffer();
  const out = path.join(OUT, `${story.id}.png`);
  await sharp({ create:{ width:W, height:H, channels:4, background:colors.green }})
    .composite([{input:main,top:0,left:0},{input:footer,top:H-footerH,left:0}])
    .png().toFile(out);
  return out;
}
