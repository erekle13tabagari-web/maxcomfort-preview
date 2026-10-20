/* Account: sign in with the phone number (4-digit SMS code) or Google / Facebook / Apple, then the
   dashboard: overview, orders, favourites, addresses and profile. Every account has a confirmed
   phone number: a Google, Facebook or Apple sign-in only completes after the number is confirmed. */
import { boot, $, $$, C, esc, ui, bi, arrow, card, money, crumbs, store, toast, validate, callback, openLayer, closeLayers } from './core.js';
import { account, phoneE164, phoneNice, initials } from './api.js';

let db, user = null, orders = null;
let step = 'phone', phone = '', demo = '', timer = 0;
const A = C.auth || {};
const NAMES = { google: 'Google', facebook: 'Facebook', apple: 'Apple' };
const LOGO = {
  google: '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>',
  apple: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.37-3.66zM14.1 5.86c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.66 1.37-.58.67-1.09 1.75-.96 2.79 1.02.08 2.05-.52 2.68-1.27z"/></svg>'
};
const mobile = v => { const p = phoneE164(v); return p && p[4] === '5' ? p : ''; };
const MONTHS = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];
const shortDate = iso => { const d = new Date(iso); return isNaN(d) ? String(iso || '').slice(0, 10) : `${d.getDate()} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`; };   // browsers often lack ka-GE

/* ---------- Google / Facebook / Apple: their own scripts, loaded only when the ID is set (config.js auth) ---------- */
const script = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = res; s.onerror = () => rej(new Error('sdk')); document.head.appendChild(s); });
const SDK = {
  google: {
    src: 'https://accounts.google.com/gsi/client',
    run: () => new Promise((res, rej) => window.google.accounts.oauth2.initTokenClient({
      client_id: A.google, scope: 'openid email profile',
      callback: r => (r && r.access_token ? res({ token: r.access_token }) : rej(new Error('cancelled'))),
      error_callback: () => rej(new Error('cancelled'))
    }).requestAccessToken())
  },
  facebook: {
    src: 'https://connect.facebook.net/en_US/sdk.js',
    init: () => window.FB.init({ appId: A.facebook, version: 'v21.0', xfbml: false, cookie: false }),
    run: () => new Promise((res, rej) => window.FB.login(r => (r.authResponse ? res({ token: r.authResponse.accessToken }) : rej(new Error('cancelled'))), { scope: 'public_profile,email' }))
  },
  apple: {
    src: 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js',
    init: () => window.AppleID.auth.init({ clientId: A.apple, scope: 'name email', redirectURI: A.appleRedirect || location.origin + location.pathname, usePopup: true }),
    run: () => window.AppleID.auth.signIn().then(
      r => ({ token: r.authorization.id_token, name: r.user && r.user.name ? [r.user.name.firstName, r.user.name.lastName].filter(Boolean).join(' ') : '' }),
      e => { throw new Error(e && e.error === 'popup_closed_by_user' ? 'cancelled' : 'apple'); })
  }
};
const sdkReady = {};
function preload() {
  if (!account.live()) return;
  account.providers().forEach(p => { sdkReady[p] = script(SDK[p].src).then(() => SDK[p].init && SDK[p].init()); });
}

/** Sign in (or link, when signed in) with a provider. */
async function sso(provider, btn) {
  btn.classList.add('is-busy');
  try {
    let got = { token: 'preview' };
    if (account.live()) { await sdkReady[provider]; got = await SDK[provider].run(); }
    const r = await account.social(provider, got.token, { name: got.name || '' });
    if (r.needPhone) { step = 'phone'; renderAuth(); return; }
    user = r.user;
    if (location.hash === '#profile') { renderDash(); toast(`${NAMES[provider]} დაკავშირდა`); return; }
    if (!user.name) { step = 'profile'; renderAuth(); } else afterLogin();
  } catch (e) {
    if (e.message !== 'cancelled') { console.error(e); toast(e.code === 'taken' ? `ეს ${NAMES[provider]} ანგარიში სხვა ნომერზეა მიბმული` : `${NAMES[provider]}-ით შესვლა ვერ მოხერხდა. სცადეთ ნომრით.`); }
  } finally { btn.classList.remove('is-busy'); }
}

/* ---------- signed out: phone -> code -> (new) profile ---------- */
function perks() {
  return `<aside class="auth__side on-blue">
    <img class="auth__roof" src="assets/brand/pattern/hero-roofs.svg" alt="" aria-hidden="true">
    <span class="eyebrow">ჩემი ანგარიში</span>
    <h2 class="h2">ყველაფერი ერთ ადგილას</h2>
    <ul class="auth__perks">
      <li>${bi('svc-delivery')}<span><b>შეკვეთების სტატუსი</b>რა შეუკვეთეთ და სად არის ახლა</span></li>
      <li>${bi('ct-location')}<span><b>შენახული მისამართები</b>შეკვეთის გაფორმება ორ წუთში</span></li>
      <li>${bi('svc-support')}<span><b>პირადი კონსულტაცია</b>ინჟინერმა იცის, რა სისტემა გიდგათ</span></li>
    </ul>
  </aside>`;
}
const ssoButtons = () => `<div class="sso">${account.providers().map(p => `<button class="sso__btn sso__btn--${p}" type="button" data-sso="${p}">${LOGO[p]}<span>${NAMES[p]}-ით შესვლა</span></button>`).join('')}</div>`;

function renderAuth() {
  clearInterval(timer);
  const pend = account.pendingSocial();
  const box = $('[data-auth]');
  if (step === 'phone') {
    box.innerHTML = `<h1 class="h1 auth__h">${pend ? 'ნომრის დადასტურება' : 'შესვლა'}</h1>
      ${pend ? `<div class="auth__note">${LOGO[pend.provider]}<span><b>${NAMES[pend.provider]} ${account.live() ? 'დადასტურდა' : 'არჩეულია'}.</b> დაასრულეთ ტელეფონის ნომრით: ის სავალდებულოა, მასზე გიკავშირდებათ მენეჯერი შეკვეთის დასადასტურებლად.</span><button type="button" class="auth__x" data-cancel-social aria-label="გაუქმება">${ui('close')}</button></div>`
        : `<p class="auth__sub">შედით ან შექმენით ანგარიში. ტელეფონის ნომერი სავალდებულოა: მასზე გიკავშირდებათ მენეჯერი შეკვეთის დასადასტურებლად.</p>${ssoButtons()}<div class="auth__or"><span>ან ტელეფონით</span></div>`}
      <form class="form-stack" data-phone-form novalidate>
        <label class="field"><span>მობილურის ნომერი <em>*</em></span>
          <span class="phone-in"><b>+995</b><input class="input" name="phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="5XX XX XX XX" required value="${esc(phone ? phoneE164(phone).slice(4) : '')}"></span>
          <small class="field__err">შეიყვანეთ მობილურის ნომერი: 5XX XX XX XX</small></label>
        <button class="btn btn--red btn--block" type="submit">კოდის მიღება ${arrow()}</button>
      </form>
      <p class="auth__fine">ნომერზე გამოგიგზავნით 4-ნიშნა კოდს. ახალ ნომერზე ანგარიში ავტომატურად შეიქმნება.</p>
      ${!account.live() && pend ? `<p class="auth__demo">სატესტო რეჟიმი: ${NAMES[pend.provider]}-ით შესვლა ჩაირთვება, როცა config.js-ში (auth) ჩაიწერება მისი ID.</p>` : ''}`;
    const f = $('[data-phone-form]', box);
    if (pend || !account.providers().length) f.phone.focus();
    f.addEventListener('submit', sendCode);
  } else if (step === 'code') {
    box.innerHTML = `<button type="button" class="auth__back" data-back>${ui('right')}ნომრის შეცვლა</button>
      <h1 class="h1 auth__h">შეიყვანეთ კოდი</h1>
      <p class="auth__sub">კოდი გამოგზავნილია ნომერზე <b>${esc(phoneNice(phone))}</b></p>
      <form data-code-form novalidate>
        <div class="otp" data-otp>${[0, 1, 2, 3].map(i => `<input class="otp__d" inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="${i ? 'off' : 'one-time-code'}" aria-label="ციფრი ${i + 1}">`).join('')}</div>
        <p class="otp__err" data-code-err hidden></p>
        <button class="btn btn--red btn--block" type="submit">დადასტურება ${arrow()}</button>
      </form>
      <p class="auth__fine"><button type="button" class="link-btn" data-resend disabled>კოდის ხელახლა გაგზავნა</button> <span data-timer></span></p>
      ${demo ? `<p class="auth__demo">სატესტო რეჟიმი: SMS არ იგზავნება. კოდია <b>${esc(demo)}</b></p>` : ''}`;
    otp($('[data-otp]', box));
    $('[data-code-form]', box).addEventListener('submit', e => { e.preventDefault(); verify(); });
  } else {
    const pend2 = user || {};
    box.innerHTML = `<h1 class="h1 auth__h">მოგესალმებით!</h1>
      <p class="auth__sub">ნომერი <b>${esc(phoneNice(user.phone))}</b> დადასტურდა. დაასრულეთ ანგარიში.</p>
      <form class="form-stack" data-new-form novalidate>
        <label class="field"><span>სახელი და გვარი <em>*</em></span><input class="input" name="name" autocomplete="name" required value="${esc(pend2.name || '')}"><small class="field__err">შეიყვანეთ სახელი</small></label>
        <label class="field"><span>ელ. ფოსტა</span><input class="input" name="email" type="email" autocomplete="email" value="${esc(pend2.email || '')}" placeholder="ინვოისისა და შეკვეთის დეტალებისთვის"><small class="field__err">შეიყვანეთ სწორი ელ. ფოსტა</small></label>
        <label class="check"><input type="checkbox" name="news"><span>მინდა მივიღო ფასდაკლებები და სიახლეები SMS-ით ან ელ. ფოსტით</span></label>
        <button class="btn btn--red btn--block" type="submit">ანგარიშის შექმნა ${arrow()}</button>
      </form>`;
    const f = $('[data-new-form]', box);
    f.name.focus();
    f.addEventListener('submit', async e => {
      e.preventDefault();
      if (!validate(f)) return;
      busy(f, true);
      try { user = await account.save({ name: f.name.value.trim(), email: f.email.value.trim(), news: f.news.checked }); afterLogin(); }
      catch (err) { console.error(err); toast('ვერ შეინახა. სცადეთ ხელახლა.'); busy(f, false); }
    });
  }
}
const busy = (f, on) => $('button[type=submit]', f).classList.toggle('is-busy', on);

async function sendCode(e) {
  e.preventDefault();
  const f = e.target, field = f.phone.closest('.field');
  const ph = mobile(f.phone.value);
  field.classList.toggle('is-bad', !ph);
  if (!ph) { f.phone.focus(); return; }
  busy(f, true);
  try {
    const r = await account.sendCode(ph);
    phone = ph;
    demo = r.demoCode || '';
    step = 'code';
    renderAuth();
    countdown(r.wait || 60);
  } catch (err) {
    console.error(err);
    busy(f, false);
    toast(err.code === 'wait' ? `კოდი უკვე გამოგზავნილია. ხელახლა ${err.wait || 60} წამში.` : err.code === 'limit' ? 'ძალიან ბევრი მცდელობა. სცადეთ მოგვიანებით ან დაგვირეკეთ.' : 'კოდი ვერ გაიგზავნა. სცადეთ ხელახლა ან დაგვირეკეთ: ' + esc(C.phone));
  }
}
function countdown(sec) {
  const btn = $('[data-resend]'), out = $('[data-timer]');
  let left = sec;
  const tick = () => {
    if (!btn || !btn.isConnected) return clearInterval(timer);
    btn.disabled = left > 0;
    out.textContent = left > 0 ? `0:${String(left).padStart(2, '0')}` : '';
    left--;
  };
  clearInterval(timer);
  tick();
  timer = setInterval(tick, 1000);
}
/** Four boxes: typing moves on, backspace moves back, pasting fills all, the fourth digit sends. */
function otp(box) {
  const ds = $$('.otp__d', box);
  ds[0].focus();
  const full = () => ds.every(d => d.value);
  ds.forEach((d, i) => {
    d.addEventListener('input', () => {
      const v = d.value.replace(/\D/g, '');
      if (v.length > 1) { v.slice(0, 4).split('').forEach((c, k) => { if (ds[k]) ds[k].value = c; }); }
      else d.value = v;
      $('[data-code-err]').hidden = true;
      box.classList.remove('is-bad');
      if (d.value && i < 3 && v.length <= 1) ds[i + 1].focus();
      if (full()) verify();
    });
    d.addEventListener('keydown', e => { if (e.key === 'Backspace' && !d.value && i) { ds[i - 1].value = ''; ds[i - 1].focus(); } });
    d.addEventListener('paste', e => {
      const v = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 4);
      if (!v) return;
      e.preventDefault();
      v.split('').forEach((c, k) => { ds[k].value = c; });
      ds[Math.min(v.length, 3)].focus();
      if (full()) verify();
    });
  });
}
let checking = false;
async function verify() {
  const box = $('[data-otp]'), err = $('[data-code-err]');
  const code = $$('.otp__d', box).map(d => d.value).join('');
  if (code.length < 4 || checking) { if (code.length < 4) { err.textContent = 'შეიყვანეთ 4 ციფრი'; err.hidden = false; } return; }
  checking = true;
  const f = $('[data-code-form]');
  busy(f, true);
  try {
    const pend = account.pendingSocial();
    const r = await account.verify(phone, code);
    user = r.user;
    if (pend && r.linked === false) toast(`ეს ${NAMES[pend.provider]} ანგარიში სხვა ნომერზეა მიბმული: შეხვედით ნომრით.`);
    if (r.isNew || !user.name) { step = 'profile'; renderAuth(); } else afterLogin();
  } catch (e) {
    busy(f, false);
    box.classList.add('is-bad');
    $$('.otp__d', box).forEach(d => { d.value = ''; });
    $$('.otp__d', box)[0].focus();
    err.textContent = e.code === 'wrong' ? 'კოდი არასწორია. სცადეთ ხელახლა.' : e.code === 'expired' ? 'კოდს ვადა გაუვიდა. მოითხოვეთ ახალი.' : 'შემოწმება ვერ მოხერხდა. სცადეთ ხელახლა.';
    err.hidden = false;
  } finally { checking = false; }
}
function afterLogin() {
  toast(`<b>გამარჯობა${user.name ? ', ' + esc(user.name.split(' ')[0]) : ''}!</b> თქვენ შეხვედით ანგარიშში.`);
  const back = new URLSearchParams(location.search).get('back');
  if (back && /^[a-z]+\.html([?#].*)?$/.test(back)) { location.href = back; return; }
  orders = null;
  layout();
}

/* ---------- signed in: the dashboard ---------- */
const TABS = [['overview', 'მიმოხილვა', 'grid'], ['orders', 'შეკვეთები', 'box'], ['favourites', 'რჩეულები', 'heart'], ['addresses', 'მისამართები', 'pin'], ['profile', 'პროფილი', 'user']];
const tabNow = () => { const h = location.hash.slice(1); return TABS.some(t => t[0] === h) ? h : 'overview'; };

function layout() {
  const main = $('[data-acc]');
  if (!user) {
    main.innerHTML = `<div class="auth">${perks()}<section class="auth__card" data-auth></section></div>`;
    renderAuth();
    return;
  }
  main.innerHTML = `<div class="dash">
    <aside class="dash__side">
      <div class="dash__me"><span class="av">${esc(initials(user.name)) || ui('user')}</span><div><b>${esc(user.name || 'ჩემი ანგარიში')}</b><small>${esc(phoneNice(user.phone))}</small></div></div>
      <nav class="dash__nav" aria-label="ანგარიში">${TABS.map(([id, t, ic]) => `<a href="#${id}" data-tab="${id}">${ui(ic)}<span>${t}</span><small data-tab-n="${id}"></small></a>`).join('')}
        <button type="button" data-logout>${ui('logout')}<span>გასვლა</span></button></nav>
    </aside>
    <section class="dash__main" data-dash></section>
  </div>`;
  renderDash();
}

function counts() {
  const n = { orders: orders ? orders.length : '', favourites: store.fav.length || '' };
  $$('[data-tab-n]').forEach(s => { s.textContent = n[s.dataset.tabN] || ''; });
  $$('[data-tab]').forEach(a => a.toggleAttribute('aria-current', a.dataset.tab === tabNow()));
}

async function loadOrders() {
  if (orders) return orders;
  try { orders = await account.orders(); } catch (e) { console.error(e); orders = []; toast('შეკვეთები ვერ ჩაიტვირთა'); }
  return orders;
}

const STATUS = { new: 'is-new', process: 'is-process', done: 'is-done', fail: 'is-fail' };
function orderCard(o) {
  // a row is matched to the site's product by ID, or by name when the CRM row has none
  const lines = (o.items || []).map(i => ({ i, p: (i.id && db.byId.get(+i.id)) || db.products.find(x => x.name === i.name || i.name.startsWith(x.name + ' (')) }));
  const items = lines.map(({ i, p }) => {
    return `<li>${p ? `<a class="order__img" href="${p.url}"><img src="${p.src[0] || ''}" alt="" loading="lazy"></a>` : `<span class="order__img">${ui('box')}</span>`}
      <span class="order__name">${p ? `<a href="${p.url}">${esc(p.title)}</a>` : esc(i.name)}<small>${i.qty} ც.${i.price != null ? ' × ' + money(i.price) : ''}</small></span></li>`;
  }).join('');
  const again = lines.filter(x => x.p && x.p.price != null).map(x => ({ id: x.p.id, qty: Math.max(1, Math.round(x.i.qty)) }));
  return `<article class="order">
    <header class="order__head">
      <div><small>შეკვეთა</small><b>${esc(o.id)}</b></div>
      <div><small>თარიღი</small><b>${esc(shortDate(o.date))}</b></div>
      <div><small>ჯამი</small><b>${o.total != null ? money(o.total) : '—'}</b></div>
      <span class="ostat ${STATUS[o.status] || 'is-new'}">${o.status === 'done' ? ui('check') : ''}${esc(o.stage || 'მიღებულია')}</span>
    </header>
    ${items ? `<ul class="order__items">${items}</ul>` : ''}
    <footer class="order__foot">
      ${again.length ? `<button type="button" class="btn btn--ghost btn--sm" data-again="${esc(again.map(i => i.id + ':' + i.qty).join(','))}">ხელახლა შეკვეთა</button>` : ''}
      <button type="button" class="link-btn" data-ask-order="${esc(o.id)}">კითხვა შეკვეთაზე</button>
    </footer>
  </article>`;
}
const emptyBox = (icon, h, p, cta) => `<div class="empty">${bi(icon, 'ic ic--xl')}<h3>${h}</h3><p>${p}</p>${cta || ''}</div>`;

async function renderDash() {
  const main = $('[data-dash]'), tab = tabNow();
  counts();
  if (tab === 'overview') {
    main.innerHTML = `<div class="dash__hello"><span class="eyebrow">ჩემი ანგარიში</span><h1 class="h1">გამარჯობა${user.name ? ', ' + esc(user.name.split(' ')[0]) : ''}</h1></div>
      <div class="dstats">
        <a class="dstat" href="#orders"><small>შეკვეთები</small><b data-n-orders>…</b></a>
        <a class="dstat" href="#favourites"><small>რჩეულები</small><b>${store.fav.length}</b></a>
        <button type="button" class="dstat" data-open="cart"><small>კალათაში</small><b>${store.count()}</b></button>
        <a class="dstat" href="compare.html"><small>შედარება</small><b>${store.cmp.length}</b></a>
      </div>
      <h2 class="dash__h">ბოლო შეკვეთა</h2><div data-last></div>
      ${store.seen.length ? `<h2 class="dash__h">ბოლოს ნანახი</h2><div class="grid dash__grid">${store.seen.slice(0, 4).map(id => db.byId.get(id)).filter(Boolean).map(p => card(db, p, { cls: 'card--sm' })).join('')}</div>` : ''}`;
    const list = await loadOrders();
    if (tabNow() !== 'overview') return;
    $('[data-n-orders]').textContent = list.length;
    $('[data-last]').innerHTML = list[0] ? orderCard(list[0]) : emptyBox('svc-delivery', 'შეკვეთები ჯერ არ არის', 'გაფორმებული შეკვეთები აქ გამოჩნდება.', `<a class="btn btn--red" href="catalog.html">კატალოგი ${arrow()}</a>`);
    counts();
  } else if (tab === 'orders') {
    main.innerHTML = `<div class="dash__hello"><h1 class="h1">შეკვეთები</h1></div><div class="orders" data-orders><p class="muted">იტვირთება…</p></div>`;
    const list = await loadOrders();
    if (tabNow() !== 'orders') return;
    $('[data-orders]').innerHTML = list.length ? list.map(orderCard).join('') + (account.live() ? '' : '<p class="auth__demo">სატესტო რეჟიმი: ჩანს ამ ბრაუზერიდან გაგზავნილი შეკვეთები. Bitrix-თან ჩართვის შემდეგ აქ იქნება ამ ნომრის ყველა გარიგება და მისი ეტაპი.</p>')
      : emptyBox('svc-delivery', 'შეკვეთები ჯერ არ არის', `ამ ნომრით (${esc(phoneNice(user.phone))}) გაფორმებული შეკვეთები აქ გამოჩნდება.`, `<a class="btn btn--red" href="catalog.html">კატალოგი ${arrow()}</a>`);
    counts();
  } else if (tab === 'favourites') {
    const list = store.fav.map(id => db.byId.get(id)).filter(Boolean);
    main.innerHTML = `<div class="dash__hello"><h1 class="h1">რჩეულები</h1></div>` + (list.length
      ? `<div class="grid dash__grid">${list.map(p => card(db, p, { cls: 'card--sm' })).join('')}</div>`
      : emptyBox('prd-ac', 'რჩეულები ცარიელია', `პროდუქტის ბარათზე დააჭირეთ <span style="display:inline-flex;vertical-align:-4px">${ui('heart', 'ui--sm')}</span> ღილაკს და აქ შეინახება.`, `<a class="btn btn--red" href="catalog.html">კატალოგი ${arrow()}</a>`));
  } else if (tab === 'addresses') {
    renderAddresses(main);
  } else {
    renderProfile(main);
  }
}

/* addresses */
const CITIES = ['თბილისი', 'ბათუმი', 'ქუთაისი', 'რუსთავი', 'გორი', 'ზუგდიდი', 'ფოთი', 'თელავი', 'მცხეთა', 'ზესტაფონი', 'ხაშური', 'სამტრედია', 'ოზურგეთი', 'მარნეული', 'ახალციხე', 'ბორჯომი', 'საგარეჯო', 'გურჯაანი'];
function renderAddresses(main, editing = null) {
  const list = user.addresses || [];
  const form = a => `<form class="addr addr--form form-stack" data-addr-form="${a ? esc(a.id) : ''}" novalidate>
      <div class="grid2">
        <label class="field"><span>ქალაქი <em>*</em></span><input class="input" name="city" list="mc-cities" autocomplete="address-level2" required value="${esc(a ? a.city : 'თბილისი')}"><small class="field__err">შეიყვანეთ ქალაქი</small></label>
        <label class="field"><span>დასახელება</span><input class="input" name="label" placeholder="სახლი, ოფისი, აგარაკი" value="${esc(a ? a.label || '' : '')}"></label>
      </div>
      <label class="field"><span>მისამართი <em>*</em></span><input class="input" name="address" autocomplete="street-address" placeholder="ქუჩა, ნომერი, სადარბაზო, სართული" required value="${esc(a ? a.address : '')}"><small class="field__err">შეიყვანეთ მისამართი</small></label>
      <label class="check"><input type="checkbox" name="main" ${!list.length || (a && a.main) ? 'checked' : ''}><span>მთავარი მისამართი (შეკვეთისას ავტომატურად ჩაიწერება)</span></label>
      <div class="addr__acts"><button class="btn btn--sm" type="submit">შენახვა</button><button class="btn btn--ghost btn--sm" type="button" data-addr-cancel>გაუქმება</button></div>
      <datalist id="mc-cities">${CITIES.map(c => `<option value="${c}">`).join('')}</datalist>
    </form>`;
  main.innerHTML = `<div class="dash__hello"><h1 class="h1">მისამართები</h1></div>
    <div class="addrs">${list.map(a => editing === a.id ? form(a) : `<article class="addr">
        <div class="addr__t">${ui('pin')}<div><b>${esc(a.label || a.city)}</b>${a.main ? '<span class="tag tag--blue">მთავარი</span>' : ''}<p>${esc(a.city)}, ${esc(a.address)}</p></div></div>
        <div class="addr__acts">${a.main ? '' : `<button type="button" class="link-btn" data-addr-main="${esc(a.id)}">მთავარად</button>`}
          <button type="button" class="iconbtn" data-addr-edit="${esc(a.id)}" aria-label="რედაქტირება">${ui('edit')}</button>
          <button type="button" class="iconbtn" data-addr-del="${esc(a.id)}" aria-label="წაშლა">${ui('trash')}</button></div>
      </article>`).join('')}
      ${editing === 'new' ? form(null) : `<button type="button" class="addr addr--add" data-addr-new>${ui('plus')}<span>ახალი მისამართი</span></button>`}
    </div>`;
  const f = $('[data-addr-form]', main);
  if (f) f.city.focus();
}
async function saveAddresses(list, msg) {
  try { user = await account.save({ addresses: list }); toast(msg); } catch (e) { console.error(e); toast('ვერ შეინახა. სცადეთ ხელახლა.'); }
  renderAddresses($('[data-dash]'));
}

/* profile */
function renderProfile(main) {
  const linked = user.social || {};
  main.innerHTML = `<div class="dash__hello"><h1 class="h1">პროფილი</h1></div>
    <form class="dash__form form-stack" data-me-form novalidate>
      <div class="grid2">
        <label class="field"><span>სახელი და გვარი <em>*</em></span><input class="input" name="name" autocomplete="name" required value="${esc(user.name || '')}"><small class="field__err">შეიყვანეთ სახელი</small></label>
        <label class="field"><span>ელ. ფოსტა</span><input class="input" name="email" type="email" autocomplete="email" value="${esc(user.email || '')}"><small class="field__err">შეიყვანეთ სწორი ელ. ფოსტა</small></label>
      </div>
      <div class="field"><span>ტელეფონის ნომერი</span><div class="input input--static">${esc(phoneNice(user.phone))}<span class="verified">${ui('shield')}დადასტურებული</span></div>
        <small class="muted">ნომრით შედიხართ ანგარიშში და მასზე გიკავშირდებათ მენეჯერი. შესაცვლელად დაგვიკავშირდით: ${esc(C.phone)}.</small></div>
      <label class="check"><input type="checkbox" name="news" ${user.news ? 'checked' : ''}><span>მინდა მივიღო ფასდაკლებები და სიახლეები SMS-ით ან ელ. ფოსტით</span></label>
      <div><button class="btn" type="submit">შენახვა</button></div>
    </form>
    <h2 class="dash__h">შესვლის გზები</h2>
    <div class="ways">
      <div class="way"><span class="way__ic">${ui('phone')}</span><div><b>ტელეფონის ნომერი</b><small>${esc(phoneNice(user.phone))} · SMS კოდი</small></div><span class="tag tag--blue">მთავარი</span></div>
      ${account.providers().map(p => `<div class="way"><span class="way__ic way__ic--${p}">${LOGO[p]}</span><div><b>${NAMES[p]}</b><small>${linked[p] ? 'დაკავშირებულია' + (linked[p].email ? ' · ' + esc(linked[p].email) : '') : 'შედით ერთი დაჭერით'}</small></div>
        ${linked[p] ? `<button type="button" class="btn btn--ghost btn--sm" data-unlink="${p}">გათიშვა</button>` : `<button type="button" class="btn btn--ghost btn--sm" data-sso="${p}">დაკავშირება</button>`}</div>`).join('')}
    </div>
    <h2 class="dash__h">გასვლა</h2>
    <p class="muted" style="margin-bottom:14px">ამ მოწყობილობაზე ანგარიშიდან გასვლა. კალათა და რჩეულები ბრაუზერში დარჩება.</p>
    <button type="button" class="btn btn--ghost" data-logout>${ui('logout')}გასვლა</button>
    <h2 class="dash__h">ანგარიშის წაშლა</h2>
    <p class="muted" style="margin-bottom:14px;max-width:640px">წაიშლება ანგარიში, შენახული მისამართები და დაკავშირებული შესვლის გზები. გაფორმებული შეკვეთები კომპანიაში რჩება საგარანტიო მომსახურებისა და ბუღალტრული აღრიცხვისთვის.</p>
    <button type="button" class="btn btn--ghost btn--danger" data-delete-ask>${ui('trash')}ანგარიშის წაშლა</button>`;
}

/** The confirmation window (made once). */
function deleteDialog() {
  let m = $('#acc-delete');
  if (!m) {
    document.body.insertAdjacentHTML('beforeend', `<div class="modal" id="acc-delete" role="alertdialog" aria-modal="true" aria-labelledby="del-h" aria-describedby="del-p"><div class="modal__scrim" data-close></div><div class="modal__box">
      <button class="iconbtn modal__x" data-close aria-label="დახურვა">${ui('close')}</button>
      <h2 class="h2" id="del-h">ანგარიშის წაშლა?</h2>
      <p id="del-p" style="margin-top:12px;color:var(--muted)">ანგარიში <b data-del-phone style="color:var(--strong);white-space:nowrap"></b> წაიშლება სამუდამოდ: პროფილი, მისამართები და დაკავშირებული შესვლის გზები. ამავე ნომრით შემდეგ ისევ შეგიძლიათ შესვლა, ახალი ანგარიშით.</p>
      <div class="del__acts"><button type="button" class="btn btn--ghost" data-close>გაუქმება</button><button type="button" class="btn btn--red" data-delete>${ui('trash')}დიახ, წაშლა</button></div>
    </div></div>`);
    m = $('#acc-delete');
    m.addEventListener('click', async e => {
      const b = e.target.closest('[data-delete]');
      if (!b) return;
      b.classList.add('is-busy');
      try {
        await account.remove();
        closeLayers();
        user = null; orders = null; step = 'phone'; phone = '';
        history.replaceState(null, '', location.pathname);
        layout();
        scrollTo(0, 0);
        toast('ანგარიში წაიშალა');
      } catch (err) {
        console.error(err);
        toast('ვერ წაიშალა. სცადეთ ხელახლა ან დაგვიკავშირდით: ' + esc(C.phone));
      } finally { b.classList.remove('is-busy'); }
    });
  }
  $('[data-del-phone]', m).textContent = phoneNice(user.phone);
  openLayer(m);
}

/* ---------- events ---------- */
function wire() {
  const root = $('[data-acc]');
  root.addEventListener('click', async e => {
    const t = e.target;
    let el;
    if ((el = t.closest('[data-sso]'))) return sso(el.dataset.sso, el);
    if (t.closest('[data-cancel-social]')) { account.cancelSocial(); return renderAuth(); }
    if (t.closest('[data-back]')) { step = 'phone'; demo = ''; return renderAuth(); }
    if (t.closest('[data-resend]')) {
      try { const r = await account.sendCode(phone); demo = r.demoCode || ''; renderAuth(); countdown(r.wait || 60); toast('კოდი ხელახლა გაიგზავნა'); }
      catch (err) { toast(err.code === 'limit' ? 'ძალიან ბევრი მცდელობა. სცადეთ მოგვიანებით.' : 'კოდი ვერ გაიგზავნა'); }
      return;
    }
    if (t.closest('[data-delete-ask]')) return deleteDialog();
    if (t.closest('[data-logout]')) { await account.logout(); user = null; orders = null; step = 'phone'; phone = ''; history.replaceState(null, '', location.pathname); layout(); toast('თქვენ გამოხვედით ანგარიშიდან'); scrollTo(0, 0); return; }
    if ((el = t.closest('[data-unlink]'))) { user = await account.unlink(el.dataset.unlink); renderDash(); toast(`${NAMES[el.dataset.unlink]} გაითიშა`); return; }
    if ((el = t.closest('[data-again]'))) {
      el.dataset.again.split(',').forEach(x => { const [id, q] = x.split(':'); store.add(+id, +q || 1); });
      toast('<b>კალათაში დაემატა</b> <a href="checkout.html">გაფორმება</a>');
      return;
    }
    if ((el = t.closest('[data-ask-order]'))) return callback(db, null, 'შეკვეთის სტატუსი');
    // addresses
    const list = user && (user.addresses || []);
    if (t.closest('[data-addr-new]')) return renderAddresses($('[data-dash]'), 'new');
    if (t.closest('[data-addr-cancel]')) return renderAddresses($('[data-dash]'));
    if ((el = t.closest('[data-addr-edit]'))) return renderAddresses($('[data-dash]'), el.dataset.addrEdit);
    if ((el = t.closest('[data-addr-del]'))) return saveAddresses(list.filter(a => a.id !== el.dataset.addrDel).map((a, i, all) => ({ ...a, main: a.main || (all.length && !all.some(x => x.main) && i === 0) })), 'მისამართი წაიშალა');
    if ((el = t.closest('[data-addr-main]'))) return saveAddresses(list.map(a => ({ ...a, main: a.id === el.dataset.addrMain })), 'მთავარი მისამართი შეიცვალა');
  });
  root.addEventListener('submit', async e => {
    const f = e.target;
    if (f.matches('[data-addr-form]')) {
      e.preventDefault();
      if (!validate(f)) return;
      const id = f.dataset.addrForm || 'a' + Date.now().toString(36);
      const a = { id, city: f.city.value.trim(), label: f.label.value.trim(), address: f.address.value.trim(), main: f.main.checked };
      let list = (user.addresses || []).filter(x => x.id !== id);
      if (a.main) list = list.map(x => ({ ...x, main: false }));
      list = f.dataset.addrForm ? (user.addresses || []).map(x => (x.id === id ? a : a.main ? { ...x, main: false } : x)) : [...list, a];
      if (!list.some(x => x.main)) list[0].main = true;
      busy(f, true);
      return saveAddresses(list.slice(0, 10), 'მისამართი შეინახა');
    }
    if (f.matches('[data-me-form]')) {
      e.preventDefault();
      if (!validate(f)) return;
      busy(f, true);
      try { user = await account.save({ name: f.name.value.trim(), email: f.email.value.trim(), news: f.news.checked }); toast('პროფილი შეინახა'); layout(); }
      catch (err) { console.error(err); toast('ვერ შეინახა. სცადეთ ხელახლა.'); busy(f, false); }
    }
  });
  addEventListener('hashchange', () => { if (user) { renderDash(); scrollTo({ top: 0 }); } });
  addEventListener('mc:fav', () => { if (user && ['favourites', 'overview'].includes(tabNow())) renderDash(); else if (user) counts(); });
}

boot({}).then(async d => {
  db = d;
  $('[data-crumbs]').innerHTML = crumbs([['ჩემი ანგარიში', null]]);
  wire();
  preload();
  try { user = await account.me(); } catch (e) { console.error(e); user = null; }
  if (!user && account.pendingSocial()) step = 'phone';
  layout();
});
