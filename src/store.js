import fs from "node:fs";
import path from "node:path";

const storyFile = path.resolve("data/stories.json");
const mesaFile = path.resolve("data/mesas.json");
const configFile = path.resolve("data/editorial.json");

function load(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return {}; }
}
function save(file, db) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(db, null, 2));
}

export function putStory(story) {
  const db = load(storyFile);
  db[story.id] = story;
  save(storyFile, db);
}
export function getStory(id) { return load(storyFile)[id] || null; }
export function patchStory(id, patch) {
  const db = load(storyFile);
  if (!db[id]) return null;
  db[id] = { ...db[id], ...patch };
  save(storyFile, db);
  return db[id];
}
export function recentHeadlines(limit = 20) {
  return Object.values(load(storyFile))
    .sort((a,b) => String(a.created_at || "").localeCompare(String(b.created_at || "")))
    .slice(-limit)
    .map(s => s.headline)
    .filter(Boolean);
}
export function saveMesa(chatId, stories, edition) {
  const db = load(mesaFile);
  db[String(chatId)] = { edition, created_at: new Date().toISOString(), story_ids: stories.map(s => s.id) };
  save(mesaFile, db);
}
export function getLatestMesa(chatId) {
  const m = load(mesaFile)[String(chatId)];
  if (!m) return null;
  return { ...m, stories: m.story_ids.map(getStory).filter(Boolean) };
}

export function getEditorialConfig() {
  return load(configFile);
}

export function saveEditorialConfig(patch) {
  const current = load(configFile);
  const next = { ...current, ...patch, updated_at: new Date().toISOString() };
  save(configFile, next);
  return next;
}
