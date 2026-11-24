import { boot, $, $$, reveal } from './core.js';

/* installer.html: the installer sign-up. The form is a [data-lead-form] like the site's other forms: core.js sends
   it to api/lead.php (kind installer), which makes a deal in Bitrix's installer pipeline, as the old site's form did.
   The ticked directions travel as one field (dirs). */
boot({}).then(() => {
  const form = $('[data-lead-form="installer"]');
  const dirs = $('input[name="dirs"]', form);
  form.addEventListener('change', e => {
    if (e.target.matches('[data-dir-pick]')) dirs.value = $$('[data-dir-pick]:checked', form).map(c => c.value).join(', ');
  });
  reveal();
  if (location.hash) setTimeout(() => { const el = $(location.hash); if (el) el.scrollIntoView(); }, 50);
}).catch(err => console.error(err));
