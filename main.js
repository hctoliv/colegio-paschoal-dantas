(() => {
  const WA_NUMBER = '5511988982270'; // WhatsApp de atendimento (site atual)

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  root.classList.remove('no-js'); root.classList.add('js');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) scrollTo(0, 0);

  // celular sem zoom: pinça no iOS (o Safari ignora user-scalable=no).
  // Toque duplo já é anulado por touch-action: manipulation no CSS.
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
  document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const motion = hasGsap && !reduce;

  /* ================= texto: palavras e linhas ================= */
  const splitWords = el => {
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(' '); return; }
          const w = document.createElement('span'); w.className = 'w'; w.textContent = part; frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(el);
  };
  $$('[data-scrub]').forEach(splitWords);
  $$('[data-lines]').forEach(el => {
    el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i).map(l => `<span class="ln"><span>${l.trim()}</span></span>`).join('');
  });
  const light = (words, p) => { const n = Math.round(p * words.length); words.forEach((w, i) => w.classList.toggle('on', i < n)); };

  /* ================= revelar por interseção ================= */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px' });
  $$('[data-lines]').forEach(el => io.observe(el));

  $$('.value').forEach((v, i) => v.style.setProperty('--i', i));

  /* ================= nav ================= */
  const nav = $('.nav'), toggle = $('.nav__toggle');
  const closeMenu = () => { nav.classList.remove('is-open'); document.body.style.overflow = ''; toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Abrir menu'); };
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    document.body.style.overflow = open ? 'hidden' : '';
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  });

  /* ================= rolagem suave ================= */
  let lenis = null;
  if (motion && fine && window.Lenis) { lenis = new Lenis({ lerp: .1, smoothWheel: true }); lenis.stop(); }
  const scrollToEl = t => {
    if (lenis) lenis.scrollTo(t, { duration: 1.6 });
    else (t === 0 ? window : t).scrollTo ? (t === 0 ? scrollTo({ top: 0, behavior: 'smooth' }) : t.scrollIntoView({ behavior: 'smooth' })) : 0;
  };
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); const t = id === '#top' ? 0 : $(id);
    if (t === null) return;
    e.preventDefault(); closeMenu(); scrollToEl(t);
  }));

  /* ================= estado por rolagem (nav, progresso) ================= */
  const bar = $('[data-progress]');
  let lastY = 0;
  const onScroll = y => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    nav.classList.toggle('is-solid', y > 60);
    document.body.classList.toggle('is-scrolled', y > 60);
    if (!nav.classList.contains('is-open')) nav.classList.toggle('is-hidden', y > lastY && y > innerHeight * .9);
    lastY = y;
  };
  addEventListener('scroll', () => onScroll(scrollY), { passive: true });

  /* ================= cursor ================= */
  const cursor = $('.cursor'), label = $('[data-cursor-label]');
  if (fine && !reduce) {
    document.body.classList.add('has-cursor');
    const dot = $('.cursor__dot'), ring = $('.cursor__ring');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, running = false;
    const loop = () => {
      rx += (mx - rx) * .2; ry += (my - ry) * .2;
      ring.style.transform = `translate(${rx}px,${ry}px)`;
      if (Math.abs(mx - rx) + Math.abs(my - ry) > .3) requestAnimationFrame(loop); else running = false;
    };
    addEventListener('pointermove', e => {
      mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px,${my}px)`;
      if (!running) { running = true; requestAnimationFrame(loop); }
    }, { passive: true });
    document.addEventListener('pointerover', e => {
      const lab = e.target.closest('[data-cursor]');
      if (lab) { label.textContent = lab.dataset.cursor; cursor.classList.add('is-label'); cursor.classList.remove('is-hover'); return; }
      cursor.classList.remove('is-label');
      cursor.classList.toggle('is-hover', !!e.target.closest('a, button, label, select'));
    });
    $$('[data-magnetic]').forEach(b => {
      b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px,${(e.clientY - r.top - r.height / 2) * .3}px)`; });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  /* ================= formulário -> WhatsApp ================= */
  const form = $('[data-form]'), err = $('[data-err]');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(form);
    const nome = (f.get('nome') || '').trim();
    const field = form.nome.closest('.field');
    if (!nome) { field.classList.add('is-bad'); err.textContent = 'Informe seu nome para a secretaria saber com quem está falando.'; form.nome.focus(); return; }
    field.classList.remove('is-bad'); err.textContent = '';
    const lines = [
      `Olá! Meu nome é ${nome}.`,
      `Gostaria de informações sobre as matrículas 2027${f.get('etapa') ? ` para ${f.get('etapa')}` : ''}.`,
      f.get('unidade') && `Unidade de interesse: ${f.get('unidade')}.`,
      (f.get('msg') || '').trim() && `\n${f.get('msg').trim()}`
    ].filter(Boolean);
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
  });
  form.nome.addEventListener('input', () => { form.nome.closest('.field').classList.remove('is-bad'); err.textContent = ''; });
  $$('.unit').forEach(u => u.addEventListener('dblclick', () => { form.unidade.value = u.dataset.unit; }));
  const y = $('[data-year]'); if (y) y.textContent = new Date().getFullYear();

  /* ================= técnicos: foto acompanha o texto ================= */
  const techPh = $$('[data-tech-ph]'), badge = $('[data-tech-badge]');
  const tio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const k = e.target.dataset.course;
    techPh.forEach(p => p.classList.toggle('is-on', p.dataset.techPh === k));
    badge.textContent = k === 'rx' ? 'Radiologia' : 'Enfermagem';
  }), { rootMargin: '-45% 0px -45% 0px' });
  $$('[data-course]').forEach(c => tio.observe(c));

  /* ================= faixas de diferenciais (velocidade da rolagem) ================= */
  const rows = $$('[data-row]').map(r => { r.innerHTML += r.innerHTML; return { el: r, dir: +r.dataset.row, x: 0, w: 0 }; });
  let vel = 0, rowsOn = false;
  const measure = () => rows.forEach(r => { r.w = r.el.scrollWidth / 2; });
  measure(); addEventListener('resize', measure);
  const tickRows = () => {
    if (!rowsOn) return;
    rows.forEach(r => {
      r.x += r.dir * (.6 + Math.abs(vel) * .12);
      if (r.x <= -r.w) r.x += r.w; if (r.x > 0) r.x -= r.w;
      r.el.style.transform = `translate3d(${r.x}px,0,0)`;
    });
    vel *= .92;
    requestAnimationFrame(tickRows);
  };
  rows.forEach(r => { if (r.dir > 0) r.x = -r.w / 2; r.el.style.transform = `translate3d(${r.x}px,0,0)`; });
  if (!reduce) new IntersectionObserver(es => {
    const was = rowsOn; rowsOn = es[0].isIntersecting;
    if (rowsOn && !was) requestAnimationFrame(tickRows);
  }).observe($('.rows'));
  if (!lenis) { let ly = scrollY; addEventListener('scroll', () => { vel = clamp(scrollY - ly, -60, 60); ly = scrollY; }, { passive: true }); }

  /* ================= sem GSAP: estado final ================= */
  const words = { man: $$('.w', $('.manifesto [data-scrub]')), quote: $$('.w', $('.quote [data-scrub]')) };
  if (!motion) {
    $('.loader')?.remove(); document.body.classList.remove('is-loading');
    $$('.hero__h1 .line > span').forEach(s => { s.style.transform = 'none'; });
    $$('[data-hero-in]').forEach(s => { s.style.opacity = 1; });
    $$('[data-scrub] .w').forEach(w => w.classList.add('on'));
    return;
  }

  /* ================= GSAP ================= */
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true }); // barra do navegador do celular não recalcula tudo
  const small = matchMedia('(max-width: 860px)').matches;
  if (lenis) {
    lenis.on('scroll', e => { ScrollTrigger.update(); vel = clamp(e.velocity || 0, -60, 60); });
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ---- abertura ---- */
  const photos = $$('.hero__ph');
  const rects = photos.map(p => p.getBoundingClientRect()); // antes de qualquer transform
  const count = $('[data-count]');
  const intro = gsap.timeline({ onComplete: () => { $('.loader').remove(); document.body.classList.remove('is-loading'); lenis && lenis.start(); ScrollTrigger.refresh(); } });
  const c = { v: 0 };
  intro
    .to('.loader__mark circle', { strokeDashoffset: 0, duration: .7, ease: 'power2.inOut' }, 0)
    .to(c, { v: 100, duration: .7, ease: 'power2.inOut', onUpdate: () => { count.textContent = Math.round(c.v); } }, 0)
    .to('.loader__inner, .loader__count', { opacity: 0, y: -16, duration: .3, ease: 'power2.in' }, .7)
    .to('.loader__panel', { yPercent: -100, duration: .8, ease: 'expo.inOut' }, .8)
    .from(photos, small ? { opacity: 0, duration: .8, stagger: .06 } : { z: -900, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: .06 }, 1)
    .to('.hero__h1 .line > span', { y: 0, duration: 1, ease: 'expo.out', stagger: .07 }, 1.05)
    .to('[data-hero-in]', { opacity: 1, duration: .8, ease: 'power2.out', stagger: .08 }, 1.3);

  setTimeout(() => { if (intro.progress() < 1) intro.progress(1); }, 4000); // nunca deixa a página presa na abertura

  /* ---- hero: mergulho em profundidade (desktop) / esmaecer simples (celular) ---- */
  const hero = $('[data-hero]');
  const ir = { immediateRender: false };
  if (small) {
    gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } })
      .fromTo('.hero__h1, .hero__foot', { opacity: 1, y: 0 }, { ...ir, opacity: 0, y: -60, ease: 'none' }, 0)
      .fromTo(photos, { y: 0 }, { ...ir, y: -80, ease: 'none' }, 0);
  } else {
    const dive = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: () => '+=' + innerHeight, scrub: true, pin: true, pinSpacing: false } });
    const ir = { immediateRender: false };
    photos.forEach((p, i) => {
      const d = +p.dataset.depth, r = rects[i];
      const dx = (r.left + r.width / 2 - innerWidth / 2) * 1.4, dy = (r.top + r.height / 2 - innerHeight / 2) * 1.4;
      dive.fromTo(p, { z: 0, x: 0, y: 0, opacity: 1 }, { ...ir, z: 700 + d * 500, x: dx, y: dy, ease: 'power1.in' }, 0);
    });
    dive
      .fromTo('.hero__h1', { scale: 1, opacity: 1 }, { ...ir, scale: 1.35, opacity: 0, ease: 'power1.in' }, .1)
      .fromTo('[data-hero-in]', { opacity: 1, y: 0 }, { ...ir, opacity: 0, y: 30, ease: 'none', duration: .3 }, 0)
      .fromTo('.hero__hint', { opacity: 1 }, { ...ir, opacity: 0, ease: 'none', duration: .15 }, 0)
      .fromTo('.hero__glow', { scale: 1, opacity: 1 }, { ...ir, scale: 1.8, opacity: 0, ease: 'none' }, 0);
  }

  // inclinação pelo mouse
  if (fine) {
    const qs = photos.map(p => ({ x: gsap.quickTo(p, 'xPercent', { duration: 1.2, ease: 'power3' }), y: gsap.quickTo(p, 'yPercent', { duration: 1.2, ease: 'power3' }), d: +p.dataset.depth }));
    hero.addEventListener('pointermove', e => {
      const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
      qs.forEach(q => { q.x(nx * -14 * q.d); q.y(ny * -14 * q.d); });
    });
  }

  /* ---- manifesto e citação acendem palavra a palavra ---- */
  ScrollTrigger.create({ trigger: '[data-manifesto]', start: 'top 75%', end: 'center 45%', scrub: true, onUpdate: s => light(words.man, clamp(s.progress * 1.1, 0, 1)) });
  ScrollTrigger.create({ trigger: '[data-quote]', start: 'top 70%', end: 'bottom 70%', scrub: true, onUpdate: s => light(words.quote, s.progress) });
  gsap.from('.fact', { y: 40, opacity: 0, duration: 1, ease: 'expo.out', stagger: .08, scrollTrigger: { trigger: '.facts', start: 'top 85%' } });

  /* ---- jornada horizontal ---- */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 861px)', () => {
    const track = $('[data-track]'), jbar = $('[data-journey-bar]');
    const dist = () => track.scrollWidth - innerWidth;
    const h = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '.journey__pin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true,
        onUpdate: s => { jbar.style.transform = `scaleX(${s.progress})`; } }
    });
    $$('[data-par]').forEach(img => gsap.fromTo(img, { xPercent: 7 }, { xPercent: -7, ease: 'none',
      scrollTrigger: { trigger: img.closest('.stage'), containerAnimation: h, start: 'left right', end: 'right left', scrub: true } }));
    $$('.stage').forEach(s => gsap.from(s, { y: 80, rotation: 2, opacity: .3, ease: 'none',
      scrollTrigger: { trigger: s, containerAnimation: h, start: 'left 100%', end: 'left 65%', scrub: true } }));
  });

  /* ---- entradas discretas ---- */
  gsap.utils.toArray('.pillar, .unit, .cap').forEach((el, i) => gsap.from(el, {
    y: 50, opacity: 0, duration: 1.1, ease: 'expo.out', delay: (i % 4) * .07,
    scrollTrigger: { trigger: el, start: 'top 90%' }
  }));
  gsap.from('.form', { y: 80, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.form', start: 'top 85%' } });
  gsap.fromTo('.foot__big', { xPercent: -14 }, { xPercent: 0, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
