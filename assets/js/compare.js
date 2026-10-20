import { boot, $, $$, esc, bi, ui, arrow, card, num, money, crumbs, store, energyTag, energyTags } from './core.js';

let db, diffOnly = false;

function render() {
  const list = store.cmp.map(id => db.byId.get(id)).filter(Boolean);
  const box = $('[data-cmp]');
  if (!list.length) {
    box.innerHTML = `<div class="empty">${bi('sys-home', 'ic ic--xl')}<h3>შესადარებელი პროდუქტი არ არის</h3><p>პროდუქტის ბარათზე დააჭირეთ <span style="display:inline-flex;vertical-align:-4px">${ui('cmp', 'ui--sm')}</span> ღილაკს და აქ შეადარებთ მახასიათებლებს.</p><a class="btn btn--red" href="catalog.html?c=cooling">კონდიციონერები ${arrow()}</a></div>`;
    $('[data-tools]').hidden = true;
    return;
  }
  $('[data-tools]').hidden = false;
  const keys = [];
  list.forEach(p => p.specs.forEach(([k]) => !keys.includes(k) && keys.push(k)));
  const rows = [
    ['ფასი', p => p.price != null ? money(p.price) : 'მოთხოვნით'],
    ['ბრენდი', p => p.brandName],
    ['ენერგოკლასი', p => energyTags(p).map(([k, c, top]) => energyTag(c, k, top)).join(' '), true],
    ['მარაგი', p => p.stock == null ? '' : p.stock ? 'მარაგშია' : 'შეკვეთით'],
    ['ფერი', p => p.color ? p.color.name : ''],
    ...keys.filter(k => k !== 'ფერი').map(k => [k, p => num(p.spec[k] || '')])
  ];
  const body = rows.map(([t, f, html]) => {
    const vals = list.map(f);
    const diff = new Set(vals.map(v => String(v))).size > 1;
    if (diffOnly && !diff && list.length > 1) return '';
    return `<tr class="${diff && list.length > 1 ? 'is-diff' : ''}"><th>${esc(t)}</th>${vals.map(v => `<td>${html ? v : esc(v) || '—'}</td>`).join('')}</tr>`;
  }).join('');
  box.innerHTML = `<table>
    <tr class="cmp__head"><th></th>${list.map(p => `<td>${card(db, p, { cls: 'card--sm' })}<button class="cmp__rm" data-cmp="${p.id}">წაშლა</button></td>`).join('')}</tr>
    ${body}</table>`;
}

boot({}).then(d => {
  db = d;
  $('[data-crumbs]').innerHTML = crumbs([['შედარება', null]]);
  render();
  addEventListener('mc:cmp', render);
  $('[data-diff]').addEventListener('change', e => { diffOnly = e.target.checked; render(); });
}).catch(err => console.error(err));
