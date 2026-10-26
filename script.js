// «Мягкое счастье» v2: живая камера на первом экране, шапка и меню, всплывающая форма.
// Отправка заявки — демо; на боевом сайте форма уйдёт в серверную функцию → MAX и ВК (idea.md, раздел 5).

(function () {
  'use strict';
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Рука с телефоном и «живое» превью камеры ----------
  // Диван на room-after.jpg (доли картинки): правая половина 0.524–0.804 по ширине, центр по высоте ≈ 0.70.
  var VIEW = { cx: 0.665, cy: 0.70, span: 0.28 };
  var CX_MIN = 0.335;                                          // камера у левого подлокотника (диван — 0.235–0.82 ширины кадра)
  var IMG_RATIO = 1493 / 2000;
  var device = document.getElementById('device');
  var move = document.getElementById('deviceMove');
  var screenEl = document.getElementById('screen');
  var stage = document.getElementById('stage');
  var stageImg = stage.querySelector('.stage__img');
  var t0 = 0;
  var off = 0, offTarget = 0;                                  // сдвиг руки, который задаёт посетитель: по горизонтали (px, влево — минус)
  var offY = 0, offYTarget = 0;                                //   и по вертикали (вниз — плюс)

  function frame(now) {
    if (!t0) t0 = now;
    var t = (now - t0) / 1000;
    var scale = device.offsetWidth / 500;                      // амплитуды растут вместе с рукой
    var dx = Math.sin(t * 2 * Math.PI / 9) * 12 * scale;       // лёгкий дрейф влево-вправо
    var dy = Math.sin(t * 2 * Math.PI / 5) * 8 * scale;        // «невесомость» вверх-вниз
    var rot = Math.sin(t * 2 * Math.PI / 7) * 1.1;
    off += (offTarget - off) * (still ? 1 : 0.22);             // рука догоняет палец с лёгкой инерцией
    offY += (offYTarget - offY) * (still ? 1 : 0.22);
    move.style.transform = 'translate(' + (dx + off).toFixed(2) + 'px,' + (dy + offY).toFixed(2) + 'px) rotate(' + rot.toFixed(3) + 'deg)';

    // камера смотрит на тот участок дивана, над которым держат телефон; дрейф руки тоже передаётся на картинку
    var cx = Math.max(CX_MIN, VIEW.cx + off / stageImg.offsetWidth);
    var cy = VIEW.cy + offY / stageImg.offsetHeight;          // выше-ниже камера смотрит само собой — фото в экране не даёт уйти за край
    var W = screenEl.offsetWidth, H = screenEl.offsetHeight;
    var zoom = 1 + 0.025 * Math.sin(t * 2 * Math.PI / 6);      // автофокус «дышит»
    var imgW = 1.15 * W / VIEW.span * zoom, imgH = imgW * IMG_RATIO;
    var px = W / 2 - cx * imgW - dx * 2.6;
    var py = H * 0.46 - cy * imgH - dy * 1.6;
    px = Math.min(0, Math.max(W - imgW, px));                  // фото всегда закрывает весь экран
    py = Math.min(0, Math.max(H - imgH, py));
    screenEl.style.backgroundSize = imgW.toFixed(1) + 'px ' + imgH.toFixed(1) + 'px';
    screenEl.style.backgroundPosition = px.toFixed(1) + 'px ' + py.toFixed(1) + 'px';

    if (!still) requestAnimationFrame(frame);
  }
  function start() { document.body.classList.add('is-ready'); requestAnimationFrame(frame); }
  var handImg = document.querySelector('.hand');
  if (handImg.complete) start(); else handImg.addEventListener('load', start);
  addEventListener('resize', function () { if (still) requestAnimationFrame(frame); });

  // Посетитель водит рукой: тянет мышью или пальцем по интерьеру и «снимает» диван от правого края до левого, выше и ниже.
  // Пределы: влево — до левого подлокотника, но на десктопе не заезжая под текст, на телефоне — не за край;
  // вверх — под шапку можно, только где в ней пусто (не на меню и не на телефоне); вниз — немного,
  // пока низ экрана не уходит в растворение интерьера.
  function limits() {
    var s = screenEl.getBoundingClientRect();
    var left0 = s.left - off, top0 = s.top - offY;             // где экран стоит без сдвига
    var room = innerWidth >= 1024
      ? left0 - document.querySelector('.intro').getBoundingClientRect().right - 32
      : left0 - 12;
    return {
      left: Math.max(0, Math.min(room, (VIEW.cx - CX_MIN) * stageImg.offsetWidth)),
      down: Math.max(40, Math.min(120, stage.getBoundingClientRect().bottom - 40 - (top0 + s.height)))
    };
  }
  function upLimit(x) {                                        // x — сдвиг руки по горизонтали, при котором проверяем
    var s = screenEl.getBoundingClientRect();
    var left = s.left - off + x, right = left + s.width, top0 = s.top - offY;
    var headerBottom = document.getElementById('header').getBoundingClientRect().bottom;
    var busy = Array.prototype.some.call(document.querySelectorAll('.nav, .header__right'), function (el) {
      var r = el.getBoundingClientRect();
      return r.width && r.left < right && r.right > left;
    });
    return Math.max(0, Math.min(160, top0 - headerBottom + (busy ? -8 : 120)));
  }
  var drag = null;
  stage.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    // палец по интерьеру — только вбок (иначе страницу не прокрутить); за экран телефона и мышью — в любую сторону
    var free = e.pointerType !== 'touch' || !!e.target.closest('.screen');
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, fromX: offTarget, fromY: offYTarget, free: free, lim: limits() };
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('is-touched', 'is-dragging');          // подсказка больше не нужна
  });
  stage.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    offTarget = Math.max(-drag.lim.left, Math.min(0, drag.fromX + e.clientX - drag.x));
    if (drag.free) offYTarget = Math.max(-upLimit(offTarget), Math.min(drag.lim.down, drag.fromY + e.clientY - drag.y));
    if (still) requestAnimationFrame(frame);
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    stage.classList.remove('is-dragging');
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  addEventListener('resize', function () {
    var lim = limits();
    offTarget = Math.max(-lim.left, offTarget);
    offYTarget = Math.max(-upLimit(offTarget), Math.min(lim.down, offYTarget));
  });

  // ---------- Что запускается вместе с появлением блока ----------
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  function onReveal(el, delay) {
    // цифры на первом экране считаются до своего значения
    var counters = el.querySelectorAll('[data-count]');
    if (counters.length) {
      // когда цифры досчитали, заголовок «вдыхает» — возвращаем внимание к главному обещанию
      setTimeout(function () { document.querySelector('.title').classList.add('is-pulse'); }, delay + 250 + 1300 + 150);
    }
    counters.forEach(function (n) {
      var to = parseFloat(n.getAttribute('data-count'));
      var from = parseFloat(n.getAttribute('data-count-from')) || 0;
      var dec = (n.getAttribute('data-count').split('.')[1] || '').length;
      n.textContent = from.toFixed(dec);
      setTimeout(function () {
        var t0 = performance.now();
        (function tick(now) {
          var t = Math.min(1, (now - t0) / 1300);
          n.textContent = (from + (to - from) * easeOut(t)).toFixed(dec);
          if (t < 1) requestAnimationFrame(tick);
        })(t0);
      }, delay + 250);
    });
    // шторка «было / стало» один раз сама качается — подсказка, что её можно тянуть
    var box = el.querySelector('.ba');
    if (box) setTimeout(function () { hintSlider(box); }, delay + 1300);
  }
  function hintSlider(box) {
    var range = box.querySelector('.ba__range'), t0 = performance.now(), stop = false;
    var cancel = function () { stop = true; };
    box.addEventListener('pointerdown', cancel, { once: true });
    (function tick(now) {
      if (stop) return;
      var t = Math.min(1, (now - t0) / 1800);
      var pos = 50 - 16 * Math.sin(t * 2 * Math.PI) * (1 - t * 0.5);   // влево, вправо и обратно в центр
      range.value = pos;
      box.style.setProperty('--pos', pos + '%');
      if (t < 1) requestAnimationFrame(tick);
    })(t0);
  }

  // ---------- Появление при прокрутке ----------
  // Очередь: в [data-reveal-seq="N"] всё, что уже на экране, появляется разом с шагом N мс по порядку разметки.
  // Остальное въезжает само, когда до него докрутят.
  // [data-reveal-after="селектор"] ждёт, пока появится указанный элемент той же очереди, и выходит сразу за ним.
  var revealEls = document.querySelectorAll('[data-reveal]');
  if (still || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var onScreen = function (el) {
      var r = el.getBoundingClientRect();
      return r.top < innerHeight * 0.92 && r.bottom > 0;
    };
    var waitsFor = function (el) {
      var sel = el.getAttribute('data-reveal-after');
      var target = sel && el.closest('[data-reveal-seq]').querySelector(sel);
      return target && !target.classList.contains('is-in') ? target : null;
    };
    var show = function (el, delay) {
      el.style.setProperty('--d', delay + 'ms');
      el.classList.add('is-in');
      io.unobserve(el);              // анимируем один раз
      // после появления задержка больше не нужна — иначе с ней же сработает и наведение
      setTimeout(function () { el.style.removeProperty('--d'); }, delay + 1800);
      onReveal(el, delay);
      var seq = el.closest('[data-reveal-seq]');
      if (!seq) return;
      var step = parseInt(seq.getAttribute('data-reveal-seq'), 10) || 100;
      seq.querySelectorAll('[data-reveal-after]:not(.is-in):not(.is-scrub)').forEach(function (next) {
        if (!waitsFor(next) && onScreen(next)) show(next, delay + step * 2);
      });
    };
    var io = new IntersectionObserver(function (entries) {
      var seqs = [];
      entries.forEach(function (e) {
        if (!e.isIntersecting || e.target.classList.contains('is-in')) return;
        var seq = e.target.closest('[data-reveal-seq]');
        if (!seq) return show(e.target, 0);
        if (seqs.indexOf(seq) < 0) seqs.push(seq);
      });
      seqs.forEach(function (seq) {
        var step = parseInt(seq.getAttribute('data-reveal-seq'), 10) || 100;
        Array.prototype.slice.call(seq.querySelectorAll('[data-reveal]:not(.is-in):not(.is-scrub)'))
          .filter(function (el) { return onScreen(el) && !waitsFor(el); })
          .forEach(function (el, i) { if (!el.classList.contains('is-in')) show(el, i * step); });
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
    // у самого низа страницы нижняя полоса экрана (её исключает rootMargin) уже не прокрутится вверх —
    // показываем всё, что в ней осталось
    var tail = function () {
      if (scrollY + innerHeight < document.documentElement.scrollHeight - 4) return;
      var left = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]:not(.is-in):not(.is-scrub)'))
        .filter(function (el) { var r = el.getBoundingClientRect(); return r.height && r.top < innerHeight && r.bottom > 0; });
      left.forEach(function (el, i) { show(el, i * 110); });
      if (!document.querySelector('[data-reveal]:not(.is-in)')) removeEventListener('scroll', tail);
    };
    addEventListener('scroll', tail, { passive: true });

    // [data-reveal-scrub="селектор"] на десктопе проявляется вместе с прокруткой: начинает, когда
    // указанный элемент целиком показался снизу, и заканчивает, когда его центр сравнялся с центром блока.
    var wide = matchMedia('(min-width: 1024px)');
    document.querySelectorAll('[data-reveal-scrub]').forEach(function (el) {
      var target = el.closest('[data-reveal-seq]').querySelector(el.getAttribute('data-reveal-scrub'));
      var ticking = false;
      var update = function () {
        ticking = false;
        if (el.classList.contains('is-in')) return;
        if (!wide.matches) {                            // на телефоне — обычная очередь
          if (el.classList.contains('is-scrub')) { el.classList.remove('is-scrub'); io.observe(el); }
          return;
        }
        if (!el.classList.contains('is-scrub')) { el.classList.add('is-scrub'); io.unobserve(el); }
        var t = target.getBoundingClientRect(), r = el.getBoundingClientRect();
        var shift = (1 - (parseFloat(el.style.getPropertyValue('--p')) || 0)) * 26;   // свой сдвиг из анимации не считаем
        var to = r.top - shift + r.height / 2 + 24;     // центр блока (+ запас: у конца секции sticky отпускает чуть раньше)
        // старт — когда цель целиком на экране и до центра блока осталось меньше её высоты
        var from = Math.min(innerHeight - t.height / 2, to + t.height * 0.8);
        var now = t.top + t.height / 2;
        var p = from > to ? (from - now) / (from - to) : (now <= from ? 1 : 0);
        p = Math.max(0, Math.min(1, p));
        el.style.setProperty('--p', p.toFixed(3));
        if (p === 1) {                                  // доиграли — фиксируем и отключаемся
          el.classList.add('is-in');
          el.classList.remove('is-scrub');
          removeEventListener('scroll', onScroll);
        }
      };
      var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
      addEventListener('scroll', onScroll, { passive: true });
      addEventListener('resize', onScroll);
      update();
    });
  }

  // ---------- Было / стало: шторка ----------
  document.querySelectorAll('.ba').forEach(function (box) {
    var range = box.querySelector('.ba__range');
    function set() { box.style.setProperty('--pos', range.value + '%'); }
    range.addEventListener('input', set);
    set();
  });

  // ---------- Листалки: стрелки, счётчик, полоса прогресса ----------
  document.querySelectorAll('[data-carousel]').forEach(function (track) {
    var name = track.dataset.carousel;
    var nav = document.querySelector('[data-nav="' + name + '"]');
    var bar = document.querySelector('[data-progress="' + name + '"] span');
    var items = Array.prototype.slice.call(track.children);
    var prev = nav && nav.querySelector('[data-prev]'), next = nav && nav.querySelector('[data-next]');
    var cur = nav && nav.querySelector('[data-current]'), tot = nav && nav.querySelector('[data-total]');
    if (tot) tot.textContent = String(items.length).padStart(2, '0');

    function step() { return items.length > 1 ? items[1].offsetLeft - items[0].offsetLeft : track.clientWidth; }
    function update() {
      var max = track.scrollWidth - track.clientWidth;
      var p = max > 0 ? track.scrollLeft / max : 0;
      var visible = Math.max(1, Math.round(track.clientWidth / step()));
      var idx = Math.min(items.length - 1, Math.round(track.scrollLeft / step()));
      if (cur) cur.textContent = String(idx + 1).padStart(2, '0');
      if (prev) prev.disabled = track.scrollLeft < 4;
      if (next) next.disabled = track.scrollLeft > max - 4;
      if (bar) {
        var w = Math.min(1, visible / items.length);
        bar.style.width = (w * 100) + '%';
        bar.style.transform = 'translateX(' + (p * (1 / w - 1) * 100) + '%)';
      }
    }
    if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
    if (next) next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
    track.addEventListener('scroll', function () { requestAnimationFrame(update); }, { passive: true });
    addEventListener('resize', update);
    update();
  });

  // ---------- Вкладки (блок «Для бизнеса») ----------
  document.querySelectorAll('[data-tabs]').forEach(function (box) {
    var tabs = Array.prototype.slice.call(box.querySelectorAll('[role="tab"]'));
    function select(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (on && panel.hidden) {               // новая карточка проявляется, а не появляется скачком
          panel.classList.remove('is-swap'); void panel.offsetWidth; panel.classList.add('is-swap');
        }
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        panel.hidden = !on;
      });
      tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {   // стрелки переключают вкладки
        var d = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        var n = tabs[(i + d + tabs.length) % tabs.length]; select(n); n.focus();
      });
    });
  });

  // ---------- Вопросы: ответ раскрывается плавно по высоте ----------
  document.querySelectorAll('.faq details').forEach(function (d) {
    var sum = d.querySelector('summary'), anim = null;
    sum.addEventListener('click', function (e) {
      if (still || !d.animate) return;
      e.preventDefault();
      var from = d.offsetHeight, to;
      if (anim) anim.cancel();
      if (d.open && !d.classList.contains('is-closing')) {
        d.classList.add('is-closing');
        to = sum.offsetHeight + (d.offsetHeight - d.clientHeight);   // высота вопроса + нижняя линия
      } else {
        d.classList.remove('is-closing');
        d.open = true;
        to = d.offsetHeight;
      }
      d.style.overflow = 'hidden';
      anim = d.animate({ height: [from + 'px', to + 'px'] }, { duration: 380, easing: 'cubic-bezier(.2, .7, .2, 1)' });
      anim.onfinish = function () {
        if (d.classList.contains('is-closing')) { d.open = false; d.classList.remove('is-closing'); }
        d.style.overflow = ''; anim = null;
      };
    });
  });

  // ---------- «Позвонить напрямую» на десктопе ----------
  // С компьютера ссылка tel: часто никуда не ведёт, поэтому там показываем карточку: номер, копирование и QR для смартфона.
  var callBtn = document.getElementById('callBtn'), callPop = document.getElementById('callPop');
  var desktop = matchMedia('(min-width: 1024px) and (hover: hover)');
  function setCallPop(open) {
    callBtn.setAttribute('aria-expanded', open);
    if (open) { callPop.hidden = false; requestAnimationFrame(function () { callPop.classList.add('is-open'); }); }
    else { callPop.classList.remove('is-open'); setTimeout(function () { if (!callPop.classList.contains('is-open')) callPop.hidden = true; }, 300); }
  }
  callBtn.addEventListener('click', function (e) {
    if (!desktop.matches) return;                              // на телефоне — обычный звонок
    e.preventDefault();
    setCallPop(callPop.hidden);
  });
  callPop.querySelector('.callpop__close').addEventListener('click', function () { setCallPop(false); callBtn.focus(); });
  document.addEventListener('click', function (e) {             // клик мимо карточки закрывает её
    if (!callPop.hidden && !callPop.contains(e.target) && !callBtn.contains(e.target)) setCallPop(false);
  });
  var copyBtn = document.getElementById('copyPhone');
  copyBtn.addEventListener('click', function () {
    var done = function () {
      copyBtn.textContent = 'Номер скопирован'; copyBtn.classList.add('is-done');
      setTimeout(function () { copyBtn.textContent = 'Скопировать номер'; copyBtn.classList.remove('is-done'); }, 2000);
    };
    if (navigator.clipboard) navigator.clipboard.writeText('+79271903602').then(done, function () {});
  });

  // ---------- Шапка: подложка при прокрутке ----------
  var header = document.getElementById('header');
  function onScroll() { header.classList.toggle('is-solid', scrollY > 40); }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- Мобильное меню ----------
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    document.body.classList.toggle('menu-open', open);
    document.body.classList.toggle('is-locked', open);
    if (open) { menu.hidden = false; requestAnimationFrame(function () { menu.classList.add('is-open'); }); }
    else { menu.classList.remove('is-open'); setTimeout(function () { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 350); }
  }
  burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
  menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });

  // ---------- Всплывающая форма ----------
  var sheet = document.getElementById('sheet');
  var lastFocus = null;
  function openSheet() {
    if (document.body.classList.contains('menu-open')) setMenu(false);
    lastFocus = document.activeElement;
    sheet.hidden = false;
    document.body.classList.add('is-locked');
    requestAnimationFrame(function () { requestAnimationFrame(function () { sheet.classList.add('is-open'); }); });
    setTimeout(function () { document.getElementById('uploadZone').focus(); }, 400);
  }
  function closeSheet() {
    sheet.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    setTimeout(function () { sheet.hidden = true; resetIfDone(); }, 400);
    if (lastFocus) lastFocus.focus();
  }
  document.querySelectorAll('[data-open-order]').forEach(function (b) { b.addEventListener('click', openSheet); });
  sheet.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', closeSheet); });
  addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!callPop.hidden) { setCallPop(false); callBtn.focus(); }
    else if (!sheet.hidden) closeSheet(); else if (document.body.classList.contains('menu-open')) setMenu(false);
  });

  // свайп вниз по шторке закрывает её
  var panel = sheet.querySelector('.sheet__panel'), y0 = null;
  panel.addEventListener('touchstart', function (e) { if (panel.scrollTop === 0) y0 = e.touches[0].clientY; }, { passive: true });
  panel.addEventListener('touchmove', function (e) {
    if (y0 === null) return;
    var d = e.touches[0].clientY - y0;
    if (d > 0) panel.style.transform = 'translateY(' + d + 'px)';
  }, { passive: true });
  panel.addEventListener('touchend', function (e) {
    if (y0 === null) return;
    var d = e.changedTouches[0].clientY - y0; y0 = null; panel.style.transform = '';
    if (d > 90) closeSheet();
  });

  // ---------- Фото ----------
  var MAX_PHOTOS = 5, photos = [];
  var input = document.getElementById('photoInput');
  var zone = document.getElementById('uploadZone');
  var list = document.getElementById('previews');
  var label = document.getElementById('uploadLabel');
  zone.tabIndex = 0;
  zone.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });

  function addFiles(files) {
    Array.prototype.forEach.call(files, function (f) { if (f.type.indexOf('image/') === 0 && photos.length < MAX_PHOTOS) photos.push(f); });
    renderPhotos();
  }
  function renderPhotos() {
    list.innerHTML = '';
    photos.forEach(function (f, i) {
      var li = document.createElement('li'), img = document.createElement('img'), del = document.createElement('button');
      img.src = URL.createObjectURL(f); img.alt = 'Фото ' + (i + 1);
      del.type = 'button'; del.textContent = '×'; del.setAttribute('aria-label', 'Удалить фото ' + (i + 1));
      del.addEventListener('click', function () { photos.splice(i, 1); renderPhotos(); });
      li.append(img, del); list.append(li);
    });
    label.textContent = photos.length ? 'Добавить ещё (' + photos.length + ' из ' + MAX_PHOTOS + ')' : 'Прикрепить фото';
  }
  input.addEventListener('change', function () { addFiles(input.files); input.value = ''; });
  ['dragenter', 'dragover'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('is-drag'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('is-drag'); }); });
  zone.addEventListener('drop', function (e) { addFiles(e.dataTransfer.files); });

  // ---------- Телефон: маска +7 (XXX) XXX-XX-XX ----------
  var phone = document.getElementById('phoneInput'), phoneField = document.getElementById('phoneField');
  function digits(v) { var d = v.replace(/\D/g, ''); if (d[0] === '7' || d[0] === '8') d = d.slice(1); return d.slice(0, 10); }
  function format(d) {
    if (!d) return '';
    var s = '+7 (' + d.slice(0, 3);
    if (d.length > 3) s += ') ' + d.slice(3, 6);   // разделитель только перед следующей цифрой — иначе Backspace «застревает»
    if (d.length > 6) s += '-' + d.slice(6, 8);
    if (d.length > 8) s += '-' + d.slice(8, 10);
    return s;
  }
  phone.addEventListener('input', function () { phone.value = format(digits(phone.value)); phoneField.classList.remove('is-invalid'); });
  phone.addEventListener('focus', function () { if (!phone.value) phone.value = '+7 ('; });
  phone.addEventListener('blur', function () { if (phone.value === '+7 (') phone.value = ''; });

  // ---------- Отправка (демо) ----------
  var form = document.getElementById('orderForm');
  var consent = document.getElementById('consentInput'), consentField = document.getElementById('consentField');
  var body = document.getElementById('formBody'), done = document.getElementById('formDone');
  var btn = document.getElementById('submitBtn'), btnText = btn.querySelector('span');
  consent.addEventListener('change', function () { consentField.classList.remove('is-invalid'); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var okPhone = digits(phone.value).length === 10, okConsent = consent.checked;
    phoneField.classList.toggle('is-invalid', !okPhone);
    consentField.classList.toggle('is-invalid', !okConsent);
    if (!okPhone) { phone.focus(); return; }
    if (!okConsent) { consent.focus(); return; }
    btn.disabled = true; btnText.textContent = 'Отправляем…';
    setTimeout(function () {   // здесь будет fetch() в серверную функцию и цель Метрики
      body.hidden = true; done.hidden = false;
      btn.disabled = false; btnText.textContent = 'Узнать стоимость';
    }, 700);
  });
  function resetIfDone() {
    if (done.hidden) return;
    form.reset(); photos = []; renderPhotos();
    done.hidden = true; body.hidden = false;
  }
})();
