import { boot, $, $$, esc, bi, ui, money, safeUrl, C } from './core.js';

// the map shows the showroom's map address (admin panel: an address or coordinates), else its address in Tbilisi
const mapSrc = s => 'https://www.google.com/maps?output=embed&q=' + encodeURIComponent(s.map || 'თბილისი, ' + s.address);

boot({}).then(() => {
  // the brands we represent (brand book p.3; the partners' colour logos, owner's file "ლოგოები ფერადი პარტნიორები"): the admin panel's
  // brands marked for the strip, each in its colours on a white chip in the MC Blue tile; a brand with an ID opens its page;
  // tall and wide logos are evened out by their shape
  const brands = ((C.cms || {}).brands || []).filter(b => b && b.strip && b.logo && safeUrl(b.logo, true));
  if (brands.length) {
    $('[data-brands]').innerHTML = brands.map(b => { const img = `<img src="${esc(b.logo)}" alt="${esc(b.name)}" loading="lazy">`; return b.id ? `<a href="catalog.html?b=${encodeURIComponent(b.id)}" title="${esc(b.name)}">${img}</a>` : `<span title="${esc(b.name)}">${img}</span>`; }).join('');
    $('[data-brands-box]').hidden = false;
    // even rows and columns (owner, 2026-11-26): of the column counts that fit (chips 88-240 px wide), the most that
    // divide the number of logos (21: 7 x 3 on a computer, 3 x 7 on a phone); none does: the one with the fullest last row
    const list = $('[data-brands]'), n = brands.length;
    const fit = () => {
      const w = list.clientWidth, gap = parseFloat(getComputedStyle(list).columnGap) || 0;
      if (!w) return;
      const hi = Math.max(1, Math.floor((w + gap) / (88 + gap))), lo = Math.min(hi, Math.ceil((w + gap) / (240 + gap)));
      let best = hi, full = -1;
      for (let c = hi; c >= lo; c--) { const f = (n % c || c) / c; if (f > full) { full = f; best = c; } }
      list.style.gridTemplateColumns = `repeat(${best},minmax(0,1fr))`;
    };
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(list);
    const even = img => { const a = img.naturalWidth / img.naturalHeight; if (a > 0) img.style.height = Math.round(Math.max(18, Math.min(40, 60 / Math.sqrt(a)))) + 'px'; };
    $$('[data-brands] img').forEach(img => (img.complete ? even(img) : img.addEventListener('load', () => even(img), { once: true })));
  }

  $('[data-contacts]').innerHTML =
    `<a class="ccard" href="${C.phoneHref}">${bi('ct-phone')}<small>ცხელი ხაზი</small><b>${esc(C.phone)}</b><span class="muted">გაყიდვები, მონტაჟი, სერვისი</span></a>
     <a class="ccard" href="mailto:${C.email}">${bi('ct-email')}<small>ელ. ფოსტა</small><b>${esc(C.email)}</b><span class="muted">პასუხი სამუშაო დღეს</span></a>
     <div class="ccard">${bi('ct-hours')}<small>სამუშაო საათები</small><b>${esc(C.hours)}</b><span class="muted">${C.showrooms.length} შოურუმი თბილისში</span></div>
     <button class="ccard" type="button" style="text-align:left" data-callback>${bi('svc-consult')}<small>უფასო კონსულტაცია</small><b>შეუკვეთეთ ზარი</b><span class="muted">ინჟინერი დაგირეკავთ</span></button>`;
  // showrooms: the choice on the left, the map on the right
  $('[data-rooms]').innerHTML =
    C.showrooms.map((s, i) => `<button class="room" type="button" data-room="${i}" aria-pressed="false">${bi('ct-location')}<span><small>${esc(s.name)}${s.hq ? ' · სათაო ოფისი' : ''}</small><b>${esc(s.address)}</b><span class="muted">${esc(s.phone)}</span></span></button>`).join('');

  const map = $('[data-map]');
  const show = i => {
    map.innerHTML = `<iframe title="რუკა: ${esc(C.showrooms[i].address)}" src="${mapSrc(C.showrooms[i])}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    $$('[data-room]').forEach(b => { b.classList.toggle('is-on', +b.dataset.room === i); b.setAttribute('aria-pressed', +b.dataset.room === i); });
  };
  // the map loads only when it scrolls into view
  new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { show(0); io.disconnect(); } }, { rootMargin: '200px' }).observe(map);
  document.addEventListener('click', e => { const b = e.target.closest('[data-room]'); if (b) show(+b.dataset.room); });
  if (location.hash) setTimeout(() => { const t = $(location.hash); if (t) t.scrollIntoView(); }, 50);
}).catch(err => console.error(err));
