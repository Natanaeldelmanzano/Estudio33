/* Estudio 33 Real Estate · formulario pregunta a pregunta (Web3Forms) */
(function () {
  'use strict';
  var d = document;
  var cfg = JSON.parse(d.getElementById('config-formulario').textContent);
  var escena = d.getElementById('escena');
  var barra = d.getElementById('progreso');
  var btnSig = d.getElementById('siguiente');
  var btnAtras = d.getElementById('atras');
  var params = new URLSearchParams(location.search);
  var respuestas = {};
  var reducir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Pantallas: bienvenida + preguntas + gracias */
  var pantallas = [{ tipo: 'bienvenida' }].concat(cfg.preguntas).concat([{ tipo: 'gracias' }]);
  var nPreg = cfg.preguntas.length;
  var actual = 0, ocupado = false;

  /* Respuesta inicial desde el botón que trajo al usuario (?motivo=vender) */
  var motivo = params.get('motivo');
  cfg.preguntas.forEach(function (q) {
    if (q.desde_url && motivo) q.opciones.forEach(function (o) { if (o.valor === motivo) { respuestas[q.campo] = o.valor; respuestas[q.campo + "__texto"] = o.etiqueta; } });
  });

  function el(tag, cls, txt) { var e = d.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function nombre() { return (respuestas.nombre || '').trim().split(/\s+/)[0] || ''; }
  function plantilla(t) { return String(t || '').replace(/\{nombre\}/g, nombre()); }

  function valido(q) {
    var v = (respuestas[q.campo] || '').trim();
    if (q.tipo === 'opciones') return !!v;
    if (q.tipo === 'texto') return v.length >= 2;
    if (q.tipo === 'telefono') return /^(\+?\d[\d\s.-]{7,15}\d)$/.test(v) && v.replace(/\D/g, '').length >= 9;
    if (q.tipo === 'email') return v === '' ? !q.obligatorio : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    if (q.tipo === 'final') return respuestas.consentimiento === 'si';
    return true;
  }

  function construir(i) {
    var p = pantallas[i];
    var s = el('section', 'paso');
    s.setAttribute('aria-live', 'polite');
    var caja = el('div', 'paso__caja');
    s.appendChild(caja);

    if (p.tipo === 'bienvenida') {
      var b = cfg.bienvenida;
      caja.appendChild(el('p', 'paso__etiqueta', b.etiqueta));
      caja.appendChild(el('h1', 'paso__titulo', b.titulo));
      caja.appendChild(el('p', 'paso__texto', b.texto));
      if (b.puntos) { var ul = el('ul', 'paso__puntos'); b.puntos.forEach(function (t) { ul.appendChild(el('li', '', t)); }); caja.appendChild(ul); }
      return s;
    }
    if (p.tipo === 'gracias') {
      var g = cfg.gracias;
      caja.classList.add('paso__caja--gracias');
      caja.appendChild(el('div', 'sello', '33'));
      caja.appendChild(el('h1', 'paso__titulo', plantilla(g.titulo)));
      caja.appendChild(el('p', 'paso__texto', plantilla(g.texto)));
      if (g.puntos) { var ul2 = el('ul', 'paso__puntos'); g.puntos.forEach(function (t) { ul2.appendChild(el('li', '', plantilla(t))); }); caja.appendChild(ul2); }
      var acc = el('div', 'paso__acciones');
      var a1 = el('a', 'pildora', g.boton || 'Volver a la web'); a1.href = '/'; acc.appendChild(a1);
      var wa = el('a', 'enlace-suave', 'Escribir por WhatsApp'); wa.href = 'https://wa.me/' + cfg.whatsapp + '?text=' + encodeURIComponent('Hola, soy ' + (respuestas.nombre || '') + '. Acabo de enviar el formulario de ' + cfg.nombre + '.'); wa.target = '_blank'; wa.rel = 'noopener'; acc.appendChild(wa);
      caja.appendChild(acc);
      return s;
    }

    var num = cfg.preguntas.indexOf(p) + 1;
    caja.appendChild(el('p', 'paso__etiqueta', 'Pregunta ' + num + ' de ' + nPreg));
    var idT = 'q-' + p.campo;
    var h = el('h1', 'paso__titulo', plantilla(p.pregunta)); h.id = idT; caja.appendChild(h);
    if (p.ayuda) caja.appendChild(el('p', 'paso__texto', plantilla(p.ayuda)));

    if (p.tipo === 'opciones') {
      var grupo = el('div', 'opciones' + (p.opciones.length > 5 ? ' opciones--rejilla' : ''));
      grupo.setAttribute('role', 'radiogroup'); grupo.setAttribute('aria-labelledby', idT);
      p.opciones.forEach(function (o) {
        var bt = el('button', 'opcion', o.etiqueta);
        bt.type = 'button'; bt.setAttribute('role', 'radio');
        var marcado = respuestas[p.campo] === o.valor;
        bt.setAttribute('aria-checked', marcado ? 'true' : 'false');
        bt.addEventListener('click', function () {
          respuestas[p.campo] = o.valor; respuestas[p.campo + '__texto'] = o.etiqueta;
          grupo.querySelectorAll('.opcion').forEach(function (x) { x.setAttribute('aria-checked', 'false'); });
          bt.setAttribute('aria-checked', 'true');
          estado();
        });
        grupo.appendChild(bt);
      });
      caja.appendChild(grupo);
    } else if (p.tipo === 'final') {
      var lab = el('label', 'consentimiento');
      var chk = d.createElement('input'); chk.type = 'checkbox'; chk.checked = respuestas.consentimiento === 'si';
      chk.addEventListener('change', function () { respuestas.consentimiento = chk.checked ? 'si' : ''; estado(); });
      var sp = el('span', '');
      sp.innerHTML = 'He leído y acepto la <a href="' + cfg.privacidad + '" target="_blank" rel="noopener">política de privacidad</a> y consiento que Estudio 33 Real Estate me contacte para atender mi solicitud.';
      lab.appendChild(chk); lab.appendChild(sp); caja.appendChild(lab);
      caja.appendChild(el('p', 'paso__error', ''));
      var det = el('details', 'resumen');
      det.appendChild(el('summary', '', 'Ver mis respuestas'));
      cfg.preguntas.forEach(function (q) {
        if (q.tipo === 'final' || !respuestas[q.campo]) return;
        var fila = el('p', '');
        fila.appendChild(el('span', '', q.corto || q.campo));
        fila.appendChild(el('strong', '', respuestas[q.campo + '__texto'] || respuestas[q.campo]));
        det.appendChild(fila);
      });
      caja.appendChild(det);
    } else {
      var inp = d.createElement('input');
      inp.className = 'campo';
      inp.type = p.tipo === 'telefono' ? 'tel' : p.tipo === 'email' ? 'email' : 'text';
      inp.autocomplete = p.tipo === 'telefono' ? 'tel' : p.tipo === 'email' ? 'email' : 'name';
      if (p.tipo === 'telefono') inp.inputMode = 'tel';
      inp.placeholder = p.marcador || '';
      inp.value = respuestas[p.campo] || '';
      inp.setAttribute('aria-labelledby', idT);
      inp.addEventListener('input', function () { respuestas[p.campo] = inp.value; estado(); });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); avanzar(); } });
      caja.appendChild(inp);
      if (p.tipo === 'email' && !p.obligatorio) caja.appendChild(el('p', 'paso__nota', 'Opcional. Puedes dejarlo en blanco.'));
    }
    return s;
  }

  function estado() {
    var p = pantallas[actual];
    var esPreg = p.tipo !== 'bienvenida' && p.tipo !== 'gracias';
    btnSig.hidden = p.tipo === 'gracias';
    btnAtras.hidden = actual === 0 || p.tipo === 'gracias';
    btnSig.disabled = esPreg ? !valido(p) : false;
    btnSig.textContent = p.tipo === 'bienvenida' ? cfg.bienvenida.boton : p.tipo === 'final' ? cfg.texto_enviar : (p.tipo === 'email' && !(respuestas.email || '').trim() ? 'Omitir y seguir' : 'Siguiente');
    var pct = p.tipo === 'gracias' ? 100 : (cfg.preguntas.indexOf(p) + (esPreg ? 0 : 0)) / nPreg * 100;
    barra.style.width = Math.max(0, pct) + '%';
  }

  function mostrar(i, dir) {
    if (ocupado) return;
    var viejo = escena.querySelector('.paso');
    var nuevo = construir(i);
    actual = i;
    if (!viejo || reducir) {
      if (viejo) viejo.remove();
      escena.appendChild(nuevo); estado(); enfocar(nuevo); return;
    }
    ocupado = true;
    nuevo.classList.add(dir > 0 ? 'entra-dcha' : 'entra-izda');
    escena.appendChild(nuevo);
    void nuevo.offsetWidth;
    viejo.classList.add(dir > 0 ? 'sale-izda' : 'sale-dcha');
    nuevo.classList.remove('entra-dcha', 'entra-izda');
    estado();
    setTimeout(function () { viejo.remove(); ocupado = false; enfocar(nuevo); }, 520);
  }
  function enfocar(s) {
    var f = s.querySelector('input.campo') || s.querySelector('.opcion[aria-checked="true"]') || s.querySelector('.opcion') || s.querySelector('h1');
    if (f) { if (f.tagName === 'H1') f.setAttribute('tabindex', '-1'); f.focus({ preventScroll: true }); }
  }

  function avanzar() {
    var p = pantallas[actual];
    if (p.tipo !== 'bienvenida' && !valido(p)) return;
    if (p.tipo === 'final') return enviar();
    mostrar(actual + 1, 1);
  }

  function enviar() {
    var err = escena.querySelector('.paso__error');
    btnSig.disabled = true; btnSig.textContent = 'Enviando…';
    var datos = {
      access_key: cfg.access_key,
      subject: cfg.asunto + ' · ' + (respuestas.nombre || ''),
      from_name: 'Web Estudio 33 Real Estate',
      formulario: cfg.nombre,
      pagina_origen: params.get('desde') || d.referrer || '',
      botcheck: d.getElementById('botcheck').checked
    };
    if (datos.botcheck) return;
    delete datos.botcheck;
    cfg.preguntas.forEach(function (q) {
      if (q.tipo === 'final') return;
      var v = respuestas[q.campo + '__texto'] || respuestas[q.campo] || '';
      datos[q.etiqueta_envio || q.campo] = v;
    });
    if (respuestas.email) datos.email = respuestas.email;
    datos['Consentimiento privacidad'] = 'Sí';
    fetch(cfg.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(datos) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j.success) mostrar(actual + 1, 1); else throw new Error(j.message); })
      .catch(function () {
        if (err) err.textContent = 'No hemos podido enviar tu solicitud. Comprueba tu conexión y pulsa de nuevo, o escríbenos por WhatsApp al ' + cfg.telefono_visible + '.';
        btnSig.disabled = false; btnSig.textContent = cfg.texto_enviar;
      });
  }

  btnSig.addEventListener('click', avanzar);
  btnAtras.addEventListener('click', function () { if (actual > 0) mostrar(actual - 1, -1); });
  d.addEventListener('keydown', function (e) {
    var t = e.target;
    if (e.key === 'Enter' && !btnSig.disabled && !btnSig.hidden && (!t || (t.tagName !== 'INPUT' && t.tagName !== 'A' && t.tagName !== 'BUTTON'))) { e.preventDefault(); avanzar(); }
  });
  mostrar(0, 1);
})();
