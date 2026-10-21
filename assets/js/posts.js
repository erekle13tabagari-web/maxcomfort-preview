/* Media centre posts (news, blog, promotions) from the site content: which are live, their cards and dates.
   Used by the media centre (media.js) and the home page's promotions. */
import { C, esc, ui, safeUrl } from './core.js';

export const TYPES = { news: 'სიახლე', blog: 'ბლოგი', promo: 'აქცია' };
const MONTHS = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];

/** 2026-10-21 in this computer's time zone. */
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** 2026-10-21 -> 21 ოქტომბერი 2026 (without the year when it is this year and short is set). */
export function niceDate(s, short = false) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
  if (!m) return '';
  const y = +m[1] === new Date().getFullYear() && short ? '' : ' ' + m[1];
  return `${+m[3]} ${MONTHS[+m[2] - 1]}${y}`;
}

/** Published posts of a type (or all), newest first; pinned ones lead. A promotion leaves once its last day is over. */
export function livePosts(type = '') {
  const t = today();
  return ((C.cms || {}).posts || [])
    .filter(p => p && p.on && p.title && TYPES[p.type] && (!type || p.type === type) && (p.date || '') <= t && !(p.type === 'promo' && p.to && p.to < t))
    .sort((a, b) => (!!b.pin - !!a.pin) || String(b.date || '').localeCompare(String(a.date || '')));
}

export const postUrl = p => 'media.html?p=' + encodeURIComponent(p.id);
export const promoDates = p => p.type === 'promo' && (p.from || p.to)
  ? (p.from && p.to ? `${niceDate(p.from, true)} - ${niceDate(p.to)}` : p.to ? `${niceDate(p.to)}-მდე` : `${niceDate(p.from)}-დან`) : '';

export function postCard(p) {
  const img = p.cover && safeUrl(p.cover, true) ? `<img src="${esc(p.cover)}" alt="" loading="lazy">` : '<span class="post__mark" aria-hidden="true"></span>';
  const when = promoDates(p);
  return `<a class="post reveal" href="${postUrl(p)}">
    <span class="post__img">${img}</span>
    <span class="post__meta"><span class="tag ${p.type === 'promo' ? 'tag--red' : ''}">${TYPES[p.type]}</span><time datetime="${esc(p.date)}">${esc(niceDate(p.date))}</time></span>
    <b class="post__t">${esc(p.title)}</b>
    ${p.excerpt ? `<span class="post__x">${esc(p.excerpt)}</span>` : ''}
    ${when ? `<small class="post__when">${ui('cal', 'ui--sm')}${esc(when)}</small>` : ''}
  </a>`;
}
