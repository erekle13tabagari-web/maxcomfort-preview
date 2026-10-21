import { boot, $, $$, esc, bi, ui, arrow, card, num, money, crumbs, priceHTML, energyTag, energyTags, EKINDS, store, callback, openLayer, params } from './core.js';
import { sizeKind } from './api.js';

let db, p;
const ASSURE = `<div class="assure pdp__assure">
  <div>${bi('svc-delivery')}<span><b>მიწოდება</b>თბილისში და რეგიონებში</span></div>
  <div>${bi('svc-install')}<span><b>მონტაჟი</b>საკუთარი საინჟინრო გუნდი</span></div>
  <div>${bi('svc-warranty')}<span><b>გარანტია</b>ოფიციალური სერვისი</span></div>
</div>`;
let tab = location.hash.slice(1) || 'specs';   // the open information tab (kept when the colour or size changes)
const ENERGY = 'assets/energy/';
const SCENE = 'assets/img/scene/';
const fsize = b => (b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : num((b / 1048576).toFixed(1)) + ' MB');
const KEY = [   // [specification, icon, label, format, when]: the first four a product has become the key specs
  ['სიმძლავრე, kW', 'spec-power', 'სიმძლავრე', v => num(v) + ' kW'],
  ['გაგრილების სიმძლავრე, kW', 'spec-power', 'გაგრილება', v => num(v) + ' kW', s => !s['სიმძლავრე, kW']],
  ['გათბობის სიმძლავრე, kW', 'spec-temperature', 'გათბობა', v => num(v) + ' kW'],
  ['სიმძლავრე(W)', 'spec-power', 'სიმძლავრე', v => v + ' W'],
  ['ფართობი, მ²', 'spec-area', 'ოთახის ფართობი', v => v.replace(/მ²/g, '').replace(/\s*-\s*/, '-').trim() + ' მ²'],
  ['ჰაერის ხარჯი, მ³/სთ', 'sys-ventilation', 'ჰაერის ხარჯი', v => num(v) + ' მ³/სთ'],
  ['ტევადობა, ლ', 'spec-hotwater', 'ტევადობა', v => v + ' ლ'],
  ['ინვერტორული', 'spec-electric', 'ინვერტორი', v => v],
  ['საწვავი', 'spec-gas', 'საწვავი', v => v.split(' (')[0]],
  ['ქვაბის ტიპი', 'prd-boiler', 'ქვაბის ტიპი', v => v],
  ['კონტურების რაოდენობა', 'prd-underfloor', 'კონტური', v => v],
  ['სამუშაო წნევა, ბარი', 'spec-pressure', 'სამუშაო წნევა', v => v + ' ბარი'],
  ['მაქსიმალური წნევა, ბარი', 'spec-pressure', 'მაქს. წნევა', v => v + ' ბარი'],
  ['დიამეტრი', 'spec-dimensions', 'დიამეტრი', v => v],
  ['მასალა', 'spec-code', 'მასალა', v => v],
  ['გარანტია', 'svc-warranty', 'გარანტია', v => v],
  ['ხმაური, dBA', 'spec-noise', 'ხმაური', v => num(v) + ' dBA'],
  ['დიამეტრი, მმ', 'spec-dimensions', 'დიამეტრი', v => v + ' მმ'],
  ['მოხმარებული სიმძლავრე, W', 'spec-electric', 'მოხმარება', v => v + ' W'],
  ['მაცივარაგენტი', 'sys-cooling', 'მაცივარაგენტი', v => v],
  ['დამზადების ქვეყანა', 'ct-location', 'წარმოშობა', v => v]
];

function keySpecs() {
  const out = [];
  const cls = energyTags(p).map(x => x[1]);
  if (cls.length) out.push(['spec-energy', 'ენერგოკლასი', cls.join(' / ')]);
  KEY.forEach(([k, ic, t, f, when]) => { if (p.spec[k] && out.length < 4 && (!when || when(p.spec))) out.push([ic, t, f(p.spec[k])]); });
  return out.length < 2 ? '' : `<div class="keyspecs">${out.map(([ic, t, v]) => `<div class="keyspec">${bi(ic)}<b>${esc(v)}</b><small>${esc(t)}</small></div>`).join('')}</div>`;
}

function gallery() {
  const imgs = p.src.length ? p.src : [''];
  const ek = energyTags(p)[0], e = ek ? energyTag(ek[1], ek[0], ek[2]) : '';
  return `<div class="gallery">
    <div class="gallery__thumbs" role="tablist" aria-label="ფოტოები">${imgs.length > 1 ? imgs.map((s, i) => `<button class="${i ? '' : 'is-on'}" data-g="${i}" aria-label="ფოტო ${i + 1}"><img src="${s}" alt=""></button>`).join('') : ''}</div>
    <div class="gallery__main cut" data-zoom>
      <img src="${imgs[0]}" alt="${esc(p.title)}" style="view-transition-name:pimg" fetchpriority="high">
      <div class="card__tags">${e}${p.line ? `<span class="tag tag--blue">${esc(p.line)}</span>` : ''}</div>
      <span class="gallery__hint">${ui('zoom')}გასადიდებლად დააჭირეთ</span>
    </div>
  </div>`;
}

function options() {
  let html = '';
  if (p.group) {
    const g = db.groups.get(p.group);
    html += `<div><div class="opt__t">ფერი <span>${esc(p.color.name)}</span></div><div class="colors">${g.map(v => `<button class="sw sw--lg ${v.id === p.id ? 'is-on' : ''}" style="--c:${v.color.hex}" data-go="${v.id}" title="${esc(v.color.name)}" aria-label="${esc(v.color.name)}"></button>`).join('')}</div></div>`;
  }
  if (p.series) {
    const sizes = new Map();
    db.series.get(p.series).forEach(v => {
      // one button per capacity; keep the colour the customer chose
      const cur = sizes.get(v.size);
      if (!cur || (p.color && v.color && v.color.id === p.color.id)) sizes.set(v.size, v);
    });
    const kind = sizeKind(db.series.get(p.series));   // ზომა, სიმძლავრე, მოცულობა or მოდელი
    const room = kind === 'სიმძლავრე' && p.spec['ფართობი, მ²'] ? 'ოთახისთვის ' + p.spec['ფართობი, მ²'].replace(/მ²/g, '').replace(/\s*-\s*/, '-').trim() + ' მ²' : '';
    html += `<div><div class="opt__t">${kind} <span>${esc(room || (kind === 'მოდელი' ? '' : p.size))}</span></div><div class="sizes">${[...sizes.values()].map(v => `<button class="size ${v.size === p.size ? 'is-on' : ''}" data-go="${v.id}"><b>${esc(v.size)}</b><small>${v.price != null ? money(v.price) : 'მოთხოვნით'}</small></button>`).join('')}</div></div>`;
  }
  return html;
}

function info() {
  const brand = db.brandsById.get(p.brand);
  const logo = brand && brand.logo ? `<img class="only-l" src="assets/brand/partners/${brand.logo}.svg" alt="${esc(brand.name)}"><img class="only-d" src="assets/brand/partners/${brand.logo}-dark.svg" alt="">` : `<span>${esc(p.brandName)}</span>`;
  const fav = store.has('fav', p.id), cmp = store.has('cmp', p.id);
  const tags = energyTags(p);
  const energies = tags.length ? `<div class="energies">${tags.map(([k, c, top]) => `<button data-label>${energyTag(c, k, top)} ${EKINDS[k][0]}</button>`).join('')}</div>`
    : p.energy && p.energy.label ? `<div class="energies"><button class="elabel" data-label>${bi('spec-energy', 'ic ic--sm')}ენერგოეტიკეტი</button></div>` : '';
  const buy = p.price != null
    ? `<div class="qty qty--lg"><button data-q="-1" aria-label="ნაკლები">${ui('minus', 'ui--sm')}</button><input value="1" inputmode="numeric" aria-label="რაოდენობა" data-qin><button data-q="1" aria-label="მეტი">${ui('plus', 'ui--sm')}</button></div>
       <button class="btn btn--red" data-add="${p.id}" data-buy>${ui('bag')}კალათაში<span class="hide-sm">&nbsp;დამატება</span></button>`
    : `<button class="btn btn--red" data-ask="${p.id}" data-buy>${ui('phone')}ფასის მოთხოვნა</button>`;
  return `<div class="pinfo">
    <div class="pinfo__brand">${brand ? `<a href="catalog.html?b=${brand.id}" aria-label="${esc(brand.name)}">${logo}</a>` : logo}${p.sku ? `<span>კოდი ${esc(p.sku)}</span>` : ''}</div>
    <div>${p.line ? `<div class="pinfo__line">${esc(p.line)}</div>` : ''}<h1>${esc(p.title)}</h1></div>
    <div class="pinfo__meta">${p.stock == null ? '' : `<span class="stock ${p.stock ? '' : 'stock--out'}">${p.stock ? 'მარაგშია' : 'შეკვეთით'}</span>`}<a href="catalog.html?c=${p.cat}&s=${p.sub}">${esc(p.subName)}</a>${p.type ? `<span>${esc(p.type)}</span>` : ''}</div>
    <div class="pinfo__price"><div><small>ფასი</small>${priceHTML(p, 'price--lg')}</div>${energies}</div>
    ${options()}
    <div class="buy">${buy}
      <button class="iconbtn ${fav ? 'is-on' : ''}" data-fav="${p.id}" aria-label="რჩეულებში" title="რჩეულებში">${ui('heart')}</button>
      <button class="iconbtn ${cmp ? 'is-on' : ''}" data-cmp="${p.id}" aria-label="შედარება" title="შედარება">${ui('cmp')}</button></div>
    <div class="consult">${bi('svc-consult')}<p><b>არ ხართ დარწმუნებული?</b>ინჟინერი დაგირეკავთ და სიმძლავრეს თქვენს ოთახზე გამოთვლის.</p><button class="btn btn--ghost btn--sm" data-ask="${p.id}">დამირეკეთ</button></div>
  </div>`;
}

function blocks() {
  const list = [];
  const rows = [['ბრენდი', p.brandName], ['კოდი', p.sku], ...p.specs.filter(([k]) => k !== 'კოდი')].filter(r => r[1]);
  list.push(['specs', 'მახასიათებლები', `<dl class="specs">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(num(v))}</dd></div>`).join('')}</dl>`]);
  if (p.feats.length || p.desc) list.push(['feats', 'უპირატესობები', (p.desc ? `<p class="desc">${esc(p.desc)}</p>` : '') + (p.feats.length ? `<ul class="feats bullets">${p.feats.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : '')]);
  const docs = (p.docs || []).map(d => ({ ...d, f: /[\/:]/.test(d.f) ? d.f : ENERGY + d.f }));
  if (docs.length) list.push(['docs', 'ჩამოტვირთვები', `<div class="docs">${docs.map(d => `<a class="doc" href="${d.f}" target="_blank" rel="noopener">${bi('spec-code')}<span><b>${esc(d.t)}</b><small>${['PDF', d.s ? fsize(d.s) : '', d.n, d.l].filter(Boolean).map(esc).join(' · ')}</small></span>${ui('download')}</a>`).join('')}</div>`]);
  list.push(['service', 'მომსახურება', `<div class="assure assure--4">
    <div>${bi('svc-consult')}<span><b>კონსულტაცია</b>შევარჩევთ სწორ სიმძლავრეს</span></div>
    <div>${bi('svc-delivery')}<span><b>მიწოდება</b>ან გატანა ${esc(String(window.MC_CONFIG.showrooms.length))} შოურუმიდან</span></div>
    <div>${bi('svc-install')}<span><b>მონტაჟი</b>მწარმოებლის სტანდარტით</span></div>
    <div>${bi('svc-service')}<span><b>სერვისი</b>საგარანტიო და შემდგომი</span></div></div>`]);
  if (!list.some(([id]) => id === tab)) tab = list[0][0];
  // tabs numbered like the brand book's information blocks (p.45)
  return {
    nav: list.map(([id, t], i) => `<button class="tab ${id === tab ? 'is-on' : ''}" role="tab" id="t-${id}" aria-controls="b-${id}" aria-selected="${id === tab}" tabindex="${id === tab ? 0 : -1}" data-tab="${id}">${esc(t)}</button>`).join(''),
    body: list.map(([id, t, html]) => `<section class="tabpanel" role="tabpanel" id="b-${id}" aria-labelledby="t-${id}" ${id === tab ? '' : 'hidden'}>${html}</section>`).join('')
  };
}

/** Up close: the captioned story (Kirigamine Style), or the marketing pictures of library products. */
function story() {
  const sec = $('[data-story]');
  if (p.story && p.story.length) {
    sec.className = 'story';
    $('[data-story-h]', sec).textContent = p.line || p.brandName;
    $('[data-story-rows]', sec).innerHTML = p.story.map((s, i) => `<article class="srow ${i % 2 ? 'srow--flip' : ''}"><img src="${SCENE + s.img}" alt="${esc(s.t)}" loading="lazy"><div><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></div></article>`).join('');
    $('[data-scenes]', sec).innerHTML = '';
  } else if (p.scenes && p.scenes.length) {
    sec.className = 'story story--light';
    $('[data-story-h]', sec).textContent = 'გალერეა';
    $('[data-story-rows]', sec).innerHTML = '';
    $('[data-scenes]', sec).innerHTML = p.scenes.map(f => `<img src="${SCENE + f}" alt="${esc(p.title)}" loading="lazy">`).join('');
  }
  sec.hidden = !((p.story && p.story.length) || (p.scenes && p.scenes.length));
}

function related() {
  const seen = new Set([p.group || p.id]);
  const pick = list => list.filter(x => { const k = x.group || x.id; if (seen.has(k) || x.id === p.id) return false; seen.add(k); return true; });
  const series = p.series ? pick(db.series.get(p.series)) : [];
  const same = pick(db.products.filter(x => x.sub === p.sub && x.price != null).sort((a, b) => Math.abs((a.price || 0) - (p.price || 0)) - Math.abs((b.price || 0) - (p.price || 0))));
  return [...series, ...same].slice(0, 4);
}

function ld() {
  const data = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.title, sku: p.sku,
    brand: p.brandName ? { '@type': 'Brand', name: p.brandName } : undefined,
    image: p.src.map(s => new URL(s, location.href).href), category: p.catName + ' / ' + p.subName,
    offers: p.price != null ? { '@type': 'Offer', price: p.price, priceCurrency: 'GEL', availability: p.stock == null ? undefined : 'https://schema.org/' + (p.stock ? 'InStock' : 'BackOrder'), url: location.href } : undefined
  };
  let s = $('#ld');
  if (!s) { s = document.createElement('script'); s.type = 'application/ld+json'; s.id = 'ld'; document.head.appendChild(s); }
  s.textContent = JSON.stringify(data);
}

function render() {
  document.title = p.title + ' · ' + (p.brandName || 'მაქს კომფორტი');
  $('meta[name=description]').content = `${p.title}${p.brandName ? ', ' + p.brandName : ''}: ${p.price != null ? money(p.price) + '. ' : ''}${p.subName}. მიწოდება, მონტაჟი და გარანტია მაქს კომფორტისგან.`;
  $('[data-crumbs]').innerHTML = crumbs([['კატალოგი', 'catalog.html'], [p.catName, 'catalog.html?c=' + p.cat], [p.subName, `catalog.html?c=${p.cat}&s=${p.sub}`], [p.title, null]]);
  // key specifications and the service promises sit under the photos on wide screens (CSS grid areas),
  // so the two columns end together; on phones they follow the price and buy button
  $('[data-pdp]').innerHTML = gallery() + info() + `<div class="pdp__extra">${keySpecs()}</div>` + ASSURE;
  story();
  const b = blocks();
  $('[data-info-nav]').innerHTML = b.nav;
  $('[data-blocks]').innerHTML = b.body;
  const rel = related();
  $('[data-related]').hidden = !rel.length;
  $('[data-related] .grid').innerHTML = rel.map(x => card(db, x)).join('');
  const seenList = store.seen.filter(id => id !== p.id).map(id => db.byId.get(id)).filter(Boolean).slice(0, 4);
  $('[data-seen]').hidden = seenList.length < 2;
  $('[data-seen] .grid').innerHTML = seenList.map(x => card(db, x, { cls: 'card--sm' })).join('');
  $('[data-bb]').innerHTML = `<span class="buybar__img"><img src="${p.src[0] || ''}" alt=""></span><span class="buybar__t"><b>${esc(p.title)}</b>${priceHTML(p)}</span>
    ${p.price != null ? `<button class="btn btn--red" data-add="${p.id}">${ui('bag')}კალათაში</button>` : `<button class="btn btn--red" data-ask="${p.id}">ფასის მოთხოვნა</button>`}`;
  ld();
  store.seenAdd(p.id);
  watchBuy();
}

/* ---------- interactions ---------- */
let io;
function watchBuy() {
  if (io) io.disconnect();
  const bar = $('.buybar'), btn = $('[data-buy]');
  io = new IntersectionObserver(([en]) => bar.classList.toggle('is-on', !en.isIntersecting && en.boundingClientRect.top < 0), { threshold: 0 });
  io.observe(btn);
}

function wire() {
  const main = $('main');
  main.addEventListener('click', e => {
    const go = e.target.closest('[data-go]');
    if (go) {
      const v = db.byId.get(+go.dataset.go);
      if (!v || v.id === p.id) return;
      p = v;
      history.replaceState(null, '', 'product.html?id=' + v.id + '#' + tab);
      const y = scrollY;
      const swap = () => { render(); scrollTo(0, y); };
      // a transition cut short (another click, leaving the page) is no error
      if (document.startViewTransition) document.startViewTransition(swap).ready.catch(() => {}); else swap();
      return;
    }
    const th = e.target.closest('[data-g]');
    if (th) {
      $$('[data-g]').forEach(b => b.classList.toggle('is-on', b === th));
      const img = $('.gallery__main img');
      img.style.opacity = 0;
      setTimeout(() => { img.src = p.src[+th.dataset.g]; img.style.opacity = 1; }, 150);
      return;
    }
    const q = e.target.closest('[data-q]');
    if (q) {
      const inp = $('[data-qin]'), v = Math.min(99, Math.max(1, (+inp.value || 1) + +q.dataset.q));
      inp.value = v;
      $('[data-buy]').dataset.qty = v;
      return;
    }
    if (e.target.closest('[data-label]')) {
      const m = $('#label');
      $('img', m).src = ENERGY + p.energy.label;
      openLayer(m);
      return;
    }
    const z = e.target.closest('[data-zoom]');
    if (z) z.classList.toggle('is-zoom');
  });
  main.addEventListener('change', e => {
    if (e.target.matches('[data-qin]')) {
      const v = Math.min(99, Math.max(1, parseInt(e.target.value, 10) || 1));
      e.target.value = v;
      $('[data-buy]').dataset.qty = v;
    }
  });
  main.addEventListener('mousemove', e => {
    const z = e.target.closest('[data-zoom]');
    if (!z) return;
    const r = z.getBoundingClientRect(), img = $('img', z);
    img.style.setProperty('--zx', ((e.clientX - r.left) / r.width * 100) + '%');
    img.style.setProperty('--zy', ((e.clientY - r.top) / r.height * 100) + '%');
  });
  main.addEventListener('mouseleave', e => { const z = $('[data-zoom]'); if (z) z.classList.remove('is-zoom'); }, true);

  // information tabs: one panel at a time; the open tab is in the address (#feats ...)
  const nav = $('[data-info-nav]');
  const open = (id, focus) => {
    tab = id;
    $$('[data-tab]', nav).forEach(b => { const on = b.dataset.tab === id; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); if (on) b.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); });
    $$('.tabpanel').forEach(s => { s.hidden = s.id !== 'b-' + id; });
    history.replaceState(null, '', location.pathname + location.search + '#' + id);
  };
  nav.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) open(b.dataset.tab); });
  nav.addEventListener('keydown', e => {
    const all = $$('[data-tab]', nav), i = all.findIndex(b => b.dataset.tab === tab);
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: all.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    open(all[(to + all.length) % all.length].dataset.tab, true);
  });
}

boot({ cat: null }).then(d => {
  db = d;
  const id = +params().get('id');
  p = db.byId.get(id);
  if (!p) {
    $('[data-pdp]').innerHTML = `<div class="empty" style="grid-column:1/-1">${bi('sys-home', 'ic ic--xl')}<h3>პროდუქტი ვერ მოიძებნა</h3><p>შესაძლოა ის აღარ იყიდება.</p><a class="btn btn--ghost" href="catalog.html">კატალოგი</a></div>`;
    $('.info').hidden = true;
    return;
  }
  wire();
  render();
}).catch(err => console.error(err));
