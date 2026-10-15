/* Home: hero rotator, popular products, recently viewed. */
ANDE.page(function (A) {
  'use strict';

  /* ---- hero rotator ---- */
  var hero = A.$('.hero');
  if (hero) {
    var tabs = A.$$('.htab', hero), shots = A.$$('.shot', hero), bgs = A.$$('.hero__bg img', hero);
    var MS = 6000, cur = 0, timer = null, startedAt = 0, left = MS, paused = false;
    hero.style.setProperty('--hero-ms', MS + 'ms');
    var show = function (n) {
      cur = (n + tabs.length) % tabs.length;
      tabs.forEach(function (t, i) { t.setAttribute('aria-selected', String(i === cur)); t.tabIndex = i === cur ? 0 : -1; });
      shots.forEach(function (s, i) { var on = i === cur; s.classList.toggle('is-on', on); s.setAttribute('aria-hidden', String(!on)); s.tabIndex = on ? 0 : -1; });
      bgs.forEach(function (b, i) { b.classList.toggle('is-on', i === cur); });
    };
    var schedule = function (ms) {
      clearTimeout(timer);
      if (A.reduceMotion || paused) return;
      left = ms; startedAt = Date.now();
      timer = setTimeout(function () { show(cur + 1); schedule(MS); }, ms);
    };
    var pause = function () { if (paused) return; paused = true; hero.classList.add('is-paused'); clearTimeout(timer); left = Math.max(0, left - (Date.now() - startedAt)); };
    var resume = function () { if (!paused) return; paused = false; hero.classList.remove('is-paused'); schedule(left); };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { show(i); schedule(MS); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return; e.preventDefault(); show(cur + d); tabs[cur].focus(); schedule(MS);
      });
    });
    var card = A.$('.hero__card', hero);
    card.addEventListener('mouseenter', pause);
    card.addEventListener('mouseleave', resume);
    card.addEventListener('focusin', pause);
    card.addEventListener('focusout', function (e) { if (!card.contains(e.relatedTarget)) resume(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); else resume(); });
    show(0); schedule(MS);
  }

  /* ---- category bento: on wide screens the tiles take turns in the big slot.
     The big tile's product grows and its subcategories slide out; then the top-right tile
     moves in, the big one goes to the bottom left, the bottom row shifts right and the
     bottom-right tile moves up. Pauses on hover, off screen and in a hidden tab. ---- */
  var bento = A.$('[data-bento]');
  if (bento) {
    var tiles = A.$$('.tile', bento), slots = tiles.map(function (t, i) { return i; });
    var NEXT = [2, 0, 3, 4, 1];               // from slot 0..4, the slot a tile moves to
    var FOLD = 250, MOVE = 900, STAY = 4000;  // fold subcategories, travel, stay featured
    var wide = matchMedia('(min-width:1025px)');
    var bTimer = null, busy = false, held = false, seen = false;
    var paint = function () { tiles.forEach(function (t, i) { t.dataset.slot = slots[i]; }); };
    var feature = function () { tiles.forEach(function (t, i) { t.classList.toggle('is-feature', slots[i] === 0); }); };
    var running = function () { return wide.matches && seen && !held && !document.hidden && !A.reduceMotion; };
    var later = function () { clearTimeout(bTimer); if (running() && !busy) bTimer = setTimeout(turn, STAY); };
    var turn = function () {
      if (!running()) return;
      busy = true;
      tiles.forEach(function (t) { t.classList.remove('is-feature'); });
      setTimeout(function () {
        slots = slots.map(function (s) { return NEXT[s]; }); paint();
        setTimeout(function () { feature(); busy = false; later(); }, MOVE);
      }, FOLD);
    };
    var mode = function () {
      // switch layouts without animating into it (no fade-out of the small tiles' lists on load)
      bento.classList.add('is-settling');
      bento.classList.toggle('is-live', wide.matches);
      requestAnimationFrame(function () { requestAnimationFrame(function () { bento.classList.remove('is-settling'); }); });
      later();
    };
    paint(); feature(); mode();
    wide.addEventListener('change', mode);
    bento.addEventListener('mouseenter', function () { held = true; clearTimeout(bTimer); });
    bento.addEventListener('mouseleave', function () { held = false; later(); });
    bento.addEventListener('focusin', function () { held = true; clearTimeout(bTimer); });
    bento.addEventListener('focusout', function (e) { if (!bento.contains(e.relatedTarget)) { held = false; later(); } });
    document.addEventListener('visibilitychange', later);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { seen = es[0].isIntersecting; later(); }, { threshold: 0.4 }).observe(bento);
    } else { seen = true; later(); }
  }

  /* ---- popular products (real items from the test shop) ---- */
  var POPULAR = [2159, 1005, 1792, 2169, 1159, 1762, 1010, 1953];
  var grid = A.$('[data-pgrid]');
  var picks = A.collapse(POPULAR.map(A.byId).filter(Boolean));
  function render(f) {
    grid.innerHTML = picks.filter(function (p) { return f === 'all' || p.cat === f; }).map(A.card).join('');
    A.caps(grid);
  }
  render('all');
  A.$$('.ptab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      A.$$('.ptab').forEach(function (t) { t.setAttribute('aria-selected', String(t === tab)); });
      grid.classList.add('is-swapping');
      setTimeout(function () { render(tab.dataset.filter); grid.classList.remove('is-swapping'); }, A.reduceMotion ? 0 : 180);
    });
  });

  /* ---- recently viewed ---- */
  var rec = A.recent.list().slice(0, 8);
  var recSec = A.$('[data-recent]');
  if (recSec && rec.length >= 2) {
    recSec.hidden = false;
    A.$('[data-recent-grid]').innerHTML = A.collapse(rec.map(A.byId)).map(A.card).join('');
  }
});
