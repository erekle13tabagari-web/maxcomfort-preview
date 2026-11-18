import { boot, $, $$, esc, ui, bi, arrow, t, reveal, C } from './core.js';
import { today, niceDate } from './posts.js';

/* career.html: the open positions from the admin panel (ვაკანსიები: title, place, type, text, last day, shown or
   not) and the application form, which becomes a Bitrix lead "ვაკანსიის განაცხადი" (api/lead.php, kind career).
   A position leaves the page once its last day is over. */
const paras = s => String(s || '').split(/\n+/).map(x => x.trim()).filter(Boolean).map(x => `<p>${esc(x)}</p>`).join('');

function jobHTML(j, open) {
  const meta = [j.place, j.type, j.to ? 'ბოლო ვადა: ' + niceDate(j.to) : ''].filter(Boolean);
  return `<details class="job reveal" ${open ? 'open' : ''}>
    <summary><span class="job__t"><b>${esc(j.title)}</b>${meta.length ? `<span class="job__meta">${meta.map(m => `<span>${esc(m)}</span>`).join('')}</span>` : ''}</span>${ui('down', 'job__chev')}</summary>
    <div class="job__b">${j.text ? `<div class="job__text">${paras(j.text)}</div>` : ''}<a class="btn btn--red btn--sm" href="#apply" data-job="${esc(j.title)}">განაცხადის გაგზავნა ${arrow()}</a></div>
  </details>`;
}

const EMPTY = `<div class="jobs__empty reveal">${bi('svc-consult')}<div><h3>ამ ეტაპზე ღია ვაკანსია არ გვაქვს</h3>
  <p>გამოგვიგზავნეთ რეზიუმე: შევინახავთ და დაგიკავშირდებით, როცა შესაფერისი ადგილი გაჩნდება.</p></div>
  <a class="btn btn--red" href="#apply">რეზიუმეს გაგზავნა ${arrow()}</a></div>`;

boot({}).then(() => {
  const day = today();
  const jobs = ((C.cms || {}).jobs || []).filter(j => j && j.on && j.title && (!j.to || j.to >= day));
  $('[data-jobs]').innerHTML = jobs.length ? jobs.map((j, i) => jobHTML(j, jobs.length === 1 && i === 0)).join('') : EMPTY;

  // the form's positions: the open ones, then the directions (their titles as the admin panel has them), then anything else
  const dirs = $$('[data-dir]').map(h => t(h.dataset.c, h.textContent.trim().toLowerCase()));
  const sel = $('[data-positions]');
  sel.innerHTML = '<option value="">აირჩიეთ</option>'
    + (jobs.length ? `<optgroup label="ღია ვაკანსიები">${jobs.map(j => `<option>${esc(j.title)}</option>`).join('')}</optgroup>` : '')
    + `<optgroup label="მიმართულებები">${dirs.map(d => `<option>${esc(d)}</option>`).join('')}</optgroup><option>სხვა</option>`;

  // the CV by e-mail: the subject names the position
  const mail = $('[data-cv-mail]');
  const setMail = pos => { mail.href = `mailto:${C.email}?subject=${encodeURIComponent('რეზიუმე' + (pos ? ': ' + pos : ''))}`; };
  setMail('');
  sel.addEventListener('change', () => setMail(sel.value));
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-job]');
    if (!b) return;
    sel.value = b.dataset.job;
    setMail(b.dataset.job);
  });

  reveal();
  if (location.hash) setTimeout(() => { const el = $(location.hash); if (el) el.scrollIntoView(); }, 50);
}).catch(err => console.error(err));
