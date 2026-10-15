/* Checkout: contact (person or company), pickup or delivery, payment,
   validation, confirmation. In Bitrix: sale.order.ajax, and the options here
   map to its person types, delivery services and payment systems. */
ANDE.page(function (A) {
  'use strict';
  var esc = A.esc, ico = A.ico;
  var root = A.$('[data-checkout]');
  var STORES = [
    ['tsereteli', 'წერეთლის გამზირი 114'], ['agladze', 'რ. აგლაძის ქუჩა 7ა'], ['kosmonavtebi', 'კოსმონავტების ქუჩა 21']
  ];
  var PAY = [
    ['transfer', 'i-bank', 'საბანკო გადარიცხვა', 'ინვოისს გამოგიგზავნით ელ. ფოსტაზე'],
    ['cash', 'i-cash', 'ნაღდი ანგარიშსწორება', 'გადახდა პროდუქციის მიღებისას'],
    ['card', 'i-card', 'ბარათით', 'Visa, Mastercard'],
    ['installment', 'i-calendar', 'განვადება', 'პირობებს კონსულტანტი შეგითანხმებთ']
  ];
  var saved = A.store.get('checkout', {});

  function render() {
    var items = A.cart.items();
    if (!items.length) {
      root.innerHTML = '<div class="empty" style="margin-bottom:72px"><span class="empty__ico">' + ico('i-bag') + '</span><h2>კალათა ცარიელია</h2><p>შეკვეთის გასაფორმებლად ჯერ დაამატეთ პროდუქცია კალათაში.</p><a class="btn btn--primary" href="catalog.html">კატალოგი</a></div>';
      A.caps(root); return;
    }
    var total = A.cart.total();
    root.innerHTML = '<div class="cartlayout">' +
      '<form id="checkout" novalidate data-form>' +
        card(1, 'საკონტაქტო ინფორმაცია',
          '<div class="seg" role="radiogroup" aria-label="მყიდველი"><label><input type="radio" name="ptype" value="person" checked><span>ფიზიკური პირი</span></label><label><input type="radio" name="ptype" value="company"><span>იურიდიული პირი</span></label></div>' +
          '<div class="fgrid2">' +
            '<div class="field" data-company hidden><label for="c-org">კომპანიის დასახელება <i>*</i></label><input class="input" id="c-org" name="org" autocomplete="organization"></div>' +
            '<div class="field" data-company hidden><label for="c-tax">საიდენტიფიკაციო კოდი <i>*</i></label><input class="input" id="c-tax" name="tax" inputmode="numeric" maxlength="11" placeholder="9 ციფრი"></div>' +
            '<div class="field"><label for="c-fn">სახელი <i>*</i></label><input class="input" id="c-fn" name="fn" autocomplete="given-name" value="' + esc(saved.fn || '') + '"></div>' +
            '<div class="field"><label for="c-ln">გვარი <i>*</i></label><input class="input" id="c-ln" name="ln" autocomplete="family-name" value="' + esc(saved.ln || '') + '"></div>' +
            '<div class="field"><label for="c-ph">ტელეფონი <i>*</i></label><div class="phonefield"><span>+995</span><input class="input" id="c-ph" name="ph" type="tel" inputmode="numeric" placeholder="5XX XX XX XX" autocomplete="tel-national" data-phone value="' + esc(saved.ph || '') + '"></div></div>' +
            '<div class="field"><label for="c-em">ელ. ფოსტა</label><input class="input" id="c-em" name="em" type="email" autocomplete="email" value="' + esc(saved.em || '') + '"><span class="field__hint">შეკვეთის დადასტურებისთვის</span></div>' +
          '</div>') +
        card(2, 'მიღების მეთოდი',
          '<div class="choices choices--2">' +
            choice('ship', 'pickup', 'i-store', 'გატანა შოურუმიდან', '3 შოურუმი თბილისში', true) +
            choice('ship', 'delivery', 'i-truck', 'მიწოდება მისამართზე', 'ღირებულება შეთანხმებით') +
          '</div>' +
          '<div class="reveal" data-show="pickup"><p class="field__hint" style="margin-bottom:10px">აირჩიეთ შოურუმი:</p><div class="choices">' +
            STORES.map(function (s, i) { return choice('store', s[0], 'i-pin', s[1], 'თბილისი · ყოველდღე 10:00-18:00', i === 0); }).join('') + '</div></div>' +
          '<div class="reveal fgrid2" data-show="delivery" hidden>' +
            '<div class="field"><label for="c-city">ქალაქი <i>*</i></label><select id="c-city" name="city"><option>თბილისი</option><option>რუსთავი</option><option>მცხეთა</option><option>ქუთაისი</option><option>ბათუმი</option><option>სხვა</option></select></div>' +
            '<div class="field"><label for="c-addr">მისამართი <i>*</i></label><input class="input" id="c-addr" name="addr" autocomplete="street-address" placeholder="ქუჩა, ნომერი, ბინა"></div>' +
            '<div class="field field--full"><label for="c-cn">კომენტარი კურიერისთვის</label><input class="input" id="c-cn" name="cn" placeholder="მაგ. სადარბაზოს კოდი, სართული"></div>' +
          '</div>') +
        card(3, 'გადახდის მეთოდი',
          '<div class="choices choices--2">' + PAY.map(function (p, i) { return choice('pay', p[0], p[1], p[2], p[3], i === 0); }).join('') + '</div>') +
        card(4, 'დამატებითი ინფორმაცია',
          '<div class="field"><label for="c-note">შენიშვნა შეკვეთაზე</label><textarea id="c-note" name="note" rows="3" placeholder="მაგ. მონტაჟიც მჭირდება"></textarea></div>' +
          '<label class="agree" data-agree><input type="checkbox" name="agree"><span class="check__box">' + ico('i-check') + '</span><span>ვეთანხმები <a class="textlink" href="#">წესებსა და პირობებს</a> და <a class="textlink" href="#">კონფიდენციალურობის პოლიტიკას</a>.</span></label>') +
      '</form>' +
      '<aside class="summary" aria-label="შეკვეთა"><h2>თქვენი შეკვეთა</h2>' +
        '<div class="minilines">' + items.map(function (l) {
          var p = A.byId(l.id);
          return '<div class="miniline"><img src="' + A.img(p) + '" alt=""><span>' + esc(p.name) + '<br><small>' + l.qty + ' × ' + A.money(p.price) + '</small>' + A.energy(p, 'xs') + '</span><b>' + A.money(p.price * l.qty) + '</b></div>';
        }).join('') + '</div>' +
        '<dl><div><dt>პროდუქცია (' + A.cart.count() + ' ც.)</dt><dd>' + A.money(total) + '</dd></div><div><dt>მიღება</dt><dd data-sum-ship>გატანა შოურუმიდან</dd></div><div><dt>გადახდა</dt><dd data-sum-pay>საბანკო გადარიცხვა</dd></div></dl>' +
        '<div class="summary__total"><span>სულ</span><p class="price">' + A.priceHTML(total) + '</p></div>' +
        '<button class="btn btn--primary btn--block" type="submit" form="checkout">შეკვეთის დადასტურება</button>' +
        '<a class="link-arrow" href="cart.html" style="margin-top:14px">კალათაში დაბრუნება' + ico('i-arrow') + '</a>' +
        '<p class="summary__note">' + ico('i-info') + '<span>მომდევნო სამუშაო დღეს დაგიკავშირდებათ კომპანიის წარმომადგენელი, გაგიწევთ კონსულტაციას და შეგითანხმებთ გადახდისა და მიწოდების დეტალებს.</span></p>' +
      '</aside></div>';
    A.caps(root);
  }
  function card(n, title, body) {
    return '<section class="formcard"><div class="formcard__head"><span class="formcard__n">' + n + '</span><h2>' + title + '</h2></div>' + body + '</section>';
  }
  function choice(name, value, icon, title, sub, checked) {
    return '<label class="choice"><input type="radio" name="' + name + '" value="' + value + '"' + (checked ? ' checked' : '') + '><span class="choice__dot"></span>' +
      '<span class="choice__body"><b>' + title + '</b><small>' + sub + '</small></span>' + ico(icon, 'choice__ico') + '</label>';
  }

  root.addEventListener('change', function (e) {
    var t = e.target, f = A.$('[data-form]'); if (!f) return;
    if (t.name === 'ptype') {
      var co = t.value === 'company';
      A.$$('[data-company]', f).forEach(function (el) { el.hidden = !co; });
      if (co) { A.$('[name="pay"][value="transfer"]', f).checked = true; syncSummary(); }
    }
    if (t.name === 'ship') { A.$$('[data-show]', f).forEach(function (el) { el.hidden = el.getAttribute('data-show') !== t.value; }); }
    if (t.name === 'ship' || t.name === 'pay' || t.name === 'store') syncSummary();
    if (t.name === 'agree') A.$('[data-agree]').classList.remove('is-error');
    if (t.closest('.field')) A.fieldErr(t, '');
  });
  function syncSummary() {
    var f = A.$('[data-form]'), ship = A.$('[name="ship"]:checked', f).value, pay = A.$('[name="pay"]:checked', f).value;
    var st = STORES.filter(function (s) { return s[0] === (A.$('[name="store"]:checked', f) || {}).value; })[0];
    A.$('[data-sum-ship]').textContent = ship === 'pickup' ? 'გატანა: ' + (st ? st[1] : '') : 'მიწოდება · შეთანხმებით';
    A.$('[data-sum-pay]').textContent = PAY.filter(function (p) { return p[0] === pay; })[0][2];
  }

  root.addEventListener('submit', function (e) {
    if (!e.target.matches('[data-form]')) return;
    e.preventDefault();
    var f = e.target, bad = [];
    function need(name, ok, msg) { var el = A.$('[name="' + name + '"]', f); var good = ok(el.value.trim()); A.fieldErr(el, good ? '' : msg); if (!good) bad.push(el); }
    var co = A.$('[name="ptype"]:checked', f).value === 'company';
    if (co) {
      need('org', function (v) { return v.length > 1; }, 'შეიყვანეთ კომპანიის დასახელება');
      need('tax', function (v) { return /^\d{9}(\d{2})?$/.test(v); }, 'საიდენტიფიკაციო კოდი 9 ან 11 ციფრია');
    }
    need('fn', function (v) { return v.length > 1; }, 'შეიყვანეთ სახელი');
    need('ln', function (v) { return v.length > 1; }, 'შეიყვანეთ გვარი');
    need('ph', A.phoneOk, 'შეიყვანეთ 9-ნიშნა ნომერი');
    need('em', function (v) { return !v || /^\S+@\S+\.\S+$/.test(v); }, 'ელ. ფოსტა არასწორია');
    var ship = A.$('[name="ship"]:checked', f).value;
    if (ship === 'delivery') need('addr', function (v) { return v.length > 4; }, 'შეიყვანეთ მისამართი');
    var agree = A.$('[name="agree"]', f);
    A.$('[data-agree]').classList.toggle('is-error', !agree.checked);
    if (!agree.checked) bad.push(agree);
    if (bad.length) {
      bad[0].focus();
      bad[0].closest('.formcard').scrollIntoView({ behavior: A.reduceMotion ? 'auto' : 'smooth', block: 'start' });
      A.toast('<span><b>შეამოწმეთ მონიშნული ველები</b><em>' + bad.length + ' ველი საჭიროებს შევსებას</em></span>', 2600);
      return;
    }
    var data = { fn: A.$('[name="fn"]', f).value.trim(), ln: A.$('[name="ln"]', f).value.trim(), ph: A.$('[name="ph"]', f).value, em: A.$('[name="em"]', f).value.trim() };
    A.store.set('checkout', data);
    var d = new Date(), no = 'AN-' + String(d.getFullYear()).slice(2) + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) + '-' + Math.floor(1000 + Math.random() * 9000);
    var total = A.cart.total(), count = A.cart.count();
    var payName = PAY.filter(function (p) { return p[0] === A.$('[name="pay"]:checked', f).value; })[0][2];
    var shipText = A.$('[data-sum-ship]').textContent;
    A.cart.clear();
    A.$('[data-steps]').innerHTML = '<li class="is-done"><b>' + ico('i-check') + '</b>კალათა</li><li class="is-done"><b>' + ico('i-check') + '</b>შეკვეთის გაფორმება</li><li class="is-on"><b>3</b>დადასტურება</li>';
    A.$('[data-phead]').hidden = true;
    root.innerHTML = '<div class="success">' +
      '<div class="success__ico">' + ico('i-check') + '</div>' +
      '<h1>მადლობა, შეკვეთა მიღებულია</h1>' +
      '<p>' + esc(data.fn) + ', თქვენი შეკვეთა წარმატებით გაიგზავნა. ' + count + ' ცალი, ჯამში ' + A.money(total) + '.</p>' +
      '<span class="success__no">შეკვეთა № ' + no + '</span>' +
      '<ol class="success__steps"><li><b>1. დადასტურება</b>მომდევნო სამუშაო დღეს დაგიკავშირდებით ნომერზე +995 ' + esc(data.ph) + '.</li>' +
        '<li><b>2. გადახდა</b>' + esc(payName) + '. დეტალებს ზარისას შეგითანხმებთ.</li>' +
        '<li><b>3. მიღება</b>' + esc(shipText) + '.</li></ol>' +
      '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn btn--primary" href="index.html">მთავარ გვერდზე</a><a class="btn btn--outline" href="catalog.html">კატალოგი</a></div>' +
    '</div>';
    A.caps(root);
    A.caps(A.$('[data-steps]'));
    window.scrollTo({ top: 0, behavior: A.reduceMotion ? 'auto' : 'smooth' });
  });

  render();
});
