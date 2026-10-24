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
   if(innerWidth<=1020&&drop.classList.contains('has-drop')&&!drop.classList.contains('expanded')){e.preventDefault();nav.querySelectorAll('.has-drop.expanded').forEach(d=>{if(d!==drop)d.classList.remove('expanded')});drop.classList.add('expanded');}
   else if(innerWidth<=1020&&!drop.classList.contains('has-drop')){setMenu(false)}
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
const SITES=[['Home','index.html','Singh Caizen Group — homepage'],['About Singh Caizen','about.html','Our story, vision, mission & values'],['Our Businesses','businesses.html','Companies & divisions of the group'],['Leadership','leadership.html','Founder & leadership'],['Newsroom','news.html','News, stories & updates'],['Careers','careers.html','Jobs & life at the group'],['Contact Us','contact.html','Enquiries, email & address']];
const ov=document.querySelector('.search-overlay'),sIn=document.querySelector('.search-overlay input'),sRes=document.querySelector('.search-results');
function renderSearch(q){if(!sRes)return;sRes.innerHTML=SITES.filter(s=>(s[0]+s[2]).toLowerCase().includes(q.toLowerCase())).map(s=>`<a href="${s[1]}"><span>${s[0]}</span><small>${s[2]}</small></a>`).join('')||'<a href="contact.html"><span>No page found</span><small>Try Contact Us</small></a>'}
if(ov){document.querySelectorAll('[data-open-search]').forEach(b=>b.addEventListener('click',()=>{ov.classList.add('open');renderSearch('');setTimeout(()=>sIn&&sIn.focus(),80)}));
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

// Contact form — mobile AND email OTP verification gate.
// Live services: paste a Firebase web config (mobile SMS OTP) and/or an EmailJS config
// (email OTP: {publicKey, serviceId, templateId} — template must accept {{to_email}} and {{passcode}}).
// Until a service is connected, each gate runs in DEMO mode and shows its OTP on-screen for testing.
const OTP_FIREBASE_CONFIG = null;
const OTP_EMAILJS_CONFIG = null;
(function(){
 const form=document.getElementById('contactForm'); if(!form) return;
 const submit=document.getElementById('cfSubmit'), hint=document.getElementById('cfHint');
 const ok={phone:false,email:false};
 function refresh(){ const all=ok.phone&&ok.email; submit.disabled=!all;
   hint.textContent = all ? '' : ('Send Message activates after ' + (!ok.email&&!ok.phone ? 'mobile and email verification.' : !ok.email ? 'email verification.' : 'mobile verification.')); }
 function makeGate(o){
   const els={}; ['input','send','row','code','verify','resend','timer','status','note'].forEach(k=>els[k]=document.getElementById(o.ids[k]));
   let current=null, timerId=null, confirmation=null, verifiedValue=null;
   function setStatus(m,k){els.status.textContent=m;els.status.className='otp-status '+(k||'')}
   function startTimer(){let t=30;els.resend.disabled=true;els.resend.innerHTML='Resend OTP (<span>'+t+'s</span>)';clearInterval(timerId);
     timerId=setInterval(()=>{t--;const sp=els.resend.querySelector('span');if(sp)sp.textContent=t+'s';if(t<=0){clearInterval(timerId);els.resend.disabled=false;els.resend.textContent='Resend OTP'}},1000)}
   async function send(){
     const v=els.input.value.trim();
     if(!o.validate(v)){setStatus(o.invalidMsg,'err');els.input.focus();return}
     const code=await o.deliver(v, v2=>{confirmation=v2});
     if(code===false){setStatus('Could not send OTP. Please try again.','err');return}
     current=code; els.row.hidden=false; els.code.value=''; startTimer();
     if(code==='LIVE') setStatus('OTP sent to '+o.label(v)+'. Please enter it below.','');
     else setStatus('Demo mode (OTP service not connected yet) — your OTP is '+code+'. Live OTP will start once the service is connected.','demo');
   }
   async function verify(){
     const code=els.code.value.trim();
     if(!/^\d{6}$/.test(code)){setStatus('Please enter the 6-digit OTP.','err');return}
     let good=false;
     if(current==='LIVE'){ try{ await confirmation.confirm(code); good=true; }catch(e){ good=false; } }
     else good=(code===current);
     if(!good){setStatus('Incorrect OTP. Please check and try again.','err');return}
     verifiedValue=els.input.value.trim(); ok[o.key]=true;
     els.row.hidden=true; if(els.note)els.note.hidden=true;
     els.input.readOnly=true; els.send.disabled=true; els.send.textContent='Verified \u2713';
     setStatus('\u2713 '+o.doneMsg(verifiedValue),'ok'); refresh();
   }
   function reset(){ ok[o.key]=false; verifiedValue=null; current=null;
     els.input.readOnly=false; els.send.disabled=false; els.send.textContent='Send OTP'; setStatus('',''); refresh(); }
   els.send.addEventListener('click',send);
   els.resend.addEventListener('click',send);
   els.verify.addEventListener('click',verify);
   els.input.addEventListener('input',()=>{ if(o.sanitize) els.input.value=o.sanitize(els.input.value);
     if(verifiedValue!==null && els.input.value.trim()!==verifiedValue) reset(); });
   return {reset};
 }
 let fbReady=false;
 async function ensureFirebase(){
   if(fbReady) return;
   const [{initializeApp},authMod]=await Promise.all([
     import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
     import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js')]);
   const app=initializeApp(OTP_FIREBASE_CONFIG); const auth=authMod.getAuth(app);
   window._fbAuth=auth; window._fbAuthMod=authMod;
   window._recaptcha=new authMod.RecaptchaVerifier(auth,'recaptchaBox',{size:'invisible'});
   fbReady=true;
 }
 const phoneGate=makeGate({key:'phone',
   ids:{input:'cfPhone',send:'sendOtpBtn',row:'otpRow',code:'cfOtp',verify:'verifyOtpBtn',resend:'resendOtpBtn',timer:'otpTimer',status:'otpStatus',note:'otpNote'},
   validate:v=>/^[6-9]\d{9}$/.test(v), invalidMsg:'Please enter a valid 10-digit Indian mobile number.',
   sanitize:v=>v.replace(/\D/g,'').slice(0,10),
   label:v=>'+91 '+v, doneMsg:v=>'Mobile number +91 '+v+' verified. You can now send your message.',
   deliver:async(v,setConf)=>{
     if(OTP_FIREBASE_CONFIG){ try{ await ensureFirebase();
       const c=await window._fbAuthMod.signInWithPhoneNumber(window._fbAuth,'+91'+v,window._recaptcha);
       setConf(c); return 'LIVE'; }catch(e){ return false; } }
     return String(Math.floor(100000+Math.random()*900000)); }});
 const emailGate=makeGate({key:'email',
   ids:{input:'cfEmail',send:'sendEmailOtpBtn',row:'emailOtpRow',code:'cfEmailOtp',verify:'verifyEmailOtpBtn',resend:'resendEmailOtpBtn',timer:'emailOtpTimer',status:'emailOtpStatus',note:'emailOtpNote'},
   validate:v=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), invalidMsg:'Please enter a valid email address.',
   label:v=>v, doneMsg:v=>'Email '+v+' verified.',
   deliver:async(v)=>{
     if(OTP_EMAILJS_CONFIG){ try{
       if(!window.emailjs){ await new Promise((res,rej)=>{const sc=document.createElement('script');sc.src='https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';sc.onload=res;sc.onerror=rej;document.head.appendChild(sc)}); window.emailjs.init({publicKey:OTP_EMAILJS_CONFIG.publicKey}); }
       const code=String(Math.floor(100000+Math.random()*900000));
       await window.emailjs.send(OTP_EMAILJS_CONFIG.serviceId,OTP_EMAILJS_CONFIG.templateId,{to_email:v,passcode:code});
       return code; }catch(e){ return false; } }
     return String(Math.floor(100000+Math.random()*900000)); }});
 refresh();
 form.addEventListener('submit',e=>{e.preventDefault();
   if(!(ok.phone&&ok.email)){hint.scrollIntoView({behavior:'smooth',block:'center'});return}
   if(!document.getElementById('cfName').value.trim()){alert('Please enter your name.');return}
   alert('Thank you! Your message has been recorded (demo inbox). Connect the live service to receive messages on email.');
   form.reset(); phoneGate.reset(); emailGate.reset();
   document.getElementById('otpNote').hidden=false; document.getElementById('emailOtpNote').hidden=false; refresh();});
})();
