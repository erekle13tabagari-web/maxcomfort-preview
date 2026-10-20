import { boot, $, $$, esc, bi, ui, money, C } from './core.js';

const mapSrc = addr => 'https://www.google.com/maps?output=embed&q=' + encodeURIComponent('თბილისი, ' + addr);

boot({}).then(() => {
  const icons = { pickup: 'svc-showroom', tbilisi: 'svc-delivery', regions: 'svc-network' };
  $('[data-delivery]').innerHTML =
    C.delivery.map(d => `<div class="value">${bi(icons[d.id] || 'svc-delivery')}<h3>${esc(d.name)}</h3><p>${esc(d.note)}. ${d.price === 0 ? 'უფასოდ.' : 'ღირებულებას მენეჯერი დაგიდასტურებთ.'}</p></div>`).join('') +
    `<div class="value">${bi('svc-calc')}<h3>გადახდა</h3><p>${C.payment.map(p => esc(p.name)).join(', ')}.</p></div>`;

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
    map.innerHTML = `<iframe title="რუკა: ${esc(C.showrooms[i].address)}" src="${mapSrc(C.showrooms[i].address)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    $$('[data-room]').forEach(b => { b.classList.toggle('is-on', +b.dataset.room === i); b.setAttribute('aria-pressed', +b.dataset.room === i); });
  };
  // the map loads only when it scrolls into view
  new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { show(0); io.disconnect(); } }, { rootMargin: '200px' }).observe(map);
  document.addEventListener('click', e => { const b = e.target.closest('[data-room]'); if (b) show(+b.dataset.room); });
  if (location.hash) setTimeout(() => { const t = $(location.hash); if (t) t.scrollIntoView(); }, 50);
}).catch(err => console.error(err));
