(() => {
  const PHONE = '+375296333396';

  // header shadow once the page scrolls
  const top = document.querySelector('.top');
  const onScroll = () => top.classList.toggle('is-stuck', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // mobile menu
  const burger = document.querySelector('.top__burger');
  const nav = document.getElementById('nav');
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  // photos regain colour once seen on touch screens
  if ('IntersectionObserver' in window && matchMedia('(hover: none)').matches) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting && en.intersectionRatio > .6) { en.target.classList.add('is-seen'); io.unobserve(en.target); } });
    }, { threshold: [.6] });
    document.querySelectorAll('.shot').forEach((el) => io.observe(el));
  }

  // floating call button hides over the booking dock and contacts
  const fab = document.querySelector('.fab');
  if (fab && 'IntersectionObserver' in window) {
    const visible = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => en.isIntersecting ? visible.add(en.target) : visible.delete(en.target));
      fab.classList.toggle('is-hidden', visible.size > 0);
    });
    document.querySelectorAll('.dock, .contacts').forEach((el) => io.observe(el));
  }

  // booking form: no server on a static site, so the request leaves as SMS / phone call
  const form = document.getElementById('bookForm');
  const err = document.getElementById('bookErr');
  const done = document.getElementById('bookDone');
  const sms = document.getElementById('smsLink');
  const copyBtn = document.getElementById('copyBtn');
  const date = document.getElementById('f-date');
  const today = new Date();
  const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  date.min = iso(today);

  let message = '';

  const fail = (field, text) => {
    field.closest('.field').classList.add('is-invalid');
    field.setAttribute('aria-invalid', 'true');
    err.textContent = text;
    err.hidden = false;
    field.focus();
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
    done.hidden = false;
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
