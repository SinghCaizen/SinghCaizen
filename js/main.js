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
   const digits=phone.replace(/\D/g,''); const cc=(window.__scCountry?window.__scCountry():{name:'India',dial:'91',len:10});
   if(cc.len? digits.length!==cc.len : (digits.length<5||digits.length>15)){ setStatus('Please enter a valid mobile number for '+cc.name+(cc.len?' ('+cc.len+' digits)':'')+'.','err'); document.getElementById('cfPhone').focus(); return; }
   if(!WEB3FORMS_KEY){ setStatus('The message service is being connected. Please try again shortly.','err'); return; }
   btn.disabled=true; btn.textContent='Sending...';
   try{
     const r=await fetch('https://api.web3forms.com/submit',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({access_key:WEB3FORMS_KEY, subject:'New enquiry from the Singh Caizen website: '+subject, from_name:'Singh Caizen Website', name:name, email:email, phone:'+'+cc.dial+' '+digits, phone_country:cc.name, message:message})});
     const data=await r.json();
     if(data && data.success){ setStatus('\u2713 Thank you, '+name.split(' ')[0]+'. Your message has been sent — we will get back to you shortly.','ok'); form.reset(); if(window.__scResetCountry)window.__scResetCountry(); }
     else setStatus('Could not send your message. Please try again.','err');
   }catch(err){ setStatus('Could not send your message. Please check your connection and try again.','err'); }
   btn.disabled=false; btn.textContent='Send Message';
 });
})();


// ===== Contact form: country-code selector =====
const CC_DATA=("India|91|10;United States|1|10;Canada|1|10;United Kingdom|44|10;United Arab Emirates|971|9;Australia|61|9;Singapore|65|8;Saudi Arabia|966|9;Qatar|974|8;Kuwait|965|8;Oman|968|8;Bahrain|973|8;Germany|49|;France|33|9;Netherlands|31|9;Switzerland|41|9;Spain|34|9;Italy|39|;Portugal|351|9;Ireland|353|;Belgium|32|9;Austria|43|;Sweden|46|9;Norway|47|8;Denmark|45|8;Finland|358|;Poland|48|9;Greece|30|10;Turkey|90|10;Russia|7|10;Ukraine|380|9;Israel|972|9;Egypt|20|10;South Africa|27|9;Nigeria|234|10;Kenya|254|9;Ghana|233|9;Ethiopia|251|9;Morocco|212|9;Algeria|213|9;China|86|11;Japan|81|10;South Korea|82|10;Hong Kong|852|8;Taiwan|886|9;Malaysia|60|;Indonesia|62|;Thailand|66|;Vietnam|84|;Philippines|63|10;Bangladesh|880|10;Pakistan|92|10;Sri Lanka|94|9;Nepal|977|10;Bhutan|975|8;Maldives|960|7;Myanmar|95|;Cambodia|855|;Laos|856|;Brunei|673|7;Afghanistan|93|9;Iraq|964|10;Iran|98|10;Jordan|962|9;Lebanon|961|;Yemen|967|9;Uzbekistan|998|9;Kazakhstan|7|10;Kyrgyzstan|996|9;Tajikistan|992|9;Azerbaijan|994|9;Georgia|995|9;Armenia|374|8;New Zealand|64|;Fiji|679|;Brazil|55|11;Mexico|52|10;Argentina|54|;Chile|56|9;Colombia|57|10;Peru|51|9;Venezuela|58|;Ecuador|593|9;Bolivia|591|8;Paraguay|595|9;Uruguay|598|8;Czech Republic|420|9;Slovakia|421|9;Hungary|36|;Romania|40|9;Bulgaria|359|;Croatia|385|;Serbia|381|;Slovenia|386|8;Lithuania|370|8;Latvia|371|8;Estonia|372|;Iceland|354|7;Luxembourg|352|;Malta|356|8;Cyprus|357|8;Montenegro|382|;Bosnia and Herzegovina|387|;North Macedonia|389|;Albania|355|;Moldova|373|;Belarus|375|9;Mauritius|230|8;Mozambique|258|9;Zambia|260|9;Zimbabwe|263|9;Uganda|256|9;Tanzania|255|9;Angola|244|9;Sudan|249|9;Libya|218|9;Tunisia|216|8;Sri Lanka (Mobile)|94|9").split(';').map(function(s){var p=s.split('|');return{name:p[0],dial:p[1],len:p[2]?parseInt(p[2],10):0};});
(function(){
  var sel=document.getElementById('ccSelect'); if(!sel)return;
  var btn=document.getElementById('ccBtn'), label=document.getElementById('ccLabel'),
      panel=document.getElementById('ccPanel'), search=document.getElementById('ccSearch'),
      list=document.getElementById('ccList'), phoneIn=document.getElementById('cfPhone');
  var current=CC_DATA[0];
  function render(f){ f=(f||'').toLowerCase(); list.innerHTML='';
    CC_DATA.filter(function(c){return !f||c.name.toLowerCase().indexOf(f)>-1||('+'+c.dial).indexOf(f)>-1||c.dial.indexOf(f)>-1;})
    .forEach(function(c){ var li=document.createElement('li'); li.className='cc-item'+(c===current?' sel':''); li.setAttribute('role','option');
      li.innerHTML='<span></span><span class="cc-code">+'+c.dial+'</span>'; li.firstChild.textContent=c.name;
      li.addEventListener('click',function(){ pick(c,true); }); list.appendChild(li); });
    if(!list.children.length){ list.innerHTML='<li class="cc-empty">No country found</li>'; } }
  function apply(){ label.textContent='+'+current.dial; phoneIn.maxLength=current.len?current.len:15; }
  function pick(c,focus){ current=c; apply(); close(); if(focus)phoneIn.focus(); }
  function open(){ render(''); search.value=''; panel.hidden=false; btn.setAttribute('aria-expanded','true'); setTimeout(function(){search.focus();},40); }
  function close(){ panel.hidden=true; btn.setAttribute('aria-expanded','false'); }
  btn.addEventListener('click',function(e){ e.stopPropagation(); panel.hidden?open():close(); });
  panel.addEventListener('click',function(e){ e.stopPropagation(); });
  document.addEventListener('click',function(){ if(!panel.hidden)close(); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&!panel.hidden)close(); });
  search.addEventListener('input',function(){ render(search.value); });
  apply();
  window.__scCountry=function(){ return current; };
  window.__scResetCountry=function(){ current=CC_DATA[0]; apply(); close(); };
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

// ===== Homepage fullpage ENGINE (Tata-style): one scroll gesture glides slowly to the next stop =====
(function(){
  var root=document.documentElement;
  if(!root.classList.contains('snap-home'))return;
  if(!window.matchMedia('(min-width:1021px) and (pointer:fine)').matches)return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  var secs=[].slice.call(document.querySelectorAll('.snap-sec'));
  if(!secs.length)return;
  var OFF=84, DUR=1000, stops=[], animating=false, acc=0, accTimer=null;
  root.classList.add('fp-on'); /* engine owns the movement; CSS snap steps aside */
  function build(){
    var vh=window.innerHeight, maxY=Math.max(0,document.documentElement.scrollHeight-vh), raw=[];
    secs.forEach(function(s){ var r=s.getBoundingClientRect(), top=r.top+window.scrollY;
      raw.push(Math.max(0,Math.round(top-OFF)));
      if(r.height>vh-OFF+60)raw.push(Math.round(Math.min(maxY, top+r.height-vh))); /* tall section: a stop at its bottom too */
    });
    raw.push(Math.round(maxY));
    raw.sort(function(a,b){return a-b;});
    stops=raw.filter(function(v,i){return i===0||v-raw[i-1]>4;});
  }
  function nextIdx(){ var y=window.scrollY; for(var i=0;i<stops.length;i++){ if(stops[i]>y+6)return i; } return -1; }
  function prevIdx(){ var y=window.scrollY; for(var i=stops.length-1;i>=0;i--){ if(stops[i]<y-6)return i; } return -1; }
  function go(i){ if(i<0||i>=stops.length||animating)return; var from=window.scrollY, to=stops[i];
    if(Math.abs(to-from)<4)return; animating=true; var t0=null;
    function step(ts){ if(!t0)t0=ts; var p=Math.min(1,(ts-t0)/DUR), e=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
      window.scrollTo(0,from+(to-from)*e); if(p<1)requestAnimationFrame(step); else animating=false; }
    requestAnimationFrame(step); }
  function overlayOpen(){ return !!document.querySelector('.search-overlay.open'); }
  window.addEventListener('wheel',function(e){
    if(e.ctrlKey||overlayOpen())return;
    if(animating){ e.preventDefault(); return; }
    if(Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
    if(e.target&&e.target.closest&&e.target.closest('.rail'))return;
    if(Math.abs(e.deltaY)<2)return;
    e.preventDefault(); acc+=e.deltaY;
    clearTimeout(accTimer); accTimer=setTimeout(function(){acc=0;},180);
    if(Math.abs(acc)<22)return;
    var d=acc>0?1:-1; acc=0; go(d>0?nextIdx():prevIdx());
  },{passive:false});
  window.addEventListener('keydown',function(e){
    if(overlayOpen())return;
    var tag=(e.target&&e.target.tagName)||''; if(tag==='INPUT'||tag==='TEXTAREA')return;
    if(e.key==='PageDown'||e.key==='ArrowDown'||e.key===' '){ e.preventDefault(); if(!animating)go(nextIdx()); }
    else if(e.key==='PageUp'||e.key==='ArrowUp'){ e.preventDefault(); if(!animating)go(prevIdx()); }
  });
  var rz; window.addEventListener('resize',function(){ clearTimeout(rz); rz=setTimeout(build,250); });
  build(); window.addEventListener('load',function(){ build(); setTimeout(build,900); });
})();
