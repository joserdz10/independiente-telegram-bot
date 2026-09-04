import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import OpenAI from "openai";
import sharp from "sharp";

const OUT = path.resolve("output/source-images");
const HTML_TIMEOUT_MS = Number(process.env.SOURCE_IMAGE_HTML_TIMEOUT_MS || 12000);
const IMAGE_TIMEOUT_MS = Number(process.env.SOURCE_IMAGE_DOWNLOAD_TIMEOUT_MS || 18000);
const MAX_IMAGE_BYTES = Number(process.env.SOURCE_IMAGE_MAX_BYTES || 12000000);
const MIN_IMAGE_WIDTH = Number(process.env.SOURCE_IMAGE_MIN_WIDTH || 760);
const MIN_IMAGE_HEIGHT = Number(process.env.SOURCE_IMAGE_MIN_HEIGHT || 420);
const MAX_DISCOVERY_PAGES = Number(process.env.REAL_PHOTO_DISCOVERY_PAGES || 8);
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_MODEL || "gpt-5-mini";

function isPrivateIpv4(host) {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a,b] = parts;
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function safeHttpUrl(raw) {
  try {
    const u = new URL(String(raw || "").trim());
    if (!["http:", "https:"].includes(u.protocol)) return null;
    const h = u.hostname.toLowerCase();
    if (!h || h === "localhost" || h.endsWith(".local") || h === "::1" || isPrivateIpv4(h)) return null;
    if (net.isIP(h) === 6 && (h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80"))) return null;
    return u;
  } catch {
    return null;
  }
}

function decodeHtml(s="") {
  return String(s)
    .replace(/&amp;/gi,"&")
    .replace(/&quot;/gi,'"')
    .replace(/&#39;/gi,"'")
    .replace(/&lt;/gi,"<")
    .replace(/&gt;/gi,">")
    .replace(/&#x2F;/gi,"/");
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"));
  return m ? decodeHtml(m[1]) : "";
}

function candidateOk(raw) {
  const s = String(raw || "").toLowerCase();
  if (!s || s.startsWith("data:")) return false;
  return !/(favicon|sprite|logo(?:[-_.]|$)|icon(?:[-_.]|$)|avatar|placeholder|blank\.|tracking|pixel\.|1x1|emoji|ads?[-_.])/i.test(s);
}

function absUrl(raw, pageUrl) {
  try {
    const value = decodeHtml(String(raw || "").trim());
    if (!candidateOk(value)) return null;
    const u = new URL(value, pageUrl).toString();
    return safeHttpUrl(u)?.toString() || null;
  } catch {
    return null;
  }
}

function largestFromSrcset(srcset="") {
  const items = String(srcset).split(",").map(x => x.trim()).filter(Boolean);
  if (!items.length) return "";
  return items[items.length - 1].split(/\s+/)[0] || "";
}

function extractImageCandidates(html, pageUrl) {
  const found = [];
  const push = raw => {
    const abs = absUrl(raw, pageUrl);
    if (abs && !found.includes(abs)) found.push(abs);
  };

  const metaTags = String(html || "").match(/<meta\b[^>]*>/gi) || [];
  const wanted = new Set(["og:image", "og:image:secure_url", "twitter:image", "twitter:image:src"]);
  for (const tag of metaTags) {
    const key = (attr(tag,"property") || attr(tag,"name")).toLowerCase();
    if (wanted.has(key)) push(attr(tag,"content"));
  }

  const links = String(html || "").match(/<link\b[^>]*>/gi) || [];
  for (const tag of links) {
    const rel = attr(tag,"rel").toLowerCase();
    if (rel.includes("image_src") || rel === "preload" && attr(tag,"as").toLowerCase() === "image") push(attr(tag,"href"));
  }

  // Como respaldo, toma imágenes reales embebidas en la nota. Meta/OG conserva prioridad.
  const imgs = String(html || "").match(/<img\b[^>]*>/gi) || [];
  for (const tag of imgs.slice(0, 80)) {
    const srcset = attr(tag,"srcset") || attr(tag,"data-srcset");
    if (srcset) push(largestFromSrcset(srcset));
    push(attr(tag,"src") || attr(tag,"data-src") || attr(tag,"data-lazy-src") || attr(tag,"data-original"));
  }
  return found.slice(0, 30);
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal, redirect: "follow" });
  } finally {
    clearTimeout(timer);
  }
}

function extFromType(type="") {
  const t = type.toLowerCase();
  if (t.includes("jpeg") || t.includes("jpg")) return ".jpg";
  if (t.includes("png")) return ".png";
  if (t.includes("webp")) return ".webp";
  if (t.includes("gif")) return ".gif";
  return ".img";
}

async function validateImageBuffer(buf) {
  try {
    const meta = await sharp(buf, { animated: false }).metadata();
    const width = Number(meta.width || 0), height = Number(meta.height || 0);
    if (width < MIN_IMAGE_WIDTH || height < MIN_IMAGE_HEIGHT) return null;
    const ratio = width / Math.max(1, height);
    if (ratio < 0.42 || ratio > 2.8) return null;
    return { width, height, format: meta.format || "" };
  } catch {
    return null;
  }
}

async function downloadImage(imageUrl, storyId, referer="", suffix="real") {
  const safe = safeHttpUrl(imageUrl);
  if (!safe) return null;
  const res = await fetchWithTimeout(safe, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; ElIndependienteHidalgoBot/1.0)",
      "accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      ...(referer ? { referer } : {})
    }
  }, IMAGE_TIMEOUT_MS);
  if (!res.ok) return null;
  const type = String(res.headers.get("content-type") || "");
  if (!type.toLowerCase().startsWith("image/")) return null;
  const declared = Number(res.headers.get("content-length") || 0);
  if (declared && declared > MAX_IMAGE_BYTES) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length || buf.length > MAX_IMAGE_BYTES) return null;
  const meta = await validateImageBuffer(buf);
  if (!meta) return null;
  fs.mkdirSync(OUT,{recursive:true});
  const out = path.join(OUT, `${storyId}-${suffix}${extFromType(type)}`);
  fs.writeFileSync(out,buf);
  return { path: out, imageUrl: safe.toString(), width: meta.width, height: meta.height };
}

async function imageFromPage(rawPageUrl, storyId, via="source") {
  const page = safeHttpUrl(rawPageUrl);
  if (!page) return null;
  try {
    const res = await fetchWithTimeout(page, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; ElIndependienteHidalgoBot/1.0)",
        "accept": "text/html,application/xhtml+xml"
      }
    }, HTML_TIMEOUT_MS);
    if (!res.ok) return null;
    const type = String(res.headers.get("content-type") || "").toLowerCase();
    if (!type.includes("text/html") && !type.includes("application/xhtml+xml")) return null;
    const html = await res.text();
    const images = extractImageCandidates(html,page);
    let n = 0;
    for (const candidate of images) {
      n += 1;
      try {
        const downloaded = await downloadImage(candidate, storyId, page.toString(), `${via}-${n}`);
        if (downloaded) return { ...downloaded, pageUrl: page.toString(), via };
      } catch {}
    }
  } catch (err) {
    console.warn(`No se pudo recuperar foto desde ${page}: ${err.message}`);
  }
  return null;
}

const discoverySchema = {
  type: "object",
  properties: {
    pages: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          url: { type: "string" },
          source_name: { type: "string" },
          reason: { type: "string" }
        },
        required: ["url","source_name","reason"],
        additionalProperties: false
      }
    }
  },
  required: ["pages"],
  additionalProperties: false
};

async function discoverPhotoPages(story, production) {
  if (!process.env.OPENAI_API_KEY) return [];
  const subject = String(production?.real_photo_subject || story?.headline || "").trim();
  const headline = String(production?.headline || story?.headline || "").trim();
  const source = String(production?.source_name || story?.source_name || "").trim();
  if (!subject) return [];
  try {
    const response = await client.responses.create({
      model,
      tools: [{
        type: "web_search_preview",
        search_context_size: "medium",
        user_location: { type: "approximate", country: "MX", city: "Pachuca", region: "Hidalgo", timezone: "America/Mexico_City" }
      }],
      instructions: `Busca en la web páginas que contengan una FOTOGRAFÍA REAL del sujeto indicado para uso editorial de una nota periodística. No inventes imágenes ni devuelvas URLs de buscadores, páginas de resultados, redes sociales, miniaturas, logos o bancos de imágenes genéricos. Prioriza en este orden: (1) sitio oficial de Presidencia/gobierno/institución/club/equipo involucrado, (2) fuente periodística original de la nota, (3) medios periodísticos reputados. Devuelve hasta ${MAX_DISCOVERY_PAGES} URLs de PÁGINAS concretas que probablemente incluyan una foto real grande y pertinente. Si la foto exacta del evento no aparece, acepta una foto real reciente del mismo sujeto en un contexto oficial relacionado.`,
      input: `Sujeto que debe aparecer: ${subject}\nTitular: ${headline}\nFuente conocida: ${source || "no especificada"}\nBusca páginas con foto real útil para la pieza.`,
      text: { format: { type: "json_schema", name: "PaginasFotoReal", strict: true, schema: discoverySchema } }
    });
    const parsed = JSON.parse(response.output_text || "{}");
    return Array.isArray(parsed.pages) ? parsed.pages.slice(0, MAX_DISCOVERY_PAGES) : [];
  } catch (err) {
    console.warn(`Búsqueda web de foto real falló: ${err.message}`);
    return [];
  }
}

async function searchWikimedia(story, production) {
  const subject = String(production?.real_photo_subject || story?.headline || "").trim();
  if (!subject) return null;
  try {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.searchParams.set("action","query");
    url.searchParams.set("generator","search");
    url.searchParams.set("gsrsearch",subject);
    url.searchParams.set("gsrnamespace","6");
    url.searchParams.set("gsrlimit","10");
    url.searchParams.set("prop","imageinfo");
    url.searchParams.set("iiprop","url|mime|size|extmetadata");
    url.searchParams.set("format","json");
    url.searchParams.set("origin","*");
    const res = await fetchWithTimeout(url, { headers: { "user-agent":"ElIndependienteHidalgoBot/1.0" } }, HTML_TIMEOUT_MS);
    if (!res.ok) return null;
    const json = await res.json();
    const pages = Object.values(json?.query?.pages || {});
    for (const page of pages) {
      const info = page?.imageinfo?.[0];
      if (!info?.url || Number(info.width||0) < MIN_IMAGE_WIDTH || Number(info.height||0) < MIN_IMAGE_HEIGHT) continue;
      const downloaded = await downloadImage(info.url, story?.id || "source", "https://commons.wikimedia.org/", "commons");
      if (downloaded) {
        return {
          ...downloaded,
          pageUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title || "")}`,
          via: "wikimedia",
          credit: decodeHtml(info?.extmetadata?.Artist?.value || "Wikimedia Commons"),
          license: decodeHtml(info?.extmetadata?.LicenseShortName?.value || "")
        };
      }
    }
  } catch (err) {
    console.warn(`Wikimedia no encontró foto usable: ${err.message}`);
  }
  return null;
}

export async function fetchRealSourceImage(story, production) {
  const pageCandidates = [production?.source_url, story?.source_url].filter(Boolean);
  for (const raw of pageCandidates) {
    const found = await imageFromPage(raw, story?.id || "source", "source");
    if (found) {
      console.log(`Foto real obtenida desde fuente: ${found.imageUrl}`);
      return found;
    }
  }

  // Si la nota exige foto real y la fuente no trae una usable, NO detener la producción:
  // hacer búsqueda web automática de páginas oficiales/periodísticas y extraer su foto real.
  if (production?.real_photo_required) {
    console.log(`Buscando foto real en web para: ${production.real_photo_subject || story?.headline}`);
    const pages = await discoverPhotoPages(story, production);
    for (const item of pages) {
      const found = await imageFromPage(item.url, story?.id || "source", "web");
      if (found) {
        console.log(`Foto real encontrada por búsqueda web: ${found.pageUrl}`);
        return { ...found, sourceName: item.source_name || "Fuente web" };
      }
    }

    // Fallback de cero credenciales con fotos reales y licencia visible.
    const commons = await searchWikimedia(story, production);
    if (commons) {
      console.log(`Foto real obtenida de Wikimedia Commons: ${commons.pageUrl}`);
      return commons;
    }
  }
  return null;
}
