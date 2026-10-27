# Despliegue de Estudio 33 Real Estate: GitHub + Render (Static Site)

## 0. Antes de subir nada

1. En `site.json`: sustituye `[DOMINIO]` (campo `dominio.url_base`, p. ej. `https://tudominio.es`, sin barra final) y completa `legal` (forma jurídica, NIF/CIF, domicilio). Mientras estén vacíos, no se muestran en las páginas legales.
2. Añade la imagen para redes `img/og-estudio33.png` (1200×630). El logotipo es HTML/CSS (placa 33) y el favicon está en `img/favicon.svg`, `img/favicon.ico` e `img/apple-touch-icon.png`.
3. Comprueba que todo está bien:

```bash
npm run build:strict
```

Debe terminar sin avisos. Así se generan las páginas, `sitemap.xml` y `robots.txt` con tu dominio.

## 1. Repositorio en GitHub

Crea primero un repositorio vacío en GitHub (recomendado: privado) y después, desde la carpeta del proyecto:

```bash
git init -b main
git add .
git commit -m "Estudio 33 Real Estate: web inicial"
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

Se suben también las páginas generadas y `.build-cache.json`, que conserva las fechas `lastmod` del sitemap. El `.gitignore` excluye `node_modules/`, `preview/` y `public/`.

**Flujo diario de cambios:**

```bash
# 1. edita pages.json / site.json / reviews.json / plantilla
npm run build:strict
git add .
git commit -m "Describe el cambio"
git push
```

Render despliega solo al detectar el push en `main`.

## 2. Render: Static Site

**Opción A: panel de Render**

1. New > Static Site > conecta tu cuenta de GitHub y elige el repositorio.
2. Ajustes:

| Campo | Valor |
|---|---|
| Branch | `main` |
| Build Command | `npm run build:render` |
| Publish Directory | `public` |
| Auto-Deploy | Yes (despliegue automático desde `main`) |
| Environment (opcional) | `NODE_VERSION` = `20` |

3. Create Static Site. El primer despliegue tarda un par de minutos.

**Opción B: Blueprint.** El archivo `render.yaml` ya contiene esos ajustes más cabeceras de seguridad y caché. En Render: New > Blueprint y selecciona el repositorio.

`npm run build:render` regenera las páginas y copia a `public/` solo lo que se sirve: HTML, `css/`, `js/`, `img/`, `fonts/`, `sitemap.xml` y `robots.txt`. Así `site.json`, `pages.json`, las plantillas y los scripts no quedan expuestos.

## 3. Dominio propio y SSL

1. En el servicio: Settings > Custom Domains > Add Custom Domain.
2. Decide una única versión principal (con o sin `www`) y usa esa misma en `dominio.url_base` de `site.json`. Render añade la versión contraria y redirige a la principal; compruébalo en esa pantalla.
3. En tu proveedor de DNS crea los registros que Render te muestra en el panel (no copies direcciones de otras guías). Elimina cualquier registro AAAA que apunte a otro sitio.
4. Pulsa Verify. Render emite y renueva el certificado SSL automáticamente, pero puede tardar hasta que el DNS se propague.
5. Si cambias el dominio principal respecto a lo que pusiste en `site.json`, actualiza `url_base`, ejecuta `npm run build:strict` y haz push (cambian canonical, Open Graph, schema y sitemap).

## 4. Redirecciones 301

Render **no lee** un archivo `_redirects`. Si hacen falta, se configuran en el panel (Settings > Redirects/Rewrites) o en el bloque `routes` de `render.yaml`:

```yaml
routes:
  - type: redirect
    source: /pages/venta-de-viviendas.html
    destination: /pages/vender-piso.html
```

Las URLs antiguas de Taptap no llegaron a indexarse con dominio propio, así que para el lanzamiento no hace falta ninguna redirección.

## 5. Comprobaciones tras el primer despliegue

- `https://TU-DOMINIO/` carga con SSL, y `robots.txt` y `sitemap.xml` abren.
- El sitemap lista tu dominio real (ya no aparece `[DOMINIO]`).
- Completa uno de los formularios de `/pages/bienvenida-*.html`: debe llegar al email de Web3Forms con el asunto que empieza por `[ESTUDIO 33]` y mostrar la pantalla de gracias.
- En móvil: el botón de WhatsApp abre el chat con el mensaje y desaparece al llegar al bloque de contacto.
- Revisa PageSpeed Insights (móvil) en home, una página de servicio y un barrio.
- Prueba un par de URLs de `/pages/`: deben abrir con la ruta `/pages/...` y sin redirecciones raras.

## 6. Search Console e indexación (máximo 10 URLs al día)

**Alta (una sola vez)**

1. Search Console > Añadir propiedad. Recomendado: propiedad de dominio, verificada con un registro TXT en el DNS.
2. Sitemaps > añade `https://TU-DOMINIO/sitemap.xml` y envíalo.
3. Comprueba que Search Console lo lee sin errores.

**Plan diario**

Cada día, en Inspección de URLs, pega cada URL del día y pulsa "Solicitar indexación". Hazlo como máximo con 10 URLs. El plan completo está en `docs/indexacion-plan.md` (se regenera con `npm run plan`) y está ordenado por prioridad:

Orden: portada y servicios, ciudades, venta por ciudad y resto de servicio + ciudad, barrios, y por último Academy, Únete al equipo, Nosotros, Contacto y legales (90 URLs, 9 días).

Las URLs exactas de cada día están en `docs/indexacion-plan.md`, con casillas para ir marcando.

**Seguimiento**

- A los 3-4 días revisa Páginas > Indexación: URLs indexadas, "Rastreada, actualmente sin indexar" y errores.
- No pidas reindexar de nuevo la misma URL salvo que hayas cambiado su contenido.
- Si una página queda "sin indexar" tras 2-3 semanas, mejora su contenido local antes de insistir.
- Los formularios `/pages/bienvenida-*.html` llevan `noindex` y no están en el sitemap: no hay que indexarlos.
