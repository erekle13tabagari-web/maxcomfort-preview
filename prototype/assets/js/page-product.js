/* Product page: gallery + lightbox, buy box, colour choice, tabs (description, full
   specification table, delivery and payment, downloads), similar products.
   In Bitrix: catalog.element (colours = the product's trade offers). */
ANDE.page(function (A) {
  'use strict';
  var esc = A.esc, ico = A.ico;
  var p = A.byId(A.param('id'));
  var main = A.$('[data-product]');

  if (!p) {
    main.innerHTML = '<div class="wrap"><div class="empty" style="margin:40px 0 80px"><span class="empty__ico">' + ico('i-search') + '</span><h2>პროდუქტი ვერ მოიძებნა</h2><p>შესაძლოა ბმული მოძველებულია. სცადეთ ძიება ან დაათვალიერეთ კატალოგი.</p><a class="btn btn--primary" href="catalog.html">კატალოგი</a></div></div>';
    return;
  }
  if (String(p.id) !== A.param('id')) history.replaceState(null, '', A.url.product(p.id) + location.hash);   // a merged duplicate's old link
  A.recent.push(p.id);
  var cat = A.findCat(p.cat), sub = A.findSub(p.cat, p.sub);

  /* ---------- crumbs (shared by every colour) ---------- */
  A.$('[data-crumbs]').innerHTML = '<a href="index.html">მთავარი</a>' + ico('i-chev-r') + '<a href="catalog.html">კატალოგი</a>' + ico('i-chev-r') +
    '<a href="' + A.url.catalog(cat.id) + '">' + cat.name + '</a>' + ico('i-chev-r') + '<a href="' + A.url.catalog(cat.id, sub.id) + '">' + sub.name + '</a>';

  var gal = A.$('[data-gallery]'), info = A.$('[data-info]'), bar = A.$('[data-buybar]');
  var imgs = [], cur = 0;

  /* ---------- everything that changes with the colour ---------- */
  function render() {
    document.title = p.name + ' · მაქს კომფორტი';

    // gallery
    imgs = p.imgs.map(function (f, i) { return A.img(p, i); });
    cur = 0;
    gal.style.gridTemplateColumns = '';
    if (!imgs.length) {
      gal.innerHTML = '<div class="gallery__main" style="cursor:default;grid-column:1/-1"><span class="pcard__media" style="background:none;height:100%"><span class="noimg">' + ico('i-box') + '</span></span></div>';
    } else {
      gal.innerHTML = (imgs.length > 1 ? '<div class="gallery__thumbs">' + imgs.map(function (src, i) {
        return '<button class="gallery__thumb" type="button" aria-label="სურათი ' + (i + 1) + '" aria-current="' + (i === 0) + '" data-thumb="' + i + '"><img src="' + src + '" alt=""></button>';
      }).join('') + '</div>' : '<div></div>') +
        '<div class="gallery__main" role="button" tabindex="0" aria-label="სურათის გადიდება" data-main><img src="' + imgs[0] + '" alt="' + esc(p.name) + '">' +
        (imgs.length > 1 ? '<button class="gallery__nav gallery__nav--prev" type="button" aria-label="წინა" data-step="-1">' + ico('i-arrow') + '</button><button class="gallery__nav gallery__nav--next" type="button" aria-label="შემდეგი" data-step="1">' + ico('i-arrow') + '</button><span class="gallery__count" data-gcount>1 / ' + imgs.length + '</span>' : '') +
        '<span class="gallery__zoomhint">' + ico('i-zoom') + 'გადიდება</span></div>';
      if (imgs.length < 2) gal.style.gridTemplateColumns = '1fr';
    }

    // info + colour + buy box
    var key = A.keySpecs(p, 4), warranty = (p.specs.filter(function (s) { return s[0] === 'გარანტია'; })[0] || [])[1];
    var buy = A.canBuy(p);
    info.innerHTML =
      (p.brand ? '<a class="pinfo__brand" href="catalog.html?brand=' + encodeURIComponent(p.brand) + '">' + esc(A.brandName(p.brand)) + '</a>' : '') +
      '<h1>' + esc(p.name) + '</h1>' +
      '<div class="pinfo__meta">' + (p.art ? '<button class="copy" type="button" data-copy="' + esc(p.art) + '" title="კოდის კოპირება">კოდი ' + esc(p.art) + ico('i-copy') + '</button>' : '') +
        '<span class="stock ' + (p.stock ? 'stock--in">მარაგშია' : 'stock--out">შეკვეთით') + '</span>' +
        '<a class="textlink" href="' + A.url.catalog(cat.id, sub.id) + '">' + sub.name + '</a></div>' +
      (key.length ? '<dl class="keyspecs">' + key.map(function (s) { return '<div class="keyspec"><dt>' + A.specIcon(s[0]) + esc(s[0]) + '</dt><dd>' + esc(s[1]) + '</dd></div>'; }).join('') +
        '<a class="link-arrow keyspecs__all" href="#specs">ყველა მახასიათებელი' + ico('i-arrow') + '</a></dl>' : '') +
      (p.variants ? '<div class="pcolors"><p class="pcolors__label">ფერი: <b>' + p.color.n + '</b></p>' + A.swatches(p, 'pcolors__set') + '</div>' : '') +
      '<div class="buybox" data-buybox>' +
        '<div class="buybox__price">' + (p.price ? '<p class="price">' + A.priceHTML(p.price) + '</p><span class="buybox__unit">/ ცალი</span>' : '<p class="price price--ask" style="font-size:20px">ფასი მოთხოვნით</p>') + '</div>' +
        (p.energy ? '<div class="buybox__energy">' + A.energy(p) + (p.docs && p.docs.length ? '<a class="textlink" href="#downloads">ეტიკეტი და საინფორმაციო ცხრილი</a>' : '') + '</div>' : '') +
        (buy
          ? '<div class="buybox__row"><div class="qty" role="group" aria-label="რაოდენობა"><button type="button" aria-label="შემცირება" data-qd="-1">' + ico('i-minus') + '</button><input id="pqty" type="number" min="1" max="99" value="1" inputmode="numeric" aria-label="რაოდენობა"><button type="button" aria-label="გაზრდა" data-qd="1">' + ico('i-plus') + '</button></div>' +
            '<button class="btn btn--primary" type="button" data-add="' + p.id + '" data-qty-from="#pqty">' + ico('i-bag') + '<span>კალათაში დამატება</span></button></div>' +
            '<div class="buybox__sub"><button class="btn btn--soft btn--sm" type="button" data-quick="' + p.id + '">სწრაფი შეკვეთა</button>'
          : '<div class="buybox__row"><button class="btn btn--primary" type="button" data-ask="' + p.id + '">' + ico('i-headset') + '<span>ფასის და ვადის მოთხოვნა</span></button></div><div class="buybox__sub">') +
          '<button class="btn btn--outline btn--sm" type="button" data-wish="' + p.id + '" aria-pressed="' + A.wish.has(p.id) + '">' + ico('i-heart') + 'რჩეული</button>' +
          '<button class="btn btn--outline btn--sm" type="button" data-compare="' + p.id + '" aria-pressed="' + A.compare.has(p.id) + '">' + ico('i-bars') + 'შედარება</button></div>' +
        '<p class="buybox__note">' + ico('i-info') + (p.stock ? 'მიწოდება მისამართზე ან გატანა ჩვენი შოურუმებიდან.' : 'პროდუქტი შეკვეთით მოდის. ვადას და ფასს შეგითანხმებთ.') + '</p>' +
      '</div>' +
      '<div class="assure">' +
        '<div class="assure__item">' + ico('i-shield') + '<b>' + (warranty ? 'გარანტია ' + esc(warranty) : 'ოფიციალური გარანტია') + '</b>საგარანტიო მომსახურება</div>' +
        '<div class="assure__item">' + ico('i-truck') + '<b>მიწოდება</b>ან გატანა 3 შოურუმიდან</div>' +
        '<div class="assure__item">' + ico('i-headset') + '<b>კონსულტაცია</b><a class="textlink" href="tel:+995322152152">0322 152 152</a></div>' +
      '</div>';

    // description
    var paras = (p.desc || '').split('\n').filter(Boolean);
    A.$('#tab-about').hidden = !paras.length && !p.feats.length;
    A.$('[data-desc]').innerHTML = paras.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') +
      (p.feats.length ? '<ul class="feats">' + p.feats.map(function (f) { return '<li>' + ico('i-check') + '<span>' + esc(f) + '</span></li>'; }).join('') + '</ul>' : '');

    // specifications
    var rows = [['ბრენდი', A.brandName(p.brand)], ['კოდი', p.art], ['კატეგორია', cat.name + ' / ' + sub.name], ['ტიპი', p.type], ['ფერი', p.color ? p.color.n : ''], ['ენერგოეფექტურობის კლასი', p.energy ? [p.energy.c, p.energy.h].filter(Boolean).join(' / ') : ''], ['ხელმისაწვდომობა', p.stock ? 'მარაგშია' : 'შეკვეთით']]
      .filter(function (r) { return r[1]; });
    A.$('[data-specs]').innerHTML =
      (p.specs.length ? '<table class="spectable"><caption>ტექნიკური მახასიათებლები</caption><tbody>' + p.specs.map(function (s) { return '<tr><th scope="row">' + esc(s[0]) + '</th><td>' + esc(s[1]) + '</td></tr>'; }).join('') + '</tbody></table>' : '') +
      '<table class="spectable" style="margin-top:' + (p.specs.length ? '28px' : '0') + '"><caption>ზოგადი ინფორმაცია</caption><tbody>' + rows.map(function (r) { return '<tr><th scope="row">' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</tbody></table>';

    // downloads (energy label, information sheet, manuals): the tab is there only when there are files
    var hasDocs = !!(p.docs && p.docs.length);
    A.$('#tab-downloads').hidden = !hasDocs;
    A.$('[data-downloads]').innerHTML = hasDocs ? A.docs(p) : '';

    // mobile buy bar
    bar.innerHTML = (p.price ? '<p class="price">' + A.priceHTML(p.price) + '</p>' : '<p class="price price--ask">ფასი მოთხოვნით</p>') + A.energy(p, 'sm') +
      (buy ? '<button class="btn btn--primary" type="button" data-add="' + p.id + '" data-qty-from="#pqty">' + ico('i-bag') + '<span>კალათაში</span></button>'
           : '<button class="btn btn--primary" type="button" data-ask="' + p.id + '">' + ico('i-headset') + '<span>მოთხოვნა</span></button>');
    if (barWatch) { barWatch.disconnect(); barWatch.observe(A.$('[data-buybox]')); }
  }

  /* ---------- gallery controls ---------- */
  function go(i) {
    cur = (i + imgs.length) % imgs.length;
    var im = A.$('[data-main] img', gal); im.style.opacity = 0;
    setTimeout(function () { im.src = imgs[cur]; im.style.opacity = 1; }, 120);
    A.$$('[data-thumb]', gal).forEach(function (t, k) { t.setAttribute('aria-current', String(k === cur)); });
    var c = A.$('[data-gcount]', gal); if (c) c.textContent = (cur + 1) + ' / ' + imgs.length;
  }
  gal.addEventListener('click', function (e) {
    var t = e.target.closest('[data-thumb],[data-step],[data-main]'); if (!t) return;
    if (t.hasAttribute('data-thumb')) go(+t.getAttribute('data-thumb'));
    else if (t.hasAttribute('data-step')) { e.stopPropagation(); go(cur + +t.getAttribute('data-step')); }
    else A.openLightbox(imgs, cur);
  });
  gal.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') go(cur + 1); else if (e.key === 'ArrowLeft') go(cur - 1);
    else if ((e.key === 'Enter' || e.key === ' ') && e.target.hasAttribute('data-main')) { e.preventDefault(); A.openLightbox(imgs, cur); }
  });

  /* ---------- quantity and colour (buy box) ---------- */
  info.addEventListener('click', function (e) {
    var sw = e.target.closest('[data-variant]');
    if (sw) {
      var v = A.byId(sw.getAttribute('data-variant'));
      if (!v || v === p) return;
      p = v;
      render();
      A.caps(info); A.caps(A.$('[data-ptabs]')); A.caps(bar);
      history.replaceState(null, '', A.url.product(p.id) + location.hash);
      if (A.$('[role="tab"][aria-selected="true"]').hidden) showTab('');
      var f = A.$('[data-variant="' + p.id + '"]', info); if (f) f.focus();
      return;
    }
    var b = e.target.closest('[data-qd]'), qty = A.$('#pqty'); if (!b || !qty) return;
    qty.value = Math.max(1, Math.min(99, (parseInt(qty.value, 10) || 1) + +b.getAttribute('data-qd')));
  });
  info.addEventListener('change', function (e) {
    if (e.target.id === 'pqty') e.target.value = Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 1));
  });

  /* ---------- buy bar follows the buy box out of view ---------- */
  var barWatch = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    var off = !es[0].isIntersecting && es[0].boundingClientRect.top < 0;
    bar.classList.toggle('is-on', off);
    A.setFabLift(off && matchMedia('(max-width:860px)').matches ? 70 : 0);
  }) : null;

  render();

  /* ---------- related: other models, each once ---------- */
  function rail(sel, list) {
    var box = A.$(sel); if (!box) return;
    if (!list.length) { box.closest('.psec').remove(); return; }
    var track = A.$('.rail__track', box);
    track.innerHTML = list.map(A.card).join('');
    var sec = box.closest('.psec'), prev = A.$('.prev', sec), next = A.$('.next', sec);
    function upd() { if (!prev) return; prev.disabled = track.scrollLeft < 8; next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8; }
    if (prev) {
      prev.addEventListener('click', function () { track.scrollBy({ left: -track.clientWidth, behavior: 'smooth' }); });
      next.addEventListener('click', function () { track.scrollBy({ left: track.clientWidth, behavior: 'smooth' }); });
      track.addEventListener('scroll', upd, { passive: true }); setTimeout(upd, 50);
    }
  }
  function other(x) { return x && x !== p && !(p.variants && p.variants.indexOf(x) > -1); }
  var similar = A.collapse(A.products.filter(function (x) { return other(x) && x.sub === p.sub; }).sort(function (a, b) { return (b.stock - a.stock) || ((!!b.price) - (!!a.price)); })).slice(0, 12);
  rail('[data-similar]', similar);
  var seen = A.collapse(A.recent.list().map(A.byId).filter(other)).slice(0, 8);
  rail('[data-recent]', seen);

  /* ---------- tabs: description, specifications, delivery, downloads ---------- */
  var tabbox = A.$('[data-ptabs]'), tabbar = A.$('.pnav', tabbox), tabs = A.$$('[role="tab"]', tabbox);
  var tabrow = A.$('[role="tablist"]', tabbox);
  function shown() { return tabs.filter(function (t) { return !t.hidden; }); }
  function showTab(id, focus) {
    var list = shown();
    var hit = list.filter(function (t) { return t.getAttribute('aria-controls') === id; })[0] || list[0];
    tabs.forEach(function (t) {
      var on = t === hit;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      A.$('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) hit.focus({ preventScroll: true });
    // on a phone the row scrolls sideways: bring the chosen tab to the middle
    var x = hit.getBoundingClientRect().left - tabrow.getBoundingClientRect().left + tabrow.scrollLeft;
    tabrow.scrollTo({ left: x - (tabrow.clientWidth - hit.offsetWidth) / 2, behavior: 'smooth' });
  }
  function rowEdge() { tabrow.classList.toggle('is-more', tabrow.scrollLeft + tabrow.clientWidth < tabrow.scrollWidth - 4); }
  tabrow.addEventListener('scroll', rowEdge, { passive: true });
  window.addEventListener('resize', rowEdge);
  rowEdge();
  // brings the tab bar back to the top of the screen when the reader is further down
  function toTabs(always) {
    var stick = parseFloat(getComputedStyle(tabbar).top) || 0, top = tabbox.getBoundingClientRect().top;
    if (always || top < stick) window.scrollTo(0, window.scrollY + top - stick);
  }
  function isTab(id) { return shown().some(function (t) { return t.getAttribute('aria-controls') === id; }); }
  tabbar.addEventListener('click', function (e) {
    var t = e.target.closest('[role="tab"]'); if (!t) return;
    var id = t.getAttribute('aria-controls');
    showTab(id); toTabs(false);
    history.replaceState(null, '', '#' + id);
  });
  tabbar.addEventListener('keydown', function (e) {
    var list = shown(), i = list.indexOf(document.activeElement); if (i < 0) return;
    var n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: list.length - 1 }[e.key];
    if (n === undefined) return;
    e.preventDefault();
    var t = list[(n + list.length) % list.length];
    showTab(t.getAttribute('aria-controls'), true);
    history.replaceState(null, '', '#' + t.getAttribute('aria-controls'));
  });
  // links such as "ყველა მახასიათებელი" (#specs) open their tab
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a || a.closest('[role="tablist"]')) return;
    var id = a.getAttribute('href').slice(1); if (!isTab(id)) return;
    e.preventDefault(); showTab(id); toTabs(true);
    history.replaceState(null, '', '#' + id);
  });
  var start = location.hash.slice(1);
  showTab(isTab(start) ? start : '');
  if (isTab(start)) setTimeout(function () { toTabs(true); }, 60);
  window.addEventListener('hashchange', function () { var id = location.hash.slice(1); if (isTab(id)) { showTab(id); toTabs(true); } });
});
