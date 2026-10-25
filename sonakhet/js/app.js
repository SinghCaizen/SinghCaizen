/* ================= SonaKhet (TEMPORARY NAME) — store engine =================
   Naam badalna ho to sirf CONFIG.brand aur HTML titles badalne hain. */
const CONFIG = {
  brand: 'SonaKhet',
  brandA: 'Sona', brandB: 'Khet',
  tagline: 'Seedha hamare kheton se',
  parent: 'A Singh Caizen Product',
  whatsapp: '',              // LILA ka number aate hi yahan डालना है (country code ke saath)
  freeShipAbove: 999,
  shipFee: 49
};

/* Har product: rate = ₹ per kg (launch ke anumaanit daam — LILA confirm karegi).
   pack discount: 2kg par 3%, 5kg par 7% (thok bachat). */
const PRODUCTS = [
 {id:'desi-chana', name:'Desi Kala Chana', hindi:'देसी काला चना', cat:'dal', rate:140, tag:'Sabse zyada bika',
  desc:'Chhota dana, gehara swaad. Bina polish, bina rang — jaisa khet se aaya, waisa packet me.',
  lot:'SONA-CHANA-101', colour:'#7a4a21', harvest:'Nayi fasal'},
 {id:'kabuli-chana', name:'Kabuli Chana', hindi:'काबुली चना', cat:'dal', rate:220, tag:'Premium size',
  desc:'Bada, safed, ek-sa dana. Chole aur salad ke liye shandaar. Haath se chuna hua.',
  lot:'SONA-CHANA-102', colour:'#a9803e', harvest:'Nayi fasal'},
 {id:'bhuna-chana', name:'Bhuna Chana (Chilke wala)', hindi:'भुना चना', cat:'ready', rate:180, tag:'Ready to eat',
  desc:'Bhatti par bhuna hua, halka namkeen. Protein se bhara nashta — namkeen ki pehli seedhi.',
  lot:'SONA-CHANA-103', colour:'#96502a', harvest:'Chhote batch me bhuna'},
 {id:'sattu', name:'Chane ka Sattu', hindi:'चने का सत्तू', cat:'aata', rate:160, tag:'Garmi ka saathi',
  desc:'Bhune chane ko chakki par pees kar banaya. Sharbat, paratha ya litti — pet thanda, taakat poori.',
  lot:'SONA-SATTU-101', colour:'#b3863c', harvest:'Taaza peesa'},
 {id:'besan', name:'Chakki Besan', hindi:'चक्की बेसन', cat:'aata', rate:120, tag:'',
  desc:'Apne hi chane ka besan, dheemi chakki par peesa — pakode naram, swaad ghara jaisa.',
  lot:'SONA-BESAN-101', colour:'#c49a3f', harvest:'Taaza peesa'},
 {id:'arhar-dal', name:'Arhar Dal (Bina Polish)', hindi:'अरहर दाल', cat:'dal', rate:210, tag:'Bina polish',
  desc:'Tel-paani wali chamak nahi — asli daal ka asli rang aur swaad. Jaldi galti hai, patli nahi padti.',
  lot:'SONA-DAL-101', colour:'#c07f24', harvest:'Nayi fasal'},
 {id:'moong-dal', name:'Moong Dal Dhuli', hindi:'मूंग दाल', cat:'dal', rate:190, tag:'',
  desc:'Halki, supachya, roz ki daal. Safai me haath se binni hui, kankad-pathar bilkul nahi.',
  lot:'SONA-DAL-102', colour:'#8a8f33', harvest:'Nayi fasal'},
 {id:'basmati', name:'Purana Basmati Chawal', hindi:'बासमती चावल', cat:'anaaj', rate:165, tag:'Ek saal purana',
  desc:'Ek saal rakha hua basmati — taab aane par lamba khilta hai, khushboo pure ghar me.',
  lot:'SONA-RICE-201', colour:'#5d7247', harvest:'Purani fasal, sambhal kar rakhi'},
 {id:'rozana-chawal', name:'Rozana Chawal', hindi:'रोज़ाना चावल', cat:'anaaj', rate:95, tag:'',
  desc:'Roz ke khane wala mota-madhyam dana. Bina polish, pet bhare, jeb halki.',
  lot:'SONA-RICE-202', colour:'#75855a', harvest:'Nayi fasal'},
 {id:'gehun-atta', name:'Chakki Gehu Atta', hindi:'गेहूं आटा', cat:'aata', rate:68, tag:'Chakki taaza',
  desc:'Apne kheton ka gehu, dheemi chakki par peesa. Roti phuli hui, mehak ke saath.',
  lot:'SONA-ATTA-101', colour:'#a5713a', harvest:'Taaza peesa'},
 {id:'sarso-tel', name:'Kachi Ghani Sarso Tel', hindi:'सरसों तेल', cat:'tel', rate:340, unit:'litre', tag:'Kachi ghani',
  desc:'Lakdi ki ghani par nikala pehla tel. Teekhi mehak, jo khana bana de. 1 litre ki bottle.',
  lot:'SONA-TEL-101', colour:'#8f6a1d', harvest:'Taaza perai'},
 {id:'haldi', name:'Haldi Powder', hindi:'हल्दी पाउडर', cat:'tel', rate:320, tag:'Rang prakritik',
  desc:'Ubaal kar sukhayi gayi haldi, chakki par peesi. Rang gehara, koi milawat nahi.',
  lot:'SONA-MAS-101', colour:'#c08a1e', harvest:'Taaza peesa'},
 {id:'gur', name:'Desi Gur', hindi:'देसी गुड़', cat:'ready', rate:130, tag:'Bina chemical',
  desc:'Ganne ke ras se bana paramparik gur — koi safai-powder nahi. Chai me daalo, fark mehsoos hoga.',
  lot:'SONA-GUR-101', colour:'#8a4f22', harvest:'Season ka bana'}
];
const CATS = [
 {id:'all', name:'Sab Kuchh'},
 {id:'anaaj', name:'Anaaj (Chawal-Gehu)'},
 {id:'dal', name:'Dal aur Chana'},
 {id:'aata', name:'Sattu, Besan, Atta'},
 {id:'tel', name:'Tel aur Masale'},
 {id:'ready', name:'Ready & Meetha'}
];
const PACKS = [0.5, 1, 2, 5];            // kg (tel ke liye litre)
function packOff(kg){ return kg>=5 ? 0.07 : kg>=2 ? 0.03 : 0; }
function packPrice(p, kg){ return Math.round(p.rate * kg * (1 - packOff(kg))); }
function packLabel(kg, unit){ return unit==='litre' ? (kg+' L') : (kg<1 ? (kg*1000)+'g' : kg+' kg'); }
function perLabel(p, kg){ const u = p.unit==='litre'?'L':'kg'; const pr = Math.round(p.rate*(1-packOff(kg))); return '₹'+pr+' / '+u; }
const fmt = n => '₹' + n.toLocaleString('en-IN');
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* ---------- cart (browser me save) ---------- */
const cart = {
  get(){ try{ return JSON.parse(localStorage.getItem('sk_cart')||'[]'); }catch(e){ return []; } },
  set(c){ localStorage.setItem('sk_cart', JSON.stringify(c)); paintCartCount(); },
  add(id, kg, qty){
    const c = this.get(); const line = c.find(l=>l.id===id && l.kg===kg);
    if(line) line.qty += qty; else c.push({id, kg, qty});
    this.set(c);
  },
  count(){ return this.get().reduce((a,l)=>a+l.qty,0); },
  totalKg(){ return this.get().reduce((a,l)=>a+l.kg*l.qty,0); },
  subtotal(){ return this.get().reduce((a,l)=>{ const p=PRODUCTS.find(x=>x.id===l.id); return a + packPrice(p,l.kg)*l.qty; },0); }
};
function paintCartCount(){ $$('.cartcount').forEach(e=>{ const n=cart.count(); e.textContent=n; e.style.display = n? 'grid':'none'; }); }

/* ---------- kilo bachat tiers ---------- */
function tierRate(kg){ return kg>=25 ? 0.12 : kg>=10 ? 0.08 : kg>=5 ? 0.05 : 0; }
function tierMsg(kg){
  const r = tierRate(kg);
  if(kg>=25) return 'Aap 25 kg+ par hain — sabse badi 12% Kilo Bachat lag rahi hai.';
  if(kg>=10) return '10 kg+ par 8% Kilo Bachat lag rahi hai. 25 kg par 12% milegi.';
  if(kg>=5)  return '5 kg+ par 5% Kilo Bachat lag rahi hai. 10 kg par 8% milegi.';
  return 'Kul ' + (5-kg).toFixed(1) + ' kg aur jodein — 5% Kilo Bachat shuru ho jayegi.';
}

/* ---------- account (demo mode — browser me save; Firebase baad me juda jayega) ---------- */
const auth = {
  users(){ try{ return JSON.parse(localStorage.getItem('sk_users')||'[]'); }catch(e){ return []; } },
  me(){ try{ return JSON.parse(localStorage.getItem('sk_me')||'null'); }catch(e){ return null; } },
  signup(name, email, phone, pass){
    const us = this.users();
    if(us.some(u=>u.email===email)) return {err:'Is email se pehle hi account bana hai. Login karein.'};
    us.push({name, email, phone, pass});
    localStorage.setItem('sk_users', JSON.stringify(us));
    localStorage.setItem('sk_me', JSON.stringify({name, email, phone}));
    return {ok:true};
  },
  login(email, pass){
    const u = this.users().find(u=>u.email===email && u.pass===pass);
    if(!u) return {err:'Email ya password galat hai. Dobara koshish karein.'};
    localStorage.setItem('sk_me', JSON.stringify({name:u.name, email:u.email, phone:u.phone}));
    return {ok:true};
  },
  logout(){ localStorage.removeItem('sk_me'); },
  orders(){ try{ return JSON.parse(localStorage.getItem('sk_orders')||'[]'); }catch(e){ return []; } },
  addOrder(o){ const os=this.orders(); os.unshift(o); localStorage.setItem('sk_orders', JSON.stringify(os)); }
};

/* ---------- icons ---------- */
const IC = {
  wheat:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round"><path d="M12 22V8"/><path d="M12 8C12 5 10 3 7 3c0 3 2 5 5 5zM12 8c0-3 2-5 5-5 0 3-2 5-5 5zM12 14c0-3-2-5-5-5 0 3 2 5 5 5zM12 14c0-3 2-5 5-5 0 3-2 5-5 5z"/></svg>',
  cart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:19px;height:19px"><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.2a1.6 1.6 0 0 0 1.6 1.3h7.9a1.6 1.6 0 0 0 1.6-1.3L20.5 7H6"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6.5"/></svg>',
  sun:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  hand:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11.5V6a1.5 1.5 0 0 1 3 0V5a1.5 1.5 0 0 1 3 0v1a1.5 1.5 0 0 1 3 0v5.5c0 4.5-3 8.5-7.5 8.5S4 16.5 3 13.5c-.3-1 .2-2 1.2-2.2.8-.2 1.6.2 2 1z"/></svg>',
  pack:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8l7-4 7 4v8l-7 4-7-4z"/><path d="M5 8l7 4 7-4M12 12v8"/></svg>',
  truck:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6h12v10H2zM14 10h4l3 3v3h-7z"/><circle cx="6.5" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>'
};

/* ---------- header / footer ---------- */
function paintHeader(active){
  const me = auth.me();
  $('#hdr').innerHTML =
  '<div class="strip">Ek kisan parivar ka apna brand · <b>'+CONFIG.parent+'</b></div>'+
  '<header class="site"><div class="wrap hbar">'+
    '<a class="logo" href="index.html"><span class="mark"><svg viewBox="0 0 24 24" fill="none" stroke="#e9c46a" stroke-width="1.7" stroke-linecap="round"><path d="M12 22V8"/><path d="M12 8C12 5 10 3 7 3c0 3 2 5 5 5zM12 8c0-3 2-5 5-5 0 3-2 5-5 5zM12 14c0-3-2-5-5-5 0 3 2 5 5 5zM12 14c0-3 2-5 5-5 0 3-2 5-5 5z"/></svg></span>'+
    '<span class="lt"><b>'+CONFIG.brandA+'<i>'+CONFIG.brandB+'</i></b><span>'+CONFIG.tagline+'</span></span></a>'+
    '<nav class="main" id="mainnav">'+
      '<a href="index.html" data-n="home">Home</a>'+
      '<a href="shop.html" data-n="shop">Saman (Shop)</a>'+
      '<a href="story.html" data-n="story">Hamare Khet</a>'+
      '<a href="cart.html" data-n="cart">Cart</a>'+
    '</nav>'+
    '<div class="hacts">'+
      '<a class="hbtn" href="cart.html">'+IC.cart+'<span class="lbl">Cart</span><span class="cnt cartcount" style="display:none">0</span></a>'+
      (me ? '<a class="hbtn" href="account.html"><span class="lbl">Namaste, '+me.name.split(' ')[0]+'</span></a>'
          : '<a class="hbtn" href="login.html"><span class="lbl">Login</span></a>')+
    '</div>'+
    '<button class="burger" id="burger" aria-label="Menu"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>'+
  '</div></header>';
  const b = $('#burger'); if(b) b.onclick = ()=> $('#mainnav').classList.toggle('open');
  $$('#mainnav a').forEach(a=>{ if(a.dataset.n===active) a.classList.add('on'); });
  paintCartCount();
}
function paintFooter(){
  $('#ftr').innerHTML =
  '<footer class="site"><div class="wrap"><div class="fgrid">'+
    '<div><h4>'+CONFIG.brandA+CONFIG.brandB+'</h4><p>Hum kisan hain. Jo ugate hain, wahi pack karke seedha aapke ghar bhejte hain — beech me koi nahi. Isi saal ki fasal, bina polish, bina milawat.</p><p style="margin-top:10px;color:#e9c46a;font-weight:700">'+CONFIG.parent+'</p></div>'+
    '<div><h4>Saman</h4><ul>'+CATS.slice(1).map(c=>'<li><a href="shop.html?cat='+c.id+'">'+c.name+'</a></li>').join('')+'</ul></div>'+
    '<div><h4>Madad</h4><ul><li><a href="story.html">Hamare Khet</a></li><li><a href="account.html">Mere Orders</a></li><li><a href="cart.html">Cart</a></li><li><a href="login.html">Login / Sign Up</a></li></ul></div>'+
    '<div><h4>Sampark</h4><p>Email: info@singhcaizen.com<br>Order aur sawalo ke liye Cart se order karein — hum khud jawab denge.<br><br>Har packet par lot number hota hai — apna lot <a href="story.html#trace" style="color:#e9c46a;font-weight:700">yahan jaanchein</a>.</p></div>'+
  '</div><div class="fbot"><span>© 2026 '+CONFIG.brandA+CONFIG.brandB+' · '+CONFIG.parent+'</span><span>Khet se ghar tak — beech me koi nahi</span></div></div></footer>';
}
function toast(msg){
  let t = $('#toast');
  if(!t){ t = document.createElement('div'); t.id='toast'; document.body.appendChild(t); }
  t.innerHTML = IC.check.replace('currentColor','#e9c46a') + msg;
  t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(()=>t.classList.remove('show'), 2300);
}

/* ---------- product card ---------- */
function cardHTML(p){
  const first = p.unit==='litre' ? 1 : 1;
  return '<article class="pcard" data-id="'+p.id+'">'+
   '<a class="pack" href="product.html?id='+p.id+'" style="background:linear-gradient(150deg,'+p.colour+'26,'+p.colour+'0d)">'+
     (p.tag?'<span class="tag">'+p.tag+'</span>':'')+
     '<span class="pouch" style="background:linear-gradient(160deg,'+p.colour+','+p.colour+'dd)">'+
       '<span class="pb">'+CONFIG.brandA+CONFIG.brandB+'</span><span class="pn">'+p.name+'</span>'+
       '<span class="pw">'+packLabel(first,p.unit)+'</span></span>'+
     '<span class="lot">Lot '+p.lot+'</span></a>'+
   '<div class="pbody"><h3><a href="product.html?id='+p.id+'">'+p.name+'</a></h3><div class="hindi">'+p.hindi+'</div>'+
   '<p class="desc">'+p.desc+'</p>'+
   '<div class="pricerow"><span class="pr">'+fmt(packPrice(p,first))+'</span><span class="per">'+perLabel(p,first)+'</span><span class="off"></span></div>'+
   '<div class="packsel">'+PACKS.map(k=>'<button type="button" data-kg="'+k+'" class="'+(k===first?'on':'')+'">'+packLabel(k,p.unit)+'</button>').join('')+'</div>'+
   '<div class="qtyrow"><div class="qty"><button type="button" class="qm">−</button><input value="1" inputmode="numeric" aria-label="Packet sankhya"><button type="button" class="qp">+</button></div>'+
   '<button type="button" class="addbtn">Cart me Dalein</button></div>'+
   '<div class="kgtot"></div>'+
   '</div></article>';
}
function wireCard(card){
  const p = PRODUCTS.find(x=>x.id===card.dataset.id);
  let kg = p.unit==='litre' ? 1 : 1, qty = 1;
  const pr = card.querySelector('.pr'), per = card.querySelector('.per'), off = card.querySelector('.off'),
        inp = card.querySelector('.qty input'), tot = card.querySelector('.kgtot'),
        pw = card.querySelector('.pw');
  function paint(){
    pr.textContent = fmt(packPrice(p,kg)*qty);
    per.textContent = perLabel(p,kg);
    off.textContent = packOff(kg) ? Math.round(packOff(kg)*100)+'% pack bachat' : '';
    inp.value = qty; pw.textContent = packLabel(kg,p.unit);
    tot.textContent = 'Kul: ' + (kg*qty) + (p.unit==='litre'?' litre':' kg') + ' · ' + qty + ' packet';
  }
  card.querySelectorAll('.packsel button').forEach(b=> b.onclick = ()=>{
    card.querySelectorAll('.packsel button').forEach(x=>x.classList.remove('on'));
    b.classList.add('on'); kg = parseFloat(b.dataset.kg); paint();
  });
  card.querySelector('.qm').onclick = ()=>{ qty = Math.max(1, qty-1); paint(); };
  card.querySelector('.qp').onclick = ()=>{ qty = Math.min(50, qty+1); paint(); };
  inp.onchange = ()=>{ qty = Math.min(50, Math.max(1, parseInt(inp.value)||1)); paint(); };
  card.querySelector('.addbtn').onclick = ()=>{ cart.add(p.id, kg, qty); toast(p.name+' — '+qty+' packet cart me jod diya'); };
  paint();
}

/* ================= PAGES ================= */
function initHome(){
  const feat = $('#featgrid');
  if(feat){ feat.innerHTML = PRODUCTS.slice(0,8).map(cardHTML).join(''); $$('#featgrid .pcard').forEach(wireCard); }
  const slider = $('#kgslider');
  if(slider){
    const kv = $('#kgval'), out = $('#kgout'), sel = $('#kgprod');
    sel.innerHTML = PRODUCTS.filter(p=>p.unit!=='litre').map(p=>'<option value="'+p.id+'">'+p.name+'</option>').join('');
    function calc(){
      const kg = parseFloat(slider.value); const p = PRODUCTS.find(x=>x.id===sel.value);
      kv.textContent = kg + ' kg';
      let rest = kg, plan = [];
      [5,2,1,0.5].forEach(s=>{ const n = Math.floor(rest/s); if(n>0){ plan.push(n+' × '+packLabel(s)); rest = Math.round((rest - n*s)*10)/10; } });
      const base = p.rate * kg;
      const pk = Math.ceil(kg/5)*packPrice(p,5) > 0 ? null : null;
      let cost = 0, r2 = kg; [5,2,1,0.5].forEach(s=>{ const n=Math.floor(r2/s); cost += n*packPrice(p,s); r2=Math.round((r2-n*s)*10)/10; });
      const tr = tierRate(kg); const disc = Math.round(cost*tr); const final = cost - disc;
      out.innerHTML = '<b>'+p.name+'</b> ke liye behtareen jod: <b>'+plan.join(' + ')+'</b><br>'+
        'Daam lagbhag <b>'+fmt(final)+'</b> '+(disc? '<span class="save">(Kilo Bachat me '+fmt(disc)+' bache)</span>' : '(5 kg+ par Kilo Bachat shuru)')+
        '<br><a href="product.html?id='+p.id+'" style="font-weight:800">Isi product par jaakar order karein →</a>';
    }
    slider.oninput = calc; sel.onchange = calc; calc();
  }
}

function initShop(){
  const grid = $('#shopgrid'), catsEl = $('#cats'), q = $('#q');
  const params = new URLSearchParams(location.search);
  let cat = params.get('cat') || 'all';
  function paintCats(){
    catsEl.innerHTML = CATS.map(c=>'<button class="cat'+(c.id===cat?' on':'')+'" data-c="'+c.id+'">'+c.name+'</button>').join('');
    $$('#cats .cat').forEach(b=> b.onclick = ()=>{ cat = b.dataset.c; paintCats(); paintGrid(); });
  }
  function paintGrid(){
    const term = (q.value||'').toLowerCase();
    const list = PRODUCTS.filter(p => (cat==='all'||p.cat===cat) && (p.name.toLowerCase().includes(term)||p.hindi.includes(term)));
    grid.innerHTML = list.length ? list.map(cardHTML).join('') : '<div class="empty" style="grid-column:1/-1"><div class="big">Kuchh nahi mila</div>Doosra shabd ya category try karein.</div>';
    $$('#shopgrid .pcard').forEach(wireCard);
  }
  q.oninput = paintGrid; paintCats(); paintGrid();
}

function initProduct(){
  const id = new URLSearchParams(location.search).get('id');
  const p = PRODUCTS.find(x=>x.id===id) || PRODUCTS[0];
  document.title = p.name + ' — ' + CONFIG.brandA+CONFIG.brandB;
  let kg = 1, qty = 1;
  $('#pwrap').innerHTML =
   '<div class="pack" style="background:linear-gradient(150deg,'+p.colour+'30,'+p.colour+'0d)">'+(p.tag?'<span class="tag">'+p.tag+'</span>':'')+
     '<span class="pouch" style="background:linear-gradient(160deg,'+p.colour+','+p.colour+'dd)"><span class="pb">'+CONFIG.brandA+CONFIG.brandB+'</span><span class="pn">'+p.name+'</span><span class="pw" id="dpw">'+packLabel(kg,p.unit)+'</span></span>'+
     '<span class="lot">Lot '+p.lot+'</span></div>'+
   '<div><h1>'+p.name+'</h1><div class="hindi">'+p.hindi+' · '+CONFIG.parent+'</div><p class="dsc">'+p.desc+'</p>'+
   '<div class="pricerow"><span class="pr" id="dpr" style="font-size:30px"></span><span class="per" id="dper"></span><span class="off" id="doff"></span></div>'+
   '<fieldset class="pk"><legend>Packet ka size chunein</legend><div class="packsel" id="dpk">'+PACKS.map(k=>'<button type="button" data-kg="'+k+'" class="'+(k===kg?'on':'')+'">'+packLabel(k,p.unit)+'</button>').join('')+'</div></fieldset>'+
   '<div class="bignum"><div class="qty"><button type="button" id="dqm">−</button><input id="dqty" value="1" inputmode="numeric" aria-label="Packet sankhya"><button type="button" id="dqp">+</button></div>'+
   '<span class="bp" id="dtot"></span><span class="bs" id="dkg"></span></div>'+
   '<div style="display:flex;gap:11px;flex-wrap:wrap"><button class="btn green big" id="dadd">Cart me Dalein</button><button class="btn line big" id="dbuy">Abhi Order Karein</button></div>'+
   '<div class="meta"><div><b>Fasal</b>'+p.harvest+'</div><div><b>Lot Number</b>'+p.lot+'</div><div><b>Polish / Rang</b>Bilkul nahi</div><div><b>Packing</b>Hamare ghar parivar dwara</div></div>'+
   '<p style="color:var(--mut);font-size:14.5px">Paket par yahi lot number chhapa milega. Website par lot daalkar aap jaan sakte hain ye fasal kis khet ki hai — <a href="story.html#trace">lot jaanchein</a>.</p></div>';
  function paint(){
    $('#dpr').textContent = fmt(packPrice(p,kg)*qty);
    $('#dper').textContent = perLabel(p,kg);
    $('#doff').textContent = packOff(kg) ? Math.round(packOff(kg)*100)+'% pack bachat' : '';
    $('#dtot').textContent = fmt(packPrice(p,kg)*qty);
    $('#dkg').textContent = 'Kul ' + (kg*qty) + (p.unit==='litre'?' litre':' kg');
    $('#dpw').textContent = packLabel(kg,p.unit);
    $('#dqty').value = qty;
  }
  $$('#dpk button').forEach(b=> b.onclick = ()=>{ $$('#dpk button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); kg = parseFloat(b.dataset.kg); paint(); });
  $('#dqm').onclick = ()=>{ qty = Math.max(1,qty-1); paint(); };
  $('#dqp').onclick = ()=>{ qty = Math.min(50,qty+1); paint(); };
  $('#dqty').onchange = e=>{ qty = Math.min(50, Math.max(1, parseInt(e.target.value)||1)); paint(); };
  $('#dadd').onclick = ()=>{ cart.add(p.id, kg, qty); toast('Cart me jod diya — '+p.name); };
  $('#dbuy').onclick = ()=>{ cart.add(p.id, kg, qty); location.href = 'cart.html'; };
  paint();
  const rel = $('#relgrid');
  if(rel){ rel.innerHTML = PRODUCTS.filter(x=>x.cat===p.cat && x.id!==p.id).concat(PRODUCTS.filter(x=>x.cat!==p.cat)).slice(0,4).map(cardHTML).join(''); $$('#relgrid .pcard').forEach(wireCard); }
}

function totals(){
  const sub = cart.subtotal(), kg = cart.totalKg();
  const tr = tierRate(kg), disc = Math.round(sub*tr);
  const ship = sub===0 ? 0 : (sub-disc >= CONFIG.freeShipAbove ? 0 : CONFIG.shipFee);
  return {sub, kg, tr, disc, ship, total: sub - disc + ship};
}
function initCart(){
  const listEl = $('#cartlist'), sumEl = $('#cartsum');
  function paint(){
    const c = cart.get();
    if(!c.length){
      listEl.innerHTML = '<div class="empty"><div class="big">Cart khaali hai</div>Khet ka taaza saaman aapka intezaar kar raha hai.<br><br><a class="btn green" href="shop.html">Saman Dekhein</a></div>';
      sumEl.innerHTML = ''; return;
    }
    listEl.innerHTML = c.map((l,i)=>{
      const p = PRODUCTS.find(x=>x.id===l.id);
      return '<div class="citem"><div class="thumb" style="background:'+p.colour+'">'+p.name+'</div>'+
      '<div><h4>'+p.name+'</h4><div class="sm">'+packLabel(l.kg,p.unit)+' wala packet · '+fmt(packPrice(p,l.kg))+' prati packet</div>'+
      '<div class="qty" style="margin-top:8px;display:inline-flex"><button data-a="-" data-i="'+i+'">−</button><input value="'+l.qty+'" data-i="'+i+'"><button data-a="+" data-i="'+i+'">+</button></div> '+
      '<button class="rm" data-rm="'+i+'">Hatao</button></div>'+
      '<div class="lt"><div class="lp">'+fmt(packPrice(p,l.kg)*l.qty)+'</div><div class="sm">Kul '+(l.kg*l.qty)+(p.unit==='litre'?' L':' kg')+'</div></div></div>';
    }).join('');
    $$('#cartlist [data-a]').forEach(b=> b.onclick = ()=>{
      const c2 = cart.get(); const l = c2[+b.dataset.i];
      l.qty += (b.dataset.a==='+'?1:-1); if(l.qty<1) c2.splice(+b.dataset.i,1);
      cart.set(c2); paint();
    });
    $$('#cartlist [data-rm]').forEach(b=> b.onclick = ()=>{ const c2 = cart.get(); c2.splice(+b.dataset.rm,1); cart.set(c2); paint(); });
    const t = totals();
    sumEl.innerHTML = '<h3>Order ka Hisab</h3>'+
      '<div class="srow"><span>Daam (kul '+t.kg+' kg)</span><b>'+fmt(t.sub)+'</b></div>'+
      (t.disc? '<div class="srow"><span>Kilo Bachat ('+Math.round(t.tr*100)+'%)</span><b style="color:var(--terra)">− '+fmt(t.disc)+'</b></div>' : '')+
      '<div class="srow"><span>Delivery</span><b>'+(t.ship===0? 'MUFT' : fmt(t.ship))+'</b></div>'+
      '<div class="tiernote">'+tierMsg(t.kg)+'<br>'+(t.ship? CONFIG.freeShipAbove + '₹+ ke order par delivery muft hai.' : 'Aapke order par delivery muft hai.')+'</div>'+
      '<div class="srow tot"><span>Kul Dena Hai</span><b>'+fmt(t.total)+'</b></div>'+
      '<p style="font-size:13px;color:var(--mut);margin-top:8px">Payment: Cash on Delivery ya delivery par UPI.</p>';
  }
  paint();
  const form = $('#coform');
  if(form) form.onsubmit = e=>{
    e.preventDefault();
    const c = cart.get(); if(!c.length){ toast('Cart khaali hai'); return; }
    const f = new FormData(form);
    const t = totals();
    const oid = 'SK' + Date.now().toString(36).toUpperCase();
    const order = { id: oid, date: new Date().toLocaleString('en-IN'),
      name: f.get('name'), phone: f.get('phone'), address: f.get('address'), pin: f.get('pin'),
      items: c.map(l=>{ const p = PRODUCTS.find(x=>x.id===l.id); return {name:p.name, pack:packLabel(l.kg,p.unit), qty:l.qty, price:packPrice(p,l.kg)*l.qty, lot:p.lot}; }),
      total: t.total, kg: t.kg, status: 'Order mil gaya' };
    auth.addOrder(order);
    const lines = order.items.map(it=>'• '+it.name+' ('+it.pack+') × '+it.qty+' = ₹'+it.price).join('\n');
    const waText = encodeURIComponent('Namaste, mera order ('+oid+'):\n'+lines+'\nKul: ₹'+t.total+'\nNaam: '+order.name+'\nPhone: '+order.phone+'\nPata: '+order.address+' — '+order.pin);
    cart.set([]);
    $('#cartarea').innerHTML = '<div class="empty"><div class="big">Dhanyavaad! Order mil gaya.</div>'+
      'Order number: <b>'+oid+'</b><br>Hum jald hi phone par pushti karenge. Payment delivery ke samay (Cash / UPI).<br><br>'+
      (CONFIG.whatsapp ? '<a class="btn green" target="_blank" href="https://wa.me/'+CONFIG.whatsapp+'?text='+waText+'">Order WhatsApp par Bhejein</a> ' : '')+
      '<a class="btn line" href="account.html">Mere Orders Dekhein</a></div>';
    window.scrollTo({top:0, behavior:'smooth'});
  };
}

function initAuth(){
  const tL = $('#tab-login'), tS = $('#tab-signup'), fL = $('#flogin'), fS = $('#fsignup'), msg = $('#amsg');
  function tab(which){
    tL.classList.toggle('on', which==='l'); tS.classList.toggle('on', which==='s');
    fL.style.display = which==='l' ? 'block':'none'; fS.style.display = which==='s' ? 'block':'none';
    msg.className = 'msg'; msg.textContent = '';
  }
  tL.onclick = ()=>tab('l'); tS.onclick = ()=>tab('s');
  if(new URLSearchParams(location.search).get('mode')==='signup') tab('s');
  fS.onsubmit = e=>{
    e.preventDefault(); const f = new FormData(fS);
    const r = auth.signup(f.get('name').trim(), f.get('email').trim().toLowerCase(), f.get('phone').trim(), f.get('pass'));
    if(r.err){ msg.className='msg err'; msg.textContent = r.err; return; }
    location.href = 'account.html';
  };
  fL.onsubmit = e=>{
    e.preventDefault(); const f = new FormData(fL);
    const r = auth.login(f.get('email').trim().toLowerCase(), f.get('pass'));
    if(r.err){ msg.className='msg err'; msg.textContent = r.err; return; }
    location.href = 'account.html';
  };
}

function initAccount(){
  const me = auth.me(); const el = $('#acct');
  if(!me){ el.innerHTML = '<div class="empty"><div class="big">Pehle login karein</div>Apne orders dekhne ke liye login ya sign up karein.<br><br><a class="btn green" href="login.html">Login / Sign Up</a></div>'; return; }
  const os = auth.orders();
  el.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px"><div><h2 style="font-size:28px">Namaste, '+me.name+'</h2><p style="color:var(--mut)">'+me.email+' · '+me.phone+'</p></div><button class="btn line" id="logout">Logout</button></div>'+
   '<h3 style="font-size:21px;margin-bottom:13px">Mere Orders</h3>'+
   (os.length ? os.map(o=>'<div class="order"><div class="oh"><b>Order '+o.id+'</b><span class="pill grn">'+o.status+'</span></div>'+
     '<div style="font-size:14px;color:var(--mut)">'+o.date+' · Kul '+o.kg+' kg · <b style="color:var(--green)">'+fmt(o.total)+'</b> (COD/UPI)</div>'+
     '<div style="font-size:14.5px;margin-top:6px">'+o.items.map(it=>it.name+' ('+it.pack+') × '+it.qty+' — '+fmt(it.price)+' · <span style="color:var(--soil)">Lot '+it.lot+'</span>').join('<br>')+'</div></div>').join('')
     : '<div class="empty"><div class="big">Abhi koi order nahi</div>Pehla order karke dekhein — khet se seedha ghar.<br><br><a class="btn green" href="shop.html">Saman Dekhein</a></div>');
  $('#logout').onclick = ()=>{ auth.logout(); location.href = 'index.html'; };
}

function initStory(){
  const btn = $('#tracebtn');
  if(btn) btn.onclick = ()=>{
    const v = $('#lotin').value.trim().toUpperCase(); const res = $('#traceres');
    const p = PRODUCTS.find(x=>x.lot===v);
    res.classList.add('show');
    if(p) res.innerHTML = '<b style="color:var(--green)">Lot mila!</b><br>Packet: <b>'+p.name+'</b><br>Fasal: '+p.harvest+'<br>Khet: Hamare parivar ka khet · Safai aur packing: ghar parivar dwara<br>Stithi: Asli '+CONFIG.brandA+CONFIG.brandB+' packet — '+CONFIG.parent;
    else res.innerHTML = 'Ye lot number hamare record me nahi mila. Packet par chhapa number dobara jaanchein — sahi lot hamesha <b>SONA-</b> se shuru hota hai.';
  };
}

document.addEventListener('DOMContentLoaded', ()=>{
  const page = document.body.dataset.page;
  paintHeader(page);
  paintFooter();
  ({home:initHome, shop:initShop, product:initProduct, cart:initCart, auth:initAuth, account:initAccount, story:initStory}[page] || (()=>{}))();
});
