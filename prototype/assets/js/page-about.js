/* About: certificates and awards (tabs + full-screen viewer), timeline reveal.
   Certificates are the scans published on the current site (company/სერტიფიკატები). */
ANDE.page(function (A) {
  'use strict';
  var esc = A.esc, DIR = 'assets/img/about/';
  var CERTS = {
    partner: [
      ['mitsubishi', 'Mitsubishi Electric', 'ოფიციალური დისტრიბუტორი'], ['tiemme', 'Tiemme', 'ავტორიზებული დილერი'],
      ['emtas', 'Emtaş', 'დისტრიბუციის სერტიფიკატი'], ['fado', 'Fado', 'ოფიციალური დილერი'],
      ['hajdu', 'Hajdu', 'ოფიციალური პარტნიორი'], ['metsan', 'Metsan', 'პარტნიორობის სერტიფიკატი'],
      ['ragaini', 'Gruppo Ragaini', 'პარტნიორობის სერტიფიკატი'], ['aquapipe', 'Aquapipe', 'პარტნიორობის სერტიფიკატი'],
      ['maco', 'Maco', 'დისტრიბუციის სერტიფიკატი'], ['hitte', 'Hitte', 'ავტორიზებული დისტრიბუტორი']
    ],
    award: [
      ['award-2020', '2020', 'ეროვნული სერტიფიკატი'], ['award-2019', '2019', 'ეროვნული სერტიფიკატი'],
      ['award-2018', '2018', 'Leader of the Branch'], ['award-2017', '2017', 'საერთაშორისო სერტიფიკატი'],
      ['award-2016-1', '2016', 'საერთაშორისო სერტიფიკატი'], ['award-2016-2', '2016', 'საერთაშორისო სერტიფიკატი'],
      ['award-2015-1', '2015', 'წლის იმპორტიორი'], ['award-2015-2', '2015', 'დარგის ლიდერი']
    ]
  };
  var grid = A.$('[data-certs]'), cur = 'partner';
  function render() {
    grid.innerHTML = CERTS[cur].map(function (c, i) {
      return '<button class="cert" type="button" data-cert="' + i + '" aria-label="' + esc(c[1] + ', ' + c[2]) + ': გადიდება">' +
        '<span class="cert__img"><img src="' + DIR + c[0] + '-t.webp" alt="" loading="lazy"></span>' +
        '<span class="cert__name">' + esc(c[1]) + '<small>' + esc(c[2]) + '</small></span></button>';
    }).join('');
  }
  A.$$('[data-cert-tab]').forEach(function (t) {
    t.addEventListener('click', function () {
      cur = t.getAttribute('data-cert-tab');
      A.$$('[data-cert-tab]').forEach(function (b) { b.setAttribute('aria-selected', String(b === t)); });
      render();
    });
  });
  grid.addEventListener('click', function (e) {
    var b = e.target.closest('[data-cert]'); if (!b) return;
    A.openLightbox(CERTS[cur].map(function (c) { return DIR + c[0] + '.webp'; }), +b.getAttribute('data-cert'));
  });
  render();

  /* timeline entries rise in as they scroll into view */
  var tl = A.$('[data-timeline]');
  if (tl && 'IntersectionObserver' in window && !A.reduceMotion) {
    tl.classList.add('js-reveal');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    A.$$('.tl', tl).forEach(function (li) { io.observe(li); });
  }
});
