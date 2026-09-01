import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";

const W = 1080, H = 1350;
const footerPath = path.resolve("assets/footer_master.png");
const logoPath = path.resolve("assets/isotipo_i.png");
const OUT = path.resolve("output");

const colors = {
  green: "#0E2A28",
  green2: "#173C3A",
  green3: "#0A211F",
  copper: "#C66A3D",
  bone: "#FAF8F3",
  muted: "#D9D2C5",
  carbon: "#252422",
};

const SANS = "DejaVu Sans, sans-serif";
const SERIF = "DejaVu Serif, serif";

function esc(s="") {
  return String(s).replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
}

function wrap(text, max=28) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  const lines=[]; let line="";
  for (const word of words) {
    const t=(line+" "+word).trim();
    if (t.length<=max) line=t;
    else { if(line) lines.push(line); line=word; }
  }
  if(line) lines.push(line);
  return lines;
}

function tspans(lines, x, y, dy) {
  return lines.map((l,i)=>`<tspan x="${x}" y="${y+i*dy}">${esc(l)}</tspan>`).join("");
}

function sectionAccent(section="") {
  if (section.includes("SEGURIDAD")) return "#B7443A";
  if (section.includes("DEPORTES")) return "#3B7C54";
  if (section.includes("POLÍTICA")) return colors.copper;
  return colors.copper;
}

export async function renderStory(story, production) {
  fs.mkdirSync(OUT,{recursive:true});

  if (!fs.existsSync(footerPath)) throw new Error(`No se encontró footer maestro: ${footerPath}`);
  if (!fs.existsSync(logoPath)) throw new Error(`No se encontró isotipo maestro: ${logoPath}`);

  const section = String(story.section || "LOCAL/HIDALGO");
  const accent = sectionAccent(section);
  const headlineLines = wrap(String(production.headline || story.headline).toUpperCase(), 22).slice(0,4);
  const subLines = wrap(production.subheadline || story.summary || "", 48).slice(0,4);
  const chip = section.replaceAll("/", " · ");
  const headlineY = 270;
  const headlineDy = 86;
  const dividerY = headlineY + Math.max(1, headlineLines.length) * headlineDy + 18;
  const subY = dividerY + 74;

  const footer = await sharp(footerPath).resize({ width: W }).png().toBuffer();
  const footerMeta = await sharp(footer).metadata();
  const footerH = footerMeta.height || 162;
  const mainH = H - footerH;

  const logo = await sharp(logoPath)
    .resize({ width: 118, height: 118, fit: "contain" })
    .png()
    .toBuffer();

  const keyStat = String(production.key_stat || "").trim();
  const keyLabel = String(production.key_stat_label || "").trim();
  const dataBlock = keyStat ? `
    <rect x="650" y="735" width="350" height="250" rx="28" fill="${colors.green3}" stroke="${accent}" stroke-width="3"/>
    <text x="825" y="845" text-anchor="middle" fill="${accent}" font-family="${SANS}" font-weight="800" font-size="76">${esc(keyStat)}</text>
    <text x="825" y="910" text-anchor="middle" fill="${colors.bone}" font-family="${SANS}" font-weight="700" font-size="25">${esc(keyLabel)}</text>
    <path d="M745 945 C 790 930, 835 930, 895 945" stroke="${accent}" stroke-width="5" fill="none" stroke-linecap="round"/>` : "";

  const svg = Buffer.from(`
  <svg width="${W}" height="${mainH}" viewBox="0 0 ${W} ${mainH}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${colors.green}"/>
        <stop offset="1" stop-color="#071B1A"/>
      </linearGradient>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
        <feComponentTransfer><feFuncA type="table" tableValues="0 0.035"/></feComponentTransfer>
      </filter>
    </defs>

    <rect width="1080" height="${mainH}" fill="url(#g)"/>
    <rect width="1080" height="${mainH}" filter="url(#grain)" opacity="0.45"/>

    <g opacity="0.22" stroke="${colors.copper}" fill="none" stroke-width="1.3">
      ${Array.from({length:15},(_,i)=>`<path d="M -60 ${95+i*70} C 220 ${38+i*70}, 435 ${152+i*58}, 1130 ${70+i*70}"/>`).join("")}
    </g>

    <rect x="54" y="54" rx="12" width="430" height="70" fill="${colors.green2}" stroke="${accent}" stroke-width="2"/>
    <rect x="54" y="54" rx="12" width="12" height="70" fill="${accent}"/>
    <text x="88" y="101" fill="${colors.bone}" font-family="${SANS}" font-size="29" font-weight="800">${esc(chip)}</text>

    <text fill="${colors.bone}" font-family="${SERIF}" font-size="69" font-weight="900">${tspans(headlineLines,54,headlineY,headlineDy)}</text>
    <rect x="54" y="${dividerY}" width="118" height="8" fill="${accent}"/>

    <text fill="${colors.muted}" font-family="${SANS}" font-size="28">${tspans(subLines,54,subY,41)}</text>

    ${dataBlock}

    <text x="54" y="${mainH-86}" fill="${colors.muted}" font-family="${SANS}" font-size="19">FUENTE: ${esc(production.source_name || story.source_name || "")}</text>
    <text x="54" y="${mainH-52}" fill="${production.verified ? colors.muted : accent}" font-family="${SANS}" font-size="17" font-weight="700">${esc(production.verified ? "INFORMACIÓN VERIFICADA" : "REQUIERE REVISIÓN EDITORIAL")}</text>
  </svg>`);

  const main = await sharp(svg).png().toBuffer();
  const out = path.join(OUT, `${story.id}.png`);

  await sharp({ create:{ width:W, height:H, channels:4, background:colors.green }})
    .composite([
      { input:main, top:0, left:0 },
      { input:logo, top:48, left:W-48-118 },
      { input:footer, top:H-footerH, left:0 },
    ])
    .png()
    .toFile(out);

  return out;
}
