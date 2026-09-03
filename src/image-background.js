import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";
import { strictBackgroundPrompt } from "./brand-book.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const imageModel = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
const OUT = path.resolve("output/backgrounds");

export async function generateVisualBackground(story, production) {
  if (String(process.env.ENABLE_AI_VISUALS || "true").toLowerCase() === "false") return null;
  fs.mkdirSync(OUT, { recursive: true });

  const prompt = strictBackgroundPrompt(story, production);

  try {
    const result = await client.images.generate({
      model: imageModel,
      prompt,
      size: "1024x1536",
      quality: process.env.OPENAI_IMAGE_QUALITY || "medium"
    });
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) return null;
    const out = path.join(OUT, `${story.id}.png`);
    fs.writeFileSync(out, Buffer.from(b64, "base64"));
    return out;
  } catch (err) {
    console.error("No se pudo generar fondo visual, se usará layout gráfico:", err.message);
    return null;
  }
}
