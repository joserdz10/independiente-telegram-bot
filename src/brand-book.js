export const BRAND = Object.freeze({
  name: "El Independiente de Hidalgo Digital",
  system: "Territorio Independiente",
  version: "5.3-strict",
  canvas: { width: 1080, height: 1350, ratio: "4:5" },
  colors: {
    mineral: "#173C3A",
    mineralDark: "#0E2A28",
    mineralDeep: "#081F1D",
    copper: "#C66A3D",
    bone: "#FAF8F3",
    sand: "#E9DFCE",
    carbon: "#252422",
    security: "#B7443A",
    sports: "#3B7C54"
  },
  fonts: {
    headline: "Newsreader",
    ui: "Sora",
    body: "Inter"
  },
  layout: {
    margin: 56,
    logoSize: 112,
    chipHeight: 66,
    maxHeadlineWords: 12,
    maxSubheadlineChars: 150,
    maxSupportChars: 120,
    topographyOpacity: 0.12
  }
});

export const BRAND_BOOK_PROMPT = `
MANUAL VISUAL OBLIGATORIO — EL INDEPENDIENTE DE HIDALGO DIGITAL / TERRITORIO INDEPENDIENTE

PRINCIPIO CENTRAL
- Todas las piezas A, B y C obedecen el mismo sistema de identidad. No hay excepciones por categoría.
- La identidad NO se improvisa. Footer, isotipo, paleta, tipografía, márgenes y jerarquía son obligatorios.
- La pieza debe sentirse editorial, seria, moderna, territorial, limpia y periodística; nunca flyer comercial, propaganda o cartel sensacionalista.

ELEMENTOS FIJOS
- Footer maestro oficial: asset fijo. Nunca generarlo, describirlo, redibujarlo ni reinterpretarlo con IA.
- Isotipo I.: asset fijo. Nunca generarlo ni reinterpretarlo.
- Paleta base: verde mineral #173C3A, verde profundo #0E2A28/#081F1D, hueso #FAF8F3, arena #E9DFCE, carbón #252422, cobre #C66A3D.
- Tipografía obligatoria: Newsreader para titulares; Sora para categorías, cifras y cajas de dato; Inter para bajadas, fuente y textos auxiliares.
- Formato final: 1080x1350, relación 4:5.

REGLA UNIVERSAL DE FOTOGRAFÍA REAL
- Si la nota habla de una persona real identificable, un equipo, un jugador, un técnico, un estadio, un lugar, una vialidad, un edificio, una institución, un evento o un hecho concreto, la producción debe marcar real_photo_required=true.
- Si real_photo_required=true, la pieza debe usar una fotografía real obtenida desde una fuente periodística u oficial de la nota. No reemplazarla por una persona inventada, render, ilustración genérica o fotografía sintética.
- Si no se puede obtener una fotografía real utilizable desde la fuente, NO simular una cobertura documental: la pieza debe detenerse y solicitar una foto real al editor.

REGLA ESPECIAL DEPORTES / FUTBOL
- TODA nota de DEPORTES, futbol, Club Pachuca/Tuzos, FC Juárez o cualquier equipo, jugador, entrenador, directivo, estadio, partido, entrenamiento o afición debe marcar real_photo_required=true.
- Si la nota habla de un equipo: usar foto real del equipo, partido, entrenamiento, estadio o afición vinculada a la noticia.
- Si habla de un jugador, técnico o directivo: usar foto real de esa persona.
- Si habla de un partido próximo: usar foto real del equipo protagonista o del estadio correspondiente; nunca futbolistas inventados.
- Si habla de Pachuca/Tuzos: priorizar fotografía real del Club Pachuca, jugadores con uniforme real, Estadio Hidalgo o contexto auténtico del club.
- Estas reglas aplican aunque el formato sea A, B o C.

FORMATO A — PERSONAJE / POLÍTICA / DECLARACIÓN
- Foto real del personaje, lugar o hecho específico cuando sea identificable.
- Un personaje o una sola escena domina; composición sobria; no collage.
- Dejar aire para titular y contexto. El texto nunca puede salir del lienzo.

FORMATO B — FOTOGRAFÍA DOMINANTE
- Una sola fotografía real/contextual dominante para local, servicio público, clima, seguridad, movilidad, educación y hechos con fuerte carga visual.
- COLLAGE PROHIBIDO salvo orden editorial expresa.
- La foto ocupa la mayor parte del área visual; titular breve y bajada corta.
- Todo el texto debe caber dentro del lienzo y no invadir el footer.

FORMATO C — DATO / CIFRA / RESUMEN VISUAL
- La cifra/dato debe ser protagonista.
- Puede usar foto real tenue de apoyo cuando exista sujeto identificable, especialmente en deportes.
- No repetir el mismo dato en titular, cifra, etiqueta y bajada.
- key_stat_label debe aportar contexto complementario: periodo, universo, comparación o alcance.

TEXTO Y ENCUADRE — REGLA CRÍTICA
- Máximo: categoría + titular + bajada breve + un dato destacado si aporta + fuente.
- Titular claro, informativo, sin clickbait, idealmente máximo 12 palabras.
- Bajada máximo dos líneas visuales y complementaria al titular.
- Ningún texto puede tocar ni rebasar los bordes o el footer.
- Si un titular no cabe: 1) reescribir más breve sin cambiar el hecho; 2) reducir tamaño; 3) aumentar saltos de línea. Nunca recortar palabras ni usar elipsis como salida final.
- El renderer es la autoridad final para tamaños, saltos y márgenes.
- Mantener mínimo 56 px de margen lateral y zona de seguridad adicional.

COMPOSICIÓN
- Márgenes constantes, aire visual, lectura móvil inmediata y alto contraste.
- Líneas topográficas solo como textura secundaria muy sutil.
- Cobre solo como acento, no como fondo dominante.
- Categoría compacta y consistente; no competir con el titular.
- Footer y logotipo nunca cambian de ubicación/proporción.

RESTRICCIONES ABSOLUTAS
- No inventar footer, logo o isotipo.
- No cambiar slogan, iconos, web, paleta o estructura del footer.
- No collage en B.
- No fechas innecesarias.
- No exceso de texto.
- No colores fluorescentes ni paletas aleatorias.
- No diseño partidista, propagandístico, caricaturesco o sensacionalista.
- No generar texto incrustado dentro del fondo visual.
- No duplicar información en C.
- No usar personas, jugadores o equipos inventados cuando se trata de sujetos reales.

CONTROL DE CALIDAD OBLIGATORIO
Antes de entregar una pieza, validar: 1) formato A/B/C correcto; 2) foto real cuando corresponde; 3) deportes siempre con foto real; 4) titular completo dentro del lienzo; 5) bajada completa; 6) caja de dato completa; 7) fuente completa; 8) tipografías Newsreader/Sora/Inter; 9) no collage en B; 10) C sin repetición; 11) footer/isotipo exactos; 12) pieza reconocible como Territorio Independiente.
`;

const sectionRules = [
  [/POL[IÍ]TICA/, "A"],
  [/SEGURIDAD|SERVICIO P[UÚ]BLICO|LOCAL|HIDALGO|MOVILIDAD|CLIMA|EDUCACI[OÓ]N|SOCIEDAD/, "B"],
  [/ECONOM[IÍ]A|DEPORTES/, "C"]
];

export function recommendedFormat(section = "", visualType = "") {
  const s = `${section} ${visualType}`.toUpperCase();
  if (/DATO|CIFRA|COMPARATIVO|RESULTADO|ESTAD[IÍ]STICA|MARCADOR/.test(s)) return "C";
  if (/RETRATO|PERSONAJE|POL[IÍ]TICA|DECLARACI[OÓ]N/.test(s)) return "A";
  for (const [re, format] of sectionRules) if (re.test(s)) return format;
  return "B";
}

function normalizeKeyLabel(p) {
  if (p.format !== "C") return p;
  const label = String(p.key_stat_label || "").trim();
  const headline = String(p.headline || "").trim().toLowerCase();
  const subheadline = String(p.subheadline || "").trim().toLowerCase();
  const labelLc = label.toLowerCase();
  if (!label) return p;
  const repeatedHeadline = labelLc && headline && (headline.includes(labelLc) || labelLc.includes(headline));
  const repeatedSub = labelLc && subheadline && (subheadline.includes(labelLc) || labelLc.includes(subheadline));
  if (repeatedHeadline || repeatedSub) p.key_stat_label = "Contexto del dato";
  if (String(p.key_stat || "").trim().toLowerCase() === String(p.key_stat_label || "").trim().toLowerCase()) p.key_stat_label = "Dato clave verificado";
  return p;
}

export function normalizeProduction(story, production = {}) {
  const clean = { ...production };
  clean.format = ["A", "B", "C"].includes(clean.format) ? clean.format : recommendedFormat(story?.section, clean.visual_type);

  const headlineWords = String(clean.headline || story?.headline || "").trim().split(/\s+/).filter(Boolean);
  clean.headline = headlineWords.slice(0, BRAND.layout.maxHeadlineWords).join(" ");
  clean.subheadline = String(clean.subheadline || story?.summary || "").trim().slice(0, BRAND.layout.maxSubheadlineChars);
  clean.support_text = String(clean.support_text || "").trim().slice(0, BRAND.layout.maxSupportChars);
  clean.key_stat = String(clean.key_stat || "").trim().slice(0, 26);
  clean.key_stat_label = String(clean.key_stat_label || "").trim().slice(0, 46);
  clean.real_photo_required = Boolean(clean.real_photo_required);
  clean.real_photo_subject = String(clean.real_photo_subject || "").trim().slice(0, 120);
  clean.real_photo_reason = String(clean.real_photo_reason || "").trim().slice(0, 220);

  const section = String(story?.section || "").toUpperCase();
  if (section.includes("DEPORTES")) {
    clean.real_photo_required = true;
    if (!clean.real_photo_reason) clean.real_photo_reason = "Las notas deportivas requieren fotografía real del equipo, jugador, estadio o evento relacionado.";
  }

  let vp = String(clean.visual_prompt || "").trim();
  vp = vp.split(/(?<=[.!?])\s+/).filter(sentence => !/(footer|logo|logotipo|isotipo|marca de agua|watermark|\bfecha\b|\bdate\b)/i.test(sentence)).join(" ");
  if (clean.format === "B") vp = vp.replace(/collage|mosaico|split[- ]?screen|montaje/gi, "una sola escena");
  clean.visual_prompt = vp;
  clean.brand_book_version = BRAND.version;
  return normalizeKeyLabel(clean);
}

export function validateProduction(story, production = {}) {
  const p = normalizeProduction(story, production);
  const errors = [];
  const warnings = [];
  if (!p.headline) errors.push("Falta titular final");
  if (!["A", "B", "C"].includes(p.format)) errors.push("Formato A/B/C inválido");
  if (p.format === "B" && /collage|mosaico|split.?screen|montaje/i.test(String(p.visual_prompt || ""))) errors.push("Formato B no permite collage/mosaico");
  if (/footer|logo|logotipo|isotipo|marca de agua|watermark/i.test(String(p.visual_prompt || ""))) warnings.push("El prompt visual menciona branding; el renderer lo controla con assets fijos");
  if (/\b(fecha|date)\b/i.test(String(p.visual_prompt || ""))) warnings.push("La fecha visible no debe incluirse salvo necesidad editorial");
  return { production: p, errors, warnings, ok: errors.length === 0 };
}

export function strictBackgroundPrompt(story, production) {
  const p = normalizeProduction(story, production);
  const byFormat = {
    A: "Una sola escena editorial centrada en el sujeto principal, con aire suficiente para titular y bajada.",
    B: "Una sola escena dominante que ocupe la mayor parte del encuadre. Prohibido collage o mosaico.",
    C: "Composición contextual sobria y contenida, pensada para que una cifra grande domine después; no incluir números ni texto en el fondo."
  }[p.format];

  return `FONDO VISUAL EDITORIAL — ${BRAND.name}\nFormato 4:5 vertical.\n${byFormat}\nTema: ${p.headline}.\nSección: ${story?.section || ""}.\nTipo visual: ${p.visual_type || ""}.\nDirección específica: ${p.visual_prompt || ""}.\n\nReglas absolutas:\n- NO texto, NO números, NO fecha, NO logos, NO isotipo, NO footer, NO marcas de agua.\n- Una sola escena.\n- Compatible con verde mineral, hueso y cobre sin teñir artificialmente toda la imagen.\n- Evitar estética comercial, propagandística, 3D, neón o sensacionalista.\n- Mantener áreas de respiración para textos del renderer.\n- Si real_photo_required=true, este generador NO debe usarse; la pieza debe usar fotografía real de fuente.`;
}
