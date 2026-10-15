/* Wishlist: saved products, add all to cart, clear. */
ANDE.page(function (A) {
  'use strict';
  var ico = A.ico, box = A.$('[data-wish-page]');
  function render() {
    var list = A.wish.list().map(A.byId);
    A.$('[data-count]').textContent = list.length ? list.length + ' პროდუქტი' : '';
    if (!list.length) {
      box.innerHTML = '<div class="empty" style="margin-bottom:72px"><span class="empty__ico">' + ico('i-heart') + '</span><h2>რჩეულები ცარიელია</h2>' +
        '<p>შეინახეთ პროდუქცია გულის ნიშნით და მოგვიანებით დაუბრუნდით, ან გადაიტანეთ კალათაში.</p><a class="btn btn--primary" href="catalog.html">კატალოგი</a></div>';
      A.caps(box); return;
    }
    var buyable = list.filter(A.canBuy);
    box.innerHTML = '<div class="toolbar"><div class="toolbar__left"></div><div class="toolbar__right">' +
      (buyable.length ? '<button class="btn btn--primary btn--sm" type="button" data-allcart>' + ico('i-bag') + 'ყველა კალათაში (' + buyable.length + ')</button>' : '') +
      '<button class="btn btn--outline btn--sm" type="button" data-wclear>გასუფთავება</button></div></div>' +
      '<div class="pgrid" style="padding-bottom:72px">' + list.map(A.card).join('') + '</div>';
    A.caps(box);
  }
  box.addEventListener('click', function (e) {
    if (e.target.closest('[data-wclear]')) { A.wish.clear(); return; }
    if (e.target.closest('[data-allcart]')) {
      var n = 0; A.wish.list().map(A.byId).filter(A.canBuy).forEach(function (p) { A.cart.add(p.id, 1); n++; });
      A.toast('<span><b>კალათაში დაემატა ' + n + ' პროდუქტი</b></span><a href="cart.html">კალათა</a>');
    }
  });
  document.addEventListener('ande:change', function (e) { if (e.detail.type === 'wish' || e.detail.type === 'sync') render(); });
  render();
});
