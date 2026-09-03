# El Independiente de Hidalgo Digital — Telegram + OpenAI directo v5.2

Arquitectura: Telegram -> Railway -> OpenAI -> mesa editorial -> producción -> renderer estricto del Brand Book -> Telegram.

## Corrección principal de v5.2

La V5/V5.1 todavía podía sacar titulares del lienzo porque el renderer calculaba el ancho de las letras con una estimación por carácter. Eso no coincide de forma fiable con el ancho real de **Newsreader**, especialmente en mayúsculas y peso 900.

V5.2 reemplaza esa estimación por **medición real de glifos** usando la misma fuente resuelta por `fontconfig` en Railway y `fontkit`. Así el renderer decide saltos de línea y tamaño de letra usando el ancho real de la tipografía que efectivamente se renderiza.

También:
- añade margen de seguridad extra en A/B/C;
- reduce el ancho máximo de titulares para preservar aire editorial;
- mide también categorías, bajadas, cifras, etiquetas y fuente periodística;
- conserva Newsreader / Sora / Inter del manual;
- mantiene footer e isotipo como assets exactos;
- mantiene las reglas A/B/C y las mesas automáticas 08:00, 12:00 y 17:00;
- mantiene los reintentos de Telegram de V5.1.

## Comprobación después del deploy

En Railway debe aparecer:

`independiente-telegram-openai@5.2.0 start`

Y `/health` debe reportar `version: 5.2.0` y `brand_book: 5.2-strict`.

## Variables

Obligatorias: `TELEGRAM_BOT_TOKEN`, `OPENAI_API_KEY`, `PUBLIC_BASE_URL`, `TELEGRAM_WEBHOOK_SECRET`.

Recomendadas: `OPENAI_MODEL=gpt-5.6-sol`, `OPENAI_IMAGE_MODEL=gpt-image-2`, `OPENAI_IMAGE_QUALITY=medium`, `ENABLE_AI_VISUALS=true`, `MESA_CRON=0 8,12,17 * * *`, `MESA_TIMEZONE=America/Mexico_City`.
