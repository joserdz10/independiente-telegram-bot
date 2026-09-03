# Brand Book Operativo — Territorio Independiente

Este archivo resume las reglas que el bot aplica automáticamente en v4.3.

## Identidad fija
- Footer maestro exacto: `assets/footer_master.png`.
- Isotipo exacto: `assets/isotipo_i.png`.
- Paleta: verde mineral `#173C3A`, verde oscuro `#0E2A28`, verde profundo `#081F1D`, hueso `#FAF8F3`, arena `#E9DFCE`, carbón `#252422`, cobre `#C66A3D`.
- Tipografía institucional: **Newsreader** (titular), **Sora** (categorías, cifras y cajas), **Inter** (bajada y cuerpo).
- Salida: 1080x1350, 4:5.

## Formatos
### A — Personaje / política / declaración
- Debe usar una imagen visual directamente relacionada con la nota.
- Si habla de una persona, el visual debe corresponder a esa persona o a una representación visual claramente alineada con ella.
- Si habla de un lugar, el visual debe corresponder a ese lugar o entorno reconocible.
- Evitar fondos genéricos.
- Una sola escena.
- Texto a la izquierda o con aire suficiente para lectura.

### B — Fotografía dominante
- Una sola foto/escena dominante.
- Para local, servicio público, seguridad, clima, movilidad y hechos de alto impacto visual.
- Collage prohibido.
- No saturar con demasiados elementos.
- Titular, bajada y caja de dato deben quedar completamente dentro del lienzo.

### C — Dato / cifra / resumen visual
- La cifra principal debe ser protagonista.
- El texto secundario no debe repetir literalmente el mismo dato.
- `key_stat_label` debe complementar con contexto: periodo, alcance, universo o referencia.
- Composición limpia y sintética.

## Texto
- Titular máximo 12 palabras.
- Bajada breve, máximo 2 líneas visuales.
- Un dato destacado solo si es sólido y aporta.
- Sin párrafos largos dentro del arte.
- Sin fecha visible por defecto.
- Ningún texto puede salirse del post.

## Imagen generada por IA
- Solo genera el fondo visual.
- Sin texto, números, fecha, logo, isotipo, footer, marcas de agua ni nombre del medio.
- Una sola escena.
- Debe corresponder al sujeto real de la nota cuando éste sea claro (persona, lugar o hecho).
- Nunca debe fingir ser prueba documental ni cobertura fotográfica real si no existe tal referencia.

## Renderer
- Inserta automáticamente categoría, titular, bajada, dato destacado, fuente, isotipo y footer maestro.
- Aplica layout diferente para A/B/C.
- Ajusta mejor cifras y cajas de dato para evitar desbordes.
- Valida el Brand Book antes de exportar.
