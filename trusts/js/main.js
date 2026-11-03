// Singh Caizen Trusts — main.js
// Preloader
(function(){
  var t0=Date.now();
  function hide(){ var p=document.getElementById('preloader'); if(p) p.classList.add('hide'); }
  addEventListener('load',function(){ setTimeout(hide, Math.max(0, 950-(Date.now()-t0))); });
  setTimeout(hide, 3800);
})();
// Header state
(function(){
  var h=document.querySelector('header'); if(!h) return;
  function on(){ h.classList.toggle('scrolled', scrollY>30); }
  addEventListener('scroll', on, {passive:true}); on();
})();
// Mobile menu
(function(){
  var b=document.querySelector('.burger'); if(!b) return;
  b.addEventListener('click', function(){ document.body.classList.toggle('menu-open'); });
  document.querySelectorAll('.mnav a').forEach(function(a){ a.addEventListener('click', function(){ document.body.classList.remove('menu-open'); }); });
})();
// Reveal on scroll
(function(){
  var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('on'); io.unobserve(e.target); } }); }, {threshold:.12});
  document.querySelectorAll('.rv').forEach(function(el){ io.observe(el); });
})();
// Image fallback: any remote photo that fails becomes a branded placeholder
(function(){
  var PH='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#123f2a"/><rect x="26" y="26" width="1148" height="748" fill="none" stroke="#c9a227" stroke-width="2"/><text x="600" y="376" font-family="Georgia,serif" font-size="50" fill="#f3eedd" text-anchor="middle" letter-spacing="5">SINGH CAIZEN TRUSTS</text><text x="600" y="438" font-family="Georgia,serif" font-size="26" fill="#c9a227" text-anchor="middle" letter-spacing="9">IMAGE COMING SOON</text></svg>');
  function swap(im){ if(im.getAttribute('data-ph')) return; im.setAttribute('data-ph','1'); im.src=PH; }
  function scan(){ document.querySelectorAll('img').forEach(function(im){ var s=im.getAttribute('src')||''; if(s.indexOf('http')!==0) return; if(im.complete && im.naturalWidth===0) swap(im); else im.addEventListener('error', function(){ swap(im); }); }); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', scan); else scan();
  addEventListener('load', scan);
})();
// Contact form (Web3Forms — same inbox as the group website)
(function(){
  var f=document.getElementById('cform'); if(!f) return;
  var st=document.getElementById('fstatus');
  f.addEventListener('submit', function(e){
    e.preventDefault();
    var name=f.querySelector('[name=name]').value.trim(),
        email=f.querySelector('[name=email]').value.trim(),
        subject=f.querySelector('[name=subject]').value,
        msg=f.querySelector('[name=message]').value.trim();
    if(!name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !msg){ st.className='fstatus err'; st.textContent='Please fill your name, a valid email and your message.'; return; }
    st.className='fstatus'; st.style.display='block'; st.textContent='Sending…';
    fetch('https://api.web3forms.com/submit', {method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'},
      body: JSON.stringify({access_key:'94e01d94-8fae-4cdc-b9b9-716cf169d7dc', subject:'Singh Caizen Trusts — '+subject+': '+name, from_name:'Singh Caizen Trusts Website', name:name, email:email, phone:f.querySelector('[name=phone]').value.trim(), message:msg})
    }).then(function(r){ return r.json(); }).then(function(d){
      if(d && d.success){ f.reset(); st.className='fstatus ok'; st.textContent='Thank you — your message has been sent. We will reply as soon as we can.'; }
      else { st.className='fstatus err'; st.textContent='Could not send right now. Please try again, or write to singhcaizen@outlook.in.'; }
    }).catch(function(){ st.className='fstatus err'; st.textContent='Could not send right now. Please try again, or write to singhcaizen@outlook.in.'; });
  });
})();
// Year
(function(){ var y=document.getElementById('yr'); if(y) y.textContent=new Date().getFullYear(); })();

// Back-to-top
(function(){
  var top=document.querySelector('.backtop');
  function on(){
    var y=window.scrollY||0;
    if(top) top.classList.toggle('show', y>600);
  }
  addEventListener('scroll', on, {passive:true}); on();
  if(top) top.addEventListener('click', function(){ window.scrollTo({top:0, behavior:'smooth'}); });
})();
// Footer newsletter (Brevo — same Website Subscribers list as the group site)
(function(){
  var f=document.querySelector('.fnews-form'); if(!f) return;
  var input=f.querySelector('input'), st=f.querySelector('.fn-status');
  var U='https://00357f29.sibforms.com/serve/MUIFACuWuttvtkJY-Vo4EceLGDDTrsadnnIOchj3cRyghep51k02r1MpHmPAeK27cPoUIG4WIu3uaxLNmMLbSRN2RducMtujyygnCp26XOE5MgSrKh65YQwBSyrK78YmbWmGu0716ixdF_gYUGV125y6hV6F3K2rmARka4eqSe6wkThzaYsk2Fa_TuSu3utYgxwIabtg5K_jKRn1zQ==';
  function reg(){ try{ return JSON.parse(localStorage.getItem('sc-reg-emails')||'[]'); }catch(e){ return []; } }
  f.addEventListener('submit', function(e){
    e.preventDefault();
    var em=(input.value||'').trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)){ st.textContent='Please enter a valid email address.'; return; }
    if(reg().indexOf(em)>-1){ st.textContent='This email is already on the list — you are already registered.'; return; }
    st.textContent='Joining…';
    var fd=new FormData(); fd.append('EMAIL', em); fd.append('locale','en'); fd.append('email_address_check','');
    fetch(U, {method:'POST', body:fd, mode:'no-cors'}).then(function(){
      var r=reg(); r.push(em); try{ localStorage.setItem('sc-reg-emails', JSON.stringify(r)); }catch(e){}
      input.value=''; st.textContent='Done — please confirm from the email we have just sent you.';
    }).catch(function(){ st.textContent='Could not join right now — please try again.'; });
  });
})();
