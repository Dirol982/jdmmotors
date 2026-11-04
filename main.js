(() => {
  const PHONE = '+375296333396';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const ease = 'cubic-bezier(.16, 1, .3, 1)';

  /* ---------- header ---------- */
  const top = document.querySelector('.top');
  const onScroll = () => top.classList.toggle('is-stuck', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const burger = document.querySelector('.top__burger');
  const nav = document.getElementById('nav');
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- hero: video + showroom light over the badge ---------- */
  const video = document.querySelector('.hero__video');
  if (video && !reduce && !navigator.connection?.saveData) {
    video.src = video.dataset.src;
    video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true });
    video.play().catch(() => {});
  }

  const sheen = document.getElementById('sheen');
  const hero = document.querySelector('.hero');
  if (sheen && !reduce) {
    // light band travels in logo units (viewBox 14..254)
    let x = -60, target = -60, raf = 0;
    const apply = () => sheen.setAttribute('gradientTransform', `translate(${x.toFixed(2)} 0)`);
    apply();
    const loop = () => {
      x += (target - x) * 0.08;
      apply();
      raf = Math.abs(target - x) > 0.05 ? requestAnimationFrame(loop) : 0;
    };
    const goTo = (t) => { target = t; if (!raf) raf = requestAnimationFrame(loop); };

    // opening sweep: one pass of light across the badge
    const start = performance.now() + 900;
    const dur = 1700;
    const sweep = (now) => {
      const t = Math.min(Math.max((now - start) / dur, 0), 1);
      const e = 1 - Math.pow(1 - t, 4);
      x = target = -60 + e * 360;
      apply();
      if (t < 1) requestAnimationFrame(sweep);
      else if (finePointer) armPointer();
    };
    requestAnimationFrame(sweep);

    // afterwards the light follows the pointer, like a lamp passing over paint
    const svg = document.querySelector('.hero__logo');
    function armPointer() {
      hero.addEventListener('pointermove', (e) => {
        const r = svg.getBoundingClientRect();
        const u = 14 + ((e.clientX - r.left) / r.width) * 240;
        goTo(u - 17);
      });
      hero.addEventListener('pointerleave', () => goTo(300));
    }
  }

  /* ---------- reveal on scroll ---------- */
  if ('IntersectionObserver' in window && !reduce) {
    const targets = document.querySelectorAll('.sec-head, .facts dl > div, .offer__in > *, .rus__copy, .rus__shots .shot, .team__in > *, .models__brand, .gallery > li:nth-child(-n+18), .posts li, .contacts__copy, .contacts__map');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    const groups = new Map();
    targets.forEach((el) => {
      const parent = el.parentElement;
      const i = groups.get(parent) || 0;
      groups.set(parent, i + 1);
      el.style.setProperty('--d', `${Math.min(i, 8) * 60}ms`);
      el.classList.add('rv');
      io.observe(el);
    });
  }

  /* ---------- accordion: real height animation ---------- */
  document.querySelectorAll('.bay').forEach((d) => {
    const summary = d.querySelector('summary');
    const body = d.querySelector('.bay__body');
    let anim = null;
    summary.addEventListener('click', (e) => {
      if (reduce) return;
      e.preventDefault();
      anim?.cancel();
      if (!d.open) {
        d.open = true;
        const h = body.scrollHeight;
        anim = body.animate(
          [{ height: '0px', opacity: 0 }, { height: `${h}px`, opacity: 1 }],
          { duration: 520, easing: ease }
        );
      } else {
        const h = body.scrollHeight;
        anim = body.animate(
          [{ height: `${h}px`, opacity: 1 }, { height: '0px', opacity: 0 }],
          { duration: 360, easing: ease }
        );
        anim.onfinish = () => { d.open = false; };
      }
    });
  });

  /* ---------- gallery: show all ---------- */
  const gallery = document.getElementById('gallery');
  const more = document.getElementById('galMore');
  more?.addEventListener('click', () => {
    const firstHidden = [...gallery.children].find((li) => getComputedStyle(li).display === 'none');
    gallery.classList.remove('is-collapsed');
    firstHidden?.querySelector('a')?.focus({ preventScroll: true });
  });

  /* ---------- lightbox ---------- */
  const lb = document.getElementById('lb');
  const stage = document.getElementById('lbStage');
  const count = document.getElementById('lbCount');
  const strip = document.getElementById('lbStrip');
  const zoomBtn = lb.querySelector('[data-lb="zoom"]');
  const links = [...document.querySelectorAll('.gi')];
  const items = links.map((a) => ({
    video: a.dataset.type === 'video',
    src: a.getAttribute('href'),
    thumb: a.querySelector('img').getAttribute('src'),
    alt: a.querySelector('img').alt,
  }));
  let idx = 0;
  let current = null;
  let zoomed = false;
  let lastFocus = null;

  items.forEach((it, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lb__thumb';
    b.style.backgroundImage = `url("${it.thumb}")`;
    b.setAttribute('aria-label', `${it.video ? 'Видео' : 'Фото'} ${i + 1}`);
    b.addEventListener('click', () => show(i, i > idx ? 'next' : 'prev'));
    strip.appendChild(b);
  });

  const preload = (i) => {
    const it = items[(i + items.length) % items.length];
    if (!it.video) { const im = new Image(); im.src = it.src; }
  };

  function setZoom(on, ox = 50, oy = 50) {
    if (!current || current.tagName !== 'IMG') on = false;
    zoomed = on;
    lb.classList.toggle('is-zoomed', on);
    zoomBtn.setAttribute('aria-pressed', String(on));
    zoomBtn.setAttribute('aria-label', on ? 'Уменьшить' : 'Увеличить');
    if (!current) return;
    current.classList.toggle('is-zoomed', on);
    current.style.transformOrigin = `${ox}% ${oy}%`;
    current.style.transform = on ? 'scale(2.4)' : '';
  }

  function show(i, dir = 'open') {
    idx = (i + items.length) % items.length;
    const it = items[idx];
    setZoom(false);
    const old = current;
    if (old) {
      if (old.tagName === 'VIDEO') old.pause();
      old.classList.add(dir === 'prev' ? 'leave-prev' : 'leave-next');
      setTimeout(() => old.remove(), reduce ? 0 : 450);
    }
    let el;
    if (it.video) {
      el = document.createElement('video');
      el.src = it.src;
      el.poster = links[idx].dataset.poster;
      el.controls = true;
      el.playsInline = true;
      el.autoplay = true;
    } else {
      el = document.createElement('img');
      el.src = it.src;
      el.alt = it.alt;
      el.decoding = 'async';
      el.draggable = false;
    }
    el.className = `lb__media enter-${dir}`;
    stage.appendChild(el);
    current = el;
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove(`enter-${dir}`)));

    count.textContent = `${idx + 1} / ${items.length}`;
    zoomBtn.hidden = it.video;
    [...strip.children].forEach((t, k) => t.setAttribute('aria-current', String(k === idx)));
    strip.children[idx].scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth' });
    preload(idx + 1); preload(idx - 1);
  }

  function open(i) {
    lastFocus = document.activeElement;
    document.documentElement.classList.add('lb-open');
    lb.showModal();
    show(i, 'open');
  }

  function close() {
    if (!lb.open) return;
    setZoom(false);
    if (current?.tagName === 'VIDEO') current.pause();
    const done = () => {
      lb.classList.remove('is-closing');
      lb.close();
      stage.innerHTML = '';
      current = null;
      document.documentElement.classList.remove('lb-open');
      lastFocus?.focus({ preventScroll: true });
    };
    if (reduce) return done();
    lb.classList.add('is-closing');
    setTimeout(done, 280);
  }

  links.forEach((a, i) => a.addEventListener('click', (e) => { e.preventDefault(); open(i); }));
  lb.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  lb.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lb]');
    if (!b) return;
    const act = b.dataset.lb;
    if (act === 'close') close();
    if (act === 'next') show(idx + 1, 'next');
    if (act === 'prev') show(idx - 1, 'prev');
    if (act === 'zoom') setZoom(!zoomed);
  });
  document.addEventListener('keydown', (e) => {
    if (!lb.open) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); show(idx + 1, 'next'); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); show(idx - 1, 'prev'); }
  }, true);

  // pointer: tap image = zoom at that point, drag while zoomed = pan, swipe = next/prev, tap backdrop = close
  let down = null;
  stage.addEventListener('pointerdown', (e) => {
    if (current?.tagName === 'VIDEO' && e.target === current) return;
    down = { x: e.clientX, y: e.clientY, t: performance.now(), onMedia: e.target === current, moved: false };
    if (zoomed) {
      const o = current.style.transformOrigin.split(' ').map(parseFloat);
      down.ox = o[0]; down.oy = o[1];
      current.classList.add('is-panning');
    }
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) down.moved = true;
    if (zoomed) {
      const r = current.getBoundingClientRect();
      const ox = Math.min(100, Math.max(0, down.ox - (dx / r.width) * 100 * 2.4));
      const oy = Math.min(100, Math.max(0, down.oy - (dy / r.height) * 100 * 2.4));
      current.style.transformOrigin = `${ox}% ${oy}%`;
    } else if (current && down.moved) {
      current.style.transition = 'none';
      current.style.transform = `translateX(${dx}px)`;
    }
  });
  const end = (e) => {
    if (!down) return;
    const dx = e.clientX - down.x;
    const fast = performance.now() - down.t < 350;
    current?.classList.remove('is-panning');
    if (!zoomed && current) { current.style.transition = ''; current.style.transform = ''; }
    if (!zoomed && down.moved && (Math.abs(dx) > 70 || (fast && Math.abs(dx) > 30))) {
      show(idx + (dx < 0 ? 1 : -1), dx < 0 ? 'next' : 'prev');
    } else if (!down.moved) {
      if (down.onMedia && current?.tagName === 'IMG') {
        const r = current.getBoundingClientRect();
        if (zoomed) setZoom(false);
        else setZoom(true, ((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
      } else if (!down.onMedia) {
        close();
      }
    }
    down = null;
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', () => { down = null; current?.classList.remove('is-panning'); });

  /* ---------- Instagram reels: load the embed script only when near ---------- */
  const reels = document.getElementById('reels');
  if (reels && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((en) => en.isIntersecting)) return;
      io.disconnect();
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.instagram.com/embed.js';
      s.onload = () => window.instgrm?.Embeds.process();
      document.body.appendChild(s);
    }, { rootMargin: '600px 0px' });
    io.observe(reels);
  }
  const track = document.querySelector('.reels__viewport');
  document.querySelectorAll('.rnav').forEach((b) => b.addEventListener('click', () => {
    track.scrollBy({ left: Number(b.dataset.dir) * Math.min(track.clientWidth * 0.8, 712), behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* ---------- floating call button ---------- */
  const fab = document.querySelector('.fab');
  if (fab && 'IntersectionObserver' in window) {
    const visible = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => en.isIntersecting ? visible.add(en.target) : visible.delete(en.target));
      fab.classList.toggle('is-hidden', visible.size > 0);
    });
    document.querySelectorAll('.dock, .contacts').forEach((el) => io.observe(el));
  }

  /* ---------- booking form: static site, so the request leaves as SMS / call ---------- */
  const form = document.getElementById('bookForm');
  const err = document.getElementById('bookErr');
  const done = document.getElementById('bookDone');
  const sms = document.getElementById('smsLink');
  const copyBtn = document.getElementById('copyBtn');
  const date = document.getElementById('f-date');
  const today = new Date();
  date.min = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  let message = '';

  const fail = (field, text) => {
    field.closest('.field').classList.add('is-invalid');
    field.setAttribute('aria-invalid', 'true');
    err.textContent = text;
    err.hidden = false;
    field.focus();
    if (!reduce) field.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], { duration: 380, easing: 'ease-out' });
  };

  form.addEventListener('input', (e) => {
    const f = e.target.closest('.field');
    if (f) { f.classList.remove('is-invalid'); e.target.removeAttribute('aria-invalid'); }
    err.hidden = true;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const service = d.get('service');
    const day = d.get('date');
    const time = d.get('time');
    const phone = String(d.get('phone') || '').trim();

    if (!service) return fail(form.service, 'Выберите, что нужно сделать с машиной.');
    if (!day) return fail(form.date, 'Укажите удобную дату.');
    if (phone.replace(/\D/g, '').length < 9) return fail(form.phone, 'Проверьте номер телефона: нужен номер, по которому мы перезвоним.');

    const [y, m, dd] = day.split('-');
    message = [
      'Заявка с сайта JDM Motors',
      `Работа: ${service}`,
      `Дата: ${dd}.${m}.${y}${time ? ', ' + time : ''}`,
      `Подбор запчастей: ${d.get('parts') ? 'да' : 'нет'}`,
      `Телефон: ${phone}`,
    ].join('\n');

    const sep = /iP(hone|ad|od)|Mac/.test(navigator.userAgent) ? '&' : '?';
    sms.href = `sms:${PHONE}${sep}body=${encodeURIComponent(message)}`;
    const wasHidden = done.hidden;
    done.hidden = false;
    if (wasHidden && !reduce) done.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: ease });
    done.focus();
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(message);
      copyBtn.textContent = 'Скопировано';
    } catch {
      copyBtn.textContent = 'Не удалось скопировать';
    }
    setTimeout(() => { copyBtn.textContent = 'Скопировать текст'; }, 2200);
  });
})();
