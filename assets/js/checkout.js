import { boot, $, $$, esc, bi, ui, arrow, money, crumbs, store, validate, toast, C } from './core.js';
import { order, account, phoneE164 } from './api.js';

let db;
const radio = (name, list, checked, extra = () => '') => `<div class="choices">${list.map(o => `
  <label class="choice"><input type="radio" name="${name}" value="${o.id}" ${o.id === checked ? 'checked' : ''}>
    ${o.icon ? bi(o.icon) : ''}<span><b>${esc(o.name)}</b>${o.note ? `<small>${esc(o.note)}</small>` : ''}</span>${extra(o)}</label>`).join('')}</div>`;

function form() {
  const icons = { pickup: 'svc-showroom', tbilisi: 'svc-delivery', regions: 'svc-network', cash: 'ct-hours', invoice: 'spec-code', installment: 'svc-calc' };
  const del = C.delivery.map(d => ({ ...d, icon: icons[d.id] }));
  const pay = C.payment.map(d => ({ ...d, icon: icons[d.id] }));
  const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  return `
  <div class="costep"><div class="costep__h"><span class="costep__n">1</span><h2>საკონტაქტო ინფორმაცია</h2></div>
    <div class="form-stack">
      ${account.hint() ? '' : `<div class="note note--blue" data-signin>${ui('user')}<span>გაქვთ ანგარიში? <a href="account.html?back=checkout.html">შედით ნომრით</a> და მონაცემები თავად ჩაიწერება, შეკვეთა კი ანგარიშში გამოჩნდება.</span></div>`}
      ${radio('ctype', [{ id: 'person', name: 'ფიზიკური პირი' }, { id: 'company', name: 'კომპანია', note: 'ინვოისით და დღგ-ით' }], 'person')}
      <div class="grid2" data-company hidden>
        <label class="field"><span>კომპანიის სახელი <em>*</em></span><input class="input" name="company" autocomplete="organization"><small class="field__err">შეიყვანეთ კომპანია</small></label>
        <label class="field"><span>საიდენტიფიკაციო კოდი</span><input class="input" name="companyId" inputmode="numeric"></label>
      </div>
      <div class="grid2">
        <label class="field"><span>სახელი და გვარი <em>*</em></span><input class="input" name="name" autocomplete="name" required><small class="field__err">შეიყვანეთ სახელი</small></label>
        <label class="field"><span>ტელეფონი <em>*</em></span><input class="input" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="5XX XX XX XX" required><small class="field__err">შეიყვანეთ სწორი ნომერი</small></label>
      </div>
      <label class="field"><span>ელ. ფოსტა</span><input class="input" name="email" type="email" autocomplete="email" placeholder="შეკვეთის დადასტურებისთვის"><small class="field__err">შეამოწმეთ ელ. ფოსტა</small></label>
    </div></div>

  <div class="costep"><div class="costep__h"><span class="costep__n">2</span><h2>მიწოდება</h2></div>
    <div class="form-stack">
      ${radio('delivery', del, 'pickup', o => `<span class="choice__price">${o.price === 0 ? 'უფასო' : o.price ? money(o.price) : ''}</span>`)}
      <div data-pickup>${radio('showroom', C.showrooms.map(s => ({ id: s.id, name: s.name, note: s.address + ' · ' + C.hours, icon: 'ct-location' })), C.showrooms[0].id)}</div>
      <div class="form-stack" data-address hidden>
        <div class="grid2">
          <label class="field"><span>ქალაქი <em>*</em></span><input class="input" name="city" autocomplete="address-level2" value="თბილისი"><small class="field__err">შეიყვანეთ ქალაქი</small></label>
          <label class="field"><span>სასურველი თარიღი</span><input class="input" name="date" type="date" min="${tomorrow}"></label>
        </div>
        <label class="field"><span>მისამართი <em>*</em></span><input class="input" name="address" autocomplete="street-address" placeholder="ქუჩა, ნომერი, სადარბაზო, სართული"><small class="field__err">შეიყვანეთ მისამართი</small></label>
        <div class="note note--blue">${ui('info')}<span>მიწოდების ღირებულებას და დროს მენეჯერი ზარისას დაგიდასტურებთ.</span></div>
      </div>
    </div></div>

  <div class="costep"><div class="costep__h"><span class="costep__n">3</span><h2>მონტაჟი</h2></div>
    ${radio('install', [{ id: 'yes', name: 'მჭირდება მონტაჟი', note: 'ინჟინერი დაგიკავშირდებათ, დაათვალიერებს ადგილს და დაგითვლით ღირებულებას', icon: 'svc-install' }, { id: 'no', name: 'მონტაჟი არ მჭირდება', note: 'მხოლოდ პროდუქცია', icon: 'prd-boiler' }], 'yes')}</div>

  <div class="costep"><div class="costep__h"><span class="costep__n">4</span><h2>გადახდა</h2></div>
    <div class="form-stack">
      ${radio('payment', pay, 'cash')}
      <label class="field"><span>კომენტარი</span><textarea class="textarea" name="comment" placeholder="მაგ.: სასურველი დრო ზარისთვის, სართული, ლიფტი"></textarea></label>
      <label class="check"><input type="checkbox" name="consent" required><span>ვეთანხმები <a href="about.html#privacy" target="_blank">პერსონალური მონაცემების დამუშავებას</a> შეკვეთის შესასრულებლად.</span></label>
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    </div></div>`;
}

function summary() {
  const lines = store.lines(db);
  const total = store.total(db);
  $('[data-sum]').innerHTML = `
    <h2>შეკვეთა <span class="muted" style="font-weight:500">(${store.count()})</span></h2>
    <div class="cosum__lines">${lines.map(({ p, qty }) => `
      <div class="line" data-line="${p.id}">
        <a class="line__img" href="${p.url}"><img src="${p.src[0]}" alt=""></a>
        <div><div class="line__brand">${esc(p.brandName)}</div><a class="line__name" href="${p.url}">${esc(p.title)}</a>
          ${p.color ? `<div class="line__var"><span class="sw" style="--c:${p.color.hex};width:12px;height:12px"></span>${esc(p.color.name)}</div>` : ''}
          <div class="line__row"><div class="qty"><button type="button" data-qty="-1" aria-label="ნაკლები">${ui('minus', 'ui--sm')}</button><input value="${qty}" inputmode="numeric" aria-label="რაოდენობა" data-qty-in><button type="button" data-qty="1" aria-label="მეტი">${ui('plus', 'ui--sm')}</button></div></div></div>
        <div><div class="line__price num">${money(p.price * qty)}</div><button type="button" class="line__rm" data-rm>წაშლა</button></div>
      </div>`).join('')}</div>
    <div class="cosum__tot">
      <div class="sum"><span>პროდუქცია</span><span class="num">${money(total)}</span></div>
      <div class="sum"><span>მიწოდება</span><small data-sum-del></small></div>
      <div class="sum"><span>მონტაჟი</span><small data-sum-inst></small></div>
      <div class="sum sum--total"><span>სულ</span><span class="num">${money(total)}</span></div>
      <button class="btn btn--red btn--block" type="submit" form="co">შეკვეთის დადასტურება ${arrow()}</button>
      <p class="cosum__secure">${ui('lock')}<span>შეკვეთას მენეჯერი ზარით დაგიდასტურებთ. გადახდა ხდება დადასტურების შემდეგ, თქვენ მიერ არჩეული გზით.</span></p>
    </div>`;
  sync();
}

function sync() {
  const form = $('#co');
  if (!form) return;
  const f = form.elements;
  const del = f.delivery.value, inst = f.install.value, ct = f.ctype.value;
  $('[data-pickup]').hidden = del !== 'pickup';
  $('[data-address]').hidden = del === 'pickup';
  f.address.required = f.city.required = del !== 'pickup';
  if (del === 'tbilisi' && !f.city.value) f.city.value = 'თბილისი';
  $('[data-company]').hidden = ct !== 'company';
  f.company.required = ct === 'company';
  const d = C.delivery.find(x => x.id === del);
  const sd = $('[data-sum-del]'), si = $('[data-sum-inst]');
  if (sd) sd.textContent = d.price === 0 ? 'უფასო' : d.price ? money(d.price) : 'მენეჯერი დაგიდასტურებთ';
  if (si) si.textContent = inst === 'yes' ? 'ღირებულება ადგილზე დათვალიერების შემდეგ' : 'არა';
}

function empty() {
  $('[data-co]').innerHTML = `<div class="empty" style="grid-column:1/-1">${bi('prd-boiler', 'ic ic--xl')}<h3>კალათა ცარიელია</h3><p>დაამატეთ პროდუქცია კატალოგიდან.</p><a class="btn btn--red" href="catalog.html">კატალოგი ${arrow()}</a></div>`;
}

function done(res, data) {
  const lines = data.items.map(i => `<li>${esc(i.name)} × ${i.qty}</li>`).join('');
  window.scrollTo({ top: 0 });
  $('[data-title]').hidden = true;
  $('[data-co]').outerHTML = `<div class="done">
    <div class="done__mark"><i></i><i></i><i></i><i></i></div>
    <h1 class="h1">გმადლობთ, შეკვეთა მიღებულია</h1>
    <p>მენეჯერი დაგიკავშირდებათ ნომერზე <b>${esc(data.customer.phone)}</b> შეკვეთის დასადასტურებლად (${esc(C.hours)}).</p>
    <div class="done__no"><small>შეკვეთის ნომერი</small><b>${esc(res.id)}</b></div>
    <ul class="bullets" style="text-align:left;display:inline-block;margin-bottom:28px;color:var(--muted)">${lines}</ul>
    <div><a class="btn btn--ghost" href="index.html">მთავარი</a> <a class="btn" href="catalog.html">კატალოგი ${arrow()}</a></div>
    ${res.preview ? '<p class="muted" style="font-size:13px;margin-top:28px">სატესტო რეჟიმი: შეკვეთა Bitrix-ში არ გაიგზავნა.</p>' : ''}
  </div>`;
}

async function submit(e) {
  e.preventDefault();
  const f = e.target;
  if (f.elements.website.value) return;
  if (!validate(f)) { toast('შეავსეთ მონიშნული ველები'); return; }
  const btn = $('[data-sum] button[type=submit]');
  btn.classList.add('is-busy');
  const v = Object.fromEntries(new FormData(f));
  const room = C.showrooms.find(s => s.id === v.showroom);
  const data = {
    customer: { type: v.ctype, name: v.name.trim(), phone: v.phone.trim(), email: v.email.trim(), company: v.company || '', companyId: v.companyId || '' },
    delivery: { method: v.delivery, showroom: v.delivery === 'pickup' && room ? room.name + ', ' + room.address : '', city: v.delivery === 'pickup' ? '' : v.city, address: v.delivery === 'pickup' ? '' : v.address, date: v.date || '' },
    installation: v.install === 'yes',
    payment: v.payment,
    comment: v.comment || '',
    items: store.lines(db).map(({ p, qty }) => ({ id: p.id, sku: p.sku, name: p.name, color: p.color ? p.color.name : '', price: p.price, qty })),
    total: store.total(db)
  };
  try {
    const res = await order(data);
    account.remember(res, data);
    store.clear();
    done(res, data);
  } catch (err) {
    console.error(err);
    toast('შეკვეთა ვერ გაიგზავნა. სცადეთ ხელახლა ან დაგვირეკეთ: ' + esc(C.phone));
    btn.classList.remove('is-busy');
  }
}

boot({}).then(d => {
  db = d;
  $('[data-crumbs]').innerHTML = crumbs([['კალათა', null], ['შეკვეთა', null]]);
  if (!store.lines(db).length) return empty();
  $('#co').innerHTML = form();
  summary();
  const f = $('#co');
  f.addEventListener('change', sync);
  f.addEventListener('submit', submit);
  try { const saved = JSON.parse(localStorage.getItem('mc.contact') || '{}'); ['name', 'phone', 'email'].forEach(k => saved[k] && (f.elements[k].value = saved[k])); } catch (e) { /* */ }
  // signed in: the account's name, number, e-mail and main address
  if (account.hint()) account.me().then(u => {
    if (!u) return;
    if (u.name) f.elements.name.value = u.name;
    f.elements.phone.value = (phoneE164(u.phone) || u.phone).replace('+995', '');
    if (u.email) f.elements.email.value = u.email;
    const a = (u.addresses || []).find(x => x.main) || (u.addresses || [])[0];
    if (a) { f.elements.city.value = a.city; f.elements.address.value = a.address; }
  }).catch(() => {});
  f.addEventListener('input', () => { try { localStorage.setItem('mc.contact', JSON.stringify({ name: f.elements.name.value, phone: f.elements.phone.value, email: f.elements.email.value })); } catch (e) { /* */ } });

  const sum = $('[data-sum]');
  sum.addEventListener('click', e => {
    const line = e.target.closest('[data-line]');
    if (!line) return;
    const id = +line.dataset.line, l = store.cart.find(x => x.id === id), b = e.target.closest('[data-qty]');
    if (b) store.setQty(id, l.qty + +b.dataset.qty);
    if (e.target.closest('[data-rm]')) store.remove(id);
  });
  sum.addEventListener('change', e => { if (e.target.matches('[data-qty-in]')) store.setQty(+e.target.closest('[data-line]').dataset.line, parseInt(e.target.value, 10) || 0); });
  addEventListener('mc:cart', () => { if (!$('#co')) return; store.lines(db).length ? summary() : empty(); });
}).catch(err => console.error(err));
