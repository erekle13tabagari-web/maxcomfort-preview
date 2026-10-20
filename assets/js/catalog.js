import { boot, $, $$, esc, bi, ui, arrow, card, num, money, crumbs, search, groupLead, openLayer, closeLayers, params } from './core.js';

const PAGE = 24;
const SKIP = new Set(['კოდი', 'მოდელი', 'დასახელება', 'მწარმოებელი', 'ზომები', 'ზომა', 'ტიპი', 'უზრუნველყოფილია', 'გაბარიტები', 'კავშირის დიამეტრი', 'კავშირების დიამეტრი']);
const SORTS = [['pop', 'რეკომენდებული'], ['price-asc', 'ფასი: ზრდადობით'], ['price-desc', 'ფასი: კლებადობით'], ['name', 'სახელით']];
let db, st, shown = PAGE;

/* ---------- state <-> URL ---------- */
function readState(q = params()) {
  const list = k => (q.get(k) || '').split('|').filter(Boolean);
  const specs = {};
  for (const [k, v] of q) if (k.startsWith('f.')) specs[k.slice(2)] = v.split('|').filter(Boolean);
  return {
    c: q.get('c') || '', s: q.get('s') || '', q: q.get('q') || '',
    b: list('b'), t: list('t'), color: list('color'), specs,
    min: q.get('min') ? +q.get('min') : null, max: q.get('max') ? +q.get('max') : null,
    stock: q.get('stock') === '1', sort: q.get('sort') || 'pop'
  };
}
function writeState(push) {
  const q = new URLSearchParams();
  ['c', 's', 'q'].forEach(k => st[k] && q.set(k, st[k]));
  if (st.b.length) q.set('b', st.b.join('|'));
  if (st.t.length) q.set('t', st.t.join('|'));
  if (st.color.length) q.set('color', st.color.join('|'));
  Object.entries(st.specs).forEach(([k, v]) => v.length && q.set('f.' + k, v.join('|')));
  if (st.min != null) q.set('min', st.min);
  if (st.max != null) q.set('max', st.max);
  if (st.stock) q.set('stock', '1');
  if (st.sort !== 'pop') q.set('sort', st.sort);
  const url = 'catalog.html' + (q.toString() ? '?' + q : '');
  history[push ? 'pushState' : 'replaceState'](null, '', url);
}

/* ---------- filtering ---------- */
function scope() {
  let list = st.q ? search(db, st.q).flatMap(p => p.group ? db.groups.get(p.group) : [p]) : db.products;
  if (st.c) list = list.filter(p => p.cat === st.c);
  if (st.s) list = list.filter(p => p.sub === st.s);
  return list;
}
const specVal = (p, k) => p.spec[k];
function preds(except) {
  const f = [];
  if (except !== 'b' && st.b.length) f.push(p => st.b.includes(p.brand));
  if (except !== 't' && st.t.length) f.push(p => st.t.includes(p.type));
  if (except !== 'color' && st.color.length) f.push(p => p.color && st.color.includes(p.color.id));
  if (except !== 'price' && (st.min != null || st.max != null)) f.push(p => p.price != null && (st.min == null || p.price >= st.min) && (st.max == null || p.price <= st.max));
  if (except !== 'stock' && st.stock) f.push(p => p.stock);
  Object.entries(st.specs).forEach(([k, v]) => { if (except !== 'f.' + k && v.length) f.push(p => v.includes(specVal(p, k))); });
  return p => f.every(fn => fn(p));
}
function collapse(list) {
  const out = [], seen = new Set();
  list.forEach(p => {
    if (!p.group) return out.push(p);
    if (seen.has(p.group)) return;
    seen.add(p.group);
    const inList = list.filter(x => x.group === p.group);
    out.push(st.color.length ? inList.find(x => st.color.includes(x.color.id)) || inList[0] : inList[0]);
  });
  return out;
}
function sorted(list) {
  const score = p => (p.src[0] && /\/(mc|lib)-/.test(p.src[0]) ? 2 : 0) + (p.energy ? 1 : 0) + (p.stock ? 1 : 0) + (p.group || p.series ? 1 : 0) + (p.price != null ? 1 : 0);
  const byPrice = dir => (a, b) => (a.price == null) - (b.price == null) || dir * ((a.price || 0) - (b.price || 0));
  const cmp = {
    pop: (a, b) => score(b) - score(a) || (b.price || 0) - (a.price || 0),
    'price-asc': byPrice(1), 'price-desc': byPrice(-1),
    name: (a, b) => a.title.localeCompare(b.title, 'ka')
  }[st.sort] || (() => 0);
  return [...list].sort(cmp);
}

/* ---------- facets ---------- */
const count = (list, key) => { const m = new Map(); list.forEach(p => { const v = key(p); if (v != null && v !== '') m.set(v, (m.get(v) || 0) + 1); }); return m; };
const numSort = (a, b) => { const x = parseFloat(String(a).replace(',', '.')), y = parseFloat(String(b).replace(',', '.')); return !isNaN(x) && !isNaN(y) ? x - y : String(a).localeCompare(String(b), 'ka'); };
const unit = k => (k.match(/,\s*(kW|ბარი|მმ|სმ)$/) || [])[1];
const label = (k, v) => /ფართობი/.test(k) ? v.replace(/მ²/g, '').replace(/\s*-\s*/, '-').trim() + ' მ²' : num(v);
const chipLabel = (k, v) => label(k, v) + (unit(k) && !/ფართობი/.test(k) ? ' ' + unit(k) : '');

function facets(sc) {
  const out = [];
  const opt = (name, value, text, n, on) => `<label class="fopt ${n ? '' : 'is-zero'}"><input type="checkbox" data-f="${esc(name)}" value="${esc(value)}" ${on ? 'checked' : ''}><span>${esc(text)}</span><small>${n}</small></label>`;
  const group = (id, title, body, open = true) => `<div class="fgroup ${open ? '' : 'is-closed'}" data-g="${esc(id)}"><button class="fgroup__t" type="button" data-toggle>${esc(title)}${ui('down')}</button><div class="fgroup__b">${body}</div></div>`;
  const list = (name, m, sel, text = v => v, max = 6) => {
    const keys = [...new Set([...m.keys(), ...sel])];
    const sortedKeys = name === 'b' || name === 't' ? keys.sort((a, b) => (m.get(b) || 0) - (m.get(a) || 0)) : keys.sort(numSort);
    const html = sortedKeys.map((v, i) => (i === max ? '<div data-fmore hidden style="display:contents">' : '') + opt(name, v, text(v), m.get(v) || 0, sel.includes(v))).join('') + (sortedKeys.length > max ? `</div><button class="fmore" type="button" data-more-btn>+ კიდევ ${sortedKeys.length - max}</button>` : '');
    return html;
  };

  // availability
  const inStock = sc.filter(preds('stock')).filter(p => p.stock).length;
  out.push(group('stock', 'მარაგი', `<label class="switch"><span>მხოლოდ მარაგში (${inStock})</span><input type="checkbox" data-stock ${st.stock ? 'checked' : ''}></label>`));

  // price
  const prices = sc.filter(p => p.price != null).map(p => p.price);
  if (prices.length > 1) {
    const lo = Math.floor(Math.min(...prices)), hi = Math.ceil(Math.max(...prices));
    if (hi > lo) {
      const a = st.min ?? lo, b = st.max ?? hi;
      out.push(group('price', 'ფასი, ₾', `<div class="frange"><input class="input" type="number" inputmode="numeric" data-min value="${st.min ?? ''}" placeholder="${lo}" aria-label="მინ. ფასი"><input class="input" type="number" inputmode="numeric" data-max value="${st.max ?? ''}" placeholder="${hi}" aria-label="მაქს. ფასი"></div>
        <div class="dual" data-dual data-lo="${lo}" data-hi="${hi}"><div class="dual__track"></div><div class="dual__fill"></div><input type="range" min="${lo}" max="${hi}" value="${a}" data-r="min" aria-label="მინ. ფასი"><input type="range" min="${lo}" max="${hi}" value="${b}" data-r="max" aria-label="მაქს. ფასი"></div>`));
    }
  }

  // brand
  const bm = count(sc.filter(preds('b')), p => p.brand);
  if (bm.size > 1 || st.b.length) out.push(group('b', 'ბრენდი', list('b', bm, st.b, v => (db.brandsById.get(v) || {}).name || v)));

  // colour
  const cm = count(sc.filter(preds('color')), p => p.color && p.color.id);
  if (cm.size > 1 || st.color.length) {
    const sample = id => db.products.find(p => p.color && p.color.id === id).color;
    out.push(group('color', 'ფერი', `<div class="fswatch">${[...cm.keys()].map(id => { const c = sample(id); return `<label title="${esc(c.name)} (${cm.get(id)})"><input type="checkbox" data-f="color" value="${id}" ${st.color.includes(id) ? 'checked' : ''}><span class="sw sw--lg" style="--c:${c.hex}"></span></label>`; }).join('')}</div>`));
  }

  // product type
  const tm = count(sc.filter(preds('t')), p => p.type);
  if (tm.size > 1 || st.t.length) out.push(group('t', 'ტიპი', list('t', tm, st.t)));

  // specifications that describe this selection
  const keyN = new Map();
  sc.forEach(p => p.specs.forEach(([k]) => keyN.set(k, (keyN.get(k) || 0) + 1)));
  [...keyN.entries()]
    .filter(([k, n]) => !SKIP.has(k) && (n >= Math.max(3, sc.length * .35) || st.specs[k]))
    .sort((a, b) => b[1] - a[1])
    .forEach(([k]) => {
      const m = count(sc.filter(preds('f.' + k)), p => specVal(p, k));
      if ((m.size < 2 || m.size > 14) && !(st.specs[k] || []).length) return;
      out.push(group('f.' + k, k.replace(/,\s*(kW|მ²|ბარი|მმ|სმ)$/, ', $1'), list('f.' + k, m, st.specs[k] || [], v => label(k, v)), out.length < 7));
    });
  return out.join('');
}

/* ---------- render ---------- */
function head() {
  const cat = db.cats.get(st.c), sub = db.subs.get(st.s), brand = st.b.length === 1 ? db.brandsById.get(st.b[0]) : null;
  const title = st.q ? `ძიება: „${st.q}“` : sub ? sub.name : cat ? cat.name : brand ? brand.name : 'კატალოგი';
  document.title = title + ' · მაქს კომფორტი';
  const trail = [['კატალოგი', (cat || st.q || brand) ? 'catalog.html' : null]];
  if (cat) trail.push([cat.name, sub ? 'catalog.html?c=' + cat.id : null]);
  if (sub) trail.push([sub.name, null]);
  if (st.q) trail.push(['ძიება', null]);
  $('[data-crumbs]').innerHTML = crumbs(trail);
  $('[data-title]').textContent = title;
  $('[data-lead]').textContent = cat && !sub ? cat.lead : '';

  const pills = cat
    ? `<a class="pill ${st.s ? '' : 'is-on'}" href="catalog.html?c=${cat.id}" data-nav>${bi(cat.icon)}ყველა <small>${cat.count}</small></a>` + cat.subs.filter(s => s.count).map(s => `<a class="pill ${st.s === s.id ? 'is-on' : ''}" href="catalog.html?c=${cat.id}&s=${s.id}" data-nav>${bi(s.icon)}${esc(s.name)} <small>${s.count}</small></a>`).join('')
    : st.q ? '' : db.categories.map(c => `<a class="pill" href="catalog.html?c=${c.id}" data-nav>${bi(c.icon)}${esc(c.name)} <small>${c.count}</small></a>`).join('');
  const bar = $('[data-pills]');
  bar.innerHTML = pills;
  bar.hidden = !pills;
  const on = $('.pill.is-on', bar);   // phones: the chosen subcategory in the middle of the row (again once the fonts are in)
  const center = () => { if (on && bar.scrollWidth > bar.clientWidth) bar.scrollLeft = on.offsetLeft - bar.offsetLeft - (bar.clientWidth - on.offsetWidth) / 2; };
  center();
  if (document.fonts) document.fonts.ready.then(center);
}

function chips() {
  const c = [];
  const chip = (text, attr) => `<span class="achip">${esc(text)}<button ${attr} aria-label="მოხსნა">${ui('close')}</button></span>`;
  st.b.forEach(v => c.push(chip((db.brandsById.get(v) || {}).name || v, `data-rm="b" data-v="${esc(v)}"`)));
  st.t.forEach(v => c.push(chip(v, `data-rm="t" data-v="${esc(v)}"`)));
  st.color.forEach(v => c.push(chip((db.products.find(p => p.color && p.color.id === v) || { color: { name: v } }).color.name, `data-rm="color" data-v="${v}"`)));
  Object.entries(st.specs).forEach(([k, vs]) => vs.forEach(v => c.push(chip(chipLabel(k, v), `data-rm="f.${esc(k)}" data-v="${esc(v)}"`))));
  if (st.min != null || st.max != null) c.push(chip(`${st.min ?? 0}-${st.max ?? '∞'} ₾`, 'data-rm="price"'));
  if (st.stock) c.push(chip('მარაგში', 'data-rm="stock"'));
  if (st.q) c.push(chip('„' + st.q + '“', 'data-rm="q"'));
  if (c.length > 1) c.push('<button class="aclear" data-clear>ყველას მოხსნა</button>');
  return c.join('');
}

let results = [];
function render(keepPage) {
  const sc = scope();
  results = sorted(collapse(sc.filter(preds())));
  if (!keepPage) shown = PAGE;
  head();
  $('[data-filters-body]').innerHTML = facets(sc);
  syncDual();
  $('[data-chips]').innerHTML = chips();
  $('[data-count]').textContent = results.length + ' პროდუქტი';
  $('[data-apply]').textContent = 'ნახვა (' + results.length + ')';
  const grid = $('[data-grid]');
  if (!results.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1">${bi('sys-home', 'ic ic--xl')}<h3>ვერაფერი მოიძებნა</h3><p>შეცვალეთ ფილტრები ან გვკითხეთ: შევარჩევთ თქვენთვის.</p><button class="btn btn--ghost" data-clear>ფილტრების მოხსნა</button> <button class="btn btn--red" data-callback>კონსულტაცია</button></div>`;
    $('[data-more]').hidden = true;
    return;
  }
  grid.innerHTML = results.slice(0, shown).map((p, i) => card(db, p, { eager: i < 8 })).join('');
  $$('.card', grid).forEach((c, i) => { c.classList.add('reveal-in'); c.style.animationDelay = Math.min(i, 12) * 30 + 'ms'; });
  more();
}
function more() {
  const m = $('[data-more]'), left = results.length - shown;
  m.hidden = left <= 0;
  if (left > 0) {
    $('small', m).textContent = `ნაჩვენებია ${shown} / ${results.length}`;
    $('.more__bar i', m).style.width = (shown / results.length * 100) + '%';
    $('button', m).innerHTML = `მეტის ჩვენება (${Math.min(PAGE, left)})`;
  }
}
function showMore() {
  const grid = $('[data-grid]'), from = shown;
  shown += PAGE;
  grid.insertAdjacentHTML('beforeend', results.slice(from, shown).map(p => card(db, p)).join(''));
  $$('.card', grid).slice(from).forEach((c, i) => { c.classList.add('reveal-in'); c.style.animationDelay = Math.min(i, 12) * 30 + 'ms'; });
  more();
  writeShown();
}
const writeShown = () => { try { sessionStorage.setItem('mc.shown.' + location.search, shown); } catch (e) { /* */ } };

function syncDual() {
  const d = $('[data-dual]');
  if (!d) return;
  const lo = +d.dataset.lo, hi = +d.dataset.hi, [a, b] = $$('input[type=range]', d).map(x => +x.value);
  const fill = $('.dual__fill', d);
  fill.style.left = ((Math.min(a, b) - lo) / (hi - lo) * 100) + '%';
  fill.style.right = (100 - (Math.max(a, b) - lo) / (hi - lo) * 100) + '%';
}

/* ---------- events ---------- */
function update(push) { writeState(push); render(); window.scrollTo({ top: Math.min(scrollY, $('.shop').offsetTop - 120), behavior: 'smooth' }); }

function wire() {
  const side = $('.filters');
  side.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-f]')) {
      const name = t.dataset.f, v = t.value;
      const arr = name.startsWith('f.') ? (st.specs[name.slice(2)] ||= []) : st[name];
      const i = arr.indexOf(v);
      if (t.checked && i < 0) arr.push(v); else if (!t.checked && i > -1) arr.splice(i, 1);
      if (name.startsWith('f.') && !arr.length) delete st.specs[name.slice(2)];
      update();
    } else if (t.matches('[data-stock]')) { st.stock = t.checked; update(); }
    else if (t.matches('[data-min],[data-max]')) {
      const v = t.value === '' ? null : Math.max(0, +t.value);
      st[t.matches('[data-min]') ? 'min' : 'max'] = v;
      update();
    } else if (t.matches('[data-r]')) {
      const d = t.closest('[data-dual]'), [a, b] = $$('input[type=range]', d).map(x => +x.value);
      st.min = Math.min(a, b) <= +d.dataset.lo ? null : Math.min(a, b);
      st.max = Math.max(a, b) >= +d.dataset.hi ? null : Math.max(a, b);
      update();
    }
  });
  side.addEventListener('input', e => {
    if (!e.target.matches('[data-r]')) return;
    syncDual();
    const d = e.target.closest('[data-dual]'), [a, b] = $$('input[type=range]', d).map(x => +x.value);
    $('[data-min]', side).value = Math.min(a, b);
    $('[data-max]', side).value = Math.max(a, b);
  });
  side.addEventListener('click', e => {
    const tg = e.target.closest('[data-toggle]');
    if (tg) tg.parentElement.classList.toggle('is-closed');
    const mb = e.target.closest('[data-more-btn]');
    if (mb) { mb.previousElementSibling.hidden = false; mb.previousElementSibling.style.display = 'contents'; mb.remove(); }
    if (e.target.closest('[data-apply]')) closeLayers();
  });
  document.addEventListener('click', e => {
    const rm = e.target.closest('[data-rm]');
    if (rm) {
      const k = rm.dataset.rm, v = rm.dataset.v;
      if (k === 'price') { st.min = st.max = null; }
      else if (k === 'stock') st.stock = false;
      else if (k === 'q') st.q = '';
      else if (k.startsWith('f.')) { st.specs[k.slice(2)] = st.specs[k.slice(2)].filter(x => x !== v); if (!st.specs[k.slice(2)].length) delete st.specs[k.slice(2)]; }
      else st[k] = st[k].filter(x => x !== v);
      return update();
    }
    if (e.target.closest('[data-clear]')) {
      st = { ...st, b: [], t: [], color: [], specs: {}, min: null, max: null, stock: false, q: e.target.closest('.empty') ? '' : st.q };
      return update();
    }
    const nav = e.target.closest('[data-nav]');
    if (nav && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      const u = new URL(nav.href);
      st = { ...readState(u.searchParams), sort: st.sort };
      update(true);
    }
    if (e.target.closest('[data-more] button')) showMore();
    if (e.target.closest('[data-open-filters]')) openLayer(side);
    const dn = e.target.closest('[data-density]');
    if (dn) {
      $('[data-grid]').style.setProperty('--cols', dn.dataset.density);
      $$('[data-density]').forEach(b => b.classList.toggle('is-on', b === dn));
      try { localStorage.setItem('mc.cols', dn.dataset.density); } catch (err) { /* */ }
    }
  });
  $('[data-sort]').addEventListener('change', e => { st.sort = e.target.value; writeState(); render(); });
  addEventListener('popstate', () => { st = readState(); $('[data-sort]').value = st.sort; render(); });
}

boot({ cat: params().get('c') }).then(d => {
  db = d;
  st = readState();
  $('[data-sort]').innerHTML = SORTS.map(([v, t]) => `<option value="${v}" ${st.sort === v ? 'selected' : ''}>${t}</option>`).join('');
  try {
    const cols = localStorage.getItem('mc.cols');
    if (cols && innerWidth > 1180) { $('[data-grid]').style.setProperty('--cols', cols); $$('[data-density]').forEach(b => b.classList.toggle('is-on', b.dataset.density === cols)); }
    const saved = +sessionStorage.getItem('mc.shown.' + location.search);
    if (saved > PAGE) shown = saved;
  } catch (e) { /* */ }
  wire();
  render(true);
}).catch(err => { console.error(err); });
