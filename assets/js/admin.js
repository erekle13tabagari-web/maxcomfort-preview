/* Admin panel (admin.html): the site content without a developer.
   Contacts, showrooms, delivery and payment, page texts and the timeline, the spotlight slides, brands,
   the media centre, Q&A and uploaded files; personal logins (owner, editors) and the history of saves.
   Products, prices, stock and orders are not here: they come from Bitrix.
   bitrix mode: api/admin.php saves on this server.  static (preview): everything stays in this browser,
   any name signs in.  Each section is saved on its own; the preview frame shows unsaved changes.        */
import { $, $$, esc, ui, C, rich, safeUrl, money, norm } from './core.js';
import { catalog } from './api.js';

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
const MON = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];
/** 21 ოქტ 2026, 15:48 (browsers often have no Georgian date format) */
const when = s => { const d = new Date(s); return isNaN(d) ? '' : `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const kb = n => (n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

/* ---------- the server, or this browser in the preview ---------- */
class Fail extends Error {
  constructor(message, code = '', status = 0, data = null) { super(message); this.code = code; this.status = status; this.data = data; }
}
const remote = {
  async call(action, data = {}) {
    let res, j = null;
    try {
      res = await fetch(C.api + 'admin.php', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...data }) });
      j = await res.json();
    } catch (e) { throw new Fail('სერვერთან კავშირი ვერ დამყარდა', 'network'); }
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
  async upload(blob, name) {
    let res, j = null;
    try {
      res = await fetch(C.api + 'admin.php?action=upload&name=' + encodeURIComponent(name), { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': blob.type || 'application/octet-stream', 'X-Requested-With': 'mc-admin' }, body: blob });
      j = await res.json();
    } catch (e) { throw new Fail('ფაილი ვერ აიტვირთა', 'network'); }
    if (!res.ok || !j || !j.ok) throw new Fail((j && j.error) || 'HTTP ' + res.status, j && j.code, res.status, j);
    return j.file;
  }
};
const PREVIEW_NOTE = 'სატესტო რეჟიმში ეს არ ინახება';
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
    if (rev !== cur) throw new Fail('ამ განყოფილებას სხვამ შეცვალა', 'conflict', 409, { content: c });
    c[section] = clone(value);
    c.revs[section] = cur + 1;
    c.at = new Date().toISOString();
    try { LS.put('mc.content', c); } catch (e) { throw new Fail('ბრაუზერის მეხსიერება გაივსო: წაშალეთ რამდენიმე სურათი', 'quota'); }
    const h = LS.get('mc.content.history', []);
    h.unshift({ id: uid('h'), at: c.at, by: S.user.login, name: S.user.name, section, rev: cur + 1, note: '', value: clone(value) });
    for (let n = 40; n > 0; n -= 10) { try { LS.put('mc.content.history', h.slice(0, n)); break; } catch (e) { /* smaller */ } }
    return c;
  },
  async history() { return LS.get('mc.content.history', []).map(({ value, ...h }) => h); },
  async version(id) { const v = LS.get('mc.content.history', []).find(h => h.id === id); if (!v) throw new Fail('ვერსია ვერ მოიძებნა'); return v; },
  async restore(id) { const v = await local.version(id), c = await local.content(); return local.save(v.section, v.value, c.revs[v.section] || 0); },
  async files() { const used = JSON.stringify(LS.get('mc.content', {})); return LS.get('mc.files', []).map(f => ({ ...f, used: used.includes(f.url) })); },
  async deleteFile(url) { LS.set('mc.files', LS.get('mc.files', []).filter(f => f.url !== url)); return {}; },
  async users() { return [{ ...S.user, on: true, made: '', seen: '' }]; },
  async userSave() { throw new Fail(PREVIEW_NOTE, 'preview'); },
  async userDelete() { throw new Fail(PREVIEW_NOTE, 'preview'); },
  async bitrix() { throw new Fail(PREVIEW_NOTE, 'preview'); },
  async upload(blob, name) {
    const url = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(blob); });
    const f = { url, name, size: blob.size, at: new Date().toISOString(), type: (blob.type.split('/')[1] || '').replace('jpeg', 'jpg') };
    const list = LS.get('mc.files', []);
    try { LS.put('mc.files', [f, ...list]); } catch (e) { throw new Fail('ბრაუზერის მეხსიერება გაივსო: სატესტო რეჟიმში მხოლოდ რამდენიმე სურათი ეტევა', 'quota'); }
    return f;
  }
};
const srv = LIVE ? remote : local;

/* ---------- state ---------- */
const S = {
  user: null, c: null, w: {}, dirty: new Set(), db: null, view: 'home', post: null, page: 'index',
  open: new Set(), defs: {}, frame: { texts: [], page: '' }
};
const SECTIONS = { contacts: 'კონტაქტები', showrooms: 'შოურუმები', delivery: 'მიწოდება', payment: 'გადახდა', texts: 'გვერდების ტექსტები', timeline: 'ისტორიის წლები', spots: 'სლაიდები', brands: 'ბრენდები', posts: 'მედია ცენტრი', faq: 'კითხვა-პასუხი' };
const VIEWS = [
  { id: 'home', t: 'მიმოხილვა', ic: 'grid', s: [] },
  { id: 'contacts', t: 'კონტაქტები', ic: 'phone', s: ['contacts'] },
  { id: 'showrooms', t: 'შოურუმები', ic: 'pin', s: ['showrooms'] },
  { id: 'orders', t: 'მიწოდება და გადახდა', ic: 'box', s: ['delivery', 'payment'] },
  { id: 'texts', t: 'გვერდების ტექსტები', ic: 'edit', s: ['texts', 'timeline'] },
  { id: 'spots', t: 'სლაიდები', ic: 'eye', s: ['spots'] },
  { id: 'brands', t: 'ბრენდები', ic: 'shield', s: ['brands'] },
  { id: 'posts', t: 'მედია ცენტრი', ic: 'chat', s: ['posts'] },
  { id: 'faq', t: 'კითხვა-პასუხი', ic: 'info', s: ['faq'] },
  { id: 'files', t: 'ფაილები', ic: 'download', s: [] },
  { id: 'history', t: 'ისტორია', ic: 'clock', s: [] },
  { id: 'users', t: 'მომხმარებლები', ic: 'user', s: [], owner: true },
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
  m.innerHTML = `<div class="amodal__scrim" data-x></div><div class="amodal__box ${wide ? 'amodal__box--wide' : ''}" role="dialog" aria-modal="true"><button class="iconbtn amodal__close" data-x aria-label="დახურვა">${ui('close')}</button>${html}</div>`;
  document.body.appendChild(m);
  const close = () => { m.remove(); document.removeEventListener('keydown', esc_); };
  const esc_ = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', esc_);
  m.addEventListener('click', e => { if (e.target.closest('[data-x]')) close(); });
  setTimeout(() => { const f = $('input,textarea,select,button:not([data-x])', m); if (f) f.focus(); }, 30);
  return { el: m, close };
}
function ask(text, ok = 'დიახ', danger = false) {
  return new Promise(done => {
    const m = modal(`<h2 class="h3">${esc(text)}</h2><div class="amodal__acts"><button class="btn btn--ghost btn--sm" data-no>გაუქმება</button><button class="btn ${danger ? 'btn--red' : ''} btn--sm" data-yes>${esc(ok)}</button></div>`);
    m.el.addEventListener('click', e => {
      if (e.target.closest('[data-yes]')) { m.close(); done(true); } else if (e.target.closest('[data-no],[data-x]')) { m.close(); done(false); }
    });
  });
}
function failed(err) {
  console.error(err);
  if (err.code === 'signed-out') { note('სესია დასრულდა: შედით ხელახლა', 'bad'); S.user = null; signIn(); return; }
  note(err.message || 'შეცდომა', 'bad');
}

const field = (label, bind, v, o = {}) => `<label class="afield ${o.cls || ''}"><span>${label}${o.hint ? `<small>${o.hint}</small>` : ''}</span>${o.area
  ? `<textarea class="textarea" data-b="${bind}" rows="${o.rows || 3}" ${o.max ? `maxlength="${o.max}"` : ''} placeholder="${esc(o.ph || '')}">${esc(v ?? '')}</textarea>`
  : `<input class="input" data-b="${bind}" type="${o.type || 'text'}" value="${esc(v ?? '')}" ${o.max ? `maxlength="${o.max}"` : ''} ${o.t ? `data-t="${o.t}"` : ''} placeholder="${esc(o.ph || '')}" ${o.attrs || ''}>`}</label>`;
const toggle = (label, bind, on) => `<label class="switch aswitch"><span>${label}</span><input type="checkbox" data-b="${bind}" ${on ? 'checked' : ''}></label>`;
const select = (label, bind, v, opts) => `<label class="afield"><span>${label}</span><select class="select" data-b="${bind}">${opts.map(([k, n]) => `<option value="${esc(k)}" ${String(k) === String(v ?? '') ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>`;
const itemActs = (list, i, n, del = true) => `<span class="aitem__acts">
  <button type="button" class="iconbtn" data-act="up" data-list="${list}" data-i="${i}" ${i ? '' : 'disabled'} aria-label="ზემოთ">${ui('up')}</button>
  <button type="button" class="iconbtn" data-act="down" data-list="${list}" data-i="${i}" ${i < n - 1 ? '' : 'disabled'} aria-label="ქვემოთ">${ui('down')}</button>
  ${del ? `<button type="button" class="iconbtn" data-act="del" data-list="${list}" data-i="${i}" aria-label="წაშლა">${ui('trash')}</button>` : ''}</span>`;
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
  faq: () => ({ id: uid('q'), q: '', a: '', on: true })
};

/* ---------- product search (slides) ---------- */
function findProducts(q) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length || !S.db) return [];
  return S.db.products.filter(p => { const h = norm([p.title, p.sku, p.brandName, p.name].join(' ')); return words.every(w => h.includes(w)); }).slice(0, 8);
}
const prodLine = id => {
  const p = S.db && S.db.byId.get(+id);
  return p ? `<img src="${esc(p.src[0])}" alt=""><span><b>${esc(p.title)}</b><small>${esc(p.brandName || '')} · ${esc(p.sku || '')}${p.price ? ' · ' + money(p.price) : ''}</small></span>` : `<span class="muted">${id ? 'პროდუქტი #' + esc(id) + ' (ვერ მოიძებნა)' : 'არ არის არჩეული'}</span>`;
};
const picker = (bind, id, multi = false) => {
  const ids = multi ? (getPath(W(bind.split('|')[0]), bind.split('|')[1]) || []) : [];
  return `<div class="pp" data-pp="${bind}" ${multi ? 'data-multi' : ''}>
    ${multi ? `<div class="pp__chips">${ids.map((id, k) => `<span class="pp__chip">${prodLine(id)}<button type="button" class="iconbtn" data-act="pp-rm" data-pp-b="${bind}" data-i="${k}" aria-label="მოხსნა">${ui('close')}</button></span>`).join('') || '<span class="muted">არ არის არჩეული: გამოიყენება ფერების პროდუქტები და მათი სიმძლავრეები</span>'}</div>`
      : `<div class="pp__val">${prodLine(id)}${id ? `<button type="button" class="iconbtn" data-act="pp-clear" data-pp-b="${bind}" aria-label="მოხსნა">${ui('close')}</button>` : ''}</div>`}
    <div class="pp__find">${ui('search', 'ui--sm')}<input class="input" data-pp-q placeholder="მოძებნეთ: სახელი, კოდი ან ბრენდი" aria-label="პროდუქტის ძიება" autocomplete="off"></div>
    <div class="pp__menu" hidden></div>
  </div>`;
};

/* ---------- pictures: upload, library, address ---------- */
const imgPick = (bind, url, label = 'სურათი', accept = 'image/*') => `<div class="ip" data-ip="${bind}">
  <span class="afield__l">${label}</span>
  <div class="ip__row"><span class="ip__thumb">${url ? (/\.pdf$/i.test(url) ? ui('download') : `<img src="${esc(url)}" alt="">`) : ui('plus')}</span>
  <div class="ip__acts">
    <label class="btn btn--ghost btn--sm">ატვირთვა<input type="file" accept="${accept}" hidden data-up="${bind}"></label>
    <button type="button" class="btn btn--ghost btn--sm" data-act="lib" data-ip-b="${bind}">ბიბლიოთეკიდან</button>
    ${url ? `<button type="button" class="iconbtn" data-act="img-clear" data-ip-b="${bind}" aria-label="მოხსნა">${ui('trash')}</button>` : ''}
  </div></div>
  ${/^data:/.test(url || '') ? '<small class="muted">ატვირთულია ამ ბრაუზერში</small>' : `<input class="input input--sm" data-b="${bind}" value="${esc(url || '')}" placeholder="ან ჩასვით მისამართი: assets/... ან https://...">`}
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
  if (file.size > 12 * 1048576) throw new Fail('ფაილი 12 MB-ზე დიდია');
  if (!/^(image\/(jpeg|png|gif|webp)|application\/pdf)$/.test(file.type)) throw new Fail('მხოლოდ JPG, PNG, GIF, WebP და PDF');
  const f = await prepare(file);
  return srv.upload(f, f.name || file.name);
}

/* the file library as a chooser (pictures for slides, brands, posts, the text editor) */
async function library(onPick, images = true) {
  const m = modal(`<h2 class="h3">ბიბლიოთეკა</h2><p class="muted">აირჩიეთ ფაილი ან ატვირთეთ ახალი.</p>
    <label class="btn btn--sm" style="margin:14px 0">ატვირთვა<input type="file" accept="${images ? 'image/*' : 'image/*,application/pdf'}" hidden data-lib-up></label>
    <div class="alib" data-lib><p class="muted">იტვირთება…</p></div>`, true);
  const fill = async () => {
    try {
      const files = (await srv.files()).filter(f => !images || f.type !== 'pdf');
      $('[data-lib]', m.el).innerHTML = files.length ? files.map(f => `<button type="button" class="alib__f" data-url="${esc(f.url)}">${f.type === 'pdf' ? ui('download') : `<img src="${esc(f.url)}" alt="" loading="lazy">`}<small>${esc(String(f.name || f.url).split('/').pop().slice(0, 28))}</small></button>`).join('') : '<p class="muted">ჯერ არაფერია ატვირთული.</p>';
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
const RTE = [['h2', 'H2', 'სათაური'], ['h3', 'H3', 'ქვესათაური'], ['p', '¶', 'აბზაცი'], ['bold', '<b>B</b>', 'მუქი'], ['italic', '<i>I</i>', 'დახრილი'],
  ['ul', '•', 'სია'], ['ol', '1.', 'დანომრილი სია'], ['quote', '❝', 'ციტატა'], ['link', ui('link', 'ui--sm'), 'ბმული'], ['img', ui('plus', 'ui--sm'), 'სურათი'], ['clear', '⌫', 'ფორმატის მოხსნა']];
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
    const u = prompt('ბმული: https://... ან გვერდი, მაგ. catalog.html?c=heating');
    if (u && safeUrl(u)) run('createLink', u.trim());
  } else if (c === 'img') {
    const range = rteRange;
    library(url => { area.focus(); if (range) { const s = getSelection(); s.removeAllRanges(); s.addRange(range); } run('insertImage', url); area.dispatchEvent(new Event('input', { bubbles: true })); });
    return;
  }
  area.dispatchEvent(new Event('input', { bubbles: true }));
}

/* ---------- layout ---------- */
const ROLE = { owner: 'მფლობელი', editor: 'რედაქტორი' };
const initials = n => String(n || '').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
function shell() {
  $('#adm').innerHTML = `
  <aside class="adm__nav" aria-label="განყოფილებები">
    <a class="adm__logo" href="index.html" target="_blank" rel="noopener" title="საიტის ნახვა"><img src="assets/brand/logo/mc-logo-white.svg" alt="Max Comfort" width="84" height="43"><span>მართვის<br>პანელი</span></a>
    <nav class="adm__links">${VIEWS.filter(v => !v.owner || S.user.role === 'owner').map(v => `<a class="adm__link" href="#${v.id}" data-view="${v.id}">${ui(v.ic)}<span>${v.t}</span><i class="adm__dot" hidden></i></a>`).join('')}</nav>
    <div class="adm__me">
      <span class="av av--sm">${esc(initials(S.user.name))}</span><span class="adm__who"><b>${esc(S.user.name)}</b><small>${ROLE[S.user.role] || ''}</small></span>
      <button class="iconbtn" data-act="me" aria-label="ანგარიში">${ui('edit')}</button>
      <button class="iconbtn" data-act="logout" aria-label="გასვლა">${ui('logout')}</button>
    </div>
  </aside>
  <main class="adm__main">
    ${LIVE ? '' : `<div class="adm__test">${ui('info', 'ui--sm')}<span>სატესტო რეჟიმი: ცვლილებები ინახება მხოლოდ ამ ბრაუზერში და ჩანს ამ ბრაუზერში გახსნილ საიტზე.</span></div>`}
    <header class="adm__bar"><div><h1 data-title></h1><small data-status></small></div><div class="adm__acts" data-acts></div></header>
    <div class="adm__body" data-body></div>
  </main>`;
}
function navDots() {
  $$('.adm__link').forEach(a => {
    const v = VIEWS.find(x => x.id === a.dataset.view);
    a.classList.toggle('is-on', v.id === S.view);
    $('.adm__dot', a).hidden = !v.s.some(s => S.dirty.has(s));
  });
}
const PREVIEW = { contacts: 'about.html#contact', showrooms: 'about.html#contact', orders: 'about.html#delivery', texts: null, spots: 'index.html', brands: 'index.html#brands', posts: 'media.html', faq: 'media.html?t=faq' };
function bar() {
  const v = view();
  $('[data-title]').textContent = v.t;
  const dirty = v.s.filter(s => S.dirty.has(s));
  const revs = v.s.map(s => (S.c.revs || {})[s] || 0).reduce((a, b) => a + b, 0);
  $('[data-status]').textContent = dirty.length ? 'შეუნახავი ცვლილებები' : v.s.length ? (revs ? 'ყველაფერი შენახულია' : 'საწყისი შიგთავსი') : '';
  $('[data-status]').classList.toggle('is-dirty', !!dirty.length);
  const page = v.id === 'texts' ? S.page + '.html' : PREVIEW[v.id];
  $('[data-acts]').innerHTML = (page ? `<button class="btn btn--ghost btn--sm" data-act="preview" data-page="${page}">${ui('eye')}<span>ნახვა საიტზე</span></button>` : '') +
    (v.s.length ? `<button class="btn btn--red btn--sm" data-act="save" ${dirty.length ? '' : 'disabled'}>${ui('check')}<span>შენახვა</span></button>` : '');
}
function go(id) {
  if (!VIEWS.some(v => v.id === id && (!v.owner || S.user.role === 'owner'))) id = 'home';
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
  const tiles = [['showrooms', 'შოურუმი', (c.showrooms || []).length], ['spots', 'სლაიდი ჩართულია', (c.spots || []).filter(s => s.on).length],
    ['brands', 'ბრენდი ზოლში', (c.brands || []).filter(b => b.strip).length], ['posts', 'გამოქვეყნებული ჩანაწერი', posts],
    ['faq', 'კითხვა-პასუხი', (c.faq || []).filter(f => f.on).length], ['texts', 'შეცვლილი ტექსტი', Object.keys(Array.isArray(c.texts) ? {} : c.texts || {}).length]];
  return `<div class="ahome">
    <p class="ahome__hi">გამარჯობა, ${esc(S.user.name)}. აქ იცვლება საიტის ტექსტები, კონტაქტები, სლაიდები, ბრენდები და მედია ცენტრი.</p>
    <div class="atiles">${tiles.map(([v, t, n]) => `<a class="atile" href="#${v}"><b>${n}</b><span>${t}</span></a>`).join('')}</div>
    <div class="ainfo">${ui('box')}<div><b>პროდუქცია, ფასები, მარაგი და შეკვეთები</b><p>ისინი Bitrix-იდან მოდის და იქ იცვლება. საიტი ახალ ფასს და მარაგს 15 წუთში აჩვენებს, შეკვეთები კი Bitrix-ში გარიგებებად ჩნდება.</p></div></div>
    <h2 class="ah2">ბოლო ცვლილებები</h2><div data-recent><p class="muted">იტვირთება…</p></div>
  </div>`;
};
A.home = async body => {
  try {
    const h = (await srv.history()).slice(0, 6);
    $('[data-recent]', body).innerHTML = h.length ? `<ul class="alog-list">${h.map(x => `<li><b>${esc(SECTIONS[x.section] || x.section)}</b><span>${esc(x.name || x.by)}</span><small>${esc(when(x.at))}</small></li>`).join('')}</ul>` : '<p class="muted">ჯერ არაფერი შეცვლილა.</p>';
  } catch (e) { failed(e); }
};

R.contacts = () => {
  const k = W('contacts');
  return `<div class="aform">
    <section class="apanel"><h2 class="ah2">კომპანია</h2><div class="agrid">
      ${field('ცხელი ხაზი', 'contacts|phone', k.phone, { hint: 'ჩანს ყველა გვერდზე', max: 40 })}
      ${field('ელ. ფოსტა', 'contacts|email', k.email, { type: 'email', max: 120 })}
      ${field('სამუშაო საათები', 'contacts|hours', k.hours, { max: 80, ph: 'ორშ-პარ 10:00-18:00' })}
      ${field('კომპანიის სახელი', 'contacts|company', k.company, { hint: 'საავტორო უფლებების ზოლში', max: 120 })}
    </div></section>
    <section class="apanel"><h2 class="ah2">სოციალური ქსელები</h2><p class="muted">ცარიელი ველის ღილაკი საიტზე არ ჩანს.</p><div class="agrid">
      ${['facebook', 'instagram', 'youtube', 'tiktok', 'linkedin'].map(n => field(n[0].toUpperCase() + n.slice(1).replace('tok', 'Tok').replace('edin', 'edIn'), 'contacts|social.' + n, k.social[n], { type: 'url', ph: 'https://' })).join('')}
    </div></section></div>`;
};

R.showrooms = () => {
  const list = W('showrooms');
  return `<div class="aform"><p class="muted">რიგი საიტზე და შეკვეთის გვერდზე იგივეა. პირველი შოურუმის მისამართი ჩანს ქვედა ზოლში.</p>
    ${list.map((s, i) => `<section class="apanel aitem--flat"><div class="apanel__head"><h2 class="ah2">${esc(s.name || 'შოურუმი')}</h2>${itemActs('showrooms|', i, list.length)}</div><div class="agrid">
      ${field('სახელი', `showrooms|${i}.name`, s.name, { max: 80 })}
      ${field('მისამართი', `showrooms|${i}.address`, s.address, { max: 160 })}
      ${field('ტელეფონი', `showrooms|${i}.phone`, s.phone, { max: 60 })}
      ${field('ელ. ფოსტა', `showrooms|${i}.email`, s.email, { type: 'email', max: 120 })}
      ${field('რუკისთვის', `showrooms|${i}.map`, s.map, { hint: 'თუ რუკა არასწორ ადგილს აჩვენებს: ზუსტი მისამართი ან კოორდინატები, მაგ. 41.7369, 44.7798', max: 200 })}
      <div class="afield">${toggle('სათაო ოფისი', `showrooms|${i}.hq`, s.hq)}<a class="link" target="_blank" rel="noopener" href="https://www.google.com/maps?q=${encodeURIComponent(s.map || 'თბილისი, ' + s.address)}">რუკაზე ნახვა ${ui('ext', 'ui--sm')}</a></div>
    </div></section>`).join('')}
    ${addBtn('showrooms|', 'შოურუმის დამატება')}</div>`;
};

R.orders = () => {
  const d = W('delivery'), p = W('payment');
  const price = (x, i) => `<label class="afield"><span>ფასი</span><select class="select" data-price="${i}">
      <option value="free" ${x.price === 0 ? 'selected' : ''}>უფასო</option><option value="call" ${x.price == null ? 'selected' : ''}>ღირებულებას მენეჯერი ადასტურებს</option><option value="fixed" ${x.price > 0 ? 'selected' : ''}>ფიქსირებული ფასი</option></select></label>
    ${x.price > 0 ? field('ფასი, ₾', `delivery|${i}.price`, x.price, { type: 'number', t: 'num', attrs: 'min="0" step="0.5"' }) : ''}`;
  return `<div class="aform">
    <section class="apanel"><h2 class="ah2">მიწოდება</h2><p class="muted">შეკვეთის გვერდის არჩევანი და „ჩვენ შესახებ“ გვერდის ბლოკი. „გატანა შოურუმიდან“ შოურუმის არჩევანს აჩვენებს.</p>
      ${d.map((x, i) => `<div class="arow"><div class="agrid agrid--3">${field('სახელი', `delivery|${i}.name`, x.name, { max: 80 })}${field('შენიშვნა', `delivery|${i}.note`, x.note, { max: 160 })}${price(x, i)}</div>${itemActs('delivery|', i, d.length, x.id !== 'pickup')}</div>`).join('')}
      ${addBtn('delivery|', 'მიწოდების დამატება')}</section>
    <section class="apanel"><h2 class="ah2">გადახდა</h2>
      ${p.map((x, i) => `<div class="arow"><div class="agrid">${field('სახელი', `payment|${i}.name`, x.name, { max: 80 })}${field('შენიშვნა', `payment|${i}.note`, x.note, { max: 160 })}</div>${itemActs('payment|', i, p.length)}</div>`).join('')}
      ${addBtn('payment|', 'გადახდის დამატება')}</section></div>`;
};

/* page texts: the preview frame lists the page's editable texts; a click there opens the field here */
const TPAGES = [['index', 'მთავარი', k => /^(home|footer)\./.test(k)], ['about', 'ჩვენ შესახებ', k => /^about\./.test(k)], ['media', 'მედია ცენტრი', k => /^media\./.test(k)]];
const GROUPS = { 'home.hero': 'მთავარი სლაიდები', 'home.win': 'ოთხი სისტემა', 'home.rail': 'პოპულარული პროდუქცია', 'home.svc': 'სერვისი', 'home.stat': 'ციფრები', 'home.promo': 'აქციები', 'home.band': 'კონსულტაციის ზოლი', footer: 'ქვედა ზოლი (ყველა გვერდზე)',
  'about.hero': 'თავი', 'about.story': 'კომპანია', 'about.tri': 'მისია, ხედვა, დაპირება', 'about.val': 'ღირებულებები', 'about.svc': 'სერვისი', 'about.del': 'მიწოდება და გადახდა', 'about.hist': 'ისტორია', 'about.stat': 'ციფრები', 'about.contact': 'კონტაქტი', 'about.privacy': 'კონფიდენციალურობა', media: 'მედია ცენტრი', 'media.band': 'ზარის ზოლი' };
const PARTS = { eyebrow: 'წარწერა', title: 'სათაური', lead: 'ტექსტი', text: 'ტექსტი', note: 'ქვეწარწერა', n: 'რიცხვი', t: 'წარწერა', rich: 'ტექსტი', about: 'ტექსტი',
  cooling: 'კონდიცირება', heating: 'გათბობა', ventilation: 'ვენტილაცია', water: 'წყალმომარაგება' };
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
    <div class="asplit__l"><p class="muted">დააჭირეთ ტექსტს მარჯვნივ, ან შეცვალეთ აქ. ცარიელი ველი საწყის ტექსტს აბრუნებს.</p><div data-tfields><p class="muted">გვერდი იტვირთება…</p></div>
      ${S.page === 'about' ? `<section class="apanel"><h2 class="ah2">ისტორიის წლები</h2>${tl.map((x, i) => `<div class="arow"><div class="agrid agrid--yt">${field('წელი', `timeline|${i}.year`, x.year, { max: 20 })}${field('ტექსტი', `timeline|${i}.text`, x.text, { max: 400 })}</div>${itemActs('timeline|', i, tl.length)}</div>`).join('')}${addBtn('timeline|', 'წლის დამატება')}</section>` : ''}
    </div>
    <div class="asplit__r"><iframe class="aframe" title="გვერდის გადახედვა" data-frame></iframe></div>
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
    return `<div class="afield atext ${T[x.key] != null ? 'is-changed' : ''}" data-key="${esc(x.key)}"><span>${esc(x.label)}<button type="button" class="alink" data-act="reset" data-key="${esc(x.key)}" ${T[x.key] != null ? '' : 'hidden'}>საწყისზე დაბრუნება</button></span>
      ${x.rich ? rte(`data-tx="${esc(x.key)}"`, v) : `<textarea class="textarea" data-tx="${esc(x.key)}" rows="${String(v).length > 90 ? 3 : 1}">${esc(v)}</textarea>`}</div>`;
  }).join('')}</section>`).join('') || '<p class="muted">ამ გვერდზე შესაცვლელი ტექსტი ვერ მოიძებნა.</p>';
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
  const STYLE = [['glow', 'მუქი, წითელი ნათებით'], ['round', 'მუქი, მრგვალი ლურჯი ფონით']];
  const FACT = [['', 'ტექსტი'], ['kw', 'სიმძლავრეები (ავტომატურად)'], ['price', 'ფასი -დან (ავტომატურად)']];
  return `<div class="asplit"><div class="asplit__l">
    <p class="muted">მთავარი გვერდის კარუსელი. გამორთული სლაიდი საიტზე არ ჩანს.</p>
    ${list.map((s, i) => card('spots|' + i, esc(s.title || 'სლაიდი'), `
      <div class="agrid">${toggle('ჩართულია', `spots|${i}.on`, s.on)}${select('ფონი', `spots|${i}.style`, s.style, STYLE)}
      ${field('წარწერა', `spots|${i}.eyebrow`, s.eyebrow, { max: 80, ph: 'მაგ. ბრენდი' })}${field('სათაური', `spots|${i}.title`, s.title, { max: 120 })}</div>
      ${field('ტექსტი', `spots|${i}.lead`, s.lead, { area: true, max: 600 })}
      ${field('ღილაკის წარწერა', `spots|${i}.button`, s.button, { max: 60 })}
      <h3 class="ah3">ფერები / ვარიანტები <small>თითო: სურათი, ფერის ნიმუში და პროდუქტი (ან ბმული)</small></h3>
      ${(s.looks || []).map((l, k) => `<div class="alook"><div class="alook__head"><b>${esc(l.name || 'ვარიანტი ' + (k + 1))}</b>${itemActs(`spots|${i}.looks`, k, s.looks.length)}</div>
        <div class="agrid">${field('სახელი', `spots|${i}.looks.${k}.name`, l.name, { max: 60, ph: 'მაგ. თეთრი' })}<label class="afield"><span>ფერის ნიმუში</span><input type="color" class="acolor" data-b="spots|${i}.looks.${k}.hex" value="${esc(l.hex || '#ffffff')}"></label></div>
        ${imgPick(`spots|${i}.looks.${k}.img`, l.img, 'სურათი (გამჭვირვალე ფონით)')}
        <div class="afield"><span>პროდუქტი</span>${picker(`spots|${i}.looks.${k}.product`, l.product)}</div>
        ${field('ან ბმული', `spots|${i}.looks.${k}.url`, l.url, { ph: 'catalog.html?c=cooling', hint: 'თუ პროდუქტი არ არის არჩეული' })}</div>`).join('')}
      ${addBtn(`spots|${i}.looks`, 'ვარიანტის დამატება')}
      <h3 class="ah3">ფაქტები <small>სათაურის ქვეშ, ციფრებით</small></h3>
      ${(s.facts || []).map((f, k) => `<div class="arow"><div class="agrid agrid--3"><label class="afield"><span>სახე</span><select class="select" data-fact="${i}.${k}">${FACT.map(([v, n]) => `<option value="${v}" ${(f.auto || '') === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        ${f.auto ? '<p class="muted afact-auto">ითვლება სლაიდის პროდუქტებიდან</p>' : field('ციფრი', `spots|${i}.facts.${k}.b`, f.b, { max: 30, ph: 'A+++' }) + field('წარწერა', `spots|${i}.facts.${k}.t`, f.t, { max: 60, ph: 'გაგრილება' })}</div>${itemActs(`spots|${i}.facts`, k, s.facts.length)}</div>`).join('')}
      ${addBtn(`spots|${i}.facts`, 'ფაქტის დამატება')}
      <h3 class="ah3">ხაზის პროდუქტები <small>ავტომატური ფაქტებისთვის; ცარიელი: ვარიანტების პროდუქტები და მათი სიმძლავრეები</small></h3>
      ${picker(`spots|${i}.products`, null, true)}`, itemActs('spots|', i, list.length), s.on ? 'ჩართულია' : 'გამორთულია')).join('')}
    ${addBtn('spots|', 'სლაიდის დამატება')}
  </div><div class="asplit__r"><iframe class="aframe" title="მთავარი გვერდის გადახედვა" data-frame></iframe></div></div>`;
};
A.spots = body => frame(body, 'index.html', '[data-spot]');

R.brands = () => {
  const list = W('brands');
  const cat = [['', '— კატალოგში არ არის —'], ...(S.db ? S.db.brands.map(b => [b.id, b.name]) : [])];
  return `<div class="asplit"><div class="asplit__l">
    <p class="muted">„ზოლში“ მონიშნული ბრენდები მთავარ გვერდზე მოძრავ ზოლში ჩანს, ამ რიგით. კატალოგის ბრენდის ტექსტი ჩანს ბრენდის გვერდზე.</p>
    ${list.map((b, i) => card('brands|' + i, `${b.logo ? `<img class="aitem__logo" src="${esc(b.logo)}" alt="">` : ''}${esc(b.name || 'ბრენდი')}`, `
      <div class="agrid">${field('სახელი', `brands|${i}.name`, b.name, { max: 80 })}${select('კატალოგის ბრენდი', `brands|${i}.id`, b.id, cat)}</div>
      <div class="agrid">${imgPick(`brands|${i}.logo`, b.logo, 'ლოგო (ნათელ ფონზე)')}${imgPick(`brands|${i}.logoDark`, b.logoDark, 'ლოგო მუქ რეჟიმში (არასავალდებულო)')}</div>
      <div class="agrid">${toggle('მთავარი გვერდის ზოლში', `brands|${i}.strip`, b.strip)}${field('ვებგვერდი', `brands|${i}.site`, b.site, { type: 'url', ph: 'https://' })}</div>
      ${field('ტექსტი ბრენდის გვერდზე', `brands|${i}.text`, b.text, { area: true, max: 1500 })}`, itemActs('brands|', i, list.length), b.strip ? 'ზოლში' : '')).join('')}
    ${addBtn('brands|', 'ბრენდის დამატება')}
  </div><div class="asplit__r"><iframe class="aframe" title="მთავარი გვერდის გადახედვა" data-frame></iframe></div></div>`;
};
A.brands = body => frame(body, 'index.html', '#brands');

const PTYPES = { news: 'სიახლე', blog: 'ბლოგი', promo: 'აქცია' };
function postState(p) {
  if (!p.on) return ['დამალულია', 'off'];
  if ((p.date || '') > today()) return ['დაგეგმილია ' + p.date, 'soon'];
  if (p.type === 'promo' && p.to && p.to < today()) return ['დასრულდა', 'off'];
  return ['გამოქვეყნებულია', 'on'];
}
R.posts = () => {
  const list = W('posts');
  if (S.post != null && list[S.post]) return postEditor(list[S.post], S.post);
  S.post = null;
  const f = SS.get('mc.admin.ptype', '');
  const rows = list.map((p, i) => ({ p, i })).filter(({ p }) => !f || p.type === f);
  return `<div class="aform">
    <div class="apost-bar"><div class="atabs">${[['', 'ყველა'], ['news', 'სიახლეები'], ['blog', 'ბლოგი'], ['promo', 'აქციები']].map(([k, n]) => `<button class="atab ${f === k ? 'is-on' : ''}" data-act="ptype" data-type="${k}">${n} <small>${k ? list.filter(p => p.type === k).length : list.length}</small></button>`).join('')}</div>
      <button class="btn btn--red btn--sm" data-act="post-new">${ui('plus')}<span>ახალი ჩანაწერი</span></button></div>
    ${rows.length ? `<div class="aposts">${rows.map(({ p, i }) => { const [st, k] = postState(p); return `<button class="apost" data-act="post-open" data-i="${i}">
      <span class="apost__img">${p.cover ? `<img src="${esc(p.cover)}" alt="">` : ''}</span>
      <span class="apost__t"><b>${esc(p.title || 'უსათაურო')}</b><small>${PTYPES[p.type] || ''} · ${esc(p.date || '')}</small></span>
      <span class="apill apill--${k}">${esc(st)}</span></button>`; }).join('')}</div>`
      : '<div class="aempty"><p>ჯერ ჩანაწერი არ არის.</p><p class="muted">სიახლე, ბლოგის სტატია ან აქცია: აქცია მთავარ გვერდზეც გამოჩნდება, სანამ მოქმედებს.</p></div>'}
  </div>`;
};
function postEditor(p, i) {
  const b = k => `posts|${i}.${k}`;
  return `<div class="aform">
    <div class="apost-bar"><button class="btn btn--ghost btn--sm" data-act="post-back">${ui('left')}<span>ყველა ჩანაწერი</span></button>
      <span class="apost-bar__r"><button class="btn btn--ghost btn--sm" data-act="post-view" data-id="${esc(p.id)}">${ui('eye')}<span>ნახვა</span></button><button class="iconbtn" data-act="post-del" data-i="${i}" aria-label="წაშლა">${ui('trash')}</button></span></div>
    <section class="apanel"><div class="agrid agrid--3">
      ${select('სახე', b('type'), p.type, Object.entries(PTYPES))}
      ${field('თარიღი', b('date'), p.date, { type: 'date', hint: 'მომავალი თარიღი: გამოჩნდება იმ დღეს' })}
      <div class="afield">${toggle('გამოქვეყნებულია', b('on'), p.on)}${toggle('პირველი სიაში', b('pin'), p.pin)}</div></div>
      ${field('სათაური', b('title'), p.title, { max: 200 })}
      ${field('მოკლე აღწერა', b('excerpt'), p.excerpt, { area: true, rows: 2, max: 400, hint: 'ბარათზე და სათაურის ქვეშ' })}
      ${imgPick(b('cover'), p.cover, 'მთავარი სურათი')}
      ${p.type === 'promo' ? `<div class="agrid">${field('აქცია იწყება', b('from'), p.from, { type: 'date' })}${field('აქცია მთავრდება', b('to'), p.to, { type: 'date', hint: 'ბოლო დღის შემდეგ საიტიდან ქრება' })}</div>` : ''}
      <div class="afield"><span>ტექსტი</span>${rte(`data-rb="${b('body')}"`, p.body)}</div>
      <div class="agrid">${field('ღილაკის ბმული', b('link'), p.link, { ph: 'catalog.html?c=cooling ან https://', hint: 'არასავალდებულო' })}${field('ღილაკის წარწერა', b('linkText'), p.linkText, { max: 60, ph: 'ნახვა' })}</div>
    </section></div>`;
}

R.faq = () => {
  const list = W('faq');
  return `<div class="aform"><p class="muted">ჩანს მედია ცენტრში, „კითხვა-პასუხის“ ჩანართში, ამ რიგით.</p>
    ${list.map((f, i) => card('faq|' + i, esc(f.q || 'ახალი კითხვა'), `
      ${field('კითხვა', `faq|${i}.q`, f.q, { max: 300 })}
      ${field('პასუხი', `faq|${i}.a`, f.a, { area: true, rows: 4, max: 4000, hint: 'ახალი ხაზი = ახალი აბზაცი' })}
      ${toggle('ჩანს საიტზე', `faq|${i}.on`, f.on)}`, itemActs('faq|', i, list.length), f.on ? '' : 'დამალულია')).join('')}
    ${addBtn('faq|', 'კითხვის დამატება')}</div>`;
};

R.files = () => `<div class="aform">
  <label class="adrop" data-drop>${ui('download')}<b>ჩააგდეთ ფაილები აქ ან აირჩიეთ</b><small>JPG, PNG, WebP, GIF და PDF, 12 MB-მდე. დიდი ფოტოები ავტომატურად პატარავდება.</small><input type="file" multiple accept="image/*,application/pdf" hidden data-files-up></label>
  <div class="alib alib--page" data-files><p class="muted">იტვირთება…</p></div></div>`;
A.files = async body => {
  const box = $('[data-files]', body);
  const fill = async () => {
    try {
      const files = await srv.files();
      box.innerHTML = files.length ? files.map(f => `<div class="alib__f">${f.type === 'pdf' ? ui('download') : `<img src="${esc(f.url)}" alt="" loading="lazy">`}
        <small>${esc(String(f.name || f.url).split('/').pop().slice(0, 34))}</small><small class="muted">${kb(f.size)}${f.used ? ' · გამოყენებულია' : ''}</small>
        <span class="alib__acts">${/^data:/.test(f.url) ? '' : `<button type="button" class="iconbtn" data-act="copy" data-url="${esc(f.url)}" aria-label="ბმულის კოპირება">${ui('link')}</button>`}<button type="button" class="iconbtn" data-act="file-del" data-url="${esc(f.url)}" data-used="${f.used ? 1 : ''}" aria-label="წაშლა">${ui('trash')}</button></span></div>`).join('')
        : '<p class="muted">ჯერ არაფერია ატვირთული.</p>';
    } catch (e) { failed(e); }
  };
  const send = async files => {
    for (const file of files) {
      try { await upload(file); note(file.name + ': აიტვირთა', 'ok'); } catch (e) { failed(e); }
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

R.history = () => `<div class="aform"><p class="muted">ყოველი შენახვა აქ რჩება: ვინ, როდის, რომელი განყოფილება. „აღდგენა“ იმ მომენტის ვერსიას აბრუნებს (როგორც ახალ შენახვას).</p><div data-hist><p class="muted">იტვირთება…</p></div></div>`;
A.history = async body => {
  try {
    const h = await srv.history();
    $('[data-hist]', body).innerHTML = h.length ? `<div class="ahist">${h.map(x => `<div class="ahist__r"><span><b>${esc(SECTIONS[x.section] || x.section)}</b><small>${esc(x.note || '')}</small></span><span>${esc(x.name || x.by)}</span><small>${esc(when(x.at))}</small>
      <span class="ahist__acts"><button class="btn btn--ghost btn--sm" data-act="ver" data-id="${esc(x.id)}">ნახვა</button><button class="btn btn--ghost btn--sm" data-act="restore" data-id="${esc(x.id)}" data-sec="${esc(x.section)}">აღდგენა</button></span></div>`).join('')}</div>`
      : '<p class="muted">ჯერ არაფერი შენახულა.</p>';
  } catch (e) { failed(e); }
};
/** A saved version, readable: lists by their names, the rest as label: value. */
function summary(sec, v) {
  if (Array.isArray(v)) return `<ol class="asum">${v.map(x => `<li>${esc(x.name || x.title || x.q || [x.year, x.text].filter(Boolean).join(' · ') || JSON.stringify(x).slice(0, 80))}${x.on === false ? ' <small class="muted">(გამორთული)</small>' : ''}</li>`).join('')}</ol>`;
  if (v && typeof v === 'object') return `<dl class="asum">${Object.entries(v).map(([k, x]) => `<dt>${esc(k)}</dt><dd>${esc(typeof x === 'object' ? Object.entries(x || {}).filter(([, y]) => y).map(([a, y]) => a + ': ' + y).join(', ') : String(x).replace(/<[^>]+>/g, ' ').slice(0, 300))}</dd>`).join('')}</dl>`;
  return '<p class="muted">ცარიელია</p>';
}

R.users = () => `<div class="aform"><section class="apanel"><h2 class="ah2">ადამიანები</h2><div data-users><p class="muted">იტვირთება…</p></div></section>
  <section class="apanel"><h2 class="ah2">ახალი მომხმარებელი</h2><form class="agrid" data-newuser>
    <label class="afield"><span>სახელი და გვარი</span><input class="input" name="name" required maxlength="80"></label>
    <label class="afield"><span>შესვლის სახელი <small>ლათინურად, მაგ. irina</small></span><input class="input" name="login" required pattern="[A-Za-z0-9][A-Za-z0-9._\\-]{1,31}" autocomplete="off"></label>
    <label class="afield"><span>პაროლი <small>8+ სიმბოლო</small></span><input class="input" name="password" type="password" minlength="8" required autocomplete="new-password"></label>
    <label class="afield"><span>როლი</span><select class="select" name="role"><option value="editor">რედაქტორი: ცვლის შიგთავსს</option><option value="owner">მფლობელი: ასევე მართავს მომხმარებლებს</option></select></label>
    <div><button class="btn btn--sm">${ui('plus')}<span>დამატება</span></button></div></form></section></div>`;
A.users = async body => {
  try {
    const users = await srv.users();
    $('[data-users]', body).innerHTML = `<div class="ahist">${users.map(u => `<div class="ahist__r"><span><b>${esc(u.name)}</b><small>${esc(u.login)}</small></span><span>${ROLE[u.role] || u.role}${u.on ? '' : ' · <span class="apill apill--off">გამორთულია</span>'}</span><small>${u.seen ? 'ბოლოს: ' + esc(when(u.seen)) : ''}</small>
      <span class="ahist__acts"><button class="btn btn--ghost btn--sm" data-act="user-edit" data-login="${esc(u.login)}" data-name="${esc(u.name)}" data-role="${esc(u.role)}" data-on="${u.on ? 1 : ''}">შეცვლა</button>${u.login === S.user.login ? '' : `<button class="iconbtn" data-act="user-del" data-login="${esc(u.login)}" aria-label="წაშლა">${ui('trash')}</button>`}</span></div>`).join('')}</div>`;
  } catch (e) { failed(e); }
  $('[data-newuser]', body).addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    try { await srv.userSave({ ...d, on: true }); note('მომხმარებელი დაემატა', 'ok'); render(); } catch (err) { failed(err); }
  });
};

/* Bitrix: does this server reach the portal with the webhook of api/config.php, and the numbers config.php
   asks for (pipelines and stages, users, sources, warehouses, catalogs, price types). Owners only. */
R.bitrix = () => `<div class="aform">
  <div class="ainfo">${ui('link')}<div><b>Bitrix-თან კავშირი</b><p>აქ ჩანს, უკავშირდება თუ არა ეს სერვერი პორტალს <code>api/config.php</code>-ის webhook-ით, და ნომრები, რომლებიც config.php-ში იწერება. ნომერზე დაჭერა მას აკოპირებს.</p></div></div>
  ${LIVE ? `<div><button class="btn btn--sm" data-bx-run>${ui('check')}<span>შემოწმება</span></button></div><div class="aform" data-bx><p class="muted">Bitrix-ს ვეკითხები…</p></div>`
    : `<p class="muted">სატესტო რეჟიმში ეს არ მოწმდება: კავშირი სერვერზე ჩანს, როცა <code>assets/js/config.js</code>-ში <code>mode: 'bitrix'</code> დგას.</p>`}
</div>`;
A.bitrix = body => {
  if (!LIVE) return;
  const box = $('[data-bx]', body), run = $('[data-bx-run]', body);
  const check = async () => {
    run.disabled = true;
    box.innerHTML = '<p class="muted">Bitrix-ს ვეკითხები…</p>';
    try { box.innerHTML = bxView(await srv.bitrix()); } catch (e) { box.innerHTML = ''; failed(e); }
    run.disabled = false;
    $('span', run).textContent = 'ხელახლა შემოწმება';
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
  empty: ['არ არის დაყენებული', 'api/config.php-ში webhook ცარიელია. პორტალზე: Developer resources → Other → Inbound webhook, უფლებები crm, user და catalog; მისამართი ჩასვით config.php-ის webhook-ში.'],
  net: ['კავშირი ვერ დამყარდა', 'სერვერი პორტალს ვერ უკავშირდება. შეამოწმეთ მისამართი config.php-ში და რომ პორტალი ამ სერვერიდან ხელმისაწვდომია.'],
  auth: ['webhook არ მიიღო', 'პორტალი პასუხობს, მაგრამ webhook-ს არ იღებს: ის წაშლილია ან არასწორად არის ჩასმული (ბოლო „/“-ის ჩათვლით).'],
  other: ['შეცდომა', 'პორტალმა შეცდომა დააბრუნა.']
};
const BX_SCOPE = { crm: 'crm', user: 'user', catalog: 'catalog' };
function bxView(b) {
  const k = b.config;
  const L = name => (b.lists || {})[name] || {};
  const rows = name => L(name).rows || null;
  const id = v => `<button type="button" class="abx__id" data-act="copy-id" data-v="${esc(v)}" title="კოპირება">${esc(v)}</button>`;
  const here = on => (on ? '<span class="apill apill--on">config.php</span>' : '');
  const row = (v, name, small, cur, extra = '') => `<div class="abx__r ${cur ? 'is-cur' : ''}">${id(v)}<span><b>${esc(name || '—')}</b>${small ? `<small>${esc(small)}</small>` : ''}</span>${extra}${here(cur)}</div>`;
  const err = name => {
    const l = L(name);
    if (!l.error) return '';
    return /insufficient_scope|access_denied|access denied/i.test(l.error)
      ? `<p class="abx__err">webhook-ს „${BX_SCOPE[l.scope] || l.scope}“ უფლება არ აქვს: პორტალზე webhook-ს დაუმატეთ და ხელახლა შეამოწმეთ.</p>`
      : `<p class="abx__err">ვერ წავიკითხე: ${esc(l.error)}</p>`;
  };
  const panel = (title, keys, inner) => `<section class="apanel"><h2 class="ah2">${title}</h2>${keys ? `<p class="muted abx__keys">config.php: ${keys.map(x => `<code>${x}</code>`).join(', ')}</p>` : ''}${inner}</section>`;

  if (!b.ok) {
    const [t, p] = BX_STATE[b.kind] || BX_STATE.other;
    return `<section class="apanel abx__state"><span class="apill apill--bad">${t}</span><p>${p}</p>${b.host ? `<small class="muted">${esc(b.host)}</small>` : ''}${b.error ? `<small class="abx__msg">${esc(b.error)}</small>` : ''}</section>`;
  }

  // what config.php says that the portal does not have
  const warn = [];
  const pipes = rows('pipelines'), users = rows('users'), srcs = rows('sources'), stores = rows('stores'), cats = rows('catalogs'), prices = rows('prices');
  if (pipes) {
    const p = pipes.find(x => x.id === k.deal_category_id);
    if (!p) warn.push(`deal_category_id ${k.deal_category_id}: ასეთი ვორონკა პორტალზე არ არის`);
    else if (!p.stages.some(s => s.id === k.deal_stage_id)) warn.push(`deal_stage_id '${k.deal_stage_id}': „${p.name}“ ვორონკაში ასეთი ეტაპი არ არის`);
    k.deal_categories.filter(c => !pipes.some(x => x.id === c)).forEach(c => warn.push(`account.deal_categories ${c}: ასეთი ვორონკა არ არის`));
  }
  if (users && !users.some(u => u.id === k.assigned_id)) warn.push(`assigned_id ${k.assigned_id}: ასეთი აქტიური მომხმარებელი არ არის`);
  if (srcs && !srcs.some(s => s.id === k.source_id)) warn.push(`source_id '${k.source_id}': ასეთი წყარო არ არის`);
  if (stores) {
    if (!k.store_ids.length) warn.push('store_ids ცარიელია: მარაგში ყველა საწყობი ითვლება, ანდეს საწყობებიც');
    k.store_ids.filter(s => !stores.some(x => x.id === s)).forEach(s => warn.push(`store_ids ${s}: ასეთი საწყობი არ არის`));
  }
  if (k.catalog && cats && !cats.some(c => c.id === k.iblock_id)) warn.push(`iblock_id ${k.iblock_id}: ასეთი კატალოგი არ არის`);
  if (k.catalog && prices && !prices.some(p => p.id === k.price_type_id)) warn.push(`price_type_id ${k.price_type_id}: ასეთი ფასის ტიპი არ არის`);

  const who = b.who && b.who.name ? `webhook: ${b.who.name} (ID ${b.who.id})${b.who.admin ? ', ადმინისტრატორი' : ''}` : '';
  return `<section class="apanel abx__state"><span class="apill apill--on">დაკავშირებულია</span><p><b>${esc(b.host)}</b> · პასუხი ${b.ms} მწმ-ში</p>${who ? `<small class="muted">${esc(who)}</small>` : ''}</section>
    ${warn.length ? `<section class="apanel abx__warn"><h2 class="ah2">config.php-ში შესასწორებელი</h2><ul>${warn.map(w => `<li>${esc(w)}</li>`).join('')}</ul></section>`
      : '<p class="abx__fine">config.php-ის ნომრები პორტალს ემთხვევა.</p>'}
    ${panel('ვორონკები და ეტაპები', ['deal_category_id', 'deal_stage_id', "account['deal_categories']"], err('pipelines') + (pipes ? '<div class="abx__list">' + pipes.map(p => {
      const cur = p.id === k.deal_category_id;
      return `<details class="abx__pipe" ${cur ? 'open' : ''}><summary>${row(p.id, p.name, `${p.stages.length} ეტაპი`, cur, k.deal_categories.includes(p.id) ? '<span class="apill apill--soon">ჩემი შეკვეთები</span>' : '')}</summary>
        <div class="abx__list abx__list--in">${p.stages.map(s => row(s.id, s.name, '', cur && s.id === k.deal_stage_id, s.end ? `<span class="apill apill--off">${s.end === 'won' ? 'წარმატებული' : 'წარუმატებელი'}</span>` : '')).join('') || '<p class="muted">ეტაპები ვერ მოიძებნა</p>'}</div></details>`;
    }).join('') + '</div>' : ''))}
    ${panel('მომხმარებლები', ['assigned_id'], err('users') + (users ? `<input class="input abx__find" data-bx-find placeholder="ძებნა სახელით, თანამდებობით ან ნომრით" aria-label="მომხმარებლის ძებნა">
      <div class="abx__list abx__list--tall" data-bx-users>${users.map(u => row(u.id, u.name, u.job, u.id === k.assigned_id)).join('')}</div>` : ''))}
    ${panel('საწყობები', ["catalog['store_ids']"], err('stores') + (stores ? `<div class="abx__list">${stores.map(s => row(s.id, s.name, s.address, k.store_ids.includes(s.id), s.on ? '' : '<span class="apill apill--off">გამორთულია</span>')).join('') || '<p class="muted">საწყობები არ არის</p>'}</div>` : ''))}
    ${panel('წყაროები', ['source_id'], err('sources') + (srcs ? `<div class="abx__list">${srcs.map(s => row(s.id, s.name, '', s.id === k.source_id)).join('')}</div>` : ''))}
    ${panel('კატალოგი და ფასის ტიპები', ["catalog['iblock_id']", "catalog['price_type_id']"], `<p class="muted">საჭიროა მხოლოდ მაშინ, როცა პროდუქცია Bitrix-იდან მოვა (catalog.enabled).</p>` + err('catalogs') +
      (cats ? `<div class="abx__list">${cats.map(c => row(c.id, c.name, 'კატალოგი', c.id === k.iblock_id)).join('')}</div>` : '') + err('prices') +
      (prices ? `<div class="abx__list">${prices.map(p => row(p.id, p.name, p.base ? 'საბაზო ფასი' : 'ფასის ტიპი', p.id === k.price_type_id)).join('')}</div>` : ''))}`;
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
        const mine = await ask(`„${SECTIONS[sec]}“ სხვამ შეცვალა, სანამ თქვენ არედაქტირებდით. შევინახო თქვენი ვერსია მის ნაცვლად?`, 'ჩემი ვერსიის შენახვა', true);
        if (!mine) { S.c = theirs; delete S.w[sec]; S.dirty.delete(sec); note('ჩაიტვირთა მათი ვერსია'); continue; }
        S.c = await srv.save(sec, W(sec), (theirs.revs || {})[sec] || 0);
      }
      delete S.w[sec];
      S.dirty.delete(sec);
    }
    note('შენახულია: საიტზე უკვე ჩანს', 'ok');
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
      if (!await ask('წავშალო?', 'წაშლა', true)) break;
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
      if (!await ask('ჩანაწერს წავშლი. დარწმუნებული ხართ?', 'წაშლა', true)) break;
      W('posts').splice(+a.dataset.i, 1);
      S.post = null;
      touch('posts');
      render();
      break;
    case 'copy':
      try { await navigator.clipboard.writeText(new URL(a.dataset.url, location.href).href); note('ბმული დაკოპირდა', 'ok'); } catch (err) { prompt('ბმული:', new URL(a.dataset.url, location.href).href); }
      break;
    case 'copy-id':
      e.preventDefault();   // in a pipeline's summary: copy, don't fold
      try { await navigator.clipboard.writeText(a.dataset.v); note('დაკოპირდა: ' + a.dataset.v, 'ok'); } catch (err) { prompt('ნომერი:', a.dataset.v); }
      break;
    case 'file-del': {
      if (!await ask(a.dataset.used ? 'ეს ფაილი საიტზე გამოიყენება. მაინც წავშალო?' : 'ფაილს წავშლი. დარწმუნებული ხართ?', 'წაშლა', true)) break;
      try { await srv.deleteFile(a.dataset.url, !!a.dataset.used); note('წაიშალა', 'ok'); $('[data-body]').filesReload(); } catch (err) { failed(err); }
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
      if (S.dirty.has(sec) && !await ask(`„${SECTIONS[sec]}“-ში შეუნახავი ცვლილებებია: აღდგენა მათ წაშლის.`, 'აღდგენა', true)) break;
      if (!S.dirty.has(sec) && !await ask('ამ ვერსიას დავაბრუნებ (როგორც ახალ შენახვას).', 'აღდგენა')) break;
      try { S.c = await srv.restore(a.dataset.id); delete S.w[sec]; S.dirty.delete(sec); draftNow(); note('აღდგა', 'ok'); render(); } catch (err) { failed(err); }
      break;
    }
    case 'user-edit': userEdit(a.dataset); break;
    case 'user-del':
      if (!await ask(`${a.dataset.login}: წავშალო მომხმარებელი?`, 'წაშლა', true)) break;
      try { await srv.userDelete(a.dataset.login); note('წაიშალა', 'ok'); render(); } catch (err) { failed(err); }
      break;
    case 'me': myPassword(); break;
    case 'logout':
      if (S.dirty.size && !await ask('შეუნახავი ცვლილებები დაიკარგება. გავიდე?', 'გასვლა', true)) break;
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
    menu.innerHTML = found.map(p => `<button type="button" class="pp__opt" data-pick="${p.id}">${prodLine(p.id)}</button>`).join('') || (input.value.trim() ? '<p class="muted">ვერ მოიძებნა</p>' : '');
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
    <label class="afield"><span>სახელი და გვარი</span><input class="input" name="name" value="${esc(d.name)}" maxlength="80"></label>
    <label class="afield"><span>როლი</span><select class="select" name="role"><option value="editor" ${d.role === 'editor' ? 'selected' : ''}>რედაქტორი</option><option value="owner" ${d.role === 'owner' ? 'selected' : ''}>მფლობელი</option></select></label>
    <label class="afield"><span>ახალი პაროლი <small>ცარიელი: არ იცვლება</small></span><input class="input" name="password" type="password" minlength="8" autocomplete="new-password"></label>
    ${toggle('შესვლა ნებადართულია', 'x|on', !!d.on).replace('data-b="x|on"', 'name="on"')}
    <div class="amodal__acts"><button type="button" class="btn btn--ghost btn--sm" data-x>გაუქმება</button><button class="btn btn--sm">შენახვა</button></div></form>`);
  $('[data-uedit]', m.el).addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    try {
      await srv.userSave({ existing: true, login: d.login, name: f.name.value, role: f.role.value, password: f.password.value, on: f.on.checked });
      m.close(); note('შენახულია', 'ok'); render();
    } catch (err) { failed(err); }
  });
}
function myPassword() {
  const m = modal(`<h2 class="h3">ჩემი პაროლი</h2><p class="muted">${esc(S.user.name)} · ${esc(S.user.login)}</p><form class="form-stack" data-pw style="margin-top:16px">
    <label class="afield"><span>ამჟამინდელი პაროლი</span><input class="input" name="old" type="password" required autocomplete="current-password"></label>
    <label class="afield"><span>ახალი პაროლი <small>8+ სიმბოლო</small></span><input class="input" name="new" type="password" minlength="8" required autocomplete="new-password"></label>
    <label class="afield"><span>გაიმეორეთ</span><input class="input" name="again" type="password" minlength="8" required autocomplete="new-password"></label>
    <div class="amodal__acts"><button type="button" class="btn btn--ghost btn--sm" data-x>გაუქმება</button><button class="btn btn--sm">შეცვლა</button></div></form>`);
  $('[data-pw]', m.el).addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    if (f.new.value !== f.again.value) { note('ახალი პაროლები ერთმანეთს არ ემთხვევა', 'bad'); return; }
    try { await srv.password({ old: f.old.value, new: f.new.value }); m.close(); note('პაროლი შეიცვალა', 'ok'); } catch (err) { failed(err); }
  });
}

/* ---------- signing in ---------- */
function signIn(setup = false) {
  $('#adm').innerHTML = `<div class="alogin"><div class="alogin__box">
    <img class="only-l" src="assets/brand/logo/mc-logo-primary.svg" alt="Max Comfort" width="120" height="61"><img class="only-d" src="assets/brand/logo/mc-logo-white.svg" alt="" width="120" height="61">
    <h1 class="h2">${setup ? 'პირველი მფლობელი' : 'მართვის პანელი'}</h1>
    <p class="muted">${setup ? 'ერთხელ: შექმენით მფლობელის ანგარიში. გასაღები (setup_key) არის სერვერის api/config.php-ში.' : LIVE ? 'შედით თქვენი სახელით და პაროლით.' : 'სატესტო რეჟიმი: ჩაწერეთ ნებისმიერი სახელი. ცვლილებები მხოლოდ ამ ბრაუზერში ინახება.'}</p>
    <form class="form-stack" data-login novalidate>
      ${setup ? '<label class="afield"><span>გასაღები (setup_key)</span><input class="input" name="key" type="password" required autocomplete="off"></label><label class="afield"><span>სახელი და გვარი</span><input class="input" name="name" required maxlength="80"></label>' : ''}
      <label class="afield"><span>შესვლის სახელი</span><input class="input" name="login" required autocomplete="username" ${setup ? 'placeholder="ლათინურად, მაგ. irina"' : ''}></label>
      ${LIVE || setup ? `<label class="afield"><span>პაროლი${setup ? ' <small>8+ სიმბოლო</small>' : ''}</span><input class="input" name="password" type="password" required autocomplete="${setup ? 'new-password' : 'current-password'}"></label>` : ''}
      <button class="btn btn--red btn--block">${setup ? 'შექმნა და შესვლა' : 'შესვლა'}</button>
      <p class="alogin__err" data-err hidden></p>
    </form>
    <a class="link" href="index.html">საიტზე დაბრუნება</a>
  </div></div>`;
  $('[data-login]').addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const err = $('[data-err]');
    if (!String(d.login || '').trim()) { err.hidden = false; err.textContent = 'ჩაწერეთ შესვლის სახელი'; return; }
    e.target.querySelector('button').classList.add('is-busy');
    try {
      const r = setup ? await srv.setup(d) : await srv.login({ login: d.login.trim(), password: d.password || '' });
      S.user = r.user;
      await start();
    } catch (x) {
      err.hidden = false;
      err.textContent = x.code === 'login' ? 'სახელი ან პაროლი არასწორია' : x.code === 'locked' ? 'ბევრი არასწორი მცდელობა: სცადეთ 15 წუთში' : x.code === 'setup-key' && x.status === 403 ? 'გასაღები არასწორია' : x.message;
      e.target.querySelector('button').classList.remove('is-busy');
    }
  });
}

async function start() {
  [S.c, S.db] = await Promise.all([srv.content(), catalog().catch(() => null)]);
  S.c.revs = S.c.revs && !Array.isArray(S.c.revs) ? S.c.revs : {};
  shell();
  go(location.hash.slice(1) || 'home');
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
addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && S.user) { e.preventDefault(); save(); } });
addEventListener('beforeunload', e => { if (S.dirty.size) { e.preventDefault(); e.returnValue = ''; } });

(async () => {
  try {
    const st = await srv.state();
    if (st.user) { S.user = st.user; await start(); } else signIn(!!st.setup);
  } catch (err) {
    console.error(err);
    root.innerHTML = `<div class="alogin"><div class="alogin__box"><h1 class="h2">მართვის პანელი</h1><p>${esc(err.code === 'network' ? 'სერვერთან კავშირი ვერ დამყარდა.' : err.message)}</p><p class="muted">სერვერზე საჭიროა api/config.php (იხ. README).</p></div></div>`;
  }
})();
