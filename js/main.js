// SINGH CAIZEN — main.js (V4)
// SINGH CAIZEN — main.js
const header=document.querySelector('header');
addEventListener('scroll',()=>{header.classList.toggle('scrolled',scrollY>40);},{passive:true});
// Theme toggle (dark / light, remembered)
const tBtn=document.querySelector('.theme-toggle');
if(tBtn)tBtn.addEventListener('click',()=>{const root=document.documentElement;const cur=root.getAttribute('data-theme')==='light'?'dark':'light';root.classList.add('theme-anim');requestAnimationFrame(()=>requestAnimationFrame(()=>{root.setAttribute('data-theme',cur);try{localStorage.setItem('sc-theme',cur)}catch(e){}setTimeout(()=>root.classList.remove('theme-anim'),1150);}));});
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
addEventListener('load',()=>setTimeout(()=>{const p=document.getElementById('preloader');if(p)p.classList.add('hide')},400));
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
// Full-site content index: everything on the website can be found from search
const INDEX=[
['Home','index.html','Singh Caizen Group — homepage','home main start singh caizen group website'],
['About Singh Caizen','about.html','Our story, vision, mission & values','about story vision mission values journey foundation beginning company profile'],
['Our Businesses','businesses.html','Companies & divisions of the group','business businesses companies divisions verticals sectors work'],
['Divisions 01–03 — Revealing Soon','businesses.html','The group\u2019s first divisions are being prepared for their reveal','division 01 02 03 revealing soon coming soon new business sector launch'],
['Singh Caizen Tower','businesses.html','The group\u2019s first announced company — Division 04','tower division 04 building company landmark spaces first company'],
['The Road Ahead','index.html','Being built, step by step — the order in which the group intends to build','road ahead future plans steps roadmap foundation growth'],
['Leadership','leadership.html','Founder, management team & committees of the board','leadership founder management team board directors people'],
['Saurabh Singh — Founder & Owner','saurabh-singh.html','Profile of the group\u2019s founder & owner','saurabh singh founder owner malik chairman profile biography who'],
['Audit Committee','leadership.html','Keeps an independent eye on the group\u2019s finances','audit committee finance accounts oversight board'],
['Nomination & Remuneration Committee','leadership.html','On appointments and fair rewards','nomination remuneration committee appointments board'],
['Risk Management Committee','leadership.html','Watches the risks the group carries','risk management committee board'],
['IT Strategy Committee','leadership.html','Guides the group\u2019s technology choices','it strategy committee technology digital board'],
['CSR & ESG Committee','leadership.html','On the group\u2019s responsibilities to society','csr esg committee social responsibility environment board'],
['Newsroom','news.html','News, stories & updates from the group','news press media stories updates khabar samachar'],
['Building teams that improve every day','news.html','How we hire — and how our people keep growing','teams hiring people growth story news'],
['Focused on quality, project after project','news.html','How our divisions hold a single standard of quality','quality standard project story news'],
['Committees before companies','news.html','Why the group is setting up its oversight before its businesses','committees governance oversight story news'],
['India first, with the world in view','news.html','One home ground — and a roadmap that reaches further','india world global story news'],
['Careers','careers.html','Jobs, life at the group & FAQs','careers jobs naukri vacancy hiring work job apply life faq'],
['Worldwide','worldwide.html','Rooted in India — global outlook, regions & roadmap','worldwide global world international regions middle east europe north america asia pacific abroad countries'],
['Contact Us','contact.html','Enquiries, email & the contact form','contact email phone address sampark pata enquiry form reach mail info'],
['Newsletter & Reveal Updates','index.html','Subscribe in the footer — or register for the reveal — to hear first','newsletter subscribe updates register reveal email list follow']
];
const ov=document.querySelector('.search-overlay'),sIn=document.querySelector('.search-overlay input'),sRes=document.querySelector('.search-results');
function sNorm(s){return (s||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim()}
function sScore(e,q,toks){var t=sNorm(e[0]),k=sNorm(e[3]),b=sNorm(e[2]),sc=0;
 toks.forEach(function(w){if(!w)return;if(t.split(' ').indexOf(w)>-1)sc+=6;else if(t.indexOf(w)>-1)sc+=3;if(k.split(' ').indexOf(w)>-1)sc+=4;else if(k.indexOf(w)>-1)sc+=2;if(b.indexOf(w)>-1)sc+=1;});
 if(q.length>3&&(t.indexOf(q)>-1||k.indexOf(q)>-1))sc+=6;return sc}
function renderSearch(q){if(!sRes)return;q=(q||'').trim();
 if(!q){sRes.innerHTML=SITES.map(s=>`<a href="${s[1]}"><span>${s[0]}</span><small>${s[2]}</small></a>`).join('');return}
 var nq=sNorm(q),toks=nq.split(' ').filter(Boolean);
 var hits=INDEX.map((e,i)=>[sScore(e,nq,toks),i,e]).filter(x=>x[0]>0).sort((a,b)=>b[0]-a[0]||a[1]-b[1]).slice(0,8);
 if(hits.length){sRes.innerHTML=hits.map(x=>`<a href="${x[2][1]}"><span>${x[2][0]}</span><small>${x[2][2]}</small></a>`).join('');return}
 sRes.innerHTML='<div class="search-none"><p class="sn-title">No match for &ldquo;'+q.replace(/</g,'&lt;')+'&rdquo; yet</p>'
 +'<p class="sn-sub">It may not be on the website yet — the group is still revealing things step by step. Meanwhile, these may help:</p>'
 +'<div class="sn-links"><a href="businesses.html">Our Businesses</a><a href="careers.html">Careers</a><a href="news.html">Newsroom</a><a href="contact.html">Contact Us</a></div>'
+'</div>'}
if(ov){document.querySelectorAll('[data-open-search]').forEach(b=>b.addEventListener('click',()=>{ov.classList.add('open');renderSearch('');setTimeout(()=>sIn&&sIn.focus(),80)}));
if(sIn){sIn.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const first=sRes?sRes.querySelector('a:not([hidden])'):null;if(first)location.href=first.getAttribute('href');}});}
const sc=document.querySelector('.search-close');if(sc)sc.addEventListener('click',()=>ov.classList.remove('open'));
addEventListener('keydown',e=>{if(e.key==='Escape')ov.classList.remove('open')});
if(sIn)sIn.addEventListener('input',()=>renderSearch(sIn.value));
}
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
// Accordions (board committees, careers FAQ)
document.querySelectorAll('.faq-body,.comm-body').forEach(function(body){ if(!body.querySelector(':scope > .acc-in')){ var w=document.createElement('div'); w.className='acc-in'; while(body.firstChild)w.appendChild(body.firstChild); body.appendChild(w); } });
document.querySelectorAll('.comm-head,.faq-head').forEach(function(b){ b.addEventListener('click',function(){
  var item=b.parentElement, opening=!item.classList.contains('open');
  if(opening&&item.parentElement){ item.parentElement.querySelectorAll(':scope > .open').forEach(function(o){ if(o!==item)o.classList.remove('open'); }); }
  item.classList.toggle('open',opening);
}); });

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
const CC_DATA=("India|91|10;United States|1|10;Canada|1|10;United Kingdom|44|10;United Arab Emirates|971|9;Australia|61|9;Singapore|65|8;Saudi Arabia|966|9;Qatar|974|8;Kuwait|965|8;Oman|968|8;Bahrain|973|8;Germany|49|;France|33|9;Netherlands|31|9;Switzerland|41|9;Spain|34|9;Italy|39|;Portugal|351|9;Ireland|353|;Belgium|32|9;Austria|43|;Sweden|46|9;Norway|47|8;Denmark|45|8;Finland|358|;Poland|48|9;Greece|30|10;Turkey|90|10;Russia|7|10;Ukraine|380|9;Israel|972|9;Egypt|20|10;South Africa|27|9;Nigeria|234|10;Kenya|254|9;Ghana|233|9;Ethiopia|251|9;Morocco|212|9;Algeria|213|9;China|86|11;Japan|81|10;South Korea|82|10;Hong Kong|852|8;Taiwan|886|9;Malaysia|60|;Indonesia|62|;Thailand|66|;Vietnam|84|;Philippines|63|10;Bangladesh|880|10;Pakistan|92|10;Sri Lanka|94|9;Nepal|977|10;Bhutan|975|8;Maldives|960|7;Myanmar|95|;Cambodia|855|;Laos|856|;Brunei|673|7;Afghanistan|93|9;Iraq|964|10;Iran|98|10;Jordan|962|9;Lebanon|961|;Yemen|967|9;Uzbekistan|998|9;Kazakhstan|7|10;Kyrgyzstan|996|9;Tajikistan|992|9;Azerbaijan|994|9;Georgia|995|9;Armenia|374|8;New Zealand|64|;Fiji|679|;Brazil|55|11;Mexico|52|10;Argentina|54|;Chile|56|9;Colombia|57|10;Peru|51|9;Venezuela|58|;Ecuador|593|9;Bolivia|591|8;Paraguay|595|9;Uruguay|598|8;Czech Republic|420|9;Slovakia|421|9;Hungary|36|;Romania|40|9;Bulgaria|359|;Croatia|385|;Serbia|381|;Slovenia|386|8;Lithuania|370|8;Latvia|371|8;Estonia|372|;Iceland|354|7;Luxembourg|352|;Malta|356|8;Cyprus|357|8;Montenegro|382|;Bosnia and Herzegovina|387|;North Macedonia|389|;Albania|355|;Moldova|373|;Belarus|375|9;Mauritius|230|8;Mozambique|258|9;Zambia|260|9;Zimbabwe|263|9;Uganda|256|9;Tanzania|255|9;Angola|244|9;Sudan|249|9;Libya|218|9;Tunisia|216|8").split(';').map(function(s){var p=s.split('|');return{name:p[0],dial:p[1],len:p[2]?parseInt(p[2],10):0};});
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
   if(window.__scRegHas&&window.__scRegHas(email)){ note.textContent='This email is already registered \u2014 you are already on the list.'; return; }
   if(!NEWSLETTER_FORM_URL){ note.textContent='Newsletter is being connected — please check back shortly.'; return; }
   const fd=new FormData(); fd.append('EMAIL', email); fd.append('locale','en'); fd.append('email_address_check','');
   try{ await fetch(NEWSLETTER_FORM_URL,{method:'POST',body:fd,mode:'no-cors'});
     if(window.__scRegAdd)window.__scRegAdd(email); f.reset(); note.textContent='\u2713 Thank you for subscribing to the Singh Caizen newsletter.';
   }catch(err){ note.textContent='Could not subscribe right now. Please try again.'; }
 });
});

// Mobile footer subscribe — posts to the same Brevo endpoint as the desktop form.
document.querySelectorAll('form.t-subscribe').forEach(f=>{
 f.addEventListener('submit', async e=>{ e.preventDefault();
   const input=f.querySelector('input[type=email]'); const email=input.value.trim();
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){ input.focus(); input.reportValidity(); return; }
   const note=(f.nextElementSibling && f.nextElementSibling.classList.contains('sub-done')) ? f.nextElementSibling : null;
   if(window.__scRegHas&&window.__scRegHas(email)){ if(note){ note.textContent='This email is already registered \u2014 you are already on the list.'; note.hidden=false; } return; }
   const fd=new FormData(); fd.append('EMAIL', email); fd.append('locale','en'); fd.append('email_address_check','');
   try{ await fetch(NEWSLETTER_FORM_URL,{method:'POST',body:fd,mode:'no-cors'});
     if(window.__scRegAdd)window.__scRegAdd(email); f.reset(); if(note){ note.textContent='Thank you for subscribing to Singh Caizen updates.'; note.hidden=false; }
   }catch(err){ if(note){ note.textContent='Could not subscribe right now. Please try again.'; note.hidden=false; } }
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

// ===== Legal popup (Privacy / Terms / Equal Opportunity) + cookie consent + preferences =====
(function(){
  var LEGAL={
   privacy:{t:'Privacy Policy',h:'<p class="legal-updated">Last updated: 25 October 2026</p><h3>1. Who we are</h3><p>Singh Caizen (\u201cwe\u201d, \u201cour\u201d) operates this website. We respect your privacy and handle the information you share with us carefully and only for the purposes described here.</p><h3>2. Information we collect</h3><ul><li><b>Contact enquiries</b> \u2014 your name, email address, mobile number and message, when you use the Contact form.</li><li><b>Newsletter</b> \u2014 your email address, when you subscribe from the footer.</li><li><b>Careers</b> \u2014 any profile or resume details you choose to send us while expressing interest in a role.</li></ul><h3>3. How we use it</h3><p>We use your information only to respond to your enquiry, send the newsletter to subscribers, and consider profiles for present or future roles. We do not sell, rent or trade your personal information to anyone.</p><h3>4. Who processes it for us</h3><p>Contact-form messages are delivered to our mailbox through Web3Forms, newsletter subscriptions are managed through Brevo, and this website is hosted on GitHub Pages. These providers process the data only to provide their service to us.</p><h3>5. Cookies and local storage</h3><p>This website stores small settings on your device \u2014 your dark/light theme preference and your cookie choices \u2014 so the site works the way you left it. We do not use advertising or cross-site tracking cookies. You can review your choices any time from the Cookie Preferences option in the cookie bar.</p><h3>6. Your choices and rights</h3><p>You may ask us what information we hold about you, and request its correction or deletion, at any time by writing to info@singhcaizen.com. Every newsletter email carries an unsubscribe option.</p><h3>7. Retention and security</h3><p>We keep enquiry and subscription information only as long as it is needed for the purpose it was shared, and we take reasonable care to protect it. No method of transmission over the internet is completely secure, so please share sensitive documents only when we specifically ask for them.</p><h3>8. Changes to this policy</h3><p>If this policy changes, the updated version will be published on this page with a new date. Questions about privacy: info@singhcaizen.com.</p>'},
   terms:{t:'Terms of Use',h:'<p class="legal-updated">Last updated: 25 October 2026</p><h3>1. Acceptance</h3><p>By using this website, you accept these Terms of Use. If you do not agree with them, please do not use the website.</p><h3>2. About this website</h3><p>This website provides general information about the Singh Caizen Group. Some businesses, projects and plans described here are announced or under formation, and details may change as they are formalised. Nothing on this website is an offer, invitation or promise of investment, employment or business unless expressly stated in writing by the group.</p><h3>3. Intellectual property</h3><p>The Singh Caizen name, logo, text, design and other content on this website belong to Singh Caizen. You may view and share links to pages for personal, non-commercial purposes. Any other use \u2014 including copying the name or logo for another business \u2014 requires our prior written permission.</p><h3>4. Recruitment fraud warning</h3><p>Singh Caizen never charges any fee or security deposit from job seekers at any stage of recruitment, and we do not appoint agents to collect money. If anyone demands payment in our name, it is a fraud \u2014 please report it through the Contact page.</p><h3>5. Third-party links</h3><p>This website links to third-party platforms (such as social media). We are not responsible for the content or practices of those websites.</p><h3>6. Accuracy and liability</h3><p>We work to keep this website accurate and current, but we do not warrant that it is complete or error-free at all times. To the extent permitted by law, Singh Caizen is not liable for any loss arising from reliance on this website.</p><h3>7. Governing law</h3><p>These terms are governed by the laws of India. Courts in India shall have jurisdiction over any dispute arising from the use of this website.</p><h3>8. Changes and contact</h3><p>We may update these terms from time to time; the current version will always be available on this page. Questions: info@singhcaizen.com.</p>'},
   equal:{t:'Equal Opportunity',h:'<h3>Our commitment</h3><p>Singh Caizen is an equal opportunity employer. We believe a group is judged by the standard it keeps for everyone \u2014 and that standard does not change with who a person is.</p><h3>What this means</h3><ul><li>Hiring, pay and growth decisions are based on merit, ability and performance.</li><li>We do not discriminate on the basis of religion, caste, race, gender, age, disability, marital status, region or any other personal characteristic protected by law.</li><li>Every candidate and colleague is treated with dignity and respect, in every division of the group.</li></ul><h3>Raising a concern</h3><p>If you experience or witness discrimination in any interaction with the group \u2014 including during recruitment \u2014 please write to info@singhcaizen.com or use the Contact page. Every concern is read and taken seriously.</p>'},
   sitemap:{t:'Sitemap',h:'<p class="legal-updated">Every page of this website</p><ul><li><a href="index.html" style="color:var(--blue-bright);font-weight:600">Home</a></li><li><a href="about.html" style="color:var(--blue-bright);font-weight:600">About Us</a></li><li><a href="businesses.html" style="color:var(--blue-bright);font-weight:600">Our Businesses</a></li><li><a href="leadership.html" style="color:var(--blue-bright);font-weight:600">Leadership</a></li><li><a href="saurabh-singh.html" style="color:var(--blue-bright);font-weight:600">Saurabh Singh \u2014 Founder &amp; Owner</a></li><li><a href="news.html" style="color:var(--blue-bright);font-weight:600">Newsroom</a></li><li><a href="careers.html" style="color:var(--blue-bright);font-weight:600">Careers</a></li><li><a href="worldwide.html" style="color:var(--blue-bright);font-weight:600">Worldwide</a></li><li><a href="contact.html" style="color:var(--blue-bright);font-weight:600">Contact</a></li></ul>'}
  };
  var ov=document.createElement('div'); ov.className='legal-overlay';
  ov.innerHTML='<div class="legal-modal" role="dialog" aria-modal="true"><div class="legal-head"><img class="modal-logo" src="images/logo-white.svg" alt="Singh Caizen"><h2></h2><button type="button" class="legal-x" aria-label="Close">\u00d7</button></div><div class="legal-body"></div></div>';
  document.body.appendChild(ov);
  var title=ov.querySelector('.legal-head h2'), lbody=ov.querySelector('.legal-body');
  function openLegal(key){ var d=LEGAL[key]; if(!d)return; title.textContent=d.t; lbody.innerHTML=d.h; lbody.scrollTop=0; ov.classList.add('show'); document.body.style.overflow='hidden'; }
  function closeLegal(){ ov.classList.remove('show'); if(!pov.classList.contains('show'))document.body.style.overflow=''; }
  ov.addEventListener('click',function(e){ if(e.target===ov)closeLegal(); });
  ov.querySelector('.legal-x').addEventListener('click',closeLegal);
  var MAP={'Privacy Policy':'privacy','Terms of Use':'terms','Equal Opportunity':'equal','Sitemap':'sitemap'};
  document.querySelectorAll('footer a').forEach(function(a){ var tx=(a.textContent||'').trim(); var k=MAP[tx];
    if(k){ a.addEventListener('click',function(e){ e.preventDefault(); openLegal(k); }); }
    else if(tx==='Cookie Preferences'){ a.addEventListener('click',function(e){ e.preventDefault(); if(window.__openPrefs)window.__openPrefs(); }); } });
  window.__openLegal=openLegal;

  /* ---------- Cookie preferences ---------- */
  var CATS=[
   {id:'essential',name:'Essential',always:true,desc:'These cookies and settings are essential to support core site functionality \u2014 remembering your dark/light theme and your cookie choices on this device. The website cannot switch these off.',providers:[
     {n:'Singh Caizen (this website)',d:'First-party settings stored on your device by this website itself: your theme preference and the cookie choices you save here.',l:''},
     {n:'GitHub Pages',d:'This website is hosted on GitHub Pages. GitHub may process technical data such as your IP address to serve and secure the site. Read the GitHub Privacy Statement:',l:'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement'}]},
   {id:'advertising',name:'Advertising',always:false,desc:'Advertising cookies are used to deliver advertisements that are relevant to you and to measure campaigns. Singh Caizen does not run advertising on this website today, so no advertising cookies are set \u2014 your choice is saved and will be respected if this ever changes.',providers:[]},
   {id:'analytics',name:'Analytics & Customization',always:false,desc:'Analytics cookies help a website understand how visitors use it, so it can improve. This website does not use analytics or visitor tracking today, so no such cookies are set \u2014 your choice is saved and will be respected if this ever changes.',providers:[]},
   {id:'performance',name:'Performance & Functionality',always:false,desc:'These support extra features on the website, such as the contact form and the newsletter signup. The services behind those forms may set their own cookies on their domains when a form is used.',providers:[
     {n:'Web3Forms',d:'Powers the Contact form and delivers your message to our mailbox.',l:'https://web3forms.com/privacy'},
     {n:'Brevo',d:'Manages the newsletter subscription list and confirmation emails for subscribers.',l:'https://www.brevo.com/legal/privacypolicy/'}]}
  ];
  var prefs={essential:true,advertising:false,analytics:false,performance:false};
  try{ var saved=localStorage.getItem('sc-cookie-prefs'); if(saved){ var sp=JSON.parse(saved); for(var k in prefs){ if(typeof sp[k]==='boolean')prefs[k]=sp[k]; } prefs.essential=true; } }catch(e){}
  var pov=document.createElement('div'); pov.className='pref-overlay';
  pov.innerHTML='<div class="pref-modal" role="dialog" aria-modal="true"><div class="pref-head"><img class="modal-logo" src="images/logo-white.svg" alt="Singh Caizen"><h2>Your Cookie Preferences</h2><button type="button" class="legal-x pref-x" aria-label="Close">\u00d7</button></div><p class="pref-intro">We use different types of cookies to optimize your experience on our website. Click on the categories below to learn more about their purpose. You may choose which types of cookies to allow and can change your preferences at any time. Remember that disabling cookies may affect your experience on the website. You can learn more about how we use cookies by visiting our <a href="#" class="pref-pol" style="color:#e31837">Privacy Policy</a>.</p><div class="pref-grid"><div class="pref-cats"></div><div class="pref-pane"></div></div><div class="pref-foot"><button type="button" class="cookie-no pref-save">Save My Preferences</button><button type="button" class="btn pref-all">Accept All</button></div></div>';
  document.body.appendChild(pov);
  var catsEl=pov.querySelector('.pref-cats'), paneEl=pov.querySelector('.pref-pane'), curCat='essential';
  function renderCats(){ catsEl.innerHTML=''; CATS.forEach(function(ct){ var b=document.createElement('button'); b.type='button'; b.className='pref-cat'+(ct.id===curCat?' sel':'')+(prefs[ct.id]?' on':''); b.innerHTML='<span class="tick">\u2713</span>'+ct.name; b.addEventListener('click',function(){ curCat=ct.id; renderCats(); renderPane(); }); catsEl.appendChild(b); }); }
  function renderPane(){ var ct=null; CATS.forEach(function(x){ if(x.id===curCat)ct=x; }); if(!ct)return;
    var prov=ct.providers.map(function(p){ return '<details class="pref-prov"><summary>'+p.n+'</summary><p>'+p.d+'</p>'+(p.l?'<a href="'+p.l+'" target="_blank" rel="noopener">'+p.l+'</a>':'')+'</details>'; }).join('');
    paneEl.innerHTML='<div class="pref-pane-top"><h3>'+ct.name+'</h3><span class="pref-always">'+(ct.always?'Always active':'')+'<label class="switch"><input type="checkbox" '+(prefs[ct.id]?'checked':'')+(ct.always?' disabled':'')+'><span class="track"></span></label></span></div><p>'+ct.desc+'</p>'+(ct.providers.length?'<p style="font-weight:700;color:var(--text);letter-spacing:.03em">COOKIE PROVIDERS</p>'+prov:'');
    var tog=paneEl.querySelector('.switch input'); if(tog&&!ct.always){ tog.addEventListener('change',function(){ prefs[ct.id]=tog.checked; renderCats(); }); } }
  function openPrefs(){ renderCats(); renderPane(); pov.classList.add('show'); document.body.style.overflow='hidden'; }
  window.__openPrefs=openPrefs;
  function closePrefs(){ pov.classList.remove('show'); if(!ov.classList.contains('show'))document.body.style.overflow=''; if(typeof bar!=='undefined'&&bar)bar.classList.remove('bar-hide'); }
  pov.addEventListener('click',function(e){ if(e.target===pov)closePrefs(); });
  pov.querySelector('.pref-x').addEventListener('click',closePrefs);
  pov.querySelector('.pref-pol').addEventListener('click',function(e){ e.preventDefault(); closePrefs(); openLegal('privacy'); });
  function savePrefs(choice){ try{ localStorage.setItem('sc-cookie-prefs',JSON.stringify(prefs)); localStorage.setItem('sc-cookie-choice',choice); }catch(e){} }
  pov.querySelector('.pref-save').addEventListener('click',function(){ savePrefs('custom'); closePrefs(); hideBar(); });
  pov.querySelector('.pref-all').addEventListener('click',function(){ CATS.forEach(function(ct){ prefs[ct.id]=true; }); savePrefs('accepted'); closePrefs(); hideBar(); renderPane(); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'){ closeLegal(); closePrefs(); } });

  /* ---------- Cookie bar: Accept / Reject / Preferences ---------- */
  var bar=null;
  function hideBar(){ if(bar){ bar.classList.remove('show'); var b=bar; setTimeout(function(){ b.remove(); },650); bar=null; } }
  var ckForce=location.search.indexOf('ckbar')>-1;
  try{ if(ckForce||!localStorage.getItem('sc-cookie-choice')){
    bar=document.createElement('div'); bar.className='cookie-bar';
    bar.innerHTML='<div class="cookie-ic"><svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="9" r="1.4" fill="#fff" stroke="none"/><circle cx="15.2" cy="10.6" r="1.4" fill="#fff" stroke="none"/><circle cx="10.4" cy="15.2" r="1.4" fill="#fff" stroke="none"/><circle cx="15.6" cy="15.8" r="1.1" fill="#fff" stroke="none"/></svg></div><p><b>We use cookies</b>We store small settings on your device to give you a better experience. By using our website you agree to <a class="cookie-pol">our policies</a>.</p><div class="cookie-btns"><button type="button" class="btn cookie-ok">Accept</button><button type="button" class="cookie-no cookie-rej">Reject</button><button type="button" class="cookie-no cookie-pref">Preferences</button></div>';
    document.body.appendChild(bar);
    setTimeout(function(){ if(bar)bar.classList.add('show'); },1400);
    bar.querySelector('.cookie-ok').addEventListener('click',function(){ CATS.forEach(function(ct){ prefs[ct.id]=true; }); savePrefs('accepted'); hideBar(); });
    bar.querySelector('.cookie-rej').addEventListener('click',function(){ CATS.forEach(function(ct){ if(!ct.always)prefs[ct.id]=false; }); savePrefs('rejected'); hideBar(); });
    bar.querySelector('.cookie-pref').addEventListener('click',function(){ openPrefs(); if(bar)bar.classList.add('bar-hide'); });
    bar.querySelector('.cookie-pol').addEventListener('click',function(){ openLegal('privacy'); });
  } }catch(e){}
})();

// Mega menu: Escape or scrolling closes it; moving the mouse back re-arms it
(function(){ var hdr=document.querySelector('header'); if(!hdr)return;
 function kill(){ hdr.classList.add('kill-mega'); var a=document.activeElement; if(a&&a.closest&&a.closest('.has-drop'))a.blur(); }
 document.addEventListener('keydown',function(e){ if(e.key==='Escape')kill(); });
 var tick=false; window.addEventListener('scroll',function(){ if(tick)return; tick=true; requestAnimationFrame(function(){ tick=false; if(document.querySelector('.has-drop:hover'))kill(); }); },{passive:true});
 document.querySelectorAll('.has-drop').forEach(function(li){ li.addEventListener('mouseenter',function(){ hdr.classList.remove('kill-mega'); }); li.addEventListener('mouseleave',function(){ hdr.classList.remove('kill-mega'); }); });
})();

// ===== Coming Soon / Revealing Soon teaser: entry popup + Tower reveal modal =====
(function(){
  // Device registry: emails already registered / subscribed from this device
  function regList(){ try{ var a=JSON.parse(localStorage.getItem('sc-reg-emails')||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
  function regHas(email){ return regList().indexOf(String(email||'').trim().toLowerCase())>-1; }
  function regAdd(email){ var e=String(email||'').trim().toLowerCase(); if(!e)return; var a=regList(); if(a.indexOf(e)<0){ a.push(e); try{ localStorage.setItem('sc-reg-emails',JSON.stringify(a)); }catch(err){} } }
  function legacyReg(){ try{ return !!localStorage.getItem('sc-reveal-reg'); }catch(e){ return false; } }
  function isReg(){ return regList().length>0||legacyReg(); }
  window.__scRegHas=regHas; window.__scRegAdd=regAdd;

  var ov=document.createElement('div'); ov.className='teaser-overlay';
  ov.innerHTML='<div class="teaser-card" role="dialog" aria-modal="true">'
   +'<button type="button" class="teaser-x" aria-label="Close">×</button>'
   +'<img class="teaser-logo" src="images/logo-dark.svg" alt="Singh Caizen">'
   +'<p class="teaser-eyebrow"></p><div class="teaser-title"></div>'
   +'<div class="teaser-head"></div><div class="teaser-line"></div>'
   +'<p class="teaser-copy"></p>'
   +'<form class="teaser-form"><input type="email" required placeholder="Your email address" aria-label="Your email address"><button type="submit" class="btn">Register for the Reveal</button></form>'
   +'<p class="teaser-note"></p>'
   +'<div class="teaser-done"><svg class="teaser-check" viewBox="0 0 56 56"><circle cx="28" cy="28" r="26"/><path d="M17 29.5l7.5 7.5L39 21"/></svg>'
   +'<div class="teaser-done-title"></div><p class="teaser-done-sub"></p>'
   +'<p class="teaser-count">This popup will close in <b class="cd-num">10</b> seconds.<br>You can close it now, or simply wait to enter the site.</p></div>'
   +'<button type="button" class="teaser-enter">Enter the site →</button></div>';
  document.body.appendChild(ov);
  var card=ov.querySelector('.teaser-card'),
      eb=ov.querySelector('.teaser-eyebrow'), tt=ov.querySelector('.teaser-title'), hd=ov.querySelector('.teaser-head'),
      cp=ov.querySelector('.teaser-copy'), fm=ov.querySelector('.teaser-form'), nt=ov.querySelector('.teaser-note'),
      dn=ov.querySelector('.teaser-done'), dt=dn.querySelector('.teaser-done-title'), ds=dn.querySelector('.teaser-done-sub'), cn=dn.querySelector('.cd-num');
  var VARIANTS={
    group:{eb:'The Singh Caizen Group',tt:'',head:'COMING <em>SOON</em>',copy:'Something is being built. The group&rsquo;s businesses, its people and its plans are being prepared for their reveal. Register, and be the first to know when the curtain lifts.'},
    tower:{eb:'Group Company · Division 04',tt:'Singh Caizen Tower',head:'REVEALING <em>SOON</em>',copy:'The group&rsquo;s first announced company is being prepared for its reveal. Its address, its design and its opening will be published the moment each is final — register, and hear it first.'}
  };
  var cdTimer=null;
  function stopCount(){ if(cdTimer){ clearInterval(cdTimer); cdTimer=null; } }
  function showDone(title, sub, withCount){
    cp.style.display='none'; fm.style.display='none'; nt.style.display='none';
    dn.classList.remove('show'); void dn.offsetWidth;
    dt.textContent=title; ds.innerHTML=sub;
    dn.classList.toggle('counting', !!withCount);
    dn.classList.add('show');
    if(withCount){ var n=10; cn.textContent=n; stopCount(); cdTimer=setInterval(function(){ n--; if(n<=0){ stopCount(); closeTeaser(); } else { cn.textContent=n; } },1000); }
  }
  function openTeaser(key){
    var v=VARIANTS[key]||VARIANTS.group;
    stopCount();
    eb.textContent=v.eb; tt.textContent=v.tt; tt.style.display=v.tt?'block':'none';
    hd.innerHTML=v.head; cp.innerHTML=v.copy;
    nt.textContent=''; nt.className='teaser-note'; nt.style.display='';
    if(fm.reset)fm.reset(); fm.style.display=''; cp.style.display='';
    dn.classList.remove('show','counting');
    card.classList.remove('bye'); ov.classList.remove('bye');
    ov.classList.remove('show'); void ov.offsetWidth; ov.classList.add('show');
    document.body.style.overflow='hidden';
    if(isReg()){
      var list=regList(); var em=list.length?list[list.length-1]:'';
      em=em.replace(/&/g,'&amp;').replace(/</g,'&lt;');
      showDone('You Are Already Registered','This device has already registered for the reveal'+(em?' with <b>'+em+'</b>':'')+'.<br>Watch your inbox — the reveal will reach you first.', false);
    }
  }
  function scatter(){
    try{
      var r=card.getBoundingClientRect(), o=ov.getBoundingClientRect();
      var cx=r.left-o.left+r.width/2, cy=r.top-o.top+r.height/2;
      for(var k=0;k<22;k++){
        var p=document.createElement('span'); p.className='particle'+(k%3===0?' red':'');
        var ang=Math.random()*Math.PI*2, dist=110+Math.random()*190;
        p.style.left=cx+'px'; p.style.top=cy+'px';
        p.style.setProperty('--dx',(Math.cos(ang)*dist)+'px');
        p.style.setProperty('--dy',(Math.sin(ang)*dist-40)+'px');
        ov.appendChild(p);
        (function(el){ setTimeout(function(){ el.remove(); },1100); })(p);
      }
    }catch(e){}
  }
  function closeTeaser(){
    if(!ov.classList.contains('show'))return;
    stopCount(); scatter();
    card.classList.add('bye'); ov.classList.add('bye');
    setTimeout(function(){ ov.classList.remove('show','bye'); card.classList.remove('bye'); if(!document.querySelector('.legal-overlay.show,.pref-overlay.show'))document.body.style.overflow=''; },1120);
  }
  window.__openTeaser=openTeaser;
  ov.addEventListener('click',function(e){ if(e.target===ov)closeTeaser(); });
  ov.querySelector('.teaser-x').addEventListener('click',closeTeaser);
  ov.querySelector('.teaser-enter').addEventListener('click',closeTeaser);
  document.addEventListener('keydown',function(e){ if(e.key==='Escape')closeTeaser(); });
  document.addEventListener('click',function(e){ var t=e.target.closest?e.target.closest('[data-reveal]'):null; if(t){ e.preventDefault(); openTeaser(t.getAttribute('data-reveal')); } });
  fm.addEventListener('submit', async function(e){ e.preventDefault();
    var input=fm.querySelector('input[type=email]'); var email=input.value.trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){ input.focus(); return; }
    if(regHas(email)){ nt.textContent='This email is already registered — you are already on the list for the reveal.'; nt.className='teaser-note ok'; return; }
    var fd=new FormData(); fd.append('EMAIL',email); fd.append('locale','en'); fd.append('email_address_check','');
    try{ await fetch(NEWSLETTER_FORM_URL,{method:'POST',body:fd,mode:'no-cors'});
      regAdd(email);
      try{ localStorage.setItem('sc-reveal-reg',String(Date.now())); }catch(err){}
      showDone('Successfully Registered!','You are on the list. Watch your inbox — the reveal will reach you first.', true);
    }catch(err){ nt.textContent='Could not register right now. Please try again.'; }
  });
  // Entry popup: appears ONLY when the page is refreshed (reload) — not on fresh opens or navigation
  var navType='navigate';
  try{ var nte=performance.getEntriesByType('navigation')[0];
    if(nte&&nte.type){ navType=nte.type; }
    else if(performance.navigation){ navType=(performance.navigation.type===1?'reload':(performance.navigation.type===2?'back_forward':'navigate')); }
  }catch(e){}
  if(navType==='reload'){ setTimeout(function(){ openTeaser('group'); },900); }
})();

// ===== Image fallback: any remote photo that fails to load is replaced by a branded Coming Soon placeholder =====
(function(){
  var PH='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#101014"/><rect x="26" y="26" width="1148" height="748" fill="none" stroke="#c9a227" stroke-width="2"/><text x="600" y="376" font-family="Georgia,serif" font-size="54" fill="#f2ead2" text-anchor="middle" letter-spacing="6">SINGH CAIZEN</text><text x="600" y="440" font-family="Georgia,serif" font-size="27" fill="#c9a227" text-anchor="middle" letter-spacing="10">IMAGE COMING SOON</text></svg>');
  function swap(im){ if(im.getAttribute('data-ph'))return; im.setAttribute('data-ph','1'); im.src=PH; }
  function scan(){ var list=document.querySelectorAll('img'); for(var k=0;k<list.length;k++){ (function(im){ var s=im.getAttribute('src')||''; if(s.indexOf('http')!==0) return; im.setAttribute('loading','lazy'); if(im.complete&&im.naturalWidth===0) swap(im); else im.addEventListener('error',function(){ swap(im); }); })(list[k]); } }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',scan); else scan();
  addEventListener('load',scan);
})();
