// SINGH CAIZEN — main.js
// 1) Sticky header shrink on scroll
const header = document.querySelector('header');
addEventListener('scroll', () => header.classList.toggle('scrolled', scrollY > 40), {passive:true});

// 2) Mobile menu
const btn = document.querySelector('.menu-btn'), nav = document.querySelector('nav.main');
if (btn) btn.addEventListener('click', () => nav.classList.toggle('open'));

// 3) Fade-up reveal on scroll (Tata-style soft animation)
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
}), {threshold: .12});
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// 4) Animated number counters
const cio = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return; cio.unobserve(e.target);
  const end = +e.target.dataset.count, t0 = performance.now();
  (function tick(t){ const p = Math.min((t - t0) / 1600, 1);
    e.target.textContent = Math.floor(end * (1 - Math.pow(1 - p, 3))).toLocaleString('en-IN') + (p === 1 ? '+' : '');
    if (p < 1) requestAnimationFrame(tick); })(t0);
}), {threshold: .5});
document.querySelectorAll('[data-count]').forEach(el => cio.observe(el));
