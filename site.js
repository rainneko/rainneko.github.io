/* Ruilin Wang — site script (classic script, no dependencies).
   1. Mode switch (Industry | Academic): runs at once, in <head>, before paint.
   2. Renders papers, projects, Now and About from window.SITE (data.js).
   3. Decorated-initial words (MOI, HI, THANKS) and the academic headpiece band.
   4. Job page: the split interface (sticky panel wipes, side mirroring, nav state, reveal).
   Everything degrades: without JS each page shows its <noscript> lists. */
(function () {
  'use strict';

  var d = document, root = d.documentElement;
  var KEY = 'rw-mode';
  var page = root.getAttribute('data-page');          /* job | academic | about | now */

  /* ---------- 1. mode ---------- */
  function store(k, v, session) {
    try { (session ? sessionStorage : localStorage).setItem(k, v); } catch (e) { /* private mode */ }
  }
  function read(k, session) {
    try { return (session ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; }
  }
  var q = null;
  try { q = new URLSearchParams(location.search).get('mode'); } catch (e) { /* old engine */ }
  if (q !== 'job' && q !== 'academic') q = null;
  if (q) store(KEY, q);
  var saved = q || read(KEY);
  var mode;
  if (page === 'job' || page === 'academic') {
    if (saved && saved !== page) {
      location.replace((saved === 'job' ? 'index.html' : 'academic.html') + location.hash);
      return;
    }
    mode = page;
    store(KEY, page, true);               /* About / Now follow the page you came from */
  } else {
    mode = saved || read(KEY, true) || root.getAttribute('data-mode') || 'academic';
  }
  root.setAttribute('data-mode', mode);
  if (q && history.replaceState) {
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* file:// */ }
  }

  function setMode(m) {
    mode = m;
    store(KEY, m);
    store(KEY, m, true);
    root.setAttribute('data-mode', m);
    markPill();
  }
  function markPill() {
    each(d.querySelectorAll('[data-mode-set]'), function (a) {
      if (a.getAttribute('data-mode-set') === mode) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  /* ---------- helpers ---------- */
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function h(tag, attrs, kids) {
    var el = d.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k) && attrs[k] != null) el.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) {
      if (c == null) return;
      el.appendChild(typeof c === 'string' ? d.createTextNode(c) : c);
    });
    return el;
  }
  /* runs of Chinese get lang="zh-Hans" so the right glyph forms are used */
  var CJK = /[　-〿一-鿿＀-￯]+/g;
  function text(str) {
    var f = d.createDocumentFragment(), last = 0, m;
    CJK.lastIndex = 0;
    while ((m = CJK.exec(str)) !== null) {
      if (m.index > last) f.appendChild(d.createTextNode(str.slice(last, m.index)));
      f.appendChild(h('span', { lang: 'zh-Hans' }, [m[0]]));
      last = m.index + m[0].length;
    }
    if (last < str.length) f.appendChild(d.createTextNode(str.slice(last)));
    return f;
  }
  function authors(str, me) {
    var p = d.createDocumentFragment();
    str.split(', ').forEach(function (n, i) {
      if (i) p.appendChild(d.createTextNode(', '));
      p.appendChild(n === me ? h('strong', null, [n]) : d.createTextNode(n));
    });
    return p;
  }
  function arrow() { return h('span', { 'aria-hidden': 'true' }, ['↗']); }
  function sep() { return h('span', { 'class': 'sep', 'aria-hidden': 'true' }, ['·']); }
  function fill(sel, fn) {
    each(d.querySelectorAll(sel), function (el) { el.textContent = ''; fn(el); });
  }

  /* ---------- 2. renderers ---------- */
  function render(S) {
    var ME = S.person.name;
    var TYPE = { journal: 'Journal', conference: 'Conference' };
    var TYPE_LONG = { journal: 'Journal article', conference: 'Conference paper' };

    /* job: papers (v3 markup) */
    fill('[data-render="papers-job"]', function (ol) {
      S.publications.forEach(function (p) {
        var links = h('p', { 'class': 'links' }, [h('a', { href: p.url }, ['doi:' + p.doi])]);
        if (p.data_url) links.appendChild(h('a', { href: p.data_url }, ['Data on Zenodo ', arrow()]));
        ol.appendChild(h('li', { 'class': 'paper reveal' }, [
          h('h3', { 'class': 'paper__title' }, [h('a', { href: p.url }, [p.title])]),
          h('p', { 'class': 'paper__authors' }, [authors(p.authors, ME)]),
          h('p', { 'class': 'paper__venue' }, [h('span', { 'class': 'paper__type' }, [TYPE[p.type] || p.type]), ' ' + p.venue + ', ' + p.year]),
          h('p', { 'class': 'paper__line' }, [p.one_line]),
          h('ul', { 'class': 'tags', 'aria-label': 'Keywords' }, p.tags.map(function (t) { return h('li', null, [t]); })),
          links
        ]));
      });
    });

    /* job: one section per project (v3 markup) */
    var THUMBS_FROM = { nero: 1 };
    var THUMBS_LABEL = { atlas: 'More pages of the atlas', nero: 'More views of the city' };
    fill('[data-render="project-job"]', function (box) {
      var key = box.getAttribute('data-key'), i = 0, pr = null;
      S.projects.forEach(function (p, j) { if (p.key === key) { pr = p; i = j; } });
      if (!pr) return;
      if (i === 0) box.appendChild(h('h2', { 'class': 'sec__label reveal' }, ['Built']));
      box.appendChild(h('p', { 'class': 'proj__kicker reveal' }, [
        h('span', { 'class': 'chip' + (pr.status.indexOf('live') === 0 ? ' chip--live' : '') }, [pr.status]),
        h('span', { 'class': 'proj__idx' }, [(i + 1) + ' / ' + S.projects.length])
      ]));
      box.appendChild(h('h3', { 'class': 'proj__name reveal' }, [h('a', { href: pr.url }, [pr.name])]));
      box.appendChild(h('p', { 'class': 'proj__line reveal' }, [text(pr.one_line)]));
      box.appendChild(h('ul', { 'class': 'proj__bullets reveal' }, pr.bullets.map(function (b) {
        var m = /^(\/\S+)(.*)$/.exec(b);
        return m ? h('li', null, [h('code', null, [m[1]]), m[2]]) : h('li', null, [text(b)]);
      })));
      box.appendChild(h('ul', { 'class': 'stack reveal', 'aria-label': 'Stack' }, pr.stack.map(function (s) { return h('li', null, [s]); })));
      var cta = h('p', { 'class': 'hero__cta reveal' });
      if (pr.url !== pr.repo || !pr.repo) cta.appendChild(h('a', { 'class': 'btn btn--primary', href: pr.url }, ['Open the atlas ', arrow()]));
      if (pr.repo) cta.appendChild(h('a', { 'class': 'btn' + (pr.url === pr.repo ? ' btn--primary' : ''), href: pr.repo, 'aria-label': pr.name + ' on GitHub' }, ['GitHub ', arrow()]));
      box.appendChild(cta);
      if (THUMBS_FROM[key] != null) {
        box.appendChild(h('ul', { 'class': 'thumbs reveal', 'aria-label': THUMBS_LABEL[key] },
          pr.media.slice(THUMBS_FROM[key]).map(function (m) {
            return h('li', null, [h('figure', null, [
              h('img', { src: m.src, alt: m.alt, loading: 'lazy', width: m.w, height: m.h }),
              h('figcaption', null, [m.cap])
            ])]);
          })));
      }
    });

    /* academic: publications (v4 markup) */
    fill('[data-render="pubs-acad"]', function (ol) {
      S.publications.forEach(function (p) {
        var links = h('p', { 'class': 'pub-links' }, [h('a', { href: p.url }, ['doi:' + p.doi])]);
        if (p.data_url) { links.appendChild(sep()); links.appendChild(h('a', { href: p.data_url }, ['Data on Zenodo'])); }
        ol.appendChild(h('li', { 'class': 'pub', id: 'pub-' + p.key }, [
          h('p', { 'class': 'kicker' }, [(TYPE_LONG[p.type] || p.type) + ' · ' + p.year]),
          h('h3', { 'class': 'pub-title' }, [h('a', { href: p.url }, [p.title])]),
          h('p', { 'class': 'pub-authors' }, [authors(p.authors, ME)]),
          h('p', { 'class': 'pub-venue' }, [p.venue]),
          h('p', { 'class': 'pub-line' }, [p.one_line]),
          links,
          h('ul', { 'class': 'tags', 'aria-label': 'Keywords' }, p.tags.map(function (t) { return h('li', null, [t]); }))
        ]));
      });
    });

    /* academic: project cards (v4 markup) */
    fill('[data-render="cards-acad"]', function (grid) {
      S.projects.forEach(function (pr) {
        var m = pr.media[0];
        var links = h('p', { 'class': 'card-links' });
        if (pr.url !== pr.repo) {
          links.appendChild(h('a', { href: pr.url, 'aria-label': 'Live site: ' + pr.name }, ['Live site ', arrow()]));
          if (pr.repo) links.appendChild(sep());
        }
        if (pr.repo) links.appendChild(h('a', { href: pr.repo, 'aria-label': 'GitHub: ' + pr.name }, ['GitHub ', arrow()]));
        grid.appendChild(h('article', { 'class': 'card', id: pr.key }, [
          pr.key === 'atlas' ? h('div', { 'class': 'card-media mosaic mosaic--card', 'data-mosaic': '12' }) : h('div', { 'class': 'card-media' }, [h('img', { loading: 'lazy', alt: m.alt, width: m.w, height: m.h, src: m.src })]),
          h('div', { 'class': 'card-body' }, [
            h('span', { 'class': 'status' }, [pr.status]),
            h('h3', null, [h('a', { href: pr.url }, [pr.name])]),
            h('p', null, [text(pr.one_line)]),
            links
          ])
        ]));
      });
    });

    /* Now */
    fill('[data-render="now-job"]', function (ul) {
      S.now.items.forEach(function (it) { ul.appendChild(h('li', { 'class': 'reveal' }, [it.text])); });
    });
    fill('[data-render="now-acad"]', function (ol) {
      S.now.items.forEach(function (it) { ol.appendChild(h('li', null, [it.text])); });
    });
    fill('[data-render="now-updated"]', function (el) {
      el.appendChild(d.createTextNode((el.getAttribute('data-prefix') || '') + S.now.updated));
    });

    /* About: path, paragraph, pet sentence */
    fill('[data-render="path-job"]', function (ol) {
      S.about.path.forEach(function (x) {
        ol.appendChild(h('li', { 'class': 'reveal' }, [h('span', { 'class': 'path__when' }, [x.when]), h('p', null, [x.what])]));
      });
    });
    fill('[data-render="path-acad"]', function (ol) {
      S.about.path.forEach(function (x) {
        ol.appendChild(h('li', null, [h('span', { 'class': 'when' }, [x.when]), h('p', { 'class': 'what' }, [x.what])]));
      });
    });
    fill('[data-render="bio"]', function (p) { p.appendChild(d.createTextNode(S.about.one_paragraph)); });
    fill('[data-render="pet-sentence"]', function (p) { p.appendChild(text(S.about.pet_sentence)); });
  }

  /* ---------- 3. ornaments ---------- */
  function tile(S, ch, lazy) {
    var L = S.ornaments.letters[ch];
    if (!L) {   /* no woodcut for this letter: a type letter in the same frame */
      return h('li', { 'class': 'tile tile--type' }, [h('span', { 'class': 'tile__in' }, [h('span', { 'class': 'tile__type' }, [ch])])]);
    }
    var alt = L.factotum
      ? 'Letter ' + ch + ' set in a factotum (atlas class ' + L.cls + ')'
      : 'Decorated initial ' + ch + ' (atlas class ' + L.cls + ')';
    var inner = h('span', { 'class': 'tile__in', style: '--ar:' + L.w + '/' + L.h }, [
      h('img', { src: L.src, alt: alt, width: L.w, height: L.h, loading: lazy ? 'lazy' : null, decoding: 'async' })
    ]);
    if (L.factotum) {
      var b = L.box;
      inner.appendChild(h('span', { 'class': 'tile__type', 'aria-hidden': 'true',
        style: 'left:' + b[0] + '%;top:' + b[1] + '%;width:' + b[2] + '%;height:' + b[3] + '%' }, [ch]));
    }
    return h('li', { 'class': 'tile' + (L.factotum ? ' tile--ft' : '') }, [
      h('a', { href: L.url, title: 'ECCO Ornament Atlas: ' + L.cls }, [inner])
    ]);
  }
  function words(S) {
    each(d.querySelectorAll('[data-word]'), function (box) {
      var w = box.getAttribute('data-word'), lazy = box.hasAttribute('data-lazy');
      var ul = h('ul', { 'class': 'word__tiles', 'aria-label': w.charAt(0) + w.slice(1).toLowerCase() + ', spelt in decorated initials' });
      w.split('').forEach(function (ch) { ul.appendChild(tile(S, ch, lazy)); });
      box.textContent = '';
      box.appendChild(ul);
      box.classList.add('is-built');
    });
  }
  function band(S) {
    each(d.querySelectorAll('[data-render="hp-band"]'), function (box) {
      var track = h('div', { 'class': 'hp-band__track' });
      [0, 1].forEach(function (copy) {           /* two copies make the drift seamless */
        var hps = S.ornaments.headpieces, items = [];
        function hpItem(hp) {
          var a = h('a', { href: hp.url, title: 'ECCO Ornament Atlas: headpiece class ' + hp.cls }, [
            h('img', { src: hp.src, alt: copy ? '' : 'Headpiece, atlas class ' + hp.cls + ': ' + hp.desc, width: hp.w, height: hp.h, decoding: 'async' })
          ]);
          if (copy) a.setAttribute('tabindex', '-1');
          return h('li', null, [a]);
        }
        /* a word in small decorated-initial tiles, set between the headpieces */
        function wordItem(w) {
          var g = h('span', { 'class': 'hp-band__word', role: 'group', 'aria-label': copy ? null : w.charAt(0) + w.slice(1).toLowerCase() + ', in decorated initials' });
          w.split('').forEach(function (ch) {
            var L = S.ornaments.letters[ch];
            if (!L) return;
            var a = h('a', { 'class': 'hp-band__letter', href: L.url, title: 'ECCO Ornament Atlas: ' + L.cls }, [
              h('img', { src: L.src, alt: copy ? '' : 'Decorated initial ' + ch + ', atlas class ' + L.cls, width: L.w, height: L.h, decoding: 'async' })
            ]);
            if (L.factotum) a.appendChild(h('span', { 'class': 'hp-band__type', 'aria-hidden': 'true' }, [ch]));
            if (copy) a.setAttribute('tabindex', '-1');
            g.appendChild(a);
          });
          return h('li', null, [g]);
        }
        /* HP HP M O I HP HP H I HP */
        [0, 1, 'MOI', 2, 3, 'HI', 4].forEach(function (x) {
          if (typeof x === 'string') items.push(wordItem(x));
          else if (hps[x]) items.push(hpItem(hps[x]));
        });
        var ul = h('ul', { 'class': 'hp-band__set' }, items);
        if (copy) ul.setAttribute('aria-hidden', 'true');
        track.appendChild(ul);
      });
      box.textContent = '';
      box.appendChild(track);
    });
  }

  /* ---------- 4. job page: split interface (from v3_split) ---------- */
  function split() {
    var stage = d.querySelector('.stage');
    var panel = d.querySelector('.panel');
    if (!stage) return;
    var layers = toArray(d.querySelectorAll('.panel .layer'));
    var sections = toArray(d.querySelectorAll('.sec[data-panel]'));
    var navLinks = toArray(d.querySelectorAll('.nav a[data-nav]'));
    var indexEl = d.querySelector('.panel__index');
    var desktop = window.matchMedia('(min-width: 901px)');
    var hasIO = 'IntersectionObserver' in window;
    var activeKey = null;
    var activeLayer = d.querySelector('.panel .layer.is-active');
    var prevLayer = null, creamTimer = 0;
    if (panel) root.classList.add('split-on');

    function toArray(l) { return Array.prototype.slice.call(l); }
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function loadLayer(layer) {
      each(layer.querySelectorAll('img[data-src]'), function (img) {
        img.setAttribute('src', img.getAttribute('data-src'));
        img.removeAttribute('data-src');
      });
    }
    function showLayer(key) {
      var next = null;
      for (var i = 0; i < layers.length; i++) if (layers[i].getAttribute('data-layer') === key) { next = layers[i]; break; }
      if (!next || next === activeLayer) return;
      loadLayer(next);
      if (prevLayer && prevLayer !== next && prevLayer !== activeLayer) prevLayer.classList.remove('is-prev');
      if (activeLayer) { activeLayer.classList.remove('is-active'); activeLayer.classList.add('is-prev'); prevLayer = activeLayer; }
      if (next.classList.contains('is-prev')) { next.classList.remove('is-prev'); void next.offsetWidth; }
      next.classList.add('is-active');
      activeLayer = next;
      layers.forEach(function (l) { l.setAttribute('aria-hidden', l === next ? 'false' : 'true'); });
      var cream = next.classList.contains('layer--cream');
      clearTimeout(creamTimer);
      var wait = root.classList.contains('no-wipe') ? 0 : 520;
      creamTimer = setTimeout(function () { if (panel) panel.classList.toggle('is-cream', cream); }, wait);
      if (indexEl) indexEl.textContent = pad(layers.indexOf(next) + 1) + ' / ' + pad(layers.length);
    }
    function setNav(name) {
      navLinks.forEach(function (a) {
        if (a.getAttribute('data-nav') === name) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }
    function activate(sec) {
      var key = sec.getAttribute('data-panel');
      if (key === activeKey) return;
      activeKey = key;
      showLayer(key);
      stage.classList.toggle('is-right', sec.getAttribute('data-side') === 'right');
      setNav(sec.getAttribute('data-nav'));
    }
    var pending = null, pendT = 0, settled = false;
    function queue(sec) {
      pending = sec; clearTimeout(pendT);
      if (!settled) { settled = true; activate(sec); return; }
      pendT = setTimeout(function () { activate(pending); }, 150);
    }
    if (hasIO && sections.length) {
      var mid = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) queue(e.target); });
      }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
      sections.forEach(function (s) { mid.observe(s); });
    }
    /* nav jumps across several sections: no wipe per section until the scroll rests */
    var jumpT = 0, jumpIdle = 0;
    function endJump() { clearTimeout(jumpT); clearTimeout(jumpIdle); root.classList.remove('no-wipe'); }
    function onJumpScroll() { clearTimeout(jumpIdle); jumpIdle = setTimeout(endJump, 260); }
    each(d.querySelectorAll('a[href^="#"]'), function (a) {
      a.addEventListener('click', function () {
        if (!desktop.matches) return;
        root.classList.add('no-wipe');
        clearTimeout(jumpT); jumpT = setTimeout(endJump, 1500);
        window.addEventListener('scroll', onJumpScroll, { passive: true });
        onJumpScroll();
      });
    });
    function warm() {
      if (!desktop.matches) return;
      layers.forEach(function (l, i) { setTimeout(function () { loadLayer(l); }, i * 250); });
    }
    if (d.readyState === 'complete') setTimeout(warm, 300);
    else window.addEventListener('load', function () { setTimeout(warm, 300); });
    if (location.hash && d.fonts && d.fonts.ready) {
      var touched = false, mark = function () { touched = true; };
      ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) { window.addEventListener(ev, mark, { passive: true, once: true }); });
      d.fonts.ready.then(function () {
        var t = d.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (t && !touched) t.scrollIntoView({ block: 'start' });
      });
    }
  }

  function reveal() {
    var rs = Array.prototype.slice.call(d.querySelectorAll('.reveal'));
    function all() { rs.forEach(function (r) { r.classList.add('in'); }); }
    if (!('IntersectionObserver' in window) || !rs.length) { all(); return; }
    try {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting || e.boundingClientRect.top < 0) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { rootMargin: '4000px 0px -6% 0px', threshold: 0.02 });
      rs.forEach(function (r) { io.observe(r); });
      setTimeout(function () {
        rs.forEach(function (r) { if (r.getBoundingClientRect().top < window.innerHeight) r.classList.add('in'); });
      }, 1800);
    } catch (e) { all(); }
  }

  /* ---------- mosaic of real atlas crops (replaces page screenshots) ---------- */
  var ATL = 'https://ecco-atlas-visual-search.2.rahtiapp.fi';
  /* [file stem, taxonomy path, class id, w, h]; hp = headpiece strip, di = decorated initial, tp = factotum */
  var TILES = [
    ['hp_C080_02','HP-ann/subclass','C080_02',900,325], ['di_A_two_cherubs','DI-ann/superclass','A_two_cherubs',207,273], ['tp_17000','FT-ann/superclass','17000',369,335],
    ['di_M_bird_in_the_middle','DI-ann/superclass','M_bird_in_the_middle',224,255], ['hp_C168_01','HP-ann/subclass','C168_01',900,342], ['tp_birds_and_crown','FT-ann/superclass','birds_and_crown',220,280],
    ['hp_C101_01','HP-ann/subclass','C101_01',900,335], ['di_O_character_in_the_middle','DI-ann/superclass','O_character_in_the_middle',251,254], ['hp_C034_01','HP-ann/subclass','C034_01',900,290],
    ['tp_21101','FT-ann/superclass','21101',368,366], ['di_S_a_cherub','DI-ann/superclass','S_a_cherub',229,241], ['hp_C163_07','HP-ann/subclass','C163_07',900,340],
    ['di_E','DI-ann/superclass','E',344,338], ['hp_C067_01','HP-ann/subclass','C067_01',900,343], ['tp_19600','FT-ann/superclass','19600',388,364],
    ['di_N_a_cherub','DI-ann/superclass','N_a_cherub',220,254], ['hp_C164_01','HP-ann/subclass','C164_01',900,298], ['di_T_a_figure_laying_down','DI-ann/superclass','T_a_figure_laying_down',232,225],
    ['hp_C156_01','HP-ann/subclass','C156_01',900,313], ['tp_12601','FT-ann/superclass','12601',243,242], ['di_W_with_angel_face_on_bottom','DI-ann/superclass','W_with_angel_face_on_bottom',234,264],
    ['hp_C051_03','HP-ann/subclass','C051_03',900,298], ['di_C_large','DI-ann/superclass','C_large',352,352], ['tp_8700','FT-ann/superclass','8700',202,221],
    ['hp_C140_01','HP-ann/subclass','C140_01',878,341], ['di_Y_figure_in_the_middle','DI-ann/superclass','Y_figure_in_the_middle',211,275], ['hp_C057_01','HP-ann/subclass','C057_01',900,307],
    ['tp_2_side_kidneys_bowl_on_top','FT-ann/superclass','2_side_kidneys_bowl_on_top',242,270], ['di_F_lying','DI-ann/superclass','F_lying',234,233], ['hp_C102_01','HP-ann/subclass','C102_01',900,252],
    ['di_I_flower_pattern_2','DI-ann/superclass','I_flower_pattern_2',238,234], ['hp_C120_01','HP-ann/subclass','C120_01',900,225], ['tp_9300','FT-ann/superclass','9300',190,221],
    ['hp_vase_middle_two_parterres_vines_02','HP-ann/subclass','vase_middle_two_parterres_vines_02',900,192], ['hp_C025_06','HP-ann/subclass','C025_06',900,146], ['hp_C054_05','HP-ann/subclass','C054_05',900,140]
  ];
  var KIND = { hp: 'Headpiece', di: 'Decorated initial', tp: 'Factotum' };
  /* one real row of the atlas Ornaments table (read from the live /classes page) */
  var RECORD = { id: 'C101_01', desc: 'centered flower in oval border with flanking baskets', images: 253, books: 206, from: 1722, to: 1798 };
  function mosaic() {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    each(d.querySelectorAll('[data-mosaic]'), function (box) {
      box.textContent = '';
      var n = +box.getAttribute('data-mosaic') || TILES.length;
      var grid = h('div', { 'class': 'mosaic__grid' });
      var hit = null;
      TILES.slice(0, n).forEach(function (t, i) {
        var k = t[0].slice(0, 2), wide = k === 'hp';
        var a = h('a', { 'class': 'mosaic__tile' + (wide ? ' is-strip' + (i % 3 === 1 ? ' is-2' : '') : ''), href: ATL + '/class/' + t[1] + '/' + t[2], tabindex: '-1' }, [
          h('img', { src: 'assets/mosaic/' + t[0] + '.jpg', alt: KIND[k] + ', atlas class ' + t[2], width: t[3], height: t[4], loading: 'lazy', decoding: 'async' })
        ]);
        if (t[2] === RECORD.id) hit = a;
        grid.appendChild(a);
      });
      box.appendChild(grid);
      var rec = h('a', { 'class': 'mosaic__rec', href: ATL + '/class/HP-ann/subclass/' + RECORD.id, 'aria-label': 'Open class ' + RECORD.id + ' in the live atlas' }, [
        h('span', { 'class': 'mosaic__url' }, ['ecco-atlas · /classes']),
        h('span', { 'class': 'mosaic__row' }, [
          h('img', { src: 'assets/mosaic/hp_' + RECORD.id + '.jpg', alt: '', width: 900, height: 335 }),
          h('span', { 'class': 'mosaic__id' }, [RECORD.id, h('small', null, [RECORD.desc])]),
          h('span', { 'class': 'mosaic__num' }, [RECORD.images + ' images · ' + RECORD.books + ' books · ' + RECORD.from + '–' + RECORD.to])
        ])
      ]);
      box.appendChild(rec);
      if (!hit) return;
      var NS = 'http://www.w3.org/2000/svg';
      var svg = d.createElementNS(NS, 'svg'), line = d.createElementNS(NS, 'line');
      svg.setAttribute('class', 'mosaic__link'); svg.setAttribute('aria-hidden', 'true');
      svg.appendChild(line); box.appendChild(svg);
      function draw() {
        var b = box.getBoundingClientRect(), p = hit.getBoundingClientRect(), q = rec.querySelector('img').getBoundingClientRect();
        if (!b.width) return;
        line.setAttribute('x1', p.left + p.width / 2 - b.left); line.setAttribute('y1', p.top + p.height / 2 - b.top);
        line.setAttribute('x2', q.left + q.width / 2 - b.left); line.setAttribute('y2', q.top + q.height / 2 - b.top);
      }
      function on() { draw(); hit.classList.add('is-hit'); box.classList.add('is-linked'); }
      if (reduce || !('IntersectionObserver' in window)) { box.classList.add('no-anim'); setTimeout(on, 50); }
      else new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) setTimeout(on, 500); }); }, { threshold: 0.35 }).observe(box);
      window.addEventListener('resize', draw);
      box.addEventListener('transitionend', draw);
    });
  }

  /* ---------- boot ---------- */
  root.classList.add('js');
  function boot() {
    var S = window.SITE;
    if (S) { render(S); words(S); band(S); }
    mosaic();
    markPill();
    /* On About / Now the pill switches the chrome in place; on the two home
       pages it is a plain link (?mode=…) that also works without JS. */
    if (page === 'about' || page === 'now') {
      each(d.querySelectorAll('[data-mode-set]'), function (a) {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          setMode(a.getAttribute('data-mode-set'));
        });
      });
    }
    split();
    reveal();
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
