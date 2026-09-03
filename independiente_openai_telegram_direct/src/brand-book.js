export const BRAND = Object.freeze({
  name: "El Independiente de Hidalgo Digital",
  system: "Territorio Independiente",
  version: "1.0-strict",
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
- No diseñas piezas aisladas: aplicas un sistema editorial fijo.
- La identidad NO se improvisa. Footer, isotipo, paleta, jerarquía y lógica A/B/C son obligatorios.
- La pieza debe sentirse editorial, seria, moderna, territorial, limpia y periodística; nunca flyer comercial, propaganda o cartel sensacionalista.

ELEMENTOS FIJOS
- Footer maestro oficial: asset fijo. Nunca debe generarse, describirse, redibujarse ni reinterpretarse por IA.
- Isotipo I.: asset fijo. Nunca debe generarse ni reinterpretarse.
- Paleta base: verde mineral #173C3A, verde profundo #0E2A28/#081F1D, hueso #FAF8F3, arena #E9DFCE, carbón #252422, cobre #C66A3D.
- Tipografía editorial: Newsreader para titulares; Sora para categorías/datos; Inter para bajadas y cuerpo.
- Formato final: 1080x1350, relación 4:5.

FORMATOS
A — PERSONAJE / POLÍTICA / DECLARACIÓN
- Usar en política, funcionarios, legisladores, alcaldes, gobernadores, dirigentes, entrevistas y declaraciones.
- Un personaje o escena política domina; composición sobria; no collage.
- Dejar espacio negativo preferentemente a la izquierda para titular y contexto.

B — FOTOGRAFÍA DOMINANTE
- Usar en local, servicio público, clima, inundaciones, tráfico, seguridad, movilidad, educación, operativos y hechos con fuerte carga visual.
- Una sola fotografía/escena dominante. COLLAGE PROHIBIDO salvo orden editorial expresa.
- Imagen ocupa la mayor parte del área visual; titular breve y bajada corta.

C — DATO / CIFRA / RESUMEN VISUAL
- Usar en estadísticas, resultados, balances, economía, comparativos, encuestas, elecciones y marcadores.
- La cifra/dato debe ser el protagonista; fotografía solo como apoyo tenue o contexto.
- No convertir en flyer ni introducir elementos decorativos innecesarios.

TEXTO EN ARTE
- Máximo: categoría + titular + bajada breve + un dato destacado si aporta.
- Titular claro, informativo, sin clickbait, idealmente máximo 12 palabras.
- Bajada: máximo dos líneas visuales; no repetir el titular.
- No insertar párrafos largos.
- No agregar fecha visible salvo que la fecha sea parte esencial de agenda/convocatoria/evento.

FOTOGRAFÍA / VISUAL
- Si existe imagen de referencia proporcionada por el usuario, debe usarse como base principal cuando así se solicite y no sustituirse.
- Si no existe imagen autorizada, generar solo una ilustración editorial o escena contextual de apoyo. Nunca fabricar una supuesta fotografía documental del hecho.
- Una sola escena. Evitar texto legible, logos, marcas, emblemas y marcas de agua dentro del visual generado.
- Tratamiento: periodístico, natural, sobrio; sin efectos 3D, dramatización excesiva ni estética de propaganda.

COMPOSICIÓN
- Márgenes constantes, aire visual, lectura móvil inmediata y alto contraste.
- Líneas topográficas únicamente como textura secundaria muy sutil.
- Cobre solo como acento, no como fondo dominante.
- Categoría pequeña y consistente; no competir con el titular.
- Footer y logotipo nunca deben cambiar de ubicación/proporción entre piezas.

RESTRICCIONES ABSOLUTAS
- No inventar footer.
- No inventar logo/isotipo.
- No cambiar slogan, iconos, web, paleta o estructura del footer.
- No collage en Formato B.
- No fechas innecesarias.
- No exceso de texto.
- No colores fluorescentes ni paletas aleatorias.
- No diseño partidista, propagandístico, caricaturesco o sensacionalista.
- No generar texto incrustado dentro del fondo visual.

CONTROL DE CALIDAD
Antes de entregar una instrucción visual, confirma mentalmente:
1) formato A/B/C correcto; 2) una sola escena; 3) titular breve; 4) bajada breve; 5) dato solo si aporta; 6) paleta compatible; 7) no fecha innecesaria; 8) no collage en B; 9) sin footer/logo dentro del fondo; 10) reconocible como Territorio Independiente.
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

export function normalizeProduction(story, production = {}) {
  const clean = { ...production };
  clean.format = ["A", "B", "C"].includes(clean.format) ? clean.format : recommendedFormat(story?.section, clean.visual_type);

  const headlineWords = String(clean.headline || story?.headline || "").trim().split(/\s+/).filter(Boolean);
  if (headlineWords.length > BRAND.layout.maxHeadlineWords) clean.headline = headlineWords.slice(0, BRAND.layout.maxHeadlineWords).join(" ");
  else clean.headline = headlineWords.join(" ");

  clean.subheadline = String(clean.subheadline || story?.summary || "").trim().slice(0, BRAND.layout.maxSubheadlineChars);
  clean.support_text = String(clean.support_text || "").trim().slice(0, BRAND.layout.maxSupportChars);
  clean.key_stat = String(clean.key_stat || "").trim().slice(0, 18);
  clean.key_stat_label = String(clean.key_stat_label || "").trim().slice(0, 46);

  let vp = String(clean.visual_prompt || "").trim();
  // El fondo nunca controla elementos fijos de marca ni fechas.
  vp = vp.split(/(?<=[.!?])\s+/).filter(sentence => !/(footer|logo|logotipo|isotipo|marca de agua|watermark|\bfecha\b|\bdate\b)/i.test(sentence)).join(" ");
  if (clean.format === "B") vp = vp.replace(/collage|mosaico|split[- ]?screen|montaje/gi, "una sola escena");
  clean.visual_prompt = vp;
  clean.brand_book_version = BRAND.version;
  return clean;
}

export function validateProduction(story, production = {}) {
  const p = normalizeProduction(story, production);
  const errors = [];
  const warnings = [];
  if (!p.headline) errors.push("Falta titular final");
  if (!p.format || !["A", "B", "C"].includes(p.format)) errors.push("Formato A/B/C inválido");
  if (p.format === "B" && /collage|mosaico|split.?screen|montaje/i.test(String(p.visual_prompt || ""))) {
    errors.push("Formato B no permite collage/mosaico");
  }
  if (/footer|logo|logotipo|isotipo|marca de agua|watermark/i.test(String(p.visual_prompt || ""))) {
    warnings.push("El prompt visual menciona branding; será eliminado del fondo y aplicado por renderer");
  }
  if (/\b(fecha|date)\b/i.test(String(p.visual_prompt || ""))) warnings.push("La fecha visible no debe incluirse salvo necesidad editorial");
  return { production: p, errors, warnings, ok: errors.length === 0 };
}

export function strictBackgroundPrompt(story, production) {
  const p = normalizeProduction(story, production);
  const byFormat = {
    A: "Una sola escena editorial centrada en un personaje o acto institucional. Sujeto visual dominante hacia la derecha o centro-derecha; deja espacio negativo limpio en la mitad izquierda para superponer texto. Tratamiento sobrio, institucional y periodístico, no propaganda.",
    B: "Una sola escena/fotografía contextual dominante que ocupe la mayor parte del encuadre. Prohibido collage, mosaico o múltiples viñetas. Deja respiración en zona inferior-izquierda para titular. Tratamiento natural y periodístico.",
    C: "Composición editorial abstracta o contextual muy contenida, pensada para que una cifra grande domine después. Fondo sobrio, poca información visual, sin números ni texto incrustado; puede incluir geometría, mapa o textura tenue si aporta contexto."
  }[p.format];

  return `FONDO VISUAL EDITORIAL — ${BRAND.name}\nFormato final de composición: 4:5 vertical.\n${byFormat}\nTema: ${p.headline}.\nSección: ${story?.section || ""}.\nTipo visual: ${p.visual_type || ""}.\nDirección específica: ${p.visual_prompt || ""}.\n\nReglas absolutas para el FONDO generado:\n- NO texto, NO titulares, NO letras, NO números, NO fecha, NO logos, NO isotipo, NO footer, NO marcas de agua, NO nombres de medios.\n- Una sola escena.\n- Compatible cromáticamente con verde mineral oscuro, hueso y cobre, sin teñir artificialmente toda la imagen.\n- Si no existe fotografía real suministrada por el usuario, crear ilustración editorial o escena contextual de apoyo; NO simular evidencia fotográfica real del acontecimiento.\n- Evitar estética comercial, propagandística, cinematográfica exagerada, 3D, neón o sensacionalista.\n- Mantener áreas de respiración para textos superpuestos por el renderer.\n- No insertar elementos gráficos del footer ni del Brand Book; esos assets se agregan después de forma fija.`;
}
