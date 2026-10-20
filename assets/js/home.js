import { boot, $, $$, esc, bi, ui, arrow, card, money, num, groupLead, priceHTML, reveal, store } from './core.js';

const HERO = 'assets/img/hero/';
const SLIDES = [
  {
    id: 'cooling', icon: 'sys-cooling', tab: 'კონდიცირება', note: 'Kirigamine Style',
    eyebrow: 'Mitsubishi Electric', title: 'სიგრილე სტილით',
    lead: 'Kirigamine Style: ლალისფერი წითელი, ონიქსის შავი და თეთრი. A+++ კლასი გაგრილებაზეც და გათბობაზეც, ჩაშენებული Wi-Fi.',
    group: 2159, colors: { red: 'cool-ln-red', black: 'cool-ln-black', white: 'cool-ln-white' }, w: 680, wall: true,
    chips: p => [['spec-energy', 'A+++ / A+++', 'გაგრილება / გათბობა', 'left:2%;top:12%'], ['spec-wifi', 'Wi-Fi', 'ჩაშენებული ადაპტერი', 'right:0;top:4%'], ['spec-area', num(p.spec['სიმძლავრე, kW']) + ' kW', '15-25 მ² ოთახისთვის', 'left:10%;bottom:12%']]
  },
  {
    id: 'heating', icon: 'sys-heating', tab: 'გათბობა', note: 'ქვაბები და სანთურები',
    eyebrow: 'Beretta · Riello · Warmhaus', title: 'სითბო მთელი ზამთარი',
    lead: 'კედლის და იატაკის ქვაბები, სანთურები, რადიატორები და იატაკის გათბობა. სიმძლავრეს თქვენს სახლზე გავთვლით.',
    img: 'heat-lawa-black', dark: 'heat-lawa-white', w: 340, wall: true, link: 'catalog.html?c=heating&s=boilers', cat: 'heating',
    chips: () => [['svc-certified', 'ოფიციალური', 'დისტრიბუტორი და გარანტია', 'left:4%;top:16%'], ['svc-install', 'მონტაჟი', 'საკუთარი საინჟინრო გუნდი', 'right:2%;bottom:18%']]
  },
  {
    id: 'ventilation', icon: 'sys-ventilation', tab: 'ვენტილაცია', note: 'რეკუპერატორები',
    eyebrow: 'Vortice', title: 'სუფთა ჰაერი სახლში',
    lead: 'რეკუპერატორი ცვლის ჰაერს და ინარჩუნებს სითბოს. საყოფაცხოვრებო და კომერციული ვენტილაცია, ჰაერსატარები და ცხაურები.',
    img: 'vent-hr300', w: 420, product: 900003, cat: 'ventilation',
    chips: () => [['prd-heatpump', 'რეკუპერაცია', 'სითბო რჩება სახლში', 'left:2%;top:20%'], ['spec-wifi', 'IoT', 'მართვა აპლიკაციით', 'right:2%;bottom:20%']]
  },
  {
    id: 'water', icon: 'sys-water', tab: 'წყალმომარაგება', note: 'წყლის გამაცხელებლები',
    eyebrow: 'ბოილერები, მილები, ფიტინგები', title: 'ცხელი წყალი ყოველთვის',
    lead: 'ელექტრო, გაზის და თბური ტუმბოს ბოილერები, მილები, ფიტინგები და ფილტრები: სრული სისტემა ერთ ადგილას.',
    img: 'water-7200v', w: 260, link: 'catalog.html?c=water&s=heaters', cat: 'water',
    chips: () => [['spec-hotwater', '50-800 ლ', 'მოცულობის ბოილერები', 'left:6%;top:22%'], ['spec-temperature', 'თბური ტუმბო', 'დაზოგეთ ენერგია', 'right:6%;bottom:22%']]
  }
];
const DUR = 7000;

function heroHTML(db) {
  const copy = [], stage = [], tabs = [];
  SLIDES.forEach((s, i) => {
    let p = null, href = s.link, from = '';
    if (s.group) {
      p = db.byId.get(s.group);
      href = p.url;
      from = `<div class="hero__from"><span>ფასი</span>${priceHTML(p)}<span data-hero-cname>${esc(p.color.name)}</span></div>`;
    } else if (s.product) {
      p = db.byId.get(s.product);
      href = p ? p.url : href;
      from = `<div class="hero__from"><span>${db.cats.get(s.cat).count} პროდუქტი კატეგორიაში</span></div>`;
    } else {
      from = `<div class="hero__from"><span>${db.cats.get(s.cat).count} პროდუქტი კატეგორიაში</span></div>`;
    }
    copy.push(`<div class="hero__slide ${i ? '' : 'is-on'}" data-i="${i}" ${i ? 'aria-hidden="true"' : ''}>
      <span class="eyebrow">${esc(s.eyebrow)}</span>
      <h${i ? 2 : 1} class="display">${esc(s.title)}</h${i ? 2 : 1}>
      <p class="lead">${esc(s.lead)}</p>
      <div class="hero__cta"><a class="btn btn--red" href="${href}">${s.group ? 'ყიდვა' : 'ნახვა'} ${arrow()}</a><a class="btn btn--ghost" href="catalog.html?c=${s.id}">კატეგორია</a></div>
      ${from}
    </div>`);
    const chips = s.chips(p || {}).map(([ic, b, sm, pos]) => `<div class="chip" style="${pos}">${bi(ic)}<span><b>${esc(b)}</b>${esc(sm)}</span></div>`).join('');
    const img = s.colors ? s.colors[p.color.id] : s.img;
    const colors = s.colors ? `<div class="hero__colors">${db.groups.get(p.group).map(v => `<button class="sw ${v.id === p.id ? 'is-on' : ''}" style="--c:${v.color.hex}" data-hero-sw="${v.id}" aria-label="${esc(v.color.name)}"></button>`).join('')}<span>${db.groups.get(p.group).length} ფერი</span></div>` : '';
    stage.push(`<div class="hero__prod ${s.wall ? 'hero__prod--wall' : ''} ${i ? '' : 'is-on'}" data-i="${i}" style="--w:${s.w}px">
      <img ${s.dark ? 'class="only-l" ' : ''}src="${HERO + img}.webp" alt="${esc(p ? p.title : s.tab)}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}>${s.dark ? `<img class="only-d" src="${HERO + s.dark}.webp" alt="" loading="lazy">` : ''}${chips}${colors}</div>`);
    tabs.push(`<button class="tab4 ${i ? '' : 'is-on'}" role="tab" aria-selected="${!i}" data-i="${i}" style="--dur:${DUR}ms">
      <span class="tab4__bar"><i></i></span>${bi(s.icon)}<span><b>${esc(s.tab)}</b><small>${esc(s.note)}</small></span></button>`);
  });
  $('[data-hero-copy]').innerHTML = copy.join('');
  $('[data-hero-stage]').innerHTML = stage.join('');
  $('[data-hero-tabs]').innerHTML = tabs.join('');
}

function heroRun(db) {
  const hero = $('.hero');
  let cur = 0, timer = null, paused = false;
  const go = i => {
    cur = (i + SLIDES.length) % SLIDES.length;
    $$('.hero__slide,.hero__prod,.tab4', hero).forEach(el => {
      const on = +el.dataset.i === cur;
      el.classList.toggle('is-on', on);
      if (el.classList.contains('tab4')) el.setAttribute('aria-selected', on);
      if (el.classList.contains('hero__slide')) el.toggleAttribute('aria-hidden', !on);
    });
    // restart the progress bar
    const bar = $(`.tab4[data-i="${cur}"] .tab4__bar i`, hero);
    bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
    schedule();
  };
  const schedule = () => { clearTimeout(timer); if (!paused) timer = setTimeout(() => go(cur + 1), DUR); };
  $$('.tab4', hero).forEach(t => t.addEventListener('click', () => go(+t.dataset.i)));
  const pause = on => { paused = on; $$('.tab4', hero).forEach(t => t.classList.toggle('is-paused', on)); on ? clearTimeout(timer) : schedule(); };
  hero.addEventListener('mouseenter', () => pause(true));
  hero.addEventListener('mouseleave', () => pause(false));
  hero.addEventListener('focusin', () => pause(true));
  document.addEventListener('visibilitychange', () => pause(document.hidden));
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) paused = true;
  schedule();

  // colours of the cooling slide
  hero.addEventListener('click', e => {
    const b = e.target.closest('[data-hero-sw]');
    if (!b) return;
    const v = db.byId.get(+b.dataset.heroSw), s = SLIDES[0];
    const prod = b.closest('.hero__prod'), img = $('img', prod);
    img.style.opacity = 0;
    setTimeout(() => { img.src = HERO + s.colors[v.color.id] + '.webp'; img.onload = () => (img.style.opacity = 1); }, 180);
    $$('[data-hero-sw]', prod).forEach(x => x.classList.toggle('is-on', x === b));
    const slide = $('.hero__slide[data-i="0"]', hero);
    $('.btn--red', slide).href = v.url;
    $('.price', slide).outerHTML = priceHTML(v);
    $('[data-hero-cname]', slide).textContent = v.color.name;
  });
}

function windowHTML(db) {
  const pane = (id, cls, img, w, extra = '') => {
    const c = db.cats.get(id);
    const subs = c.subs.filter(s => s.count).map(s => `<a href="catalog.html?c=${id}&s=${s.id}">${esc(s.name)}</a>`).join('') + extra;
    return `<article class="pane ${cls} reveal">
      <a class="pane__go" href="catalog.html?c=${id}" aria-label="${esc(c.name)}"></a>
      <div class="pane__top">${bi(c.icon)}<h3>${esc(c.name)}</h3><p class="pane__lead">${esc(c.lead)}</p></div>
      <div><div class="pane__links">${subs}</div><span class="pane__count">${c.count} პროდუქტი ${arrow()}</span></div>
      <img class="pane__img" src="${HERO + img}.webp" alt="" loading="lazy" style="--w:${w}">
    </article>`;
  };
  const ducts = db.cats.get('ducts');
  $('[data-window]').innerHTML =
    pane('heating', 'pane--heat', 'heat-lawa-white', '34%') +
    pane('cooling', 'pane--cool', 'cool-ln-white', '52%') +
    pane('ventilation', 'pane--vent', 'vent-hrw', '46%', `<a href="catalog.html?c=ducts">${esc(ducts.name)}</a>`) +
    pane('water', 'pane--water', 'water-7200v', '20%');
}

const RAIL = [
  { t: 'კონდიციონერები', f: p => p.cat === 'cooling' && ['wall', 'cassette', 'ducted'].includes(p.sub) },
  { t: 'ქვაბები და სანთურები', f: p => p.cat === 'heating' && ['boilers', 'burners'].includes(p.sub) && p.price > 1000 },
  { t: 'წყლის გამაცხელებლები', f: p => p.sub === 'heaters' && p.price > 300 },
  { t: 'რადიატორები და საშრობები', f: p => p.sub === 'radiators' && p.price > 100 },
  { t: 'თერმოსტატები', f: p => p.sub === 'control' || p.sub === 'cool-acc' }
];
function railItems(db, f) {
  const seen = new Set();
  return db.products.filter(f)
    .map(p => groupLead(db, p)).filter(p => !seen.has(p.id) && seen.add(p.id))
    .sort((a, b) => (/\/(mc|lib)-/.test(b.src[0]) - /\/(mc|lib)-/.test(a.src[0])) || (!!b.energy - !!a.energy) || (b.price - a.price))
    .slice(0, 12);
}
function rail(db) {
  const tabs = $('[data-rail-tabs]'), track = $('[data-rail]');
  tabs.innerHTML = RAIL.map((r, i) => `<button class="${i ? '' : 'is-on'}" data-r="${i}">${esc(r.t)}</button>`).join('');
  const show = i => {
    track.innerHTML = railItems(db, RAIL[i].f).map(p => card(db, p)).join('');
    track.scrollLeft = 0;
    $$('.card', track).forEach((c, k) => { c.classList.add('reveal-in'); c.style.animationDelay = k * 40 + 'ms'; });
    navState();
  };
  tabs.addEventListener('click', e => {
    const b = e.target.closest('[data-r]');
    if (!b) return;
    $$('button', tabs).forEach(x => x.classList.toggle('is-on', x === b));
    show(+b.dataset.r);
  });
  const [prev, next] = $$('[data-rail-nav] button');
  const step = () => track.clientWidth * .9;
  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  const navState = () => { prev.disabled = track.scrollLeft < 8; next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8; };
  track.addEventListener('scroll', navState, { passive: true });
  show(0);
}

/* ---------- spotlight: featured lines in an endless carousel ---------- */
const SPOTS = [
  {
    key: 'ln', eyebrow: 'Mitsubishi Electric', title: 'Kirigamine Style', lead: 'კონდიციონერი, რომელიც ავეჯივით გამოიყურება: ღრმა ფერი გამჭვირვალე ზედა ფენის ქვეშ, ორმაგი ზონის კლიმატის კონტროლი, ჰაერის პლაზმური წმენდა და ჩაშენებული Wi-Fi.',
    go: 'ნახეთ ფერები და ფასები',
    build(db) {
      const lead = db.byId.get(2159), group = db.groups.get(lead.group);
      const series = db.series.get(lead.series), prices = series.map(x => x.price).filter(Boolean);
      const imgs = { red: 'cool-ln-red', black: 'cool-ln-black', white: 'cool-ln-white' };
      return {
        url: lead.url,
        looks: group.map(v => ({ id: v.id, name: v.color.name, hex: v.color.hex, img: HERO + imgs[v.color.id] + '.webp', url: v.url, alt: v.title + ', ' + v.color.name })),
        facts: [[lead.energy.c, 'გაგრილება'], [lead.energy.h, 'გათბობა'],
          [`${num(series[0].sizeSort / 10)}-${num((series[series.length - 1].sizeSort / 10).toFixed(1))}`, `kW, ${new Set(series.map(x => x.size)).size} სიმძლავრე`],
          [money(Math.min(...prices)).replace(/\s*₾$/, ''), '₾-დან']]
      };
    }
  },
  {
    key: 's360', eyebrow: 'Samsung', title: '360 Cassette', lead: 'მრგვალი კასეტური კონდიციონერი, რომელიც ჰაერს 360°-ზე, თანაბრად ანაწილებს: ოთახის ყველა კუთხე გრილდება, პირდაპირი ცივი ნაკადის გარეშე. თეთრი ან შავი პანელი ნებისმიერ ჭერს ერგება.',
    go: 'ნახეთ სიმძლავრეები',
    build(db) {
      const units = [910153, 910154, 910155, 910146].map(id => db.byId.get(id)).filter(Boolean);
      const kw = units.map(p => parseFloat(String(p.spec['გაგრილების სიმძლავრე, kW'] || p.spec['სიმძლავრე, kW'] || '').replace(',', '.'))).filter(Boolean).sort((a, b) => a - b);
      const url = (units[0] || {}).url || 'catalog.html?c=cooling&s=cassette';
      return {
        url,
        looks: [{ id: 'white', name: 'თეთრი პანელი', hex: '#F4F4F1', img: HERO + 's360-white.webp', url, alt: 'Samsung 360 Cassette, თეთრი პანელი' },
                { id: 'black', name: 'შავი პანელი', hex: '#1F1E22', img: HERO + 's360-black.webp', url, alt: 'Samsung 360 Cassette, შავი პანელი' }],
        facts: [['360°', 'ჰაერის ნაკადი'],
          kw.length ? [`${num(kw[0].toFixed(1))}-${num(kw[kw.length - 1].toFixed(1))}`, `kW, ${kw.length} სიმძლავრე`] : null,
          ['2', 'პანელის ფერი']].filter(Boolean)
      };
    }
  }
];

function spotSlide(s, d, i, n) {
  const first = d.looks[0];
  return `<article class="spot__slide spot--${s.key}" aria-roledescription="slide" aria-label="${i + 1} / ${n}" data-key="${s.key}">
    <div class="spot__bg" aria-hidden="true"></div>
    <div class="wrap">
      <div class="spot__copy">
        <span class="eyebrow">${esc(s.eyebrow)}</span>
        <h2 class="h1">${esc(s.title)}</h2>
        <p class="lead">${esc(s.lead)}</p>
        <div class="spot__colors">${d.looks.map((v, k) => `<button type="button" class="sw sw--lg ${k ? '' : 'is-on'}" style="--c:${v.hex}" data-look="${v.id}" aria-label="${esc(v.name)}"></button>`).join('')}<span class="spot__cname" data-cname>${esc(first.name)}</span></div>
        <div class="spot__facts">${d.facts.map(([b, t]) => `<div><b>${esc(b)}</b><small>${esc(t)}</small></div>`).join('')}</div>
        <a class="btn btn--red" data-go href="${first.url}">${esc(s.go)} ${arrow()}</a>
      </div>
      <div class="spot__stage">${d.looks.map((v, k) => `<img class="${k ? '' : 'is-on'}" data-look="${v.id}" src="${v.img}" alt="${esc(v.alt)}" loading="lazy">`).join('')}</div>
    </div>
  </article>`;
}

function spotlight(db) {
  const sec = $('[data-spot]'), track = $('[data-spot-track]', sec), dots = $('[data-spot-dots]', sec);
  const data = SPOTS.map(s => ({ s, d: s.build(db) })).filter(x => x.d.looks.length);
  const n = data.length;
  const slides = data.map(({ s, d }, i) => spotSlide(s, d, i, n));
  // endless: a copy of the last slide before the first and of the first after the last
  track.innerHTML = (n > 1 ? slides[n - 1] : '') + slides.join('') + (n > 1 ? slides[0] : '');
  $$('.spot__slide', track).forEach((el, k) => {
    const copy = n > 1 && (k === 0 || k === n + 1);
    el.toggleAttribute('inert', copy);
    if (copy) el.setAttribute('aria-hidden', 'true');
  });
  dots.innerHTML = data.map(({ s }, i) => `<button type="button" class="spot__dot ${i ? '' : 'is-on'}" data-dot="${i}" aria-label="${esc(s.title)}"></button>`).join('');
  sec.classList.toggle('spot--single', n < 2);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let at = n > 1 ? 1 : 0, timer = null, paused = false, visible = false;
  const place = animate => {
    track.style.transition = animate && !still ? '' : 'none';
    track.style.transform = `translateX(${-at * 100}%)`;
    const real = n > 1 ? (at - 1 + n) % n : 0;
    $$('[data-dot]', dots).forEach((b, k) => { b.classList.toggle('is-on', k === real); b.setAttribute('aria-current', k === real); });
  };
  let later = null;
  const go = step => {
    if (n < 2) return;
    settle();                 // a jump still owed from the last move
    at += step;
    place(true);
    clearTimeout(later);
    later = setTimeout(settle, still ? 0 : 850);   // in case transitionend never comes (background tab)
    restart();
  };
  const settle = () => {   // on a copy: jump to the real slide without anyone seeing it
    if (at === 0) { at = n; place(false); } else if (at === n + 1) { at = 1; place(false); }
  };
  track.addEventListener('transitionend', e => { if (e.target === track) settle(); });
  const restart = () => {
    clearInterval(timer);
    if (n > 1 && !still && !paused && visible && !document.hidden) timer = setInterval(() => go(1), 7000);
  };
  $('[data-spot-prev]', sec).addEventListener('click', () => go(-1));
  $('[data-spot-next]', sec).addEventListener('click', () => go(1));
  dots.addEventListener('click', e => { const b = e.target.closest('[data-dot]'); if (b) { at = +b.dataset.dot + 1; place(true); restart(); } });
  // pause while the visitor reads or points at it; play only when it is on screen
  sec.addEventListener('mouseenter', () => { paused = true; restart(); });
  sec.addEventListener('mouseleave', () => { paused = false; restart(); });
  sec.addEventListener('focusin', () => { paused = true; restart(); });
  sec.addEventListener('focusout', e => { if (!sec.contains(e.relatedTarget)) { paused = false; restart(); } });
  document.addEventListener('visibilitychange', restart);
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) sec.classList.add('is-in'); restart(); }, { threshold: .3 }).observe(sec);
  // swipe on touch screens
  let x0 = null;
  track.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') x0 = e.clientX; });
  track.addEventListener('pointerup', e => { if (x0 != null && Math.abs(e.clientX - x0) > 50) go(e.clientX < x0 ? 1 : -1); x0 = null; });
  // colour / panel swatches
  sec.addEventListener('click', e => {
    const b = e.target.closest('.spot__colors [data-look]');
    if (!b) return;
    const slide = b.closest('.spot__slide'), key = slide.dataset.key, d = data.find(x => x.s.key === key).d, v = d.looks.find(x => x.id == b.dataset.look);
    $$(`.spot--${key}`, track).forEach(sl => {   // the copies follow, so the loop never jumps back to another colour
      $$('.spot__colors .sw', sl).forEach(x => x.classList.toggle('is-on', x.dataset.look == v.id));
      $$('.spot__stage img', sl).forEach(x => x.classList.toggle('is-on', x.dataset.look == v.id));
      $('[data-cname]', sl).textContent = v.name;
      $('[data-go]', sl).href = v.url;
    });
  });
  place(false);
}

function brands(db) {
  const logos = ['mitsubishi-electric', 'beretta', 'riello', 'warmhaus', 'vortice', 'tiemme', 'samsung', 'emtas', 'omega', 'sira', 'maco', 'izocam', 'hitte', 'soprema', 'rovall', 'piazza', 'untes', 'teknix', 'sakra', 'fir', 'facot', 'hoffman-plus', 'sk-technik'];
  const byLogo = new Map(db.brands.filter(b => b.logo).map(b => [b.logo, b]));
  const one = logos.map(l => {
    const b = byLogo.get(l);
    return `<a ${b ? `href="catalog.html?b=${b.id}"` : 'tabindex="-1"'} aria-label="${esc(b ? b.name : l)}"><img class="only-l" src="assets/brand/partners/${l}.svg" alt="${esc(b ? b.name : l)}" loading="lazy"><img class="only-d" src="assets/brand/partners/${l}-dark.svg" alt="" loading="lazy"></a>`;
  }).join('');
  $('[data-brands]').innerHTML = one + one.replace(/<a /g, '<a aria-hidden="true" tabindex="-1" ');
}

function seen(db) {
  const list = store.seen.map(id => db.byId.get(id)).filter(Boolean).slice(0, 4);
  if (list.length < 2) return;
  const sec = $('[data-seen]');
  sec.hidden = false;
  $('.grid', sec).innerHTML = list.map(p => card(db, p, { cls: 'card--sm' })).join('');
}

boot({ page: 'home' }).then(db => {
  heroHTML(db);
  heroRun(db);
  windowHTML(db);
  rail(db);
  spotlight(db);
  brands(db);
  seen(db);
  reveal();
}).catch(err => { console.error(err); document.body.insertAdjacentHTML('afterbegin', '<p style="padding:20px">კატალოგი ვერ ჩაიტვირთა.</p>'); });
