import OpenAI from "openai";
import crypto from "node:crypto";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_MODEL || "gpt-5.5";

const storySchema = {
  type: "object",
  properties: {
    stories: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          section: { type: "string", enum: ["LOCAL/HIDALGO", "SEGURIDAD", "POLÍTICA HIDALGO", "POLÍTICA NACIONAL", "DEPORTES"] },
          headline: { type: "string" },
          summary: { type: "string" },
          why_it_matters: { type: "string" },
          priority: { type: "string", enum: ["ALTA", "RELEVANTE", "NORMAL"] },
          format: { type: "string", enum: ["A", "B", "C"] },
          source_name: { type: "string" },
          source_url: { type: "string" },
          published_at: { type: "string" },
          verified: { type: "boolean" },
          verification_note: { type: "string" }
        },
        required: ["section","headline","summary","why_it_matters","priority","format","source_name","source_url","published_at","verified","verification_note"],
        additionalProperties: false
      }
    }
  },
  required: ["stories"],
  additionalProperties: false
};

const productionSchema = {
  type: "object",
  properties: {
    headline: { type: "string" },
    subheadline: { type: "string" },
    facebook_copy: { type: "string" },
    hashtags: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
    key_stat: { type: "string" },
    key_stat_label: { type: "string" },
    format: { type: "string", enum: ["A","B","C"] },
    verified: { type: "boolean" },
    verification_note: { type: "string" },
    source_name: { type: "string" },
    source_url: { type: "string" }
  },
  required: ["headline","subheadline","facebook_copy","hashtags","key_stat","key_stat_label","format","verified","verification_note","source_name","source_url"],
  additionalProperties: false
};

export async function buildMesa() {
  const today = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", dateStyle: "full" }).format(new Date());
  const response = await client.responses.create({
    model,
    tools: [{
      type: "web_search_preview",
      search_context_size: "medium",
      user_location: { type: "approximate", country: "MX", city: "Pachuca", region: "Hidalgo", timezone: "America/Mexico_City" }
    }],
    instructions: `Eres la Mesa de Redacción de El Independiente de Hidalgo Digital. Hoy es ${today}. Busca información ACTUAL y prioriza hechos publicados hoy o, si no existe algo suficientemente relevante en una sección, de las últimas 24 horas. No reutilices resultados deportivos viejos ni presentes información antigua como actual. Selecciona exactamente una historia para cada sección pedida. Contrasta hechos sensibles y no inventes datos. LOCAL/HIDALGO debe tener utilidad directa para habitantes de Hidalgo. SEGURIDAD debe evitar sensacionalismo. En DEPORTES prioriza actualidad del día; puede ser nacional/internacional si es de alto impacto. Formato A = titular dominante, B = fotografía dominante, C = dato/resultado dominante. Devuelve solo el JSON estructurado.`,
    input: "Genera la mesa de redacción de hoy con exactamente cinco historias: LOCAL/HIDALGO, SEGURIDAD, POLÍTICA HIDALGO, POLÍTICA NACIONAL y DEPORTES.",
    text: { format: { type: "json_schema", name: "MesaRedaccion", strict: true, schema: storySchema } }
  });
  const parsed = JSON.parse(response.output_text);
  return parsed.stories.map(s => ({ ...s, id: crypto.randomUUID().slice(0, 8) }));
}

export async function produceStory(story, angle = "normal") {
  const response = await client.responses.create({
    model,
    tools: [{
      type: "web_search_preview",
      search_context_size: "medium",
      user_location: { type: "approximate", country: "MX", city: "Pachuca", region: "Hidalgo", timezone: "America/Mexico_City" }
    }],
    instructions: `Eres editor de El Independiente de Hidalgo Digital. Re-verifica la noticia en web antes de producirla. Tono: directo, profesional, ciudadano, sin clickbait engañoso. La identidad visual es Territorio Independiente. No inventes fotografías ni declaraciones. Si hay discrepancias, marca verified=false. Para Facebook escribe 2 a 4 párrafos breves, cierra con una pregunta natural y usa máximo 5 hashtags. En el titular visual usa claridad y máximo 12 palabras cuando sea posible. En key_stat usa un dato corto solo si realmente existe; de lo contrario devuelve cadena vacía.`,
    input: `Historia candidata: ${JSON.stringify(story)}\nEnfoque solicitado: ${angle}. Produce la versión lista para publicación.`,
    text: { format: { type: "json_schema", name: "ProduccionEditorial", strict: true, schema: productionSchema } }
  });
  return JSON.parse(response.output_text);
}
