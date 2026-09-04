import fs from "node:fs";
import path from "node:path";

const FOLDER_MIME = "application/vnd.google-apps.folder";
let tokenCache = { token: null, expiresAt: 0 };

function env(name) { return String(process.env[name] || "").trim(); }

export function driveConfigured() {
  return Boolean(
    env("GOOGLE_DRIVE_FOLDER_ID") &&
    env("GOOGLE_DRIVE_CLIENT_ID") &&
    env("GOOGLE_DRIVE_CLIENT_SECRET") &&
    env("GOOGLE_DRIVE_REFRESH_TOKEN")
  );
}

async function accessToken() {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt - 60_000) return tokenCache.token;
  if (!driveConfigured()) throw new Error("Google Drive no está configurado. Faltan variables GOOGLE_DRIVE_* en Railway.");

  const body = new URLSearchParams({
    client_id: env("GOOGLE_DRIVE_CLIENT_ID"),
    client_secret: env("GOOGLE_DRIVE_CLIENT_SECRET"),
    refresh_token: env("GOOGLE_DRIVE_REFRESH_TOKEN"),
    grant_type: "refresh_token",
  });
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(20_000),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.access_token) throw new Error(`Google OAuth: ${data.error_description || data.error || `HTTP ${r.status}`}`);
  tokenCache = { token: data.access_token, expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000 };
  return tokenCache.token;
}

async function driveFetch(url, options = {}) {
  const token = await accessToken();
  const headers = new Headers(options.headers || {});
  headers.set("authorization", `Bearer ${token}`);
  const r = await fetch(url, { ...options, headers, signal: options.signal || AbortSignal.timeout(30_000) });
  const text = await r.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!r.ok) throw new Error(`Google Drive HTTP ${r.status}: ${data?.error?.message || data?.error_description || text.slice(0,300)}`);
  return data;
}

function qEscape(s) { return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'"); }
function safeName(value, fallback="publicacion") {
  return String(value || fallback).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 _.-]+/g, "").trim().replace(/\s+/g, "_").slice(0, 90) || fallback;
}
function mexicoParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.MESA_TIMEZONE || "America/Mexico_City",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  });
  return Object.fromEntries(fmt.formatToParts(date).filter(x => x.type !== "literal").map(x => [x.type, x.value]));
}

async function findChildFolder(parentId, name) {
  const params = new URLSearchParams({
    q: `'${qEscape(parentId)}' in parents and mimeType='${FOLDER_MIME}' and name='${qEscape(name)}' and trashed=false`,
    fields: "files(id,name)",
    pageSize: "10",
    spaces: "drive",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  const data = await driveFetch(`https://www.googleapis.com/drive/v3/files?${params}`);
  return data.files?.[0]?.id || null;
}

async function ensureFolder(parentId, name) {
  const existing = await findChildFolder(parentId, name);
  if (existing) return existing;
  const params = new URLSearchParams({ fields: "id,name,webViewLink", supportsAllDrives: "true" });
  const data = await driveFetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
  });
  return data.id;
}

async function uploadBytes(parentId, name, mimeType, bytes) {
  const boundary = `independiente_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const metadata = Buffer.from(JSON.stringify({ name, parents: [parentId] }), "utf8");
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`), metadata,
    Buffer.from(`\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`), Buffer.from(bytes),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const params = new URLSearchParams({ uploadType: "multipart", fields: "id,name,webViewLink", supportsAllDrives: "true" });
  return driveFetch(`https://www.googleapis.com/upload/drive/v3/files?${params}`, {
    method: "POST",
    headers: { "content-type": `multipart/related; boundary=${boundary}` },
    body,
    signal: AbortSignal.timeout(60_000),
  });
}

function copyBundle(story, production, approvedAt) {
  const hashtags = Array.isArray(production.hashtags) ? production.hashtags.join(" ") : "";
  return `EL INDEPENDIENTE DE HIDALGO DIGITAL\nPUBLICACIÓN APROBADA PARA REDES\n\nTITULAR\n${production.headline || story.headline || ""}\n\nCATEGORÍA\n${story.section || ""}\n\nCOPY FACEBOOK / INSTAGRAM\n${production.facebook_copy || story.facebook_copy || ""}\n\nHASHTAGS\n${hashtags}\n\nFUENTE\n${production.source_name || story.source_name || ""}\n${production.source_url || story.source_url || ""}\n\nFORMATO GRÁFICO\n${production.format || story.format || ""}\n\nAPROBADA\n${approvedAt}\n`;
}

export async function uploadApprovedPublication({ story, production, imagePath }) {
  if (!driveConfigured()) throw new Error("Google Drive no está configurado todavía en Railway.");
  if (!imagePath || !fs.existsSync(imagePath)) throw new Error("No se encontró el arte final para subir a Drive.");

  const parts = mexicoParts();
  let parent = env("GOOGLE_DRIVE_FOLDER_ID");
  parent = await ensureFolder(parent, parts.year);
  parent = await ensureFolder(parent, parts.month);
  parent = await ensureFolder(parent, parts.day);
  parent = await ensureFolder(parent, safeName(story.section || "GENERAL"));
  const folderName = `${parts.hour}${parts.minute}_${safeName(production.headline || story.headline)}`;
  const publicationFolder = await ensureFolder(parent, folderName);

  const approvedAt = new Date().toISOString();
  const art = await uploadBytes(publicationFolder, "arte.png", "image/png", fs.readFileSync(path.resolve(imagePath)));
  const copy = await uploadBytes(publicationFolder, "copy_redes.txt", "text/plain; charset=UTF-8", Buffer.from(copyBundle(story, production, approvedAt), "utf8"));
  const metadata = {
    status: "approved_for_publication", approved_at: approvedAt, story_id: story.id,
    category: story.section, headline: production.headline || story.headline,
    format: production.format || story.format, source_name: production.source_name || story.source_name,
    source_url: production.source_url || story.source_url, hashtags: production.hashtags || [],
    facebook_copy: production.facebook_copy || story.facebook_copy || "",
    photo_source_url: story.photo_source_url || null,
    photo_image_url: story.photo_image_url || null,
    photo_source_via: story.photo_source_via || null,
  };
  const meta = await uploadBytes(publicationFolder, "metadata.json", "application/json; charset=UTF-8", Buffer.from(JSON.stringify(metadata, null, 2), "utf8"));

  return {
    folder_id: publicationFolder,
    folder_url: `https://drive.google.com/drive/folders/${publicationFolder}`,
    art_id: art.id, copy_id: copy.id, metadata_id: meta.id, approved_at: approvedAt,
  };
}
