/* Media centre: news, blog, promotions and questions (admin panel: media centre, Q&A).
   media.html?t=news|blog|promo|faq lists one kind; media.html?p=<id> shows one post. */
import { boot, $, $$, esc, ui, bi, arrow, crumbs, params, rich, reveal, norm, toast, safeUrl, C } from './core.js';
import { draftOn } from './api.js';
import { TYPES, livePosts, postCard, niceDate, promoDates } from './posts.js';

const TABS = [['', 'ყველა'], ['news', 'სიახლეები'], ['blog', 'ბლოგი'], ['promo', 'აქციები'], ['faq', 'კითხვა-პასუხი']];
const faqs = () => ((C.cms || {}).faq || []).filter(f => f && f.on !== false && f.q && f.a);
const paras = s => String(s || '').split(/\r?\n+/).filter(x => x.trim()).map(x => `<p>${esc(x.trim())}</p>`).join('');

function list() {
  let tab = params().get('t') || '';
  const count = { '': livePosts().length, faq: faqs().length };
  Object.keys(TYPES).forEach(k => { count[k] = livePosts(k).length; });
  const tabs = TABS.filter(([k]) => count[k]);   // only what has something in it
  if (!tabs.some(([k]) => k === tab)) tab = tabs.length ? tabs[0][0] : '';
  $('[data-crumbs]').innerHTML = crumbs([['მედია ცენტრი', null]]);
  const bar = $('[data-tabs]');
  bar.innerHTML = tabs.map(([k, n]) => `<a class="pill ${k === tab ? 'is-on' : ''}" href="media.html${k ? '?t=' + k : ''}">${n} <small>${count[k]}</small></a>`).join('');
  bar.hidden = tabs.length < 2;
  const body = $('[data-body]');
  if (tab === 'faq') {
    body.innerHTML = faqHTML();
    setupFaq(body);
  } else {
    const posts = livePosts(tab);
    body.innerHTML = posts.length ? `<div class="posts posts--page">${posts.map(postCard).join('')}</div>`
      : `<div class="empty">${bi('svc-consult', 'ic ic--xl')}<h3>აქ ჯერ არაფერია</h3><p>სიახლეები და აქციები მალე გამოჩნდება. კითხვა თუ გაქვთ, დაგვირეკეთ.</p><button class="btn btn--red" data-callback>შეუკვეთეთ ზარი ${arrow()}</button></div>`;
  }
  reveal(body);
}

function faqHTML() {
  return `<div class="faq">
    <label class="faq__search">${ui('search')}<input class="input" type="search" placeholder="მოძებნეთ კითხვა" data-faq-q aria-label="კითხვის ძიება"></label>
    <div class="faq__list">${faqs().map((f, i) => `<details class="faq__item" id="${esc(f.id || 'q' + (i + 1))}"><summary>${esc(f.q)}${ui('down')}</summary><div class="faq__a">${paras(f.a)}</div></details>`).join('')}</div>
    <div class="faq__none" hidden><p>ასეთი კითხვა ვერ ვიპოვეთ.</p><button class="btn btn--ghost btn--sm" data-callback>ჰკითხეთ ინჟინერს</button></div>
  </div>`;
}
function setupFaq(root) {
  const items = $$('.faq__item', root), none = $('.faq__none', root);
  $('[data-faq-q]', root).addEventListener('input', e => {
    const q = norm(e.target.value.trim());
    let n = 0;
    items.forEach(d => { const on = !q || norm(d.textContent).includes(q); d.hidden = !on; n += on; if (q && on) d.open = true; });
    none.hidden = n > 0;
  });
  const hit = location.hash && $(location.hash.replace(/[^\w#-]/g, ''), root);   // media.html?t=faq#q3 opens that answer
  if (hit) { hit.open = true; setTimeout(() => hit.scrollIntoView({ block: 'center' }), 60); }
}

function article(id) {
  const all = (C.cms || {}).posts || [];
  // the admin panel's preview also shows a post that is not out yet
  const p = draftOn() ? all.find(x => x && x.id === id) : livePosts().find(x => x.id === id);
  const box = $('[data-article]');
  $('[data-list]').hidden = true;
  box.hidden = false;
  if (!p) {
    box.innerHTML = `<div class="wrap">${crumbs([['მედია ცენტრი', 'media.html']])}<div class="empty" style="margin:28px 0 64px">${bi('svc-consult', 'ic ic--xl')}<h3>ჩანაწერი ვერ მოიძებნა</h3><p>შესაძლოა, აქცია დასრულდა ან ჩანაწერი წაიშალა.</p><a class="btn" href="media.html">მედია ცენტრი ${arrow()}</a></div></div>`;
    return;
  }
  document.title = p.title + ' · მაქს კომფორტი';
  const when = promoDates(p);
  const cover = p.cover && safeUrl(p.cover, true) ? `<figure class="article__cover"><img src="${esc(p.cover)}" alt=""></figure>` : '';
  const go = p.link && safeUrl(p.link) ? `<a class="btn btn--red" href="${esc(p.link)}">${esc(p.linkText || 'ნახვა')} ${arrow()}</a>` : '';
  const more = livePosts(p.type).filter(x => x.id !== p.id).slice(0, 3);
  box.innerHTML = `<div class="wrap article__wrap">
      ${crumbs([['მედია ცენტრი', 'media.html'], [TYPES[p.type] || '', 'media.html?t=' + p.type]])}
      <header class="article__head">
        <span class="post__meta"><span class="tag ${p.type === 'promo' ? 'tag--red' : ''}">${esc(TYPES[p.type] || '')}</span><time datetime="${esc(p.date)}">${esc(niceDate(p.date))}</time></span>
        <h1 class="h1">${esc(p.title)}</h1>
        ${p.excerpt ? `<p class="lead">${esc(p.excerpt)}</p>` : ''}
        ${when ? `<p class="article__when">${ui('cal')}<span>${p.type === 'promo' ? 'აქცია მოქმედებს: ' : ''}${esc(when)}</span></p>` : ''}
      </header>
      ${cover}
      <div class="rich article__body">${rich(p.body)}</div>
      <div class="article__acts">${go}<button class="btn btn--ghost" type="button" data-share>${ui('link')}ბმულის გაზიარება</button></div>
    </div>
    ${more.length ? `<section class="sec sec--cloud"><div class="wrap"><div class="sec__head"><div><span class="eyebrow">მედია ცენტრი</span><h2 class="h2">სხვა ${p.type === 'promo' ? 'აქციები' : p.type === 'blog' ? 'სტატიები' : 'სიახლეები'}</h2></div><a class="link" href="media.html?t=${p.type}">ყველა ${arrow()}</a></div><div class="posts">${more.map(postCard).join('')}</div></div></section>` : ''}`;
  $('[data-share]', box).addEventListener('click', async () => {
    try {
      if (navigator.share) await navigator.share({ title: p.title, url: location.href });
      else { await navigator.clipboard.writeText(location.href); toast('ბმული დაკოპირდა'); }
    } catch (e) { /* closed the share sheet */ }
  });
  // search engines: an article with its date and picture
  const ld = { '@context': 'https://schema.org', '@type': p.type === 'blog' ? 'BlogPosting' : 'NewsArticle', headline: p.title, datePublished: p.date, description: p.excerpt || undefined,
    image: p.cover && /^(https?:|\/|[\w-])/.test(p.cover) && !/^data:/.test(p.cover) ? new URL(p.cover, location.href).href : undefined, publisher: { '@type': 'Organization', name: 'Max Comfort' } };
  document.head.insertAdjacentHTML('beforeend', `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`);
  reveal(box);
}

boot({}).then(() => {
  const id = params().get('p');
  if (id) article(id); else list();
}).catch(err => console.error(err));
