// «Мягкое счастье» v2: живая камера на первом экране, шапка и меню, всплывающая форма.
// Отправка заявки — демо; на боевом сайте форма уйдёт в серверную функцию → MAX и ВК (idea.md, раздел 5).

(function () {
  'use strict';
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Рука с телефоном и «живое» превью камеры ----------
  // Диван на room-after.jpg (доли картинки): правая половина 0.524–0.804 по ширине, центр по высоте ≈ 0.70.
  var VIEW = { cx: 0.665, cy: 0.70, span: 0.28 };
  var IMG_RATIO = 1493 / 2000;
  var device = document.getElementById('device');
  var move = document.getElementById('deviceMove');
  var screenEl = document.getElementById('screen');
  var t0 = 0;

  function frame(now) {
    if (!t0) t0 = now;
    var t = (now - t0) / 1000;
    var scale = device.offsetWidth / 500;                      // амплитуды растут вместе с рукой
    var dx = Math.sin(t * 2 * Math.PI / 9) * 12 * scale;       // лёгкий дрейф влево-вправо
    var dy = Math.sin(t * 2 * Math.PI / 5) * 8 * scale;        // «невесомость» вверх-вниз
    var rot = Math.sin(t * 2 * Math.PI / 7) * 1.1;
    move.style.transform = 'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px) rotate(' + rot.toFixed(3) + 'deg)';

    // камера смотрит на правую половину дивана; движение руки передаётся на картинку в экране
    var W = screenEl.offsetWidth, H = screenEl.offsetHeight;
    var zoom = 1 + 0.025 * Math.sin(t * 2 * Math.PI / 6);      // автофокус «дышит»
    var imgW = 1.15 * W / VIEW.span * zoom, imgH = imgW * IMG_RATIO;
    var px = W / 2 - VIEW.cx * imgW - dx * 2.6;
    var py = H * 0.46 - VIEW.cy * imgH - dy * 1.6;
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
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
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
    if (!sheet.hidden) closeSheet(); else if (document.body.classList.contains('menu-open')) setMenu(false);
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
