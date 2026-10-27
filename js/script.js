(function () {
  'use strict';
  var d = document, b = d.body;

  /* Menú móvil y submenús */
  var burger = d.querySelector('.burger'), nav = d.getElementById('nav');
  function cerrarSubs(except) {
    d.querySelectorAll('.tiene-sub > button[aria-expanded="true"]').forEach(function (btn) {
      if (btn === except) return;
      btn.setAttribute('aria-expanded', 'false');
      d.getElementById(btn.getAttribute('aria-controls')).hidden = true;
    });
  }
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var abierto = nav.classList.toggle('abierto');
      burger.setAttribute('aria-expanded', abierto);
      burger.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    });
    nav.querySelectorAll('.tiene-sub > button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var sub = d.getElementById(btn.getAttribute('aria-controls'));
        var abrir = sub.hidden;
        cerrarSubs(btn);
        sub.hidden = !abrir;
        btn.setAttribute('aria-expanded', abrir);
      });
    });
    d.addEventListener('click', function (e) { if (!nav.contains(e.target) && !burger.contains(e.target)) cerrarSubs(); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { cerrarSubs(); nav.classList.remove('abierto'); burger.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* Botón flotante de WhatsApp: mensaje con la página y oculto sobre el formulario */
  var wa = d.querySelector('.wa');
  if (wa) {
    var base = b.getAttribute('data-wa-mensaje') || '', pagina = b.getAttribute('data-titulo');
    var texto = pagina ? base + ' (Página: ' + pagina + ')' : base;
    wa.href = 'https://wa.me/' + b.getAttribute('data-wa-numero') + '?text=' + encodeURIComponent(texto);
    var contacto = d.getElementById('contacto');
    if (contacto && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { wa.classList.toggle('wa--oculto', en[0].isIntersecting); }, { threshold: 0.15 }).observe(contacto);
    }
  }
})();
