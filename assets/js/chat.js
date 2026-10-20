/* Max assistant: the chat in the bottom-right corner. It picks an air conditioner or a boiler by the
   size of the room from the catalog, answers delivery, installation and showroom questions, finds
   products by name, and hands the conversation to a manager as a callback request in Bitrix (name and
   phone number required). No AI service behind it: fixed answers plus the catalog, so it also works
   in the preview. */
import { $, C, esc, ui, priceHTML, search, validate, validPhone } from './core.js';
import { lead, account, norm, phoneNice } from './api.js';

const KEY = 'mc.chat';
let db, el, msgs = [];

const MENU = [
  ['კონდიციონერის შერჩევა', 'ac'], ['ქვაბის შერჩევა', 'boiler'], ['მიწოდება და მონტაჟი', 'delivery'],
  ['შოურუმები', 'shops'], ['ჩემი შეკვეთა', 'order'], ['ინჟინერთან საუბარი', 'human']
];
const AFTER = [['ინჟინრის კონსულტაცია', 'human'], ['მენიუ', 'menu']];

/* ---------- state (this tab only) ---------- */
const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-40))); } catch (e) { /* */ } };
const load = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || []; } catch (e) { return []; } };

/* ---------- drawing ---------- */
function render() {
  const log = $('[data-chat-log]', el);
  log.innerHTML = msgs.map((m, i) => `<div class="cmsg cmsg--${m.who}">${m.html}</div>` +
    (i === msgs.length - 1 && m.chips ? `<div class="cchips">${m.chips.map(([t, a]) => `<button type="button" class="cchip" data-act="${esc(a)}">${esc(t)}</button>`).join('')}</div>` : '')).join('');
  log.scrollTop = log.scrollHeight;
}
const wait = ms => new Promise(r => setTimeout(r, ms));
async function bot(html, chips) {
  const log = $('[data-chat-log]', el);
  log.insertAdjacentHTML('beforeend', '<div class="cmsg cmsg--bot cmsg--typing" aria-hidden="true"><i></i><i></i><i></i></div>');
  log.scrollTop = log.scrollHeight;
  await wait(350 + Math.min(650, html.length));
  msgs.push({ who: 'bot', html, chips });
  save();
  render();
}
function said(text) {
  msgs.forEach(m => delete m.chips);
  msgs.push({ who: 'me', html: esc(text) });
  save();
  render();
}

/* ---------- catalog helpers ---------- */
const kw = p => {
  const v = p.size || p.spec['სიმძლავრე, kW'] || '';
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const rank = p => (p.price != null ? 4 : 0) + (p.stock ? 2 : 0) + (p.src[0] && /\/(mc|lib)-/.test(p.src[0]) ? 1 : 0);
/** One product per colour group, best first. */
function pick(list, n = 3) {
  const seen = new Set(), out = [];
  list.sort((a, b) => rank(b) - rank(a) || (a.price ?? 1e9) - (b.price ?? 1e9)).forEach(p => {
    const k = p.group || p.id;
    if (!seen.has(k) && out.length < n) { seen.add(k); out.push(p); }
  });
  return out;
}
const mini = p => `<a class="cprod" href="${p.url}"><span class="cprod__img"><img src="${p.src[0] || ''}" alt="" loading="lazy"></span><span class="cprod__t"><small>${esc(p.brandName)}</small><b>${esc(p.title)}</b>${priceHTML(p)}</span></a>`;
const nice = n => String(n).replace('.', ',');

/* ---------- answers ---------- */
const ROOM = { 20: [2, 2.5], 35: [3.5, 3.5], 50: [4.2, 5], 70: [6, 7.1] };
const HOUSE = { 100: [18, 25], 200: [24, 30], 300: [30, 36], 400: [40, 70] };

const ACTS = {
  menu: () => bot('რით დაგეხმაროთ?', MENU),
  hello: () => bot('გამარჯობა! რით დაგეხმაროთ?', MENU),
  thanks: () => bot('არაფრის! სხვა რამეში დაგეხმაროთ?', MENU),

  ac: () => bot('რამდენი კვადრატული მეტრია ოთახი?', [['20 მ²-მდე', 'ac:20'], ['20-35 მ²', 'ac:35'], ['35-50 მ²', 'ac:50'], ['50 მ²-ზე მეტი', 'ac:70']]),
  'ac:': area => {
    const [lo, hi] = ROOM[area] || ROOM[35];
    const list = pick(db.products.filter(p => p.sub === 'wall' && !/შიდა ბლოკი/.test(p.type || '') && kw(p) >= lo && kw(p) <= hi));
    const need = lo === hi ? nice(lo) : nice(lo) + '-' + nice(hi);
    const head = area >= 70
      ? `50 მ²-ზე მეტ ოთახს სჭირდება ${need} kW ან მეტი. რამდენიმე ოთახისთვის ხშირად მულტი სპლიტ სისტემა ჯობს: ერთი გარე ბლოკი და რამდენიმე შიდა.`
      : `ამ ფართობს შეესაბამება დაახლოებით ${need} kW სიმძლავრე (100 W მ²-ზე, ჩვეულებრივი ჭერისთვის). აი, რამდენიმე ვარიანტი:`;
    return bot(`<p>${head}</p>${list.map(mini).join('')}<a class="cmore" href="catalog.html?c=cooling&s=wall">ყველა კედლის კონდიციონერი</a>`,
      [['სხვა ფართობი', 'ac'], ...(area >= 70 ? [['მულტი სპლიტი', 'go:catalog.html?c=cooling&s=multi']] : []), ...AFTER]);
  },

  boiler: () => bot('რამდენი კვადრატული მეტრია გასათბობი ფართობი?', [['100 მ²-მდე', 'boiler:100'], ['100-200 მ²', 'boiler:200'], ['200-300 მ²', 'boiler:300'], ['300 მ²-ზე მეტი', 'boiler:400']]),
  'boiler:': area => {
    const [lo, hi] = HOUSE[area] || HOUSE[200];
    const wall = area < 400;
    const list = pick(db.products.filter(p => p.sub === 'boilers' && kw(p) >= lo && kw(p) <= hi && (!wall || /ორკონტურიანი|კონდენსაციური|საკონდენსაციო/.test(p.type || ''))));
    return bot(`<p>საორიენტაციოდ 1 kW 10 მ²-ზე, ცხელ წყალთან ერთად: ${area >= 400 ? '300 მ²-ზე მეტს' : 'ამ ფართობს'} შეესაბამება ${lo}-${hi} kW ${wall ? 'კედლის' : 'იატაკის ან კონდენსაციური'} ქვაბი. ზუსტ გათვლას ინჟინერი გააკეთებს უფასოდ.</p>${list.map(mini).join('')}<a class="cmore" href="catalog.html?c=heating&s=boilers">ყველა ქვაბი</a>`,
      [['სხვა ფართობი', 'boiler'], ...AFTER]);
  },

  delivery: () => bot(`<p><b>მიწოდება</b></p><ul>${C.delivery.map(d => `<li>${esc(d.name)}: ${esc(d.note)}${d.price === 0 ? ', უფასოდ' : ''}</li>`).join('')}</ul>
    <p>მიწოდების ფასს მენეჯერი გეტყვით შეკვეთის დადასტურებისას. მონტაჟს ასრულებს ჩვენი საინჟინრო გუნდი.</p>
    <p><b>გადახდა:</b> ${C.payment.map(p => esc(p.name).toLowerCase()).join(', ')}.</p><a class="cmore" href="about.html#services">მომსახურების შესახებ</a>`, [['შოურუმები', 'shops'], ...AFTER]),

  shops: () => bot(`<p>${esc(C.hours)}</p><ul>${C.showrooms.map(s => `<li><b>${esc(s.name)}</b><br>${esc(s.address)}, ${esc(s.phone)}</li>`).join('')}</ul><a class="cmore" href="about.html#contact">რუკაზე ნახვა</a>`, AFTER),

  order: () => account.hint()
    ? bot('შეკვეთების სტატუსი და შემადგენლობა თქვენს ანგარიშშია.<a class="cmore" href="account.html#orders">ჩემი შეკვეთები</a>', AFTER)
    : bot(`შედით ტელეფონის ნომრით და ნახავთ ყველა შეკვეთას, ან დაგვირეკეთ: <a href="${C.phoneHref}">${esc(C.phone)}</a>.<a class="cmore" href="account.html">შესვლა</a>`, AFTER),

  human: async () => {
    msgs.forEach(m => delete m.chips);
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('mc.contact') || '{}'); } catch (e) { /* */ }
    await bot(`<p>დატოვეთ სახელი და ნომერი: ინჟინერი დაგირეკავთ (${esc(C.hours)}) და საუბარს აქედან გააგრძელებს.</p>
      <form class="cform form-stack" data-chat-form novalidate>
        <label class="field"><span>სახელი <em>*</em></span><input class="input" name="name" autocomplete="name" required value="${esc(saved.name || '')}"><small class="field__err">შეიყვანეთ სახელი</small></label>
        <label class="field"><span>ტელეფონი <em>*</em></span><input class="input" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="5XX XX XX XX" required value="${esc(saved.phone || '')}"><small class="field__err">ნომერი სავალდებულოა</small></label>
        <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <button class="btn btn--red btn--block btn--sm" type="submit">დამირეკეთ</button>
      </form>`, [['მენიუ', 'menu']]);
  }
};

/* free text: a short question goes to the matching answer, anything longer is a product search first */
const INTENTS = [
  [/კონდიციონ|კონდიცირ|სპლიტ|split|გაგრილ/, 'ac'],
  [/ქვაბ|boiler|გათბობ/, 'boiler'],
  [/მიწოდ|მონტაჟ|გადახდ|განვადებ|delivery/, 'delivery'],
  [/შოურუმ|მისამართ|მაღაზი|სამუშაო საათ|სად ხართ/, 'shops'],
  [/შეკვეთ|order|სტატუს/, 'order'],
  [/ოპერატორ|ადამიან|დამირეკ|დარეკ|ზარ|ინჟინერ|კონსულტ|მენეჯერ/, 'human'],
  [/^(გამარჯობა|სალამი|hello|hi|hey)/, 'hello'],
  [/მადლობ|thank/, 'thanks']
];
function answer(text) {
  const t = norm(text), words = t.split(' ').filter(Boolean);
  const hit = INTENTS.find(([re]) => re.test(t));
  if (hit && words.length <= 3) return act(hit[1]);
  const found = search(db, text).slice(0, 3);
  if (found.length) return bot(`<p>აი, რა ვიპოვე:</p>${found.map(mini).join('')}<a class="cmore" href="catalog.html?q=${encodeURIComponent(text)}">ყველა შედეგი</a>`, AFTER);
  if (hit) return act(hit[1]);
  return bot('ამაზე ზუსტ პასუხს ვერ გეტყვით. სცადეთ პროდუქტის ან ბრენდის სახელი, ან დაგაკავშირებთ ინჟინერთან.', [['ინჟინერთან საუბარი', 'human'], ['მენიუ', 'menu']]);
}

function act(a) {
  if (a.startsWith('go:')) { location.href = a.slice(3); return; }
  const [name, arg] = a.includes(':') ? [a.slice(0, a.indexOf(':') + 1), +a.slice(a.indexOf(':') + 1)] : [a];
  return (ACTS[name] || ACTS.menu)(arg);
}

/* ---------- the callback request: a Bitrix lead with the conversation ---------- */
async function send(f) {
  if (f.website.value) return;
  if (!validate(f)) return;
  if (!validPhone(f.phone.value)) { f.phone.closest('.field').classList.add('is-bad'); return; }
  const btn = $('button[type=submit]', f);
  btn.classList.add('is-busy');
  const name = f.name.value.trim(), phone = f.phone.value.trim();
  const log = msgs.filter(m => m.who !== 'form').map(m => (m.who === 'me' ? 'კლიენტი: ' : 'ასისტენტი: ') + m.html.replace(/<form[\s\S]*<\/form>/, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).slice(-16).join('\n');
  try {
    await lead({ kind: 'chat', name, phone, topic: 'ჩატი საიტზე', message: log });
    try { localStorage.setItem('mc.contact', JSON.stringify({ ...JSON.parse(localStorage.getItem('mc.contact') || '{}'), name, phone })); } catch (e) { /* */ }
    const last = msgs.findLast(m => m.html.includes('data-chat-form'));
    if (last) { last.html = `<p>მოთხოვნა გაიგზავნა.</p>`; delete last.chips; }
    msgs.push({ who: 'bot', html: `<p>მადლობა, ${esc(name)}! ინჟინერი დაგირეკავთ ნომერზე <b>${esc(phoneNice(phone))}</b> (${esc(C.hours)}).</p>`, chips: [['მენიუ', 'menu']] });
    save();
    render();
  } catch (err) {
    console.error(err);
    btn.classList.remove('is-busy');
    bot(`ვერ გაიგზავნა. დაგვირეკეთ: <a href="${C.phoneHref}">${esc(C.phone)}</a>`, [['მენიუ', 'menu']]);
  }
}

/* ---------- window ---------- */
function build() {
  el = $('#chat');
  el.innerHTML = `<div class="chat__head">
      <span class="chat__av"><img src="assets/brand/logo/mc-symbol-white.svg" alt=""></span>
      <div class="chat__who"><b>მაქს ასისტენტი</b><small>ავტომატური ასისტენტი · ინჟინრები ${esc(C.hours)}</small></div>
      <button class="iconbtn" type="button" data-chat-close aria-label="დახურვა">${ui('close')}</button>
    </div>
    <div class="chat__log" data-chat-log role="log" aria-live="polite"></div>
    <form class="chat__bar" data-chat-bar>
      <input class="chat__input" name="q" autocomplete="off" maxlength="200" placeholder="დაწერეთ კითხვა ან პროდუქტი" aria-label="შეტყობინება">
      <button class="chat__send" type="submit" aria-label="გაგზავნა">${ui('send')}</button>
    </form>`;
  el.addEventListener('click', e => {
    const c = e.target.closest('[data-act]');
    if (c) { said(c.textContent); act(c.dataset.act); return; }
    if (e.target.closest('[data-chat-close]')) toggle(db, false);
  });
  el.addEventListener('submit', e => {
    e.preventDefault();
    if (e.target.matches('[data-chat-form]')) return send(e.target);
    const q = e.target.q.value.trim();
    if (!q) return;
    e.target.q.value = '';
    said(q);
    answer(q);
  });
  el.addEventListener('input', e => { const f = e.target.closest('.field.is-bad'); if (f) f.classList.remove('is-bad'); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !el.hidden) toggle(db, false); });
  msgs = load();
  render();
  if (!msgs.length) bot('<p>გამარჯობა! მე მაქს კომფორტის ასისტენტი ვარ. დაგეხმარებით სისტემის შერჩევაში ან დაგაკავშირებთ ინჟინერთან.</p>', MENU);
}

/** Open, close or flip the chat window. */
export function toggle(d, open) {
  db = d;
  if (!el) build();
  const btn = $('[data-chat]');
  const on = open ?? el.hidden;
  el.hidden = !on;
  btn.classList.toggle('is-open', on);
  btn.setAttribute('aria-expanded', on);
  document.documentElement.classList.toggle('chat-open', on);
  try {
    sessionStorage.setItem('mc.chat.open', on ? '1' : '0');
    localStorage.setItem('mc.chat.seen', '1');
  } catch (e) { /* */ }
  $('[data-chat-dot]').hidden = true;
  if (on) { render(); if (innerWidth > 760) $('.chat__input', el).focus(); } else btn.focus();
}
