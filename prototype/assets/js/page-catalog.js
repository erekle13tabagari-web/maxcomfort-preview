/* Catalog / category / search results.
   Filters are built from the products in view: brand, type, price, stock and
   every specification field that enough products share (power, area, fuel,
   diameter...). Counts next to each option already respect the other active
   filters. The whole state lives in the address bar, so a filtered view can
   be shared or bookmarked. In Bitrix this maps onto catalog.smart.filter. */
ANDE.page(function (A) {
  'use strict';
  var esc = A.esc, ico = A.ico;
  var PAGE = 12;
  var SKIP_KEYS = ['კოდი', 'პროდუქტის კოდი', 'მოდელი', 'დასახელება', 'მწარმოებელი', 'შეფუთვა', 'შიდა ყუთი', 'ყუთი'];

  /* ---------- state from the URL ---------- */
  var P = new URLSearchParams(location.search);
  var S = {
    cat: P.get('cat') || '', sub: P.get('sub') || '', q: (P.get('q') || '').trim(),
    brand: (P.get('brand') || '').split(',').filter(Boolean),
    type: P.getAll('type'),
    spec: {},
    pmin: P.get('pmin') ? +P.get('pmin') : null, pmax: P.get('pmax') ? +P.get('pmax') : null,
    stock: P.get('stock') === '1',
    sort: P.get('sort') || 'popular',
    view: P.get('view') || A.store.get('view', 'grid'),
    shown: PAGE
  };
  P.getAll('f').forEach(function (f) { var i = f.indexOf('~'); if (i < 1) return; var k = f.slice(0, i); (S.spec[k] = S.spec[k] || []).push(f.slice(i + 1)); });
  var cat = A.findCat(S.cat), sub = cat ? A.findSub(S.cat, S.sub) : null;
  if (!cat) S.cat = ''; if (!sub) S.sub = '';

  /* ---------- the products in scope (before filters) ---------- */
  var base = (S.q ? A.search(S.q) : A.products.slice()).filter(function (p) {
    return (!S.cat || p.cat === S.cat) && (!S.sub || p.sub === S.sub);
  });
  var order = {}; base.forEach(function (p, i) { order[p.id] = i; });

  function specVal(p, k) { for (var i = 0; i < p.specs.length; i++) if (p.specs[i][0] === k) return p.specs[i][1]; return null; }
  function num(v) { var m = String(v).replace(',', '.').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : NaN; }

  /* facets offered for this scope */
  var keyCount = {};
  base.forEach(function (p) { p.specs.forEach(function (s) { if (SKIP_KEYS.indexOf(s[0]) < 0) (keyCount[s[0]] = keyCount[s[0]] || {})[s[1]] = 1; }); });
  var specKeys = Object.keys(keyCount).filter(function (k) {
    var withKey = base.filter(function (p) { return specVal(p, k) != null; }).length, distinct = Object.keys(keyCount[k]).length;
    return withKey >= 3 && distinct >= 2 && distinct <= 16;
  }).sort(function (a, b) {
    var O = ['სიმძლავრე, kW', 'ფართობი, მ²', 'ინვერტორული', 'საწვავი', 'ქვაბის ტიპი', 'დიამეტრი', 'მასალა', 'სამუშაო ტემპერატურა', 'გარანტია'];
    var ia = O.indexOf(a), ib = O.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b, 'ka');
  });
  var types = uniq(base.map(function (p) { return p.type; }).filter(Boolean));
  var brands = uniq(base.map(function (p) { return p.brand; }).filter(Boolean)).sort();
  var prices = base.map(function (p) { return p.price; }).filter(Boolean);
  var PMIN = prices.length ? Math.floor(Math.min.apply(null, prices)) : 0, PMAX = prices.length ? Math.ceil(Math.max.apply(null, prices)) : 0;
  function uniq(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }); }

  /* ---------- filtering ---------- */
  function match(p, skip) {
    if (skip !== 'brand' && S.brand.length && S.brand.indexOf(p.brand) < 0) return false;
    if (skip !== 'type' && S.type.length && S.type.indexOf(p.type) < 0) return false;
    if (skip !== 'stock' && S.stock && !p.stock) return false;
    if (skip !== 'price' && (S.pmin != null || S.pmax != null)) {
      if (!p.price) return false;
      if (S.pmin != null && p.price < S.pmin) return false;
      if (S.pmax != null && p.price > S.pmax) return false;
    }
    for (var k in S.spec) {
      if (skip === 'spec:' + k || !S.spec[k].length) continue;
      if (S.spec[k].indexOf(specVal(p, k)) < 0) return false;
    }
    return true;
  }
  function results() {
    var r = base.filter(function (p) { return match(p); });
    var cmp = {
      popular: function (a, b) { return (b.stock - a.stock) || ((!!b.price) - (!!a.price)) || ((b.imgs.length > 0) - (a.imgs.length > 0)) || (order[a.id] - order[b.id]); },
      'price-asc': function (a, b) { return (a.price || 1e12) - (b.price || 1e12); },
      'price-desc': function (a, b) { return (b.price || -1) - (a.price || -1); },
      name: function (a, b) { return a.name.localeCompare(b.name, 'ka'); }
    }[S.sort] || function () { return 0; };
    // one card per model: its colours are swatches on the card
    return A.collapse(r.sort(cmp));
  }
  function count(skip, test) { return A.collapse(base.filter(function (p) { return match(p, skip) && test(p); })).length; }

  /* ---------- page head ---------- */
  var title = S.q ? 'ძიება: „' + S.q + '“' : sub ? sub.name : cat ? cat.name : 'კატალოგი';
  document.title = title + ' · მაქს კომფორტი';
  var crumbs = '<a href="index.html">მთავარი</a>' + ico('i-chev-r') + (cat || S.q ? '<a href="catalog.html">კატალოგი</a>' : '<span aria-current="page">კატალოგი</span>');
  if (cat) crumbs += ico('i-chev-r') + (sub ? '<a href="' + A.url.catalog(cat.id) + '">' + cat.name + '</a>' + ico('i-chev-r') + '<span aria-current="page">' + sub.name + '</span>' : '<span aria-current="page">' + cat.name + '</span>');
  if (S.q && !cat) crumbs += ico('i-chev-r') + '<span aria-current="page">ძიება</span>';
  A.$('[data-crumbs]').innerHTML = crumbs;
  A.$('[data-title]').textContent = title;

  var chips = '';
  if (cat) {
    chips = '<a class="subchip" href="' + A.url.catalog(cat.id) + '"' + (!sub ? ' aria-current="true"' : '') + '>' + ico(cat.icon) + 'ყველა <small>' + cat.count + '</small></a>' +
      cat.subs.map(function (s) {
        var src = A.subImg(s);
        return '<a class="subchip" href="' + A.url.catalog(cat.id, s.id) + '"' + (sub && sub.id === s.id ? ' aria-current="true"' : '') + '>' +
          (src ? '<img src="' + src + '" alt="" loading="lazy">' : ico(s.icon || 'i-box')) + s.name + ' <small>' + s.count + '</small></a>';
      }).join('');
  } else {
    chips = A.CATALOG.map(function (c) {
      var n = S.q ? A.collapse(base.filter(function (p) { return p.cat === c.id; })).length : c.count;
      return '<a class="subchip" href="' + A.url.catalog(c.id, '', S.q ? 'q=' + encodeURIComponent(S.q) : '') + '">' + ico(c.icon) + c.name + ' <small>' + n + '</small></a>';
    }).join('');
  }
  A.$('[data-subchips]').innerHTML = chips;
  if (base.some(function (p) { return p.demo; })) A.$('[data-demo-note]').hidden = false;

  /* ---------- filters panel ---------- */
  var panel = A.$('[data-filters]');
  function checkRow(name, value, label, checked, n) {
    return '<label class="check' + (n === 0 && !checked ? ' is-zero' : '') + '"><input type="checkbox" name="' + esc(name) + '" value="' + esc(value) + '"' + (checked ? ' checked' : '') + '>' +
      '<span class="check__box">' + ico('i-check') + '</span><span class="check__label">' + esc(label) + '</span><span class="check__count">' + n + '</span></label>';
  }
  /* long option lists show the first SHOW and a "+N" button, never an inner scrollbar;
     a list stays expanded once opened, or when one of its hidden options is ticked */
  var SHOW = 6, expanded = {};
  function facet(key, title, rows, open) {
    var hiddenChecked = rows.slice(SHOW).some(function (r) { return r.indexOf(' checked') > -1; });
    var full = expanded[key] || hiddenChecked || rows.length <= SHOW + 1;
    var list = full ? rows : rows.slice(0, SHOW);
    var toggle = rows.length > SHOW + 1 && !hiddenChecked
      ? '<button class="facet__more" type="button" data-more-facet="' + esc(key) + '">' + (full ? 'ნაკლები' : 'კიდევ ' + (rows.length - SHOW)) + ico('i-chev') + '</button>' : '';
    return '<details class="facet" data-facet="' + esc(key) + '"' + (open ? ' open' : '') + '><summary>' + esc(title) + ico('i-chev') + '</summary><div class="facet__body"><div class="facet__list' + (full ? ' is-full' : '') + '">' + list.join('') + '</div>' + toggle + '</div></details>';
  }
  panel.addEventListener('click', function (e) {
    var b = e.target.closest('[data-more-facet]'); if (!b) return;
    var k = b.getAttribute('data-more-facet'); expanded[k] = !expanded[k]; renderFilters();
  });
  function sortVals(vals) {
    var allNum = vals.every(function (v) { return !isNaN(num(v)); });
    return vals.sort(allNum ? function (a, b) { return num(a) - num(b); } : function (a, b) { return a.localeCompare(b, 'ka'); });
  }
  function renderFilters() {
    var openState = {};
    A.$$('.facet', panel).forEach(function (d) { openState[d.getAttribute('data-facet')] = d.open; });
    function isOpen(k, def) { return k in openState ? openState[k] : def; }
    var html = '<div class="filters__head"><h2>ფილტრები</h2><button class="filters__reset" type="button" data-reset' + (active().length ? '' : ' hidden') + '>გასუფთავება</button></div>';
    html += '<label class="switch"><span>მხოლოდ მარაგში</span><input type="checkbox" name="stock"' + (S.stock ? ' checked' : '') + '><span class="switch__track"></span></label>';
    if (PMAX > PMIN) {
      var lo = S.pmin != null ? S.pmin : PMIN, hi = S.pmax != null ? S.pmax : PMAX;
      html += '<details class="facet" data-facet="price"' + (isOpen('price', true) ? ' open' : '') + '><summary>ფასი, ₾' + ico('i-chev') + '</summary><div class="facet__body">' +
        '<div class="range__inputs"><input class="input" type="number" inputmode="numeric" name="pmin" value="' + lo + '" min="' + PMIN + '" max="' + PMAX + '" aria-label="მინიმუმ"><span>-</span><input class="input" type="number" inputmode="numeric" name="pmax" value="' + hi + '" min="' + PMIN + '" max="' + PMAX + '" aria-label="მაქსიმუმ"></div>' +
        '<div class="range__slider"><span class="range__fill"></span><input type="range" name="rmin" min="' + PMIN + '" max="' + PMAX + '" value="' + lo + '" aria-label="მინიმალური ფასი"><input type="range" name="rmax" min="' + PMIN + '" max="' + PMAX + '" value="' + hi + '" aria-label="მაქსიმალური ფასი"></div></div></details>';
    }
    if (types.length > 1) html += facet('type', 'ტიპი', types.map(function (t) {
      return checkRow('type', t, t, S.type.indexOf(t) > -1, count('type', function (p) { return p.type === t; }));
    }), isOpen('type', true));
    if (brands.length > 1) html += facet('brand', 'ბრენდი', brands.map(function (b) {
      return checkRow('brand', b, A.brandName(b), S.brand.indexOf(b) > -1, count('brand', function (p) { return p.brand === b; }));
    }), isOpen('brand', true));
    specKeys.forEach(function (k, i) {
      var vals = sortVals(Object.keys(keyCount[k]));
      html += facet('spec:' + k, k, vals.map(function (v) {
        return checkRow('spec:' + k, v, v, (S.spec[k] || []).indexOf(v) > -1, count('spec:' + k, function (p) { return specVal(p, k) === v; }));
      }), isOpen('spec:' + k, i < 3));
    });
    panel.innerHTML = html;
    syncRange();
    A.caps(panel);
  }
  function syncRange() {
    var a = A.$('[name="rmin"]', panel), b = A.$('[name="rmax"]', panel), fill = A.$('.range__fill', panel);
    if (!a) return;
    var span = PMAX - PMIN || 1;
    fill.style.left = ((+a.value - PMIN) / span * 100) + '%';
    fill.style.right = (100 - (+b.value - PMIN) / span * 100) + '%';
  }

  /* ---------- active filter chips ---------- */
  function active() {
    var a = [];
    if (S.stock) a.push(['stock', '', 'მარაგში']);
    if (S.pmin != null || S.pmax != null) a.push(['price', '', (S.pmin != null ? S.pmin : PMIN) + '-' + (S.pmax != null ? S.pmax : PMAX) + ' ₾']);
    S.type.forEach(function (t) { a.push(['type', t, t]); });
    S.brand.forEach(function (b) { a.push(['brand', b, A.brandName(b)]); });
    Object.keys(S.spec).forEach(function (k) { S.spec[k].forEach(function (v) { a.push(['spec:' + k, v, k + ': ' + v]); }); });
    return a;
  }
  function renderActive() {
    var a = active();
    A.$('[data-active]').innerHTML = a.map(function (x) {
      return '<button class="achip" type="button" data-rm="' + esc(x[0]) + '" data-v="' + esc(x[1]) + '">' + esc(x[2]) + ico('i-close') + '</button>';
    }).join('') + (a.length > 1 ? '<button class="achip achip--clear" type="button" data-reset>ყველას გასუფთავება</button>' : '');
    A.$('[data-active]').hidden = !a.length;
    var n = A.$('[data-fcount]'); if (n) { n.textContent = a.length; n.setAttribute('data-n', a.length); }
  }

  /* ---------- results ---------- */
  var grid = A.$('[data-results]'), more = A.$('[data-more]');
  function renderResults(keepShown) {
    var r = results();
    if (!keepShown) S.shown = PAGE;
    A.$('[data-count]').textContent = r.length + ' პროდუქტი';
    grid.classList.toggle('pgrid--list', S.view === 'list');
    if (!r.length) {
      grid.innerHTML = '';
      A.$('[data-empty]').hidden = false;
      more.hidden = true;
      return;
    }
    A.$('[data-empty]').hidden = true;
    grid.innerHTML = r.slice(0, S.shown).map(A.card).join('');
    A.caps(grid);
    var shown = Math.min(S.shown, r.length);
    more.hidden = false;
    A.$('[data-more-text]').textContent = 'ნაჩვენებია ' + shown + ' / ' + r.length;
    A.$('.more__bar i', more).style.width = (shown / r.length * 100) + '%';
    A.$('[data-more-btn]').hidden = shown >= r.length;
  }

  function writeURL() {
    var q = new URLSearchParams();
    if (S.cat) q.set('cat', S.cat); if (S.sub) q.set('sub', S.sub); if (S.q) q.set('q', S.q);
    if (S.brand.length) q.set('brand', S.brand.join(','));
    S.type.forEach(function (t) { q.append('type', t); });
    Object.keys(S.spec).forEach(function (k) { S.spec[k].forEach(function (v) { q.append('f', k + '~' + v); }); });
    if (S.pmin != null) q.set('pmin', S.pmin); if (S.pmax != null) q.set('pmax', S.pmax);
    if (S.stock) q.set('stock', '1');
    if (S.sort !== 'popular') q.set('sort', S.sort);
    if (S.view === 'list') q.set('view', 'list');
    history.replaceState(null, '', 'catalog.html' + (q.toString() ? '?' + q.toString() : ''));
  }
  function update() { renderFilters(); renderActive(); renderResults(); writeURL(); updateSheetBtn(); }

  /* ---------- events ---------- */
  panel.addEventListener('change', function (e) {
    var t = e.target, n = t.name;
    if (n === 'stock') S.stock = t.checked;
    else if (n === 'brand' || n === 'type') {
      var arr = S[n], i = arr.indexOf(t.value);
      if (t.checked && i < 0) arr.push(t.value); else if (!t.checked && i > -1) arr.splice(i, 1);
    } else if (n.indexOf('spec:') === 0) {
      var k = n.slice(5), list = S.spec[k] = S.spec[k] || [], j = list.indexOf(t.value);
      if (t.checked && j < 0) list.push(t.value); else if (!t.checked && j > -1) list.splice(j, 1);
      if (!list.length) delete S.spec[k];
    } else if (n === 'pmin' || n === 'pmax' || n === 'rmin' || n === 'rmax') {
      var lo = +A.$(n[0] === 'r' ? '[name="rmin"]' : '[name="pmin"]', panel).value, hi = +A.$(n[0] === 'r' ? '[name="rmax"]' : '[name="pmax"]', panel).value;
      if (lo > hi) { var x = lo; lo = hi; hi = x; }
      S.pmin = lo > PMIN ? lo : null; S.pmax = hi < PMAX ? hi : null;
    } else return;
    update();
  });
  panel.addEventListener('input', function (e) {
    var n = e.target.name;
    if (n !== 'rmin' && n !== 'rmax') return;
    var a = A.$('[name="rmin"]', panel), b = A.$('[name="rmax"]', panel);
    if (+a.value > +b.value) { if (n === 'rmin') a.value = b.value; else b.value = a.value; }
    A.$('[name="pmin"]', panel).value = a.value; A.$('[name="pmax"]', panel).value = b.value;
    syncRange();
  });
  function resetAll() { S.brand = []; S.type = []; S.spec = {}; S.pmin = S.pmax = null; S.stock = false; update(); }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-reset],[data-rm],[data-more-btn],[data-view]');
    if (!t) return;
    if (t.hasAttribute('data-reset')) return resetAll();
    if (t.hasAttribute('data-more-btn')) { S.shown += PAGE; renderResults(true); return; }
    if (t.hasAttribute('data-view')) {
      S.view = t.getAttribute('data-view'); A.store.set('view', S.view);
      A.$$('[data-view]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); });
      renderResults(true); writeURL(); return;
    }
    var k = t.getAttribute('data-rm'), v = t.getAttribute('data-v');
    if (k === 'stock') S.stock = false;
    else if (k === 'price') S.pmin = S.pmax = null;
    else if (k === 'brand' || k === 'type') S[k] = S[k].filter(function (x) { return x !== v; });
    else if (k.indexOf('spec:') === 0) { var kk = k.slice(5); S.spec[kk] = (S.spec[kk] || []).filter(function (x) { return x !== v; }); if (!S.spec[kk].length) delete S.spec[kk]; }
    update();
  });
  var sortSel = A.$('[data-sort]');
  sortSel.value = S.sort;
  sortSel.addEventListener('change', function () { S.sort = sortSel.value; renderResults(); writeURL(); });
  A.$$('[data-view]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === S.view)); });
  document.addEventListener('ande:change', function (e) { if (e.detail.type === 'wish' || e.detail.type === 'compare') { /* buttons already updated in place */ } });

  /* ---------- mobile: filters in a bottom sheet ---------- */
  var sheet = A.$('[data-sheet]'), sheetBody = A.$('[data-sheet-body]'), home = panel.parentNode, homeNext = panel.nextSibling;
  function updateSheetBtn() { var b = A.$('[data-sheet-apply]'); if (b) A.caps.text(b, 'ნახვა (' + results().length + ')'); }
  function openSheet() { sheetBody.appendChild(panel); sheet.classList.add('is-open'); sheet.setAttribute('aria-hidden', 'false'); document.documentElement.style.overflow = 'hidden'; updateSheetBtn(); }
  function closeSheet() { sheet.classList.remove('is-open'); sheet.setAttribute('aria-hidden', 'true'); document.documentElement.style.overflow = ''; home.insertBefore(panel, homeNext); }
  A.$('[data-sheet-open]').addEventListener('click', openSheet);
  A.$$('[data-sheet-close]').forEach(function (b) { b.addEventListener('click', closeSheet); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sheet.classList.contains('is-open')) closeSheet(); });

  update();
});
