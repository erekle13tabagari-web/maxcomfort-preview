/* Compare (up to 4): specification fields side by side, "differences only"
   switch, one tab per category. In Bitrix: catalog.compare.result. */
ANDE.page(function (A) {
  'use strict';
  var esc = A.esc, ico = A.ico;
  var box = A.$('[data-compare-page]'), onlyDiff = false, curCat = null;
  var ORDER = ['სიმძლავრე, kW', 'ფართობი, მ²', 'ინვერტორული', 'საწვავი', 'ქვაბის ტიპი', 'დიამეტრი', 'მასალა', 'სამუშაო ტემპერატურა', 'გარანტია'];

  function render() {
    var list = A.compare.list().map(A.byId);
    A.$('[data-count]').textContent = list.length ? list.length + ' / 4 პროდუქტი' : '';
    if (!list.length) {
      box.innerHTML = '<div class="empty" style="margin-bottom:72px"><span class="empty__ico">' + ico('i-bars') + '</span><h2>შესადარებელი პროდუქცია არ არის</h2>' +
        '<p>პროდუქტის ბარათზე დააჭირეთ შედარების ნიშანს (' + '<svg class="ico" style="display:inline;width:16px;height:16px;vertical-align:-3px"><use href="#i-bars"/></svg>' + '). შეგიძლიათ შეადაროთ 4-მდე პროდუქტი.</p><a class="btn btn--primary" href="catalog.html">კატალოგი</a></div>';
      A.caps(box); return;
    }
    var cats = list.map(function (p) { return p.cat; }).filter(function (c, i, a) { return a.indexOf(c) === i; });
    if (cats.indexOf(curCat) < 0) curCat = cats[0];
    var set = list.filter(function (p) { return p.cat === curCat; });

    var keys = [];
    set.forEach(function (p) { p.specs.forEach(function (s) { if (keys.indexOf(s[0]) < 0) keys.push(s[0]); }); });
    keys.sort(function (a, b) { var ia = ORDER.indexOf(a), ib = ORDER.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b, 'ka'); });
    function sv(p, k) { for (var i = 0; i < p.specs.length; i++) if (p.specs[i][0] === k) return p.specs[i][1]; return ''; }
    var rows = [
      ['ბრენდი', function (p) { return A.brandName(p.brand); }],
      ['კოდი', function (p) { return p.art; }],
      ['ფასი', function (p) { return p.price ? A.money(p.price) : 'მოთხოვნით'; }],
      ['ენერგოეფექტურობის კლასი', function (p) { return p.energy ? [p.energy.c, p.energy.h].filter(Boolean).join(' / ') : ''; }],
      ['ხელმისაწვდომობა', function (p) { return p.stock ? 'მარაგშია' : 'შეკვეთით'; }],
      ['ქვეკატეგორია', function (p) { var s = A.findSub(p.cat, p.sub); return s ? s.name : ''; }],
      ['ტიპი', function (p) { return p.type; }]
    ].concat(keys.map(function (k) { return [k, function (p) { return sv(p, k); }]; }));

    var body = rows.map(function (r) {
      var vals = set.map(r[1]), filled = vals.filter(Boolean);
      if (!filled.length) return '';
      var same = set.length > 1 && filled.length === vals.length && filled.every(function (v) { return v === filled[0]; });
      if (onlyDiff && same) return '';
      return '<tr class="' + (set.length > 1 ? (same ? 'is-same' : 'is-diff') : '') + '"><th scope="row">' + esc(r[0]) + '</th>' +
        vals.map(function (v) { return '<td>' + (v ? esc(v) : '<span class="dash">·</span>') + '</td>'; }).join('') + '</tr>';
    }).join('');

    box.innerHTML =
      '<div class="cmptools">' +
        (cats.length > 1 ? '<div class="ptabs" role="tablist" aria-label="კატეგორიები">' + cats.map(function (c) {
          var n = list.filter(function (p) { return p.cat === c; }).length;
          return '<button class="ptab" role="tab" type="button" aria-selected="' + (c === curCat) + '" data-ccat="' + c + '">' + A.findCat(c).name + ' (' + n + ')</button>';
        }).join('') + '</div>' : '<span></span>') +
        '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">' +
          '<label class="switch" style="border:0;padding:0;gap:10px"><span>მხოლოდ განსხვავებები</span><input type="checkbox" data-diff' + (onlyDiff ? ' checked' : '') + '><span class="switch__track"></span></label>' +
          '<button class="textlink" type="button" data-cclear style="font-size:14px">გასუფთავება</button></div>' +
      '</div>' +
      '<div class="cmp"><table><thead><tr><th scope="row">პროდუქტი</th>' + set.map(function (p) {
        return '<td><div class="cmp__prod"><button class="cmp__rm" type="button" aria-label="შედარებიდან ამოღება" data-crm="' + p.id + '">' + ico('i-close') + '</button>' +
          '<a href="' + A.url.product(p.id) + '"><img src="' + A.img(p) + '" alt=""></a><a class="cmp__name" href="' + A.url.product(p.id) + '">' + esc(p.name) + '</a>' +
          (p.price ? '<p class="price">' + A.priceHTML(p.price) + '</p>' : '<p class="price price--ask">ფასი მოთხოვნით</p>') + A.energy(p, 'sm') +
          (A.canBuy(p) ? '<button class="cartbtn" type="button" data-add="' + p.id + '">' + ico('i-bag') + '<span>კალათაში</span></button>' : '<button class="cartbtn cartbtn--soft" type="button" data-ask="' + p.id + '">' + ico('i-headset') + '<span>მოთხოვნა</span></button>') +
          '</div></td>';
      }).join('') + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
      (set.length < 4 ? '<p class="field__hint" style="margin-top:14px">შეგიძლიათ დაამატოთ კიდევ ' + (4 - list.length) + ' პროდუქტი. <a class="textlink" href="' + A.url.catalog(curCat) + '">' + A.findCat(curCat).name + '</a></p>' : '');
    A.caps(box);
  }
  box.addEventListener('click', function (e) {
    var t = e.target.closest('[data-crm],[data-cclear],[data-ccat]'); if (!t) return;
    if (t.hasAttribute('data-crm')) A.compare.remove(t.getAttribute('data-crm'));
    else if (t.hasAttribute('data-cclear')) A.compare.clear();
    else { curCat = t.getAttribute('data-ccat'); render(); }
  });
  box.addEventListener('change', function (e) { if (e.target.matches('[data-diff]')) { onlyDiff = e.target.checked; render(); } });
  document.addEventListener('ande:change', function (e) { if (e.detail.type === 'compare' || e.detail.type === 'sync') render(); });
  render();
});
