// Auto-add progress bar & back-to-top if not in HTML
if(!document.querySelector('.progress')){const d=document.createElement('div');d.className='progress';document.body.prepend(d)}
if(!document.querySelector('.to-top')){const b=document.createElement('button');b.className='to-top';b.innerHTML='&uarr;';b.setAttribute('aria-label','Back to top');document.body.appendChild(b)}
// SINGH CAIZEN — main.js (V2 motion)
// Header shrink + scroll progress + back-to-top
const header=document.querySelector('header'),prog=document.querySelector('.progress'),toTop=document.querySelector('.to-top');
addEventListener('scroll',()=>{header.classList.toggle('scrolled',scrollY>40);
 if(prog){const h=document.documentElement;prog.style.width=(scrollY/(h.scrollHeight-innerHeight)*100)+'%'}
 if(toTop)toTop.classList.toggle('show',scrollY>600)},{passive:true});
if(toTop)toTop.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
// Mobile menu
const btn=document.querySelector('.menu-btn'),nav=document.querySelector('nav.main');
if(btn)btn.addEventListener('click',()=>nav.classList.toggle('open'));
// Reveal on scroll (fade-up / left / right / zoom / image / timeline)
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}}),{threshold:.12});
document.querySelectorAll('.reveal,.reveal-left,.reveal-right,.reveal-zoom,.img-reveal,.timeline').forEach(el=>io.observe(el));
// Animated counters
const cio=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;cio.unobserve(e.target);
 const end=+e.target.dataset.count,t0=performance.now();
 (function tick(t){const p=Math.min((t-t0)/1600,1);e.target.textContent=Math.floor(end*(1-Math.pow(1-p,3))).toLocaleString('en-IN')+(p===1?'+':'');if(p<1)requestAnimationFrame(tick)})(t0)}),{threshold:.5});
document.querySelectorAll('[data-count]').forEach(el=>cio.observe(el));
// Hero slider (Tata-style rotating stories)
const slides=document.querySelectorAll('.hero-slide'),dots=document.querySelectorAll('.hero-dots button');
if(slides.length){let cur=0,timer;
 const show=i=>{slides[cur].classList.remove('active');if(dots[cur])dots[cur].classList.remove('active');cur=i;slides[cur].classList.add('active');if(dots[cur])dots[cur].classList.add('active')};
 const auto=()=>timer=setInterval(()=>show((cur+1)%slides.length),6500);auto();
 dots.forEach((d,i)=>d.addEventListener('click',()=>{clearInterval(timer);show(i);auto()}));}
