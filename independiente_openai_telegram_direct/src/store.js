import fs from "node:fs";
import path from "node:path";

const file = path.resolve("data/stories.json");
function load() {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return {}; }
}
function save(db) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(db, null, 2));
}
export function putStory(story) {
  const db = load();
  db[story.id] = story;
  save(db);
}
export function getStory(id) { return load()[id] || null; }
export function patchStory(id, patch) {
  const db = load();
  if (!db[id]) return null;
  db[id] = { ...db[id], ...patch };
  save(db);
  return db[id];
}
