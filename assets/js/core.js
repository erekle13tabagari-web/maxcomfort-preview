/* Shared by every page: helpers, the cart/favourites/compare store, header and footer,
   search, drawers, the callback window and the product card. */
import { catalog, lead as sendLead, norm, account } from './api.js';

export const C = window.MC_CONFIG;
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const params = () => new URLSearchParams(location.search);
export { norm };

/* ---------- Mtavruli ----------
   Titles are styled text-transform: uppercase, but Chrome and Edge do not make Mtavruli from it, and
   they even turn real Mtavruli back into ordinary letters (brand book p.23). So the script does it:
   text under an uppercase style is converted with toUpperCase() (Georgian -> Mtavruli U+1C90..,
   Latin -> capitals) and its element gets data-mt, which switches the CSS uppercase off there. */
export const mtav = s => String(s).toUpperCase();
const needsCaps = n => {
  const el = n.parentElement;
  return !!el && !el.closest('script,style,textarea') && /\S/.test(n.data) &&
    (el.hasAttribute('data-mt') || getComputedStyle(el).textTransform === 'uppercase');
};
function capsIn(roots) {
  // decide for every text node first, then change: data-mt on a parent would hide its children's style
  const todo = [];
  roots.forEach(r => {
    if (r.nodeType === 3) { if (needsCaps(r)) todo.push(r); return; }
    if (r.nodeType !== 1 || !r.isConnected) return;
    const w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) if (needsCaps(n)) todo.push(n);
  });
  todo.forEach(n => {
    const up = n.data.toUpperCase();
    if (up !== n.data) n.data = up;
    n.parentElement.setAttribute('data-mt', '');
  });
}
function watchCaps() {
  capsIn([document.body]);
  // converted right in the observer, i.e. before the browser paints: no lowercase flash, and nothing waits
  // for an animation frame that a background tab may never get. Converting again is a no-op, so no loop.
  new MutationObserver(list => {
    const q = [];
    list.forEach(m => m.type === 'characterData' ? q.push(m.target) : m.addedNodes.forEach(n => q.push(n)));
    capsIn(q);
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}

/* ---------- formatting (brand book p.25: decimal comma, unit after a space) ---------- */
export function money(n) {
  if (n == null || isNaN(n)) return '';
  const [i, d] = (Math.round(n * 100) / 100).toFixed(2).split('.');
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (d !== '00' ? ',' + d : '') + ' ₾';
}
export const num = v => String(v).replace(/(\d)\.(\d)/g, '$1,$2');
export const plural = (n, word) => n + ' ' + word;

/* ---------- icons ---------- */
const UI = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
  bag: '<path d="M5 8h14l-1.2 12H6.2L5 8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z"/>',
  cmp: '<path d="M8 3 4.5 6.5 8 10"/><path d="M4.5 6.5H19"/><path d="m16 14 3.5 3.5L16 21"/><path d="M19.5 17.5H5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h11"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  right: '<path d="m9 6 6 6-6 6"/>', left: '<path d="m15 6-6 6 6 6"/>', down: '<path d="m6 9 6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  phone: '<path d="M5.5 4h3.2l1.8 4.6-2.3 1.4a11 11 0 0 0 5.8 5.8l1.4-2.3 4.6 1.8v3.2a1.8 1.8 0 0 1-1.9 1.8A15.8 15.8 0 0 1 3.7 5.9 1.8 1.8 0 0 1 5.5 4Z"/>',
  pin: '<path d="M12 21s-7-6.1-7-11.8a7 7 0 0 1 14 0C19 14.9 12 21 12 21Z"/><circle cx="12" cy="9.2" r="2.4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="1"/><path d="m4 7 8 6 8-6"/>',
  filter: '<path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17" r="2"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5"/><rect x="13.5" y="4" width="6.5" height="6.5"/><rect x="4" y="13.5" width="6.5" height="6.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5"/>',
  grid3: '<path d="M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM4 16h4v4H4zM10 16h4v4h-4zM16 16h4v4h-4z"/>',
  download: '<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14"/>',
  zoom: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6M11 8v6M8 11h6"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.4"/>',
  trash: '<path d="M4.5 7h15M10 11v6M14 11v6M6.5 7l.9 13h9.2l.9-13M9 7V4.5h6V7"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="1"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>',
  sun: '<circle cx="12" cy="12" r="3.6"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
  drop: '<path d="M12 3.5s-6 6.4-6 10.6a6 6 0 0 0 12 0C18 9.9 12 3.5 12 3.5Z"/>',
  fan: '<circle cx="12" cy="12" r="1.8"/><path d="M12 10.2c0-3 .8-6.2 3.6-6.2 2.6 0 2.4 3.6-1.8 6.6M13.6 12.9c2.6 1.5 4.9 3.8 3.5 6.2-1.3 2.2-4.3.2-4.9-4.9M10.4 12.9c-2.6 1.5-5.8 2.4-7.2 0-1.3-2.2 1.9-3.8 6.6-1.8"/>',
  user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.6 20.4c1.2-3.7 4-5.4 7.4-5.4s6.2 1.7 7.4 5.4"/>',
  up: '<path d="M12 19V5.5M6 11l6-6 6 6"/>',
  chat: '<path d="M4 5h16v11.5h-9.5L6 20v-3.5H4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  send: '<path d="M4.5 11.6 20 4.5l-5.6 15-3.2-5.9z"/><path d="m11.2 13.6 4.3-4.3"/>',
  logout: '<path d="M14 4.5h5v15h-5M10 8l-4 4 4 4M6 12h10"/>',
  box: '<path d="M4 7.5 12 4l8 3.5v9L12 20l-8-3.5z"/><path d="M4 7.5 12 11l8-3.5M12 11v9"/>',
  edit: '<path d="M4.5 19.5h4l10-10-4-4-10 10z"/><path d="m13 7 4 4"/>',
  shield: '<path d="M12 3.5 5 6v5.5c0 4.3 3 7.6 7 9 4-1.4 7-4.7 7-9V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  moon: '<path d="M19.5 14.6A7.6 7.6 0 0 1 9.4 4.5a7.6 7.6 0 1 0 10.1 10.1Z"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'
};
export const ui = (n, cls = '') => `<svg class="ui ${cls}" viewBox="0 0 24 24" aria-hidden="true">${UI[n]}</svg>`;
export const bi = (n, cls = 'ic') => `<svg class="${cls}" aria-hidden="true"><use href="assets/brand/icons.svg#${n}"/></svg>`;
export const arrow = () => bi('ui-arrow', 'arr');
const YT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8ZM10 15V9l5.2 3L10 15Z"/></svg>';

/* ---------- store: cart, favourites, compare, recently seen (this browser) ---------- */
const KEYS = { cart: 'mc.cart', fav: 'mc.fav', cmp: 'mc.cmp', seen: 'mc.seen' };
const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v : d; } catch (e) { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } };
export const store = {
  cart: read(KEYS.cart, []), fav: read(KEYS.fav, []), cmp: read(KEYS.cmp, []), seen: read(KEYS.seen, []),
  save(name) { write(KEYS[name], this[name]); dispatchEvent(new CustomEvent('mc:' + name)); },
  add(id, qty = 1) {
    const l = this.cart.find(x => x.id === id);
    if (l) l.qty = Math.min(99, l.qty + qty); else this.cart.push({ id, qty });
    this.save('cart');
  },
  setQty(id, qty) {
    const l = this.cart.find(x => x.id === id);
    if (!l) return;
    if (qty <= 0) this.cart = this.cart.filter(x => x.id !== id); else l.qty = Math.min(99, qty);
    this.save('cart');
  },
  remove(id) { this.cart = this.cart.filter(x => x.id !== id); this.save('cart'); },
  clear() { this.cart = []; this.save('cart'); },
  has(name, id) { return this[name].includes(id); },
  toggle(name, id, max) {
    if (this[name].includes(id)) this[name] = this[name].filter(x => x !== id);
    else { if (max && this[name].length >= max) return null; this[name] = [...this[name], id]; }
    this.save(name);
    return this[name].includes(id);
  },
  seenAdd(id) { this.seen = [id, ...this.seen.filter(x => x !== id)].slice(0, 12); this.save('seen'); },
  count() { return this.cart.reduce((s, l) => s + l.qty, 0); },
  lines(db) { return this.cart.map(l => ({ ...l, p: db.byId.get(l.id) })).filter(l => l.p); },
  total(db) { return this.lines(db).reduce((s, l) => s + (l.p.price || 0) * l.qty, 0); }
};
addEventListener('storage', e => {
  const name = Object.keys(KEYS).find(k => KEYS[k] === e.key);
  if (name) { store[name] = read(e.key, []); dispatchEvent(new CustomEvent('mc:' + name)); }
});

/* ---------- product helpers ---------- */
// energy classes: c cooling (SEER), h space heating, w water heating or storage, v ventilation
export const EKINDS = { c: ['გაგრილება', 'snow'], h: ['გათბობა', 'sun'], w: ['წყლის გაცხელება', 'drop'], v: ['ვენტილაცია', 'fan'] };
// EU labels: the scale's top class is dark green and every step down takes the next colour, so the same letter
// differs by label: A is yellow on an air conditioner (A+++ to D), light green on a boiler (A++ to G).
const ESTEPS = ['e-a3', 'e-a2', 'e-a1', 'e-a', 'e-b', 'e-c', 'e-d'];
const ECLASSES = ['A+++', 'A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];
const ETOP = { c: 'A+++', h: 'A+++', w: 'A+', v: 'A+' };
export function energyTag(cls, kind, top) {
  if (!cls) return '';
  const [t, icon] = EKINDS[kind] || EKINDS.c;
  const step = ECLASSES.indexOf(cls) - ECLASSES.indexOf(top || ETOP[kind] || 'A+++');
  return `<span class="energy ${ESTEPS[Math.max(0, Math.min(ESTEPS.length - 1, step))]}" title="${t}: ${esc(cls)}">${ui(icon)}${esc(cls)}</span>`;
}
/** [kind, class, top of its scale] for each class a product has, in label order (space heaters run A++ to G). */
export const energyTags = p => (p.energy ? Object.keys(EKINDS).filter(k => p.energy[k]).map(k => [k, p.energy[k], k === 'h' && p.cat !== 'cooling' ? 'A++' : ETOP[k]]) : []);
export function priceHTML(p, cls = '') {
  if (p.price == null) return `<span class="price price--req ${cls}">ფასი მოთხოვნით</span>`;
  return `<span class="price num ${cls}">${money(p.price)}</span>`;
}
export function keySpecs(p, n = 2) {
  const s = p.spec, out = [];
  const pw = s['სიმძლავრე, kW'];
  if (pw) out.push(['spec-power', num(pw) + ' kW']);
  else if (s['სიმძლავრე(W)']) out.push(['spec-power', s['სიმძლავრე(W)'] + ' W']);
  const area = s['ფართობი, მ²'];
  if (area) out.push(['spec-area', area.replace(/მ²/g, '').replace(/\s*-\s*/, '-').trim() + ' მ²']);
  if (s['საწვავი']) out.push(['spec-gas', s['საწვავი'].split(' (')[0]]);
  if (s['კონტურების რაოდენობა']) out.push(['prd-underfloor', s['კონტურების რაოდენობა'] + ' კონტური']);
  const d = s['დიამეტრი'] || (s['დიამეტრი, მმ'] && s['დიამეტრი, მმ'] + ' მმ');
  if (d) out.push(['spec-dimensions', d]);
  if (s['მასალა']) out.push(['spec-code', s['მასალა']]);
  return out.slice(0, n);
}
/** The variant a listing shows for a colour group: in stock first, then the cheapest. */
export function groupLead(db, p, color) {
  if (!p.group) return p;
  const list = db.groups.get(p.group);
  if (color) { const c = list.find(x => x.color && x.color.id === color); if (c) return c; }
  return list[0];
}
export function swatches(db, p, cls = 'sw') {
  if (!p.group) return '';
  return `<div class="swatches">${db.groups.get(p.group).map(v =>
    `<button class="${cls} ${v.id === p.id ? 'is-on' : ''}" style="--c:${v.color.hex}" data-sw="${v.id}" title="${esc(v.color.name)}" aria-label="${esc(v.color.name)}"></button>`).join('')}</div>`;
}

/** Product card. The stage is the whole point: one soft neutral, the product, nothing else. */
export function card(db, p, { cls = '', eager = false } = {}) {
  const two = p.src[1] && p.src[1] !== p.src[0];
  const ek = energyTags(p)[0], e = ek ? energyTag(ek[1], ek[0], ek[2]) : '';
  const specs = keySpecs(p).map(([i, t]) => `<span>${bi(i)}${esc(t)}</span>`).join('');
  const fav = store.has('fav', p.id), cmp = store.has('cmp', p.id);
  return `<article class="card ${cls}" data-id="${p.id}">
  <div class="card__media">
    <a class="card__stage cut" href="${p.url}" tabindex="-1" aria-hidden="true">
      <img class="card__img card__img--1 ${two ? 'has-2' : ''}" src="${p.src[0] || ''}" alt="" ${eager ? '' : 'loading="lazy"'} decoding="async">
      ${two ? `<img class="card__img card__img--2" src="${p.src[1]}" alt="" loading="lazy" decoding="async">` : ''}
    </a>
    <div class="card__tags">${e}${p.stock === false ? '<span class="tag">შეკვეთით</span>' : ''}</div>
    <div class="card__acts">
      <button class="cact ${fav ? 'is-on' : ''}" data-fav="${p.id}" aria-label="რჩეულებში" title="რჩეულებში">${ui('heart')}</button>
      <button class="cact ${cmp ? 'is-on' : ''}" data-cmp="${p.id}" aria-label="შედარება" title="შედარება">${ui('cmp')}</button>
    </div>
    ${p.price != null
      ? `<button class="card__add" data-add="${p.id}">${ui('bag')}კალათაში</button>`
      : `<button class="card__add" data-ask="${p.id}">${ui('phone')}ფასის მოთხოვნა</button>`}
  </div>
  <div class="card__body">
    <div class="card__brand"><span>${esc(p.brandName || p.subName)}</span>${p.line ? `<span>${esc(p.line)}</span>` : ''}</div>
    <a class="card__title" href="${p.url}">${esc(p.title)}</a>
    ${specs ? `<div class="card__specs">${specs}</div>` : ''}
    <div class="card__foot">${priceHTML(p)}${swatches(db, p)}</div>
  </div>
</article>`;
}

/* ---------- toasts, modal ---------- */
export function toast(html, img) {
  const box = $('.toasts');
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = (img ? `<img src="${img}" alt="">` : '') + `<div>${html}</div>`;
  box.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3600);
}

let lastFocus = null;
export function openLayer(el) {
  lastFocus = document.activeElement;
  el.classList.add('is-open');
  if (el.classList.contains('drawer') || el.classList.contains('filters')) $('.scrim').classList.add('is-open');
  document.documentElement.style.overflow = 'hidden';
  const f = el.querySelector('input:not([type=hidden]):not(.hp),button,[href]');
  setTimeout(() => f && f.focus({ preventScroll: true }), 60);
}
export function closeLayers() {
  $$('.drawer.is-open,.modal.is-open,.so.is-open,.filters.is-open,.lightbox.is-open').forEach(el => el.classList.remove('is-open'));
  $('.scrim').classList.remove('is-open');
  document.documentElement.style.overflow = '';
  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}

/* ---------- header + footer ---------- */
const MENU_HIDE = new Set(['ducts']);   // categories left out of the menus (owner's choice); still in the catalog
const inMenu = c => !MENU_HIDE.has(c.id);
const FEATURED = { heating: 1010, cooling: 2159, ventilation: 900003, ducts: 900006, water: 1794 };

/* ---------- light / dark: follows the system until the visitor picks one (the pick is kept in mc.theme) ---------- */
const darkNow = () => (document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
const THEME_BTN = (cls = '') => `<button class="iconbtn ${cls}" data-theme-toggle aria-label="მუქი რეჟიმი" aria-pressed="false">${ui('moon', 'only-l')}${ui('sun', 'only-d')}</button>`;
function syncTheme() {
  const dark = darkNow();
  $$('[data-theme-toggle]').forEach(b => { b.setAttribute('aria-pressed', dark); b.title = dark ? 'ნათელი რეჟიმი' : 'მუქი რეჟიმი'; });
}
function toggleTheme() {
  const t = darkNow() ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('mc.theme', t); } catch (e) { /* private mode: the pick lasts for this page */ }
  syncTheme();
}

/* ---------- account link: the initials once signed in ---------- */
function accLink() {
  const h = account.hint();
  return `<a class="iconbtn acc-link" href="account.html" data-acc-link aria-label="${h ? 'ჩემი ანგარიში' : 'შესვლა'}" title="${h ? esc(h.name || 'ჩემი ანგარიში') : 'შესვლა / რეგისტრაცია'}">${h ? `<span class="av av--sm">${esc(h.i) || ui('user')}</span>` : ui('user')}</a>`;
}
function renderAccount() {
  $$('[data-acc-link]').forEach(a => { a.outerHTML = accLink(); });
  $$('[data-acc-text]').forEach(a => { a.textContent = account.hint() ? 'ჩემი ანგარიში' : 'შესვლა / რეგისტრაცია'; });
}

function header(db, page) {
  const nav = db.categories.filter(inMenu).map(c => {
    const f = db.byId.get(FEATURED[c.id]) || db.products.find(p => p.cat === c.id);
    return `<div class="nav__item" data-cat="${c.id}">
      <a class="nav__link" href="catalog.html?c=${c.id}" ${page.cat === c.id ? 'aria-current="page"' : ''}>${esc(c.name)}</a>
      <div class="mega"><div class="wrap">
        <div class="mega__intro"><span class="eyebrow">${c.count} პროდუქტი</span><h2 class="h2" style="margin-top:14px">${esc(c.name)}</h2><p>${esc(c.lead)}</p>
          <a class="link" href="catalog.html?c=${c.id}">ყველას ნახვა ${arrow()}</a></div>
        <div class="mega__subs">${c.subs.map(s => `<a class="mega__sub" href="catalog.html?c=${c.id}&s=${s.id}">${bi(s.icon)}<span><b>${esc(s.name)}</b><small>${s.count} პროდუქტი</small></span></a>`).join('')}</div>
        ${f ? `<a class="mega__feat cut" href="${f.url}"><span class="mega__img"><img src="${f.src[0]}" alt="" loading="lazy"></span><small>${esc(f.brandName)}</small><b>${esc(f.title)}</b><div>${priceHTML(f)}</div></a>` : '<span></span>'}
      </div></div>
    </div>`;
  }).join('');
  return `
<div class="strip"><div class="wrap">
  <div class="strip__l">
    <a class="strip__item" href="${C.phoneHref}">${ui('phone')}${esc(C.phone)}</a>
    <span class="strip__item">${ui('clock')}${esc(C.hours)}</span>
    <a class="strip__item" href="about.html#contact">${ui('pin')}${C.showrooms.length} შოურუმი თბილისში</a>
  </div>
  <div class="strip__r">
    <a href="about.html#services">მიწოდება და მონტაჟი</a>
    <a href="about.html">ჩვენ შესახებ</a>
    <button class="strip__cb" data-callback>შეუკვეთეთ ზარი</button>
  </div>
</div></div>
<header class="hdr"><div class="wrap">
  <button class="iconbtn burger" data-open="menu" aria-label="მენიუ">${ui('menu')}</button>
  <a class="hdr__logo" href="index.html" aria-label="მაქს კომფორტი, მთავარი"><img class="only-l" src="assets/brand/logo/mc-logo-primary.svg" alt="Max Comfort" width="104" height="53"><img class="only-d" src="assets/brand/logo/mc-logo-white.svg" alt="Max Comfort" width="104" height="53"></a>
  <nav class="nav" aria-label="კატეგორიები">${nav}</nav>
  <div class="hdr__tools">
    <button class="search-trigger" data-search aria-label="ძიება">${ui('search')}<span>ძიება</span><kbd>/</kbd></button>
    ${THEME_BTN('hide-sm')}
    <a class="iconbtn hide-sm" href="compare.html" aria-label="შედარება" data-cmp-link>${ui('cmp')}<b class="badge" data-count="cmp"></b></a>
    <button class="iconbtn" data-open="fav" aria-label="რჩეულები">${ui('heart')}<b class="badge" data-count="fav"></b></button>
    ${accLink()}
    <button class="iconbtn" data-open="cart" aria-label="კალათა">${ui('bag')}<b class="badge" data-count="cart"></b></button>
  </div>
</div></header>`;
}

function footer(db) {
  return `
<footer class="ftr on-blue">
  <div class="wrap ftr__top">
    <div class="ftr__brand"><img src="assets/brand/logo/mc-logo-white.svg" alt="Max Comfort" width="170" height="87">
      <p>გათბობის, კონდიცირების, ვენტილაციისა და წყალმომარაგების სისტემები 2006 წლიდან. ინჟინრული კომფორტი. გარანტირებული სერვისი.</p>
      <div class="ftr__soc" style="margin-top:22px"><a href="${C.social.youtube}" target="_blank" rel="noopener" aria-label="YouTube">${YT}</a></div></div>
    <div><h4>კატალოგი</h4><ul>${db.categories.filter(inMenu).map(c => `<li><a href="catalog.html?c=${c.id}">${esc(c.name)}</a></li>`).join('')}</ul></div>
    <div><h4>კომპანია</h4><ul><li><a href="about.html">ჩვენ შესახებ</a></li><li><a href="about.html#services">მომსახურება</a></li><li><a href="about.html#history">ისტორია</a></li><li><a href="index.html#brands">ბრენდები</a></li><li><a href="about.html#contact">კონტაქტი</a></li></ul></div>
    <div><h4>დახმარება</h4><ul><li><a href="about.html#delivery">მიწოდება და გადახდა</a></li><li><a href="about.html#services">საგარანტიო სერვისი</a></li><li><a href="compare.html">შედარება</a></li><li><a href="account.html">ჩემი ანგარიში</a></li><li><button data-open="fav">რჩეულები</button></li><li><button data-callback>შეუკვეთეთ ზარი</button></li></ul></div>
    <div><h4>კონტაქტი</h4><ul class="ftr__contact">
      <li>${ui('phone')}<span><b><a href="${C.phoneHref}">${esc(C.phone)}</a></b>${esc(C.hours)}</span></li>
      <li>${ui('mail')}<span><b><a href="mailto:${C.email}">${esc(C.email)}</a></b></span></li>
      <li>${ui('pin')}<span><b>${esc(C.showrooms[0].address)}</b>${C.showrooms.length} შოურუმი თბილისში</span></li></ul></div>
  </div>
  <div class="ftr__bot"><div class="wrap"><span>© ${new Date().getFullYear()} ${esc(C.company)}. ყველა უფლება დაცულია.</span><span><a href="about.html#privacy">კონფიდენციალურობა</a></span></div></div>
</footer>`;
}

function overlays(db) {
  const topics = ['კონსულტაცია სისტემის შერჩევაზე', 'მონტაჟი', 'სერვისი და გარანტია', 'კითხვა პროდუქტზე', 'შეკვეთის სტატუსი'];
  return `
<div class="scrim" data-close></div>
<aside class="drawer" id="cart" aria-label="კალათა"><div class="drawer__head"><h2>კალათა <span data-count-text="cart"></span></h2><button class="iconbtn" data-close aria-label="დახურვა">${ui('close')}</button></div><div class="drawer__body" data-cart-body></div><div class="drawer__foot" data-cart-foot></div></aside>
<aside class="drawer" id="fav" aria-label="რჩეულები"><div class="drawer__head"><h2>რჩეულები <span data-count-text="fav"></span></h2><button class="iconbtn" data-close aria-label="დახურვა">${ui('close')}</button></div><div class="drawer__body" data-fav-body></div></aside>
<aside class="drawer drawer--left" id="menu" aria-label="მენიუ"><div class="drawer__head"><img class="only-l" src="assets/brand/logo/mc-logo-primary.svg" alt="Max Comfort" width="96" height="49"><img class="only-d" src="assets/brand/logo/mc-logo-white.svg" alt="Max Comfort" width="96" height="49"><span class="drawer__acts">${THEME_BTN()}<button class="iconbtn" data-close aria-label="დახურვა">${ui('close')}</button></span></div>
  <div class="drawer__body">${db.categories.filter(inMenu).map(c => `<details class="fgroup"><summary class="fgroup__t" style="list-style:none;cursor:pointer">${esc(c.name)}${ui('down')}</summary><div class="fgroup__b"><a class="fopt" href="catalog.html?c=${c.id}"><b>ყველა</b></a>${c.subs.map(s => `<a class="fopt" href="catalog.html?c=${c.id}&s=${s.id}"><span>${esc(s.name)}</span><small>${s.count}</small></a>`).join('')}</div></details>`).join('')}
    <div class="fgroup"><div class="fgroup__b" style="margin-top:0"><a class="fopt fopt--acc" href="account.html">${ui('user')}<span data-acc-text>${account.hint() ? 'ჩემი ანგარიში' : 'შესვლა / რეგისტრაცია'}</span></a><a class="fopt" href="about.html">ჩვენ შესახებ</a><a class="fopt" href="about.html#services">მომსახურება</a><a class="fopt" href="about.html#contact">კონტაქტი</a><a class="fopt" href="compare.html">შედარება</a></div></div>
    <div style="padding:22px 0"><a class="btn btn--red btn--block" href="${C.phoneHref}">${ui('phone')}${esc(C.phone)}</a></div></div></aside>
<div class="so" role="dialog" aria-modal="true" aria-label="ძიება"><div class="so__panel"><div class="wrap">
  <form class="so__bar" action="catalog.html" role="search">${ui('search')}<input class="so__input" name="q" type="search" placeholder="რას ეძებთ? მაგ.: კონდიციონერი, Beretta, 2,5 kW" autocomplete="off" aria-label="ძიება"><button type="button" class="iconbtn" data-close aria-label="დახურვა">${ui('close')}</button></form>
  <div class="so__body"><div><div class="so__h">კატეგორიები</div><div class="so__chips" data-so-cats></div></div><div><div class="so__h" data-so-h>პოპულარული</div><div class="so__res" data-so-res></div><div class="so__all" data-so-all></div></div></div>
</div></div><div data-close></div></div>
<div class="modal" id="callback" role="dialog" aria-modal="true" aria-labelledby="cb-h"><div class="modal__scrim" data-close></div><div class="modal__box">
  <button class="iconbtn modal__x" data-close aria-label="დახურვა">${ui('close')}</button>
  <div data-cb-form><span class="eyebrow">უფასო კონსულტაცია</span><h2 class="h2" id="cb-h">დაგირეკავთ</h2><p data-cb-lead>დატოვეთ ნომერი და ინჟინერი სამუშაო საათებში დაგიკავშირდებათ.</p>
  <form class="form-stack" style="margin-top:22px" novalidate data-lead-form="callback">
    <input type="hidden" name="product">
    <label class="field"><span>სახელი <em>*</em></span><input class="input" name="name" autocomplete="name" required><small class="field__err">შეიყვანეთ სახელი</small></label>
    <label class="field"><span>ტელეფონი <em>*</em></span><input class="input" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="5XX XX XX XX" required><small class="field__err">შეიყვანეთ სწორი ნომერი</small></label>
    <label class="field"><span>თემა</span><select class="select" name="topic">${topics.map(t => `<option>${t}</option>`).join('')}</select></label>
    <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <button class="btn btn--red btn--block" type="submit">გამოძახება ${arrow()}</button>
  </form></div>
  <div data-cb-done hidden style="text-align:center;padding:12px 0"><div class="done__mark" style="width:64px;height:64px"><i></i><i></i><i></i><i></i></div><h2 class="h2">მადლობა</h2><p>მოთხოვნა მიღებულია. დაგირეკავთ სამუშაო საათებში (${esc(C.hours)}).</p><button class="btn btn--ghost" style="margin-top:22px" data-close>დახურვა</button></div>
</div></div>
<div class="modal" id="label" role="dialog" aria-modal="true" aria-label="ენერგოეტიკეტი"><div class="modal__scrim" data-close></div><div class="modal__box modal__box--wide"><button class="iconbtn modal__x" data-close aria-label="დახურვა">${ui('close')}</button><img class="modal__label" alt="ენერგოეტიკეტი"></div></div>
<div class="cmpbar" aria-live="polite"><div class="cmpbar__imgs"></div><span data-cmpbar-t></span><a class="btn btn--white btn--sm" href="compare.html">შედარება</a><button class="iconbtn" style="color:#fff" data-cmp-clear aria-label="გასუფთავება">${ui('close')}</button></div>
<div class="fab">
  <button class="fab__btn fab__top" data-top aria-label="ზემოთ ასვლა" title="ზემოთ">${ui('up')}</button>
  <button class="fab__btn fab__chat" data-chat aria-label="ჩატი: მაქს ასისტენტი" aria-controls="chat" aria-expanded="false">${ui('chat', 'fab__i1')}${ui('close', 'fab__i2')}<i class="fab__dot" data-chat-dot hidden></i></button>
</div>
<section class="chat" id="chat" aria-label="მაქს ასისტენტი" hidden></section>
<div class="toasts" aria-live="polite"></div>`;
}

/* ---------- live parts ---------- */
function renderCounts() {
  const n = { cart: store.count(), fav: store.fav.length, cmp: store.cmp.length };
  $$('[data-count]').forEach(b => {
    const v = n[b.dataset.count];
    b.textContent = v || '';
    b.classList.toggle('on', v > 0);
  });
  $$('[data-count-text]').forEach(s => { const v = n[s.dataset.countText]; s.textContent = v ? '(' + v + ')' : ''; });
}
function bump(name) {
  $$(`[data-count="${name}"]`).forEach(b => { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); });
}

function renderCart(db) {
  const lines = store.lines(db), body = $('[data-cart-body]'), foot = $('[data-cart-foot]');
  if (!lines.length) {
    body.innerHTML = `<div class="drawer__empty">${bi('prd-boiler', 'ic ic--xl')}<p>კალათა ცარიელია</p><a class="btn btn--ghost" href="catalog.html">კატალოგის ნახვა</a></div>`;
    foot.hidden = true;
    return;
  }
  foot.hidden = false;
  body.innerHTML = lines.map(({ p, qty }) => `
    <div class="line" data-line="${p.id}">
      <a class="line__img" href="${p.url}"><img src="${p.src[0]}" alt=""></a>
      <div><div class="line__brand">${esc(p.brandName)}</div><a class="line__name" href="${p.url}">${esc(p.title)}</a>
        ${p.color ? `<div class="line__var"><span class="sw" style="--c:${p.color.hex};width:12px;height:12px"></span>${esc(p.color.name)}</div>` : ''}
        <div class="line__row"><div class="qty"><button data-qty="-1" aria-label="ნაკლები">${ui('minus', 'ui--sm')}</button><input value="${qty}" inputmode="numeric" aria-label="რაოდენობა" data-qty-in><button data-qty="1" aria-label="მეტი">${ui('plus', 'ui--sm')}</button></div></div></div>
      <div><div class="line__price num">${money(p.price * qty)}</div><button class="line__rm" data-rm>წაშლა</button></div>
    </div>`).join('');
  foot.innerHTML = `<div class="sum"><span>პროდუქცია</span><span class="num">${money(store.total(db))}</span></div>
    <div class="sum"><span>მიწოდება</span><small>შეკვეთისას</small></div>
    <div class="sum sum--total"><span>სულ</span><span class="num">${money(store.total(db))}</span></div>
    <a class="btn btn--red btn--block" href="checkout.html">შეკვეთის გაფორმება ${arrow()}</a>
    <p class="drawer__note">მონტაჟს და მიწოდებას შეკვეთისას შეარჩევთ</p>`;
}

function renderFav(db) {
  const list = store.fav.map(id => db.byId.get(id)).filter(Boolean), body = $('[data-fav-body]');
  body.innerHTML = list.length ? list.map(p => `
    <div class="line" data-line="${p.id}">
      <a class="line__img" href="${p.url}"><img src="${p.src[0]}" alt=""></a>
      <div><div class="line__brand">${esc(p.brandName)}</div><a class="line__name" href="${p.url}">${esc(p.title)}</a><div style="margin-top:6px">${priceHTML(p)}</div>
        <div class="line__row">${p.price != null ? `<button class="btn btn--sm" data-add="${p.id}">${ui('bag', 'ui--sm')}კალათაში</button>` : `<button class="btn btn--sm btn--ghost" data-ask="${p.id}">ფასის მოთხოვნა</button>`}</div></div>
      <div><button class="line__rm" data-fav="${p.id}">წაშლა</button></div>
    </div>`).join('')
    : `<div class="drawer__empty">${bi('sys-home', 'ic ic--xl')}<p>რჩეულები ცარიელია.<br>მონიშნეთ პროდუქტი გულით და აქ შეინახება.</p></div>`;
}

function renderCmpBar(db) {
  const list = store.cmp.map(id => db.byId.get(id)).filter(Boolean), bar = $('.cmpbar');
  const onPage = document.body.dataset.page === 'compare';
  bar.classList.toggle('is-on', list.length > 0 && !onPage);
  $('.cmpbar__imgs', bar).innerHTML = list.map(p => `<span><img src="${p.src[0]}" alt=""></span>`).join('');
  $('[data-cmpbar-t]', bar).textContent = 'შედარება: ' + list.length + ' / 4';
  $$('[data-cmp-link]').forEach(a => a.hidden = list.length === 0);
}

function syncToggles() {
  $$('[data-fav]').forEach(b => b.classList.contains('cact') || b.classList.contains('iconbtn') ? b.classList.toggle('is-on', store.has('fav', +b.dataset.fav)) : 0);
  $$('[data-cmp]').forEach(b => b.classList.toggle('is-on', store.has('cmp', +b.dataset.cmp)));
}

/* ---------- search ---------- */
function setupSearch(db) {
  const so = $('.so'), input = $('.so__input'), res = $('[data-so-res]'), cats = $('[data-so-cats]'), all = $('[data-so-all]'), h = $('[data-so-h]');
  const popular = [2159, 2150, 1010, 2171, 1794, 2177, 1005, 900003].map(id => db.byId.get(id)).filter(Boolean);
  const item = (p, q) => `<a class="sres" href="${p.url}"><span class="sres__img"><img src="${p.src[0]}" alt="" loading="lazy"></span><span><small>${esc(p.brandName || p.subName)}</small><b>${hl(p.title, q)}</b>${priceHTML(p)}</span></a>`;
  const hl = (t, q) => {
    let s = esc(t);
    q.split(' ').filter(w => w.length > 1).forEach(w => { s = s.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); });
    return s;
  };
  const run = () => {
    const q = norm(input.value);
    if (!q) {
      h.textContent = 'პოპულარული';
      res.innerHTML = popular.map(p => item(p, '')).join('');
      cats.innerHTML = db.categories.map(c => `<a href="catalog.html?c=${c.id}"><span>${esc(c.name)}</span><small>${c.count}</small></a>`).join('');
      all.innerHTML = '';
      return;
    }
    const hits = search(db, q);
    h.textContent = hits.length ? 'პროდუქტები' : '';
    res.innerHTML = hits.slice(0, 9).map(p => item(p, q)).join('') || `<p class="so__empty">„${esc(input.value)}“ ვერ მოიძებნა. სცადეთ სხვა სიტყვა ან <button class="link" data-callback style="text-transform:none;letter-spacing:0">გვკითხეთ ზარით</button>.</p>`;
    const subHits = [];
    db.categories.forEach(c => c.subs.forEach(s => { if (norm(s.name + ' ' + c.name).includes(q)) subHits.push(`<a href="catalog.html?c=${c.id}&s=${s.id}"><span>${esc(s.name)}</span><small>${s.count}</small></a>`); }));
    const brandHits = db.brands.filter(b => norm(b.name).includes(q)).map(b => `<a href="catalog.html?b=${b.id}"><span>${esc(b.name)}</span><small>${b.count}</small></a>`);
    cats.innerHTML = [...brandHits, ...subHits].join('') || '<span class="muted" style="font-size:14px">—</span>';
    all.innerHTML = hits.length > 9 ? `<a class="link" href="catalog.html?q=${encodeURIComponent(input.value.trim())}">ყველა შედეგი (${hits.length}) ${arrow()}</a>` : '';
  };
  input.addEventListener('input', run);
  run();
  document.addEventListener('click', e => {
    if (e.target.closest('[data-search]')) { e.preventDefault(); openLayer(so); input.select(); }
  });
  addEventListener('keydown', e => {
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); openLayer(so); }
  });
}
/** Every word must match; title matches rank first. */
export function search(db, q) {
  const words = norm(q).split(' ').filter(Boolean);
  if (!words.length) return [];
  const seen = new Set();
  return db.products
    .filter(p => words.every(w => p.q.includes(w)))
    .map(p => ({ p, s: (norm(p.title).startsWith(words[0]) ? 3 : 0) + (norm(p.title).includes(words.join(' ')) ? 2 : 0) + (p.stock ? 1 : 0) + (p.src[0] && /\/(mc|lib)-/.test(p.src[0]) ? 1 : 0) }))
    .sort((a, b) => b.s - a.s)
    .map(x => groupLead(db, x.p))
    .filter(p => !seen.has(p.id) && seen.add(p.id));
}

/* ---------- callback / price request ---------- */
export function callback(db, productId, topic) {
  const m = $('#callback'), f = $('[data-lead-form]', m), p = productId && db.byId.get(+productId);
  $('[data-cb-form]', m).hidden = false;
  $('[data-cb-done]', m).hidden = true;
  f.reset();
  f.product.value = p ? p.id : '';
  $('[data-cb-lead]', m).textContent = p ? `„${p.title}“: დაგირეკავთ, გეტყვით ფასს და მიწოდების ვადას.` : 'დატოვეთ ნომერი და ინჟინერი სამუშაო საათებში დაგიკავშირდებათ.';
  if (topic) f.topic.value = topic; else if (p) f.topic.value = 'კითხვა პროდუქტზე';
  openLayer(m);
}
export function validPhone(v) {
  const d = String(v).replace(/\D/g, '').replace(/^995/, '');
  return /^(5\d{8}|0?3\d{8}|0?\d{9})$/.test(d) && d.length >= 9;
}
export function validate(form) {
  let ok = true;
  $$('[required]', form).forEach(el => {
    const bad = el.type === 'checkbox' ? !el.checked : el.type === 'tel' ? !validPhone(el.value) : el.type === 'email' ? !/^\S+@\S+\.\S+$/.test(el.value) : !el.value.trim();
    const f = el.closest('.field') || el.closest('.check');
    if (f) f.classList.toggle('is-bad', bad);
    if (bad && ok) { el.focus(); ok = false; }
  });
  $$('input[type=email]:not([required])', form).forEach(el => {
    const bad = el.value.trim() && !/^\S+@\S+\.\S+$/.test(el.value);
    el.closest('.field').classList.toggle('is-bad', !!bad);
    if (bad) ok = false;
  });
  return ok;
}
/** Any form with data-lead-form becomes a Bitrix lead. */
function setupLeadForms(db) {
  document.addEventListener('submit', async e => {
    const f = e.target.closest('[data-lead-form]');
    if (!f) return;
    e.preventDefault();
    if (f.website && f.website.value) return; // bot
    if (!validate(f)) return;
    const btn = $('button[type=submit]', f);
    btn.classList.add('is-busy');
    const data = Object.fromEntries(new FormData(f));
    delete data.website;
    const p = data.product && db.byId.get(+data.product);
    try {
      await sendLead({ kind: f.dataset.leadForm, ...data, productName: p ? p.name : undefined, productSku: p ? p.sku : undefined });
      f.dispatchEvent(new CustomEvent('mc:sent', { bubbles: true }));
      if (f.closest('#callback')) { $('[data-cb-form]').hidden = true; $('[data-cb-done]').hidden = false; }
      else { f.innerHTML = `<div style="text-align:center;padding:24px 0"><div class="done__mark" style="width:64px;height:64px"><i></i><i></i><i></i><i></i></div><h3 class="h3" style="text-transform:uppercase">მადლობა</h3><p class="muted" style="margin-top:8px">მოთხოვნა მიღებულია. დაგიკავშირდებით სამუშაო საათებში.</p></div>`; }
    } catch (err) {
      console.error(err);
      toast('ვერ გაიგზავნა. სცადეთ ხელახლა ან დაგვირეკეთ: ' + esc(C.phone));
    } finally { btn.classList.remove('is-busy'); }
  });
  document.addEventListener('input', e => { const f = e.target.closest('.field.is-bad,.check.is-bad'); if (f) f.classList.remove('is-bad'); });
}

/* ---------- global clicks ---------- */
function setupEvents(db) {
  document.addEventListener('click', e => {
    const t = e.target;
    let el;
    if ((el = t.closest('[data-add]'))) {
      const p = db.byId.get(+el.dataset.add);
      const q = +(el.dataset.qty || 1);
      store.add(p.id, q);
      bump('cart');
      toast(`<b>კალათაში დაემატა</b><br>${esc(p.title)} <a href="#" data-open="cart">კალათა</a>`, p.src[0]);
      return;
    }
    if ((el = t.closest('[data-ask]'))) return callback(db, el.dataset.ask);
    if ((el = t.closest('[data-fav]'))) {
      e.preventDefault();
      const on = store.toggle('fav', +el.dataset.fav);
      if (on) bump('fav');
      return;
    }
    if ((el = t.closest('[data-cmp]'))) {
      e.preventDefault();
      const on = store.toggle('cmp', +el.dataset.cmp, 4);
      if (on === null) toast('ერთდროულად 4 პროდუქტის შედარებაა შესაძლებელი');
      return;
    }
    if (t.closest('[data-cmp-clear]')) { store.cmp = []; store.save('cmp'); return; }
    if ((el = t.closest('.card [data-sw]'))) {
      const v = db.byId.get(+el.dataset.sw), old = el.closest('.card');
      const tmp = document.createElement('div');
      tmp.innerHTML = card(db, v, { cls: old.className.replace(/\bcard\b|\breveal-in\b/g, '').trim(), eager: true });
      old.replaceWith(tmp.firstElementChild);
      return;
    }
    if ((el = t.closest('[data-open]'))) {
      e.preventDefault();
      closeLayers();
      openLayer($('#' + el.dataset.open));
      return;
    }
    if (t.closest('[data-theme-toggle]')) return toggleTheme();
    if (t.closest('[data-callback]')) { e.preventDefault(); return callback(db); }
    if (t.closest('[data-close]')) { closeLayers(); return; }
    if ((el = t.closest('a.card__stage, a.card__title'))) {
      const img = el.closest('.card').querySelector('.card__img--1');
      if (img) img.style.viewTransitionName = 'pimg';
    }
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeLayers(); });
  // entry animations: once finished, drop them so the card leaves its animation layer
  document.addEventListener('animationend', e => { if (e.target.classList && e.target.classList.contains('reveal-in')) { e.target.classList.remove('reveal-in'); e.target.style.animationDelay = ''; } });

  // cart drawer: quantity and remove
  $('#cart').addEventListener('click', e => {
    const line = e.target.closest('[data-line]');
    if (!line) return;
    const id = +line.dataset.line, l = store.cart.find(x => x.id === id);
    const b = e.target.closest('[data-qty]');
    if (b) store.setQty(id, l.qty + +b.dataset.qty);
    if (e.target.closest('[data-rm]')) store.remove(id);
  });
  $('#cart').addEventListener('change', e => {
    if (!e.target.matches('[data-qty-in]')) return;
    store.setQty(+e.target.closest('[data-line]').dataset.line, Math.max(0, parseInt(e.target.value, 10) || 0));
  });
}

/* ---------- mega menu ---------- */
function setupNav() {
  let timer;
  $$('.nav__item').forEach(item => {
    item.addEventListener('mouseenter', () => { clearTimeout(timer); timer = setTimeout(() => { $$('.nav__item.is-open').forEach(i => i !== item && i.classList.remove('is-open')); item.classList.add('is-open'); }, 90); });
    item.addEventListener('mouseleave', () => { clearTimeout(timer); timer = setTimeout(() => item.classList.remove('is-open'), 160); });
    item.addEventListener('focusin', () => item.classList.add('is-open'));
    item.addEventListener('focusout', e => { if (!item.contains(e.relatedTarget)) item.classList.remove('is-open'); });
  });
  const hdr = $('.hdr');
  const onScroll = () => hdr.classList.toggle('is-stuck', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  syncTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncTheme);
}

/* ---------- reveal on scroll ---------- */
export function reveal(root = document) {
  if (!('IntersectionObserver' in window)) return $$('.reveal', root).forEach(el => el.classList.add('is-in'));
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal:not(.is-in)', root).forEach(el => io.observe(el));
}

export function crumbs(list) {
  return `<nav class="crumbs" aria-label="ნავიგაცია"><a href="index.html">მთავარი</a>${list.map(([t, h]) => `${ui('right')}${h ? `<a href="${h}">${esc(t)}</a>` : `<span aria-current="page">${esc(t)}</span>`}`).join('')}</nav>`;
}

// titles to Mtavruli from the first paint on; the observer handles everything drawn later
if (document.body) watchCaps();

/* ---------- back to top and the chat (chat.js loads on first use) ---------- */
function setupFab(db) {
  const top = $('[data-top]'), btn = $('[data-chat]');
  const onScroll = () => top.classList.toggle('is-on', scrollY > 700);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  top.addEventListener('click', () => scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
  let chat = null;
  const toggle = async open => { chat = chat || await import('./chat.js'); chat.toggle(db, open); };
  btn.addEventListener('click', () => toggle());
  document.addEventListener('click', e => { if (e.target.closest('[data-chat-open]')) { e.preventDefault(); toggle(true); } });
  try {
    // a chat left open stays open on the next page (not on phones, where it covers the page)
    if (sessionStorage.getItem('mc.chat.open') === '1' && innerWidth > 760) toggle(true);
    if (!localStorage.getItem('mc.chat.seen')) $('[data-chat-dot]').hidden = false;
  } catch (e) { /* storage off */ }
}

/** Boot a page: load the catalog, draw the header, footer and overlays, wire everything. */
export async function boot(page = {}) {
  const db = await catalog();
  $('#mc-header').innerHTML = header(db, page);
  $('#mc-footer').innerHTML = footer(db);
  document.body.insertAdjacentHTML('beforeend', overlays(db));
  setupNav();
  setupSearch(db);
  setupEvents(db);
  setupLeadForms(db);
  setupFab(db);
  addEventListener('mc:account', renderAccount);
  addEventListener('storage', e => { if (e.key === 'mc.signed') renderAccount(); });
  const all = () => { renderCounts(); renderCart(db); renderFav(db); renderCmpBar(db); syncToggles(); };
  addEventListener('mc:cart', () => { renderCounts(); renderCart(db); });
  addEventListener('mc:fav', () => { renderCounts(); renderFav(db); syncToggles(); });
  addEventListener('mc:cmp', () => { renderCounts(); renderCmpBar(db); syncToggles(); });
  all();
  reveal();
  return db;
}
