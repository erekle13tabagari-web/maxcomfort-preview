/* Data and Bitrix connection. Every page reads the catalog and sends orders and requests
   through this file only; MC_CONFIG.mode decides where they go (see config.js). */
const C = window.MC_CONFIG;
const IMG = 'assets/img/products/';
let loading = null;

/** Catalog with lookups: { categories, brands, products, byId, cats, subs, brandsById, groups, series } */
export function catalog() {
  if (!loading) {
    const live = C.mode === 'bitrix';
    loading = getJSON(live ? C.api + 'catalog.php' : C.catalog)
      .catch(err => {
        if (!live) throw err;
        console.warn('Bitrix catalog unavailable, using the local copy', err);
        return getJSON(C.catalog);
      })
      .then(index);
  }
  return loading;
}

/** Order from the checkout. Bitrix: a deal with its product rows and the contact (api/order.php). */
export function order(data) {
  return send('order.php', data);
}

/** Callback, consultation or price request. Bitrix: a lead (api/lead.php). */
export function lead(data) {
  return send('lead.php', data);
}

/* ---------- customer account ----------
   The phone number is the account: it is confirmed with a 4-digit SMS code, and a Google, Facebook or
   Apple sign-in is always tied to a confirmed number (the manager calls it about orders).
   static: the account lives in this browser and the code is shown on screen (preview).
   bitrix: api/account.php (SMS gateway, provider checks, the CRM contact and its deals). */
const LS = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (e) { return d; } },
  set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
};
const SS = {
  get(k, d) { try { const v = JSON.parse(sessionStorage.getItem(k)); return v ?? d; } catch (e) { return d; } },
  set(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } }
};
/** +995XXXXXXXXX, or '' when it is not a Georgian number. */
export function phoneE164(v) {
  let d = String(v || '').replace(/\D+/g, '');
  if (d.length === 12 && d.startsWith('995')) d = d.slice(3);
  if (d.length === 10 && d[0] === '0') d = d.slice(1);
  return d.length === 9 ? '+995' + d : '';
}
/** +995 555 12 34 56 */
export const phoneNice = v => { const d = phoneE164(v).slice(4); return d ? `+995 ${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7)}` : String(v || ''); };
export const initials = name => String(name || '').trim().split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const PROVIDERS = ['google', 'facebook', 'apple'];

/** Who is signed in, as far as this browser knows (header, drawer). The account page asks the server. */
function hint(user) {
  LS.set('mc.signed', user ? { i: initials(user.name), name: user.name || '' } : null);
  dispatchEvent(new CustomEvent('mc:account'));
}

/* preview: accounts by phone in this browser */
const local = {
  users: () => LS.get('mc.users', {}),
  put(u) { const all = local.users(); all[u.phone] = u; LS.set('mc.users', all); return u; },
  me: () => { const ph = LS.get('mc.account', null); return ph ? local.users()[ph] || null : null; },
  wait: ms => new Promise(r => setTimeout(r, ms))
};

async function call(action, data = {}) {
  const res = await fetch(C.api + 'account.php', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: JSON.stringify({ action, ...data })
  });
  let json = null;
  try { json = await res.json(); } catch (e) { /* not JSON */ }
  if (!res.ok || !json || !json.ok) {
    const err = new Error((json && json.error) || 'HTTP ' + res.status);
    err.code = json && json.code;
    err.wait = json && json.wait;
    throw err;
  }
  return json;
}
const fail = code => { const e = new Error(code); e.code = code; return e; };

export const account = {
  live: () => C.mode === 'bitrix',
  hint: () => LS.get('mc.signed', null),
  /** Sign-in buttons to show: the configured ones; all three in the preview. */
  providers: () => PROVIDERS.filter(p => C.mode !== 'bitrix' || (C.auth && C.auth[p])),

  async me() {
    const u = this.live() ? (await call('me')).user : local.me();
    hint(u);
    return u;
  },

  /** Send the code. {wait: seconds before another one; demoCode in the preview} */
  async sendCode(phone) {
    const ph = phoneE164(phone);
    if (!ph) throw fail('phone');
    if (this.live()) return call('code', { phone: ph });
    await local.wait(500);
    const last = SS.get('mc.code', null);
    if (last && last.phone === ph && Date.now() - last.at < 30000) return { ok: true, wait: Math.ceil((30000 - (Date.now() - last.at)) / 1000), demoCode: last.code };
    const code = String(Math.floor(1000 + Math.random() * 9000));
    SS.set('mc.code', { phone: ph, code, at: Date.now(), tries: 0 });
    return { ok: true, wait: 30, demoCode: code };
  },

  /** Check the code: signs in (or creates the account) and links a pending Google/Facebook/Apple sign-in. */
  async verify(phone, code) {
    const ph = phoneE164(phone);
    if (this.live()) {
      const r = await call('verify', { phone: ph, code });
      SS.set('mc.social', null);
      hint(r.user);
      return r;
    }
    await local.wait(400);
    const c = SS.get('mc.code', null);
    if (!c || c.phone !== ph) throw fail('expired');
    if (c.code !== String(code)) {
      c.tries++;
      SS.set('mc.code', c.tries >= 5 ? null : c);
      throw fail(c.tries >= 5 ? 'expired' : 'wrong');
    }
    SS.set('mc.code', null);
    let u = local.users()[ph];
    if (!u) u = { phone: ph, name: '', email: '', news: false, addresses: [], social: {}, created: new Date().toISOString() };
    const pend = SS.get('mc.social', null);
    if (pend) {
      u.social = { ...u.social, [pend.provider]: { email: pend.email || '', since: new Date().toISOString() } };
      if (!u.name && pend.name) u.name = pend.name;
      if (!u.email && pend.email) u.email = pend.email;
      SS.set('mc.social', null);
    }
    local.put(u);
    LS.set('mc.account', ph);
    hint(u);
    return { ok: true, user: u, isNew: !u.name };
  },

  /** Provider sign-in: {user} when it is linked to an account, {needPhone, profile} when a number must be confirmed first. */
  async social(provider, token, extra = {}) {
    if (this.live()) {
      const r = await call('social', { provider, token, ...extra });
      if (r.user) hint(r.user);
      SS.set('mc.social', r.needPhone ? r.profile : null);
      return r;
    }
    await local.wait(400);
    const me = local.me();
    if (me) {   // linking from the profile
      me.social = { ...me.social, [provider]: { email: '', since: new Date().toISOString() } };
      local.put(me);
      return { ok: true, user: me };
    }
    const linked = Object.values(local.users()).find(u => u.social && u.social[provider]);
    if (linked) { LS.set('mc.account', linked.phone); hint(linked); return { ok: true, user: linked }; }
    SS.set('mc.social', { provider, name: extra.name || '', email: '' });
    return { ok: true, needPhone: true, profile: { provider, name: extra.name || '', email: '' } };
  },
  pendingSocial: () => SS.get('mc.social', null),
  cancelSocial() { SS.set('mc.social', null); if (this.live()) call('cancel').catch(() => {}); },

  /** Save profile fields and addresses. */
  async save(patch) {
    if (this.live()) {
      const r = await call('save', patch);
      hint(r.user);
      return r.user;
    }
    await local.wait(350);
    const u = local.me();
    if (!u) throw fail('signed-out');
    Object.assign(u, patch);
    local.put(u);
    hint(u);
    return u;
  },

  async unlink(provider) {
    if (this.live()) return (await call('unlink', { provider })).user;
    const u = local.me();
    delete u.social[provider];
    return local.put(u);
  },

  /** Orders of this phone number: its Bitrix deals; in the preview the orders sent from this browser. */
  async orders() {
    if (this.live()) return (await call('orders')).orders;
    const u = local.me();
    return u ? LS.get('mc.orders', []).filter(o => o.phone === u.phone) : [];
  },

  /** The checkout calls this once an order is accepted (preview history; in Bitrix the deal is the history). */
  remember(res, data) {
    if (this.live()) return;
    const list = LS.get('mc.orders', []);
    list.unshift({
      id: res.id, date: new Date().toISOString(), phone: phoneE164(data.customer.phone), status: 'new', stage: 'მიღებულია',
      total: data.total, delivery: data.delivery.method, payment: data.payment,
      items: data.items.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price }))
    });
    LS.set('mc.orders', list.slice(0, 50));
  },

  /** Delete the account: profile, addresses, linked sign-ins. Orders stay with the company (CRM deals). */
  async remove() {
    if (this.live()) await call('delete');
    else {
      const ph = LS.get('mc.account', null), all = local.users();
      delete all[ph];
      LS.set('mc.users', all);
      LS.set('mc.orders', LS.get('mc.orders', []).filter(o => o.phone !== ph));
    }
    LS.set('mc.account', null);
    SS.set('mc.social', null);
    hint(null);
  },

  async logout() {
    if (this.live()) await call('logout').catch(() => {});
    LS.set('mc.account', null);
    SS.set('mc.social', null);
    hint(null);
  }
};

async function send(endpoint, data) {
  const body = { ...data, page: location.href, utm: utm(), sentAt: new Date().toISOString() };
  if (C.mode !== 'bitrix') {
    // preview: nothing leaves the browser
    await new Promise(r => setTimeout(r, 900));
    console.info('[preview] would send to Bitrix (' + endpoint + ')', body);
    return { ok: true, id: 'MC-' + String(Date.now()).slice(-6), preview: true };
  }
  const res = await fetch(C.api + endpoint, {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: JSON.stringify(body)
  });
  let json = null;
  try { json = await res.json(); } catch (e) { /* not JSON */ }
  if (!res.ok || !json || !json.ok) throw new Error((json && json.error) || 'HTTP ' + res.status);
  return json;
}

function utm() {
  try {
    const q = new URLSearchParams(location.search), keep = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(k => {
      if (q.get(k)) sessionStorage.setItem('mc.' + k, q.get(k));
      const v = sessionStorage.getItem('mc.' + k);
      if (v) keep[k] = v;
    });
    return keep;
  } catch (e) { return {}; }
}

async function getJSON(url) {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(url + ': HTTP ' + res.status);
  return res.json();
}

const norm = s => String(s || '').toLowerCase().replace(/[-_/.,()"„“]+/g, ' ').replace(/\s+/g, ' ').trim();
export { norm };

function index(data) {
  const cats = new Map(), subs = new Map(), brandsById = new Map(), byId = new Map(), groups = new Map(), series = new Map();
  data.categories.forEach(c => {
    cats.set(c.id, c);
    c.subs.forEach(s => { s.cat = c.id; subs.set(s.id, s); });
  });
  data.brands.forEach(b => brandsById.set(b.id, b));
  data.products.forEach(p => {
    p.url = 'product.html?id=' + p.id;
    p.src = p.imgs.map(f => /^(https?:|\/)/.test(f) ? f : IMG + f);
    p.brandName = (brandsById.get(p.brand) || {}).name || '';
    const sub = subs.get(p.sub), cat = cats.get(p.cat);
    p.subName = sub ? sub.name : '';
    p.catName = cat ? cat.name : '';
    p.spec = Object.fromEntries(p.specs);
    p.q = norm([p.title, p.name, p.sku, p.brandName, p.brand, p.subName, p.catName, p.type, p.line].join(' '));
    byId.set(p.id, p);
    if (p.group) (groups.get(p.group) || groups.set(p.group, []).get(p.group)).push(p);
    if (p.series) (series.get(p.series) || series.set(p.series, []).get(p.series)).push(p);
  });
  series.forEach(list => list.sort((a, b) => a.sizeSort - b.sizeSort));
  return { ...data, cats, subs, brandsById, byId, groups, series };
}
