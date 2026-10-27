# Estudio 33 Real Estate · generador de la web

Web estática generada con Node.js (sin dependencias). Requiere Node 18 o superior.

## Estructura

```
site.json              marca, contacto, portada, CTAs, formularios, navegación, pie, territorio
pages.json             90 páginas con su SEO y sus textos
reviews.json           reseñas reales (vacío hasta tenerlas)
templates/base.html    plantilla de todas las páginas
templates/formulario.html  plantilla de los formularios pregunta a pregunta
templates/legal/       textos de las 4 páginas legales
css/styles.css         estilos de la web · css/formulario.css estilos de los formularios
js/script.js           menú y botón de WhatsApp · js/formulario.js motor de formularios (Web3Forms)
fonts/                 tipografías alojadas en la web (Gloock, Hanken Grotesk, IBM Plex Mono)
img/                   favicon (svg, ico) e icono para móviles
docs/marca/            manual de identidad de Estudio 33 (JSON, con prompt maestro)
docs/indexacion-plan.md  plan de indexación (10 URLs al día)
generate.js            genera las páginas y los formularios
generate-sitemap.js    genera sitemap.xml, robots.txt y el plan de indexación
publicar.js            copia a /public solo lo que se sirve (lo usa Render)
render.yaml            Blueprint de Render · DESPLIEGUE.md guía GitHub + Render
```

En la raíz se generan `index.html` y las cuatro páginas legales; todo lo demás va en `/pages/`.

## Uso

```bash
npm run build           # genera páginas, formularios, sitemap.xml y robots.txt
npm run build:strict    # igual, pero falla si hay avisos o enlaces rotos (antes de publicar)
npm run plan            # actualiza docs/indexacion-plan.md
npm run serve           # servidor local para revisar el resultado
```

## Qué se edita y dónde

| Quiero... | Edito |
|---|---|
| Teléfono, email, dominio | `site.json` (`contacto`, `dominio`) |
| Redes sociales | `site.json` > `redes`: rellenar `url` |
| Textos de la portada | `site.json` > `home` |
| Botones y bloque de contacto | `site.json` > `ctas` y `contacto_bloques` |
| Preguntas de un formulario | `site.json` > `formularios` |
| Access key de Web3Forms | `site.json` > `formulario` (una sola para todos) |
| Texto o SEO de una página | `pages.json` |
| Diseño | `templates/` y `css/` |
| Tono, colores y tipografías | `docs/marca/estudio33-identidad.json` |

## Formularios

Cada botón lleva a su formulario: propietarios, compradores, inversores, academy o agentes (`/pages/bienvenida-*.html`). Se envían a Web3Forms con la access key de `site.json`, llevan `noindex` y no entran en el sitemap.
