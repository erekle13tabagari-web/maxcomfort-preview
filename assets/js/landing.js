import { boot, $, $$, esc, bi, arrow, priceHTML, lineKey } from './core.js';

/* Home page "Window" (index.html): the four systems fill the first screen.
   With a mouse, the pane under the pointer opens (the grid gives it the room) and its products take turns on
   a deck of cards; the others step back. On touch screens the panes stack, one screen each, and the pane in
   view plays its deck. The products are the category's own, from the catalogue (also when it comes from
   Bitrix): one per line, at most two per kind, the dearest first (price on request counts as dear), no
   accessories, shown in the category's order of kinds.                                                  */
const HERO = 'assets/img/hero/';
const PANES = [
  { id: 'heating', cls: 'heat', img: 'heat-mynute', w: 36 },        // w: the photo's width, % of a pane at rest
  { id: 'cooling', cls: 'cool', img: 'cool-ln-white', w: 56 },
  { id: 'ventilation', cls: 'vent', img: 'vent-hr300', w: 34, extra: 'ducts' },
  { id: 'water', cls: 'water', img: 'water-7200v', w: 17 }
];
const SHOW = 8, STEP = 2200;   // ms per card; with --xt in mc.css (HOME PAGE · WINDOW) the pace of the opening
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pointer = matchMedia('(hover: hover) and (min-width: 981px)');

function deckOf(db, id) {
  const c = db.cats.get(id), order = c.subs.map(s => s.id).filter(s => !/acc|tools/.test(s));
  const list = db.products.filter(p => p.cat === id && p.src && p.src[0] && order.includes(p.sub))
    .sort((a, b) => (b.price == null) - (a.price == null) || (b.price || 0) - (a.price || 0));
  const out = [], seen = new Set(), per = {};
  for (const p of list) {
    const k = lineKey(p);
    if (seen.has(k) || (per[p.sub] || 0) >= 2) continue;
    seen.add(k); per[p.sub] = (per[p.sub] || 0) + 1; out.push(p);
    if (out.length === SHOW) break;
  }
  return out.sort((a, b) => order.indexOf(a.sub) - order.indexOf(b.sub));
}

function paneHTML(db, P, i) {
  const c = db.cats.get(P.id), x = P.extra && db.cats.get(P.extra);
  const subs = c.subs.filter(s => s.count).map(s => `<a href="catalog.html?c=${P.id}&s=${s.id}">${esc(s.name)}</a>`).join('')
    + (x ? `<a href="catalog.html?c=${x.id}">${esc(x.name)}</a>` : '');
  const cards = deckOf(db, P.id).map((p, k) => `<a class="xcard" href="${esc(p.url)}" tabindex="-1" data-k="${k}">
      <span class="xcard__img"><img data-src="${esc(p.src[0])}" alt="" decoding="async"></span>
      <small>${esc(p.brandName || p.brand || '')}</small><b>${esc(p.title)}</b>${priceHTML(p)}</a>`).join('');
  return `<article class="xpane xpane--${P.cls}" data-id="${P.id}" style="--i:${i}">
    <span class="xpane__glow" aria-hidden="true"></span>
    <a class="xpane__go" href="catalog.html?c=${P.id}" aria-label="${esc(c.name)}: ${c.count} პროდუქტი"></a>
    <div class="xpane__in">
      <div class="xpane__text">
        ${bi(c.icon, 'ic xpane__ic')}
        <h2 class="xpane__t">${esc(c.name)}</h2>
        <div class="xpane__body"><p class="xpane__lead">${esc(c.lead)}</p><div class="xpane__links">${subs}</div></div>
      </div>
      <span class="xpane__count">${c.count} პროდუქტი ${arrow()}</span>
      <img class="xpane__img" src="${HERO + P.img}.webp" alt="" style="--wn:${P.w}">
      <div class="xdeck" aria-hidden="true">${cards}</div>
    </div>
  </article>`;
}

/* a deck: its cards take turns; data-k is a card's place (0 in front, 1-2 behind, "out" just left) */
function deck(pane) {
  const cards = $$('.xcard', pane), n = cards.length;
  let at = 0, timer = null, loaded = false;
  const place = () => cards.forEach((c, j) => {
    const k = (j - at + n) % n;
    c.dataset.k = n > 3 && k === n - 1 ? 'out' : k;
  });
  const load = () => {
    if (loaded) return;
    loaded = true;
    // decoded ahead, off the main thread, so the first opening does not stall on them
    cards.forEach(c => { const im = $('img', c); im.src = im.dataset.src; if (im.decode) im.decode().catch(() => {}); });
  };
  return {
    load,
    play() {
      load();
      clearInterval(timer);
      if (n > 1 && !still) timer = setInterval(() => { at = (at + 1) % n; place(); }, STEP);
    },
    stop() { clearInterval(timer); timer = null; },
    place
  };
}

boot({ page: 'home' }).then(db => {
  const win = $('[data-xwin]');
  win.innerHTML = PANES.filter(P => db.cats.get(P.id)).map((P, i) => paneHTML(db, P, i)).join('');
  const panes = $$('.xpane', win);
  const decks = new Map(panes.map(p => { const d = deck(p); d.place(); return [p, d]; }));

  // with a mouse: the pane under the pointer (or with the keyboard focus) opens; leaving the window closes it
  let on = null, enter = null, leave = null;
  const open = p => {
    if (on === p) return;
    if (on) decks.get(on).stop();
    on = p;
    if (p) win.dataset.on = p.dataset.id; else delete win.dataset.on;   // no attribute at all at rest: [data-on] means a pane is open
    panes.forEach(x => x.classList.toggle('is-on', x === p));
    if (p) decks.get(p).play();
  };
  panes.forEach(p => {
    p.addEventListener('mouseenter', () => { if (!pointer.matches) return; clearTimeout(leave); clearTimeout(enter); enter = setTimeout(() => open(p), 70); });
    p.addEventListener('focusin', () => { if (pointer.matches) open(p); });
  });
  win.addEventListener('mouseleave', () => { if (!pointer.matches) return; clearTimeout(enter); leave = setTimeout(() => open(null), 140); });
  win.addEventListener('focusout', e => { if (pointer.matches && !win.contains(e.relatedTarget)) open(null); });
  // the light follows the pointer over the pane: one soft disc, moved (no repaint of the pane)
  let raf = 0, last = null;
  win.addEventListener('mousemove', e => {
    last = e;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const p = last.target.closest('.xpane');
      if (!p) return;
      const r = p.getBoundingClientRect();
      $('.xpane__glow', p).style.transform = `translate3d(${last.clientX - r.left}px,${last.clientY - r.top}px,0)`;
    });
  });
  // the decks' pictures load once the page has settled, so the first hover finds them ready
  (window.requestIdleCallback || (f => setTimeout(f, 1200)))(() => decks.forEach(d => d.load()));

  // touch screens: one pane per screen; the one in view plays
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (pointer.matches) return;
    const d = decks.get(en.target);
    en.target.classList.toggle('is-on', en.isIntersecting);
    if (en.isIntersecting) d.play(); else d.stop();
  }), { threshold: 0.55 });
  panes.forEach(p => io.observe(p));
  pointer.addEventListener('change', () => { open(null); panes.forEach(p => { p.classList.remove('is-on'); decks.get(p).stop(); }); });
}).catch(err => { console.error(err); document.body.insertAdjacentHTML('afterbegin', '<p style="padding:20px">კატალოგი ვერ ჩაიტვირთა.</p>'); });
