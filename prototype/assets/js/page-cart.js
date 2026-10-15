/* Cart: lines with quantity, remove (with undo), move to wishlist, summary.
   In Bitrix: sale.basket.basket. Promo codes are Bitrix coupons. */
ANDE.page(function (A) {
  'use strict';
  var esc = A.esc, ico = A.ico;
  var box = A.$('[data-cart]');

  function render() {
    var items = A.cart.items();
    var n = A.cart.count();
    A.$('[data-count]').textContent = n ? n + ' ცალი' : '';
    if (!items.length) {
      box.innerHTML = '<div class="empty" style="margin-bottom:72px"><span class="empty__ico">' + ico('i-bag') + '</span><h2>კალათა ცარიელია</h2>' +
        '<p>დაამატეთ პროდუქცია კატალოგიდან. ფასი მოთხოვნით პროდუქტებზე გამოიყენეთ ღილაკი „მოთხოვნა“.</p>' +
        '<div class="subchips" style="justify-content:center;flex-wrap:wrap;margin:8px 0 0">' + A.CATALOG.map(function (c) { return '<a class="subchip" href="' + A.url.catalog(c.id) + '">' + ico(c.icon) + c.name + '</a>'; }).join('') + '</div></div>';
      A.$('[data-steps]').hidden = true;
      renderUpsell([]);
      A.caps(box);
      return;
    }
    A.$('[data-steps]').hidden = false;
    var total = A.cart.total();
    box.innerHTML = '<div class="cartlayout">' +
      '<div><div class="cartlist"><div class="cartlist__head"><span>' + items.length + ' დასახელება</span><button type="button" data-clear>კალათის გასუფთავება</button></div>' +
      items.map(function (l) {
        var p = A.byId(l.id);
        return '<div class="line" data-line="' + p.id + '">' +
          '<a class="line__img" href="' + A.url.product(p.id) + '"><img src="' + A.img(p) + '" alt=""></a>' +
          '<div><p class="line__brand">' + esc(A.brandName(p.brand)) + '</p><a class="line__name" href="' + A.url.product(p.id) + '">' + esc(p.name) + '</a>' +
            '<p class="line__meta">' + (p.art ? '<span>კოდი ' + esc(p.art) + '</span>' : '') + '<span class="stock stock--in">მარაგშია</span><span>' + A.money(p.price) + ' / ცალი</span>' + A.energy(p, 'sm') + '</p>' +
            '<div class="line__acts"><button type="button" data-towish="' + p.id + '">' + ico('i-heart') + 'რჩეულებში</button><button class="rm" type="button" data-rmline="' + p.id + '">' + ico('i-trash') + 'წაშლა</button></div></div>' +
          '<div class="qty qty--sm" role="group" aria-label="რაოდენობა"><button type="button" aria-label="შემცირება" data-lq="-1" data-id="' + p.id + '">' + ico('i-minus') + '</button>' +
            '<input type="number" min="1" max="99" value="' + l.qty + '" inputmode="numeric" aria-label="რაოდენობა" data-lqin="' + p.id + '"><button type="button" aria-label="გაზრდა" data-lq="1" data-id="' + p.id + '">' + ico('i-plus') + '</button></div>' +
          '<div class="line__price"><p class="price">' + A.priceHTML(p.price * l.qty) + '</p>' + (l.qty > 1 ? '<small class="line__unit">' + l.qty + ' × ' + A.money(p.price) + '</small>' : '') + '</div>' +
        '</div>';
      }).join('') + '</div>' +
      '<a class="link-arrow" href="catalog.html" style="margin-top:18px">ყიდვის გაგრძელება' + ico('i-arrow') + '</a></div>' +
      '<aside class="summary" aria-label="შეჯამება"><h2>შეკვეთის ჯამი</h2>' +
        '<dl><div><dt>პროდუქცია (' + n + ' ც.)</dt><dd>' + A.money(total) + '</dd></div><div><dt>მიწოდება</dt><dd>შეთანხმებით</dd></div></dl>' +
        '<form class="promo" data-promo novalidate><label class="sr-only" for="promo">პრომოკოდი</label><input class="input" id="promo" placeholder="პრომოკოდი" autocomplete="off"><button class="btn btn--outline btn--sm" type="submit" style="height:48px">გამოყენება</button></form><p class="promo__msg" data-promo-msg></p>' +
        '<div class="summary__total"><span>სულ</span><p class="price">' + A.priceHTML(total) + '</p></div>' +
        '<a class="btn btn--primary btn--block" href="checkout.html">შეკვეთის გაფორმება' + ico('i-arrow') + '</a>' +
        '<p class="summary__note">' + ico('i-info') + '<span>შეკვეთის შემდეგ, მომდევნო სამუშაო დღეს დაგიკავშირდებათ ჩვენი წარმომადგენელი მიწოდებისა და გადახდის დეტალების შესათანხმებლად.</span></p>' +
      '</aside></div>';
    A.caps(box);
    renderUpsell(items);
  }

  /* things people often need with what's in the cart: accessories of the same category, else popular */
  function renderUpsell(items) {
    var inCart = items.map(function (l) { return l.id; });
    var cats = items.map(function (l) { return A.byId(l.id).cat; });
    var accSubs = { cooling: 'cool-acc', heating: 'valves', water: 'pipes', ventilation: 'vent-inline', ducts: 'duct-acc' };
    var pool = A.products.filter(function (p) { return A.canBuy(p) && inCart.indexOf(p.id) < 0; });
    var picks = pool.filter(function (p) { return cats.some(function (c) { return p.cat === c && p.sub === accSubs[c]; }); });
    if (picks.length < 4) picks = picks.concat(pool.filter(function (p) { return picks.indexOf(p) < 0 && (!cats.length || cats.indexOf(p.cat) > -1); }));
    var sec = A.$('[data-upsell]');
    A.$('.pgrid', sec).innerHTML = A.collapse(picks).slice(0, 4).map(A.card).join('');
    A.$('[data-upsell-title]').textContent = items.length ? 'შეიძლება დაგჭირდეთ' : 'პოპულარული პროდუქცია';
    A.caps(sec);
  }

  box.addEventListener('click', function (e) {
    var t = e.target.closest('[data-lq],[data-rmline],[data-towish],[data-clear]'); if (!t) return;
    if (t.hasAttribute('data-lq')) {
      var id = t.getAttribute('data-id'), l = A.cart.items().filter(function (x) { return x.id === +id; })[0];
      if (l) A.cart.set(id, l.qty + +t.getAttribute('data-lq'));
      return;
    }
    if (t.hasAttribute('data-clear')) {
      var snap = A.cart.items(); A.cart.clear();
      A.toast('<span><b>კალათა გასუფთავდა</b></span><button type="button" data-undo>დაბრუნება</button>', 5000);
      undo = snap; return;
    }
    var pid = t.getAttribute('data-rmline') || t.getAttribute('data-towish');
    var row = A.$('[data-line="' + pid + '"]', box), before = A.cart.items(), p = A.byId(pid);
    if (t.hasAttribute('data-towish') && !A.wish.has(pid)) A.wish.toggle(pid);
    row.classList.add('is-leaving');
    setTimeout(function () {
      A.cart.remove(pid);
      undo = before;
      A.toast('<img src="' + A.img(p) + '" alt=""><span><b>' + (t.hasAttribute('data-towish') ? 'გადავიდა რჩეულებში' : 'წაიშალა კალათიდან') + '</b><em>' + esc(p.name) + '</em></span><button type="button" data-undo>დაბრუნება</button>', 5000);
    }, A.reduceMotion ? 0 : 250);
  });
  box.addEventListener('change', function (e) {
    var id = e.target.getAttribute('data-lqin'); if (id) A.cart.set(id, parseInt(e.target.value, 10) || 1);
  });
  box.addEventListener('submit', function (e) {
    if (!e.target.matches('[data-promo]')) return;
    e.preventDefault();
    var v = A.$('#promo').value.trim(), m = A.$('[data-promo-msg]');
    m.style.color = 'var(--sale)';
    m.textContent = v ? 'პრომოკოდი „' + v + '“ ვერ მოიძებნა.' : 'შეიყვანეთ პრომოკოდი.';
  });
  var undo = null;
  document.addEventListener('click', function (e) { if (e.target.closest('[data-undo]') && undo) { A.cart.restore(undo); undo = null; document.querySelector('[data-toast]').classList.remove('is-on'); } });
  document.addEventListener('ande:change', function (e) { if (e.detail.type === 'cart' || e.detail.type === 'sync') render(); });
  render();
});
