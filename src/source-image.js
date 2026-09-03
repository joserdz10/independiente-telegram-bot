import fs from "node:fs";
import path from "node:path";
import net from "node:net";

const OUT = path.resolve("output/source-images");
const HTML_TIMEOUT_MS = Number(process.env.SOURCE_IMAGE_HTML_TIMEOUT_MS || 12000);
const IMAGE_TIMEOUT_MS = Number(process.env.SOURCE_IMAGE_DOWNLOAD_TIMEOUT_MS || 18000);
const MAX_IMAGE_BYTES = Number(process.env.SOURCE_IMAGE_MAX_BYTES || 12000000);

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
    .replace(/&gt;/gi,">");
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"));
  return m ? decodeHtml(m[1]) : "";
}

function extractImageCandidates(html, pageUrl) {
  const tags = String(html || "").match(/<meta\b[^>]*>/gi) || [];
  const found = [];
  const wanted = new Set(["og:image", "og:image:secure_url", "twitter:image", "twitter:image:src"]);
  for (const tag of tags) {
    const key = (attr(tag,"property") || attr(tag,"name")).toLowerCase();
    const content = attr(tag,"content");
    if (!wanted.has(key) || !content) continue;
    try {
      const abs = new URL(content, pageUrl).toString();
      if (!found.includes(abs)) found.push(abs);
    } catch {}
  }
  return found;
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

async function downloadImage(imageUrl, storyId) {
  const safe = safeHttpUrl(imageUrl);
  if (!safe) return null;
  const res = await fetchWithTimeout(safe, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; ElIndependienteHidalgoBot/1.0)",
      "accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
    }
  }, IMAGE_TIMEOUT_MS);
  if (!res.ok) return null;
  const type = String(res.headers.get("content-type") || "");
  if (!type.toLowerCase().startsWith("image/")) return null;
  const declared = Number(res.headers.get("content-length") || 0);
  if (declared && declared > MAX_IMAGE_BYTES) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length || buf.length > MAX_IMAGE_BYTES) return null;
  fs.mkdirSync(OUT,{recursive:true});
  const out = path.join(OUT, `${storyId}${extFromType(type)}`);
  fs.writeFileSync(out,buf);
  return out;
}

export async function fetchRealSourceImage(story, production) {
  const pageCandidates = [production?.source_url, story?.source_url].filter(Boolean);
  for (const raw of pageCandidates) {
    const page = safeHttpUrl(raw);
    if (!page) continue;
    try {
      const res = await fetchWithTimeout(page, {
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; ElIndependienteHidalgoBot/1.0)",
          "accept": "text/html,application/xhtml+xml"
        }
      }, HTML_TIMEOUT_MS);
      if (!res.ok) continue;
      const type = String(res.headers.get("content-type") || "").toLowerCase();
      if (!type.includes("text/html") && !type.includes("application/xhtml+xml")) continue;
      const html = await res.text();
      const images = extractImageCandidates(html,page);
      for (const candidate of images) {
        const downloaded = await downloadImage(candidate, story?.id || "source");
        if (downloaded) {
          console.log(`Foto real obtenida desde fuente: ${candidate}`);
          return downloaded;
        }
      }
    } catch (err) {
      console.warn(`No se pudo recuperar foto real desde ${page}: ${err.message}`);
    }
  }
  return null;
}
