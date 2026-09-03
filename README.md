# El Independiente de Hidalgo Digital — Bot V5.3

Versión lista para Railway/GitHub con Brand Book estricto para piezas A, B y C.

## Cambios clave
- **A, B y C comparten las mismas reglas obligatorias** de identidad, tipografía y encuadre.
- Tipografías obligatorias: **Newsreader** (titular), **Sora** (categoría/datos), **Inter** (bajada/fuente). El build falla si no se instalan; ya no se permite fallback silencioso.
- Renderer con medición real de glifos y ajuste automático para evitar texto fuera del lienzo.
- **Deportes/futbol siempre requieren fotografía real**: Club Pachuca/Tuzos, cualquier equipo, jugador, técnico, directivo, estadio, partido o afición.
- Personas, lugares, vialidades, edificios, instituciones y hechos concretos pueden marcarse como `real_photo_required`.
- El bot intenta obtener la fotografía real desde la página fuente mediante `og:image` / `twitter:image`.
- Si una nota exige fotografía real y no puede obtenerla, **no inventa una imagen**: detiene la pieza y avisa `FALTA FOTO REAL`.
- Formato C evita repetir la misma cifra en titular, dato y etiqueta.
- Footer e isotipo siguen siendo assets maestros fijos.

## Flujo de imagen
1. Re-verifica la noticia.
2. Decide formato A/B/C.
3. Decide si requiere foto real.
4. Intenta obtener foto real desde `source_url`.
5. Si es obligatoria y no existe, detiene la producción.
6. Si no es obligatoria y no hay foto real, puede generar fondo editorial contextual.
7. El renderer coloca tipografía, textos, fuente, isotipo y footer.

> Nota editorial: una foto recuperada desde una fuente puede estar protegida por derechos de autor. El bot la usa como recurso de producción; verifica derechos/licencia antes de publicación externa cuando corresponda.

## Variables
Obligatorias:
- `TELEGRAM_BOT_TOKEN`
- `OPENAI_API_KEY`
- `PUBLIC_BASE_URL`
- `TELEGRAM_WEBHOOK_SECRET`

Recomendadas:
- `OPENAI_MODEL=gpt-5.6-sol`
- `OPENAI_IMAGE_MODEL=gpt-image-2`
- `OPENAI_IMAGE_QUALITY=medium`
- `ENABLE_AI_VISUALS=true`
- `MESA_CRON=0 8,12,17 * * *`
- `MESA_TIMEZONE=America/Mexico_City`
- `STRICT_BRAND_FONTS=true`

Opcionales para foto de fuente:
- `SOURCE_IMAGE_HTML_TIMEOUT_MS=12000`
- `SOURCE_IMAGE_DOWNLOAD_TIMEOUT_MS=18000`
- `SOURCE_IMAGE_MAX_BYTES=12000000`

## Verificación después del deploy
En Railway debes ver:
- `independiente-telegram-openai@5.3.0 start`
- `Fuentes renderer: titular=Newsreader; UI=Sora; cuerpo=Inter`

Luego prueba `/estado`, `/mesa` y genera una pieza de cada formato.
