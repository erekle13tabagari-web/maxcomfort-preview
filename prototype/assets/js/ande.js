/* ==========================================================================
   ANDE storefront prototype: shared behaviour for every page.
   Exposes window.ANDE for the page scripts (page-*.js). No libraries.
   Load order on every page: data.js, layout.js, ande.js, page-*.js
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, root) { return (root || document).querySelector(s); }
  function $$(s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) {
    var r = Math.round(n * 100) / 100, s = (r % 1 ? r.toFixed(2) : String(r)).split('.');
    return s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (s[1] ? ',' + s[1] : '') + ' ₾';
  }
  function priceHTML(n) { var m = money(n); return m.slice(0, -2) + ' <small>₾</small>'; }
  function ico(id, cls) { return '<svg class="ico' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  function param(k) { return new URLSearchParams(location.search).get(k); }

  /* ---------------- storage (falls back to memory if blocked) ---------------- */
  var mem = {};
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('ande-' + k); return v ? JSON.parse(v) : d; } catch (e) { return mem[k] || d; } },
    set: function (k, v) { mem[k] = v; try { localStorage.setItem('ande-' + k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------------- theme ---------------- */
  var root = document.documentElement;
  function setTheme(t) {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('ande-theme', t); } catch (e) {}
    var m = $('meta[name="theme-color"]'); if (m) m.content = t === 'dark' ? '#0A1324' : '#11274A';
  }
  if (!root.getAttribute('data-theme')) setTheme(matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  /* ---------------- catalog taxonomy ---------------- */
  var IMG = 'assets/img/categories/';
  // The Bitrix template prints its own tree as window.ANDE_CATALOG (catalog.section.list, template ande_catnav).
  var CATALOG = window.ANDE_CATALOG || [
    { id: 'heating', name: 'გათბობა', icon: 'i-flame', bg: 'bg-heating.webp', img: 'heating-boiler.webp', subs: [
      { id: 'boilers', name: 'ქვაბები', img: 'heating-boiler.webp' },
      { id: 'burners', name: 'სანთურები', img: 'heating-burner.webp' },
      { id: 'radiators', name: 'რადიატორები', icon: 'i-radiator' },
      { id: 'underfloor', name: 'იატაკის გათბობა', img: 'heating-underfloor.webp' },
      { id: 'valves', name: 'ვენტილები და კოლექტორები', icon: 'i-pipe' },
      { id: 'control', name: 'თერმოსტატები', icon: 'i-thermo' } ] },
    { id: 'cooling', name: 'კონდიცირება', icon: 'i-snow', bg: 'bg-cooling.webp', img: 'cooling-outdoor.webp', subs: [
      { id: 'wall', name: 'კედლის კონდიციონერები', img: 'cooling-wall.webp' },
      { id: 'cassette', name: 'კასეტური კონდიციონერები', img: 'cooling-cassette.webp' },
      { id: 'ducted', name: 'არხული კონდიციონერები', img: 'cooling-duct.webp' },
      { id: 'multi', name: 'მულტი სპლიტ სისტემები', img: 'cooling-outdoor.webp' },
      { id: 'cool-acc', name: 'აქსესუარები', icon: 'i-box' } ] },
    { id: 'ventilation', name: 'ვენტილაცია', icon: 'i-fan', bg: 'bg-ventilation.webp', img: 'vent-commercial.webp', subs: [
      { id: 'vent-residential', name: 'საყოფაცხოვრებო', img: 'vent-residential.webp' },
      { id: 'vent-commercial', name: 'კომერციული', img: 'vent-commercial.webp' },
      { id: 'vent-recovery', name: 'რეკუპერატორები', img: 'vent-recovery.webp' },
      { id: 'vent-inline', name: 'არხული ვენტილატორები', img: 'vent-inline.webp' } ] },
    { id: 'ducts', name: 'ჰაერსატარები', icon: 'i-duct', bg: 'bg-air-ducts.webp', img: 'ducts-plenum.webp', subs: [
      { id: 'duct-ducts', name: 'ჰაერსატარები', img: 'ducts-duct.webp' },
      { id: 'duct-grilles', name: 'ცხაურები და დიფუზორები', img: 'ducts-grille.webp' },
      { id: 'duct-acc', name: 'აქსესუარები', img: 'ducts-plenum.webp' } ] },
    { id: 'water', name: 'წყალმომარაგება', icon: 'i-drop', bg: 'bg-water.webp', img: 'heating-water-heater.webp', subs: [
      { id: 'pipes', name: 'მილები და ფიტინგები', icon: 'i-pipe' },
      { id: 'heaters', name: 'წყლის გამაცხელებლები', img: 'heating-water-heater.webp' },
      { id: 'filters', name: 'ფილტრები', icon: 'i-filter' },
      { id: 'tanks', name: 'გამაფართოებელი ავზები', icon: 'i-gauge' },
      { id: 'tools', name: 'ქიმია და ინსტრუმენტები', icon: 'i-flask' } ] }
  ];
  function findCat(id) { for (var i = 0; i < CATALOG.length; i++) if (CATALOG[i].id === id) return CATALOG[i]; return null; }
  function findSub(cat, id) { var c = findCat(cat); if (!c) return null; for (var i = 0; i < c.subs.length; i++) if (c.subs[i].id === id) return c.subs[i]; return null; }

  // Prototype mode: products come from data.js and cart / wishlist / compare live in this browser.
  // Template mode (Bitrix, no data.js): counts, links and suggestions come from Bitrix itself.
  var PROTO = !!window.ANDE_PRODUCTS;
  var PRODUCTS = window.ANDE_PRODUCTS || [];
  var BYID = {};
  PRODUCTS.forEach(function (p) { BYID[p.id] = p; });

  /* ---------------- colour variants ----------------
     One model in several colours is one listing with a colour choice (p.variants, p.color), not a
     card per colour. The prototype finds them in the names: the colour word, or the colour letter
     in a Mitsubishi model code (B/S/W/R). In Bitrix they are the product's trade offers (SKU) with
     a colour property. */
  var COLORS = [
    { k: 'white', n: 'თეთრი', w: ['თეთრი', 'WHITE'], c: 'W', sw: '#FFFFFF' },
    { k: 'silver', n: 'ვერცხლისფერი', w: ['ვერცხლისფერი', 'SILVER'], c: 'S', sw: 'linear-gradient(135deg,#F4F4F6,#A4A6AC)' },
    { k: 'black', n: 'შავი', w: ['შავი', 'BLACK'], c: 'B', sw: 'linear-gradient(135deg,#4A4A50,#111113)' },
    { k: 'red', n: 'წითელი', w: ['წითელი', 'RED'], c: 'R', sw: 'linear-gradient(135deg,#C8323A,#6E0F15)' },
    { k: 'chrome', n: 'ქრომირებული', w: ['ქრომირებული', 'CHROME'], c: '', sw: 'linear-gradient(135deg,#FFFFFF,#9EA3A8 55%,#E6E8EA)' }
  ];
  var MCODE = /\b((?:MSZ\/MUZ|MSZ)-(?:EF\d+VE3|EF\d+VGK|LN\d+VG))([BSWR])\b/;
  function colorOf(name) {
    var words = name.split(/\s+/), i, j, m;
    for (i = 0; i < COLORS.length; i++) for (j = 0; j < COLORS[i].w.length; j++) if (words.indexOf(COLORS[i].w[j]) > -1) return { c: COLORS[i], word: COLORS[i].w[j] };
    if ((m = name.match(MCODE))) for (i = 0; i < COLORS.length; i++) if (COLORS[i].c === m[2]) return { c: COLORS[i], word: null };
    return null;
  }
  if (PROTO) (function () {
    var groups = {};
    PRODUCTS.forEach(function (p) {
      var col = colorOf(p.name); if (!col) return;
      var n = col.word ? p.name.split(/\s+/).filter(function (w) { return w !== col.word; }).join(' ') : p.name;
      var key = p.brand + '|' + p.cat + '|' + n.replace(MCODE, '$1*');
      p.color = col.c;
      (groups[key] = groups[key] || []).push(p);
    });
    Object.keys(groups).forEach(function (key) {
      var g = groups[key], ks = g.map(function (p) { return p.color.k; });
      // one colour is not a choice, and two of the same colour are not variants of each other
      if (g.length < 2 || ks.some(function (k, i) { return ks.indexOf(k) !== i; })) { g.forEach(function (p) { delete p.color; }); return; }
      g.sort(function (a, b) { return COLORS.indexOf(a.color) - COLORS.indexOf(b.color); });
      g.forEach(function (p) { p.variants = g; });
    });
  })();
  // a list with every model once: the first colour met stands for its model
  function collapse(list) {
    var seen = [];
    return list.filter(function (p) {
      if (!p || !p.variants) return !!p;
      if (seen.indexOf(p.variants) > -1) return false;
      seen.push(p.variants); return true;
    });
  }
  function swatchesHTML(p, cls) {
    if (!p.variants) return '';
    return '<span class="' + cls + '" role="group" aria-label="ფერი">' + p.variants.map(function (v) {
      return '<button class="swatch" type="button" style="--sw:' + v.color.sw + '" data-variant="' + v.id + '" aria-pressed="' + (v === p) + '" aria-label="' + v.color.n + '" title="' + v.color.n + '"></button>';
    }).join('') + '</span>';
  }

  // subcategories without a picture of their own borrow their first product's photo
  if (PROTO) CATALOG.forEach(function (c) {
    c.count = 0;
    c.subs.forEach(function (s) {
      var list = PRODUCTS.filter(function (p) { return p.cat === c.id && p.sub === s.id; });
      var models = collapse(list).length;
      s.count = models; c.count += models;
      if (!s.img) { var withImg = list.filter(function (p) { return p.imgs.length && p.imgs[0].indexOf('cat:') !== 0; })[0]; if (withImg) s.prodImg = withImg.imgs[0]; }
    });
  });
  function subImg(s) { return s.pic || (s.img ? IMG + s.img : s.prodImg ? 'assets/img/p/' + s.prodImg : ''); }

  function img(p, i) {
    var f = p && p.imgs && p.imgs[i || 0];
    if (!f) return '';
    return f.indexOf('cat:') === 0 ? IMG + f.slice(4) : 'assets/img/p/' + f;
  }
  var KEY_ORDER = ['სიმძლავრე, kW', 'ფართობი, მ²', 'ინვერტორული', 'საწვავი', 'ქვაბის ტიპი', 'დიამეტრი', 'მასალა', 'სამუშაო ტემპერატურა', 'გარანტია'];
  function keySpecs(p, n) {
    // headline specs: short values only (a sentence is description, not a spec)
    var s = p.specs.filter(function (x) { return x[1] && String(x[1]).length <= 28 && x[0].length <= 26; }).sort(function (a, b) {
      var ia = KEY_ORDER.indexOf(a[0]), ib = KEY_ORDER.indexOf(b[0]);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    return s.slice(0, n || 4);
  }
  /* energy class next to every price (EU-style arrow; clicking it shows the label) and the
     product's documents. p.energy = {c: cooling class, h: heating class, label: image}, p.docs =
     [{t: title, f: file}]; bare file names live in assets/energy/, Bitrix passes full URLs. */
  var ECLS = ['A+++', 'A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];
  function fileHref(f) { return /[\/:]/.test(f) ? f : 'assets/energy/' + f; }
  function energyHTML(p, size) {
    var e = p && p.energy;
    if (!e || !(e.c || e.h)) return '';
    var still = size === 'xs', both = !!(e.c && e.h);
    function arrow(cls, kind) {
      if (!cls) return '';
      var base = cls.replace(/\+/g, ''), plus = cls.length - base.length, i = ECLS.indexOf(cls);
      var txt = (both && !still ? ico(kind === 'c' ? 'i-snow' : 'i-flame') : '') + '<span>' + base + (plus ? '<sup>' + new Array(plus + 1).join('+') + '</sup>' : '') + '</span>';
      var label = 'ენერგოეფექტურობის კლასი ' + cls + (both ? (kind === 'c' ? ' (SEER)' : ' (SCOP)') : '');
      return still
        ? '<span class="eclass eclass--' + i + '" title="' + label + '">' + txt + '</span>'
        : '<button class="eclass eclass--' + i + '" type="button" data-elabel="' + p.id + '" aria-label="' + label + ', ეტიკეტის ნახვა">' + txt + '</button>';
    }
    return '<span class="energy' + (size ? ' energy--' + size : '') + '">' + arrow(e.c, 'c') + arrow(e.h, 'h') + '</span>';
  }
  function docsHTML(p) {
    if (!p.docs || !p.docs.length) return '';
    return '<ul class="docs">' + p.docs.map(function (d) {
      return '<li><a class="doc" href="' + esc(fileHref(d.f)) + '" target="_blank" rel="noopener" download>' + ico('i-download') +
        '<span>' + esc(d.t) + '<small>PDF</small></span></a></li>';
    }).join('') + '</ul>';
  }

  var url = {
    catalog: function (cat, sub, extra) { var q = []; if (cat) q.push('cat=' + cat); if (sub) q.push('sub=' + sub); if (extra) q.push(extra); return 'catalog.html' + (q.length ? '?' + q.join('&') : ''); },
    product: function (id) { return 'product.html?id=' + id; }
  };
  // Bitrix gives every section its own URL; the prototype builds them from ids
  function catHref(c, s) { return s ? (s.url || url.catalog(c.id, s.id)) : (c.url || url.catalog(c.id)); }
  function brandName(b) { return b === 'MITSUBISHI' ? 'Mitsubishi Electric' : b ? b.charAt(0) + b.slice(1).toLowerCase() : ''; }
  function canBuy(p) { return !!(p.price && p.stock); }

  /* ---------------- product card (one markup for every grid) ---------------- */
  function card(p) {
    var src = img(p), specs = keySpecs(p, 4);
    var media = src ? '<img src="' + src + '" alt="' + esc(p.name) + '" loading="lazy" width="640" height="640">' : '<span class="noimg">' + ico('i-box') + '</span>';
    var foot = canBuy(p)
      ? '<p class="price">' + priceHTML(p.price) + '</p><button class="cartbtn" type="button" data-add="' + p.id + '">' + ico('i-bag') + '<span>კალათაში</span></button>'
      : (p.price ? '<p class="price">' + priceHTML(p.price) + '</p>' : '<p class="price price--ask">ფასი მოთხოვნით</p>') +
        '<button class="cartbtn cartbtn--soft" type="button" data-ask="' + p.id + '">' + ico('i-headset') + '<span>მოთხოვნა</span></button>';
    return '<article class="pcard" data-id="' + p.id + '">' +
      '<a class="pcard__media" href="' + url.product(p.id) + '" tabindex="-1" aria-hidden="true">' + media + '</a>' +
      '<div class="pcard__tools">' +
        '<button class="tool" type="button" data-wish="' + p.id + '" aria-pressed="' + wish.has(p.id) + '" aria-label="რჩეულებში">' + ico('i-heart') + '</button>' +
        '<button class="tool" type="button" data-compare="' + p.id + '" aria-pressed="' + compare.has(p.id) + '" aria-label="შედარებაში">' + ico('i-bars') + '</button>' +
      '</div>' +
      '<div class="pcard__body">' +
        '<p class="pcard__brand"><span>' + esc(brandName(p.brand) || ' ') + '</span>' + swatchesHTML(p, 'pcard__colors') + '</p>' +
        '<h3 class="pcard__title"><a href="' + url.product(p.id) + '">' + esc(p.name) + '</a></h3>' +
        (specs.length ? '<dl class="pcard__specs">' + specs.map(function (s) { return '<div><dt>' + esc(s[0]) + '</dt><dd>' + esc(s[1]) + '</dd></div>'; }).join('') + '</dl>' : '') +
        // energy class sits right above the price; on those cards it takes the code's place, so cards stay aligned
        '<p class="pcard__meta"><span class="stock ' + (p.stock ? 'stock--in">მარაგშია' : 'stock--out">შეკვეთით') + '</span>' + (p.energy ? energyHTML(p, 'sm') : p.art ? '<span>კოდი ' + esc(p.art) + '</span>' : '') + '</p>' +
        '<div class="pcard__foot">' + foot + '</div>' +
      '</div></article>';
  }

  /* ---------------- cart / wishlist / compare ---------------- */
  function listStore(key, max) {
    var api = {
      list: function () { return store.get(key, []).filter(function (id) { return BYID[id]; }); },
      has: function (id) { return api.list().indexOf(+id) > -1; },
      toggle: function (id) {
        id = +id; var l = api.list(), i = l.indexOf(id), added = i < 0;
        if (added) { if (max && l.length >= max) return null; l.push(id); } else l.splice(i, 1);
        store.set(key, l); changed(key); return added;
      },
      remove: function (id) { store.set(key, api.list().filter(function (x) { return x !== +id; })); changed(key); },
      clear: function () { store.set(key, []); changed(key); }
    };
    return api;
  }
  var wish = listStore('wish');
  var compare = listStore('compare', 4);
  var cart = {
    items: function () { return store.get('cart', []).filter(function (l) { return BYID[l.id] && canBuy(BYID[l.id]); }); },
    add: function (id, qty) {
      var items = cart.items(), l = items.filter(function (x) { return x.id === +id; })[0];
      if (l) l.qty = Math.min(99, l.qty + (qty || 1)); else items.push({ id: +id, qty: qty || 1 });
      store.set('cart', items); changed('cart');
    },
    set: function (id, qty) {
      var items = cart.items().map(function (l) { if (l.id === +id) l.qty = Math.max(1, Math.min(99, qty)); return l; });
      store.set('cart', items); changed('cart');
    },
    remove: function (id) { store.set('cart', cart.items().filter(function (l) { return l.id !== +id; })); changed('cart'); },
    restore: function (items) { store.set('cart', items); changed('cart'); },
    clear: function () { store.set('cart', []); changed('cart'); },
    count: function () { return cart.items().reduce(function (s, l) { return s + l.qty; }, 0); },
    total: function () { return cart.items().reduce(function (s, l) { return s + l.qty * BYID[l.id].price; }, 0); }
  };
  var recent = {
    push: function (id) { var l = store.get('recent', []).filter(function (x) { return x !== +id; }); l.unshift(+id); store.set('recent', l.slice(0, 12)); },
    list: function () { return store.get('recent', []).filter(function (id) { return BYID[id]; }); }
  };

  function badges(bump) {
    if (!PROTO) return;   // the template prints the real counts
    var n = { cart: cart.count(), wish: wish.list().length, compare: compare.list().length };
    $$('[data-badge]').forEach(function (a) {
      var k = a.getAttribute('data-badge'), b = $('.act__count', a);
      if (!b) return;
      if (b.textContent !== String(n[k]) && bump === k) { a.classList.remove('is-bump'); void a.offsetWidth; a.classList.add('is-bump'); }
      b.textContent = n[k]; b.setAttribute('data-n', n[k]);
    });
    $$('[data-badge-n]').forEach(function (b) { var k = b.getAttribute('data-badge-n'); b.textContent = n[k]; b.setAttribute('data-n', n[k]); });
    $$('[data-cart-total]').forEach(function (el) { el.textContent = money(cart.total()); });
  }
  function changed(type) {
    badges(type);
    document.dispatchEvent(new CustomEvent('ande:change', { detail: { type: type } }));
  }

  /* ---------------------------------------------------------------------
     Georgian capitals, ported from the Biomi site (see ande.css note).
     --------------------------------------------------------------------- */
  var georgianCaps = (function () {
    var GEORGIAN = /[ა-ჿᲐ-Ჿ]/;
    var MTAVRULI = /[Ა-Ჿ]/g;
    var SRC = new WeakMap();
    function isUpper(el) { return el && el.nodeType === 1 && getComputedStyle(el).textTransform === 'uppercase'; }
    function lower(c) { return c.toLowerCase(); }
    function draw(el) {
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      var nodes = [], n;
      while ((n = walker.nextNode())) {
        if (GEORGIAN.test(n.nodeValue) && !n.parentNode.closest('.gt')) nodes.push(n);
      }
      nodes.forEach(function (t) {
        var text = t.nodeValue.replace(MTAVRULI, lower);
        var gk = document.createElement('span'), gt = document.createElement('span');
        gk.className = 'gk'; gt.className = 'gt';
        gk.setAttribute('data-c', text.toUpperCase());
        gt.textContent = text;
        gk.appendChild(gt);
        t.parentNode.replaceChild(gk, t);
        SRC.set(gt, text);
      });
      return nodes.length;
    }
    function run(scope) {
      var r = scope || document;
      var els = r.querySelectorAll ? Array.prototype.slice.call(r.querySelectorAll('*')) : [];
      if (r.nodeType === 1) els.unshift(r);
      els.forEach(function (el) {
        if (!isUpper(el)) return;
        if (el !== r && isUpper(el.parentElement)) return;   // the outermost uppercase element handles its subtree
        if (r.nodeType === 1 && el === r && isUpper(el.parentElement) && el.parentElement.dataset.caps) return;
        if (draw(el)) el.dataset.caps = '1';
      });
    }
    run.text = function (el, text) {
      el.textContent = text;
      if (el.dataset.caps || isUpper(el)) { if (draw(el)) el.dataset.caps = '1'; }
    };
    if (window.MutationObserver && window.WeakMap) {
      new MutationObserver(function (list) {
        list.forEach(function (m) {
          var n = m.target.nodeType === 1 ? m.target : m.target.parentNode;
          var gt = n && n.closest && n.closest('.gt');
          if (gt && SRC.has(gt)) gt.parentNode.classList.toggle('is-tr', gt.textContent !== SRC.get(gt));
        });
      }).observe(document.documentElement, { childList: true, characterData: true, subtree: true });
    }
    return run;
  })();

  /* ---------------- toast ---------------- */
  var toastEl = $('[data-toast]'), toastTimer;
  function toast(html, ms) {
    toastEl.innerHTML = html;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, ms || 3200);
  }

  /* ---------------- modal ---------------- */
  var modal = $('[data-modal]'), modalBody = $('[data-modal-body]'), lastFocus;
  function openModal(html, label) {
    lastFocus = document.activeElement;
    modalBody.innerHTML = html;
    $('.modal__panel', modal).setAttribute('aria-label', label || '');
    modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false');
    root.style.overflow = 'hidden';
    georgianCaps(modalBody);
    setTimeout(function () { var f = $('input,select,textarea,button:not(.modal__close)', modalBody); if (f) f.focus(); }, 60);
  }
  function closeModal() {
    if (!modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true');
    root.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  $$('[data-modal-close]', modal).forEach(function (b) { b.addEventListener('click', closeModal); });

  /* phone: 9 digits, shown as 5XX XX XX XX */
  function fmtPhone(v) {
    var d = v.replace(/\D/g, '').replace(/^995/, '').slice(0, 9);
    return [d.slice(0, 3), d.slice(3, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
  }
  document.addEventListener('input', function (e) {
    if (e.target.matches && e.target.matches('[data-phone]')) e.target.value = fmtPhone(e.target.value);
  });
  function phoneOk(v) { return v.replace(/\D/g, '').length === 9; }
  function fieldErr(input, msg) {
    var f = input.closest('.field'); if (!f) return;
    f.classList.toggle('is-error', !!msg);
    var e = $('.field__err', f); if (!e && msg) { e = document.createElement('span'); e.className = 'field__err'; f.appendChild(e); }
    if (e) e.textContent = msg || '';
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }
  function done(title, text) {
    return '<div class="modal__done"><div class="success__ico">' + ico('i-check') + '</div><h3>' + title + '</h3><p>' + text + '</p>' +
      '<button class="btn btn--primary btn--block" type="button" data-modal-close style="margin-top:20px">დახურვა</button></div>';
  }
  function prodLine(p) { return p ? '<div class="modal__prod"><img src="' + img(p) + '" alt=""><span>' + esc(p.name) + '</span></div>' : ''; }
  function contactForm(kind, p) {
    var t = { quick: ['სწრაფი შეკვეთა', 'დატოვეთ ნომერი და ოპერატორი დაგიკავშირდებათ შეკვეთის დასადასტურებლად.', 'შეკვეთა'],
              ask: ['ფასის მოთხოვნა', 'ფასსა და მიწოდების ვადაზე დაგიკავშირდებით სამუშაო საათებში.', 'მოთხოვნის გაგზავნა'],
              call: ['გადმორეკვის მოთხოვნა', 'დაგვიტოვეთ ნომერი და კონსულტანტი გადმოგირეკავთ.', 'გადმორეკვა'] }[kind];
    return '<h2>' + t[0] + '</h2><p class="modal__lead">' + t[1] + '</p>' + prodLine(p) +
      '<form data-contact="' + kind + '" novalidate>' +
        '<div class="field"><label for="m-name">სახელი <i>*</i></label><input class="input" id="m-name" autocomplete="name"></div>' +
        '<div class="field"><label for="m-phone">ტელეფონი <i>*</i></label><div class="phonefield"><span>+995</span><input class="input" id="m-phone" type="tel" inputmode="numeric" placeholder="5XX XX XX XX" autocomplete="tel-national" data-phone></div></div>' +
        (kind === 'ask' ? '<div class="field"><label for="m-note">კომენტარი</label><textarea id="m-note" rows="3" placeholder="მაგ. საჭირო რაოდენობა"></textarea></div>' : '') +
        '<button class="btn btn--primary btn--block" type="submit">' + t[2] + '</button></form>';
  }
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.matches('[data-contact]')) {
      e.preventDefault();
      var n = $('#m-name', f), ph = $('#m-phone', f), ok = true;
      fieldErr(n, n.value.trim() ? '' : 'შეიყვანეთ სახელი'); ok = ok && !!n.value.trim();
      fieldErr(ph, phoneOk(ph.value) ? '' : 'შეიყვანეთ 9-ნიშნა ნომერი'); ok = ok && phoneOk(ph.value);
      if (!ok) { $('[aria-invalid]', f).focus(); return; }
      var k = f.getAttribute('data-contact');
      modalBody.innerHTML = k === 'quick' ? done('შეკვეთა მიღებულია', 'მადლობა, ' + esc(n.value.trim()) + '! ოპერატორი დაგიკავშირდებათ ნომერზე +995 ' + esc(ph.value) + '.')
        : k === 'ask' ? done('მოთხოვნა გაიგზავნა', 'ფასსა და ვადაზე დაგიკავშირდებით ნომერზე +995 ' + esc(ph.value) + '.')
        : done('მადლობა', 'კონსულტანტი გადმოგირეკავთ სამუშაო საათებში.');
      $$('[data-modal-close]', modalBody).forEach(function (b) { b.addEventListener('click', closeModal); });
      georgianCaps(modalBody);
      return;
    }
    if (f.matches('[data-login-form]')) {
      e.preventDefault();
      var p2 = $('[data-phone]', f);
      if (!phoneOk(p2.value)) { fieldErr(p2, 'შეიყვანეთ 9-ნიშნა ნომერი'); p2.focus(); return; }
      modalBody.innerHTML = done('კეთილი იყოს თქვენი მობრძანება', 'შესვლა და კაბინეტი Bitrix-თან დაკავშირების შემდეგ იმუშავებს.');
      $$('[data-modal-close]', modalBody).forEach(function (b) { b.addEventListener('click', closeModal); });
      georgianCaps(modalBody);
      return;
    }
    if (f.matches('[data-newsletter]')) {
      e.preventDefault();
      var em = $('input', f);
      if (!/^\S+@\S+\.\S+$/.test(em.value)) { em.focus(); toast('<span><b>შეამოწმეთ ელ. ფოსტა</b></span>'); return; }
      f.reset(); toast('<span><b>გამოწერილია</b><em>აქციებს პირველი შეიტყობთ.</em></span>');
    }
  });
  /* sign in with Google / Apple / Facebook. In Bitrix: the socialservices module
     (Google OAuth, Apple ID, Facebook), keys entered in the admin. */
  var SOCIAL = [
    ['google', 'Google', '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>'],
    ['apple', 'Apple', '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>'],
    ['facebook', 'Facebook', '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11.4" fill="#fff"/><path fill="#0866FF" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>']
  ];
  function loginModal(tab) {
    var reg = tab === 'reg';
    openModal('<h2>' + (reg ? 'რეგისტრაცია' : 'შესვლა') + '</h2>' +
      '<div class="seg" role="tablist" style="margin-top:16px"><label><input type="radio" name="lt" ' + (reg ? '' : 'checked') + ' data-login-tab="in"><span>შესვლა</span></label><label><input type="radio" name="lt" ' + (reg ? 'checked' : '') + ' data-login-tab="reg"><span>რეგისტრაცია</span></label></div>' +
      '<div class="oauth">' + SOCIAL.map(function (s) {
        return '<button class="oauth__btn" type="button" data-social="' + s[0] + '" aria-label="' + s[1] + '-ით გაგრძელება">' + s[2] + '<span>' + s[1] + '</span></button>';
      }).join('') + '</div>' +
      '<p class="orline">ან ტელეფონით</p>' +
      '<form data-login-form novalidate style="margin-top:4px">' +
        (reg ? '<div class="field"><label for="l-name">სახელი და გვარი</label><input class="input" id="l-name" autocomplete="name"></div>' : '') +
        '<div class="field"><label for="l-phone">ტელეფონი</label><div class="phonefield"><span>+995</span><input class="input" id="l-phone" type="tel" inputmode="numeric" placeholder="5XX XX XX XX" autocomplete="tel-national" data-phone></div></div>' +
        (reg ? '<div class="field"><label for="l-mail">ელ. ფოსტა</label><input class="input" id="l-mail" type="email" autocomplete="email"></div>' : '') +
        '<div class="field"><label for="l-pass">პაროლი</label><input class="input" id="l-pass" type="password" autocomplete="' + (reg ? 'new' : 'current') + '-password"></div>' +
        (reg ? '' : '<a class="textlink" href="#" style="font-size:13.5px;justify-self:start">დაგავიწყდათ პაროლი?</a>') +
        '<button class="btn btn--primary btn--block" type="submit">' + (reg ? 'რეგისტრაცია' : 'შესვლა') + '</button>' +
      '</form>', reg ? 'რეგისტრაცია' : 'შესვლა');
  }
  document.addEventListener('change', function (e) { if (e.target.matches('[data-login-tab]')) loginModal(e.target.getAttribute('data-login-tab')); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-social]'); if (!b) return;
    var s = SOCIAL.filter(function (x) { return x[0] === b.getAttribute('data-social'); })[0];
    modalBody.innerHTML = done('კეთილი იყოს თქვენი მობრძანება', s[1] + '-ით შესვლა Bitrix-თან დაკავშირების შემდეგ იმუშავებს.');
    $$('[data-modal-close]', modalBody).forEach(function (c) { c.addEventListener('click', closeModal); });
    georgianCaps(modalBody);
  });

  /* ---------------- lightbox ---------------- */
  var lb = $('[data-lightbox]'), lbList = [], lbI = 0;
  function lbShow(i) { lbI = (i + lbList.length) % lbList.length; $('img', lb).src = lbList[lbI]; $('[data-lb-prev]', lb).hidden = $('[data-lb-next]', lb).hidden = lbList.length < 2; }
  function openLightbox(list, i) { lbList = list; lbShow(i || 0); lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false'); root.style.overflow = 'hidden'; $('[data-lb-close]', lb).focus(); }
  function closeLightbox() { lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); root.style.overflow = ''; }
  $('[data-lb-close]', lb).addEventListener('click', closeLightbox);
  $('[data-lb-prev]', lb).addEventListener('click', function () { lbShow(lbI - 1); });
  $('[data-lb-next]', lb).addEventListener('click', function () { lbShow(lbI + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });

  /* ---------------- header: sticky, mega menu, drawer ---------------- */
  var hdr = $('#hdr');
  var mega = $('[data-mega]'), megaCats = $('[data-mega-cats]'), megaBody = $('[data-mega-body]'), megaScrim = $('[data-mega-scrim]');
  var megaMode = null, megaTimer = null;
  megaCats.innerHTML = CATALOG.map(function (c) {
    return '<button class="mega__cat" type="button" role="tab" aria-selected="false" data-cat="' + c.id + '">' + ico(c.icon) + '<span>' + c.name + '</span>' + ico('i-chev-r') + '</button>';
  }).join('');
  function renderMega(id) {
    var c = findCat(id) || CATALOG[0];
    $$('.mega__cat', megaCats).forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.cat === c.id)); });
    megaBody.innerHTML = '<div class="mega__head"><h2 class="mega__title">' + c.name + '</h2><a class="link-arrow" href="' + catHref(c) + '">ყველა პროდუქტი' + ico('i-arrow') + '</a></div>' +
      '<div class="mega__grid">' + c.subs.map(function (s) {
        var src = subImg(s);
        return '<a class="sub" href="' + catHref(c, s) + '"><span class="sub__img">' + (src ? '<img src="' + src + '" alt="" loading="lazy">' : ico(s.icon || 'i-box')) + '</span>' +
          '<span class="sub__name"><span class="sub__label">' + s.name + '</span>' + (s.count != null ? '<small>' + s.count + ' პროდუქტი</small>' : '') + '</span></a>';
      }).join('') + '</div>';
    georgianCaps(megaBody);   // built on hover, after the page-wide caps pass
  }
  // the category the visitor is in, so the menu opens on it
  function currentCat() {
    if (PROTO) return param('cat');
    var hit = CATALOG.filter(function (c) { return c.url && c.url !== '/' && location.pathname.indexOf(c.url) === 0; })[0];
    return hit && hit.id;
  }
  var megaBtn = $('[data-mega-toggle]');
  function openMega(id, mode) {
    clearTimeout(megaTimer); megaMode = mode;
    mega.classList.add('is-open'); megaScrim.classList.add('is-open');
    megaBtn.setAttribute('aria-expanded', 'true');
    var sel = $('.mega__cat[aria-selected="true"]', megaCats);
    renderMega(id || (sel && sel.dataset.cat) || currentCat() || CATALOG[0].id);
  }
  function closeMega() {
    clearTimeout(megaTimer); megaMode = null;
    mega.classList.remove('is-open'); megaScrim.classList.remove('is-open');
    megaBtn.setAttribute('aria-expanded', 'false');
  }
  megaCats.addEventListener('mouseover', function (e) { var b = e.target.closest('.mega__cat'); if (b && b.getAttribute('aria-selected') !== 'true') renderMega(b.dataset.cat); });
  megaCats.addEventListener('click', function (e) { var b = e.target.closest('.mega__cat'); if (b) renderMega(b.dataset.cat); });
  // "კატალოგი": hover opens it, a click keeps it open (or closes it when it already was)
  megaBtn.addEventListener('mouseenter', function () {
    if (matchMedia('(hover: none)').matches || megaMode) return;
    clearTimeout(megaTimer);
    megaTimer = setTimeout(function () { openMega(null, 'hover'); }, 140);
  });
  megaBtn.addEventListener('click', function (e) {
    if (megaMode === 'click') return closeMega();
    openMega(null, 'click');
    if (e.detail === 0) $('.mega__cat[aria-selected="true"]', megaCats).focus();   // opened from the keyboard
  });
  hdr.addEventListener('mouseleave', function () { clearTimeout(megaTimer); if (megaMode === 'hover') megaTimer = setTimeout(closeMega, 220); });
  hdr.addEventListener('mouseenter', function () { if (megaMode === 'hover') clearTimeout(megaTimer); });
  // a click anywhere outside the menu closes it: the dimmed page, the sides, the header
  document.addEventListener('pointerdown', function (e) {
    if (megaMode && !e.target.closest('.mega__panel,[data-mega-toggle]')) closeMega();
  });

  var drawer = $('[data-drawer]'), burger = $('[data-drawer-open]');
  $('[data-drawer-cats]').innerHTML = CATALOG.map(function (c) {
    return '<details class="dacc"><summary>' + ico(c.icon) + c.name + ico('i-chev') + '</summary><ul>' +
      c.subs.map(function (s) { return '<li><a href="' + catHref(c, s) + '">' + s.name + '</a></li>'; }).join('') +
      '<li><a href="' + catHref(c) + '"><b>ყველა: ' + c.name + '</b></a></li></ul></details>';
  }).join('');
  function openDrawer() { drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); burger.setAttribute('aria-expanded', 'true'); root.style.overflow = 'hidden'; setTimeout(function () { $('.drawer__head [data-drawer-close]').focus(); }, 50); }
  function closeDrawer() { if (!drawer.classList.contains('is-open')) return; drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); burger.setAttribute('aria-expanded', 'false'); root.style.overflow = ''; burger.focus(); }
  burger.addEventListener('click', openDrawer);
  $$('[data-drawer-close]').forEach(function (b) { b.addEventListener('click', closeDrawer); });
  $$('.dlinks a', drawer).forEach(function (a) { a.addEventListener('click', function () { if (a.hasAttribute('data-login')) return; closeDrawer(); }); });
  $('[data-search-toggle]').addEventListener('click', function () { if (hdr.classList.toggle('is-searching')) $('#q').focus(); });

  /* ---------------- search with suggestions ---------------- */
  function norm(s) { return String(s).toLowerCase().replace(/[^0-9a-zა-ჰ.\/]+/g, ' ').trim(); }
  PRODUCTS.forEach(function (p) {
    var c = findCat(p.cat), s = findSub(p.cat, p.sub);
    p._hay = norm([p.name, p.brand, brandName(p.brand), p.art, c && c.name, s && s.name, p.type].join(' '));
  });
  function search(q) {
    var toks = norm(q).split(' ').filter(Boolean);
    if (!toks.length) return [];
    return PRODUCTS.map(function (p) {
      var sc = 0;
      for (var i = 0; i < toks.length; i++) {
        var at = p._hay.indexOf(toks[i]); if (at < 0) return null;
        sc += at === 0 || p._hay.charAt(at - 1) === ' ' ? 3 : 1;
      }
      if (p.art && norm(p.art) === norm(q)) sc += 20;
      return { p: p, s: sc + (p.stock ? 1 : 0) + (p.price ? 1 : 0) };
    }).filter(Boolean).sort(function (a, b) { return b.s - a.s; }).map(function (x) { return x.p; });
  }
  function mark(text, q) {
    var t = esc(text);
    norm(q).split(' ').filter(function (w) { return w.length > 1; }).forEach(function (w) {
      t = t.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>');
    });
    return t;
  }
  var qIn = $('#q'), sugg = $('#suggest'), sForm = $('[data-search]'), sIdx = -1, sT;
  if (param('q')) qIn.value = param('q');
  function showSuggest(html) { sugg.innerHTML = html; sugg.hidden = false; sIdx = -1; qIn.setAttribute('aria-expanded', 'true'); }
  /* Template mode: bitrix:search.title answers a POST with ajax_call=y and prints the same
     .suggest__item markup from its ajax.php, so the look and keyboard handling stay shared. */
  function fetchSuggest(q) {
    var ep = sForm.getAttribute('data-suggest'); if (!ep || !window.fetch) return;
    var body = new URLSearchParams(); body.set('ajax_call', 'y'); body.set('INPUT_ID', qIn.id); body.set('q', q); body.set('l', '2');
    fetch(ep, { method: 'POST', body: body, credentials: 'same-origin' }).then(function (r) { return r.text(); }).then(function (html) {
      if (qIn.value.trim() !== q) return;   // an older answer arriving late
      showSuggest(html.trim() || '<p class="suggest__empty">ვერაფერი მოიძებნა: „' + esc(q) + '“</p>');
    }, function () {});
  }
  function renderSuggest() {
    var q = qIn.value.trim();
    if (q.length < 2) { sugg.hidden = true; qIn.setAttribute('aria-expanded', 'false'); return; }
    if (!PROTO) return fetchSuggest(q);
    var res = collapse(search(q)), cats = [];
    CATALOG.forEach(function (c) { c.subs.forEach(function (s) { if (norm(s.name + ' ' + c.name).indexOf(norm(q)) > -1) cats.push([c, s]); }); });
    var html = '';
    if (cats.length) html += '<p class="suggest__label">კატეგორიები</p>' + cats.slice(0, 3).map(function (x) {
      return '<a class="suggest__item" role="option" href="' + url.catalog(x[0].id, x[1].id) + '">' + ico(x[0].icon) + '<span class="suggest__name">' + mark(x[1].name, q) + '<small>' + x[0].name + '</small></span></a>';
    }).join('');
    if (res.length) html += '<p class="suggest__label">პროდუქცია</p>' + res.slice(0, 6).map(function (p) {
      return '<a class="suggest__item" role="option" href="' + url.product(p.id) + '"><img src="' + img(p) + '" alt=""><span class="suggest__name">' + mark(p.name, q) +
        '<small>' + esc(brandName(p.brand)) + (p.art ? ' · ' + esc(p.art) : '') + '</small></span><span class="suggest__price">' + energyHTML(p, 'xs') + (p.price ? money(p.price) : '') + '</span></a>';
    }).join('') + '<a class="suggest__all" href="catalog.html?q=' + encodeURIComponent(q) + '">ყველა შედეგი (' + res.length + ')</a>';
    if (!html) html = '<p class="suggest__empty">ვერაფერი მოიძებნა: „' + esc(q) + '“</p>';
    showSuggest(html);
  }
  qIn.addEventListener('input', function () { clearTimeout(sT); sT = setTimeout(renderSuggest, PROTO ? 110 : 220); });
  qIn.addEventListener('focus', function () { if (qIn.value.trim().length > 1) renderSuggest(); });
  qIn.addEventListener('keydown', function (e) {
    var items = $$('.suggest__item, .suggest__all', sugg);
    if (sugg.hidden || !items.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); sIdx = (sIdx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach(function (it, i) { it.setAttribute('aria-selected', String(i === sIdx)); });
      items[sIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && sIdx > -1) { e.preventDefault(); location.href = items[sIdx].href; }
    else if (e.key === 'Escape') { sugg.hidden = true; }
  });
  document.addEventListener('click', function (e) { if (!sForm.contains(e.target)) sugg.hidden = true; });
  sForm.addEventListener('submit', function (e) { if (!qIn.value.trim()) e.preventDefault(); });

  /* ---------------- floating: back to top ---------------- */
  var totop = $('[data-totop]'), ring = $('.ring .fg', totop), fabs = $('[data-fabs]');
  function onScroll() {
    var y = window.scrollY, max = document.documentElement.scrollHeight - innerHeight;
    hdr.classList.toggle('is-stuck', y > 40);
    totop.classList.toggle('is-on', y > 500);
    ring.style.strokeDashoffset = String(132 - 132 * Math.min(1, y / Math.max(1, max)));
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  totop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); });

  /* ---------------- partner brands ----------------
     Logos: brand/partners/<id>.svg (light mode) and <id>-dark.svg (dark mode), cut from the
     partner logo sheet by tools/brand/split-logos.pl. The page gives the folder in
     data-brands. Website only where the brand's official site is confirmed; the others
     show without a link until Ande sends the address. */
  var BRANDS = [
    ['mitsubishi-electric', 'Mitsubishi Electric', 'https://www.mitsubishielectric.com'],
    ['samsung', 'Samsung', 'https://www.samsung.com'],
    ['riello', 'Riello', 'https://www.riello.com'],
    ['beretta', 'Beretta', 'https://www.berettaclima.it'],
    ['vortice', 'Vortice', 'https://www.vortice.com'],
    ['warmhaus', 'Warmhaus', 'https://www.warmhaus.com'],
    ['tiemme', 'Tiemme', 'https://www.tiemme.com'],
    ['sira', 'Sira Industrie', 'https://www.siragroup.it'],
    ['soprema', 'Soprema', 'https://www.soprema.com'],
    ['izocam', 'İzocam', 'https://www.izocam.com.tr'],
    ['emtas', 'Emtaş', ''],
    ['sakra', 'Sakra', ''],
    ['untes', 'Üntes', ''],
    ['rovall', 'Rovall', ''],
    ['fir', 'FIR', ''],
    ['maco', 'Maco Radiator', ''],
    ['omega', 'Omega', ''],
    ['hitte', 'Hitte', ''],
    ['facot', 'Facot Chemicals', ''],
    ['sk-technik', 'S+K Technik', ''],
    ['teknix', 'Teknix Engineering', ''],
    ['piazza', 'Piazza', ''],
    ['hoffman-plus', 'Hoffman Plus', '']
  ];
  $$('[data-brands]').forEach(function (box) {
    var base = box.getAttribute('data-brands');
    var cells = BRANDS.map(function (b) {
      var logos = '<img class="brand__l" src="' + base + b[0] + '.svg" alt="' + esc(b[1]) + '" loading="lazy">' +
                  '<img class="brand__d" src="' + base + b[0] + '-dark.svg" alt="' + esc(b[1]) + '" loading="lazy">';
      return b[2] ? '<a class="brand" href="' + b[2] + '" target="_blank" rel="noopener" title="' + esc(b[1]) + ' · ოფიციალური საიტი">' + logos + '</a>'
                  : '<span class="brand" title="' + esc(b[1]) + '">' + logos + '</span>';
    });
    // blank cells up to a multiple of 24, so the grid ends in a full row at 8, 6, 4 and 3 columns
    while (cells.length % 24) cells.push('<span class="brand brand--blank" aria-hidden="true"></span>');
    box.innerHTML = cells.join('');
  });

  /* ---------------- floating: support chat (scripted assistant) ---------------- */
  var chat = $('[data-chat]'), chatLog = $('[data-chat-log]'), chatFab = $('.chatfab'), bubble = $('[data-chat-bubble]'), chatStarted = false;
  var STORES = 'ჩვენი შოურუმები თბილისში:\n• წერეთლის გამზირი 114\n• რ. აგლაძის ქუჩა 7ა\n• კოსმონავტების ქუჩა 21\nვმუშაობთ ყოველდღე 10:00-18:00.';
  var INTENTS = [
    // first, so "სად არის ჩემი შეკვეთა" is not read as a delivery question
    { k: ['სტატუს', 'ჩემი შეკვეთ', 'შეკვეთა სად', 'სად არის ჩემი', 'order'], act: 'orders' },
    { k: ['გამარჯ', 'სალამ', 'hello', 'hi', 'hey'], a: 'გამარჯობა! რით შემიძლია დაგეხმაროთ? შემიძლია მოგიძებნოთ პროდუქტი ან გიპასუხოთ მიწოდების, გადახდის და გარანტიის შესახებ.' },
    { k: ['მიწოდ', 'მიტან', 'ტრანსპორტ', 'გატან', 'delivery', 'მოტან'], a: 'შეკვეთის გაფორმების შემდეგ, მომდევნო სამუშაო დღეს დაგიკავშირდებათ ჩვენი წარმომადგენელი და შეგითანხმებთ მიწოდების დეტალებს. პროდუქციის გატანა ასევე შეგიძლიათ ჩვენი შოურუმებიდან.' },
    { k: ['განვადებ', 'სესხ', 'ნაწილ ნაწილ'], a: 'განვადების პირობებზე დაგიკავშირდებათ ჩვენი კონსულტანტი. დაგვიტოვეთ ნომერი ან დაგვირეკეთ 0322 152 152.', cb: true },
    { k: ['გადახდ', 'ბარათ', 'ნაღდ', 'გადარიცხ', 'pay', 'card', 'გადავიხად'], a: 'გადახდა შესაძლებელია საბანკო გადარიცხვით ან ნაღდი ანგარიშსწორებით. დეტალებს შეკვეთის დადასტურებისას შეგითანხმებთ.' },
    { k: ['გარანტ', 'warranty', 'სერვის'], a: 'ვთავაზობთ საგარანტიო და საგარანტიო ვადის შემდგომ მომსახურებას. გარანტიის ვადა პროდუქტზეა დამოკიდებული და მითითებულია მის მახასიათებლებში.' },
    { k: ['მონტაჟ', 'დამონტაჟ', 'ინსტალ', 'პროექტ', 'install', 'დაყენ'], a: 'ვთავაზობთ კონსულტაციას, პროექტირებას და მონტაჟს, როგორც ინდივიდუალურ, ისე კორპორატიულ მომხმარებლებს. დაგვიტოვეთ ნომერი და ინჟინერი დაგიკავშირდებათ.', cb: true },
    { k: ['მაღაზ', 'მისამართ', 'სად ხართ', 'ფილიალ', 'address', 'სამუშაო საათ', 'როდის მუშაობ'], a: STORES },
    { k: ['ოპერატორ', 'ადამიან', 'კონსულტ', 'დარეკ', 'operator'], act: 'live' },
    { k: ['მადლობ', 'thanks', 'thank'], a: 'არაფრის! თუ კიდევ რამე დაგჭირდებათ, აქ ვარ.' }
  ];
  var QUICK = ['მიწოდება', 'გადახდა', 'გარანტია', 'მონტაჟი', 'შოურუმები', 'შეკვეთის სტატუსი', 'ოპერატორი'];

  /* The chat's server side. Template: local/ajax/ande-chat.php (window.ANDE_CHAT) searches the
     catalog, creates CRM leads and reads the customer's orders. Prototype: the same answers are
     made up in the browser, so every flow can be clicked through. */
  var CHATCFG = window.ANDE_CHAT || null, chatToken = null, lastTopic = '';
  function chatApi(action, data) {
    if (!CHATCFG) return demoApi(action, data || {});
    var send = function () {
      var body = new FormData();
      body.append('action', action); body.append('sessid', chatToken || '');
      Object.keys(data || {}).forEach(function (k) { body.append(k, data[k]); });
      return fetch(CHATCFG.url, { method: 'POST', body: body, credentials: 'same-origin' }).then(function (r) { return r.json(); });
    };
    if (chatToken || action === 'init') return send();
    return chatApi('init').then(function (r) { chatToken = r.sessid; CHATCFG.auth = r.auth; CHATCFG.login = r.login; return send(); });
  }
  function demoApi(action, d) {
    var r = { ok: true };
    if (action === 'search') {
      r.items = collapse(search(d.q)).slice(0, 4).map(function (p) { return { id: p.id, name: p.name, url: url.product(p.id), img: img(p), price: p.price ? money(p.price) : null, stock: !!p.stock, energy: p.energy }; });
      r.all = 'catalog.html?q=' + encodeURIComponent(d.q);
    } else if (action === 'lead') r.id = 1000 + Math.floor(Math.random() * 9000);
    else if (action === 'orders') r.auth = false;
    return new Promise(function (res) { setTimeout(function () { res(r); }, 300); });
  }
  // typing dots while the server answers; render(result) returns { text, html, cb, quick }
  function botAsk(promise, render) {
    var t = addMsg('<i></i><i></i><i></i>', 'bot msg--typing', true), t0 = Date.now();
    promise.then(function (r) { if (!r || !r.ok) throw r; return render(r); })
      .catch(function (r) {
        return { text: r && r.error === 'limit' ? 'ძალიან ბევრი მოთხოვნა მოკლე დროში. ცოტა ხანში სცადეთ ან დაგვირეკეთ 0322 152 152.'
                                               : 'კავშირი ვერ დამყარდა. სცადეთ თავიდან ან დაგვირეკეთ 0322 152 152.' };
      })
      .then(function (o) {
        setTimeout(function () {
          t.remove(); addMsg(o.text, 'bot', o.html);
          if (o.cb) addCallback(); if (o.quick) addQuick(o.quick);
        }, Math.max(0, 500 - (Date.now() - t0)));
      });
  }
  function prodList(items, all) {
    return '<span class="chatprods">' + items.map(function (p) {
      return '<a class="chatprod" href="' + esc(p.url) + '">' + (p.img ? '<img src="' + esc(p.img) + '" alt="" loading="lazy">' : '<span class="chatprod__img">' + ico('i-box') + '</span>') +
        '<span class="chatprod__txt"><b>' + esc(p.name) + '</b><small>' + energyHTML(p, 'xs') + (p.price ? esc(p.price) : 'ფასი მოთხოვნით') +
        ' · <i class="' + (p.stock ? 'is-in' : 'is-out') + '">' + (p.stock ? 'მარაგშია' : 'შეკვეთით') + '</i></small></span></a>';
    }).join('') + '</span>' + (all ? '<a class="textlink" href="' + esc(all) + '">ყველა შედეგი</a>' : '');
  }
  function orderStatus() {
    botAsk(chatApi('orders'), function (r) {
      if (!r.auth) {
        var login = CHATCFG ? '<a class="btn btn--soft btn--sm chat__btn" href="' + esc(r.login || CHATCFG.login || '/auth/') + '?backurl=' + encodeURIComponent(location.pathname) + '">შესვლა</a>'
                            : '<button class="btn btn--soft btn--sm chat__btn" type="button" data-login>შესვლა</button>';
        return { html: true, text: 'შეკვეთის სტატუსის სანახავად შედით თქვენს კაბინეტში. შესვლის შემდეგ აქვე გაჩვენებთ ბოლო შეკვეთებს.' + login };
      }
      if (!r.items.length) return { text: 'თქვენს ანგარიშზე შეკვეთები ჯერ არ არის. თუ შეკვეთა ტელეფონით გააფორმეთ, დაგვირეკეთ 0322 152 152.' };
      return { html: true, text: 'თქვენი ბოლო შეკვეთები:<span class="chatorders">' + r.items.map(function (o) {
        return '<a class="chatorder" href="' + esc(o.url) + '"><b>№ ' + esc(o.number) + '</b><span>' + esc(o.date) + ' · ' + esc(o.total) + (o.paid ? ' · გადახდილია' : '') + '</span><em>' + esc(o.status) + '</em></a>';
      }).join('') + '</span><a class="textlink" href="' + esc(r.all) + '">ყველა შეკვეთა</a>' };
    });
  }
  // hand the conversation to a person: Bitrix24 Open Lines when it is set up, a callback otherwise
  function handoff() {
    var live = CHATCFG && CHATCFG.live && window.ANDE_LIVECHAT;
    if (live) {
      botSay('გადაგიყვანთ ოპერატორთან. ჩატი ახლავე გაიხსნება.');
      setTimeout(function () { openChat(false); try { live.open(); } catch (e) {} }, 1200);
      return;
    }
    botSay(CHATCFG ? 'ოპერატორთან ჩატი ახლა მიუწვდომელია. დაგვირეკეთ 0322 152 152 ან დაგვიტოვეთ ნომერი და გადმოგირეკავთ.'
                   : 'ოპერატორთან ცოცხალი ჩატი Bitrix-თან დაკავშირების შემდეგ იმუშავებს. მანამდე დაგვირეკეთ 0322 152 152 ან დაგვიტოვეთ ნომერი და გადმოგირეკავთ.', { cb: true });
  }
  function addMsg(text, who, html) {
    var m = document.createElement('div');
    m.className = 'msg msg--' + who;
    if (html) m.innerHTML = text; else m.textContent = text;
    chatLog.appendChild(m); chatLog.scrollTop = chatLog.scrollHeight;
    return m;
  }
  function addQuick(list) {
    var q = document.createElement('div'); q.className = 'quick';
    q.innerHTML = list.map(function (t, i) { return '<button type="button" style="animation-delay:' + (i * 50) + 'ms">' + t + '</button>'; }).join('');
    chatLog.appendChild(q); chatLog.scrollTop = chatLog.scrollHeight;
  }
  function botSay(text, opts) {
    opts = opts || {};
    var t = addMsg('<i></i><i></i><i></i>', 'bot msg--typing', true);
    setTimeout(function () {
      t.remove();
      addMsg(text, 'bot', opts.html);
      if (opts.cb) addCallback();
      if (opts.quick) addQuick(opts.quick);
    }, reduceMotion ? 0 : Math.min(1400, 450 + text.length * 6));
  }
  function addCallback() {
    var f = document.createElement('form'); f.className = 'chat__cb'; f.noValidate = true;
    f.innerHTML = '<div class="field"><label class="sr-only" for="cb-n">სახელი</label><input class="input" id="cb-n" placeholder="სახელი"></div>' +
      '<div class="field"><label class="sr-only" for="cb-p">ტელეფონი</label><div class="phonefield"><span>+995</span><input class="input" id="cb-p" type="tel" inputmode="numeric" placeholder="5XX XX XX XX" data-phone></div></div>' +
      // hidden from people; bots fill every field, and the server drops requests that have it
      '<input class="chat__hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<button class="btn btn--primary btn--sm" type="submit">გადმორეკვის მოთხოვნა</button>';
    chatLog.appendChild(f); chatLog.scrollTop = chatLog.scrollHeight;
    georgianCaps(f);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = $('#cb-n', f), p = $('#cb-p', f), name = n.value.trim();
      if (!name) { n.focus(); return; }
      if (!phoneOk(p.value)) { fieldErr(p, 'შეიყვანეთ 9-ნიშნა ნომერი'); p.focus(); return; }
      var data = { name: name, phone: p.value.replace(/\D/g, ''), topic: lastTopic, page: location.href, website: f.elements.website.value };
      f.remove();
      addMsg(name + ', +995 ' + p.value, 'me');
      botAsk(chatApi('lead', data), function (r) {
        return { text: 'მადლობა, ' + name + '! მოთხოვნა მიღებულია' + (r.id ? ' (№ ' + r.id + ')' : '') + '. კონსულტანტი გადმოგირეკავთ სამუშაო საათებში (ყოველდღე 10:00-18:00).' };
      });
    });
  }
  function reply(text) {
    // keywords match at the start of a word ("მიწოდ" finds "მიწოდება"); short ones only as whole
    // words, so "hi" does not fire inside "mitsubishi"
    var t = ' ' + text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ') + ' ';
    var has = function (k) { return t.indexOf(' ' + k + (k.length <= 3 ? ' ' : '')) > -1; };
    lastTopic = text;
    for (var i = 0; i < INTENTS.length; i++) {
      var it = INTENTS[i];
      if (!it.k.some(has)) continue;
      if (it.act === 'orders') orderStatus();
      else if (it.act === 'live') handoff();
      else botSay(it.a, { cb: it.cb });
      return;
    }
    botAsk(chatApi('search', { q: text }), function (r) {
      if (r.items.length) return { html: true, text: 'აი, რა ვიპოვე:' + prodList(r.items, r.all) };
      return { text: 'ამ კითხვაზე უკეთ ჩვენი კონსულტანტი გიპასუხებთ. დაგვირეკეთ 0322 152 152 ან დაგვიტოვეთ ნომერი და გადმოგირეკავთ.', cb: true };
    });
  }
  function openChat(open) {
    var on = open == null ? !chat.classList.contains('is-open') : open;
    chat.classList.toggle('is-open', on); chatFab.classList.toggle('is-open', on); chatFab.setAttribute('aria-expanded', String(on));
    bubble.classList.remove('is-on');
    try { sessionStorage.setItem('ande-bubble', '1'); } catch (e) {}
    if (on && !chatStarted) {
      chatStarted = true;
      botSay('გამარჯობა! მე ვარ მაქს კომფორტის ასისტენტი. დამისვით კითხვა ან აირჩიეთ თემა. პროდუქტის მოსაძებნად უბრალოდ დაწერეთ მისი სახელი ან კოდი.', { quick: QUICK });
    }
    if (on) setTimeout(function () { $('#chat-in').focus(); }, 250);
  }
  $$('[data-chat-toggle]').forEach(function (b) { b.addEventListener('click', function () { openChat(); }); });
  chatLog.addEventListener('click', function (e) {
    var b = e.target.closest('.quick button'); if (!b) return;
    b.parentNode.remove(); addMsg(b.textContent, 'me'); reply(b.textContent);
  });
  $('[data-chat-form]').addEventListener('submit', function (e) {
    e.preventDefault(); var i = $('#chat-in'), v = i.value.trim(); if (!v) return;
    i.value = ''; addMsg(v, 'me'); reply(v);
  });
  $('[data-chat-callback]').addEventListener('click', function () { if (!chatStarted) openChat(true); addMsg('გადმორეკვა მინდა', 'me'); lastTopic = lastTopic || 'გადმორეკვა'; botSay('რა თქმა უნდა. დაგვიტოვეთ სახელი და ნომერი:', { cb: true }); });
  $('[data-bubble-close]').addEventListener('click', function () { bubble.classList.remove('is-on'); try { sessionStorage.setItem('ande-bubble', '1'); } catch (e) {} });
  try {
    if (!sessionStorage.getItem('ande-bubble')) setTimeout(function () {
      if (!chat.classList.contains('is-open')) { bubble.classList.add('is-on'); setTimeout(function () { bubble.classList.remove('is-on'); }, 9000); }
    }, 5000);
  } catch (e) {}

  /* ---------------- global clicks ---------------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-add],[data-wish],[data-compare],[data-ask],[data-quick],[data-login],[data-chat-open],[data-theme-toggle],[data-copy]');
    if (!t) return;
    if (t.hasAttribute('data-theme-toggle')) { setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); return; }
    if (t.hasAttribute('data-chat-open')) { e.preventDefault(); closeMega(); openChat(true); return; }
    if (t.hasAttribute('data-login')) { e.preventDefault(); closeDrawer(); loginModal('in'); return; }
    if (t.hasAttribute('data-copy')) {
      var v = t.getAttribute('data-copy');
      (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function () { toast('<span><b>კოდი დაკოპირდა</b><em>' + esc(v) + '</em></span>', 1800); }, function () {});
      return;
    }
    var id, p;
    if ((id = t.getAttribute('data-add'))) {
      p = BYID[id]; var qtyEl = t.getAttribute('data-qty-from') ? $(t.getAttribute('data-qty-from')) : null;
      var qty = qtyEl ? Math.max(1, parseInt(qtyEl.value, 10) || 1) : 1;
      cart.add(id, qty);
      var label = $('span', t);
      if (label && !t.classList.contains('is-added')) {
        var orig = label.textContent;
        t.classList.add('is-added'); georgianCaps.text(label, 'დამატებულია');
        setTimeout(function () { t.classList.remove('is-added'); georgianCaps.text(label, orig); }, 1600);
      }
      toast('<img src="' + img(p) + '" alt=""><span><b>დაემატა კალათაში' + (qty > 1 ? ' (' + qty + ')' : '') + '</b><em>' + esc(p.name) + '</em></span><a href="cart.html">კალათა</a>');
      return;
    }
    if ((id = t.getAttribute('data-wish'))) {
      var on = wish.toggle(id);
      $$('[data-wish="' + id + '"]').forEach(function (b) { b.setAttribute('aria-pressed', String(on)); });
      toast('<span><b>' + (on ? 'დაემატა რჩეულებში' : 'წაიშალა რჩეულებიდან') + '</b></span>' + (on ? '<a href="wishlist.html">ნახვა</a>' : ''), 2200);
      return;
    }
    if ((id = t.getAttribute('data-compare'))) {
      var r = compare.toggle(id);
      if (r === null) { toast('<span><b>შედარებაში მაქსიმუმ 4 პროდუქტია</b></span><a href="compare.html">შედარება</a>'); return; }
      $$('[data-compare="' + id + '"]').forEach(function (b) { b.setAttribute('aria-pressed', String(r)); });
      toast('<span><b>' + (r ? 'დაემატა შედარებაში' : 'წაიშალა შედარებიდან') + '</b><em>' + compare.list().length + ' / 4</em></span>' + (r ? '<a href="compare.html">შედარება</a>' : ''), 2400);
      return;
    }
    if ((id = t.getAttribute('data-ask'))) { e.preventDefault(); openModal(contactForm('ask', BYID[id]), 'ფასის მოთხოვნა'); return; }
    if ((id = t.getAttribute('data-quick'))) { e.preventDefault(); openModal(contactForm('quick', BYID[id]), 'სწრაფი შეკვეთა'); return; }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (lb.classList.contains('is-open')) return closeLightbox();
    if (modal.classList.contains('is-open')) return closeModal();
    if (chat.classList.contains('is-open')) { openChat(false); chatFab.focus(); return; }
    if (drawer.classList.contains('is-open')) return closeDrawer();
    if (mega.classList.contains('is-open')) { if (mega.contains(document.activeElement)) megaBtn.focus(); closeMega(); }
    hdr.classList.remove('is-searching'); sugg.hidden = true;
  });
  // other tabs: keep counters in sync
  window.addEventListener('storage', function (e) { if (e.key && e.key.indexOf('ande-') === 0) { badges(); document.dispatchEvent(new CustomEvent('ande:change', { detail: { type: 'sync' } })); } });

  // colour swatch on a card: the card turns into that colour (photo, name, price, stock, energy)
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.pcard [data-variant]');
    if (!b) return;
    var v = BYID[b.getAttribute('data-variant')], el = b.closest('.pcard');
    if (!v || +el.getAttribute('data-id') === v.id) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = card(v);
    var next = tmp.firstChild;
    el.parentNode.replaceChild(next, el);
    georgianCaps(next);
    var f = $('[data-variant="' + v.id + '"]', next); if (f) f.focus();
  });

  // energy class arrow: show the product's energy label
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-elabel]');
    if (!b) return;
    var p = BYID[b.getAttribute('data-elabel')];
    if (!p || !p.energy || !p.energy.label) return;
    e.preventDefault(); e.stopPropagation();
    openLightbox([fileHref(p.energy.label)], 0);
  });

  /* ---------------- page registry ---------------- */
  var pages = [];
  window.ANDE = {
    products: PRODUCTS, byId: function (id) { return BYID[id]; }, CATALOG: CATALOG, findCat: findCat, findSub: findSub, subImg: subImg,
    img: img, money: money, priceHTML: priceHTML, collapse: collapse, swatches: swatchesHTML, energy: energyHTML, docs: docsHTML, fileHref: fileHref, esc: esc, ico: ico, param: param, url: url, brandName: brandName, keySpecs: keySpecs, canBuy: canBuy,
    card: card, cart: cart, wish: wish, compare: compare, recent: recent, search: search, store: store,
    toast: toast, openModal: openModal, closeModal: closeModal, contactForm: contactForm, openLightbox: openLightbox, openChat: openChat,
    fieldErr: fieldErr, phoneOk: phoneOk, caps: georgianCaps, reduceMotion: reduceMotion, $: $, $$: $$,
    setFabLift: function (px) { root.style.setProperty('--fab-lift', px + 'px'); },
    page: function (fn) { pages.push(fn); }
  };
  document.addEventListener('DOMContentLoaded', function () {
    pages.forEach(function (fn) { fn(window.ANDE); });
    badges();
    georgianCaps(document);
  });
})();
