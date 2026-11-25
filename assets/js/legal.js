import { boot, $, crumbs } from './core.js';

/* privacy.html, consent.html, marketing.html: the legal documents (adapted from biomi.ge, 2026-11-25). The text is in
   the page itself; this only draws the header, footer and the crumbs. */
boot({}).then(() => {
  $('[data-crumbs]').innerHTML = crumbs([['იურიდიული', null], [$('h1').textContent, null]]);
}).catch(err => console.error(err));
