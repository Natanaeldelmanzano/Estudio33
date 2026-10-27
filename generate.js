#!/usr/bin/env node
'use strict';
/**
 * Generador de la web de Estudio 33 Real Estate.
 *   node generate.js            -> genera las páginas con estado "listo" (raíz + /pages/)
 *   node generate.js --todo     -> además genera los borradores en /preview/pages/ (noindex, para revisarlos)
 *   node generate.js --strict   -> termina con error si hay avisos o enlaces rotos
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const ARGS = new Set(process.argv.slice(2));
const TODO = ARGS.has('--todo');
const STRICT = ARGS.has('--strict');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const js = (f) => JSON.parse(rd(f));

const site = js('site.json');
const doc = js('pages.json');
let reviews = { resenas: [] };
try { reviews = js('reviews.json'); } catch (e) { /* sin reseñas */ }
const tpl = rd('templates/base.html').replace(/<!--[\s\S]*?-->/g, '');

const warns = [];
const warn = (m) => { if (!warns.includes(m)) warns.push(m); };
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const today = new Date().toISOString().slice(0, 10);
const base = site.dominio.url_base.replace(/\/+$/, '');
const assetExists = (url) => typeof url === 'string' && url.startsWith('/') && fs.existsSync(path.join(ROOT, url.slice(1)));
if (/\[/.test(base)) warn('site.json: dominio.url_base conserva el marcador [DOMINIO].');
['telefono_visible', 'telefono_enlace', 'whatsapp_numero', 'email'].forEach((k) => {
  if (/\[/.test(site.contacto[k])) warn('site.json: contacto.' + k + ' conserva un marcador [..].');
});
[['marca.favicon', site.marca.favicon], ['seo.og_imagen', site.seo.og_imagen]].forEach(([k, url]) => {
  if (!assetExists(url)) warn('Falta el recurso site.json: ' + k + ' (' + url + ').');
});

/* ---------- Datos ---------- */
const terr = {};
site.territorio.forEach((c) => { terr[c.id] = c; c.zmap = {}; c.zonas.forEach((z) => (c.zmap[z.id] = z)); });
const nombreServ = {};
doc.paginas.filter((p) => p.tipo === 'servicio').forEach((p) => (nombreServ[p.id] = p.etiqueta));

const publicar = doc.paginas.filter((p) => p.estado === 'listo' || TODO);
const P = {};
publicar.forEach((p) => { P[p.id] = Object.assign({}, p, { ruta: p.estado === 'listo' ? p.ruta : '/preview' + p.ruta }); });
const lista = Object.values(P);
const ofType = (t, f) => lista.filter((p) => p.tipo === t && (!f || f(p)));
const link = (p) => '<li><a href="' + p.ruta + '">' + esc(p.etiqueta) + '</a></li>';
const abs = (u) => (/^https?:/.test(u) ? u : base + u);

/* ---------- Fragmentos ---------- */
const sec = (cls, inner, extra) => '<section' + (cls ? ' class="' + cls + '"' : '') + (extra || '') + '><div class="caja">' + inner + '</div></section>';
const cab = (etq, titulo, texto) => '<div class="intro-sec">' + (etq ? '<span class="etiqueta">' + esc(etq) + '</span>' : '') + '<h2>' + esc(titulo) + '</h2>' + (texto ? '<p>' + esc(texto) + '</p>' : '') + '</div>';
const C = site.ctas || {};
const FORMS = site.formularios || {};
function formHref(consulta) {
  const m = (C.formulario_por_consulta || {})[consulta] || 'propietarios';
  if (m.startsWith('/')) return m;
  const [k, q] = m.split('?');
  return FORMS[k] ? '/pages/' + FORMS[k].archivo + (q ? '?' + q : '') : '#contacto';
}
const formDe = (p) => { const h = formHref(p.tipo === 'academy' ? 'academy' : p.consulta_defecto); return h === p.ruta ? '#perfiles' : h; };
const ctaDe = (p) => (C.por_consulta && C.por_consulta[p.consulta_defecto]) || C.defecto || 'Hablar con un asesor';

function navHtml(cur) {
  let n = 0;
  return site.navegacion.principal.map((it) => {
    const cl = (id) => (cur.id === id ? ' aria-current="page"' : '');
    if (it.submenu) {
      const id = 'sub-' + (++n);
      const items = it.submenu.filter((i) => P[i]).map((i) => '<li><a href="' + P[i].ruta + '"' + cl(i) + '>' + esc(P[i].etiqueta) + '</a></li>').join('');
      return '<li class="tiene-sub"><button type="button" aria-expanded="false" aria-controls="' + id + '">' + esc(it.etiqueta) + '</button><ul id="' + id + '" hidden>' + items + '</ul></li>';
    }
    if (!P[it.id]) return '';
    return '<li><a href="' + P[it.id].ruta + '"' + cl(it.id) + '>' + esc(it.etiqueta) + '</a></li>';
  }).join('');
}

function cadena(p) {
  const out = []; let c = p; const vistos = new Set();
  while (c && !vistos.has(c.id)) { vistos.add(c.id); out.unshift(c); c = c.padre ? P[c.padre] : null; }
  if (out[0].id !== 'index' && P.index) out.unshift(P.index);
  return out;
}
function migasHtml(p) {
  if (p.tipo === 'home') return '';
  const c = cadena(p);
  return '<nav class="migas" aria-label="Migas de pan"><ol>' + c.map((x, i) => i === c.length - 1 ? '<li aria-current="page">' + esc(x.etiqueta) + '</li>' : '<li><a href="' + x.ruta + '">' + esc(x.etiqueta) + '</a></li>').join('') + '</ol></nav>';
}

const redes = Object.entries(site.redes).filter(([, v]) => v && typeof v === 'object');
function redesHtml() {
  return '<div class="redes">' + redes.map(([, r]) => {
    const ic = '<svg width="18" height="18" aria-hidden="true"><use href="#i-' + esc(r.icono) + '"/></svg>';
    return r.url
      ? '<a href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer me" aria-label="' + esc(r.aria_label) + '">' + ic + '</a>'
      : '<span class="red--sin-enlace" role="img" aria-label="' + esc(r.aria_label) + ' (próximamente)">' + ic + '</span>';
  }).join('') + '</div>';
}
const logoHtml = () => '<span class="placa" aria-hidden="true">' + esc(site.marca.numero) + '</span><span class="logo__txt"><b>' + esc(site.marca.palabra) + ' ' + esc(site.marca.numero) + '</b><small>' + esc(site.marca.descriptor) + '</small></span>';
function pieHtml() {
  return site.pie.columnas.map((col) => {
    if (col.tipo === 'marca') {
      return '<div class="pie__marca"><a class="logo" href="/" aria-label="' + esc(site.marca.nombre) + ', ir al inicio">' + logoHtml() + '</a><p>' + esc(site.marca.descripcion_corta) + '</p><ul><li><a href="tel:' + esc(site.contacto.telefono_enlace) + '">' + esc(site.contacto.telefono_visible) + '</a></li><li><a href="mailto:' + esc(site.contacto.email) + '">' + esc(site.contacto.email) + '</a></li></ul>' + redesHtml() + '</div>';
    }
    return '<div><h2>' + esc(col.titulo) + '</h2><ul>' + col.ids.filter((i) => P[i]).map((i) => link(P[i])).join('') + '</ul></div>';
  }).join('');
}

const primera = (t) => {
  const m = (t || '').match(/^[^.]+\./); const s = m ? m[0] : (t || '');
  return s.length > 190 ? s.slice(0, 187).replace(/\s+\S*$/, '') + '…' : s;
};
function tituloLista(p) {
  const c = terr[p.ciudad]; const z = c && p.zona ? c.zmap[p.zona] : null;
  if (p.titulo_lista) return p.titulo_lista;
  if (p.tipo === 'servicio') return 'Qué incluye';
  if (p.tipo === 'ciudad') return 'Qué hacemos en ' + c.nombre;
  if (p.tipo === 'barrio') return 'Lo que mira un comprador en ' + (z.centro ? 'el centro de ' + c.nombre : z.nombre);
  if (p.tipo === 'servicio-ciudad') return 'Qué incluye en ' + c.nombre;
  return 'Lo esencial';
}
const ul = (arr) => '<ul class="lista-marca">' + arr.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>';

/* Héroe */
function heroHtml(p, cta) {
  if (p.tipo === 'home') {
    const H = site.home.hero;
    const h1 = esc(p.h1).replace(esc(H.resaltar || '§§'), '<em>' + esc(H.resaltar) + '</em>');
    return '<section class="hero"><div class="hero__rejilla"><div><span class="etiqueta">' + esc(H.etiqueta) + '</span><h1>' + h1 + '</h1><p class="hero__sub">' + esc(H.subtitulo) + '</p><div class="hero__acciones"><a class="btn btn--laton btn--grande" href="#contacto" data-consulta="vender-vivienda">' + esc(H.cta1) + '</a><a class="btn btn--linea btn--grande" href="' + (P[H.cta2_id] ? P[H.cta2_id].ruta : '#contacto') + '">' + esc(H.cta2) + '</a></div><p class="hero__nota">' + esc(H.nota) + '</p></div>'
      + '<div class="placa-hero" aria-hidden="true"><div class="placa-hero__cara"><div class="placa-hero__arriba"><span>' + esc(site.marca.palabra) + '</span><span>' + esc(H.placa_arriba) + '</span></div><div class="placa-hero__num">' + esc(site.marca.numero) + '</div><div class="placa-hero__abajo"><span>' + esc(site.marca.descriptor) + '</span><span>' + esc(H.placa_abajo) + '</span></div></div></div></div></section>';
  }
  const legal = p.tipo === 'legal';
  const sub = legal ? '' : (p.subtitulo || primera(p.intro));
  return '<section class="cabecera-pag' + (legal ? ' cabecera-pag--compacta' : '') + '"><div class="caja">' + (p.etiqueta_hero ? '<span class="etiqueta">' + esc(p.etiqueta_hero) + '</span>' : '') + '<h1>' + esc(p.h1) + '</h1>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + (legal ? '' : '<div class="hero__acciones">' + (formDe(p) === '#perfiles' ? '' : '<a class="btn btn--laton btn--grande" href="' + formDe(p) + '">' + esc(cta) + '</a>') + '<a class="btn btn--linea btn--grande" href="tel:' + esc(site.contacto.telefono_enlace) + '">Llamar al ' + esc(site.contacto.telefono_visible) + '</a></div>') + '</div></section>';
}

/* Portada */
function homeHtml(p) {
  const H = site.home;
  let h = '';
  const cam = H.caminos;
  h += sec('', cab(cam.etiqueta, cam.titulo, cam.texto) + '<div class="caminos">' + cam.items.map((c, i) =>
    '<article class="camino' + (i === 0 ? ' camino--principal' : '') + '"><h3>' + esc(c.titulo) + '</h3><p>' + esc(c.texto) + '</p><ul>' + c.puntos.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul><div class="camino__acciones"><a class="btn' + (i === 0 ? ' btn--laton' : '') + '" href="' + formHref(c.consulta) + '">' + esc(c.cta) + '</a>' + (P[c.id] ? '<a class="enlace-mas" href="' + P[c.id].ruta + '">Saber más</a>' : '') + '</div></article>').join('') + '</div>');
  const m = site.proceso;
  h += sec('oscuro', cab(m.etiqueta, m.titulo, m.texto) + '<ol class="metodo">' + m.pasos.map((s) => '<li><strong>' + esc(s.titulo) + '</strong><span>' + esc(s.texto) + '</span></li>').join('') + '</ol>');
  const k = H.compromisos;
  h += sec('', cab(k.etiqueta, k.titulo, k.texto) + '<div class="compromisos">' + k.items.map((c) => '<div class="compromiso"><h3>' + esc(c.titulo) + '</h3><p>' + esc(c.texto) + '</p></div>').join('') + '</div>');
  const sv = H.servicios;
  h += sec('seccion--niebla', cab(sv.etiqueta, sv.titulo, sv.texto) + '<ul class="rejilla-enlaces rejilla-enlaces--4">' + sv.items.filter((x) => P[x.id]).map((x) => '<li><a href="' + P[x.id].ruta + '"><strong>' + esc(P[x.id].etiqueta) + '</strong><span>' + esc(x.texto) + '</span></a></li>').join('') + '</ul>');
  const z = H.zonas;
  h += sec('', '<div class="zonas"><div>' + cab(z.etiqueta, z.titulo, z.texto) + '<p class="nacional">' + esc(z.nacional) + '</p></div><ul class="zonas__lista">' + ofType('ciudad').map((c) => '<li><a href="' + c.ruta + '">' + esc(terr[c.ciudad].nombre) + '<small>' + terr[c.ciudad].zonas.length + ' barrios</small></a></li>').join('') + '</ul></div>');
  const ac = H.estudio;
  h += sec('oscuro', cab(ac.etiqueta, ac.titulo, ac.texto) + '<div class="dos">' + ac.items.map((c) => '<div class="tarjeta"><span class="etiqueta">' + esc(c.etiqueta) + '</span><h3>' + esc(c.titulo) + '</h3><p>' + esc(c.texto) + '</p>' + (c.id && P[c.id] ? '<a class="btn btn--linea" href="' + P[c.id].ruta + '">' + esc(c.cta) + '</a>' : '<p class="hero__nota">' + esc(c.cta) + '</p>') + '</div>').join('') + '</div>');
  return h;
}

function contenidoHtml(p) {
  if (p.tipo === 'legal') return legalHtml(p);
  if (p.tipo === 'home') return homeHtml(p);
  let h = '';
  if (p.estado !== 'listo') h += '<p><strong>BORRADOR (no se publica):</strong> ' + esc(p.datos_pendientes || 'Falta contenido local.') + '</p>';
  if (p.intro) h += '<div class="texto">' + String(p.intro).split(/\n\n+/).map((x) => '<p>' + esc(x) + '</p>').join('') + '</div>';
  const items = p.incluye || p.puntos;
  if (items && items.length) h += '<h2 style="margin-top:2.4rem">' + esc(tituloLista(p)) + '</h2>' + ul(items);
  let out = sec('', h);
  if (p.tarjetas && p.tarjetas.length) out += sec('seccion--niebla', '<div class="tarjetas">' + p.tarjetas.map((t) => '<a class="tarjeta-perfil" href="' + esc(t.href) + '"><h3>' + esc(t.titulo) + '</h3><p>' + esc(t.texto) + '</p><span class="enlace-mas">' + esc(t.cta) + '</span></a>').join('') + '</div>', ' id="perfiles"');
  (p.bloques || []).forEach((b, i) => { out += sec(i % 2 ? '' : 'seccion--niebla', cab(b.etiqueta || '', b.titulo, b.texto) + (b.items ? ul(b.items) : '')); });
  return out;
}

function legalHtml(p) {
  const f = 'templates/legal/' + p.plantilla + '.html';
  if (!fs.existsSync(path.join(ROOT, f))) { warn('Falta ' + f + '.'); return sec('', '<p>Contenido en preparación.</p>'); }
  const L = site.legal;
  const limpio = (x) => (x && !/\[PENDIENTE\]/.test(x) ? x : '');
  const v = { legal_titular: limpio(L.titular), legal_actividad: limpio(L.actividad), legal_forma_juridica: limpio(L.forma_juridica), legal_nif_cif: limpio(L.nif_cif), legal_domicilio: limpio(L.domicilio), legal_email: limpio(L.email), legal_inscripcion: limpio(L.inscripcion_registral), url_base: base, marca: site.marca.nombre, telefono_visible: site.contacto.telefono_visible, fecha_actualizacion: today };
  let html = rd(f).replace(/\{\{(\w+)\}\}/g, (m, k) => (k in v ? esc(v[k]) : m));
  html = html.replace(/\s*<li>[^<:]*:\s*<\/li>/g, '');  /* datos aún no definidos: se omiten */
  return sec('', '<div class="legal">' + html + '</div>');
}

function procesoHtml(p) {
  if (['legal', 'home', 'academy'].includes(p.tipo) || ['contacto', 'unete-al-equipo'].includes(p.id)) return '';
  const pr = site.proceso;
  return sec('seccion--niebla', cab(pr.etiqueta, pr.titulo, '') + '<ol class="pasos">' + pr.pasos.map((s) => '<li><strong>' + esc(s.titulo) + '</strong><span>' + esc(s.texto) + '</span></li>').join('') + '</ol>');
}

function resenasHtml(p) {
  if ((site.resenas.excluir_en_tipos || []).includes(p.tipo)) return '';
  const rs = (reviews.resenas || []).slice(0, site.resenas.max_mostrar || 3);
  const url = reviews.google_review_url || reviews.google_profile_url;
  if (!rs.length) return '';
  let h = cab('Opiniones', reviews.titulo_bloque || 'Lo que dicen nuestros clientes', '');
  h += '<div class="resenas">' + rs.map((r) => '<blockquote><p>' + esc(r.texto) + '</p><cite>' + esc(r.nombre) + (r.zona ? ', ' + esc(r.zona) : '') + (r.valoracion ? ' (' + esc(r.valoracion) + '/5)' : '') + '</cite></blockquote>').join('') + '</div>';
  if (url) h += '<p style="margin-top:1.4rem"><a class="btn btn--linea" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(reviews.texto_boton) + '</a></p>';
  return sec('', h);
}

function faqHtml(p) {
  if (!p.faqs || !p.faqs.length) return '';
  return sec('', cab('Preguntas frecuentes', p.tipo === 'home' ? 'Lo que nos preguntan antes de empezar' : 'Dudas habituales', '') + '<div class="faq">' + p.faqs.map((f) => '<details><summary>' + esc(f.pregunta) + '</summary><p>' + esc(f.respuesta) + '</p></details>').join('') + '</div>');
}

function relacionadasHtml(p) {
  if (Array.isArray(p.relacionadas)) { const it2 = p.relacionadas.map((i) => P[i]).filter(Boolean); return it2.length ? sec('', cab('Sigue explorando', 'También te puede interesar', '') + '<ul class="relacionadas">' + it2.map(link).join('') + '</ul>') : ''; }
  let it = [];
  const same = (t, f) => ofType(t, f);
  const R = site.relaciones || {};
  if (p.tipo === 'servicio') it = [...same('servicio-ciudad', (x) => x.servicio === p.id), P[R.valoracion]];
  else if (p.tipo === 'ciudad') it = [...same('barrio', (x) => x.ciudad === p.ciudad), ...same('servicio-ciudad', (x) => x.ciudad === p.ciudad)];
  else if (p.tipo === 'barrio') it = [P['inmobiliaria-' + p.ciudad], ...same('servicio-ciudad', (x) => x.ciudad === p.ciudad && x.servicio === p.servicio), P[p.servicio], P[R.valoracion], ...same('barrio', (x) => x.ciudad === p.ciudad && x.id !== p.id).slice(0, 8)];
  else if (p.tipo === 'servicio-ciudad') it = [P[p.servicio], P['inmobiliaria-' + p.ciudad], ...same('barrio', (x) => x.ciudad === p.ciudad && x.servicio === p.servicio), ...same('servicio-ciudad', (x) => x.ciudad === p.ciudad && x.id !== p.id), ...same('servicio-ciudad', (x) => x.servicio === p.servicio && x.id !== p.id)];
  else if (p.tipo === 'academy' || p.tipo === 'institucional') it = [P[R.principal], P[R.valoracion]];
  it = [...new Set(it.filter(Boolean))].filter((x) => x.id !== p.id);
  if (!it.length) return '';
  const t = p.tipo === 'servicio' ? 'Este servicio en tu ciudad' : p.tipo === 'ciudad' ? 'Barrios y servicios en ' + terr[p.ciudad].nombre : 'También te puede interesar';
  return sec('', cab('Sigue explorando', t, '') + '<ul class="relacionadas">' + it.map(link).join('') + '</ul>');
}

/* ---------- Schema.org ---------- */
function schemaJson(p) {
  const url = abs(p.ruta);
  const sameAs = redes.filter(([, r]) => r.url).map(([, r]) => r.url);
  const agente = {
    '@type': 'RealEstateAgent', '@id': base + '/#negocio', name: site.marca.nombre, legalName: site.marca.nombre_empresa,
    url: base + '/', telephone: site.contacto.telefono_enlace, email: site.contacto.email,
    areaServed: [...site.territorio.map((c) => ({ '@type': 'City', name: c.nombre, containedInPlace: { '@type': 'AdministrativeArea', name: 'Asturias' } })), { '@type': 'Country', name: 'España' }]
  };
  if (assetExists(site.seo.og_imagen)) agente.image = abs(site.seo.og_imagen);
  
  if (sameAs.length) agente.sameAs = sameAs;
  const g = [agente];
  if (p.tipo === 'home') g.push({ '@type': 'WebSite', '@id': base + '/#web', url: base + '/', name: site.marca.nombre, inLanguage: 'es', publisher: { '@id': agente['@id'] } });
  if (['servicio', 'servicio-ciudad', 'barrio'].includes(p.tipo)) {
    const c = terr[p.ciudad]; const z = c && p.zona ? c.zmap[p.zona] : null;
    const area = p.tipo === 'servicio' ? { '@type': 'AdministrativeArea', name: 'Asturias' }
      : p.tipo === 'barrio' ? { '@type': 'Place', name: (z.centro ? 'Centro' : z.nombre) + ', ' + c.nombre }
      : { '@type': 'City', name: c.nombre };
    g.push({ '@type': 'Service', '@id': url + '#servicio', name: p.h1, description: p.description, url, provider: { '@id': agente['@id'] }, serviceType: nombreServ[p.servicio] || p.etiqueta, areaServed: area });
  }
  if (p.id === 'contacto') g.push({ '@type': 'ContactPage', '@id': url + '#pagina', url, name: p.title });
  if (p.id === 'sobre-nosotros') g.push({ '@type': 'AboutPage', '@id': url + '#pagina', url, name: p.title });
  g.push({ '@type': 'BreadcrumbList', itemListElement: cadena(p).map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.etiqueta, item: abs(x.ruta) })) });
  if (p.faqs && p.faqs.length) g.push({ '@type': 'FAQPage', mainEntity: p.faqs.map((f) => ({ '@type': 'Question', name: f.pregunta, acceptedAnswer: { '@type': 'Answer', text: f.respuesta } })) });
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': g }).replace(/</g, '\\u003c');
}

/* ---------- Render ---------- */
const F = site.formulario;
const missing = new Set();
function fill(t, vars) { return t.replace(/\{\{(\w+)\}\}/g, (m, k) => { if (!(k in vars)) { missing.add(k); return m; } return vars[k]; }); }

function render(p) {
  const K = site.contacto_bloques || {};
  const kb = (p.tipo === 'academy' ? K.academy : ((K.por_consulta || {})[p.consulta_defecto] || K.general)) || {};
  const cta = p.cta || (p.tipo === 'academy' ? 'Quiero formarme con vosotros' : ctaDe(p));
  const tieneOgImagen = assetExists(site.seo.og_imagen);
  const ogMeta = tieneOgImagen
    ? '<meta property="og:image" content="' + esc(abs(site.seo.og_imagen)) + '">\n<meta property="og:image:width" content="' + site.seo.og_ancho + '">\n<meta property="og:image:height" content="' + site.seo.og_alto + '">\n<meta name="twitter:image" content="' + esc(abs(site.seo.og_imagen)) + '">'
    : '';
  const wa = site.whatsapp;
  const vars = {
    title: esc(p.title), description: esc(p.description), robots: p.estado === 'listo' ? esc(site.seo.robots_defecto) : 'noindex, nofollow',
    canonical: esc(abs(p.ruta)), favicon_html: assetExists(site.marca.favicon) ? '<link rel="icon" type="image/svg+xml" href="' + esc(site.marca.favicon) + '">' : '', locale: esc(site.seo.locale), marca: esc(site.marca.nombre),
    og_meta: ogMeta, twitter_card: esc(site.seo.twitter_card),
    schema_json: schemaJson(p), consulta_defecto: esc(p.consulta_defecto), titulo_corto: esc(p.h1),
    whatsapp_numero: esc(site.contacto.whatsapp_numero), whatsapp_mensaje: esc(wa.mensaje_base), whatsapp_aria: esc(wa.aria_label),
    logo_html: logoHtml(),
    nav_principal: navHtml(p), cta_nav_href: formHref('vender-vivienda'), cta_nav_texto: esc(site.navegacion.cta.etiqueta),
    hero: heroHtml(p, cta), migas_html: migasHtml(p), contenido: contenidoHtml(p), bloque_proceso: procesoHtml(p), bloque_resenas: resenasHtml(p),
    bloque_faq: faqHtml(p), bloque_relacionadas: relacionadasHtml(p),
    contacto_etiqueta: esc(kb.etiqueta || 'Contacto'), contacto_titulo: esc(kb.titulo || 'Hablemos'), contacto_texto: esc(kb.texto || ''),
    zona_servicio: esc(site.contacto.zona_servicio), cta_href: formDe(p),
    telefono_enlace: esc(site.contacto.telefono_enlace), telefono_visible: esc(site.contacto.telefono_visible), email: esc(site.contacto.email),
    form_boton: esc(kb.boton || cta),
    pie_columnas: pieHtml(), pie_texto_legal: esc(site.pie.texto_legal.replace('{{año}}', new Date().getFullYear()))
  };
  return fill(tpl, vars);
}

/* ---------- Salida ---------- */
const CACHE = path.join(ROOT, '.build-cache.json');
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
const nuevoCache = {};
const generados = new Set();
const validas = new Set(lista.map((p) => p.ruta));
Object.values(FORMS).forEach((f) => validas.add('/pages/' + f.archivo));
const rotos = new Set();
let nListos = 0, nBorr = 0;

if (TODO) fs.rmSync(path.join(ROOT, 'preview'), { recursive: true, force: true });
lista.forEach((p) => {
  const html = render(p);
  const listo = p.estado === 'listo';
  const rel = listo ? (p.carpeta === 'raiz' ? p.archivo : 'pages/' + p.archivo) : 'preview/pages/' + p.archivo;
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  if (listo) {
    nListos++; generados.add(rel);
    const hash = crypto.createHash('sha1').update(html).digest('hex');
    const prev = cache[p.ruta];
    nuevoCache[p.ruta] = { hash, lastmod: prev && prev.hash === hash ? prev.lastmod : today };
  } else nBorr++;
  (html.match(/href="\/[^"#?]*"/g) || []).forEach((h) => {
    const u = h.slice(6, -1).split('?')[0];
    if (/^\/(css|js|img|videos|fonts)\//.test(u)) return;
    if (!validas.has(u)) rotos.add(p.id + ' -> ' + u);
  });
});
fs.writeFileSync(CACHE, JSON.stringify(nuevoCache, null, 2));

/* Formularios pregunta a pregunta: un archivo por tipo de visitante (noindex, fuera del sitemap) */
const tplForm = rd('templates/formulario.html');
Object.entries(FORMS).forEach(([k, f]) => {
  const cfg = Object.assign({ endpoint: F.endpoint, access_key: F.access_key, whatsapp: site.contacto.whatsapp_numero, telefono_visible: site.contacto.telefono_visible, privacidad: '/politicas-privacidad.html', texto_enviar: 'Enviar mi solicitud' }, f); delete cfg.archivo; delete cfg.title; delete cfg.description;
  const html = tplForm.replace(/\{\{(\w+)\}\}/g, (m, key) => ({ title: esc(f.title), description: esc(f.description), logo_html: logoHtml(), telefono_visible: esc(site.contacto.telefono_visible), config_json: JSON.stringify(cfg).replace(/</g, '\\u003c') })[key] ?? m);
  fs.writeFileSync(path.join(ROOT, 'pages', f.archivo), html);
  generados.add('pages/' + f.archivo); validas.add('/pages/' + f.archivo);
});
console.log('Generados ' + Object.keys(FORMS).length + ' formularios.');

/* Elimina de /pages/ lo que ya no se genera (p. ej. un barrio devuelto a borrador) */
const dirPages = path.join(ROOT, 'pages');
if (fs.existsSync(dirPages)) {
  fs.readdirSync(dirPages).filter((f) => f.endsWith('.html')).forEach((f) => {
    if (!generados.has('pages/' + f)) { try { fs.unlinkSync(path.join(dirPages, f)); console.log('Eliminada (ya no se genera): pages/' + f); } catch (e) { warn('No se pudo borrar pages/' + f + ' (ya no se genera): bórrala a mano.'); } }
  });
}

if (missing.size) warn('La plantilla usa marcadores sin valor: ' + [...missing].join(', '));
rotos.forEach((r) => warn('Enlace interno roto: ' + r));
console.log('Generadas ' + nListos + ' páginas' + (TODO ? ' + ' + nBorr + ' borradores en /preview/pages/' : '') + '.');
if (warns.length) { console.log('\nAvisos (' + warns.length + '):'); warns.forEach((w) => console.log(' - ' + w)); }
if (STRICT && warns.length) process.exit(1);
