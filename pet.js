/* Desk pet — 瑞凌 (Ruiling). Vanilla JS, classic script, no dependencies.
   Loaded on About only: the About section of index.html (he appears while it
   is in view) and about.html (always). Walks along the bottom edge of the
   viewport, idles, jumps now and then, takes up a quiet activity every 8–20 s
   (reading, sitting, scouting …; sleeping late at night), plays a different
   flourish each time he is clicked, can be dragged anywhere and falls back to
   the floor. Dropped in mid-air more than three times in a minute, he is sad.
   prefers-reduced-motion: he stays idle in a corner, still draggable.
   A "Pause him" toggle sits in the note that introduces him. */
(function () {
  'use strict';

  if (!('PointerEvent' in window) || !document.body) return;

  var BASE = 'assets/pet/';
  /* key -> [file, one-cycle duration in ms] (durations read from the GIFs) */
  var GIFS = {
    idle: ['idle.gif', 1800], waiting: ['waiting.gif', 1020], look: ['look-loop.gif', 2560],
    runLeft: ['running-left.gif', 1080], runRight: ['running-right.gif', 1080],
    jump: ['jumping.gif', 820], wave: ['waving.gif', 680],
    /* action pack (assets/pet/actions/manifest.json); "angry" is deliberately left out */
    reading: ['actions/reading.gif', 1380], sitting: ['actions/sitting.gif', 1380],
    lying: ['actions/lying.gif', 1380], breathing: ['actions/breathing.gif', 1380],
    stretch: ['actions/stretch.gif', 1380], scouting: ['actions/scouting.gif', 1380],
    tactics: ['actions/tactics.gif', 1380], sleeping: ['actions/sleeping.gif', 1380],
    cloak: ['actions/cloak-flourish.gif', 920], salute: ['actions/sword-salute.gif', 920],
    badge: ['actions/badge-offering.gif', 1380], parry: ['actions/parry-counter.gif', 1380],
    combo: ['actions/training-combo.gif', 1380], sad: ['actions/sad.gif', 1840]
  };
  var BASE_KEYS = ['idle', 'waiting', 'look', 'runLeft', 'runRight', 'jump', 'wave'];
  var IDLE_KINDS = ['idle', 'waiting', 'look', 'idle'];
  /* quiet activities while idle; [key, cycles] — one-shot GIFs (stretch, tactics) play once */
  var ACTIVITIES = [['reading', 5], ['sitting', 4], ['lying', 4], ['breathing', 3],
                    ['stretch', 1], ['scouting', 3], ['tactics', 1]];
  /* clicks cycle through these instead of always waving */
  var FLOURISHES = ['wave', 'cloak', 'salute', 'badge', 'parry', 'combo'];

  var W = 104, H = 113;
  var SPEED = 110, GRAVITY = 2600, MARGIN = 8;

  var reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  /* ---- lazy loading: the seven base states up front, then only the next action ---- */
  var cache = {};
  function load(key) {
    if (!cache[key]) { var im = new Image(); im.src = BASE + GIFS[key][0]; cache[key] = im; }
    return cache[key];
  }
  BASE_KEYS.forEach(load);

  /* ---- element ---- */
  var el = document.createElement('div');
  el.className = 'pet';
  el.id = 'desk-pet';
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', '瑞凌 (Ruiling), my original character. Press to see a flourish; drag to move him.');
  var img = document.createElement('img');
  img.alt = '';
  img.width = 192;
  img.height = 208;
  img.draggable = false;
  el.appendChild(img);
  document.body.appendChild(el);

  /* On index.html he belongs to the About section; elsewhere he is always on. */
  var zone = document.querySelector('.pj #about');
  var active = !zone;
  if (zone) { el.classList.add('is-zoned'); el.setAttribute('aria-hidden', 'true'); el.setAttribute('tabindex', '-1'); }
  else document.body.classList.add('has-pet');

  function measure() {
    var r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) { W = r.width; H = r.height; }
  }
  measure();

  /* ---- state ---- */
  var state = 'idle', x = 24, y = 0;
  var timer = null, raf = null;
  var paused = false, userPaused = false;
  var lastJump = Date.now(), nextJumpGap = rand(10000, 20000);
  var nextActAt = Date.now() + rand(8000, 20000), nextAct = null;
  var flourishIdx = 0;
  var drops = [];              /* times he was let go in mid-air */
  var drag = null, currentGif = '', afterLand = null;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  /* clientWidth excludes a classic scrollbar, so he is never clipped on the right */
  function viewW() { return document.documentElement.clientWidth || window.innerWidth; }
  function viewH() { return document.documentElement.clientHeight || window.innerHeight; }
  function maxX() { return Math.max(0, viewW() - W); }
  function maxY() { return Math.max(0, viewH() - H); }
  function clampX(v) { return Math.max(0, Math.min(maxX(), v)); }
  function clampY(v) { return Math.max(0, Math.min(maxY(), v)); }
  function corner() { return clampX(maxX() - 16); }
  function homeX() { return viewW() < 600 ? corner() : (zone ? viewW() * 0.62 : 24); }

  function place() { el.style.transform = 'translate3d(' + Math.round(x) + 'px,' + (-Math.round(y)) + 'px,0)'; }
  function setGif(key) {
    if (currentGif === key) return;
    currentGif = key;
    img.src = load(key).src;
  }
  function stopTimers() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    el.classList.remove('is-hopping');
  }
  function setState(name, gif) { stopTimers(); state = name; setGif(gif); }
  function still() { return reduced.matches || paused || userPaused || !active; }

  /* choose the next idle activity now and fetch only that GIF */
  function planActivity() {
    var h = new Date().getHours();
    var night = h >= 23 || h < 6;
    nextAct = night && Math.random() < 0.6 ? ['sleeping', 5] : pick(ACTIVITIES);
    nextActAt = Date.now() + rand(8000, 20000);
    load(nextAct[0]);
  }
  function nextFlourish() { return FLOURISHES[flourishIdx % FLOURISHES.length]; }

  /* ---- behaviours ---- */
  function idle(kind) { setState('idle', kind || pick(IDLE_KINDS)); schedule(); }
  function settle(kind) {
    if (y > 0 && !reduced.matches) { fall(); return; }
    y = 0; place(); idle(kind);
  }
  function schedule() {
    if (timer) clearTimeout(timer);
    timer = null;
    if (still() || state !== 'idle') return;
    timer = setTimeout(decide, rand(2500, 6000));
  }
  function decide() {
    timer = null;
    if (state !== 'idle' || still()) return;
    if (y > 0) { fall(); return; }
    if (nextAct && Date.now() >= nextActAt) { activity(); return; }
    if (Date.now() - lastJump > nextJumpGap) { jump(); return; }
    if (Math.random() < 0.42) walk(); else idle();
  }
  function activity() {
    var a = nextAct;
    setState('act', a[0]);
    timer = setTimeout(function () {
      timer = null;
      planActivity();
      if (state === 'act') idle('idle');
    }, GIFS[a[0]][1] * a[1]);
  }
  function jump() {
    setState('jump', 'jump');
    lastJump = Date.now();
    nextJumpGap = rand(10000, 20000);
    void el.offsetWidth;
    el.classList.add('is-hopping');
    timer = setTimeout(function () {
      timer = null;
      el.classList.remove('is-hopping');
      if (state === 'jump') settle('idle');
    }, GIFS.jump[1]);
  }
  function walk() {
    if (y > 0) { fall(); return; }
    var span = maxX();
    if (span < 160) { idle(); return; }
    var target = clampX(rand(MARGIN, span - MARGIN)), tries = 0;
    while (Math.abs(target - x) < 80 && tries++ < 8) target = clampX(rand(MARGIN, span - MARGIN));
    var dir = target > x ? 1 : -1;
    setState('walk', dir > 0 ? 'runRight' : 'runLeft');
    var last = performance.now();
    function step(t) {
      var dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      x += dir * SPEED * dt;
      var edge = maxX();
      if (target > edge) target = edge;
      if ((dir > 0 && x >= target) || (dir < 0 && x <= target)) {
        x = Math.max(0, Math.min(edge, target)); place(); raf = null; idle(); return;
      }
      place();
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
  }
  /* one-shot: a flourish on click, or "sad" after too many mid-air drops */
  function oneShot(key) {
    setState('shot', key);
    var d = GIFS[key][1];
    var ms = Math.max(1200, Math.ceil(1200 / d) * d);
    if (key === 'sad') ms = d * 2;
    timer = setTimeout(function () {
      timer = null;
      if (state === 'shot') settle('idle');
    }, ms);
  }
  function flourish() {
    var key = nextFlourish();
    flourishIdx++;
    load(nextFlourish());                 /* fetch the one after, nothing more */
    oneShot(key);
  }
  function fall() {
    if (y <= 0) { y = 0; place(); landed(); return; }
    setState('fall', 'jump');
    var v = 0, last = performance.now();
    function step(t) {
      var dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      v += GRAVITY * dt;
      y -= v * dt;
      if (y <= 0) { y = 0; place(); raf = null; landed(); return; }
      place();
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
  }
  function landed() {
    var next = afterLand;
    afterLand = null;
    if (next === 'sad') oneShot('sad');
    else if (next === 'flourish') flourish();
    else idle('idle');
  }

  /* ---- dragging (Pointer Events: mouse, touch, pen) ---- */
  el.addEventListener('pointerdown', function (e) {
    if (!active) return;
    if (e.button !== undefined && e.button !== 0) return;
    if (drag) return;
    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    stopTimers();
    state = 'held';
    drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: x, oy: y, moved: false };
  });
  el.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved) {
      if (Math.abs(dx) + Math.abs(dy) < 6) return;
      drag.moved = true;
      afterLand = null;
      setState('drag', 'jump');
      el.classList.add('is-dragging');
    }
    x = clampX(drag.ox + dx);
    y = clampY(drag.oy - dy);
    place();
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var moved = drag.moved;
    drag = null;
    el.classList.remove('is-dragging');
    try { el.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    if (!moved) {
      if (y > 0 && !reduced.matches) { afterLand = 'flourish'; fall(); } else { y = 0; place(); flourish(); }
      return;
    }
    if (y > 20) {                         /* let go off the floor */
      var now = Date.now();
      drops = drops.filter(function (t) { return now - t < 60000; });
      drops.push(now);
      if (drops.length > 3) { drops = []; load('sad'); afterLand = 'sad'; }
    }
    if (reduced.matches) { y = 0; place(); landed(); } else fall();
  }
  el.addEventListener('pointerup', endDrag);
  el.addEventListener('pointercancel', endDrag);
  el.addEventListener('lostpointercapture', endDrag);
  el.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  /* keyboard: Enter / Space for a flourish, arrows nudge him along the floor */
  el.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (state === 'fall') afterLand = 'flourish'; else flourish();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (state === 'walk' || state === 'drag' || state === 'held' || state === 'fall') return;
      x = clampX(x + (e.key === 'ArrowLeft' ? -40 : 40));
      place();
    }
  });

  window.addEventListener('resize', function () {
    measure();
    x = clampX(x); y = clampY(y);
    if (reduced.matches && !drag) { x = corner(); y = 0; }
    place();
  });

  /* ---- "Pause him" toggle, inside the note that introduces him ---- */
  var note = document.querySelector('.pet-note');
  if (note) {
    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'pet-toggle';
    toggle.setAttribute('aria-pressed', 'false');
    toggle.textContent = 'Pause him';
    toggle.addEventListener('click', function () {
      userPaused = !userPaused;
      toggle.setAttribute('aria-pressed', String(userPaused));
      toggle.textContent = userPaused ? 'Let him wander' : 'Pause him';
      if (drag) return;
      if (userPaused) { stopTimers(); y = 0; setState('idle', 'idle'); place(); }
      else if (!reduced.matches) idle('idle');
    });
    note.appendChild(toggle);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      paused = true;
      if (drag) return;
      stopTimers(); y = 0; setState('idle', 'idle'); place();
    } else {
      paused = false;
      if (state === 'idle') schedule();
    }
  });

  function applyMotionPreference() {
    stopTimers();
    if (reduced.matches) { x = corner(); y = 0; setState('idle', 'idle'); place(); }
    else { place(); idle('idle'); }
  }
  if (reduced.addEventListener) reduced.addEventListener('change', applyMotionPreference);
  else if (reduced.addListener) reduced.addListener(applyMotionPreference);

  /* ---- on / off with the About section on index.html ---- */
  if (zone && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting === active) return;
        active = e.isIntersecting;
        el.classList.toggle('is-on', active);
        el.setAttribute('aria-hidden', String(!active));
        el.setAttribute('tabindex', active ? '0' : '-1');
        if (active) { measure(); x = clampX(x); applyMotionPreference(); }
        else { drag = null; el.classList.remove('is-dragging'); stopTimers(); state = 'off'; }
      });
    }, { threshold: 0.2 }).observe(zone);
  }

  /* ---- start ---- */
  x = homeX();
  planActivity();
  load(nextFlourish());
  if (active) applyMotionPreference(); else place();
})();
