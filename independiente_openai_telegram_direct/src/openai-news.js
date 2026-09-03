import OpenAI from "openai";
import crypto from "node:crypto";
import { BRAND_BOOK_PROMPT, recommendedFormat, normalizeProduction } from "./brand-book.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_MODEL || "gpt-5.6-sol";

const sectionEnum = ["LOCAL/HIDALGO", "SEGURIDAD", "POLÍTICA HIDALGO", "POLÍTICA NACIONAL", "DEPORTES", "SERVICIO PÚBLICO", "ECONOMÍA", "SOCIEDAD"];
const visualTypeEnum = ["foto dominante", "retrato/personaje", "servicio público", "dato destacado", "comparativo", "política", "movilidad", "clima", "seguridad", "deportes"];

const storySchema = {
  type: "object",
  properties: {
    stories: {
      type: "array",
      minItems: 5,
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          section: { type: "string", enum: sectionEnum },
          priority: { type: "string", enum: ["ALTA", "RELEVANTE", "NORMAL"] },
          headline: { type: "string" },
          summary: { type: "string" },
          key_points: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
          facebook_copy: { type: "string" },
          requires_graphic: { type: "boolean" },
          graphic_reason: { type: "string" },
          format: { type: "string", enum: ["A", "B", "C"] },
          visual_type: { type: "string", enum: visualTypeEnum },
          visual_prompt: { type: "string" },
          source_name: { type: "string" },
          source_url: { type: "string" },
          published_at: { type: "string" },
          verified: { type: "boolean" },
          verification_note: { type: "string" }
        },
        required: ["section","priority","headline","summary","key_points","facebook_copy","requires_graphic","graphic_reason","format","visual_type","visual_prompt","source_name","source_url","published_at","verified","verification_note"],
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
    support_text: { type: "string" },
    facebook_copy: { type: "string" },
    hashtags: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
    key_stat: { type: "string" },
    key_stat_label: { type: "string" },
    format: { type: "string", enum: ["A","B","C"] },
    visual_type: { type: "string", enum: visualTypeEnum },
    visual_prompt: { type: "string" },
    verified: { type: "boolean" },
    verification_note: { type: "string" },
    source_name: { type: "string" },
    source_url: { type: "string" }
  },
  required: ["headline","subheadline","support_text","facebook_copy","hashtags","key_stat","key_stat_label","format","visual_type","visual_prompt","verified","verification_note","source_name","source_url"],
  additionalProperties: false
};

function editionGuidance(edition) {
  if (edition === "08:00") return "Edición de las 8:00. Prioriza hechos ocurridos desde la tarde/noche anterior y primeras horas de hoy, además de agenda útil para la mañana.";
  if (edition === "12:00") return "Edición de las 12:00 del mediodía. Prioriza novedades y actualizaciones surgidas desde la mesa de las 8:00. No repitas una nota salvo que exista un desarrollo material nuevo.";
  if (edition === "17:00") return "Edición de las 17:00. Prioriza novedades surgidas desde el mediodía, cierres de jornada, movilidad, clima, seguridad y temas que serán relevantes durante la tarde/noche.";
  return "Edición manual. Prioriza lo más reciente y relevante disponible en este momento.";
}

export async function buildMesa({ edition = "MANUAL", previousHeadlines = [] } = {}) {
  const today = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", dateStyle: "full", timeStyle: "short" }).format(new Date());
  const previous = previousHeadlines.length ? `\nTitulares ya enviados recientemente; evita repetirlos salvo desarrollo sustancial:\n- ${previousHeadlines.slice(-20).join("\n- ")}` : "";

  const response = await client.responses.create({
    model,
    tools: [{
      type: "web_search_preview",
      search_context_size: "medium",
      user_location: { type: "approximate", country: "MX", city: "Pachuca", region: "Hidalgo", timezone: "America/Mexico_City" }
    }],
    instructions: `Eres la Mesa de Redacción de EL INDEPENDIENTE DE HIDALGO DIGITAL. Fecha/hora local: ${today}. ${editionGuidance(edition)}

OBJETIVO: entregar de 5 a 8 temas actuales, accionables para una redacción digital. Debe existir al menos una historia de cada bloque base: LOCAL/HIDALGO, SEGURIDAD, POLÍTICA HIDALGO, POLÍTICA NACIONAL y DEPORTES. Puedes añadir hasta 3 extras de SERVICIO PÚBLICO, ECONOMÍA o SOCIEDAD si tienen valor periodístico alto.

CRITERIOS: prioriza Hidalgo, Pachuca, Mineral de la Reforma, Tulancingo, Tula, Ixmiquilpan, Huejutla y la zona metropolitana. Da peso alto a servicio público, protección civil, movilidad/tráfico, clima, educación, salud y seguridad. No presentes información vieja como actual. No inventes datos ni declaraciones. Si un dato es preliminar, dilo. Contrasta hechos sensibles. Evita sensacionalismo.

COPY FACEBOOK: cada historia debe incluir un copy sugerido publicable, de 2 a 4 párrafos breves, útil y profesional, sin emojis excesivos, con una pregunta o recomendación natural cuando aplique. No agregues hashtags dentro de facebook_copy.

DECISIÓN GRÁFICA: requires_graphic=true cuando sea prioridad ALTA, tenga impacto ciudadano, fuerte potencial visual o sea servicio público, seguridad, clima, educación, tráfico, política o la principal noticia del momento. false cuando sea secundaria, repetitiva o de bajo valor visual.

FORMATOS DEL BRAND BOOK: A = titular/personaje/política; B = fotografía dominante para local, servicio público, clima, seguridad, movilidad; C = dato/cifra/resultado/estadística. visual_prompt debe describir una sola composición clara. En formato B está prohibido collage/mosaico. El footer, logo e isotipo NO deben ser generados por la IA: el renderer los añade como assets maestros exactos.

${BRAND_BOOK_PROMPT}

IMPORTANTE SOBRE IMÁGENES: no inventes que una imagen generada es fotografía real del acontecimiento. Si no se dispone de fotografía de fuente autorizada, el visual debe ser una ilustración editorial de apoyo, sin texto ni logotipos incrustados.
${previous}

Devuelve únicamente el JSON estructurado.`,
    input: `Genera la mesa de redacción para la edición ${edition}.`,
    text: { format: { type: "json_schema", name: "MesaRedaccion", strict: true, schema: storySchema } }
  });

  const parsed = JSON.parse(response.output_text);
  return parsed.stories.map((s, i) => ({
    ...s,
    format: recommendedFormat(s.section, s.visual_type),
    id: crypto.randomUUID().slice(0, 8),
    number: i + 1,
    edition,
    created_at: new Date().toISOString()
  }));
}

export async function produceStory(story, angle = "normal") {
  const response = await client.responses.create({
    model,
    tools: [{
      type: "web_search_preview",
      search_context_size: "medium",
      user_location: { type: "approximate", country: "MX", city: "Pachuca", region: "Hidalgo", timezone: "America/Mexico_City" }
    }],
    instructions: `Eres editor y director de arte de EL INDEPENDIENTE DE HIDALGO DIGITAL. Re-verifica la noticia en web antes de producirla. Tono: directo, profesional, ciudadano, sin clickbait engañoso. No inventes declaraciones, cifras ni hechos. Si hay discrepancias o no puedes confirmar lo esencial, verified=false.

${BRAND_BOOK_PROMPT}

APLICACIÓN OPERATIVA:
- A: personaje/política/declaración. B: una sola fotografía/escena dominante para local, servicio público, clima, seguridad, movilidad. C: dato/cifra/resultado dominante.
- El titular visual debe ser claro y máximo 12 palabras.
- subheadline máximo 2 líneas; support_text muy breve.
- key_stat solo si existe una cifra fuerte y verificada; de lo contrario cadena vacía.
- visual_prompt debe describir únicamente el COMPONENTE VISUAL DE FONDO, SIN TEXTO, SIN LOGOS, SIN FOOTER, SIN MARCAS, SIN FECHA.

COPY FACEBOOK: 2 a 4 párrafos breves, claro y publicable; cierra con pregunta o recomendación natural cuando aplique; hashtags aparte (3-5).`,
    input: `Historia candidata: ${JSON.stringify(story)}\nEnfoque solicitado: ${angle}. Produce la versión final lista para pieza gráfica y Facebook.`,
    text: { format: { type: "json_schema", name: "ProduccionEditorial", strict: true, schema: productionSchema } }
  });
  const parsed = JSON.parse(response.output_text);
  parsed.format = parsed.format || recommendedFormat(story.section, parsed.visual_type);
  return normalizeProduction(story, parsed);
}
