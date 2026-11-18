/* Admin panel (admin.html): the site content without a developer.
   Contacts, showrooms, delivery and payment, page texts and the timeline, the products from Bitrix (which appear
   and how: name, text, photos, category; nothing is written back to Bitrix), brands (the about page's panel),
   the media centre, Q&A, vacancies (career.html) and uploaded files; personal logins (owner, editors) and the history of saves.
   Products, prices, stock and orders are not here: they come from Bitrix.
   bitrix mode: api/admin.php saves on this server.  static (preview): everything stays in this browser,
   any name signs in.  Each section is saved on its own; the preview frame shows unsaved changes.
   The spotlight slides are hidden (owner's choice, 2026-11-18): the window home page has no carousel; their data stays. */
import { $, $$, esc, ui, C, rich, safeUrl, money, norm } from './core.js';
import { catalog } from './api.js';
import { EN } from './admin-en.js';

/* The panel's language: Georgian, or English for whoever picks it (kept in this browser: mc.admin.lang).
   tr() gives a text's English from admin-en.js; the site's own content is never translated. */
const LANG = (() => { try { return localStorage.getItem('mc.admin.lang') === 'en' ? 'en' : 'ka'; } catch (e) { return 'ka'; } })();
const tr = s => (LANG === 'en' && EN[s]) || s;
document.documentElement.lang = LANG;
if (LANG === 'en') document.title = 'Control panel · Max Comfort';
const LANG_BTN = `<button class="iconbtn adm__lang" data-act="lang" lang="${LANG === 'en' ? 'ka' : 'en'}" aria-label="${LANG === 'en' ? 'ქართულად' : 'In English'}" title="${LANG === 'en' ? 'ქართულად' : 'In English'}">${LANG === 'en' ? 'KA' : 'EN'}</button>`;

const LIVE = C.mode === 'bitrix';
const LS = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (e) { return d; } },
  put(k, v) { localStorage.setItem(k, JSON.stringify(v)); },   // throws when the browser's storage is full
  set(k, v) { try { if (v == null) localStorage.removeItem(k); else LS.put(k, v); } catch (e) { /* full or off */ } }
};
const SS = {
  get(k, d) { try { const v = JSON.parse(sessionStorage.getItem(k)); return v ?? d; } catch (e) { return d; } },
  set(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } }
};
const clone = v => (v == null ? v : JSON.parse(JSON.stringify(v)));
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const MON = [tr('იან'), tr('თებ'), tr('მარ'), tr('აპრ'), tr('მაი'), tr('ივნ'), tr('ივლ'), tr('აგვ'), tr('სექ'), tr('ოქტ'), tr('ნოე'), tr('დეკ')];
/** 21 ოქტ 2026, 15:48 (browsers often have no Georgian date format) */
const when = s => { const d = new Date(s); return isNaN(d) ? '' : `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const kb = n => (n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

/* ---------- the server, or this browser in the preview ---------- */
class Fail extends Error {
  constructor(message, code = '', status = 0, data = null) { super(message); this.code = code; this.status = status; this.data = data; }
}
const remote = {
  async call(action, data = {}) {
    let res, j = null, text = '';
    try {
      res = await fetch(C.api + 'admin.php', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...data }) });
      text = await res.text();
    } catch (e) { throw new Fail(tr('სერვერთან კავშირი ვერ დამყარდა'), 'network'); }
    // an answer that is not JSON (a server error page, a cut-off answer): its status and first words, not a guess
    try { j = JSON.parse(text); } catch (e) {
      const said = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
      throw new Fail(`${tr('სერვერის პასუხი გაუგებარია (HTTP')} ${res.status})${said ? ': ' + said : ''}`, 'bad-answer', res.status);
    }
    if (!res.ok || !j || !j.ok) throw new Fail((j && j.error) || 'HTTP ' + res.status, j && j.code, res.status, j);
    return j;
  },
  state: () => remote.call('state'),
  setup: d => remote.call('setup', d),
  login: d => remote.call('login', d),
  logout: () => remote.call('logout'),
  password: d => remote.call('password', d),
  content: async () => (await remote.call('content')).content,
  save: async (section, value, rev) => (await remote.call('save', { section, value, rev })).content,
  history: async () => (await remote.call('history')).history,
  version: async id => (await remote.call('version', { id })).version,
  restore: async id => (await remote.call('restore', { id })).content,
  files: async () => (await remote.call('files')).files,
  deleteFile: (url, force = false) => remote.call('delete-file', { url, force }),
  users: async () => (await remote.call('users')).users,
  userSave: u => remote.call('user-save', u),
  userDelete: login => remote.call('user-delete', { login }),
  bitrix: async () => (await remote.call('bitrix')).bitrix,
  bitrixSwitch: d => remote.call('bitrix-switch', d),
  bitrixReconnect: () => remote.call('bitrix-reconnect'),
  journal: month => remote.call('journal', month ? { month } : {}),
  journalSend: id => remote.call('journal-send', id ? { id } : {}),
  products: () => remote.call('products'),
  productsRefresh: () => remote.call('products-refresh'),
  productSave: (key, value, rev) => remote.call('product-save', { key, value, rev }),
  productPics: async key => (await remote.call('product-pics', { key })).imgs,
  productsState: (keys, state) => remote.call('products-state', { keys, state }),
  async upload(blob, name) {
    let res, j = null;
    try {
      res = await fetch(C.api + 'admin.php?action=upload&name=' + encodeURIComponent(name), { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': blob.type || 'application/octet-stream', 'X-Requested-With': 'mc-admin' }, body: blob });
      j = await res.json();
    } catch (e) { throw new Fail(tr('ფაილი ვერ აიტვირთა'), 'network'); }
    if (!res.ok || !j || !j.ok) throw new Fail((j && j.error) || 'HTTP ' + res.status, j && j.code, res.status, j);
    return j.file;
  }
};
const PREVIEW_NOTE = tr('სატესტო რეჟიმში ეს არ ინახება');
const local = {
  async state() { return { user: SS.get('mc.admin.user', null), setup: false }; },
  async setup() { return {}; },
  async login({ login }) { const user = { login, name: login, role: 'owner' }; SS.set('mc.admin.user', user); return { user }; },
  async logout() { SS.set('mc.admin.user', null); },
  async password() { throw new Fail(PREVIEW_NOTE, 'preview'); },
  async content() {
    const c = LS.get('mc.content', null) || await fetch(C.content).then(r => r.json());
    c.revs = c.revs && !Array.isArray(c.revs) ? c.revs : {};
    return c;
  },
  async save(section, value, rev) {
    const c = await local.content(), cur = c.revs[section] || 0;
    if (rev !== cur) throw new Fail(tr('ამ განყოფილებას სხვამ შეცვალა'), 'conflict', 409, { content: c });
    c[section] = clone(value);
    c.revs[section] = cur + 1;
    c.at = new Date().toISOString();
    try { LS.put('mc.content', c); } catch (e) { throw new Fail(tr('ბრაუზერის მეხსიერება გაივსო: წაშალეთ რამდენიმე სურათი'), 'quota'); }
    const h = LS.get('mc.content.history', []);
    h.unshift({ id: uid('h'), at: c.at, by: S.user.login, name: S.user.name, section, rev: cur + 1, note: '', value: clone(value) });
    for (let n = 40; n > 0; n -= 10) { try { LS.put('mc.content.history', h.slice(0, n)); break; } catch (e) { /* smaller */ } }
    return c;
  },
  async history() { return LS.get('mc.content.history', []).map(({ value, ...h }) => h); },
  async version(id) { const v = LS.get('mc.content.history', []).find(h => h.id === id); if (!v) throw new Fail(tr('ვერსია ვერ მოიძებნა')); return v; },
  async restore(id) { const v = await local.version(id), c = await local.content(); return local.save(v.section, v.value, c.revs[v.section] || 0); },
  async files() { const used = JSON.stringify(LS.get('mc.content', {})); return LS.get('mc.files', []).map(f => ({ ...f, used: used.includes(f.url) })); },
  async deleteFile(url) { LS.set('mc.files', LS.get('mc.files', []).filter(f => f.url !== url)); return {}; },
  async users() { return [{ ...S.user, on: true, made: '', seen: '' }]; },
  async userSave() { throw new Fail(PREVIEW_NOTE, 'preview'); },
  async userDelete() { throw new Fail(PREVIEW_NOTE, 'preview'); },
  async bitrix() { throw new Fail(PREVIEW_NOTE, 'preview'); },
  async bitrixSwitch() { throw new Fail(PREVIEW_NOTE, 'preview'); },
  async bitrixReconnect() { throw new Fail(PREVIEW_NOTE, 'preview'); },
  async journal() { throw new Fail(PREVIEW_NOTE, 'preview'); },
  async journalSend() { throw new Fail(PREVIEW_NOTE, 'preview'); },
  products: () => pxLocalData(),
  productsRefresh: () => pxLocalData(),
  async productPics(key) { return (pxFake.items[key] || {}).imgs || []; },
  async productSave(key, value, rev) {
    const L = LS.get('mc.products', {}), old = L[key];
    if (!old) throw new Fail(tr('პროდუქტი ვერ მოიძებნა'));
    if ((old.rev || 0) !== rev) throw new Fail(tr('ეს პროდუქტი სხვამ შეცვალა'), 'conflict', 409, { entry: old });
    const e = { ...clone(value), rev: rev + 1, at: new Date().toISOString(), by: S.user.name };
    ['name', 'line', 'type', 'desc', 'cat', 'sub'].forEach(k => { if (!String(e[k] || '').trim()) delete e[k]; });
    if (!e.page) { delete e.page; delete e.how; }
    L[key] = e;
    LS.set('mc.products', L);
    return { entry: e, built: true };
  },
  async productsState(keys, state) {
    const L = LS.get('mc.products', {});
    let changed = 0;
    keys.forEach(k => { if (L[k] && L[k].state !== state) { L[k] = { ...L[k], state, rev: (L[k].rev || 0) + 1 }; changed++; } });
    LS.set('mc.products', L);
    return { layer: L, changed, built: true };
  },
  async upload(blob, name) {
    const url = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(blob); });
    const f = { url, name, size: blob.size, at: new Date().toISOString(), type: (blob.type.split('/')[1] || '').replace('jpeg', 'jpg') };
    const list = LS.get('mc.files', []);
    try { LS.put('mc.files', [f, ...list]); } catch (e) { throw new Fail(tr('ბრაუზერის მეხსიერება გაივსო: სატესტო რეჟიმში მხოლოდ რამდენიმე სურათი ეტევა'), 'quota'); }
    return f;
  }
};
const srv = LIVE ? remote : local;

/* ---------- state ---------- */
const S = {
  user: null, c: null, w: {}, dirty: new Set(), db: null, view: 'home', post: null, page: 'index',
  open: new Set(), defs: {}, frame: { texts: [], page: '' }
};
const SECTIONS = { contacts: tr('კონტაქტები'), showrooms: tr('შოურუმები'), delivery: tr('მიწოდება'), payment: tr('გადახდა'), shop: tr('ონლაინ გაყიდვა'), texts: tr('გვერდების ტექსტები'), timeline: tr('ისტორიის წლები'), spots: tr('სლაიდები'), brands: tr('ბრენდები'), posts: tr('მედია ცენტრი'), faq: tr('კითხვა-პასუხი'), jobs: tr('ვაკანსიები'), products: tr('პროდუქცია') };
const VIEWS = [
  { id: 'home', t: tr('მიმოხილვა'), ic: 'grid', s: [] },
  { id: 'journal', t: tr('შეკვეთები'), ic: 'bag', s: [], owner: true },
  { id: 'contacts', t: tr('კონტაქტები'), ic: 'phone', s: ['contacts'] },
  { id: 'showrooms', t: tr('შოურუმები'), ic: 'pin', s: ['showrooms'] },
  { id: 'orders', t: tr('მიწოდება და გადახდა'), ic: 'box', s: ['delivery', 'payment'] },
  { id: 'products', t: tr('პროდუქცია'), ic: 'fan', s: [] },
  { id: 'texts', t: tr('გვერდების ტექსტები'), ic: 'edit', s: ['texts', 'timeline'] },
  { id: 'spots', t: tr('სლაიდები'), ic: 'eye', s: ['spots'], hidden: true },   // no page shows them since the window home page
  { id: 'brands', t: tr('ბრენდები'), ic: 'shield', s: ['brands'] },
  { id: 'posts', t: tr('მედია ცენტრი'), ic: 'chat', s: ['posts'] },
  { id: 'faq', t: tr('კითხვა-პასუხი'), ic: 'info', s: ['faq'] },
  { id: 'jobs', t: tr('ვაკანსიები'), ic: 'cal', s: ['jobs'] },
  { id: 'files', t: tr('ფაილები'), ic: 'download', s: [] },
  { id: 'history', t: tr('ისტორია'), ic: 'clock', s: [] },
  { id: 'users', t: tr('მომხმარებლები'), ic: 'user', s: [], owner: true },
  { id: 'bitrix', t: 'Bitrix', ic: 'link', s: [], owner: true }
];
const view = () => VIEWS.find(v => v.id === S.view) || VIEWS[0];
const EMPTY = { contacts: {}, texts: {} };

/** The working copy of a section: changes live here until it is saved. */
function W(sec) {
  if (!(sec in S.w)) {
    let v = clone(S.c[sec] ?? EMPTY[sec] ?? []);
    if (sec === 'texts' && (Array.isArray(v) || !v)) v = {};
    if (sec === 'contacts') v = { company: '', phone: '', email: '', hours: '', ...v, social: { facebook: '', instagram: '', youtube: '', tiktok: '', linkedin: '', ...(v.social || {}) } };
    S.w[sec] = v;
  }
  return S.w[sec];
}
const getPath = (o, p) => (p ? p.split('.').reduce((x, k) => (x == null ? x : x[k]), o) : o);
function setPath(o, p, v) {
  const ks = p.split('.'), last = ks.pop();
  const t = ks.reduce((x, k) => (x[k] ??= /^\d+$/.test(k) ? [] : {}), o);
  t[last] = v;
}

/* the preview pages read this draft: the saved content with the unsaved changes on top */
let draftTimer = null;
function draftNow() {
  clearTimeout(draftTimer);
  const d = { ...clone(S.c), ...clone(S.w) };
  try { LS.put('mc.content.draft', d); } catch (e) { /* full: the preview shows the saved content */ }
}
const draft = () => { clearTimeout(draftTimer); draftTimer = setTimeout(draftNow, 250); };

function touch(sec) {
  S.dirty.add(sec);
  draft();
  bar();
  navDots();
}

/* ---------- small pieces ---------- */
function note(text, kind = '') {
  const box = $('.anotes') || document.body.appendChild(Object.assign(document.createElement('div'), { className: 'anotes', ariaLive: 'polite' }));
  const n = document.createElement('div');
  n.className = 'anote ' + (kind ? 'anote--' + kind : '');
  n.innerHTML = (kind === 'ok' ? ui('check') : kind === 'bad' ? ui('info') : '') + `<span>${esc(text)}</span>`;
  box.appendChild(n);
  setTimeout(() => { n.classList.add('out'); setTimeout(() => n.remove(), 300); }, kind === 'bad' ? 6000 : 3000);
}
function modal(html, wide = false) {
  const m = document.createElement('div');
  m.className = 'amodal';
  m.innerHTML = `<div class="amodal__scrim" data-x></div><div class="amodal__box ${wide ? 'amodal__box--wide' : ''}" role="dialog" aria-modal="true"><button class="iconbtn amodal__close" data-x aria-label="${tr('დახურვა')}">${ui('close')}</button>${html}</div>`;
  document.body.appendChild(m);
  const close = () => { m.remove(); document.removeEventListener('keydown', esc_); };
  const esc_ = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', esc_);
  m.addEventListener('click', e => { if (e.target.closest('[data-x]')) close(); });
  setTimeout(() => { const f = $('input,textarea,select,button:not([data-x])', m); if (f) f.focus(); }, 30);
  return { el: m, close };
}
function ask(text, ok = tr('დიახ'), danger = false) {
  return new Promise(done => {
    const m = modal(`<h2 class="h3">${esc(text)}</h2><div class="amodal__acts"><button class="btn btn--ghost btn--sm" data-no>${tr('გაუქმება')}</button><button class="btn ${danger ? 'btn--red' : ''} btn--sm" data-yes>${esc(ok)}</button></div>`);
    m.el.addEventListener('click', e => {
      if (e.target.closest('[data-yes]')) { m.close(); done(true); } else if (e.target.closest('[data-no],[data-x]')) { m.close(); done(false); }
    });
  });
}
function failed(err) {
  console.error(err);
  if (err.code === 'signed-out') { note(tr('სესია დასრულდა: შედით ხელახლა'), 'bad'); S.user = null; signIn(); return; }
  note(err.message || tr('შეცდომა'), 'bad');
}

const field = (label, bind, v, o = {}) => `<label class="afield ${o.cls || ''}"><span>${label}${o.hint ? `<small>${o.hint}</small>` : ''}</span>${o.area
  ? `<textarea class="textarea" data-b="${bind}" rows="${o.rows || 3}" ${o.max ? `maxlength="${o.max}"` : ''} placeholder="${esc(o.ph || '')}">${esc(v ?? '')}</textarea>`
  : `<input class="input" data-b="${bind}" type="${o.type || 'text'}" value="${esc(v ?? '')}" ${o.max ? `maxlength="${o.max}"` : ''} ${o.t ? `data-t="${o.t}"` : ''} placeholder="${esc(o.ph || '')}" ${o.attrs || ''}>`}</label>`;
const toggle = (label, bind, on) => `<label class="switch aswitch"><span>${label}</span><input type="checkbox" data-b="${bind}" ${on ? 'checked' : ''}></label>`;
const select = (label, bind, v, opts) => `<label class="afield"><span>${label}</span><select class="select" data-b="${bind}">${opts.map(([k, n]) => `<option value="${esc(k)}" ${String(k) === String(v ?? '') ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>`;
const itemActs = (list, i, n, del = true) => `<span class="aitem__acts">
  <button type="button" class="iconbtn" data-act="up" data-list="${list}" data-i="${i}" ${i ? '' : 'disabled'} aria-label="${tr('ზემოთ')}">${ui('up')}</button>
  <button type="button" class="iconbtn" data-act="down" data-list="${list}" data-i="${i}" ${i < n - 1 ? '' : 'disabled'} aria-label="${tr('ქვემოთ')}">${ui('down')}</button>
  ${del ? `<button type="button" class="iconbtn" data-act="del" data-list="${list}" data-i="${i}" aria-label="${tr('წაშლა')}">${ui('trash')}</button>` : ''}</span>`;
const addBtn = (list, label) => `<button type="button" class="btn btn--ghost btn--sm aadd" data-act="add" data-list="${list}">${ui('plus')}${label}</button>`;
const card = (key, title, body, acts, sub = '') => `<details class="aitem" data-open-key="${key}" ${S.open.has(key) ? 'open' : ''}><summary><span class="aitem__t">${title}${sub ? `<small>${sub}</small>` : ''}</span>${acts}${ui('down', 'aitem__chev')}</summary><div class="aitem__b">${body}</div></details>`;

/* new list items */
const NEW = {
  showrooms: () => ({ id: uid('s'), name: 'ახალი შოურუმი', address: '', phone: '', email: '', hq: false, map: '' }),
  delivery: () => ({ id: uid('d'), name: 'ახალი მიწოდება', note: '', price: null }),
  payment: () => ({ id: uid('p'), name: 'ახალი გადახდა', note: '' }),
  timeline: () => ({ year: String(new Date().getFullYear()), text: '' }),
  spots: () => ({ id: uid('h'), on: false, style: 'glow', eyebrow: '', title: 'ახალი სლაიდი', lead: '', button: 'ნახვა', looks: [{ name: '', hex: '#F4F4F1', img: '', product: null, url: '' }], facts: [], products: [] }),
  'spots.*.looks': () => ({ name: '', hex: '#F4F4F1', img: '', product: null, url: '' }),
  'spots.*.facts': () => ({ b: '', t: '' }),
  brands: () => ({ id: '', name: 'ახალი ბრენდი', logo: '', logoDark: '', strip: true, site: '', text: '' }),
  faq: () => ({ id: uid('q'), q: '', a: '', on: true }),
  jobs: () => ({ id: uid('j'), on: false, title: '', place: 'თბილისი', type: 'სრული განაკვეთი', text: '', to: '' })
};

/* ---------- product search (slides) ---------- */
function findProducts(q) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length || !S.db) return [];
  return S.db.products.filter(p => { const h = norm([p.title, p.sku, p.brandName, p.name].join(' ')); return words.every(w => h.includes(w)); }).slice(0, 8);
}
const prodLine = id => {
  const p = S.db && S.db.byId.get(+id);
  return p ? `<img src="${esc(p.src[0])}" alt=""><span><b>${esc(p.title)}</b><small>${esc(p.brandName || '')} · ${esc(p.sku || '')}${p.price ? ' · ' + money(p.price) : ''}</small></span>` : `<span class="muted">${id ? tr('პროდუქტი #') + esc(id) + tr(' (ვერ მოიძებნა)') : tr('არ არის არჩეული')}</span>`;
};
const picker = (bind, id, multi = false) => {
  const ids = multi ? (getPath(W(bind.split('|')[0]), bind.split('|')[1]) || []) : [];
  return `<div class="pp" data-pp="${bind}" ${multi ? 'data-multi' : ''}>
    ${multi ? `<div class="pp__chips">${ids.map((id, k) => `<span class="pp__chip">${prodLine(id)}<button type="button" class="iconbtn" data-act="pp-rm" data-pp-b="${bind}" data-i="${k}" aria-label="${tr('მოხსნა')}">${ui('close')}</button></span>`).join('') || tr('<span class="muted">არ არის არჩეული: გამოიყენება ფერების პროდუქტები და მათი სიმძლავრეები</span>')}</div>`
      : `<div class="pp__val">${prodLine(id)}${id ? `<button type="button" class="iconbtn" data-act="pp-clear" data-pp-b="${bind}" aria-label="${tr('მოხსნა')}">${ui('close')}</button>` : ''}</div>`}
    <div class="pp__find">${ui('search', 'ui--sm')}<input class="input" data-pp-q placeholder="${tr('მოძებნეთ: სახელი, კოდი ან ბრენდი')}" aria-label="${tr('პროდუქტის ძიება')}" autocomplete="off"></div>
    <div class="pp__menu" hidden></div>
  </div>`;
};

/* ---------- pictures: upload, library, address ---------- */
const imgPick = (bind, url, label = tr('სურათი'), accept = 'image/*') => `<div class="ip" data-ip="${bind}">
  <span class="afield__l">${label}</span>
  <div class="ip__row"><span class="ip__thumb">${url ? (/\.pdf$/i.test(url) ? ui('download') : `<img src="${esc(url)}" alt="">`) : ui('plus')}</span>
  <div class="ip__acts">
    <label class="btn btn--ghost btn--sm">${tr('ატვირთვა')}<input type="file" accept="${accept}" hidden data-up="${bind}"></label>
    <button type="button" class="btn btn--ghost btn--sm" data-act="lib" data-ip-b="${bind}">${tr('ბიბლიოთეკიდან')}</button>
    ${url ? `<button type="button" class="iconbtn" data-act="img-clear" data-ip-b="${bind}" aria-label="${tr('მოხსნა')}">${ui('trash')}</button>` : ''}
  </div></div>
  ${/^data:/.test(url || '') ? tr('<small class="muted">ატვირთულია ამ ბრაუზერში</small>') : `<input class="input input--sm" data-b="${bind}" value="${esc(url || '')}" placeholder="${tr('ან ჩასვით მისამართი: assets/... ან https://...')}">`}
</div>`;

/** Big photos are made smaller in the browser before they go up (WebP, at most 2400 px). */
async function prepare(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  const max = LIVE ? 2400 : 1400;
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  if (k === 1 && file.size < (LIVE ? 1.5e6 : 2.5e5)) return file;
  const cv = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) });
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  const blob = await new Promise(r => cv.toBlob(r, 'image/webp', 0.85));
  return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' }) : file;
}
async function upload(file) {
  if (file.size > 12 * 1048576) throw new Fail(tr('ფაილი 12 MB-ზე დიდია'));
  if (!/^(image\/(jpeg|png|gif|webp)|application\/pdf)$/.test(file.type)) throw new Fail(tr('მხოლოდ JPG, PNG, GIF, WebP და PDF'));
  const f = await prepare(file);
  return srv.upload(f, f.name || file.name);
}

/* the file library as a chooser (pictures for slides, brands, posts, the text editor) */
async function library(onPick, images = true) {
  const m = modal(`<h2 class="h3">${tr('ბიბლიოთეკა')}</h2><p class="muted">${tr('აირჩიეთ ფაილი ან ატვირთეთ ახალი.')}</p>
    <label class="btn btn--sm" style="margin:14px 0">${tr('ატვირთვა')}<input type="file" accept="${images ? 'image/*' : 'image/*,application/pdf'}" hidden data-lib-up></label>
    <div class="alib" data-lib><p class="muted">${tr('იტვირთება…')}</p></div>`, true);
  const fill = async () => {
    try {
      const files = (await srv.files()).filter(f => !images || f.type !== 'pdf');
      $('[data-lib]', m.el).innerHTML = files.length ? files.map(f => `<button type="button" class="alib__f" data-url="${esc(f.url)}">${f.type === 'pdf' ? ui('download') : `<img src="${esc(f.url)}" alt="" loading="lazy">`}<small>${esc(String(f.name || f.url).split('/').pop().slice(0, 28))}</small></button>`).join('') : tr('<p class="muted">ჯერ არაფერია ატვირთული.</p>');
    } catch (e) { failed(e); }
  };
  m.el.addEventListener('click', e => { const b = e.target.closest('[data-url]'); if (b) { m.close(); onPick(b.dataset.url); } });
  $('[data-lib-up]', m.el).addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try { const f = await upload(file); m.close(); onPick(f.url); } catch (err) { failed(err); }
  });
  fill();
}

/* ---------- formatted text editor (privacy text, post bodies) ---------- */
const RTE = [['h2', 'H2', tr('სათაური')], ['h3', 'H3', tr('ქვესათაური')], ['p', '¶', tr('აბზაცი')], ['bold', '<b>B</b>', tr('მუქი')], ['italic', '<i>I</i>', tr('დახრილი')],
  ['ul', '•', tr('სია')], ['ol', '1.', tr('დანომრილი სია')], ['quote', '❝', tr('ციტატა')], ['link', ui('link', 'ui--sm'), tr('ბმული')], ['img', ui('plus', 'ui--sm'), tr('სურათი')], ['clear', '⌫', tr('ფორმატის მოხსნა')]];
const rte = (attrs, html) => `<div class="rte"><div class="rte__bar" role="toolbar">${RTE.map(([c, l, t]) => `<button type="button" data-cmd="${c}" title="${t}" aria-label="${t}">${l}</button>`).join('')}</div>
  <div class="rte__area rich" contenteditable="true" role="textbox" aria-multiline="true" ${attrs}>${rich(html)}</div></div>`;
let rteRange = null;
function rteCmd(btn) {
  const area = btn.closest('.rte').querySelector('.rte__area');
  const c = btn.dataset.cmd;
  area.focus();
  if (rteRange) { const s = getSelection(); s.removeAllRanges(); s.addRange(rteRange); }
  const run = (cmd, v = null) => document.execCommand(cmd, false, v);
  if (['h2', 'h3', 'p'].includes(c)) run('formatBlock', c);
  else if (c === 'quote') run('formatBlock', 'blockquote');
  else if (c === 'bold' || c === 'italic') run(c);
  else if (c === 'ul') run('insertUnorderedList');
  else if (c === 'ol') run('insertOrderedList');
  else if (c === 'clear') { run('removeFormat'); run('formatBlock', 'p'); }
  else if (c === 'link') {
    const u = prompt(tr('ბმული: https://... ან გვერდი, მაგ. catalog.html?c=heating'));
    if (u && safeUrl(u)) run('createLink', u.trim());
  } else if (c === 'img') {
    const range = rteRange;
    library(url => { area.focus(); if (range) { const s = getSelection(); s.removeAllRanges(); s.addRange(range); } run('insertImage', url); area.dispatchEvent(new Event('input', { bubbles: true })); });
    return;
  }
  area.dispatchEvent(new Event('input', { bubbles: true }));
}

/* ---------- layout ---------- */
const ROLE = { owner: tr('მფლობელი'), editor: tr('რედაქტორი') };
const initials = n => String(n || '').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
function shell() {
  $('#adm').innerHTML = `
  <aside class="adm__nav" aria-label="${tr('განყოფილებები')}">
    <a class="adm__logo" href="index.html" target="_blank" rel="noopener" title="${tr('საიტის ნახვა')}"><img src="assets/brand/logo/mc-logo-white.svg" alt="Max Comfort" width="84" height="43"><span>${tr('მართვის')}<br>${tr('პანელი')}</span></a>
    <nav class="adm__links">${VIEWS.filter(v => !v.hidden && (!v.owner || S.user.role === 'owner')).map(v => `<a class="adm__link" href="#${v.id}" data-view="${v.id}">${ui(v.ic)}<span>${v.t}</span><i class="adm__dot" hidden></i></a>`).join('')}</nav>
    <div class="adm__me">
      <span class="av av--sm">${esc(initials(S.user.name))}</span><span class="adm__who"><b>${esc(S.user.name)}</b><small>${ROLE[S.user.role] || ''}</small></span>
      ${LANG_BTN}
      <button class="iconbtn" data-act="theme" aria-label="${tr('ნათელი ან მუქი რეჟიმი')}" title="${tr('ნათელი ან მუქი რეჟიმი')}">${ui('moon', 'only-l')}${ui('sun', 'only-d')}</button>
      <button class="iconbtn" data-act="me" aria-label="${tr('ანგარიში')}">${ui('edit')}</button>
      <button class="iconbtn" data-act="logout" aria-label="${tr('გასვლა')}">${ui('logout')}</button>
    </div>
  </aside>
  <main class="adm__main">
    ${LIVE ? '' : `<div class="adm__test">${ui('info', 'ui--sm')}<span>${tr('სატესტო რეჟიმი: ცვლილებები ინახება მხოლოდ ამ ბრაუზერში და ჩანს ამ ბრაუზერში გახსნილ საიტზე.')}</span></div>`}
    <div class="adm__alerts" data-alerts role="status" hidden></div>
    <header class="adm__bar"><div><h1 data-title></h1><small data-status></small></div><div class="adm__acts" data-acts></div></header>
    <div class="adm__body" data-body></div>
  </main>`;
}
function navDots() {
  $$('.adm__link').forEach(a => {
    const v = VIEWS.find(x => x.id === a.dataset.view);
    a.classList.toggle('is-on', v.id === S.view);
    const waits = v.id === 'journal' && !!(S.alerts && S.alerts.waiting);   // orders that did not reach Bitrix
    $('.adm__dot', a).hidden = !waits && !v.s.some(s => S.dirty.has(s));
    $('.adm__dot', a).classList.toggle('adm__dot--bad', waits);
  });
}
const PREVIEW = { contacts: 'about.html#contact', showrooms: 'about.html#contact', orders: 'about.html#delivery', texts: null, spots: 'index.html', brands: 'about.html#brands', posts: 'media.html', faq: 'media.html?t=faq', jobs: 'career.html#jobs' };
function bar() {
  const v = view();
  $('[data-title]').textContent = v.t;
  const dirty = v.s.filter(s => S.dirty.has(s));
  const revs = v.s.map(s => (S.c.revs || {})[s] || 0).reduce((a, b) => a + b, 0);
  $('[data-status]').textContent = dirty.length ? tr('შეუნახავი ცვლილებები') : v.s.length ? (revs ? tr('ყველაფერი შენახულია') : tr('საწყისი შიგთავსი')) : '';
  $('[data-status]').classList.toggle('is-dirty', !!dirty.length);
  const page = v.id === 'texts' ? S.page + '.html' : PREVIEW[v.id];
  $('[data-acts]').innerHTML = (page ? `<button class="btn btn--ghost btn--sm" data-act="preview" data-page="${page}">${ui('eye')}<span>${tr('ნახვა საიტზე')}</span></button>` : '') +
    (v.s.length ? `<button class="btn btn--red btn--sm" data-act="save" ${dirty.length ? '' : 'disabled'}>${ui('check')}<span>${tr('შენახვა')}</span></button>` : '');
}
function go(id) {
  if (!VIEWS.some(v => v.id === id && !v.hidden && (!v.owner || S.user.role === 'owner'))) id = 'home';
  S.view = id;
  if (id !== 'posts') S.post = null;
  render();
}
function render() {
  bar();
  navDots();
  const body = $('[data-body]');
  body.innerHTML = (R[S.view] || R.home)();
  body.scrollTop = 0;
  (A[S.view] || (() => {}))(body);
}

/* ---------- views ---------- */
const R = {}, A = {};   // R: the view's HTML, A: what it does once drawn

R.home = () => {
  const c = { ...S.c, ...S.w };
  const posts = (c.posts || []).filter(p => p.on).length;
  const tiles = [['showrooms', tr('შოურუმი'), (c.showrooms || []).length],
    ['brands', tr('ბრენდი ზოლში'), (c.brands || []).filter(b => b.strip).length], ['posts', tr('გამოქვეყნებული ჩანაწერი'), posts],
    ['faq', tr('კითხვა-პასუხი'), (c.faq || []).filter(f => f.on).length], ['jobs', tr('ღია ვაკანსია'), (c.jobs || []).filter(j => j.on && (!j.to || j.to >= today())).length], ['texts', tr('შეცვლილი ტექსტი'), Object.keys(Array.isArray(c.texts) ? {} : c.texts || {}).length]];
  return `<div class="ahome">
    <p class="ahome__hi">${tr('გამარჯობა,')} ${esc(S.user.name)}. ${tr('აქ იცვლება საიტის ტექსტები, კონტაქტები, ბრენდები, მედია ცენტრი და ვაკანსიები.')}</p>
    ${shopCard()}
    <div class="atiles">${tiles.map(([v, t, n]) => `<a class="atile" href="#${v}"><b>${n}</b><span>${t}</span></a>`).join('')}</div>
    <div class="ainfo">${ui('box')}<div><b>${tr('პროდუქცია, ფასები, მარაგი და შეკვეთები')}</b><p>${tr('ისინი Bitrix-იდან მოდის და იქ იცვლება. საიტი ახალ ფასს და მარაგს 15 წუთში აჩვენებს, შეკვეთები კი Bitrix-ში გარიგებებად ჩნდება.')}</p></div></div>
    <h2 class="ah2">${tr('ბოლო ცვლილებები')}</h2><div data-recent><p class="muted">${tr('იტვირთება…')}</p></div>
  </div>`;
};
/* Online selling: an owner pauses it here (content "shop"). While it is paused the server takes no order and
   the pages offer a call-back request instead of the cart; prices and products stay. */
const SHOP_NOTE = tr('ონლაინ შეკვეთა დროებით შეჩერებულია. დატოვეთ ნომერი და დაგიკავშირდებით, ან დაგვირეკეთ.');
const selling = () => ((S.c && S.c.shop) || {}).sell !== false;
function shopCard() {
  const s = { sell: true, note: '', ...((S.c && S.c.shop) || {}) }, own = S.user.role === 'owner';
  return `<section class="apanel ashop ${s.sell ? '' : 'is-off'}">
    <div class="ashop__h"><h2 class="ah2">${tr('ონლაინ გაყიდვა')}</h2><span class="apill apill--${s.sell ? 'on' : 'bad'}">${s.sell ? tr('ჩართულია') : tr('შეჩერებულია')}</span></div>
    <p class="muted">${s.sell ? tr('მყიდველები კალათით უკვეთავენ და შეკვეთები Bitrix-ში მიდის. შეჩერებისას შეკვეთა აღარ მიიღება; პროდუქცია და ფასები ისევ ჩანს, „კალათაში“ ღილაკის ნაცვლად კი „შეკვეთის მოთხოვნა“, რომელიც ზარის მოთხოვნას აგზავნის.')
      : tr('საიტი შეკვეთებს არ იღებს. „კალათაში“ ღილაკის ნაცვლად ჩანს „შეკვეთის მოთხოვნა“ (ზარის მოთხოვნა Bitrix-ში), კალათასა და შეკვეთის გვერდზე კი ქვემოთ მოცემული შეტყობინება.')}</p>
    ${own ? `<label class="afield"><span>${tr('შეტყობინება მყიდველებისთვის')} <small>${tr('ჩანს, როცა გაყიდვა შეჩერებულია; ცარიელი: სტანდარტული ტექსტი')}</small></span>
        <textarea class="textarea" rows="2" maxlength="300" data-shop-note placeholder="${esc(SHOP_NOTE)}">${esc(s.note)}</textarea></label>
      <div class="ashop__acts">${s.sell ? tr('<button class="btn btn--red btn--sm" data-act="shop-off">გაყიდვის შეჩერება</button>')
        : `<button class="btn btn--sm" data-act="shop-on">${ui('check')}<span>${tr('გაყიდვის განახლება')}</span></button><button class="btn btn--ghost btn--sm" data-act="shop-note">${tr('შეტყობინების შენახვა')}</button>`}</div>`
      : tr('<p class="muted">შეჩერება და განახლება მხოლოდ მფლობელს შეუძლია.</p>')}
  </section>`;
}
/** Saves "shop" at once (no save bar): on/off and the note; someone else's save meanwhile is read and saved over. */
async function shopSave(sell, btn) {
  const text = (($('[data-shop-note]') || {}).value || '').trim();
  btn.classList.add('is-busy');
  try {
    try {
      S.c = await srv.save('shop', { sell, note: text }, (S.c.revs || {}).shop || 0);
    } catch (err) {
      if (err.code !== 'conflict') throw err;
      S.c = err.data.content;
      S.c = await srv.save('shop', { sell, note: text }, (S.c.revs || {}).shop || 0);
    }
    draftNow();
    note(sell ? tr('ონლაინ გაყიდვა განახლდა') : tr('ონლაინ გაყიდვა შეჩერდა: საიტი შეკვეთებს აღარ იღებს'), 'ok');
  } catch (err) { failed(err); }
  showAlerts(S.alerts || {});
  render();
}
A.home = async body => {
  try {
    const h = (await srv.history()).slice(0, 6);
    $('[data-recent]', body).innerHTML = h.length ? `<ul class="alog-list">${h.map(x => `<li><b>${esc(SECTIONS[x.section] || x.section)}</b><span>${esc(x.name || x.by)}</span><small>${esc(when(x.at))}</small></li>`).join('')}</ul>` : tr('<p class="muted">ჯერ არაფერი შეცვლილა.</p>');
  } catch (e) { failed(e); }
};

R.contacts = () => {
  const k = W('contacts');
  return `<div class="aform">
    <section class="apanel"><h2 class="ah2">${tr('კომპანია')}</h2><div class="agrid">
      ${field(tr('ცხელი ხაზი'), 'contacts|phone', k.phone, { hint: tr('ჩანს ყველა გვერდზე'), max: 40 })}
      ${field(tr('ელ. ფოსტა'), 'contacts|email', k.email, { type: 'email', max: 120 })}
      ${field(tr('სამუშაო საათები'), 'contacts|hours', k.hours, { max: 80, ph: tr('ორშ-პარ 10:00-18:00') })}
      ${field(tr('კომპანიის სახელი'), 'contacts|company', k.company, { hint: tr('საავტორო უფლებების ზოლში'), max: 120 })}
    </div></section>
    <section class="apanel"><h2 class="ah2">${tr('სოციალური ქსელები')}</h2><p class="muted">${tr('ცარიელი ველის ღილაკი საიტზე არ ჩანს.')}</p><div class="agrid">
      ${['facebook', 'instagram', 'youtube', 'tiktok', 'linkedin'].map(n => field(n[0].toUpperCase() + n.slice(1).replace('tok', 'Tok').replace('edin', 'edIn'), 'contacts|social.' + n, k.social[n], { type: 'url', ph: 'https://' })).join('')}
    </div></section></div>`;
};

R.showrooms = () => {
  const list = W('showrooms');
  return `<div class="aform"><p class="muted">${tr('რიგი საიტზე და შეკვეთის გვერდზე იგივეა. პირველი შოურუმის მისამართი ჩანს ქვედა ზოლში.')}</p>
    ${list.map((s, i) => `<section class="apanel aitem--flat"><div class="apanel__head"><h2 class="ah2">${esc(s.name || tr('შოურუმი'))}</h2>${itemActs('showrooms|', i, list.length)}</div><div class="agrid">
      ${field(tr('სახელი'), `showrooms|${i}.name`, s.name, { max: 80 })}
      ${field(tr('მისამართი'), `showrooms|${i}.address`, s.address, { max: 160 })}
      ${field(tr('ტელეფონი'), `showrooms|${i}.phone`, s.phone, { max: 60 })}
      ${field(tr('ელ. ფოსტა'), `showrooms|${i}.email`, s.email, { type: 'email', max: 120 })}
      ${field(tr('რუკისთვის'), `showrooms|${i}.map`, s.map, { hint: tr('თუ რუკა არასწორ ადგილს აჩვენებს: ზუსტი მისამართი ან კოორდინატები, მაგ. 41.7369, 44.7798'), max: 200 })}
      <div class="afield">${toggle(tr('სათაო ოფისი'), `showrooms|${i}.hq`, s.hq)}<a class="link" target="_blank" rel="noopener" href="https://www.google.com/maps?q=${encodeURIComponent(s.map || tr('თბილისი, ') + s.address)}">${tr('რუკაზე ნახვა')} ${ui('ext', 'ui--sm')}</a></div>
    </div></section>`).join('')}
    ${addBtn('showrooms|', tr('შოურუმის დამატება'))}</div>`;
};

R.orders = () => {
  const d = W('delivery'), p = W('payment');
  const price = (x, i) => `<label class="afield"><span>${tr('ფასი')}</span><select class="select" data-price="${i}">
      <option value="free" ${x.price === 0 ? 'selected' : ''}>${tr('უფასო')}</option><option value="call" ${x.price == null ? 'selected' : ''}>${tr('ღირებულებას მენეჯერი ადასტურებს')}</option><option value="fixed" ${x.price > 0 ? 'selected' : ''}>${tr('ფიქსირებული ფასი')}</option></select></label>
    ${x.price > 0 ? field(tr('ფასი, ₾'), `delivery|${i}.price`, x.price, { type: 'number', t: 'num', attrs: 'min="0" step="0.5"' }) : ''}`;
  return `<div class="aform">
    <section class="apanel"><h2 class="ah2">${tr('მიწოდება')}</h2><p class="muted">${tr('შეკვეთის გვერდის არჩევანი და „ჩვენ შესახებ“ გვერდის ბლოკი. „გატანა შოურუმიდან“ შოურუმის არჩევანს აჩვენებს.')}</p>
      ${d.map((x, i) => `<div class="arow"><div class="agrid agrid--3">${field(tr('სახელი'), `delivery|${i}.name`, x.name, { max: 80 })}${field(tr('შენიშვნა'), `delivery|${i}.note`, x.note, { max: 160 })}${price(x, i)}</div>${itemActs('delivery|', i, d.length, x.id !== 'pickup')}</div>`).join('')}
      ${addBtn('delivery|', tr('მიწოდების დამატება'))}</section>
    <section class="apanel"><h2 class="ah2">${tr('გადახდა')}</h2>
      ${p.map((x, i) => `<div class="arow"><div class="agrid">${field(tr('სახელი'), `payment|${i}.name`, x.name, { max: 80 })}${field(tr('შენიშვნა'), `payment|${i}.note`, x.note, { max: 160 })}</div>${itemActs('payment|', i, p.length)}</div>`).join('')}
      ${addBtn('payment|', tr('გადახდის დამატება'))}</section></div>`;
};

/* page texts: the preview frame lists the page's editable texts; a click there opens the field here */
const TPAGES = [['index', tr('ქვედა ზოლი'), k => /^footer\./.test(k)], ['about', tr('ჩვენ შესახებ'), k => /^about\./.test(k)], ['media', tr('მედია ცენტრი'), k => /^media\./.test(k)], ['career', tr('კარიერა'), k => /^career\./.test(k)]];
const GROUPS = { footer: tr('ქვედა ზოლი (ყველა გვერდზე)'),
  'about.hero': tr('თავი'), 'about.story': tr('კომპანია'), 'about.brands': tr('ბრენდები'), 'about.tri': tr('მისია, ხედვა, დაპირება'), 'about.val': tr('ღირებულებები'), 'about.svc': tr('სერვისი'), 'about.del': tr('მიწოდება და გადახდა'), 'about.hist': tr('ისტორია'), 'about.stat': tr('ციფრები'), 'about.contact': tr('კონტაქტი'), 'about.privacy': tr('კონფიდენციალურობა'), media: tr('მედია ცენტრი'), 'media.band': tr('ზარის ზოლი'),
  'career.hero': tr('თავი'), 'career.dir': tr('მიმართულებები'), 'career.jobs': tr('ვაკანსიები'), 'career.apply': tr('განაცხადი') };
const PARTS = { fact: tr('ფაქტი'), eyebrow: tr('წარწერა'), title: tr('სათაური'), lead: tr('ტექსტი'), text: tr('ტექსტი'), note: tr('ქვეწარწერა'), n: tr('რიცხვი'), t: tr('წარწერა'), rich: tr('ტექსტი'), about: tr('ტექსტი'),
  stat: tr('ციფრი'), cooling: tr('კონდიცირება'), heating: tr('გათბობა'), ventilation: tr('ვენტილაცია'), water: tr('წყალმომარაგება') };
function textGroup(key) {
  const p = key.split('.');
  const g = p.length > 2 ? p[0] + '.' + p[1] : p[0];
  const rest = p.length > 2 ? p.slice(2) : p.slice(1);
  return [GROUPS[g] || g, rest.map(x => PARTS[x] || (/^\d+$/.test(x) ? '#' + x : x)).join(' · ')];
}
R.texts = () => {
  const tl = W('timeline');
  return `<div class="atabs">${TPAGES.map(([id, n]) => `<button class="atab ${S.page === id ? 'is-on' : ''}" data-act="tpage" data-page="${id}">${n}</button>`).join('')}</div>
  <div class="asplit">
    <div class="asplit__l"><p class="muted">${tr('დააჭირეთ ტექსტს მარჯვნივ, ან შეცვალეთ აქ. ცარიელი ველი საწყის ტექსტს აბრუნებს.')}</p><div data-tfields><p class="muted">${tr('გვერდი იტვირთება…')}</p></div>
      ${S.page === 'about' ? `<section class="apanel"><h2 class="ah2">${tr('ისტორიის წლები')}</h2>${tl.map((x, i) => `<div class="arow"><div class="agrid agrid--yt">${field(tr('წელი'), `timeline|${i}.year`, x.year, { max: 20 })}${field(tr('ტექსტი'), `timeline|${i}.text`, x.text, { max: 400 })}</div>${itemActs('timeline|', i, tl.length)}</div>`).join('')}${addBtn('timeline|', tr('წლის დამატება'))}</section>` : ''}
    </div>
    <div class="asplit__r"><iframe class="aframe" title="${tr('გვერდის გადახედვა')}" data-frame></iframe></div>
  </div>`;
};
A.texts = body => { frame(body, S.page + '.html'); };
function textFields() {
  const box = $('[data-tfields]');
  if (!box) return;
  const T = W('texts');
  const test = (TPAGES.find(p => p[0] === S.page) || TPAGES[0])[2];
  const groups = new Map();
  // in the order the page shows them
  const fd = $('[data-frame]') && $('[data-frame]').contentDocument, at = new Map();
  if (fd) $$('[data-c]', fd).forEach((el, n) => { if (!at.has(el.dataset.c)) at.set(el.dataset.c, n); });
  const order = k => (at.has(k) ? at.get(k) : 1e6);
  S.frame.texts.filter(x => test(x.key)).sort((a, b) => order(a.key) - order(b.key)).forEach(x => {
    S.defs[x.key] = x.def;
    const [g, label] = textGroup(x.key);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push({ ...x, label });
  });
  box.innerHTML = [...groups].map(([g, items]) => `<section class="apanel"><h2 class="ah2">${esc(g)}</h2>${items.map(x => {
    const v = T[x.key] ?? x.def ?? '';
    return `<div class="afield atext ${T[x.key] != null ? 'is-changed' : ''}" data-key="${esc(x.key)}"><span>${esc(x.label)}<button type="button" class="alink" data-act="reset" data-key="${esc(x.key)}" ${T[x.key] != null ? '' : 'hidden'}>${tr('საწყისზე დაბრუნება')}</button></span>
      ${x.rich ? rte(`data-tx="${esc(x.key)}"`, v) : `<textarea class="textarea" data-tx="${esc(x.key)}" rows="${String(v).length > 90 ? 3 : 1}">${esc(v)}</textarea>`}</div>`;
  }).join('')}</section>`).join('') || tr('<p class="muted">ამ გვერდზე შესაცვლელი ტექსტი ვერ მოიძებნა.</p>');
}
function setText(key, value) {
  const T = W('texts');
  const def = S.defs[key] ?? '';
  const same = String(value).trim() === String(def).trim() || !String(value).trim();
  if (same) delete T[key]; else T[key] = value;
  touch('texts');
  const f = $(`.atext[data-key="${CSS.escape(key)}"]`);
  if (f) { f.classList.toggle('is-changed', !same); $('[data-act=reset]', f).hidden = same; }
  post({ mc: 'text', key, value: same ? '' : value });
}

/* the preview frame */
let frameSel = '';
function frame(body, page, sel = '') {
  frameSel = sel;
  draftNow();
  const f = $('[data-frame]', body);
  if (f) f.src = page + (page.includes('?') ? '&' : '?') + 'edit=1';
}
const post = msg => { const f = $('[data-frame]'); if (f && f.contentWindow) f.contentWindow.postMessage(msg, location.origin); };
let reloadTimer = null;
const reloadFrame = () => { clearTimeout(reloadTimer); reloadTimer = setTimeout(() => { draftNow(); const f = $('[data-frame]'); if (f) f.contentWindow.location.reload(); }, 700); };
addEventListener('message', e => {
  if (e.origin !== location.origin || !e.data || !e.data.mc) return;
  if (e.data.mc === 'ready') {
    S.frame = { texts: e.data.texts || [], page: e.data.page };
    if (S.view === 'texts') textFields();
    if (frameSel) post({ mc: 'scroll', sel: frameSel });
  } else if (e.data.mc === 'pick' && S.view === 'texts') {
    const f = $(`.atext[data-key="${CSS.escape(e.data.key)}"]`);
    if (f) { f.scrollIntoView({ block: 'center', behavior: 'smooth' }); const i = $('textarea,.rte__area', f); if (i) i.focus({ preventScroll: true }); f.classList.add('is-flash'); setTimeout(() => f.classList.remove('is-flash'), 1200); }
  }
});

R.spots = () => {
  const list = W('spots');
  const STYLE = [['glow', tr('მუქი, წითელი ნათებით')], ['round', tr('მუქი, მრგვალი ლურჯი ფონით')]];
  const FACT = [['', tr('ტექსტი')], ['kw', tr('სიმძლავრეები (ავტომატურად)')], ['price', tr('ფასი -დან (ავტომატურად)')]];
  return `<div class="asplit"><div class="asplit__l">
    <p class="muted">${tr('მთავარი გვერდის კარუსელი. გამორთული სლაიდი საიტზე არ ჩანს.')}</p>
    ${list.map((s, i) => card('spots|' + i, esc(s.title || tr('სლაიდი')), `
      <div class="agrid">${toggle(tr('ჩართულია'), `spots|${i}.on`, s.on)}${select(tr('ფონი'), `spots|${i}.style`, s.style, STYLE)}
      ${field(tr('წარწერა'), `spots|${i}.eyebrow`, s.eyebrow, { max: 80, ph: tr('მაგ. ბრენდი') })}${field(tr('სათაური'), `spots|${i}.title`, s.title, { max: 120 })}</div>
      ${field(tr('ტექსტი'), `spots|${i}.lead`, s.lead, { area: true, max: 600 })}
      ${field(tr('ღილაკის წარწერა'), `spots|${i}.button`, s.button, { max: 60 })}
      <h3 class="ah3">${tr('ფერები / ვარიანტები')} <small>${tr('თითო: სურათი, ფერის ნიმუში და პროდუქტი (ან ბმული)')}</small></h3>
      ${(s.looks || []).map((l, k) => `<div class="alook"><div class="alook__head"><b>${esc(l.name || tr('ვარიანტი ') + (k + 1))}</b>${itemActs(`spots|${i}.looks`, k, s.looks.length)}</div>
        <div class="agrid">${field(tr('სახელი'), `spots|${i}.looks.${k}.name`, l.name, { max: 60, ph: tr('მაგ. თეთრი') })}<label class="afield"><span>${tr('ფერის ნიმუში')}</span><input type="color" class="acolor" data-b="spots|${i}.looks.${k}.hex" value="${esc(l.hex || '#ffffff')}"></label></div>
        ${imgPick(`spots|${i}.looks.${k}.img`, l.img, tr('სურათი (გამჭვირვალე ფონით)'))}
        <div class="afield"><span>${tr('პროდუქტი')}</span>${picker(`spots|${i}.looks.${k}.product`, l.product)}</div>
        ${field(tr('ან ბმული'), `spots|${i}.looks.${k}.url`, l.url, { ph: 'catalog.html?c=cooling', hint: tr('თუ პროდუქტი არ არის არჩეული') })}</div>`).join('')}
      ${addBtn(`spots|${i}.looks`, tr('ვარიანტის დამატება'))}
      <h3 class="ah3">${tr('ფაქტები')} <small>${tr('სათაურის ქვეშ, ციფრებით')}</small></h3>
      ${(s.facts || []).map((f, k) => `<div class="arow"><div class="agrid agrid--3"><label class="afield"><span>${tr('სახე')}</span><select class="select" data-fact="${i}.${k}">${FACT.map(([v, n]) => `<option value="${v}" ${(f.auto || '') === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        ${f.auto ? tr('<p class="muted afact-auto">ითვლება სლაიდის პროდუქტებიდან</p>') : field(tr('ციფრი'), `spots|${i}.facts.${k}.b`, f.b, { max: 30, ph: 'A+++' }) + field(tr('წარწერა'), `spots|${i}.facts.${k}.t`, f.t, { max: 60, ph: tr('გაგრილება') })}</div>${itemActs(`spots|${i}.facts`, k, s.facts.length)}</div>`).join('')}
      ${addBtn(`spots|${i}.facts`, tr('ფაქტის დამატება'))}
      <h3 class="ah3">${tr('ხაზის პროდუქტები')} <small>${tr('ავტომატური ფაქტებისთვის; ცარიელი: ვარიანტების პროდუქტები და მათი სიმძლავრეები')}</small></h3>
      ${picker(`spots|${i}.products`, null, true)}`, itemActs('spots|', i, list.length), s.on ? tr('ჩართულია') : tr('გამორთულია'))).join('')}
    ${addBtn('spots|', tr('სლაიდის დამატება'))}
  </div><div class="asplit__r"><iframe class="aframe" title="${tr('მთავარი გვერდის გადახედვა')}" data-frame></iframe></div></div>`;
};
A.spots = body => frame(body, 'index.html', '[data-spot]');

R.brands = () => {
  const list = W('brands');
  const cat = [['', tr('— კატალოგში არ არის —')], ...(S.db ? S.db.brands.map(b => [b.id, b.name]) : [])];
  return `<div class="asplit"><div class="asplit__l">
    <p class="muted">${tr('„ზოლში“ მონიშნული ბრენდები „ჩვენ შესახებ“ გვერდზე ჩანს, ფერადი ლოგოებით, ამ რიგით. კატალოგის ბრენდის ტექსტი ჩანს ბრენდის გვერდზე.')}</p>
    ${list.map((b, i) => card('brands|' + i, `${b.logo ? `<img class="aitem__logo" src="${esc(b.logo)}" alt="">` : ''}${esc(b.name || tr('ბრენდი'))}`, `
      <div class="agrid">${field(tr('სახელი'), `brands|${i}.name`, b.name, { max: 80 })}${select(tr('კატალოგის ბრენდი'), `brands|${i}.id`, b.id, cat)}</div>
      <div class="agrid">${imgPick(`brands|${i}.logo`, b.logo, tr('ლოგო (ნათელ ფონზე)'))}${imgPick(`brands|${i}.logoDark`, b.logoDark, tr('ლოგო მუქ რეჟიმში (არასავალდებულო)'))}</div>
      <div class="agrid">${toggle(tr('ზოლში „ჩვენ შესახებ“ გვერდზე'), `brands|${i}.strip`, b.strip)}${field(tr('ვებგვერდი'), `brands|${i}.site`, b.site, { type: 'url', ph: 'https://' })}</div>
      ${field(tr('ტექსტი ბრენდის გვერდზე'), `brands|${i}.text`, b.text, { area: true, max: 1500 })}`, itemActs('brands|', i, list.length), b.strip ? tr('ზოლში') : '')).join('')}
    ${addBtn('brands|', tr('ბრენდის დამატება'))}
  </div><div class="asplit__r"><iframe class="aframe" title="${tr('„ჩვენ შესახებ“ გვერდის გადახედვა')}" data-frame></iframe></div></div>`;
};
A.brands = body => frame(body, 'about.html', '#brands');

const PTYPES = { news: tr('სიახლე'), blog: tr('ბლოგი'), promo: tr('აქცია') };
function postState(p) {
  if (!p.on) return [tr('დამალულია'), 'off'];
  if ((p.date || '') > today()) return [tr('დაგეგმილია ') + p.date, 'soon'];
  if (p.type === 'promo' && p.to && p.to < today()) return [tr('დასრულდა'), 'off'];
  return [tr('გამოქვეყნებულია'), 'on'];
}
R.posts = () => {
  const list = W('posts');
  if (S.post != null && list[S.post]) return postEditor(list[S.post], S.post);
  S.post = null;
  const f = SS.get('mc.admin.ptype', '');
  const rows = list.map((p, i) => ({ p, i })).filter(({ p }) => !f || p.type === f);
  return `<div class="aform">
    <div class="apost-bar"><div class="atabs">${[['', tr('ყველა')], ['news', tr('სიახლეები')], ['blog', tr('ბლოგი')], ['promo', tr('აქციები')]].map(([k, n]) => `<button class="atab ${f === k ? 'is-on' : ''}" data-act="ptype" data-type="${k}">${n} <small>${k ? list.filter(p => p.type === k).length : list.length}</small></button>`).join('')}</div>
      <button class="btn btn--red btn--sm" data-act="post-new">${ui('plus')}<span>${tr('ახალი ჩანაწერი')}</span></button></div>
    ${rows.length ? `<div class="aposts">${rows.map(({ p, i }) => { const [st, k] = postState(p); return `<button class="apost" data-act="post-open" data-i="${i}">
      <span class="apost__img">${p.cover ? `<img src="${esc(p.cover)}" alt="">` : ''}</span>
      <span class="apost__t"><b>${esc(p.title || tr('უსათაურო'))}</b><small>${PTYPES[p.type] || ''} · ${esc(p.date || '')}</small></span>
      <span class="apill apill--${k}">${esc(st)}</span></button>`; }).join('')}</div>`
      : tr('<div class="aempty"><p>ჯერ ჩანაწერი არ არის.</p><p class="muted">სიახლე, ბლოგის სტატია ან აქცია: აქცია მთავარ გვერდზეც გამოჩნდება, სანამ მოქმედებს.</p></div>')}
  </div>`;
};
function postEditor(p, i) {
  const b = k => `posts|${i}.${k}`;
  return `<div class="aform">
    <div class="apost-bar"><button class="btn btn--ghost btn--sm" data-act="post-back">${ui('left')}<span>${tr('ყველა ჩანაწერი')}</span></button>
      <span class="apost-bar__r"><button class="btn btn--ghost btn--sm" data-act="post-view" data-id="${esc(p.id)}">${ui('eye')}<span>${tr('ნახვა')}</span></button><button class="iconbtn" data-act="post-del" data-i="${i}" aria-label="${tr('წაშლა')}">${ui('trash')}</button></span></div>
    <section class="apanel"><div class="agrid agrid--3">
      ${select(tr('სახე'), b('type'), p.type, Object.entries(PTYPES))}
      ${field(tr('თარიღი'), b('date'), p.date, { type: 'date', hint: tr('მომავალი თარიღი: გამოჩნდება იმ დღეს') })}
      <div class="afield">${toggle(tr('გამოქვეყნებულია'), b('on'), p.on)}${toggle(tr('პირველი სიაში'), b('pin'), p.pin)}</div></div>
      ${field(tr('სათაური'), b('title'), p.title, { max: 200 })}
      ${field(tr('მოკლე აღწერა'), b('excerpt'), p.excerpt, { area: true, rows: 2, max: 400, hint: tr('ბარათზე და სათაურის ქვეშ') })}
      ${imgPick(b('cover'), p.cover, tr('მთავარი სურათი'))}
      ${p.type === 'promo' ? `<div class="agrid">${field(tr('აქცია იწყება'), b('from'), p.from, { type: 'date' })}${field(tr('აქცია მთავრდება'), b('to'), p.to, { type: 'date', hint: tr('ბოლო დღის შემდეგ საიტიდან ქრება') })}</div>` : ''}
      <div class="afield"><span>${tr('ტექსტი')}</span>${rte(`data-rb="${b('body')}"`, p.body)}</div>
      <div class="agrid">${field(tr('ღილაკის ბმული'), b('link'), p.link, { ph: tr('catalog.html?c=cooling ან https://'), hint: tr('არასავალდებულო') })}${field(tr('ღილაკის წარწერა'), b('linkText'), p.linkText, { max: 60, ph: tr('ნახვა') })}</div>
    </section></div>`;
}

R.faq = () => {
  const list = W('faq');
  return `<div class="aform"><p class="muted">${tr('ჩანს მედია ცენტრში, „კითხვა-პასუხის“ ჩანართში, ამ რიგით.')}</p>
    ${list.map((f, i) => card('faq|' + i, esc(f.q || tr('ახალი კითხვა')), `
      ${field(tr('კითხვა'), `faq|${i}.q`, f.q, { max: 300 })}
      ${field(tr('პასუხი'), `faq|${i}.a`, f.a, { area: true, rows: 4, max: 4000, hint: tr('ახალი ხაზი = ახალი აბზაცი') })}
      ${toggle(tr('ჩანს საიტზე'), `faq|${i}.on`, f.on)}`, itemActs('faq|', i, list.length), f.on ? '' : tr('დამალულია'))).join('')}
    ${addBtn('faq|', tr('კითხვის დამატება'))}</div>`;
};

/* vacancies (career.html): shown in this order; one past its last day leaves the page by itself */
R.jobs = () => {
  const list = W('jobs'), day = today();
  return `<div class="aform"><p class="muted">${tr('ჩანს გვერდზე „კარიერა“, ამ რიგით. ცარიელი სიისას გვერდი რეზიუმეს გამოგზავნას სთავაზობს. განაცხადები Bitrix-ში ლიდად მოდის: „ვაკანსიის განაცხადი“.')}</p>
    ${list.map((j, i) => card('jobs|' + i, esc(j.title || tr('ახალი ვაკანსია')), `
      ${field(tr('პოზიცია'), `jobs|${i}.title`, j.title, { max: 120, ph: tr('მაგ. გაყიდვების კონსულტანტი') })}
      <div class="agrid agrid--3">
        ${field(tr('ადგილი'), `jobs|${i}.place`, j.place, { max: 80, ph: tr('თბილისი') })}
        ${field(tr('სამუშაო გრაფიკი'), `jobs|${i}.type`, j.type, { max: 60, ph: tr('სრული განაკვეთი') })}
        ${field(tr('ბოლო ვადა'), `jobs|${i}.to`, j.to, { type: 'date', hint: tr('არასავალდებულო; ამ დღის შემდეგ ქრება') })}
      </div>
      ${field(tr('აღწერა'), `jobs|${i}.text`, j.text, { area: true, rows: 6, max: 4000, hint: tr('მოვალეობები, მოთხოვნები, რას გთავაზობთ. ახალი ხაზი = ახალი აბზაცი') })}
      ${toggle(tr('ჩანს საიტზე'), `jobs|${i}.on`, j.on)}`, itemActs('jobs|', i, list.length),
      !j.on ? tr('დამალულია') : j.to && j.to < day ? tr('ვადა გავიდა') : [j.place, j.type].filter(Boolean).map(esc).join(' · '))).join('')}
    ${addBtn('jobs|', tr('ვაკანსიის დამატება'))}</div>`;
};

R.files = () => `<div class="aform">
  <label class="adrop" data-drop>${ui('download')}<b>${tr('ჩააგდეთ ფაილები აქ ან აირჩიეთ')}</b><small>JPG, PNG, WebP, GIF ${tr('და PDF, 12 MB-მდე. დიდი ფოტოები ავტომატურად პატარავდება.')}</small><input type="file" multiple accept="image/*,application/pdf" hidden data-files-up></label>
  <div class="alib alib--page" data-files><p class="muted">${tr('იტვირთება…')}</p></div></div>`;
A.files = async body => {
  const box = $('[data-files]', body);
  const fill = async () => {
    try {
      const files = await srv.files();
      box.innerHTML = files.length ? files.map(f => `<div class="alib__f">${f.type === 'pdf' ? ui('download') : `<img src="${esc(f.url)}" alt="" loading="lazy">`}
        <small>${esc(String(f.name || f.url).split('/').pop().slice(0, 34))}</small><small class="muted">${kb(f.size)}${f.used ? tr(' · გამოყენებულია') : ''}</small>
        <span class="alib__acts">${/^data:/.test(f.url) ? '' : `<button type="button" class="iconbtn" data-act="copy" data-url="${esc(f.url)}" aria-label="${tr('ბმულის კოპირება')}">${ui('link')}</button>`}<button type="button" class="iconbtn" data-act="file-del" data-url="${esc(f.url)}" data-used="${f.used ? 1 : ''}" aria-label="${tr('წაშლა')}">${ui('trash')}</button></span></div>`).join('')
        : tr('<p class="muted">ჯერ არაფერია ატვირთული.</p>');
    } catch (e) { failed(e); }
  };
  const send = async files => {
    for (const file of files) {
      try { await upload(file); note(file.name + tr(': აიტვირთა'), 'ok'); } catch (e) { failed(e); }
    }
    fill();
  };
  $('[data-files-up]', body).addEventListener('change', e => send([...e.target.files]));
  const drop = $('[data-drop]', body);
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('is-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('is-over'); send([...e.dataTransfer.files]); });
  body.filesReload = fill;
  fill();
};

R.history = () => `<div class="aform"><p class="muted">${tr('ყოველი შენახვა აქ რჩება: ვინ, როდის, რომელი განყოფილება. „აღდგენა“ იმ მომენტის ვერსიას აბრუნებს (როგორც ახალ შენახვას).')}</p><div data-hist><p class="muted">${tr('იტვირთება…')}</p></div></div>`;
A.history = async body => {
  try {
    const h = await srv.history();
    $('[data-hist]', body).innerHTML = h.length ? `<div class="ahist">${h.map(x => `<div class="ahist__r"><span><b>${esc(SECTIONS[x.section] || x.section)}</b><small>${esc(x.note || '')}</small></span><span>${esc(x.name || x.by)}</span><small>${esc(when(x.at))}</small>
      <span class="ahist__acts"><button class="btn btn--ghost btn--sm" data-act="ver" data-id="${esc(x.id)}">${tr('ნახვა')}</button><button class="btn btn--ghost btn--sm" data-act="restore" data-id="${esc(x.id)}" data-sec="${esc(x.section)}">${tr('აღდგენა')}</button></span></div>`).join('')}</div>`
      : tr('<p class="muted">ჯერ არაფერი შენახულა.</p>');
  } catch (e) { failed(e); }
};
/** A saved version, readable: lists by their names, the rest as label: value. */
function summary(sec, v) {
  if (sec === 'products' && v) {   // one product, or a show/hide of several
    if (v.keys) return `<p>${v.state === 'shown' ? tr('გამოჩნდა საიტზე') : tr('დაიმალა')}: ${v.keys.length} ${tr('პროდუქტი')}</p><p class="muted">Bitrix ID: ${esc(v.keys.map(k => k.slice(1)).join(', ').slice(0, 600))}</p>`;
    const e = v.entry || {};
    return `<dl class="asum"><dt>Bitrix ID</dt><dd>${esc(String(v.key || '').slice(1))}</dd><dt>${tr('საიტზე')}</dt><dd>${esc((PXSTATE[e.state] || [e.state])[0])}</dd>${['name', 'line', 'type', 'cat', 'sub', 'page', 'desc'].filter(k => e[k]).map(k => `<dt>${k}</dt><dd>${esc(String(e[k]).slice(0, 300))}</dd>`).join('')}${e.imgs ? `<dt>${tr('ფოტოები')}</dt><dd>${e.imgs.length}</dd>` : ''}${e.specs ? `<dt>${tr('მახასიათებლები')}</dt><dd>${e.specs.length}</dd>` : ''}</dl>`;
  }
  if (Array.isArray(v)) return `<ol class="asum">${v.map(x => `<li>${esc(x.name || x.title || x.q || [x.year, x.text].filter(Boolean).join(' · ') || JSON.stringify(x).slice(0, 80))}${x.on === false ? tr(' <small class="muted">(გამორთული)</small>') : ''}</li>`).join('')}</ol>`;
  if (v && typeof v === 'object') return `<dl class="asum">${Object.entries(v).map(([k, x]) => `<dt>${esc(k)}</dt><dd>${esc(typeof x === 'object' ? Object.entries(x || {}).filter(([, y]) => y).map(([a, y]) => a + ': ' + y).join(', ') : String(x).replace(/<[^>]+>/g, ' ').slice(0, 300))}</dd>`).join('')}</dl>`;
  return tr('<p class="muted">ცარიელია</p>');
}

R.users = () => `<div class="aform"><section class="apanel"><h2 class="ah2">${tr('ადამიანები')}</h2><div data-users><p class="muted">${tr('იტვირთება…')}</p></div></section>
  <section class="apanel"><h2 class="ah2">${tr('ახალი მომხმარებელი')}</h2><form class="agrid" data-newuser>
    <label class="afield"><span>${tr('სახელი და გვარი')}</span><input class="input" name="name" required maxlength="80"></label>
    <label class="afield"><span>${tr('შესვლის სახელი')} <small>${tr('ლათინურად, მაგ. irina')}</small></span><input class="input" name="login" required pattern="[A-Za-z0-9][A-Za-z0-9._\\-]{1,31}" autocomplete="off"></label>
    <label class="afield"><span>${tr('პაროლი')} <small>8+ ${tr('სიმბოლო')}</small></span><input class="input" name="password" type="password" minlength="8" required autocomplete="new-password"></label>
    <label class="afield"><span>${tr('როლი')}</span><select class="select" name="role"><option value="editor">${tr('რედაქტორი: ცვლის შიგთავსს')}</option><option value="owner">${tr('მფლობელი: ასევე მართავს მომხმარებლებს')}</option></select></label>
    <div><button class="btn btn--sm">${ui('plus')}<span>${tr('დამატება')}</span></button></div></form></section></div>`;
A.users = async body => {
  try {
    const users = await srv.users();
    $('[data-users]', body).innerHTML = `<div class="ahist">${users.map(u => `<div class="ahist__r"><span><b>${esc(u.name)}</b><small>${esc(u.login)}</small></span><span>${ROLE[u.role] || u.role}${u.on ? '' : tr(' · <span class="apill apill--off">გამორთულია</span>')}</span><small>${u.seen ? tr('ბოლოს: ') + esc(when(u.seen)) : ''}</small>
      <span class="ahist__acts"><button class="btn btn--ghost btn--sm" data-act="user-edit" data-login="${esc(u.login)}" data-name="${esc(u.name)}" data-role="${esc(u.role)}" data-on="${u.on ? 1 : ''}">${tr('შეცვლა')}</button>${u.login === S.user.login ? '' : `<button class="iconbtn" data-act="user-del" data-login="${esc(u.login)}" aria-label="${tr('წაშლა')}">${ui('trash')}</button>`}</span></div>`).join('')}</div>`;
  } catch (e) { failed(e); }
  $('[data-newuser]', body).addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    try { await srv.userSave({ ...d, on: true }); note(tr('მომხმარებელი დაემატა'), 'ok'); render(); } catch (err) { failed(err); }
  });
};

/* Bitrix: does this server reach the portal with the webhook of api/config.php, and the numbers config.php
   asks for (pipelines and stages, users, sources, warehouses, catalogs, price types). Owners only. */
R.bitrix = () => `<div class="aform">
  <div class="ainfo">${ui('link')}<div><b>${tr('Bitrix-თან კავშირი')}</b><p>${tr('აქ ჩანს, უკავშირდება თუ არა ეს სერვერი პორტალს')} <code>api/config.php</code>${tr('-ის webhook-ით, და ნომრები, რომლებიც config.php-ში იწერება. ნომერზე დაჭერა მას აკოპირებს.')}</p></div></div>
  ${LIVE ? `<div><button class="btn btn--sm" data-bx-run>${ui('check')}<span>${tr('შემოწმება')}</span></button></div><div class="aform" data-bx><p class="muted">${tr('Bitrix-ს ვეკითხები…')}</p></div>`
    : `<p class="muted">${tr('სატესტო რეჟიმში ეს არ მოწმდება: კავშირი ჩანს სერვერზე, maxcomfort.ge-ზე და მის ქვედომენებზე (მაგ. new.maxcomfort.ge).')}</p>`}
</div>`;
A.bitrix = body => {
  if (!LIVE) return;
  const box = $('[data-bx]', body), run = $('[data-bx-run]', body);
  const check = async () => {
    run.disabled = true;
    box.innerHTML = tr('<p class="muted">Bitrix-ს ვეკითხები…</p>');
    try { box.innerHTML = bxView(await srv.bitrix()); } catch (e) { box.innerHTML = `<section class="apanel abx__state"><span class="apill apill--bad">${tr('შემოწმება ვერ დასრულდა')}</span><small class="abx__msg">${esc(e.message)}</small></section>`; failed(e); }
    run.disabled = false;
    $('span', run).textContent = tr('ხელახლა შემოწმება');
  };
  run.addEventListener('click', check);
  box.addEventListener('input', e => {   // the users' filter
    if (!e.target.matches('[data-bx-find]')) return;
    const q = norm(e.target.value);
    $$('[data-bx-users] .abx__r', box).forEach(r => { r.hidden = !!q && !norm(r.textContent).includes(q); });
  });
  check();
};
const BX_STATE = {
  off: [tr('გამორთულია'), tr('კავშირი გამორთულია: საიტი Bitrix-ს არ მიმართავს. შეკვეთები და მოთხოვნები ინახება „შეკვეთებში“ და Bitrix-ში წავა ჩართვისას.')],
  empty: [tr('არ არის დაყენებული'), tr('api/config.php-ში webhook ცარიელია. პორტალზე: Developer resources → Other → Inbound webhook, უფლებები crm, user და catalog; მისამართი ჩასვით config.php-ის webhook-ში.')],
  net: [tr('კავშირი ვერ დამყარდა'), tr('სერვერი პორტალს ვერ უკავშირდება. შეამოწმეთ მისამართი config.php-ში და რომ პორტალი ამ სერვერიდან ხელმისაწვდომია.')],
  auth: [tr('webhook არ მიიღო'), tr('პორტალი პასუხობს, მაგრამ webhook-ს არ იღებს: ის წაშლილია ან არასწორად არის ჩასმული (ბოლო „/“-ის ჩათვლით).')],
  other: [tr('შეცდომა'), tr('პორტალმა შეცდომა დააბრუნა.')]
};
const BX_SCOPE = { crm: 'crm', user: 'user', catalog: 'catalog' };
function bxView(b) {
  const k = b.config;
  const L = name => (b.lists || {})[name] || {};
  const rows = name => L(name).rows || null;
  const id = v => `<button type="button" class="abx__id" data-act="copy-id" data-v="${esc(v)}" title="${tr('კოპირება')}">${esc(v)}</button>`;
  const here = on => (on ? '<span class="apill apill--on">config.php</span>' : '');
  const row = (v, name, small, cur, extra = '') => `<div class="abx__r ${cur ? 'is-cur' : ''}">${id(v)}<span><b>${esc(name || '—')}</b>${small ? `<small>${esc(small)}</small>` : ''}</span>${extra}${here(cur)}</div>`;
  const err = name => {
    const l = L(name);
    if (!l.error) return '';
    if (l.slow) return tr('<p class="abx__err">პორტალი ნელა პასუხობს: ეს სია დროში ვერ წავიკითხე. სცადეთ „ხელახლა შემოწმება“.</p>');
    return /insufficient_scope|access_denied|access denied/i.test(l.error)
      ? `<p class="abx__err">${tr('webhook-ს „')}${BX_SCOPE[l.scope] || l.scope}“ ${tr('უფლება არ აქვს: პორტალზე webhook-ს დაუმატეთ და ხელახლა შეამოწმეთ.')}</p>`
      : `<p class="abx__err">${tr('ვერ წავიკითხე:')} ${esc(l.error)}</p>`;
  };
  const panel = (title, keys, inner) => `<section class="apanel"><h2 class="ah2">${title}</h2>${keys ? `<p class="muted abx__keys">config.php: ${keys.map(x => `<code>${x}</code>`).join(', ')}</p>` : ''}${inner}</section>`;

  if (b.alerts) showAlerts(b.alerts);
  const sw = bxSwitch(b.switch, b.alerts);
  if (!b.ok) {
    const [t, p] = BX_STATE[b.kind] || BX_STATE.other;
    return sw + (b.kind === 'off' ? '' : `<section class="apanel abx__state"><span class="apill apill--bad">${t}</span><p>${p}</p>${b.host ? `<small class="muted">${esc(b.host)}</small>` : ''}${b.error ? `<small class="abx__msg">${esc(b.error)}</small>` : ''}</section>`);
  }

  // what config.php says that the portal does not have
  const warn = [];
  const pipes = rows('pipelines'), users = rows('users'), srcs = rows('sources'), stores = rows('stores'), cats = rows('catalogs'), prices = rows('prices');
  if (pipes) {
    const p = pipes.find(x => x.id === k.deal_category_id);
    if (!p) warn.push(`deal_category_id ${k.deal_category_id}: ${tr('ასეთი ვორონკა პორტალზე არ არის')}`);
    else if (!p.stages.some(s => s.id === k.deal_stage_id)) warn.push(`deal_stage_id '${k.deal_stage_id}': „${p.name}“ ${tr('ვორონკაში ასეთი ეტაპი არ არის')}`);
    k.deal_categories.filter(c => !pipes.some(x => x.id === c)).forEach(c => warn.push(`account.deal_categories ${c}: ${tr('ასეთი ვორონკა არ არის')}`));
  }
  if (users && !users.some(u => u.id === k.assigned_id)) warn.push(`assigned_id ${k.assigned_id}: ${tr('ასეთი აქტიური მომხმარებელი არ არის')}`);
  if (srcs && !srcs.some(s => s.id === k.source_id)) warn.push(`source_id '${k.source_id}': ${tr('ასეთი წყარო არ არის')}`);
  if (stores) {
    if (!k.store_ids.length) warn.push(tr('store_ids ცარიელია: მარაგში ყველა საწყობი ითვლება, ანდეს საწყობებიც'));
    k.store_ids.filter(s => !stores.some(x => x.id === s)).forEach(s => warn.push(`store_ids ${s}: ${tr('ასეთი საწყობი არ არის')}`));
  }
  if (k.catalog && cats && !cats.some(c => c.id === k.iblock_id)) warn.push(`iblock_id ${k.iblock_id}: ${tr('ასეთი კატალოგი არ არის')}`);
  if (k.catalog && prices && !prices.some(p => p.id === k.price_type_id)) warn.push(`price_type_id ${k.price_type_id}: ${tr('ასეთი ფასის ტიპი არ არის')}`);

  const who = b.who && b.who.name ? `webhook: ${b.who.name} (ID ${b.who.id})${b.who.admin ? tr(', ადმინისტრატორი') : ''}` : '';
  return sw + `<section class="apanel abx__state"><span class="apill apill--on">${tr('დაკავშირებულია')}</span><p><b>${esc(b.host)}</b> · ${tr('პასუხი')} ${b.ms} ${tr('მწმ-ში')}</p>${who ? `<small class="muted">${esc(who)}</small>` : ''}</section>
    ${warn.length ? `<section class="apanel abx__warn"><h2 class="ah2">${tr('config.php-ში შესასწორებელი')}</h2><ul>${warn.map(w => `<li>${esc(w)}</li>`).join('')}</ul></section>`
      : tr('<p class="abx__fine">config.php-ის ნომრები პორტალს ემთხვევა.</p>')}
    ${panel(tr('ვორონკები და ეტაპები'), ['deal_category_id', 'deal_stage_id', "account['deal_categories']"], err('pipelines') + (pipes ? '<div class="abx__list">' + pipes.map(p => {
      const cur = p.id === k.deal_category_id;
      return `<details class="abx__pipe" ${cur ? 'open' : ''}><summary>${row(p.id, p.name, `${p.stages.length} ${tr('ეტაპი')}`, cur, k.deal_categories.includes(p.id) ? tr('<span class="apill apill--soon">ჩემი შეკვეთები</span>') : '')}</summary>
        <div class="abx__list abx__list--in">${p.stages.map(s => row(s.id, s.name, '', cur && s.id === k.deal_stage_id, s.end ? `<span class="apill apill--off">${s.end === 'won' ? tr('წარმატებული') : tr('წარუმატებელი')}</span>` : '')).join('') || tr('<p class="muted">ეტაპები ვერ მოიძებნა</p>')}</div></details>`;
    }).join('') + '</div>' : ''))}
    ${panel(tr('მომხმარებლები'), ['assigned_id'], err('users') + (users ? `<input class="input abx__find" data-bx-find placeholder="${tr('ძებნა სახელით, თანამდებობით ან ნომრით')}" aria-label="${tr('მომხმარებლის ძებნა')}">
      <div class="abx__list abx__list--tall" data-bx-users>${users.map(u => row(u.id, u.name, u.job, u.id === k.assigned_id)).join('')}</div>` : ''))}
    ${panel(tr('საწყობები'), ["catalog['store_ids']"], err('stores') + (stores ? `<div class="abx__list">${stores.map(s => row(s.id, s.name, s.address, k.store_ids.includes(s.id), s.on ? '' : tr('<span class="apill apill--off">გამორთულია</span>'))).join('') || tr('<p class="muted">საწყობები არ არის</p>')}</div>` : ''))}
    ${panel(tr('წყაროები'), ['source_id'], err('sources') + (srcs ? `<div class="abx__list">${srcs.map(s => row(s.id, s.name, '', s.id === k.source_id)).join('')}</div>` : ''))}
    ${panel(tr('კატალოგი და ფასის ტიპები'), ["catalog['iblock_id']", "catalog['price_type_id']"], `<p class="muted">${tr('საჭიროა მხოლოდ მაშინ, როცა პროდუქცია Bitrix-იდან მოვა (catalog.enabled).')}</p>` + err('catalogs') +
      (cats ? `<div class="abx__list">${cats.map(c => row(c.id, c.name, tr('კატალოგი'), c.id === k.iblock_id)).join('')}</div>` : '') + err('prices') +
      (prices ? `<div class="abx__list">${prices.map(p => row(p.id, p.name, p.base ? tr('საბაზო ფასი') : tr('ფასის ტიპი'), p.id === k.price_type_id)).join('')}</div>` : ''))}`;
}

/* The switch on the Bitrix page: on or off (who, when), reconnect, and the address for the alert e-mails. */
function bxSwitch(sw, al) {
  if (!sw) return '';
  const n = (al && al.waiting) || 0;
  return `<section class="apanel abx__switch">
    <div class="abx__line"><b>${tr('კავშირი Bitrix-თან')}</b><span class="apill ${sw.on ? 'apill--on' : 'apill--bad'}">${sw.on ? tr('ჩართულია') : tr('გამორთულია')}</span>
      ${sw.by ? `<small class="muted">${sw.on ? tr('ჩართო') : tr('გამორთო')} ${esc(sw.by)}, ${esc(when(sw.at))}</small>` : ''}
      <span class="abx__btns">${sw.on ? `<button class="btn btn--ghost btn--sm" data-act="bx-reconnect">${tr('ხელახლა დაკავშირება')}</button><button class="btn btn--ghost btn--sm" data-act="bx-off">${tr('გამორთვა')}</button>`
        : `<button class="btn btn--sm" data-act="bx-on">${ui('check')}<span>${tr('ჩართვა')}</span></button>`}</span></div>
    <p class="muted">${sw.on ? tr('გამორთვისას საიტი Bitrix-ს აღარ მიმართავს: შეკვეთები და მოთხოვნები ინახება „შეკვეთებში“ და Bitrix-ში წავა ჩართვისას. „ხელახლა დაკავშირება“ აგზავნის, რაც ელოდება, და კავშირს თავიდან ამოწმებს.')
      : tr('ახალი შეკვეთები და მოთხოვნები ინახება „შეკვეთებში“. ჩართვისას, რაც ელოდება, Bitrix-ში წავა.')}</p>
    ${n ? `<p class="abx__err">${tr('Bitrix-ს ელოდება')} ${n} ${tr('შეკვეთა/მოთხოვნა.')} <a class="link" href="#journal">${tr('შეკვეთები')}</a></p>` : ''}
    <div class="abx__alert"><label class="afield"><span>${tr('გაფრთხილება ელ. ფოსტაზე')} <small>${tr('როცა შეკვეთა ან მოთხოვნა Bitrix-ში ვერ მიდის: კლიენტი, რა უნდა და მიზეზი')}</small></span>
      <input class="input" type="email" data-bx-alert value="${esc(sw.alert)}" placeholder="${esc(sw.notify || 'info@maxcomfort.ge')}"></label>
      <button class="btn btn--ghost btn--sm" data-act="bx-alert">${tr('შენახვა')}</button></div>
  </section>`;
}

/* ---------- Bitrix alerts on every page (owners): what did not reach Bitrix, since when and why; the switch off ---------- */
let alertTimer = 0;
async function refreshAlerts() {
  if (!LIVE || !S.user || S.user.role !== 'owner') return;
  try { const st = await srv.state(); if (st.alerts) showAlerts(st.alerts); } catch (e) { /* tried again later */ }
}
function showAlerts(a) {
  S.alerts = a;
  const box = $('[data-alerts]');
  if (box) {
    const n = a.waiting, paused = !selling();
    box.hidden = !a.off && !n && !paused;
    box.innerHTML = !a.off && !n && paused
      ? `${ui('info', 'ui--sm')}<span><b>${tr('ონლაინ გაყიდვა შეჩერებულია.')}</b> ${tr('საიტი შეკვეთებს არ იღებს; მყიდველები ზარის მოთხოვნას აგზავნიან.')}</span><a class="btn btn--ghost btn--sm" href="#home">${tr('განახლება')}</a>`
      : a.off
      ? `${ui('info', 'ui--sm')}<span><b>${tr('Bitrix-თან კავშირი გამორთულია.')}</b> ${tr('ახალი შეკვეთები და მოთხოვნები ინახება „შეკვეთებში“')}${n ? ` (${tr('ელოდება')} ${n})` : ''} ${tr('და Bitrix-ში წავა ჩართვისას.')}</span><a class="btn btn--ghost btn--sm" href="#bitrix">Bitrix</a>`
      : n ? `${ui('info', 'ui--sm')}<span><b>${n} ${tr('შეკვეთა/მოთხოვნა Bitrix-ში ვერ წავიდა.')}</b>${a.trouble ? ` ${tr('კავშირი გაწყვეტილია')} ${esc(when(a.trouble.since))}${tr('-დან.')} ${esc(a.trouble.why)}.` : ''} ${tr('საიტზე ინახება, არაფერი დაკარგულა.')}</span>
        <a class="btn btn--ghost btn--sm" href="#journal">${tr('ნახვა')}</a><button class="btn btn--sm" data-act="journal-send">${tr('ხელახლა გაგზავნა')}</button>` : '';
  }
  navDots();
}
function sendNote(r) {
  const s = r.sent.length, f = r.failed.length;
  if (!s && !f) note(r.left ? tr('ჯერ ვერაფერი გაიგზავნა') : tr('გასაგზავნი არაფერია'), r.left ? 'bad' : 'ok');
  else note(`${tr('Bitrix-ში წავიდა:')} ${s}${f ? `, ${tr('ვერ წავიდა:')} ${f} (${r.failed[0].why})` : ''}${r.left ? `, ${tr('ელოდება:')} ${r.left}` : ''}`, f ? 'bad' : 'ok');
  if (r.alerts) showAlerts(r.alerts);
}

/* ---------- the order log (owners): every order and request from the site, sent to Bitrix or waiting ---------- */
R.journal = () => `<div class="aform">
  <p class="muted">${tr('საიტიდან მოსული ყველა შეკვეთა და მოთხოვნა. ჯერ აქ იწერება, მერე Bitrix-ში მიდის; „ელოდება“ ნიშნავს, რომ Bitrix-ში ჯერ არ მისულა (კავშირი გამორთულია ან პორტალი მიუწვდომელი იყო) და ჩართვისას ან „ხელახლა გაგზავნით“ წავა.')}</p>
  ${LIVE ? tr('<div data-jr><p class="muted">იტვირთება…</p></div>') : tr('<p class="muted">სატესტო რეჟიმში შეკვეთები არსად იგზავნება და აქ არ ჩანს: ჟურნალი სერვერზე მუშაობს.</p>')}</div>`;
A.journal = body => {
  if (!LIVE) return;
  const box = $('[data-jr]', body);
  const load = async month => {
    try {
      const r = await srv.journal(month);
      S.jr = r;
      showAlerts(r.alerts);
      box.innerHTML = jrView(r);
    } catch (e) { box.innerHTML = `<p class="abx__err">${esc(e.message)}</p>`; failed(e); }
  };
  box.addEventListener('change', e => { if (e.target.matches('[data-jr-month]')) load(e.target.value); });
  body.journalReload = () => load(S.jr && S.jr.month);
  load(S.jr && S.jr.month);
};
const monthName = m => { const [y, mm] = m.split('-'); return `${MON[+mm - 1]} ${y}`; };
function jrView(r) {
  const f = S.jrF || 'all', a = S.alerts || {};
  const all = r.entries, waiting = all.filter(e => e.status === 'waiting'), sent = all.filter(e => e.status === 'sent');
  const list = f === 'waiting' ? waiting : f === 'sent' ? sent : all;
  const head = `<div class="ajr__bar">
    <select class="select ajr__month" data-jr-month aria-label="${tr('თვე')}">${r.months.map(m => `<option value="${esc(m)}" ${m === r.month ? 'selected' : ''}>${esc(monthName(m))}</option>`).join('')}</select>
    <div class="atabs">${[['all', tr('ყველა'), all.length], ['waiting', tr('ელოდება'), waiting.length], ['sent', tr('Bitrix-შია'), sent.length]]
      .map(([k, t, c]) => `<button class="atab ${f === k ? 'is-on' : ''}" data-act="jr-filter" data-f="${k}">${t} <small>${c}</small></button>`).join('')}</div>
    ${a.waiting && !a.off ? `<button class="btn btn--sm" data-act="journal-send">${ui('check')}<span>${tr('Bitrix-ში გაგზავნა')} (${a.waiting})</span></button>` : ''}</div>`;
  const rows = list.map(e => {
    const s = e.summary || {};
    const what = e.kind === 'order' ? `${(s.items || []).length} ${tr('პროდუქტი')} · ${money(s.total)}` : esc(s.kind || tr('მოთხოვნა')) + (s.product ? ' · ' + esc(s.product) : '');
    return `<div class="ahist__r ajr__r"><span><b>${esc(e.id)}</b><small>${esc(when(e.at))}</small></span>
      <span><b>${esc(e.who.name)}</b><small>${esc(e.who.phone)} · ${e.kind === 'order' ? tr('შეკვეთა') : tr('მოთხოვნა')}</small></span>
      <small>${what}${e.status === 'waiting' && e.why ? `<br><span class="abx__err">${esc(e.why)}</span>` : ''}</small>
      <span class="ahist__acts">${e.status === 'sent' ? `<span class="apill apill--on">${esc(e.ref)}</span>` : tr('<span class="apill apill--bad">ელოდება</span>')}
        <button class="btn btn--ghost btn--sm" data-act="jr-open" data-id="${esc(e.id)}">${tr('ნახვა')}</button>
        ${e.status === 'waiting' && !a.off ? `<button class="btn btn--ghost btn--sm" data-act="journal-send" data-id="${esc(e.id)}">${tr('გაგზავნა')}</button>` : ''}</span></div>`;
  }).join('');
  return head + (list.length ? `<div class="ahist">${rows}</div>` : tr('<p class="muted">ამ თვეში ჩანაწერი არ არის.</p>'));
}
function jrDetail(e) {
  const s = e.summary || {};
  const row = (k, v) => (v ? `<dt>${k}</dt><dd>${v}</dd>` : '');
  const text = v => esc(v || '').replace(/\n/g, '<br>');
  const page = s.page && safeUrl(s.page);
  return `<h2 class="h3">${e.kind === 'order' ? tr('შეკვეთა') : esc(s.kind || tr('მოთხოვნა'))} ${esc(e.id)}</h2>
    <p class="muted">${esc(when(e.at))} · ${e.status === 'sent' ? `${tr('Bitrix-შია:')} <b>${esc(e.ref)}</b>${e.sent ? ', ' + esc(when(e.sent)) : ''}` : tr('ელოდება Bitrix-ს')}</p>
    ${e.status === 'waiting' && e.why ? `<p class="abx__err">${esc(e.why)}${e.tries ? ` (${tr('ცდა:')} ${e.tries}, ${tr('ბოლოს')} ${esc(when(e.tried))})` : ''}</p>` : ''}
    <dl class="asum">${row(tr('კლიენტი'), esc(e.who.name))}${row(tr('ტელეფონი'), `<a href="tel:${esc(e.who.phone)}">${esc(e.who.phone)}</a>`)}${row(tr('ელ. ფოსტა'), esc(e.who.email))}
      ${row(tr('კომპანია'), esc(s.company))}${row(tr('მიწოდება'), esc(s.delivery))}${row(tr('მისამართი / შოურუმი'), esc(s.place))}${row(tr('სასურველი თარიღი'), esc(s.date))}
      ${e.kind === 'order' ? row(tr('მონტაჟი'), s.install ? tr('სჭირდება') : tr('არ სჭირდება')) : ''}${row(tr('გადახდა'), esc(s.pay))}${row(tr('თემა'), esc(s.topic))}${row(tr('პროდუქტი'), esc(s.product))}
      ${row(tr('კომენტარი'), text(s.comment))}${row(tr('შეტყობინება'), text(s.message))}${e.kind === 'order' ? row(tr('სულ'), money(s.total)) : ''}
      ${row(tr('გვერდი'), page ? `<a href="${esc(page)}" target="_blank" rel="noopener">${esc(s.page.slice(0, 80))}</a>` : '')}</dl>
    ${e.kind === 'order' ? `<ol class="asum">${(s.items || []).map(i => `<li>${esc(i.name)} <small class="muted">${esc(i.sku)}</small> × ${i.qty} · ${money(i.price)}</li>`).join('')}</ol>` : ''}
    ${(s.short || []).length ? `<p class="abx__err">${tr('არასაკმარისი მარაგი:')} ${s.short.map(x => `${esc(x.name)} (${tr('შეკვეთილია')} ${x.qty}, ${tr('მარაგშია')} ${x.left})`).join('; ')}</p>` : ''}`;
}

/* ---------- saving ---------- */
let saving = false;
async function save() {
  if (saving) return;
  const secs = view().s.filter(s => S.dirty.has(s));
  if (!secs.length) return;
  saving = true;
  $('[data-act=save]')?.classList.add('is-busy');
  try {
    for (const sec of secs) {
      try {
        S.c = await srv.save(sec, W(sec), (S.c.revs || {})[sec] || 0);
      } catch (err) {
        if (err.code !== 'conflict') throw err;
        // someone else saved this section meanwhile: keep theirs, or put ours over it
        const theirs = err.data.content;
        const mine = await ask(`„${SECTIONS[sec]}“ ${tr('სხვამ შეცვალა, სანამ თქვენ არედაქტირებდით. შევინახო თქვენი ვერსია მის ნაცვლად?')}`, tr('ჩემი ვერსიის შენახვა'), true);
        if (!mine) { S.c = theirs; delete S.w[sec]; S.dirty.delete(sec); note(tr('ჩაიტვირთა მათი ვერსია')); continue; }
        S.c = await srv.save(sec, W(sec), (theirs.revs || {})[sec] || 0);
      }
      delete S.w[sec];
      S.dirty.delete(sec);
    }
    note(tr('შენახულია: საიტზე უკვე ჩანს'), 'ok');
  } catch (err) { failed(err); }
  saving = false;
  draftNow();
  const keep = S.view === 'texts' || S.view === 'spots' || S.view === 'brands';
  if (keep) { bar(); navDots(); if (S.view === 'texts') textFields(); else rerender(); } else render();
}
/** Draws the view again where it is (after adding, moving or removing an item). */
function rerender() {
  const body = $('[data-body]'), y = body.scrollTop, l = $('.asplit__l', body), ly = l ? l.scrollTop : 0;
  const keepFrame = $('[data-frame]', body);
  if (keepFrame && (S.view === 'spots' || S.view === 'brands' || S.view === 'texts')) {
    const left = $('.asplit__l', body);
    const tmp = document.createElement('div');
    tmp.innerHTML = R[S.view]();
    left.replaceWith($('.asplit__l', tmp));
    if (S.view === 'texts') textFields();
    reloadFrame();
  } else {
    body.innerHTML = R[S.view]();
    (A[S.view] || (() => {}))(body);
  }
  body.scrollTop = y;
  const l2 = $('.asplit__l', body);
  if (l2) l2.scrollTop = ly;
  bar();
  navDots();
}

/* ---------- events ---------- */
function onEdit(e) {
  const t = e.target;
  if (t.matches('[data-b]')) {
    const [sec, path] = t.dataset.b.split('|');
    let v = t.type === 'checkbox' ? t.checked : t.value;
    if (t.dataset.t === 'num') v = v === '' ? null : Math.max(0, +v);
    setPath(W(sec), path, v);
    touch(sec);
    // a card's title follows its name
    const it = t.closest('.aitem');
    if (it && /^\d+\.(name|title|q)$/.test(path)) {
      const tn = [...$('.aitem__t', it).childNodes].find(n => n.nodeType === 3);
      if (tn) tn.textContent = v || '…';
    }
    if (S.view === 'posts' && /\.type$/.test(path) && e.type === 'change') rerender();   // a promotion has dates
    if (S.view === 'spots' || S.view === 'brands') reloadFrame();
    if (S.view === 'texts' && sec === 'timeline') reloadFrame();
  } else if (t.matches('[data-tx]')) {
    setText(t.dataset.tx, t.matches('.rte__area') ? rich(t.innerHTML) : t.value);
  } else if (t.matches('[data-rb]')) {
    const [sec, path] = t.dataset.rb.split('|');
    setPath(W(sec), path, rich(t.innerHTML));
    touch(sec);
  } else if (t.matches('[data-price]') && e.type === 'change') {
    const d = W('delivery')[+t.dataset.price];
    d.price = t.value === 'free' ? 0 : t.value === 'call' ? null : (d.price > 0 ? d.price : 10);
    touch('delivery');
    rerender();
  } else if (t.matches('[data-fact]') && e.type === 'change') {
    const [i, k] = t.dataset.fact.split('.').map(Number);
    W('spots')[i].facts[k] = t.value ? { auto: t.value } : { b: '', t: '' };
    touch('spots');
    rerender();
  }
}
/** page.html#part -> page.html?draft=1#part: the page with the unsaved changes */
function withDraft(page) {
  const [p, h] = page.split('#');
  return p + (p.includes('?') ? '&' : '?') + 'draft=1' + (h ? '#' + h : '');
}

async function onClick(e) {
  const a = e.target.closest('[data-act],[data-cmd],[data-view],[data-pick]');
  if (!a) return;
  if (a.dataset.cmd) { e.preventDefault(); rteCmd(a); return; }
  if (a.dataset.view) return;   // the hash changes
  if (a.dataset.pick) { pick(a); return; }
  const act = a.dataset.act;
  const listOp = () => {
    const [sec, path] = a.dataset.list.split('|');
    const list = getPath(W(sec), path);
    return { sec, path, list, i: +a.dataset.i };
  };
  if (act && act.startsWith('px-')) { pxClick(a, e); return; }
  switch (act) {
    case 'save': save(); break;
    case 'preview': draftNow(); window.open(withDraft(a.dataset.page), '_blank'); break;
    case 'add': {
      e.preventDefault();
      const { sec, path, list } = listOp();
      const kind = (sec + (path ? '.' + path : '')).replace(/\.\d+\./g, '.*.');
      list.push((NEW[kind] || (() => ({})))());
      S.open.add(sec + '|' + (list.length - 1));
      touch(sec);
      rerender();
      break;
    }
    case 'up': case 'down': {
      e.preventDefault();
      const { sec, list, i } = listOp(), j = act === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= list.length) break;
      [list[i], list[j]] = [list[j], list[i]];
      touch(sec);
      rerender();
      break;
    }
    case 'del': {
      e.preventDefault();
      const { sec, list, i } = listOp();
      if (!await ask(tr('წავშალო?'), tr('წაშლა'), true)) break;
      list.splice(i, 1);
      touch(sec);
      rerender();
      break;
    }
    case 'tpage': S.page = a.dataset.page; S.frame.texts = []; render(); break;
    case 'reset': setText(a.dataset.key, ''); { const f = $(`.atext[data-key="${CSS.escape(a.dataset.key)}"]`); const i = f && $('textarea,.rte__area', f); if (i) { if (i.matches('textarea')) i.value = S.defs[a.dataset.key] || ''; else i.innerHTML = rich(S.defs[a.dataset.key] || ''); } } break;
    case 'lib': library(url => { const [sec, path] = a.dataset.ipB.split('|'); setPath(W(sec), path, url); touch(sec); rerender(); }); break;
    case 'img-clear': { const [sec, path] = a.dataset.ipB.split('|'); setPath(W(sec), path, ''); touch(sec); rerender(); break; }
    case 'pp-clear': { const [sec, path] = a.dataset.ppB.split('|'); setPath(W(sec), path, null); touch(sec); rerender(); break; }
    case 'pp-rm': { const [sec, path] = a.dataset.ppB.split('|'); getPath(W(sec), path).splice(+a.dataset.i, 1); touch(sec); rerender(); break; }
    case 'ptype': SS.set('mc.admin.ptype', a.dataset.type); render(); break;
    case 'post-new': {
      const list = W('posts');
      const t = SS.get('mc.admin.ptype', '') || 'news';
      list.unshift({ id: uid('n'), type: t, title: '', date: today(), cover: '', excerpt: '', body: '', on: false, pin: false, from: '', to: '', link: '', linkText: '' });
      S.post = 0;
      touch('posts');
      render();
      break;
    }
    case 'post-open': S.post = +a.dataset.i; render(); break;
    case 'post-back': S.post = null; render(); break;
    case 'post-view': draftNow(); window.open('media.html?p=' + encodeURIComponent(a.dataset.id) + '&draft=1', '_blank'); break;
    case 'post-del':
      if (!await ask(tr('ჩანაწერს წავშლი. დარწმუნებული ხართ?'), tr('წაშლა'), true)) break;
      W('posts').splice(+a.dataset.i, 1);
      S.post = null;
      touch('posts');
      render();
      break;
    case 'copy':
      try { await navigator.clipboard.writeText(new URL(a.dataset.url, location.href).href); note(tr('ბმული დაკოპირდა'), 'ok'); } catch (err) { prompt(tr('ბმული:'), new URL(a.dataset.url, location.href).href); }
      break;
    case 'lang':   // the other language: the page draws itself again (unsaved changes: the browser asks first)
      try { localStorage.setItem('mc.admin.lang', LANG === 'en' ? 'ka' : 'en'); } catch (err) { /* private mode */ }
      location.reload();
      break;
    case 'theme': {   // light or dark, kept in mc.theme like the site's own switch; the preview frame follows
      const root = document.documentElement;
      const dark = (root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
      const t = dark ? 'light' : 'dark';
      root.dataset.theme = t;
      try { localStorage.setItem('mc.theme', t); } catch (err) { /* private mode: this page only */ }
      $$('iframe').forEach(f => { try { f.contentDocument.documentElement.dataset.theme = t; } catch (err) { /* another origin */ } });
      break;
    }
    case 'shop-off':
      if (!await ask(tr('ონლაინ გაყიდვას შევაჩერებ: საიტი შეკვეთებს აღარ მიიღებს, სანამ არ განაახლებთ. მყიდველები ზარის მოთხოვნას გამოგზავნიან.'), tr('შეჩერება'), true)) break;
      await shopSave(false, a);
      break;
    case 'shop-on':
      await shopSave(true, a);
      break;
    case 'shop-note':
      await shopSave(selling(), a);
      break;
    case 'bx-off':
      if (!await ask(tr('Bitrix-თან კავშირს გავთიშავ: ახალი შეკვეთები და მოთხოვნები შეინახება „შეკვეთებში“ და Bitrix-ში არ წავა, სანამ ისევ არ ჩართავთ.'), tr('გამორთვა'), true)) break;
      try { const r = await srv.bitrixSwitch({ on: false }); showAlerts(r.alerts); note(tr('კავშირი გამორთულია'), 'ok'); render(); } catch (err) { failed(err); }
      break;
    case 'bx-on':
    case 'bx-reconnect':
      a.classList.add('is-busy');
      try {
        if (act === 'bx-on') await srv.bitrixSwitch({ on: true });
        sendNote(await srv.bitrixReconnect());   // what waited goes to Bitrix; the page then checks the connection again
      } catch (err) { failed(err); }
      render();
      break;
    case 'bx-alert': {
      const v = ($('[data-bx-alert]') || {}).value || '';
      try { await srv.bitrixSwitch({ alert: v.trim() }); note(v.trim() ? tr('გაფრთხილებები მოვა: ') + v.trim() : tr('გაფრთხილებები ელ. ფოსტაზე აღარ მოვა'), 'ok'); } catch (err) { failed(err); }
      break;
    }
    case 'journal-send':
      a.classList.add('is-busy');
      try { sendNote(await srv.journalSend(a.dataset.id || '')); } catch (err) { failed(err); }
      a.classList.remove('is-busy');
      if (S.view === 'journal' && $('[data-body]').journalReload) $('[data-body]').journalReload();
      break;
    case 'jr-filter':
      S.jrF = a.dataset.f;
      if (S.jr) $('[data-jr]').innerHTML = jrView(S.jr);
      break;
    case 'jr-open': {
      const en = ((S.jr && S.jr.entries) || []).find(x => x.id === a.dataset.id);
      if (en) modal(jrDetail(en), true);
      break;
    }
    case 'copy-id':
      e.preventDefault();   // in a pipeline's summary: copy, don't fold
      try { await navigator.clipboard.writeText(a.dataset.v); note(tr('დაკოპირდა: ') + a.dataset.v, 'ok'); } catch (err) { prompt(tr('ნომერი:'), a.dataset.v); }
      break;
    case 'file-del': {
      if (!await ask(a.dataset.used ? tr('ეს ფაილი საიტზე გამოიყენება. მაინც წავშალო?') : tr('ფაილს წავშლი. დარწმუნებული ხართ?'), tr('წაშლა'), true)) break;
      try { await srv.deleteFile(a.dataset.url, !!a.dataset.used); note(tr('წაიშალა'), 'ok'); $('[data-body]').filesReload(); } catch (err) { failed(err); }
      break;
    }
    case 'ver':
      try {
        const v = await srv.version(a.dataset.id);
        modal(`<h2 class="h3">${esc(SECTIONS[v.section] || v.section)}</h2><p class="muted">${esc(v.name || v.by)} · ${esc(when(v.at))}</p>${summary(v.section, v.value)}`, true);
      } catch (err) { failed(err); }
      break;
    case 'restore': {
      const sec = a.dataset.sec;
      if (sec === 'products') {   // one product as it was
        if (!await ask(tr('ამ პროდუქტს ამ ვერსიას დავუბრუნებ (როგორც ახალ შენახვას).'), tr('აღდგენა'))) break;
        try { await srv.restore(a.dataset.id); PX = null; note(tr('აღდგა'), 'ok'); } catch (err) { failed(err); }
        break;
      }
      if (S.dirty.has(sec) && !await ask(`„${SECTIONS[sec]}“${tr('-ში შეუნახავი ცვლილებებია: აღდგენა მათ წაშლის.')}`, tr('აღდგენა'), true)) break;
      if (!S.dirty.has(sec) && !await ask(tr('ამ ვერსიას დავაბრუნებ (როგორც ახალ შენახვას).'), tr('აღდგენა'))) break;
      try { S.c = await srv.restore(a.dataset.id); delete S.w[sec]; S.dirty.delete(sec); draftNow(); note(tr('აღდგა'), 'ok'); render(); } catch (err) { failed(err); }
      break;
    }
    case 'user-edit': userEdit(a.dataset); break;
    case 'user-del':
      if (!await ask(`${a.dataset.login}: ${tr('წავშალო მომხმარებელი?')}`, tr('წაშლა'), true)) break;
      try { await srv.userDelete(a.dataset.login); note(tr('წაიშალა'), 'ok'); render(); } catch (err) { failed(err); }
      break;
    case 'me': myPassword(); break;
    case 'logout':
      if (S.dirty.size && !await ask(tr('შეუნახავი ცვლილებები დაიკარგება. გავიდე?'), tr('გასვლა'), true)) break;
      try { await srv.logout(); } catch (err) { /* signed out anyway */ }
      S.user = null; S.w = {}; S.dirty.clear();
      signIn();
      break;
  }
}

/* product search under a picker */
let ppTimer = null;
function ppSearch(input) {
  clearTimeout(ppTimer);
  ppTimer = setTimeout(() => {
    const box = input.closest('.pp'), menu = $('.pp__menu', box);
    const found = findProducts(input.value);
    menu.innerHTML = found.map(p => `<button type="button" class="pp__opt" data-pick="${p.id}">${prodLine(p.id)}</button>`).join('') || (input.value.trim() ? tr('<p class="muted">ვერ მოიძებნა</p>') : '');
    menu.hidden = !input.value.trim();
  }, 120);
}
function pick(btn) {
  const box = btn.closest('.pp'), [sec, path] = box.dataset.pp.split('|');
  if (box.hasAttribute('data-multi')) {
    const list = getPath(W(sec), path) || [];
    if (!list.includes(+btn.dataset.pick)) list.push(+btn.dataset.pick);
    setPath(W(sec), path, list);
  } else setPath(W(sec), path, +btn.dataset.pick);
  touch(sec);
  rerender();
}

async function onUpload(e) {
  const input = e.target.closest('[data-up]');
  if (!input || !input.files[0]) return;
  const [sec, path] = input.dataset.up.split('|');
  const box = input.closest('.ip');
  box.classList.add('is-busy');
  try {
    const f = await upload(input.files[0]);
    setPath(W(sec), path, f.url);
    touch(sec);
    rerender();
  } catch (err) { failed(err); box.classList.remove('is-busy'); }
}

function userEdit(d) {
  const m = modal(`<h2 class="h3">${esc(d.name)}</h2><form class="form-stack" data-uedit>
    <label class="afield"><span>${tr('სახელი და გვარი')}</span><input class="input" name="name" value="${esc(d.name)}" maxlength="80"></label>
    <label class="afield"><span>${tr('როლი')}</span><select class="select" name="role"><option value="editor" ${d.role === 'editor' ? 'selected' : ''}>${tr('რედაქტორი')}</option><option value="owner" ${d.role === 'owner' ? 'selected' : ''}>${tr('მფლობელი')}</option></select></label>
    <label class="afield"><span>${tr('ახალი პაროლი')} <small>${tr('ცარიელი: არ იცვლება')}</small></span><input class="input" name="password" type="password" minlength="8" autocomplete="new-password"></label>
    ${toggle(tr('შესვლა ნებადართულია'), 'x|on', !!d.on).replace('data-b="x|on"', 'name="on"')}
    <div class="amodal__acts"><button type="button" class="btn btn--ghost btn--sm" data-x>${tr('გაუქმება')}</button><button class="btn btn--sm">${tr('შენახვა')}</button></div></form>`);
  $('[data-uedit]', m.el).addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    try {
      await srv.userSave({ existing: true, login: d.login, name: f.name.value, role: f.role.value, password: f.password.value, on: f.on.checked });
      m.close(); note(tr('შენახულია'), 'ok'); render();
    } catch (err) { failed(err); }
  });
}
function myPassword() {
  const m = modal(`<h2 class="h3">${tr('ჩემი პაროლი')}</h2><p class="muted">${esc(S.user.name)} · ${esc(S.user.login)}</p><form class="form-stack" data-pw style="margin-top:16px">
    <label class="afield"><span>${tr('ამჟამინდელი პაროლი')}</span><input class="input" name="old" type="password" required autocomplete="current-password"></label>
    <label class="afield"><span>${tr('ახალი პაროლი')} <small>8+ ${tr('სიმბოლო')}</small></span><input class="input" name="new" type="password" minlength="8" required autocomplete="new-password"></label>
    <label class="afield"><span>${tr('გაიმეორეთ')}</span><input class="input" name="again" type="password" minlength="8" required autocomplete="new-password"></label>
    <div class="amodal__acts"><button type="button" class="btn btn--ghost btn--sm" data-x>${tr('გაუქმება')}</button><button class="btn btn--sm">${tr('შეცვლა')}</button></div></form>`);
  $('[data-pw]', m.el).addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    if (f.new.value !== f.again.value) { note(tr('ახალი პაროლები ერთმანეთს არ ემთხვევა'), 'bad'); return; }
    try { await srv.password({ old: f.old.value, new: f.new.value }); m.close(); note(tr('პაროლი შეიცვალა'), 'ok'); } catch (err) { failed(err); }
  });
}

/* ---------- signing in ---------- */
function signIn(setup = false) {
  $('#adm').innerHTML = `<div class="alogin"><div class="alogin__box">
    <img class="only-l" src="assets/brand/logo/mc-logo-primary.svg" alt="Max Comfort" width="120" height="61"><img class="only-d" src="assets/brand/logo/mc-logo-white.svg" alt="" width="120" height="61">
    <h1 class="h2">${setup ? tr('პირველი მფლობელი') : tr('მართვის პანელი')}</h1>
    <p class="muted">${setup ? tr('ერთხელ: შექმენით მფლობელის ანგარიში. გასაღები (setup_key) არის სერვერის api/config.php-ში.') : LIVE ? tr('შედით თქვენი სახელით და პაროლით.') : tr('სატესტო რეჟიმი: ჩაწერეთ ნებისმიერი სახელი. ცვლილებები მხოლოდ ამ ბრაუზერში ინახება.')}</p>
    <form class="form-stack" data-login novalidate>
      ${setup ? tr('<label class="afield"><span>გასაღები (setup_key)</span><input class="input" name="key" type="password" required autocomplete="off"></label><label class="afield"><span>სახელი და გვარი</span><input class="input" name="name" required maxlength="80"></label>') : ''}
      <label class="afield"><span>${tr('შესვლის სახელი')}</span><input class="input" name="login" required autocomplete="username" ${setup ? tr('placeholder="ლათინურად, მაგ. irina"') : ''}></label>
      ${LIVE || setup ? `<label class="afield"><span>${tr('პაროლი')}${setup ? tr(' <small>8+ სიმბოლო</small>') : ''}</span><input class="input" name="password" type="password" required autocomplete="${setup ? 'new-password' : 'current-password'}"></label>` : ''}
      <button class="btn btn--red btn--block">${setup ? tr('შექმნა და შესვლა') : tr('შესვლა')}</button>
      <p class="alogin__err" data-err hidden></p>
    </form>
    <div class="alogin__foot"><a class="link" href="index.html">${tr('საიტზე დაბრუნება')}</a>${LANG_BTN}</div>
  </div></div>`;
  $('[data-login]').addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const err = $('[data-err]');
    if (!String(d.login || '').trim()) { err.hidden = false; err.textContent = tr('ჩაწერეთ შესვლის სახელი'); return; }
    e.target.querySelector('button').classList.add('is-busy');
    try {
      const r = setup ? await srv.setup(d) : await srv.login({ login: d.login.trim(), password: d.password || '' });
      S.user = r.user;
      await start();
    } catch (x) {
      err.hidden = false;
      err.textContent = x.code === 'login' ? tr('სახელი ან პაროლი არასწორია') : x.code === 'locked' ? tr('ბევრი არასწორი მცდელობა: სცადეთ 15 წუთში') : x.code === 'setup-key' && x.status === 403 ? tr('გასაღები არასწორია') : x.message;
      e.target.querySelector('button').classList.remove('is-busy');
    }
  });
}

async function start() {
  [S.c, S.db] = await Promise.all([srv.content(), catalog().catch(() => null)]);
  S.c.revs = S.c.revs && !Array.isArray(S.c.revs) ? S.c.revs : {};
  shell();
  go(location.hash.slice(1) || 'home');
  refreshAlerts();
  if (!alertTimer) alertTimer = setInterval(refreshAlerts, 120000);   // a new waiting order shows while the panel is open
}

/* ---------- products: Bitrix's products and the site's layer over them (api/admin.php products) ----------
   Bitrix supplies the products, prices and stock; here the site decides which appear and how (owner's choice,
   2026-11-18). A product is tied to its Bitrix product by the Bitrix ID, so names can change on either side.
   Nothing done here is written to Bitrix. New Bitrix products wait as "new" until someone checks them. */
const PXF = [['new', tr('ახალი')], ['shown', tr('საიტზე')], ['hidden', tr('დამალული')], ['all', tr('ყველა')], ['pages', tr('გვერდები Bitrix-ის გარეშე')]];
const PXSTATE = { new: [tr('ახალი: შესამოწმებელი'), 'soon'], shown: [tr('საიტზე ჩანს'), 'on'], hidden: [tr('დამალულია'), 'off'] };
const PXN = 60;
const PXHOW = { id: tr('დაკავშირდა ID-ით'), code: tr('დაკავშირდა კოდით'), name: tr('დაკავშირდა სახელით'), hand: tr('დაკავშირებულია ხელით') };   // rows drawn at a time
const pxImg = f => (!f ? '' : /^(https?:|\/|api\/|uploads\/|data:)/.test(f) ? f : 'assets/img/products/' + f);
let PX = null;    // { data: {at, error, items, layer}, pages: Map, cats, f, q, n, sel: Set, open, draft, rev, dirty }

const pxPage = e => (e && e.page ? PX.pages.get(+e.page) || null : null);
const pxState = k => (PX.data.layer[k] || {}).state || 'new';
/** What the site shows for a product: its own field, else the prepared page's, else Bitrix's. */
function pxShown(k, e = PX.data.layer[k] || {}) {
  const b = PX.data.items[k] || {}, pg = pxPage(e);
  const src = pg || b;
  return {
    title: e.name || (pg ? pg.title : b.name) || k,
    cat: e.cat || src.cat || '', sub: e.sub || src.sub || '',
    img: (e.imgs && e.imgs[0]) || (src.imgs && src.imgs[0]) || ''
  };
}
const pxPlaceName = (cat, sub) => { const c = PX.cats.find(x => x.id === cat), s = c && c.subs.find(x => x.id === sub); return c && s ? c.name + ' › ' + s.name : ''; };
const pxMoney = v => (v == null ? tr('<span class="muted">ფასი არ აქვს</span>') : money(v));

async function pxLoad(box) {
  try {
    if (!PX) {
      const [data, cat] = await Promise.all([srv.products(), fetch('data/catalog.json').then(r => r.json())]);
      PX = { data, pages: new Map(cat.products.map(p => [+p.id, p])), cats: cat.categories, f: 'new', q: '', sec: '', n: PXN, sel: new Set(), open: null, draft: null, rev: 0, dirty: false };
      if (data.enabled !== false && !Object.values(data.layer || {}).some(e => (e.state || 'new') === 'new')) PX.f = 'shown';
    }
    pxDraw(box);
  } catch (e) { box.innerHTML = `<p class="abx__err">${esc(e.message)}</p>`; failed(e); }
}
function pxDraw(box = $('[data-px]')) {
  if (!box || !PX) return;
  if (PX.data.enabled === false) {
    box.innerHTML = `<div class="aempty"><p><b>${tr('Bitrix-ის კატალოგი ჩართული არ არის.')}</b></p><p class="muted">${tr('საიტი პროდუქციას ჯერ თავისი ფაილიდან აჩვენებს. ჩასართავად api/config.php-ში საჭიროა catalog.enabled და კატალოგის ID-ები (README: Switching it on, ნაბიჯი 4).')}</p></div>`;
    return;
  }
  box.innerHTML = PX.open ? pxEditor(PX.open) : pxList();
}

/* the list */
function pxList() {
  const d = PX.data, keys = Object.keys(d.items || {});
  const count = { new: 0, shown: 0, hidden: 0, all: keys.length };
  keys.forEach(k => { count[pxState(k)]++; });
  const linked = new Set(Object.values(d.layer || {}).map(e => +e.page).filter(Boolean));
  count.pages = [...PX.pages.values()].filter(p => !linked.has(+p.id)).length;
  const sel = PX.sel.size;
  return `<div class="pxtop">
      <p class="muted">${LIVE ? '' : tr('<b>სატესტო რეჟიმი:</b> Bitrix-ის მაგივრად საიტის ფაილის პროდუქცია; ცვლილებები ინახება ამ ბრაუზერში და საიტზე არ ჩანს. ')}${tr('პროდუქცია, ფასი და მარაგი Bitrix-იდან მოდის; აქ წყდება, რა ჩანს საიტზე და როგორ. Bitrix-ში აქედან არაფერი იცვლება.')}
        ${d.at ? `<br>${tr('Bitrix-იდან წაკითხულია:')} ${esc(when(d.at))}${d.pending ? ` · ${d.pending} ${tr('ფოტო ჯერ ჩამოსატვირთია (ყოველ 15 წუთში ნაწილი; პროდუქტის გახსნისას მისი ფოტოები მაშინვე)')}` : ''}` : ''}</p>
      <button class="btn btn--ghost btn--sm" data-act="px-refresh">${ui('download')}<span>${tr('Bitrix-იდან ახლავე')}</span></button>
    </div>
    ${d.error ? `<p class="abx__err">${esc(d.error)}</p>` : ''}
    <div class="pxbar">
      <div class="atabs">${PXF.map(([k, n]) => `<button class="atab ${PX.f === k ? 'is-on' : ''}" data-act="px-filter" data-f="${k}">${n} <small>${count[k]}</small></button>`).join('')}</div>
      <span class="pxbar__r">${PX.f === 'pages' ? '' : `<select class="select pxsec" data-px-sec aria-label="${tr('Bitrix-ის განყოფილება')}"><option value="">${tr('ყველა განყოფილება')}</option>${pxSections().map(([v, n]) => `<option value="${esc(v)}" ${PX.sec === v ? 'selected' : ''}>${esc(v)} (${n})</option>`).join('')}</select>`}
      <label class="pxfind">${ui('search')}<input class="input" type="search" placeholder="${tr('სახელი, კოდი ან ID')}" value="${esc(PX.q)}" data-px-search aria-label="${tr('ძიება')}"></label></span>
    </div>
    ${sel ? `<div class="pxsel"><b>${sel} ${tr('მონიშნული')}</b><button class="btn btn--sm" data-act="px-bulk" data-state="shown">${ui('eye')}<span>${tr('გამოჩენა საიტზე')}</span></button><button class="btn btn--ghost btn--sm" data-act="px-bulk" data-state="hidden">${tr('დამალვა')}</button><button class="link-btn" data-act="px-unsel">${tr('მონიშვნის მოხსნა')}</button></div>` : ''}
    <div data-px-rows>${pxRows()}</div>`;
}
function pxMatch(text) {
  const q = norm(PX.q.trim());
  return !q || norm(text).includes(q);
}
function pxRows() {
  const d = PX.data;
  if (PX.f === 'pages') {
    const linked = new Set(Object.values(d.layer || {}).map(e => +e.page).filter(Boolean));
    const rows = [...PX.pages.values()].filter(p => !linked.has(+p.id) && pxMatch([p.title, p.name, p.sku, p.brand].join(' ')));
    return `<p class="muted pxnote">${tr('საიტის მომზადებული გვერდები (ფოტო, მახასიათებლები), რომლებსაც Bitrix-ის პროდუქტი ჯერ არ აქვს: საიტზე არ ჩანს. დასაკავშირებლად გახსენით Bitrix-ის პროდუქტი და აირჩიეთ გვერდი.')}</p>
      ${rows.length ? `<div class="pxlist">${rows.slice(0, PX.n).map(p => `<div class="pxrow pxrow--page"><span></span><span class="pxrow__open">
        <span class="pxrow__img">${p.imgs[0] ? `<img src="${esc(pxImg(p.imgs[0]))}" alt="" loading="lazy">` : ''}</span>
        <span class="pxrow__t"><b>${esc(p.title)}</b><small>${esc([p.sku && tr('კოდი ') + p.sku, pxPlaceName(p.cat, p.sub)].filter(Boolean).join(' · '))}</small></span></span></div>`).join('')}</div>${pxMore(rows.length)}`
        : tr('<div class="aempty"><p>ასეთი გვერდი არ არის.</p></div>')}`;
  }
  const keys = pxKeys();
  if (!keys.length) return `<div class="aempty"><p>${PX.q ? tr('ვერაფერი მოიძებნა.') : PX.f === 'new' ? tr('ახალი პროდუქტი არ არის: ყველა შემოწმებულია.') : tr('აქ ჯერ არაფერია.')}</p></div>`;
  const allOn = keys.every(k => PX.sel.has(k));
  const twice = pxTwice();
  return `<label class="pxall"><input type="checkbox" data-px-all ${allOn ? 'checked' : ''}> ${allOn ? tr('მონიშვნის მოხსნა') : tr('ყველას მონიშვნა')}: ${keys.length} ${PX.sec ? '„' + esc(PX.sec) + tr('“-ში') : tr('ჩამოთვლილი')}</label>
    <div class="pxlist">${keys.slice(0, PX.n).map(k => {
    const b = d.items[k], e = d.layer[k] || {}, v = pxShown(k), [st, cls] = PXSTATE[pxState(k)];
    const dup = pxDup(e);
    const warn = (pxState(k) === 'shown' && !pxPlaceName(v.cat, v.sub) ? tr('<span class="apill apill--bad">კატეგორია არ აქვს</span>') : '')
      + (dup ? `<span class="apill apill--bad" title="${esc(tr('Bitrix-ში მეორედაა: ') + dup.title + (pxPriceGap(b.price, dup.price) ? tr(' · ფასი იქ ') + money(dup.price) : ''))}">${tr('მეორე ჩანაწერი')}</span>${pxPriceGap(b.price, dup.price) ? `<span class="apill apill--bad" title="${esc(tr('ფასი იქ: ') + money(dup.price))}">${tr('სხვა ფასით')}</span>` : ''}`
        : pxState(k) !== 'hidden' && twice.has(norm(v.title)) ? tr('<span class="apill apill--bad" title="სხვა პროდუქტსაც იგივე სახელი აქვს: შეცვალეთ ერთ-ერთის სახელი">სახელი მეორდება</span>') : '');
    return `<div class="pxrow"><label class="pxrow__sel"><input type="checkbox" data-px-sel="${k}" ${PX.sel.has(k) ? 'checked' : ''} aria-label="${tr('მონიშვნა')}"></label>
      <button class="pxrow__open" data-act="px-open" data-key="${k}">
        <span class="pxrow__img">${v.img ? `<img src="${esc(pxImg(v.img))}" alt="" loading="lazy">` : ''}</span>
        <span class="pxrow__t"><b>${esc(v.title)}</b><small>Bitrix: ${esc(b.name)} · ID ${esc(b.bx)}${b.sku ? tr(' · კოდი ') + esc(b.sku) : ''}${b.parent ? tr(' · ვარიანტი') : ''}${e.how ? ' · ' + PXHOW[e.how] : ''}</small></span>
        <span class="pxrow__p">${pxMoney(b.price)}<small>${b.stock ? tr('მარაგშია') : tr('შეკვეთით')}</small></span>
        <span class="pxrow__s"><span class="apill apill--${cls}">${st}</span>${warn}</span>
      </button></div>`;
  }).join('')}</div>${pxMore(keys.length)}`;
}
/** For a product Bitrix lists twice (tools/bitrix_pages.py: "dup"): the page that shows it and the Bitrix price
 *  of that listing; else null. */
function pxDup(e) {
  const pg = pxPage(e);
  if (!pg || !pg.dup) return null;
  const o = PX.pages.get(+pg.dup), k = Object.keys(PX.data.layer).find(x => +(PX.data.layer[x] || {}).page === +pg.dup);
  return { title: o ? o.title : 'ID ' + pg.dup, price: k && PX.data.items[k] ? PX.data.items[k].price : null };
}
const pxPriceGap = (a, b) => a != null && b != null && Math.abs(a - b) > 0.009;
/** Names that two products shown or waiting would share in the shop. */
function pxTwice() {
  const seen = new Set(), twice = new Set();
  Object.keys(PX.data.items || {}).forEach(k => {
    if (pxState(k) === 'hidden') return;
    const t = norm(pxShown(k).title);
    if (seen.has(t)) twice.add(t); else seen.add(t);
  });
  return twice;
}
/** The products the list shows now: the tab, the Bitrix section and the search. */
function pxKeys() {
  const d = PX.data;
  const keys = Object.keys(d.items || {}).filter(k => (PX.f === 'all' || pxState(k) === PX.f)
    && (!PX.sec || (d.items[k].section || '').startsWith(PX.sec))
    && pxMatch([pxShown(k).title, d.items[k].name, d.items[k].sku, d.items[k].bx, d.items[k].parentName].join(' ')));
  return keys.sort((a, b) => pxShown(a).title.localeCompare(pxShown(b).title, 'ka'));
}
/** Bitrix's sections of the products in this tab, two levels deep, with their counts. */
function pxSections() {
  const n = new Map();
  Object.keys(PX.data.items || {}).forEach(k => {
    if (PX.f !== 'all' && pxState(k) !== PX.f) return;
    const parts = (PX.data.items[k].section || '').split(' › ').filter(Boolean);
    for (let i = 1; i <= Math.min(2, parts.length); i++) { const v = parts.slice(0, i).join(' › '); n.set(v, (n.get(v) || 0) + 1); }
  });
  return [...n.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ka'));
}
const pxMore = n => (n > PX.n ? `<div class="pxmore"><button class="btn btn--ghost btn--sm" data-act="px-more">${tr('მეტის ჩვენება')} (${n - PX.n})</button></div>` : '');

/* the editor: the site's fields on the left, Bitrix's on the right */
function pxEditor(k) {
  const b = PX.data.items[k] || {}, e = PX.draft, pg = pxPage(e), src = pg || b;
  const st = e.state || 'new';
  const placeOpts = [['', `— ${pxPlaceName(src.cat, src.sub) || tr('არჩეული არ არის')} —`], ...PX.cats.flatMap(c => c.subs.map(s => [c.id + '/' + s.id, c.name + ' › ' + s.name]))];
  const ph = (v, n = 90) => esc(String(v || '').replace(/\s+/g, ' ').slice(0, n));
  const imgs = e.imgs || null, inhImgs = src.imgs || [];
  const specs = e.specs || null, inhSpecs = src.specs || [];
  return `<div class="pxhead">
      <button class="btn btn--ghost btn--sm" data-act="px-back">${ui('left')}<span>${tr('ყველა პროდუქტი')}</span></button>
      <span class="pxhead__r">${st === 'shown' && LIVE ? `<a class="btn btn--ghost btn--sm" href="product.html?id=${esc(b.bx)}" target="_blank" rel="noopener">${ui('eye')}<span>${tr('ნახვა საიტზე')}</span></a>` : ''}
        <button class="btn btn--red btn--sm" data-act="px-save" ${PX.dirty ? '' : 'disabled'}>${ui('check')}<span>${tr('შენახვა')}</span></button></span>
    </div>
    <div class="pxed">
      <div class="pxed__l">
        <section class="apanel">
          <div class="pxstate">${st === 'new' ? tr('<p class="pxstate__new"><b>ახალი პროდუქტი Bitrix-იდან.</b> შეამოწმეთ სახელი, ფოტო და კატეგორია, მერე აირჩიეთ: საიტზე ჩანს თუ არა.</p>') : ''}
            ${(dup => dup ? `<p class="pxstate__new"><b>${tr('Bitrix-ში ეს პროდუქტი მეორედაა ჩაწერილი')}</b> (${tr('იგივე კოდი და სახელი, სხვა განყოფილებაში). საიტზე მას აჩვენებს: „')}${esc(dup.title)}“. ${tr('ამიტომ ეს ჩანაწერი დამალულია, რომ მაღაზიაში ორჯერ არ გამოჩნდეს.')}${pxPriceGap(b.price, dup.price) ? ` <b>${tr('ფასები Bitrix-ში განსხვავდება:')}</b> ${tr('აქ')} ${money(b.price)}, ${tr('იქ')} ${money(dup.price)}. ${tr('შეამოწმეთ Bitrix-ში, რომელია სწორი.')}` : ''}</p>` : '')(pxDup(e))}
            <div class="pxseg" role="group" aria-label="${tr('საიტზე')}">
              <button class="${st === 'shown' ? 'is-on' : ''}" data-act="px-state" data-v="shown">${ui('eye')}${tr('საიტზე ჩანს')}</button>
              <button class="${st === 'hidden' ? 'is-on' : ''}" data-act="px-state" data-v="hidden">${tr('დამალულია')}</button>
            </div></div>
          <div class="afield"><span>${tr('საიტის გვერდი')} <small>${tr('მომზადებული ფოტოები, მახასიათებლები, ეტიკეტები და დოკუმენტები')}</small></span>
            ${pg ? `<div class="pp__val"><img src="${esc(pxImg(pg.imgs[0]))}" alt=""><span><b>${esc(pg.title)}</b><small>${esc([pg.sku && tr('კოდი ') + pg.sku, PXHOW[e.how] || ''].filter(Boolean).join(' · '))}</small></span><button type="button" class="iconbtn" data-act="px-page" data-id="0" aria-label="${tr('მოხსნა')}">${ui('close')}</button></div>`
              : tr('<p class="muted pxnone">გვერდის გარეშე: საიტი Bitrix-ის მონაცემებს და ქვემოთ შევსებულს აჩვენებს.</p>')}
            <div class="pp__find">${ui('search')}<input class="input" type="search" placeholder="${pg ? tr('სხვა გვერდი: ') : tr('გვერდის მოძებნა: ')}${tr('სახელი ან კოდი')}" data-px-pq></div>
            <div class="pp__menu pxpages" data-px-pm hidden></div></div>
          ${pxField(tr('სახელი საიტზე'), 'name', e.name, ph(pg ? pg.title : b.name, 200), tr('ცარიელი: ') + (pg ? tr('გვერდის სახელი') : tr('Bitrix-ის სახელი')) + tr('. ჩაწერეთ შიდა კოდების გარეშე.'))}
          <div class="agrid">${pxField(tr('სერია / ხაზი'), 'line', e.line, ph(src.line))}${pxField(tr('ტიპი'), 'type', e.type, ph(src.type))}</div>
          <label class="afield"><span>${tr('კატეგორია საიტზე')}</span><select class="select" data-px="place">${placeOpts.map(([v, n]) => `<option value="${v}" ${(e.cat && e.sub ? e.cat + '/' + e.sub : '') === v ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
          <label class="afield"><span>${tr('აღწერა')}</span><textarea class="textarea" rows="5" data-px="desc" placeholder="${ph(src.desc, 300)}">${esc(e.desc || '')}</textarea></label>
          <label class="afield"><span>${tr('უპირატესობები')} <small>${tr('თითო სტრიქონზე ერთი; ცარიელი:')} ${pg ? tr('გვერდის') : tr('Bitrix-ის')}</small></span><textarea class="textarea" rows="4" data-px="feats" placeholder="${esc((src.feats || []).slice(0, 4).join('\n'))}">${esc((e.feats || []).join('\n'))}</textarea></label>
        </section>
        <section class="apanel"><div class="apanel__head"><h2 class="ah2">${tr('ფოტოები')}</h2>${imgs ? tr('<button class="link-btn" data-act="px-img-inherit">დაბრუნება: ') + (pg ? tr('გვერდის') : tr('Bitrix-ის')) + tr(' ფოტოები</button>') : ''}</div>
          ${imgs ? `<div class="pximgs">${imgs.map((f, i) => `<figure class="pximg"><img src="${esc(pxImg(f))}" alt="">${i ? `<button type="button" class="iconbtn" data-act="px-img-first" data-i="${i}" title="${tr('პირველი')}" aria-label="${tr('პირველი')}">${ui('up')}</button>` : tr('<small>მთავარი</small>')}<button type="button" class="iconbtn" data-act="px-img-rm" data-i="${i}" aria-label="${tr('წაშლა')}">${ui('trash')}</button></figure>`).join('')}</div>
            <div class="ip__acts"><label class="btn btn--ghost btn--sm">${ui('plus')}<span>${tr('ატვირთვა')}</span><input type="file" accept="image/*" hidden data-pxup></label><button type="button" class="btn btn--ghost btn--sm" data-act="px-img-lib">${tr('ბიბლიოთეკიდან')}</button></div>`
            : `<div class="pximgs pximgs--inh">${inhImgs.slice(0, 8).map(f => `<figure class="pximg"><img src="${esc(pxImg(f))}" alt=""></figure>`).join('') || tr('<p class="muted">ფოტო არ არის.</p>')}</div>
            <p class="muted">${pg ? tr('გვერდის') : tr('Bitrix-ის')} ${tr('ფოტოები ჩანს.')} <button class="link-btn" data-act="px-img-own">${tr('საკუთარი ფოტოები საიტისთვის')}</button></p>`}
        </section>
        <section class="apanel"><div class="apanel__head"><h2 class="ah2">${tr('მახასიათებლები')}</h2>${specs ? tr('<button class="link-btn" data-act="px-spec-inherit">დაბრუნება: ') + (pg ? tr('გვერდის') : tr('Bitrix-ის')) + '</button>' : ''}</div>
          ${specs ? `<div class="pxspecs">${specs.map(([sk, sv], i) => `<div class="pxspec"><input class="input input--sm" value="${esc(sk)}" data-px-spec="${i}.0" aria-label="${tr('დასახელება')}"><input class="input input--sm" value="${esc(sv)}" data-px-spec="${i}.1" aria-label="${tr('მნიშვნელობა')}"><button type="button" class="iconbtn" data-act="px-spec-rm" data-i="${i}" aria-label="${tr('წაშლა')}">${ui('trash')}</button></div>`).join('')}</div>
            <button type="button" class="btn btn--ghost btn--sm aadd" data-act="px-spec-add">${ui('plus')}<span>${tr('სტრიქონის დამატება')}</span></button>`
            : `${inhSpecs.length ? `<dl class="pxdl">${inhSpecs.slice(0, 12).map(([sk, sv]) => `<dt>${esc(sk)}</dt><dd>${esc(sv)}</dd>`).join('')}</dl>${inhSpecs.length > 12 ? `<p class="muted">${tr('და კიდევ')} ${inhSpecs.length - 12}</p>` : ''}` : tr('<p class="muted">მახასიათებლები არ არის.</p>')}
            <p class="muted"><button class="link-btn" data-act="px-spec-own">${tr('მახასიათებლების შეცვლა საიტისთვის')}</button></p>`}
        </section>
      </div>
      <aside class="pxed__r"><section class="apanel pxbx">
        <h2 class="ah2">Bitrix</h2>
        <p class="muted">${tr('ასეა Bitrix-ში. ფასი და მარაგი საიტზე ყოველთვის აქედანაა; აქ გაკეთებული ცვლილება Bitrix-ს არ ეხება.')}</p>
        ${b.imgs && b.imgs[0] ? `<img class="pxbx__img" src="${esc(pxImg(b.imgs[0]))}" alt="">` : b.npics ? tr('<p class="muted pxbx__wait">ფოტო Bitrix-იდან იტვირთება…</p>') : ''}
        <dl class="pxdl">
          <dt>${tr('სახელი')}</dt><dd>${esc(b.name || '')}</dd>
          <dt>ID</dt><dd>${esc(b.bx)}</dd>
          ${b.parent ? `<dt>${tr('ვარიანტი')}</dt><dd>${esc(b.parentName || '')} (ID ${esc(b.parent)})${b.size ? '<br>' + esc(b.size) : ''}</dd>` : ''}
          ${b.sku ? `<dt>${tr('კოდი')}</dt><dd>${esc(b.sku)}</dd>` : ''}
          ${b.section ? `<dt>${tr('განყოფილება')}</dt><dd>${esc(b.section)}</dd>` : ''}
          ${b.brand ? `<dt>${tr('ბრენდი')}</dt><dd>${esc(b.brand)}</dd>` : ''}
          <dt>${tr('ფასი')}</dt><dd>${pxMoney(b.price)}</dd>
          <dt>${tr('მარაგი')}</dt><dd>${b.stock ? tr('მარაგშია') : tr('შეკვეთით')}</dd>
        </dl>
        ${b.desc ? `<p class="pxbx__desc">${esc(b.desc.slice(0, 400))}${b.desc.length > 400 ? '…' : ''}</p>` : ''}
      </section></aside>
    </div>`;
}
const pxField = (label, key, v, placeholder, hint = '') => `<label class="afield"><span>${label}${hint ? `<small>${esc(hint)}</small>` : ''}</span><input class="input" data-px="${key}" value="${esc(v || '')}" placeholder="${placeholder}"></label>`;

function pxTouch() {
  PX.dirty = true;
  S.dirty.add('px');   // the page warns before closing with an unsaved product
  const b = $('[data-act="px-save"]');
  if (b) b.disabled = false;
}
function pxInput(e) {
  const t = e.target;
  if (t.matches('[data-px-search]')) { PX.q = t.value; PX.n = PXN; $('[data-px-rows]').innerHTML = pxRows(); return; }
  if (t.matches('[data-px-sec]')) { PX.sec = t.value; PX.n = PXN; pxDraw(); return; }
  if (t.matches('[data-px-all]')) { const keys = pxKeys(); if (t.checked) keys.forEach(k => PX.sel.add(k)); else keys.forEach(k => PX.sel.delete(k)); const y = $('[data-body]').scrollTop; pxDraw(); $('[data-body]').scrollTop = y; return; }
  if (t.matches('[data-px-sel]')) { if (t.checked) PX.sel.add(t.dataset.pxSel); else PX.sel.delete(t.dataset.pxSel); const y = $('[data-body]').scrollTop; pxDraw(); $('[data-body]').scrollTop = y; return; }
  if (t.matches('[data-px-pq]')) { pxPageSearch(t); return; }
  if (!PX.draft) return;
  if (t.matches('[data-px]')) {
    const k = t.dataset.px;
    if (k === 'place') { const [c, s] = t.value.split('/'); PX.draft.cat = c || ''; PX.draft.sub = s || ''; }
    else if (k === 'feats') PX.draft.feats = t.value.split('\n').map(x => x.trim()).filter(Boolean);
    else PX.draft[k] = t.value;
    pxTouch();
  } else if (t.matches('[data-px-spec]')) {
    const [i, j] = t.dataset.pxSpec.split('.').map(Number);
    PX.draft.specs[i][j] = t.value;
    pxTouch();
  }
}
function pxPageSearch(input) {
  const menu = $('[data-px-pm]'), q = norm(input.value.trim());
  if (q.length < 2) { menu.hidden = true; return; }
  const linked = new Map(Object.entries(PX.data.layer).filter(([k, e]) => e.page && k !== PX.open).map(([k, e]) => [+e.page, k]));
  const hits = [...PX.pages.values()].filter(p => norm([p.title, p.name, p.sku, p.brand].join(' ')).includes(q)).slice(0, 12);
  menu.innerHTML = hits.length ? hits.map(p => `<button type="button" class="pp__opt" data-act="px-page" data-id="${p.id}"><img src="${esc(pxImg(p.imgs[0]))}" alt=""><span><b>${esc(p.title)}</b><small>${esc([p.sku && tr('კოდი ') + p.sku, linked.has(+p.id) ? tr('უკვე სხვა პროდუქტს უკავშირდება') : ''].filter(Boolean).join(' · '))}</small></span></button>`).join('')
    : tr('<p class="muted">ვერ მოიძებნა</p>');
  menu.hidden = false;
}
function pxOpen(k) {
  const b = PX.data.items[k];
  if (b && !(b.imgs || []).length && b.npics) {   // Bitrix's pictures not copied yet: now
    srv.productPics(k).then(imgs => { b.imgs = imgs; if (PX.open === k && imgs.length) pxDraw(); }).catch(() => {});
  }
  PX.open = k;
  PX.draft = clone(PX.data.layer[k] || { state: 'new' });
  PX.rev = (PX.data.layer[k] || {}).rev || 0;
  PX.dirty = false;
  S.dirty.delete('px');
}
async function pxLeave() {
  if (PX.dirty && !await ask(tr('ამ პროდუქტში შეუნახავი ცვლილებებია. დავტოვო?'), tr('დატოვება'), true)) return false;
  PX.open = null; PX.draft = null; PX.dirty = false;
  S.dirty.delete('px');
  return true;
}
async function pxSave() {
  if (!PX || !PX.open || !PX.dirty || PX.saving) return;
  PX.saving = true;
  try {
    const r = await srv.productSave(PX.open, PX.draft, PX.rev);
    PX.data.layer[PX.open] = r.entry;
    PX.draft = clone(r.entry);
    PX.rev = r.entry.rev;
    PX.dirty = false;
    S.dirty.delete('px');
    note(r.built === false ? tr('შენახულია; საიტის კატალოგი შემდეგ განახლებაზე გამოჩნდება') : LIVE ? tr('შენახულია: საიტზე უკვე ჩანს') : tr('შენახულია (სატესტო რეჟიმი)'), r.built === false ? '' : 'ok');
  } catch (err) {
    if (err.code === 'conflict' && err.data && err.data.entry) {
      PX.data.layer[PX.open] = err.data.entry;
      PX.rev = err.data.entry.rev;
      PX.saving = false;
      if (await ask(tr('ეს პროდუქტი სხვამ შეცვალა, სანამ თქვენ არედაქტირებდით. შევინახო თქვენი ვერსია?'), tr('ჩემი ვერსია'), true)) return pxSave();
      PX.draft = clone(err.data.entry); PX.dirty = false; S.dirty.delete('px');
      note(tr('ჩაიტვირთა მათი ვერსია'));
    } else failed(err);
  }
  PX.saving = false;
  pxDraw();
}
async function pxClick(a, e) {
  const act = a.dataset.act;
  const y = $('[data-body]').scrollTop, keep = () => { pxDraw(); $('[data-body]').scrollTop = y; };
  switch (act) {
    case 'px-filter': PX.f = a.dataset.f; PX.sec = ''; PX.n = PXN; pxDraw(); break;
    case 'px-more': PX.n += PXN; keep(); break;
    case 'px-unsel': PX.sel.clear(); keep(); break;
    case 'px-open': pxOpen(a.dataset.key); pxDraw(); $('[data-body]').scrollTop = 0; break;
    case 'px-back': if (await pxLeave()) pxDraw(); break;
    case 'px-save': pxSave(); break;
    case 'px-state': PX.draft.state = a.dataset.v; pxTouch(); keep(); break;
    case 'px-page': {
      const id = +a.dataset.id;
      PX.draft.page = id || 0;
      PX.draft.how = '';
      pxTouch(); keep(); break;
    }
    case 'px-img-own': { const pg = pxPage(PX.draft), src = pg || PX.data.items[PX.open] || {}; PX.draft.imgs = [...(src.imgs || [])]; pxTouch(); keep(); break; }
    case 'px-img-inherit': delete PX.draft.imgs; pxTouch(); keep(); break;
    case 'px-img-rm': PX.draft.imgs.splice(+a.dataset.i, 1); pxTouch(); keep(); break;
    case 'px-img-first': { const [f] = PX.draft.imgs.splice(+a.dataset.i, 1); PX.draft.imgs.unshift(f); pxTouch(); keep(); break; }
    case 'px-img-lib': library(url => { PX.draft.imgs.push(url); pxTouch(); keep(); }); break;
    case 'px-spec-own': { const pg = pxPage(PX.draft), src = pg || PX.data.items[PX.open] || {}; PX.draft.specs = (src.specs || []).map(r => [...r]); pxTouch(); keep(); break; }
    case 'px-spec-inherit': delete PX.draft.specs; pxTouch(); keep(); break;
    case 'px-spec-add': PX.draft.specs.push(['', '']); pxTouch(); keep(); break;
    case 'px-spec-rm': PX.draft.specs.splice(+a.dataset.i, 1); pxTouch(); keep(); break;
    case 'px-bulk': {
      const keys = [...PX.sel], state = a.dataset.state;
      if (!await ask(`${keys.length} ${tr('პროდუქტი:')} ${state === 'shown' ? tr('გამოჩნდეს საიტზე') : tr('დაიმალოს')}?`, state === 'shown' ? tr('გამოჩენა') : tr('დამალვა'))) break;
      try {
        const r = await srv.productsState(keys, state);
        PX.data.layer = r.layer;
        PX.sel.clear();
        note(`${r.changed} ${tr('პროდუქტი')} ${state === 'shown' ? tr('გამოჩნდა საიტზე') : tr('დაიმალა')}`, 'ok');
      } catch (err) { failed(err); }
      keep();
      break;
    }
    case 'px-refresh': {
      a.classList.add('is-busy');
      try { PX.data = await srv.productsRefresh(); note(tr('Bitrix-იდან წაკითხულია'), 'ok'); } catch (err) { failed(err); }
      keep();
      break;
    }
  }
}
async function pxUpload(input) {
  if (!input.files[0] || !PX || !PX.draft) return;
  input.closest('.ip__acts').classList.add('is-busy');
  try {
    const f = await upload(input.files[0]);
    PX.draft.imgs.push(f.url);
    pxTouch();
  } catch (err) { failed(err); }
  const y = $('[data-body]').scrollTop;
  pxDraw();
  $('[data-body]').scrollTop = y;
}
R.products = () => tr('<div class="pxwrap" data-px><p class="muted">იტვირთება…</p></div>');
A.products = body => {
  const box = $('[data-px]', body);
  box.addEventListener('input', pxInput);
  box.addEventListener('change', e => { if (e.target.matches('[data-pxup]')) pxUpload(e.target); });
  pxLoad(box);
};

/* the preview: the site's own product file stands in for Bitrix; the layer lives in this browser */
let pxFake = null;
async function pxLocalData() {
  if (!pxFake) {
    const c = await fetch('data/catalog.json').then(r => r.json());
    const name = new Map(c.categories.flatMap(x => x.subs.map(s => [x.id + '/' + s.id, x.name + ' › ' + s.name])));
    const items = {};
    let extra = 0;
    c.products.forEach(p => {
      if (p.price == null && !p.review && extra++ >= 14) return;   // the priced products, and a few without code or price: they wait as "new"
      const bx = p.review ? p.id : 70000 + p.id;   // a page built from Bitrix's data has its Bitrix ID
      items['b' + bx] = { bx, review: !!p.review, dup: p.dup || 0, sku: p.price == null ? '' : p.sku, name: p.name, brand: p.brand, section: 'Max Comfort › ' + (name.get(p.cat + '/' + p.sub) || ''),
        cat: '', sub: '', type: p.type, price: p.price, stock: p.stock, imgs: p.imgs.slice(0, 2), specs: p.specs.slice(0, 6), feats: [], desc: '' };
    });
    const bySku = new Map();
    c.products.forEach(p => { if (p.review) return; const k = String(p.sku || '').replace(/[\s.\-/_]+/g, '').toUpperCase().replace(/^0+/, ''); if (k) bySku.set(k, bySku.has(k) ? 0 : p.id); });
    pxFake = { items, bySku };
  }
  const layer = LS.get('mc.products', {}), linked = new Set(Object.values(layer).map(e => +e.page).filter(Boolean));
  Object.entries(pxFake.items).forEach(([k, b]) => {
    if (layer[k]) return;
    if (b.review) { layer[k] = { state: b.dup ? 'hidden' : 'new', page: b.bx, how: 'id', rev: 0 }; return; }   // built from Bitrix's data: waits for a check (a second listing: hidden)
    const page = pxFake.bySku.get(String(b.sku || '').replace(/[\s.\-/_]+/g, '').toUpperCase().replace(/^0+/, '')) || 0;
    layer[k] = page && !linked.has(page) ? { state: 'shown', page, how: 'code', rev: 0 } : { state: 'new', rev: 0 };
    if (page) linked.add(page);
  });
  LS.set('mc.products', layer);
  return { enabled: true, at: new Date().toISOString(), error: '', items: pxFake.items, layer };
}

/* ---------- boot ---------- */
const root = $('#adm');
root.addEventListener('input', onEdit);
root.addEventListener('change', e => { onEdit(e); onUpload(e); });
root.addEventListener('click', onClick);
root.addEventListener('input', e => { if (e.target.matches('[data-pp-q]')) ppSearch(e.target); });
root.addEventListener('mousedown', e => {   // the text editor keeps its selection while a button is pressed
  if (e.target.closest('[data-cmd]')) { e.preventDefault(); const s = getSelection(); rteRange = s.rangeCount ? s.getRangeAt(0).cloneRange() : null; }
});
root.addEventListener('toggle', e => { const d = e.target; if (d.matches && d.matches('details[data-open-key]')) { if (d.open) S.open.add(d.dataset.openKey); else S.open.delete(d.dataset.openKey); } }, true);
root.addEventListener('focusin', e => { const t = e.target.closest('[data-tx]'); if (t) post({ mc: 'show', key: t.dataset.tx }); });
document.addEventListener('click', e => { if (!e.target.closest('.pp')) $$('.pp__menu').forEach(m => { m.hidden = true; }); });
addEventListener('hashchange', () => { if (S.user && S.c) go(location.hash.slice(1)); });
addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && S.user) { e.preventDefault(); if (S.view === 'products') pxSave(); else save(); } });
addEventListener('beforeunload', e => { if (S.dirty.size) { e.preventDefault(); e.returnValue = ''; } });

(async () => {
  try {
    const st = await srv.state();
    if (st.user) { S.user = st.user; await start(); } else signIn(!!st.setup);
  } catch (err) {
    console.error(err);
    root.innerHTML = `<div class="alogin"><div class="alogin__box"><h1 class="h2">${tr('მართვის პანელი')}</h1><p>${esc(err.code === 'network' ? tr('სერვერთან კავშირი ვერ დამყარდა.') : err.message)}</p><p class="muted">${tr('სერვერზე საჭიროა api/config.php (იხ. README).')}</p></div></div>`;
  }
})();
