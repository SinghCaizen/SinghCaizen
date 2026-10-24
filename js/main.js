// SINGH CAIZEN — main.js (V4)
// SINGH CAIZEN — main.js
const header=document.querySelector('header');
addEventListener('scroll',()=>{header.classList.toggle('scrolled',scrollY>40);},{passive:true});
// Theme toggle (dark / light, remembered)
const tBtn=document.querySelector('.theme-toggle');
if(tBtn)tBtn.addEventListener('click',()=>{const cur=document.documentElement.getAttribute('data-theme')==='light'?'dark':'light';document.documentElement.setAttribute('data-theme',cur);try{localStorage.setItem('sc-theme',cur)}catch(e){}});
// Mobile menu
const btn=document.querySelector('.menu-btn'),nav=document.querySelector('nav.main');
if(btn&&nav){
 const ov=document.createElement('div');ov.className='nav-overlay';document.body.appendChild(ov);
 const setMenu=open=>{nav.classList.toggle('open',open);ov.classList.toggle('show',open);btn.innerHTML=open?'&times;':'&#9776;';document.body.style.overflow=open?'hidden':'';if(open){nav.scrollTop=0;nav.querySelectorAll('.has-drop.expanded').forEach(d=>d.classList.remove('expanded'))}};
 btn.addEventListener('click',()=>setMenu(!nav.classList.contains('open')));
 ov.addEventListener('click',()=>setMenu(false));
 nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',e=>{
   const drop=a.parentElement;
   if(innerWidth<=1020&&drop.classList.contains('has-drop')){e.preventDefault();const was=drop.classList.contains('expanded');nav.querySelectorAll('.has-drop.expanded').forEach(d=>d.classList.remove('expanded'));if(!was)drop.classList.add('expanded');}
   else if(innerWidth<=1020){setMenu(false)}
 }));
}
// Preloader
addEventListener('load',()=>setTimeout(()=>{const p=document.getElementById('preloader');if(p)p.classList.add('hide')},500));
// Reveal on scroll
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}}),{threshold:.12});
document.querySelectorAll('.reveal,.reveal-left,.reveal-right,.reveal-zoom,.img-reveal,.timeline').forEach(el=>io.observe(el));
// Counters
const cio=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;cio.unobserve(e.target);
 const end=+e.target.dataset.count,t0=performance.now();
 (function tick(t){const p=Math.min((t-t0)/1600,1);e.target.textContent=Math.floor(end*(1-Math.pow(1-p,3))).toLocaleString('en-IN')+(p===1?'+':'');if(p<1)requestAnimationFrame(tick)})(t0)}),{threshold:.5});
document.querySelectorAll('[data-count]').forEach(el=>cio.observe(el));
// Hero slider
const slides=document.querySelectorAll('.hero-slide'),dots=document.querySelectorAll('.hero-dots button');
if(slides.length){let cur=0,timer;
 const show=i=>{slides[cur].classList.remove('active');if(dots[cur])dots[cur].classList.remove('active');cur=i;slides[cur].classList.add('active');if(dots[cur])dots[cur].classList.add('active')};
 const auto=()=>timer=setInterval(()=>show((cur+1)%slides.length),6500);auto();
 dots.forEach((d,i)=>d.addEventListener('click',()=>{clearInterval(timer);show(i);auto()}));}
// Search overlay
const SITES=[['Home','index.html','Singh Caizen Group — homepage'],['About Singh Caizen','about.html','Our story, vision, mission & values'],['Our Businesses','businesses.html','Companies & divisions of the group'],['Leadership','leadership.html','Founder & leadership'],['Newsroom','news.html','News, stories & updates'],['Careers','careers.html','Jobs & life at the group'],['Worldwide','worldwide.html','Rooted in India — global outlook & roadmap'],['Contact Us','contact.html','Enquiries, email & address']];
const ov=document.querySelector('.search-overlay'),sIn=document.querySelector('.search-overlay input'),sRes=document.querySelector('.search-results');
function renderSearch(q){if(!sRes)return;sRes.innerHTML=SITES.filter(s=>(s[0]+s[2]).toLowerCase().includes(q.toLowerCase())).map(s=>`<a href="${s[1]}"><span>${s[0]}</span><small>${s[2]}</small></a>`).join('')||'<a href="contact.html"><span>No page found</span><small>Try Contact Us</small></a>'}
if(ov){document.querySelectorAll('[data-open-search]').forEach(b=>b.addEventListener('click',()=>{ov.classList.add('open');renderSearch('');setTimeout(()=>sIn&&sIn.focus(),80)}));
if(sIn){sIn.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const first=sRes?sRes.querySelector('a:not([hidden])'):null;if(first)location.href=first.getAttribute('href');}});}
const sc=document.querySelector('.search-close');if(sc)sc.addEventListener('click',()=>ov.classList.remove('open'));
addEventListener('keydown',e=>{if(e.key==='Escape')ov.classList.remove('open')});
if(sIn)sIn.addEventListener('input',()=>renderSearch(sIn.value));}
// Story rail arrows
const rail=document.querySelector('.rail');
if(rail){document.querySelectorAll('.rail-nav button').forEach((b,i)=>b.addEventListener('click',()=>rail.scrollBy({left:(i?1:-1)*400,behavior:'smooth'})))}
// Smart header: hide on scroll down, show on scroll up or when scrolling stops; adapt colour to section behind
(function(){
 const hdr=document.querySelector('header'); if(!hdr)return;
 let lastY=scrollY, idleT=null, ticking=false;
 function adapt(){
   let dark=null;
   try{
     const els=document.elementsFromPoint(Math.min(innerWidth*0.5,600), 30);
     for(const el of els){
       if(hdr.contains(el)||el===hdr) continue;
       const sec=el.closest('section,footer'); if(!sec) continue;
       if(sec.matches('.hero,.parallax-band,footer')){dark=true;break}
       const bg=getComputedStyle(sec).backgroundColor;
       const m=bg.match(/[\d.]+/g);
       if(!m) continue;
       if(m.length>3 && +m[3]===0) continue;
       const r=+m[0],g=+m[1],b=+m[2];
       dark=(0.2126*r+0.7152*g+0.0722*b)<140; break;
     }
   }catch(e){}
   if(dark===null) dark=document.documentElement.getAttribute('data-theme')!=='light';
   hdr.classList.toggle('hdr-dark',dark);
   hdr.classList.toggle('hdr-light',!dark);
 }
 function onScroll(){
   const y=scrollY;
   if(y>340 && y>lastY+4 && !document.querySelector('nav.main.open')) hdr.classList.add('hdr-hide');
   else if(y<lastY-4 || y<=340) hdr.classList.remove('hdr-hide');
   lastY=y;
   clearTimeout(idleT); idleT=setTimeout(()=>hdr.classList.remove('hdr-hide'),900);
   if(!ticking){ticking=true;requestAnimationFrame(()=>{adapt();ticking=false})}
 }
 let lastEvt=Date.now(), lastSeenY=scrollY;
 addEventListener('wheel',()=>{lastEvt=Date.now()},{passive:true});
 addEventListener('touchmove',()=>{lastEvt=Date.now()},{passive:true});
 const _origScroll=onScroll;
 addEventListener('scroll',()=>{lastEvt=Date.now()},{passive:true});
 setInterval(()=>{ if(hdr.classList.contains('hdr-hide') && Date.now()-lastEvt>900 && scrollY===lastSeenY) hdr.classList.remove('hdr-hide'); lastSeenY=scrollY; },350);
 addEventListener('scroll',onScroll,{passive:true});
 addEventListener('resize',adapt);
 const mb=document.querySelector('.menu-btn'); if(mb)mb.addEventListener('click',()=>hdr.classList.remove('hdr-hide'));
 const tt=document.querySelector('.theme-toggle'); if(tt)tt.addEventListener('click',()=>setTimeout(adapt,60));
 adapt();
})();

// Contact form — every field is required (*). Messages are delivered to the owner's
// inbox via Web3Forms (free). Paste the access key between the quotes to go live;
// until then the form politely reports that the service is being connected.
const WEB3FORMS_KEY = '94e01d94-8fae-4cdc-b9b9-716cf169d7dc';
(function(){
 const form=document.getElementById('contactForm'); if(!form) return;
 const status=document.getElementById('cfStatus'), btn=document.getElementById('cfSubmit');
 function setStatus(m,k){ status.textContent=m; status.className='otp-status '+(k||''); }
 form.addEventListener('submit', async e=>{ e.preventDefault();
   const name=document.getElementById('cfName').value.trim();
   const email=document.getElementById('cfEmail').value.trim();
   const phone=document.getElementById('cfPhone').value.trim();
   const subject=document.getElementById('cfSubject').value.trim();
   const message=document.getElementById('cfMessage').value.trim();
   if(!name||!email||!phone||!subject||!message){ setStatus('Please fill all the required fields (marked *).','err'); return; }
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){ setStatus('Please enter a valid email address.','err'); document.getElementById('cfEmail').focus(); return; }
   if(!/^[6-9]\d{9}$/.test(phone)){ setStatus('Please enter a valid 10-digit mobile number.','err'); document.getElementById('cfPhone').focus(); return; }
   if(!WEB3FORMS_KEY){ setStatus('The message service is being connected. Please try again shortly.','err'); return; }
   btn.disabled=true; btn.textContent='Sending...';
   try{
     const r=await fetch('https://api.web3forms.com/submit',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({access_key:WEB3FORMS_KEY, subject:'New enquiry from the Singh Caizen website: '+subject, from_name:'Singh Caizen Website', name:name, email:email, phone:'+91 '+phone, message:message})});
     const data=await r.json();
     if(data && data.success){ setStatus('\u2713 Thank you, '+name.split(' ')[0]+'. Your message has been sent — we will get back to you shortly.','ok'); form.reset(); }
     else setStatus('Could not send your message. Please try again.','err');
   }catch(err){ setStatus('Could not send your message. Please check your connection and try again.','err'); }
   btn.disabled=false; btn.textContent='Send Message';
 });
})();

// Newsletter subscribe (footer, all pages) — posts to the newsletter service's public
// form endpoint (Brevo). Paste the form action URL between the quotes to go live.
const NEWSLETTER_FORM_URL = 'https://00357f29.sibforms.com/serve/MUIFACuWuttvtkJY-Vo4EceLGDDTrsadnnIOchj3cRyghep51k02r1MpHmPAeK27cPoUIG4WIu3uaxLNmMLbSRN2RducMtujyygnCp26XOE5MgSrKh65YQwBSyrK78YmbWmGu0716ixdF_gYUGV125y6hV6F3K2rmARka4eqSe6wkThzaYsk2Fa_TuSu3utYgxwIabtg5K_jKRn1zQ==';
document.querySelectorAll('form.subscribe[data-newsletter]').forEach(f=>{
 f.addEventListener('submit', async e=>{ e.preventDefault();
   const input=f.querySelector('input[type=email]'); const email=input.value.trim();
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){ input.focus(); input.reportValidity(); return; }
   let note=f.parentElement.querySelector('.sub-note');
   if(!note){ note=document.createElement('p'); note.className='sub-note'; note.style.cssText='font-size:13px;margin-top:10px;opacity:.85'; f.after(note); }
   if(!NEWSLETTER_FORM_URL){ note.textContent='Newsletter is being connected — please check back shortly.'; return; }
   const fd=new FormData(); fd.append('EMAIL', email); fd.append('locale','en'); fd.append('email_address_check','');
   try{ await fetch(NEWSLETTER_FORM_URL,{method:'POST',body:fd,mode:'no-cors'});
     f.reset(); note.textContent='\u2713 Thank you for subscribing to the Singh Caizen newsletter.';
   }catch(err){ note.textContent='Could not subscribe right now. Please try again.'; }
 });
});
