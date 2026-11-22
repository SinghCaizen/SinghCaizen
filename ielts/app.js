/* =====================================================================
   IELTS STUDY — app.js (v4)
   Saara media website ke ANDAR chalta hai:
   - Google Drive files -> /preview iframe (browser-tested, kaam karta hai)
   - Rumble -> embed iframe
   - Local /media files -> custom players + PDF.js
   Progress localStorage me + (Firebase config ho to) cloud sync.
   ===================================================================== */
'use strict';

/* ---------------- Utilities ---------------- */
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const LS_KEY = 'ieltsStudySite.v1';

function todayStr(d) {
  d = d || new Date();
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function parseDate(s) { const [y, m, dd] = s.split('-').map(Number); return new Date(y, m - 1, dd); }
function addDays(s, n) { const d = parseDate(s); d.setDate(d.getDate() + n); return todayStr(d); }
function fmtDate(s) {
  return parseDate(s).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const p = n => String(n).padStart(2, '0');
  return h > 0 ? h + ':' + p(m) + ':' + p(s) : m + ':' + p(s);
}
function esc(t) {
  return String(t == null ? '' : t).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._h); toast._h = setTimeout(() => { t.hidden = true; }, 2600);
}
function celebrate() {
  const box = $('#confetti'); box.innerHTML = ''; box.hidden = false;
  const colors = ['#b3543f', '#c9902e', '#3d9970', '#2f6fb2', '#d97b5f'];
  for (let i = 0; i < 26; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = (Math.random() * 0.35) + 's';
    box.appendChild(p);
  }
  setTimeout(() => { box.hidden = true; box.innerHTML = ''; }, 2200);
}

/* ---------------- Drive link helper ----------------
   Koi bhi Drive link format chalega:
   /file/d/ID/view, open?id=ID, uc?id=ID, download?id=ID, ya sirf ID.
   Sab ko https://drive.google.com/file/d/ID/preview me badla jata hai —
   yahi ek format hai jo browser ke andar sach me chalta hai (Phase 0 test). */
function driveId(url) {
  if (!url) return null;
  const s = String(url).trim();
  if (/^[A-Za-z0-9_-]{25,}$/.test(s)) return s;
  let m = s.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  m = s.match(/[?&]id=([A-Za-z0-9_-]{20,})/);
  return m ? m[1] : null;
}
function isDrive(url) { return !!driveId(url); }
function drivePreview(url) {
  const id = driveId(url);
  return id ? 'https://drive.google.com/file/d/' + id + '/preview' : url;
}
function isLocalPath(url) { return !!url && !/^https?:\/\//.test(url); }
function isRumble(item) {
  return item.type === 'rumble' || /rumble\.com\/embed/.test(item.url || '');
}

/* Debug registry: har file ka converted URL + load status (?debug=1) */
const DEBUG_LOADS = {};
function debugRegister(kind, title, url, converted) {
  DEBUG_LOADS[converted] = { kind, title, url, converted, status: 'pending' };
}
function debugSet(converted, status) {
  if (DEBUG_LOADS[converted]) { DEBUG_LOADS[converted].status = status; renderDebugPanel(); }
}

/* ---------------- State (localStorage) ---------------- */
function defaultState() {
  return {
    progress: {}, completedOn: {}, notes: {}, bookmarks: {}, positions: {},
    pdfPage: {}, favorites: [], theme: null, font: 'm', focus: false,
    custom: [], edits: {}, deleted: [],
    plan: null, dayDone: {}, focusByDate: {},
    lastBackup: 0, reminder: '07:00', notifiedOn: null,
    hideDownload: true, lastOpen: null, recent: {},
    planView: 'month', backupBannerOff: 0, localModeAck: false
  };
}
let S = defaultState();
try {
  const raw = localStorage.getItem(LS_KEY);
  if (raw) S = Object.assign(defaultState(), JSON.parse(raw));
} catch (e) { /* fresh start */ }
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {}
    if (window.CloudSync && window.CloudSync.enabled) window.CloudSync.save(S);
  }, 200);
}
/* auth.js cloud se state laaye to yaha apply hota hai */
window.applyCloudState = function (cloudState) {
  if (!cloudState || typeof cloudState !== 'object') return;
  S = Object.assign(defaultState(), cloudState);
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {}
  applyTheme(); applyFont();
  renderSidebar();
  showView(currentView || 'home');
  toast('Cloud progress load ho gaya ☁️✓');
};
window.getLocalState = function () { return S; };
window.setSavedStatus = function (text, isCloud) {
  const el = $('#savedDot');
  if (el) { el.textContent = text; el.classList.toggle('cloud', !!isCloud); }
};

/* ---------------- Chapters data ---------------- */
function allChapters() {
  const base = (window.IELTS_CHAPTERS || [])
    .filter(c => !S.deleted.includes(c.id))
    .map(c => S.edits[c.id] || c);
  return base.concat(S.custom);
}
function chapterById(id) { return allChapters().find(c => c.id === id) || null; }
function chapterIndex(id) { return allChapters().findIndex(c => c.id === id); }
function chapterNum(id) { const i = chapterIndex(id); return i >= 0 ? i + 1 : '?'; }
function statusOf(id) { return S.progress[id] || 'new'; }

/* ---------------- Navigation ---------------- */
let currentView = 'home';
let currentChapterId = null;
let currentTab = 'video';
const VIEWS = ['home', 'chapters', 'chapter', 'plan', 'notes', 'stats', 'profile'];

function showView(name) {
  currentView = name;
  VIEWS.forEach(v => { $('#view-' + v).hidden = v !== name; });
  $$('.nav-item').forEach(b => b.classList.toggle('is-active', b.dataset.nav === name));
  $$('.tab-item').forEach(b => b.classList.toggle('is-active', b.dataset.nav === name));
  closeSidebarMobile();
  if (name === 'home') renderHome();
  if (name === 'chapters') renderChapters();
  if (name === 'plan') renderPlan();
  if (name === 'notes') renderNotesView();
  if (name === 'stats') renderStats();
  if (name === 'profile') renderProfile();
  const main = $('#main');
  main.style.animation = 'none'; void main.offsetWidth; main.style.animation = '';
  window.scrollTo({ top: 0 });
}
$$('.nav-item').forEach(b => b.addEventListener('click', () => showView(b.dataset.nav)));
$$('.tab-item').forEach(b => b.addEventListener('click', () => showView(b.dataset.nav)));
$('#btnProfileTop').addEventListener('click', () => showView('profile'));
function closeSidebarMobile() {
  $('#sidebar').classList.remove('open');
  $('#sidebarScrim').hidden = true;
}
$('#btnSidebar').addEventListener('click', () => {
  $('#sidebar').classList.add('open');
  $('#sidebarScrim').hidden = false;
});
$('#sidebarScrim').addEventListener('click', closeSidebarMobile);
$('#btnCollapse').addEventListener('click', () => document.body.classList.toggle('sidebar-collapsed'));

/* ---------------- Sidebar + progress ---------------- */
function doneCount() { return allChapters().filter(c => S.progress[c.id] === 'done').length; }
function renderSidebar() {
  const list = $('#sideChapterList');
  list.innerHTML = '';
  allChapters().forEach((c, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    if (c.id === currentChapterId && currentView === 'chapter') b.className = 'is-active';
    const st = statusOf(c.id);
    b.innerHTML = '<span class="num">' + (i + 1) + '</span><span>' + esc(c.title) + '</span>' +
      '<span class="st">' + (st === 'done' ? '✅' : st === 'progress' ? '▶️' : '') + '</span>';
    b.addEventListener('click', () => openChapter(c.id));
    li.appendChild(b); list.appendChild(li);
  });
  const total = allChapters().length, done = doneCount();
  const pct = total ? Math.round(done / total * 100) : 0;
  $('#sideProgressText').textContent = done + ' of ' + total + ' chapters done';
  $('#sideProgressBar').style.width = pct + '%';
  $('#chaptersProgressText').textContent = done + ' of ' + total + ' chapters done';
  $('#chaptersProgressBar').style.width = pct + '%';
}

/* ---------------- HOME (dashboard) ---------------- */
const MOTIVES = [
  'Chhota kadam roz, bada result saal ke ant me. 🌱',
  'Band 8 sapna nahi, roz ka system hai. Aaj ka chapter khatm karo. 💪',
  'Consistency hi asli talent hai. Bas aaj ka kaam. 🎯',
  'Kal ki chinta chhodo, aaj ka page kholo. 📖',
  'Har din 2 ghante — yehi tumhari superpower hai. ⏰',
  'Galtiyaan error log me, seekh dimaag me. ✍️',
  'Slow progress bhi progress hai. Rukna mana hai. 🚶'
];
function mediaButtonsHTML(c) {
  let h = '';
  if ((c.videos || []).length) h += '<button class="btn btn-small" data-open-media="video">🎬 Video</button>';
  if ((c.audios || []).length) h += '<button class="btn btn-small" data-open-media="audio">🎧 Audio</button>';
  if ((c.pdfs || []).length) h += '<button class="btn btn-small" data-open-media="pdf">📄 PDF</button>';
  h += '<button class="btn btn-small" data-open-media="notes">📝 Notes</button>';
  return h;
}
function wireMediaButtons(root, chapterId) {
  $$('[data-open-media]', root).forEach(b => b.addEventListener('click', () => {
    openChapter(chapterId, b.dataset.openMedia);
  }));
}
function renderHome() {
  renderSidebar();
  const t = todayStr();
  $('#dashDate').textContent = fmtDate(t);
  $('#dashMotiv').textContent = MOTIVES[parseDate(t).getDate() % MOTIVES.length];
  const total = allChapters().length, done = doneCount();
  const pct = total ? done / total : 0;
  $('#dashRing').style.strokeDashoffset = String(213.6 * (1 - pct));
  $('#dashRingText').textContent = Math.round(pct * 100) + '%';
  $('#dashProgressText').textContent = done + ' of ' + total + ' chapters done';
  const st = computeStreak();
  $('#dashStreak').textContent = st.streak + ' days';
  $('#dashBest').textContent = st.best + ' days';
  // Today's plan card
  const box = $('#dashToday'); box.innerHTML = '';
  const e = dayEntry(t);
  const todays = e ? e.chapters : [];
  if (!S.plan) {
    box.innerHTML = '<p class="muted">Abhi plan bana nahi hai.</p><button class="btn btn-primary" id="dashMakePlan">Plan banao</button>';
    const b = $('#dashMakePlan'); if (b) b.addEventListener('click', () => showView('profile'));
  } else if (e && e.off) {
    box.innerHTML = '<p>🌿 Aaj off day hai. Aaram karo, ya revision kar lo.</p>';
  } else if (!todays.length) {
    box.innerHTML = '<p class="muted">' + (e && e.revision ? '🔁 Aaj revision day hai — is hafte ke chapters dohrao.' : 'Aaj ke liye koi chapter set nahi hai. Kal se plan shuru hota hai.') + '</p>';
  }
  if (e && e.revision && todays.length) {
    const p = document.createElement('p'); p.className = 'muted'; p.textContent = '🔁 Aaj revision day hai — ye chapters dohrao:';
    box.appendChild(p);
  }
  const wrap = document.createElement('div'); wrap.className = 'today-chapters';
  todays.forEach(id => {
    const c = chapterById(id); if (!c) return;
    const row = document.createElement('div');
    row.className = 'today-chapter';
    row.innerHTML = '<strong>' + (statusOf(id) === 'done' ? '✅ ' : '') + 'Chapter ' + chapterNum(id) + ': ' + esc(c.title) + '</strong>' + mediaButtonsHTML(c);
    wireMediaButtons(row, id);
    wrap.appendChild(row);
  });
  box.appendChild(wrap);
  const doneToday = todays.filter(id => statusOf(id) === 'done').length;
  $('#dashGoalText').textContent = todays.length
    ? 'Daily goal: ' + doneToday + ' / ' + todays.length + ' chapters (aaj)'
    : 'Daily goal: aaj koi chapter nahi';
  $('#btnDashMarkDone').style.display = todays.length ? '' : 'none';
  // Tomorrow
  const tm = addDays(t, 1), te = dayEntry(tm);
  const tp = $('#dashTomorrow');
  if (te && te.chapters.length) {
    tp.innerHTML = te.chapters.map(id => {
      const c = chapterById(id);
      return c ? '<p>Chapter ' + chapterNum(id) + ': <strong>' + esc(c.title) + '</strong>' + (te.revision ? ' (revision)' : '') + '</p>' : '';
    }).join('');
  } else tp.innerHTML = '<p class="muted">' + (te && te.off ? '🌿 Kal off day hai.' : 'Kal ke liye kuch set nahi hai.') + '</p>';
  // Continue
  const cb = $('#dashContinue');
  if (S.lastOpen && chapterById(S.lastOpen.chId)) {
    const c = chapterById(S.lastOpen.chId);
    cb.innerHTML = '<div class="continue-item"><span>Chapter ' + chapterNum(c.id) + ': <strong>' + esc(c.title) + '</strong></span>' +
      '<button class="btn btn-small btn-primary" id="btnContinue">▶ Continue</button></div>';
    $('#btnContinue').addEventListener('click', () => openChapter(c.id, S.lastOpen.tab));
  } else cb.innerHTML = '<p class="muted">Jaha chhoda tha, wahi se shuru hoga. Koi chapter kholo.</p>';
  // Recently opened
  const rg = $('#recentGrid'); rg.innerHTML = '';
  const recent = Object.entries(S.recent).sort((a, b) => b[1] - a[1]).slice(0, 4);
  if (!recent.length) rg.innerHTML = '<p class="muted">Abhi kuch khola nahi gaya.</p>';
  recent.forEach(([id]) => {
    const c = chapterById(id); if (!c) return;
    const b = document.createElement('button');
    b.className = 'recent-item';
    b.innerHTML = '<span>Ch ' + chapterNum(id) + '</span><strong>' + esc(c.title) + '</strong>' +
      '<span class="st">' + (statusOf(id) === 'done' ? '✅' : '') + '</span>';
    b.addEventListener('click', () => openChapter(id));
    rg.appendChild(b);
  });
  // Banner
  const banner = $('#todayBanner');
  if (todays.length && !isDayDone(t)) {
    $('#todayBannerText').textContent = todays.map(id => { const c = chapterById(id); return c ? c.title : ''; }).filter(Boolean).join(', ');
    banner.hidden = false;
  } else banner.hidden = true;
}
$('#btnDashMarkDone').addEventListener('click', markTodayDone);
function markTodayDone() {
  const t = todayStr();
  const e = dayEntry(t);
  if (e) e.chapters.forEach(id => {
    if (statusOf(id) !== 'done') { S.progress[id] = 'done'; S.completedOn[id] = t; }
  });
  S.dayDone[t] = true; save();
  celebrate(); toast('Aaj ka plan complete! 🎉');
  renderHome(); renderSidebar();
}
$('#todayBannerBtn').addEventListener('click', () => {
  const e = dayEntry(todayStr());
  if (e && e.chapters.length) openChapter(e.chapters[0]);
});
$('#todayBannerClose').addEventListener('click', () => { $('#todayBanner').hidden = true; });

/* ---------------- CHAPTERS (grid, search, filters) ---------------- */
let homeFilter = 'all';
function fuzzyScore(text, q) {
  text = (text || '').toLowerCase(); q = (q || '').toLowerCase().trim();
  if (!q) return 1;
  if (text.includes(q)) return 100 - text.indexOf(q);
  let ti = 0, score = 0;
  for (const ch of q) {
    const idx = text.indexOf(ch, ti);
    if (idx < 0) return 0;
    score += 2; ti = idx + 1;
  }
  return score;
}
function chapterSearchText(c) {
  return [c.title, c.description, (c.tags || []).join(' '), S.notes[c.id] || ''].join(' ');
}
function renderChapters() {
  renderSidebar();
  const q = $('#searchInput').value || '';
  let items = allChapters().map((c, i) => ({ c, i, score: fuzzyScore(chapterSearchText(c), q) }));
  if (q) items = items.filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  items = items.filter(({ c }) => {
    switch (homeFilter) {
      case 'video': return (c.videos || []).length > 0;
      case 'audio': return (c.audios || []).length > 0;
      case 'pdf': return (c.pdfs || []).length > 0;
      case 'done': return statusOf(c.id) === 'done';
      case 'pending': return statusOf(c.id) !== 'done';
      case 'fav': return S.favorites.includes(c.id);
      default: return true;
    }
  });
  const sort = $('#sortSelect').value;
  if (!q) {
    if (sort === 'title') items.sort((a, b) => a.c.title.localeCompare(b.c.title));
    else if (sort === 'progress') items.sort((a, b) => (statusOf(b.c.id) === 'done') - (statusOf(a.c.id) === 'done'));
    else if (sort === 'recent') items.sort((a, b) => (S.recent[b.c.id] || 0) - (S.recent[a.c.id] || 0));
    else items.sort((a, b) => a.i - b.i);
  }
  const grid = $('#chapterGrid'); grid.innerHTML = '';
  items.forEach(({ c, i }) => {
    const st = statusOf(c.id);
    const card = document.createElement('article');
    card.className = 'card chapter-card'; card.tabIndex = 0;
    card.setAttribute('role', 'button');
    const icons = [
      (c.videos || []).length ? '🎬 ' + c.videos.length : '',
      (c.audios || []).length ? '🎧 ' + c.audios.length : '',
      (c.pdfs || []).length ? '📄 ' + c.pdfs.length : ''
    ].filter(Boolean).join(' · ');
    card.innerHTML =
      '<div class="cc-top"><span class="cc-num">#' + (i + 1) + '</span><h3>' + esc(c.title) + '</h3>' +
      '<button class="fav-btn" aria-label="Favorite">' + (S.favorites.includes(c.id) ? '★' : '☆') + '</button></div>' +
      '<p class="muted">' + esc(c.description || '') + '</p>' +
      (icons ? '<p class="cc-icons">' + icons + '</p>' : '') +
      '<span class="badge ' + st + '">' + (st === 'done' ? '✓ Done' : st === 'progress' ? 'In progress' : 'Not started') + '</span>';
    card.addEventListener('click', () => openChapter(c.id));
    card.addEventListener('keydown', e => { if (e.key === 'Enter') openChapter(c.id); });
    $('.fav-btn', card).addEventListener('click', e => { e.stopPropagation(); toggleFav(c.id); renderChapters(); });
    grid.appendChild(card);
  });
  $('#homeEmpty').hidden = items.length > 0;
}
function toggleFav(id) {
  const i = S.favorites.indexOf(id);
  if (i >= 0) S.favorites.splice(i, 1); else S.favorites.push(id);
  save();
}
$('#searchInput').addEventListener('input', renderChapters);
$('#sortSelect').addEventListener('change', renderChapters);
$$('.chip[data-filter]').forEach(ch => ch.addEventListener('click', () => {
  homeFilter = ch.dataset.filter;
  $$('.chip[data-filter]').forEach(x => x.classList.toggle('is-active', x === ch));
  renderChapters();
}));
$('#btnAddChapter').addEventListener('click', () => openChapterForm(null));

/* =====================================================================
   CHAPTER PAGE + PLAYERS
   Drive file -> /preview iframe | Rumble -> embed | Local -> custom
   ===================================================================== */
function openChapter(id, tab, mediaIdx) {
  const c = chapterById(id);
  if (!c) return;
  currentChapterId = id;
  if (statusOf(id) === 'new') S.progress[id] = 'progress';
  S.recent[id] = Date.now();
  S.lastOpen = { chId: id, tab: tab || currentTab || 'video' };
  save();
  $('#chTitle').textContent = 'Chapter ' + chapterNum(id) + ': ' + c.title;
  $('#chDesc').textContent = c.description || '';
  $('#chTags').innerHTML = (c.tags || []).map(t => '<span>' + esc(t) + '</span>').join('');
  $('#btnFavChapter').textContent = S.favorites.includes(id) ? '★' : '☆';
  updateMarkDoneBtn();
  showView('chapter');
  renderSidebar();
  switchTab(tab || bestTabFor(c));
  if (typeof mediaIdx === 'number') {
    if (currentTab === 'audio') playAudioAt(mediaIdx);
    if (currentTab === 'video') playVideoAt(mediaIdx);
    if (currentTab === 'pdf') loadPdfAt(mediaIdx);
  }
}
function bestTabFor(c) {
  if ((c.videos || []).length) return 'video';
  if ((c.audios || []).length) return 'audio';
  if ((c.pdfs || []).length) return 'pdf';
  return 'notes';
}
function updateMarkDoneBtn() {
  const done = statusOf(currentChapterId) === 'done';
  $('#btnMarkDone').textContent = done ? '✓ Done — tap to undo' : '✓ Mark as done';
}
$('#btnMarkDone').addEventListener('click', () => {
  const id = currentChapterId; if (!id) return;
  if (statusOf(id) === 'done') {
    S.progress[id] = 'progress'; delete S.completedOn[id];
    toast('Chapter wapas In progress kar diya.');
  } else {
    S.progress[id] = 'done'; S.completedOn[id] = todayStr();
    celebrate(); toast('Bahut badhiya! Chapter complete 🎉');
  }
  save(); updateMarkDoneBtn(); renderSidebar();
});
$('#btnFavChapter').addEventListener('click', () => {
  toggleFav(currentChapterId);
  $('#btnFavChapter').textContent = S.favorites.includes(currentChapterId) ? '★' : '☆';
});
$('#btnBackChapters').addEventListener('click', () => showView('chapters'));
$('#btnEditChapter').addEventListener('click', () => openChapterForm(currentChapterId));
$('#btnPrevChapter').addEventListener('click', () => stepChapter(-1));
$('#btnNextChapter').addEventListener('click', () => stepChapter(1));
function stepChapter(dir) {
  const list = allChapters();
  const i = chapterIndex(currentChapterId);
  const n = list[i + dir];
  if (n) openChapter(n.id);
  else toast(dir > 0 ? 'Ye aakhri chapter hai.' : 'Ye pehla chapter hai.');
}
function switchTab(tab) {
  currentTab = tab;
  if (currentChapterId) { S.lastOpen = { chId: currentChapterId, tab }; save(); }
  $$('.tab').forEach(t => t.classList.toggle('is-active', t.dataset.tab === tab));
  ['video', 'audio', 'pdf', 'notes'].forEach(t => { $('#tab-' + t).hidden = t !== tab; });
  const c = chapterById(currentChapterId);
  if (!c) return;
  if (tab === 'video') renderVideoTab(c);
  if (tab === 'audio') renderAudioTab(c);
  if (tab === 'pdf') renderPdfTab(c);
  if (tab === 'notes') renderNotesTab(c);
}
$$('.tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));

/* --- Iframe loader: skeleton + 8s timeout + debug status --- */
function loadIframe(frame, wrap, skeleton, errorBox, src, kind, title) {
  wrap.hidden = true; errorBox.hidden = true; skeleton.hidden = false;
  debugRegister(kind, title, src, src);
  let done = false;
  const timer = setTimeout(() => {
    if (!done) {
      skeleton.hidden = true; wrap.hidden = false; errorBox.hidden = false;
      debugSet(src, 'timeout (>8s)');
    }
  }, 8000);
  frame.onload = () => {
    done = true; clearTimeout(timer);
    skeleton.hidden = true; wrap.hidden = false;
    debugSet(src, 'loaded ✓');
  };
  frame.src = src;
}

/* ---------------- VIDEO ---------------- */
let vIdx = 0, vKey = null;
function renderVideoTab(c) {
  const list = $('#videoPlaylist'); list.innerHTML = '';
  const vids = c.videos || [];
  $('#vEmpty').hidden = vids.length > 0;
  vids.forEach((v, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.innerHTML = '<span>' + (isRumble(v) ? '▶' : '🎬') + '</span><span>' + esc(v.title) + '</span>';
    b.addEventListener('click', () => playVideoAt(i));
    li.appendChild(b); list.appendChild(li);
  });
  if (vids.length) playVideoAt(Math.min(vIdx, vids.length - 1));
  else { $('#vDriveWrap').hidden = true; $('#vRumbleWrap').hidden = true; $('#fileVideoWrap').hidden = true; }
}
function playVideoAt(i) {
  const c = chapterById(currentChapterId); if (!c) return;
  const vids = c.videos || []; const v = vids[i]; if (!v) return;
  vIdx = i; vKey = currentChapterId + ':v' + i;
  $$('#videoPlaylist button').forEach((b, bi) => b.classList.toggle('is-playing', bi === i));
  $('#vError').hidden = true;
  const vid = $('#fileVideo');
  if (isRumble(v)) {
    $('#vDriveWrap').hidden = true; $('#fileVideoWrap').hidden = true; vid.pause();
    loadIframe($('#vRumbleFrame'), $('#vRumbleWrap'), $('#vSkeleton'), $('#vError'), v.url, 'video-rumble', v.title);
  } else if (isDrive(v.url)) {
    $('#vRumbleWrap').hidden = true; $('#fileVideoWrap').hidden = true; vid.pause();
    loadIframe($('#vDriveFrame'), $('#vDriveWrap'), $('#vSkeleton'), $('#vError'), drivePreview(v.url), 'video-drive', v.title);
  } else {
    $('#vDriveWrap').hidden = true; $('#vRumbleWrap').hidden = true;
    $('#vSkeleton').hidden = true;
    $('#fileVideoWrap').hidden = false;
    vid.src = v.url;
    vid.playbackRate = parseFloat($('#vSpeed').value);
    const pos = S.positions[vKey];
    vid.onloadedmetadata = () => {
      if (pos && pos > 5 && pos < vid.duration - 5) vid.currentTime = pos;
    };
    vid.onerror = () => { $('#vError').hidden = false; };
    debugRegister('video-local', v.title, v.url, v.url); debugSet(v.url, 'local file');
  }
}
$('#vRetry').addEventListener('click', () => playVideoAt(vIdx));
(function wireFileVideo() {
  const vid = $('#fileVideo');
  vid.addEventListener('play', () => { $('#vPlay').textContent = '⏸'; });
  vid.addEventListener('pause', () => { $('#vPlay').textContent = '▶'; });
  vid.addEventListener('timeupdate', () => {
    if (vid.duration) {
      $('#vSeek').value = Math.round(vid.currentTime / vid.duration * 1000);
      $('#vTime').textContent = fmtTime(vid.currentTime) + ' / ' + fmtTime(vid.duration);
      if (vKey) { S.positions[vKey] = vid.currentTime; save(); }
    }
  });
  vid.addEventListener('ended', () => {
    const c = chapterById(currentChapterId);
    if (c && vIdx + 1 < (c.videos || []).length) playVideoAt(vIdx + 1);
  });
  $('#vPlay').addEventListener('click', () => { vid.paused ? vid.play() : vid.pause(); });
  $('#vBack').addEventListener('click', () => { vid.currentTime = Math.max(0, vid.currentTime - 10); });
  $('#vFwd').addEventListener('click', () => { vid.currentTime = Math.min(vid.duration || 0, vid.currentTime + 10); });
  $('#vSeek').addEventListener('input', e => { if (vid.duration) vid.currentTime = vid.duration * e.target.value / 1000; });
  $('#vSpeed').addEventListener('change', e => { vid.playbackRate = parseFloat(e.target.value); });
  $('#vVol').addEventListener('input', e => { vid.volume = parseFloat(e.target.value); });
  $('#vFull').addEventListener('click', () => {
    const wrap = $('#fileVideoWrap');
    if (wrap.requestFullscreen) wrap.requestFullscreen();
    else if (vid.webkitEnterFullscreen) vid.webkitEnterFullscreen();
  });
})();

/* ---------------- AUDIO ---------------- */
let aIdx = -1, aKey = null, sleepTimerId = null, sleepEndAt = 0;
const audioEl = () => $('#audioEl');

function renderAudioTab(c) {
  const list = $('#audioPlaylist'); list.innerHTML = '';
  const auds = c.audios || [];
  $('#audioEmpty').hidden = auds.length > 0;
  auds.forEach((a, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    const pos = S.positions[c.id + ':a' + i];
    b.innerHTML = '<span>🎧</span><span>' + esc(a.title) + '</span>' +
      (pos && !isDrive(a.url) ? '<span class="done-mark">' + fmtTime(pos) + ' se aage</span>' : '');
    b.addEventListener('click', () => playAudioAt(i));
    li.appendChild(b); list.appendChild(li);
  });
  if (auds.length && aIdx < 0) playAudioAt(0, false);
  renderBookmarkList();
}
function playAudioAt(i, autoplay = true) {
  const c = chapterById(currentChapterId); if (!c) return;
  const auds = c.audios || []; const a = auds[i]; if (!a) return;
  aIdx = i; aKey = currentChapterId + ':a' + i;
  $$('#audioPlaylist button').forEach((b, bi) => b.classList.toggle('is-playing', bi === i));
  $('#aError').hidden = true;
  if (isDrive(a.url)) {
    // Drive audio -> preview iframe (compact player, site ke andar)
    $('#localAudioCard').hidden = true;
    audioEl().pause();
    loadIframe($('#aDriveFrame'), $('#aDriveWrap'), $('#aSkeleton'), $('#aError'), drivePreview(a.url), 'audio-drive', a.title);
  } else {
    // Local audio -> apna custom player (speed, bookmarks, position sab)
    $('#aDriveWrap').hidden = true; $('#aSkeleton').hidden = true;
    $('#localAudioCard').hidden = false;
    const el = audioEl();
    $('#aNowTitle').textContent = '▶ ' + a.title;
    el.src = a.url;
    el.playbackRate = parseFloat($('#aSpeed').value);
    el.onloadedmetadata = () => {
      const pos = S.positions[aKey];
      if (pos && pos > 5 && pos < el.duration - 10) el.currentTime = pos;
      if (autoplay) el.play().catch(() => { $('#aError').hidden = false; });
      updateMediaSession(c, a);
    };
    el.onerror = () => { $('#aError').hidden = false; };
    debugRegister('audio-local', a.title, a.url, a.url); debugSet(a.url, 'local file');
  }
  renderBookmarkList();
}
$('#aRetry').addEventListener('click', () => { if (aIdx >= 0) playAudioAt(aIdx); });
function updateMediaSession(c, a) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({ title: a.title, artist: c.title, album: 'IELTS Study' });
  navigator.mediaSession.setActionHandler('play', () => audioEl().play());
  navigator.mediaSession.setActionHandler('pause', () => audioEl().pause());
  navigator.mediaSession.setActionHandler('seekbackward', () => { audioEl().currentTime -= 10; });
  navigator.mediaSession.setActionHandler('seekforward', () => { audioEl().currentTime += 10; });
  navigator.mediaSession.setActionHandler('previoustrack', () => { if (aIdx > 0) playAudioAt(aIdx - 1); });
  navigator.mediaSession.setActionHandler('nexttrack', () => {
    const cc = chapterById(currentChapterId);
    if (cc && aIdx + 1 < (cc.audios || []).length) playAudioAt(aIdx + 1);
  });
}
(function wireAudio() {
  const el = audioEl();
  el.addEventListener('play', () => { $('#aPlay').textContent = '⏸'; });
  el.addEventListener('pause', () => { $('#aPlay').textContent = '▶'; });
  el.addEventListener('timeupdate', () => {
    if (el.duration) {
      $('#aSeek').value = Math.round(el.currentTime / el.duration * 1000);
      $('#aTime').textContent = fmtTime(el.currentTime) + ' / ' + fmtTime(el.duration);
      if (aKey) { S.positions[aKey] = el.currentTime; save(); }
    }
    if (sleepEndAt) {
      const left = Math.max(0, Math.round((sleepEndAt - Date.now()) / 1000));
      $('#aSleepLeft').textContent = left > 0 ? '💤 ' + fmtTime(left) : '';
    }
  });
  el.addEventListener('ended', () => {
    if (aKey) { S.positions[aKey] = 0; save(); }
    const c = chapterById(currentChapterId);
    if (c && aIdx + 1 < (c.audios || []).length) playAudioAt(aIdx + 1);
  });
  $('#aPlay').addEventListener('click', () => {
    if (aIdx < 0) { const c = chapterById(currentChapterId); if (c && (c.audios || []).length) playAudioAt(0); return; }
    el.paused ? el.play() : el.pause();
  });
  $('#aBack').addEventListener('click', () => { el.currentTime = Math.max(0, el.currentTime - 10); });
  $('#aFwd').addEventListener('click', () => { el.currentTime = Math.min(el.duration || 0, el.currentTime + 10); });
  $('#aSeek').addEventListener('input', e => { if (el.duration) el.currentTime = el.duration * e.target.value / 1000; });
  $('#aSpeed').addEventListener('change', e => { el.playbackRate = parseFloat(e.target.value); });
  $('#aVol').addEventListener('input', e => { el.volume = parseFloat(e.target.value); });
  $('#aSleep').addEventListener('change', e => {
    clearTimeout(sleepTimerId); sleepEndAt = 0; $('#aSleepLeft').textContent = '';
    const min = parseInt(e.target.value, 10);
    if (min > 0) {
      sleepEndAt = Date.now() + min * 60000;
      sleepTimerId = setTimeout(() => { el.pause(); toast('Sleep timer: audio band ho gaya. Shubh raatri 🌙'); }, min * 60000);
      toast('Sleep timer set: ' + min + ' min');
    }
  });
  $('#aBookmark').addEventListener('click', () => {
    if (aIdx < 0 || !currentChapterId) { toast('Pehle koi local audio chalao.'); return; }
    const t = Math.floor(el.currentTime);
    const label = prompt('Bookmark note (' + fmtTime(t) + '):', '');
    if (label === null) return;
    (S.bookmarks[currentChapterId] = S.bookmarks[currentChapterId] || []).push({ t, label: label || 'Bookmark', a: aIdx });
    save(); renderBookmarkList(); toast('Bookmark save ho gaya 🔖');
  });
})();
function renderBookmarkList() {
  const ul = $('#aBookmarkList'); if (!ul) return;
  ul.innerHTML = '';
  const items = (S.bookmarks[currentChapterId] || []).slice().sort((x, y) => x.t - y.t);
  if (!items.length) { ul.innerHTML = '<li class="muted">Abhi koi bookmark nahi hai. (Bookmarks sirf local audio par chalte hain.)</li>'; return; }
  items.forEach(bm => {
    const li = document.createElement('li');
    li.innerHTML = '<button class="bm-time">' + fmtTime(bm.t) + '</button><span>' + esc(bm.label) + '</span>' +
      '<button class="bm-del icon-btn" aria-label="Delete bookmark">✕</button>';
    $('.bm-time', li).addEventListener('click', () => {
      if (bm.a != null && bm.a !== aIdx) playAudioAt(bm.a, true);
      setTimeout(() => { audioEl().currentTime = bm.t; audioEl().play().catch(() => {}); }, bm.a !== aIdx ? 600 : 0);
    });
    $('.bm-del', li).addEventListener('click', () => {
      const arr = S.bookmarks[currentChapterId];
      const realIdx = arr.indexOf(bm);
      if (realIdx >= 0) arr.splice(realIdx, 1);
      save(); renderBookmarkList();
    });
    ul.appendChild(li);
  });
}

/* ---------------- PDF ---------------- */
let pdfDoc = null, pdfIdx = 0, pdfPageNum = 1, pdfScale = 1, pdfKey = null, pdfRendering = false;
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}
function renderPdfTab(c) {
  const tabs = $('#pdfTabs'); tabs.innerHTML = '';
  const pdfs = c.pdfs || [];
  $('#pdfEmpty').hidden = pdfs.length > 0;
  pdfs.forEach((p, i) => {
    const b = document.createElement('button');
    b.className = 'chip' + (i === pdfIdx ? ' is-active' : '');
    b.textContent = '📄 ' + p.title;
    b.addEventListener('click', () => loadPdfAt(i));
    tabs.appendChild(b);
  });
  if (pdfs.length) loadPdfAt(Math.min(pdfIdx, pdfs.length - 1));
  else { $('#pdfDriveWrap').hidden = true; $('#pdfLocalWrap').hidden = true; }
}
function loadPdfAt(i) {
  const c = chapterById(currentChapterId); if (!c) return;
  const pdfs = c.pdfs || []; const p = pdfs[i]; if (!p) return;
  pdfIdx = i; pdfKey = currentChapterId + ':p' + i;
  $$('#pdfTabs .chip').forEach((b, bi) => b.classList.toggle('is-active', bi === i));
  $('#pdfError').hidden = true; $('#pdfEmpty').hidden = true;
  if (isDrive(p.url)) {
    // Drive PDF -> preview iframe (lamba viewer, site ke andar)
    $('#pdfLocalWrap').hidden = true;
    loadIframe($('#pdfDriveFrame'), $('#pdfDriveWrap'), $('#pSkeleton'), $('#pdfError'), drivePreview(p.url), 'pdf-drive', p.title);
  } else {
    // Local PDF -> PDF.js canvas viewer
    $('#pdfDriveWrap').hidden = true; $('#pSkeleton').hidden = true;
    $('#pdfLocalWrap').hidden = false;
    loadLocalPdf(p);
  }
}
function loadLocalPdf(p) {
  if (!window.pdfjsLib) { $('#pdfError').hidden = false; return; }
  $('#pdfLoading').hidden = false; $('#pdfLoadPct').textContent = '';
  const task = pdfjsLib.getDocument({ url: p.url, withCredentials: false });
  task.onProgress = pr => {
    if (pr && pr.total) $('#pdfLoadPct').textContent = Math.round(pr.loaded / pr.total * 100) + '%';
  };
  task.promise.then(doc => {
    pdfDoc = doc;
    pdfPageNum = Math.min(S.pdfPage[pdfKey] || 1, doc.numPages);
    $('#pdfTotal').textContent = doc.numPages;
    $('#pdfLoading').hidden = true;
    renderPdfPage();
  }).catch(() => { $('#pdfLoading').hidden = true; $('#pdfError').hidden = false; });
}
function renderPdfPage() {
  if (!pdfDoc || pdfRendering) return;
  pdfRendering = true;
  pdfDoc.getPage(pdfPageNum).then(page => {
    const stage = $('#pdfStage');
    const availW = Math.max(320, stage.clientWidth - 30);
    const base = page.getViewport({ scale: 1 });
    const fitScale = availW / base.width;
    const scale = pdfScale === 'fit' ? fitScale : fitScale * pdfScale;
    const viewport = page.getViewport({ scale });
    const canvas = $('#pdfCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width; canvas.height = viewport.height;
    return page.render({ canvasContext: ctx, viewport }).promise;
  }).then(() => {
    pdfRendering = false;
    $('#pdfJump').value = pdfPageNum;
    $('#pdfCounter').textContent = 'Page ' + pdfPageNum + ' of ' + (pdfDoc ? pdfDoc.numPages : '–');
    $('#pdfZoomLabel').textContent = pdfScale === 'fit' ? 'Fit' : Math.round(pdfScale * 100) + '%';
    if (pdfKey) { S.pdfPage[pdfKey] = pdfPageNum; save(); }
  }).catch(() => { pdfRendering = false; });
}
function pdfGo(n) {
  if (!pdfDoc) return;
  pdfPageNum = Math.max(1, Math.min(pdfDoc.numPages, n));
  renderPdfPage();
}
$('#pdfPrev').addEventListener('click', () => pdfGo(pdfPageNum - 1));
$('#pdfNext').addEventListener('click', () => pdfGo(pdfPageNum + 1));
$('#pdfJump').addEventListener('change', e => pdfGo(parseInt(e.target.value, 10) || 1));
$('#pdfZoomIn').addEventListener('click', () => { pdfScale = (pdfScale === 'fit' ? 1 : pdfScale) + 0.2; renderPdfPage(); });
$('#pdfZoomOut').addEventListener('click', () => { pdfScale = Math.max(0.4, (pdfScale === 'fit' ? 1 : pdfScale) - 0.2); renderPdfPage(); });
$('#pdfFit').addEventListener('click', () => { pdfScale = 'fit'; renderPdfPage(); });
$('#pdfFull').addEventListener('click', () => {
  const st = $('#pdfStage');
  if (st.requestFullscreen) st.requestFullscreen().then(() => setTimeout(renderPdfPage, 350));
});
$('#pdfRetry').addEventListener('click', () => loadPdfAt(pdfIdx));

/* ---------------- NOTES ---------------- */
let notesTimer = null;
function renderNotesTab(c) {
  $('#notesArea').value = S.notes[c.id] || '';
  updateNotesMeta();
}
function updateNotesMeta() {
  const v = $('#notesArea').value;
  $('#notesWords').textContent = v.trim() ? v.trim().split(/\s+/).length : 0;
}
$('#notesArea').addEventListener('input', () => {
  updateNotesMeta();
  $('#notesSaved').textContent = 'Saving…';
  clearTimeout(notesTimer);
  notesTimer = setTimeout(() => {
    if (currentChapterId) { S.notes[currentChapterId] = $('#notesArea').value; save(); }
    $('#notesSaved').textContent = 'Saved ✓';
  }, 500);
});
function renderNotesView() {
  const list = $('#notesList'); list.innerHTML = '';
  const withNotes = allChapters().filter(c => (S.notes[c.id] || '').trim());
  if (!withNotes.length) {
    list.innerHTML = '<p class="empty">Abhi koi notes nahi hain. Kisi chapter ke Notes tab me likho, yaha sab ikattha dikhega.</p>';
    return;
  }
  withNotes.forEach(c => {
    const card = document.createElement('article');
    card.className = 'card note-card'; card.tabIndex = 0;
    card.innerHTML = '<h3>Chapter ' + chapterNum(c.id) + ': ' + esc(c.title) + '</h3><p>' + esc(S.notes[c.id]) + '</p>';
    card.addEventListener('click', () => openChapter(c.id, 'notes'));
    list.appendChild(card);
  });
}

/* =====================================================================
   YEARLY STUDY PLANNER
   ===================================================================== */
function planSettings() {
  return (S.plan && S.plan.settings) || Object.assign({}, window.PLAN_DEFAULTS || {
    startDate: todayStr(), endDate: addDays(todayStr(), 364), chaptersPerDay: 1, offDays: [0], revisionEvery: 7
  });
}
function isOffDay(dateStr, settings) {
  return (settings.offDays || []).includes(parseDate(dateStr).getDay());
}
function dayEntry(dateStr) {
  if (!S.plan) return null;
  return S.plan.assign[dateStr] || null;
}
function isDayDone(dateStr) {
  if (S.dayDone[dateStr]) return true;
  const e = dayEntry(dateStr);
  if (!e || !e.chapters.length) return false;
  return e.chapters.every(id => statusOf(id) === 'done');
}
function generatePlan(settings) {
  const fixed = {};
  Object.entries(window.IELTS_SCHEDULE || {}).forEach(([d, ids]) => {
    if (d >= settings.startDate && d <= settings.endDate) fixed[d] = ids.slice();
  });
  if (S.plan && S.plan.fixed) Object.assign(fixed, S.plan.fixed);
  const fixedIds = new Set(Object.values(fixed).flat());
  const queue = allChapters().map(c => c.id).filter(id => !fixedIds.has(id));
  const assign = {};
  let qi = 0, studyCount = 0;
  const weekChapters = [];
  const perDay = parseFloat(settings.chaptersPerDay) || 1;
  const daysPerChapter = perDay >= 1 ? 1 : Math.max(1, Math.round(1 / perDay));
  const perStudyDay = perDay >= 1 ? Math.floor(perDay) : 1;
  let repeatLeft = 0, current = null;
  for (let d = settings.startDate; d <= settings.endDate; d = addDays(d, 1)) {
    if (fixed[d]) { assign[d] = { chapters: fixed[d].slice(), revision: false, fixed: true }; continue; }
    if (isOffDay(d, settings)) { assign[d] = { chapters: [], revision: false, off: true }; continue; }
    studyCount++;
    if (settings.revisionEvery > 0 && studyCount % settings.revisionEvery === 0) {
      assign[d] = { chapters: weekChapters.slice(-7), revision: true };
      weekChapters.length = 0;
      continue;
    }
    const todays = [];
    for (let k = 0; k < perStudyDay; k++) {
      if (repeatLeft === 0) {
        if (qi >= queue.length) break;
        current = queue[qi++]; repeatLeft = daysPerChapter;
      }
      todays.push(current); repeatLeft--;
      if (repeatLeft > 0) break;
    }
    assign[d] = { chapters: [...new Set(todays)], revision: false };
    todays.forEach(id => { if (!weekChapters.includes(id)) weekChapters.push(id); });
  }
  S.plan = { settings, assign, fixed, generatedOn: todayStr() };
  save();
  return S.plan;
}
function computeStreak() {
  const settings = planSettings();
  let best = 0, run = 0;
  if (!S.plan) return { streak: 0, best: 0 };
  const start = S.plan.settings.startDate;
  for (let d = start; d <= todayStr(); d = addDays(d, 1)) {
    const e = dayEntry(d);
    if (isOffDay(d, settings) || (e && e.off)) continue;
    if (isDayDone(d)) { run++; best = Math.max(best, run); }
    else if (d < todayStr()) run = 0;
  }
  let streak = 0;
  let d = todayStr();
  if (!isDayDone(d) && !isOffDay(d, settings)) d = addDays(d, -1);
  while (d >= start) {
    const e = dayEntry(d);
    if (isOffDay(d, settings) || (e && e.off)) { d = addDays(d, -1); continue; }
    if (isDayDone(d)) { streak++; d = addDays(d, -1); } else break;
  }
  return { streak, best: Math.max(best, streak) };
}
function planStatus() {
  if (!S.plan) return null;
  const settings = S.plan.settings, t = todayStr();
  let expected = 0, actual = 0;
  const seen = new Set();
  Object.entries(S.plan.assign).forEach(([d, e]) => {
    if (e.revision) return;
    e.chapters.forEach(id => {
      if (seen.has(id)) return; seen.add(id);
      if (d <= t) expected++;
      if (statusOf(id) === 'done') actual++;
    });
  });
  const total = seen.size;
  const diff = actual - expected;
  let elapsed = 0;
  for (let d = settings.startDate; d <= t && d <= settings.endDate; d = addDays(d, 1)) {
    if (!isOffDay(d, settings)) elapsed++;
  }
  let predicted = '—';
  if (actual > 0 && elapsed > 0 && total > actual) {
    const pace = actual / elapsed;
    predicted = fmtDate(addDays(t, Math.ceil((total - actual) / pace)));
  } else if (total && actual >= total) predicted = 'Complete 🎉';
  return { expected, actual, total, diff, predicted };
}
function missedChapters() {
  if (!S.plan) return [];
  const t = todayStr(), out = [];
  Object.entries(S.plan.assign).sort().forEach(([d, e]) => {
    if (d >= t || e.off || e.revision) return;
    if (isDayDone(d)) return;
    e.chapters.forEach(id => { if (statusOf(id) !== 'done') out.push({ date: d, id }); });
  });
  return out;
}
function checkMissedBanner() {
  const missed = missedChapters();
  const b = $('#missedBanner');
  if (missed.length) {
    $('#missedBannerText').textContent = '⚠️ You missed ' + missed.length + ' chapter' + (missed.length > 1 ? 's' : '') + '.';
    b.hidden = false;
  } else b.hidden = true;
  return missed;
}
$('#missedBannerClose').addEventListener('click', () => { $('#missedBanner').hidden = true; });
$('#missedReschedBtn').addEventListener('click', () => {
  const missed = missedChapters();
  $('#reschedInfo').textContent = missed.length + ' chapters missed hain. Kaise reschedule karna hai?';
  openModal('reschedModal');
});
$$('#reschedModal [data-resched]').forEach(btn => btn.addEventListener('click', () => {
  rescheduleMissed(btn.dataset.resched);
  closeModals(); renderPlan(); renderHome(); checkMissedBanner();
  toast('Plan reschedule ho gaya ✓');
}));
function rescheduleMissed(mode) {
  if (!S.plan) return;
  const settings = S.plan.settings, t = todayStr();
  const missed = missedChapters();
  if (!missed.length) return;
  const missedIds = [...new Set(missed.map(m => m.id))];
  missed.forEach(m => {
    const e = S.plan.assign[m.date];
    if (e) e.chapters = e.chapters.filter(id => id !== m.id);
  });
  if (mode === 'push') {
    const futureIds = [];
    Object.entries(S.plan.assign).sort().forEach(([d, e]) => {
      if (d >= t && !e.revision && !e.fixed) e.chapters.forEach(id => { if (!futureIds.includes(id)) futureIds.push(id); });
    });
    const seq = missedIds.concat(futureIds.filter(id => !missedIds.includes(id)));
    let qi = 0;
    for (let d = t; d <= settings.endDate && qi < seq.length; d = addDays(d, 1)) {
      const e = S.plan.assign[d];
      if (!e || e.off || e.revision || e.fixed) continue;
      e.chapters = [];
      const per = Math.max(1, Math.floor(parseFloat(settings.chaptersPerDay) || 1));
      for (let k = 0; k < per && qi < seq.length; k++) e.chapters.push(seq[qi++]);
    }
  } else if (mode === 'spread') {
    let added = 0, dayOffset = 0;
    while (added < missedIds.length && dayOffset < 60) {
      const d = addDays(t, dayOffset++);
      const e = S.plan.assign[d];
      if (!e || e.off) continue;
      e.chapters.push(missedIds[added++]);
    }
  } else if (mode === 'revision') {
    let placed = false;
    for (let off = 0; off < 30 && !placed; off++) {
      const e = S.plan.assign[addDays(t, off)];
      if (e && e.revision) { e.chapters = [...new Set(e.chapters.concat(missedIds))]; placed = true; }
    }
    if (!placed) {
      for (let off = 0; off < 30 && !placed; off++) {
        const e = S.plan.assign[addDays(t, off)];
        if (e && !e.off) { e.revision = true; e.chapters = [...new Set(e.chapters.concat(missedIds))]; placed = true; }
      }
    }
  }
  save();
}

/* ---------------- PLAN VIEWS ---------------- */
let monthCursor = null;
function renderPlan() {
  if (!S.plan) {
    $('#planSummary').textContent = 'Abhi plan nahi bana. Upar "Plan setup / Auto-generate" se banao.';
    $('#monthGrid').innerHTML = ''; $('#yearHeat').innerHTML = ''; $('#weekList').innerHTML = '';
    return;
  }
  const ps = planStatus();
  $('#planSummary').textContent =
    'Plan: ' + fmtDate(S.plan.settings.startDate) + ' → ' + fmtDate(S.plan.settings.endDate) +
    ' · ' + (ps ? ps.actual + ' / ' + ps.total + ' chapters done (' + Math.round(ps.total ? ps.actual / ps.total * 100 : 0) + '%)' : '') +
    ' · ' + (ps ? (ps.diff === 0 ? 'On track' : ps.diff < 0 ? Math.abs(ps.diff) + ' chapters behind' : ps.diff + ' chapters ahead') : '') +
    ' · Predicted finish: ' + (ps ? ps.predicted : '—');
  $$('.chip[data-pview]').forEach(ch => ch.classList.toggle('is-active', ch.dataset.pview === S.planView));
  $('#planMonth').hidden = S.planView !== 'month';
  $('#planYear').hidden = S.planView !== 'year';
  $('#planWeek').hidden = S.planView !== 'week';
  if (S.planView === 'month') renderMonthView();
  if (S.planView === 'year') renderYearView();
  if (S.planView === 'week') renderWeekView();
  checkMissedBanner();
}
$$('.chip[data-pview]').forEach(ch => ch.addEventListener('click', () => {
  S.planView = ch.dataset.pview; save(); renderPlan();
}));
$('#btnJumpToday').addEventListener('click', () => {
  monthCursor = todayStr().slice(0, 7); S.planView = 'month'; save(); renderPlan();
});
$('#monthPrev').addEventListener('click', () => shiftMonth(-1));
$('#monthNext').addEventListener('click', () => shiftMonth(1));
function shiftMonth(dir) {
  const cur = monthCursor || todayStr().slice(0, 7);
  const [y, m] = cur.split('-').map(Number);
  const d = new Date(y, m - 1 + dir, 1);
  monthCursor = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  renderMonthView();
}
function dayClass(d) {
  const e = dayEntry(d), t = todayStr(), settings = planSettings();
  const cls = [];
  if ((e && e.off) || (isOffDay(d, settings) && (!e || !e.chapters.length))) cls.push('off');
  if (e && e.revision) cls.push('revision');
  if (isDayDone(d)) cls.push('done');
  else if (d < t && e && e.chapters.length && !e.off) cls.push('missed');
  if (d === t) cls.push('today');
  return cls.join(' ');
}
function renderMonthView() {
  const cur = monthCursor || todayStr().slice(0, 7);
  const [y, m] = cur.split('-').map(Number);
  $('#monthTitle').textContent = new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const grid = $('#monthGrid'); grid.innerHTML = '';
  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(dn => {
    const h = document.createElement('div'); h.className = 'dow'; h.textContent = dn; grid.appendChild(h);
  });
  const first = new Date(y, m - 1, 1);
  const lead = (first.getDay() + 6) % 7;
  for (let i = 0; i < lead; i++) { const b = document.createElement('div'); b.className = 'day-cell blank'; grid.appendChild(b); }
  const daysInMonth = new Date(y, m, 0).getDate();
  for (let dd = 1; dd <= daysInMonth; dd++) {
    const ds = y + '-' + String(m).padStart(2, '0') + '-' + String(dd).padStart(2, '0');
    const e = dayEntry(ds);
    const cell = document.createElement('button');
    cell.className = 'day-cell ' + dayClass(ds);
    let inner = '<span class="dnum">' + dd + '</span>';
    if (e && e.off) inner += '<span class="dch">Off</span>';
    else if (e) e.chapters.slice(0, 2).forEach(id => { inner += '<span class="dch">Ch ' + chapterNum(id) + '</span>'; });
    if (e && e.revision) inner += '<span class="dch">🔁 Revision</span>';
    cell.innerHTML = inner;
    cell.addEventListener('click', () => openDayModal(ds));
    grid.appendChild(cell);
  }
}
function renderYearView() {
  const wrap = $('#yearHeat'); wrap.innerHTML = '';
  if (!S.plan) return;
  const start = parseDate(S.plan.settings.startDate), end = parseDate(S.plan.settings.endDate);
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const box = document.createElement('div'); box.className = 'heat-month';
    box.innerHTML = '<h4>' + cursor.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) + '</h4>';
    const g = document.createElement('div'); g.className = 'heat-grid';
    const lead = (new Date(y, m, 1).getDay() + 6) % 7;
    for (let i = 0; i < lead; i++) g.appendChild(document.createElement('span'));
    const dim = new Date(y, m + 1, 0).getDate();
    for (let dd = 1; dd <= dim; dd++) {
      const ds = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(dd).padStart(2, '0');
      const cell = document.createElement('button');
      const inRange = ds >= S.plan.settings.startDate && ds <= S.plan.settings.endDate;
      cell.className = 'heat-cell ' + (inRange ? dayClass(ds) : 'future');
      cell.title = fmtDate(ds);
      cell.addEventListener('click', () => openDayModal(ds));
      g.appendChild(cell);
    }
    box.appendChild(g); wrap.appendChild(box);
    cursor = new Date(y, m + 1, 1);
  }
}
function renderWeekView() {
  const ul = $('#weekList'); ul.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const d = addDays(todayStr(), i);
    const e = dayEntry(d);
    const li = document.createElement('li');
    let inner = '<span class="wdate">' + (i === 0 ? 'Aaj · ' : i === 1 ? 'Kal · ' : '') + fmtDate(d) + '</span>';
    if (!e) inner += '<span class="muted">Plan me nahi</span>';
    else if (e.off) inner += '<span>🌿 Off day</span>';
    else if (!e.chapters.length) inner += '<span class="muted">' + (e.revision ? '🔁 Revision (is hafte ke chapters)' : 'Kuch set nahi') + '</span>';
    else inner += e.chapters.map(id => {
      const c = chapterById(id);
      return c ? '<span>Ch ' + chapterNum(id) + ': ' + esc(c.title) + (statusOf(id) === 'done' ? ' ✅' : '') + '</span>' : '';
    }).join(' · ');
    if (isDayDone(d)) inner += '<span class="badge done">Done</span>';
    li.innerHTML = inner;
    li.addEventListener('click', () => openDayModal(d));
    ul.appendChild(li);
  }
}
$('#btnPlanWizard').addEventListener('click', () => showView('profile'));

/* ---------------- DAY MODAL + MOVE ---------------- */
let modalDate = null, moveCtx = null;
function openDayModal(d) {
  modalDate = d;
  const e = dayEntry(d);
  $('#dayTitle').textContent = fmtDate(d);
  const body = $('#dayBody'); body.innerHTML = '';
  if (!e || (!e.chapters.length && !e.off)) {
    body.innerHTML = '<p class="muted">' + (e && e.revision ? '🔁 Revision day — is hafte ke chapters dohrao.' : 'Is din ke liye koi chapter set nahi hai.') + '</p>';
  }
  if (e && e.off) body.innerHTML = '<p>🌿 Off day hai.</p>';
  (e ? e.chapters : []).forEach(id => {
    const c = chapterById(id); if (!c) return;
    const row = document.createElement('div');
    row.className = 'day-open-row';
    row.innerHTML = '<strong>Chapter ' + chapterNum(id) + ': ' + esc(c.title) + '</strong>' +
      (statusOf(id) === 'done' ? ' ✅' : '') + mediaButtonsHTML(c) +
      '<button class="btn btn-small" data-move>📅 Move to another date</button>';
    wireMediaButtons(row, id);
    $('[data-move]', row).addEventListener('click', () => {
      moveCtx = { from: d, id };
      $('#moveInfo').textContent = '"' + c.title + '" ko ' + fmtDate(d) + ' se hata kar nayi date par le jana hai.';
      $('#moveDate').value = d;
      openModal('moveModal');
    });
    body.appendChild(row);
  });
  $('#dayMarkDone').style.display = e && e.chapters.length ? '' : 'none';
  openModal('dayModal');
}
$('#dayMarkDone').addEventListener('click', () => {
  if (!modalDate) return;
  const e = dayEntry(modalDate);
  if (e) e.chapters.forEach(id => {
    if (statusOf(id) !== 'done') { S.progress[id] = 'done'; S.completedOn[id] = modalDate; }
  });
  S.dayDone[modalDate] = true; save();
  celebrate(); closeModals(); renderPlan(); renderHome(); renderSidebar();
  toast('Din complete mark ho gaya ✓');
});
$('#moveConfirm').addEventListener('click', () => {
  if (!moveCtx) return;
  const to = $('#moveDate').value;
  if (!to || to === moveCtx.from) { closeModals(); return; }
  const fromE = dayEntry(moveCtx.from);
  if (fromE) fromE.chapters = fromE.chapters.filter(id => id !== moveCtx.id);
  if (!S.plan.assign[to]) S.plan.assign[to] = { chapters: [], revision: false };
  S.plan.assign[to].chapters.push(moveCtx.id);
  (S.plan.fixed = S.plan.fixed || {})[to] = S.plan.assign[to].chapters.slice();
  save(); closeModals(); renderPlan();
  toast('Chapter ' + fmtDate(to) + ' par move ho gaya ✓');
});
$('#btnPrintPlan').addEventListener('click', () => {
  if (!S.plan) { toast('Pehle plan banao.'); return; }
  const rows = Object.entries(S.plan.assign).sort().map(([d, e]) => {
    const what = e.off ? 'Off day' : e.revision ? 'Revision: ' + e.chapters.map(id => 'Ch ' + chapterNum(id)).join(', ')
      : e.chapters.map(id => { const c = chapterById(id); return c ? 'Ch ' + chapterNum(id) + ': ' + c.title : ''; }).join('; ') || '—';
    return '<tr><td>' + fmtDate(d) + '</td><td>' + esc(what) + '</td><td>' + (isDayDone(d) ? 'Done' : '') + '</td></tr>';
  }).join('');
  $('#printPlan').innerHTML = '<h1>IELTS Study Plan</h1><table><tr><th>Date</th><th>Chapters</th><th>Status</th></tr>' + rows + '</table>';
  window.print();
});

/* ---------------- STATS ---------------- */
function dateRangeStats(from, to) {
  let chapters = 0, days = new Set(), focusSec = 0;
  Object.entries(S.completedOn).forEach(([id, d]) => { if (d >= from && d <= to) { chapters++; days.add(d); } });
  Object.entries(S.focusByDate).forEach(([d, sec]) => { if (d >= from && d <= to) { focusSec += sec; if (sec > 0) days.add(d); } });
  Object.keys(S.dayDone).forEach(d => { if (d >= from && d <= to) days.add(d); });
  return { chapters, days: days.size, focusMin: Math.round(focusSec / 60) };
}
function renderStats() {
  const t = todayStr();
  const dow = (parseDate(t).getDay() + 6) % 7;
  const weekFrom = addDays(t, -dow), monthFrom = t.slice(0, 8) + '01';
  const w = dateRangeStats(weekFrom, t), m = dateRangeStats(monthFrom, t);
  const all = dateRangeStats('2000-01-01', t);
  const total = allChapters().length;
  const pct = total ? Math.round(doneCount() / total * 100) : 0;
  $('#statWeek').innerHTML = '<p>Chapters completed: <strong>' + w.chapters + '</strong></p><p>Days studied: <strong>' + w.days + '</strong></p><p>Focus time: <strong>' + w.focusMin + ' min</strong></p>';
  $('#statMonth').innerHTML = '<p>Chapters completed: <strong>' + m.chapters + '</strong></p><p>Days studied: <strong>' + m.days + '</strong></p><p>Focus time: <strong>' + m.focusMin + ' min</strong></p>';
  $('#statAll').innerHTML = '<p>Chapters completed: <strong>' + doneCount() + ' / ' + total + '</strong></p><p>Plan completed: <strong>' + pct + '%</strong></p><p>Total focus time: <strong>' + all.focusMin + ' min</strong></p><p>Current streak: <strong>' + computeStreak().streak + ' days</strong></p>';
  const chart = $('#weekChart'); chart.innerHTML = '';
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const from = addDays(weekFrom, -7 * i), to = addDays(from, 6);
    weeks.push({ from, n: dateRangeStats(from, to).chapters });
  }
  const max = Math.max(1, ...weeks.map(x => x.n));
  weeks.forEach(x => {
    const col = document.createElement('div'); col.className = 'bar-col';
    col.innerHTML = '<div class="bar" style="height:' + Math.round(x.n / max * 120 + 4) + 'px"></div><strong>' + x.n + '</strong><small>' + x.from.slice(5) + '</small>';
    chart.appendChild(col);
  });
}

/* =====================================================================
   MODALS + CHAPTER FORM
   ===================================================================== */
function openModal(id) {
  $('#modalScrim').hidden = false;
  ['chapterFormModal', 'dayModal', 'moveModal', 'reschedModal', 'shortcutsModal'].forEach(m => {
    $('#' + m).hidden = m !== id;
  });
}
function closeModals() {
  $('#modalScrim').hidden = true;
  ['chapterFormModal', 'dayModal', 'moveModal', 'reschedModal', 'shortcutsModal'].forEach(m => { $('#' + m).hidden = true; });
}
$$('[data-close]').forEach(b => b.addEventListener('click', closeModals));
$('#modalScrim').addEventListener('click', e => { if (e.target === e.currentTarget) closeModals(); });

let editingId = null;
function linesToItems(text, kind) {
  return (text || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const parts = l.split('|').map(x => x.trim());
    if (kind === 'videos') return { title: parts[0] || 'Video', type: parts[1] || 'file', url: parts[2] || '' };
    return { title: parts[0] || 'Item', url: parts[1] || '' };
  }).filter(x => x.url);
}
function itemsToLines(items, kind) {
  return (items || []).map(x => kind === 'videos' ? [x.title, x.type || 'file', x.url].join(' | ') : [x.title, x.url].join(' | ')).join('\n');
}
function openChapterForm(id) {
  editingId = id;
  const c = id ? chapterById(id) : null;
  $('#cfTitle').textContent = c ? 'Edit chapter' : 'Add chapter';
  $('#cfName').value = c ? c.title : '';
  $('#cfDesc').value = c ? (c.description || '') : '';
  $('#cfTags').value = c ? (c.tags || []).join(', ') : '';
  $('#cfVideos').value = c ? itemsToLines(c.videos, 'videos') : '';
  $('#cfAudios').value = c ? itemsToLines(c.audios, 'audios') : '';
  $('#cfPdfs').value = c ? itemsToLines(c.pdfs, 'pdfs') : '';
  $('#cfDelete').hidden = !c;
  openModal('chapterFormModal');
}
$('#chapterForm').addEventListener('submit', e => {
  e.preventDefault();
  const data = {
    title: $('#cfName').value.trim(),
    description: $('#cfDesc').value.trim(),
    tags: $('#cfTags').value.split(',').map(x => x.trim()).filter(Boolean),
    videos: linesToItems($('#cfVideos').value, 'videos'),
    audios: linesToItems($('#cfAudios').value, 'audios'),
    pdfs: linesToItems($('#cfPdfs').value, 'pdfs')
  };
  if (!data.title) return;
  if (editingId) {
    const isCustom = S.custom.some(c => c.id === editingId);
    if (isCustom) Object.assign(S.custom.find(c => c.id === editingId), data);
    else S.edits[editingId] = Object.assign({}, chapterById(editingId), data);
    toast('Chapter update ho gaya ✓');
  } else {
    const id = 'ch-' + Date.now().toString(36);
    S.custom.push(Object.assign({ id }, data));
    toast('Naya chapter jud gaya ✓');
  }
  save(); closeModals(); renderChapters(); renderSidebar();
  if (currentChapterId === editingId && currentView === 'chapter') openChapter(editingId);
});
$('#cfDelete').addEventListener('click', () => {
  if (!editingId) return;
  if (!confirm('Ye chapter delete kar dein? Notes/bookmarks bhi hat jayenge.')) return;
  if (S.custom.some(c => c.id === editingId)) S.custom = S.custom.filter(c => c.id !== editingId);
  else { S.deleted.push(editingId); delete S.edits[editingId]; }
  delete S.progress[editingId]; delete S.notes[editingId]; delete S.bookmarks[editingId];
  save(); closeModals();
  if (currentChapterId === editingId) { currentChapterId = null; showView('chapters'); }
  renderChapters(); renderSidebar(); toast('Chapter delete ho gaya.');
});

/* =====================================================================
   PROFILE / SETTINGS
   ===================================================================== */
function renderProfile() {
  const st = planSettings();
  $('#pfStart').value = st.startDate || '';
  $('#pfEnd').value = st.endDate || '';
  $('#pfDays').value = '';
  $('#pfPerDay').value = st.chaptersPerDay || 1;
  $('#pfRevision').value = st.revisionEvery != null ? st.revisionEvery : 7;
  $$('.pfOff').forEach(cb => { cb.checked = (st.offDays || []).includes(parseInt(cb.value, 10)); });
  $('#reminderTime').value = S.reminder || '07:00';
  $('#setHideDownload').checked = !!S.hideDownload;
  $('#fontSizeSel').value = S.font || 'm';
  $('#lastBackupText').textContent = S.lastBackup
    ? 'Aakhri backup: ' + new Date(S.lastBackup).toLocaleString('en-IN')
    : 'Abhi tak koi backup nahi liya.';
  if (window.renderAccountInfo) window.renderAccountInfo();
}
$('#planForm').addEventListener('submit', e => {
  e.preventDefault();
  const start = $('#pfStart').value;
  if (!start) { toast('Start date chuno.'); return; }
  let end = $('#pfEnd').value;
  const days = parseInt($('#pfDays').value, 10);
  if (!end && days) end = addDays(start, days - 1);
  if (!end) { toast('End date ya total days — ek do.'); return; }
  generatePlan({
    startDate: start, endDate: end,
    chaptersPerDay: parseFloat($('#pfPerDay').value) || 1,
    revisionEvery: parseInt($('#pfRevision').value, 10) || 0,
    offDays: $$('.pfOff').filter(cb => cb.checked).map(cb => parseInt(cb.value, 10))
  });
  toast('Plan ban gaya ✓');
  showView('plan');
});
$('#reminderTime').addEventListener('change', e => { S.reminder = e.target.value; save(); toast('Reminder time set: ' + S.reminder); });
$('#btnNotifyPerm').addEventListener('click', async () => {
  if (!('Notification' in window)) { toast('Is browser me notifications nahi hain.'); return; }
  const p = await Notification.requestPermission();
  toast(p === 'granted' ? 'Permission mil gayi ✓' : 'Permission nahi mili — banner reminder chalega.');
});
$('#setHideDownload').addEventListener('change', e => { S.hideDownload = e.target.checked; save(); });
$('#fontSizeSel').addEventListener('change', e => { S.font = e.target.value; applyFont(); save(); });
$('#btnBackup').addEventListener('click', doBackup);
$('#backupNowBtn').addEventListener('click', doBackup);
function doBackup() {
  const payload = { app: 'ielts-study', version: 1, exportedAt: new Date().toISOString(), state: S };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ielts-study-backup-' + todayStr() + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  S.lastBackup = Date.now(); save();
  $('#backupBanner').hidden = true;
  renderProfile();
  toast('Backup download ho gaya ✓');
}
$('#fileRestore').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      if (!data.state) throw new Error('bad file');
      S = Object.assign(defaultState(), data.state);
      save(); applyTheme(); applyFont();
      renderSidebar(); renderHome();
      toast('Backup restore ho gaya ✓');
    } catch (err) { toast('Ye file sahi backup nahi lagti.'); }
  };
  r.readAsText(f);
  e.target.value = '';
});
$('#btnExportChapters').addEventListener('click', () => {
  const header = '/* Exported from IELTS Study website */\n';
  const body = 'window.IELTS_CHAPTERS = ' + JSON.stringify(allChapters(), null, 2) + ';\n' +
    'window.IELTS_SCHEDULE = ' + JSON.stringify((S.plan && S.plan.fixed) || window.IELTS_SCHEDULE || {}, null, 2) + ';\n' +
    'window.PLAN_DEFAULTS = ' + JSON.stringify(planSettings(), null, 2) + ';\n';
  const blob = new Blob([header + body], { type: 'text/javascript' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'chapters.js'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
});
$('#backupBannerClose').addEventListener('click', () => {
  $('#backupBanner').hidden = true; S.backupBannerOff = Date.now(); save();
});

/* =====================================================================
   APPEARANCE
   ===================================================================== */
function applyTheme() {
  const dark = S.theme ? S.theme === 'dark'
    : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  $('#btnTheme').textContent = dark ? '☀️' : '🌙';
}
function toggleTheme() {
  const now = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  S.theme = now; save(); applyTheme();
}
$('#btnTheme').addEventListener('click', toggleTheme);
$('#btnTheme2').addEventListener('click', toggleTheme);
function applyFont() { document.documentElement.dataset.font = S.font || 'm'; }
$('#btnFont').addEventListener('click', () => {
  const order = ['s', 'm', 'l'];
  const next = order[(order.indexOf(S.font || 'm') + 1) % 3];
  S.font = next; applyFont(); save();
  toast('Font size: ' + ({ s: 'Small', m: 'Medium', l: 'Large' })[next]);
});
$('#btnFocus').addEventListener('click', () => {
  S.focus = !S.focus; save();
  document.body.classList.toggle('focus-on', S.focus);
  $('#main').classList.toggle('focus-mode', S.focus);
  toast(S.focus ? 'Focus mode ON — sirf padhai.' : 'Focus mode OFF');
});
$('#btnShortcuts').addEventListener('click', () => openModal('shortcutsModal'));

/* =====================================================================
   POMODORO
   ===================================================================== */
const pomo = { mode: 'focus', left: 25 * 60, running: false, timer: null };
function pomoRender() {
  $('#pomoTime').textContent = fmtTime(pomo.left);
  $('#pomoMode').textContent = pomo.mode === 'focus' ? 'Focus · 25 min' : 'Break · 5 min';
  $('#pomoStart').textContent = pomo.running ? 'Pause' : 'Start';
  $('#pomoToday').textContent = Math.round((S.focusByDate[todayStr()] || 0) / 60) + ' min';
}
function pomoTick() {
  pomo.left--;
  if (pomo.mode === 'focus') {
    S.focusByDate[todayStr()] = (S.focusByDate[todayStr()] || 0) + 1;
    save();
  }
  if (pomo.left <= 0) {
    clearInterval(pomo.timer); pomo.running = false;
    if (pomo.mode === 'focus') { toast('Focus session poora! 5 min break lo ☕'); pomo.mode = 'break'; pomo.left = 5 * 60; }
    else { toast('Break khatm — wapas padhai par 💪'); pomo.mode = 'focus'; pomo.left = 25 * 60; }
  }
  pomoRender();
}
$('#pomoStart').addEventListener('click', () => {
  if (pomo.running) { clearInterval(pomo.timer); pomo.running = false; }
  else { pomo.timer = setInterval(pomoTick, 1000); pomo.running = true; }
  pomoRender();
});
$('#pomoReset').addEventListener('click', () => {
  clearInterval(pomo.timer); pomo.running = false;
  pomo.left = pomo.mode === 'focus' ? 25 * 60 : 5 * 60; pomoRender();
});
$('#pomoSwitch').addEventListener('click', () => {
  clearInterval(pomo.timer); pomo.running = false;
  pomo.mode = pomo.mode === 'focus' ? 'break' : 'focus';
  pomo.left = pomo.mode === 'focus' ? 25 * 60 : 5 * 60; pomoRender();
});
$('#pomoToggle').addEventListener('click', () => {
  const b = $('#pomoBody');
  b.hidden = !b.hidden;
  $('#pomoToggle').textContent = b.hidden ? '+' : '–';
});

/* =====================================================================
   SHORTCUTS + REMINDERS
   ===================================================================== */
document.addEventListener('keydown', e => {
  const tag = (e.target.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
  if (e.key === 'Escape') { closeModals(); closeSidebarMobile(); return; }
  if (typing) return;
  if (e.key === '/') { e.preventDefault(); showView('chapters'); $('#searchInput').focus(); }
  else if (e.key === 'd') toggleTheme();
  else if (e.key === '?') openModal('shortcutsModal');
  else if (e.key === ' ' && currentView === 'chapter' && currentTab === 'audio') {
    const el = audioEl();
    if (!$('#localAudioCard').hidden) { e.preventDefault(); el.paused ? el.play() : el.pause(); }
  }
  else if (e.key === 'ArrowRight' && currentView === 'chapter') stepChapter(1);
  else if (e.key === 'ArrowLeft' && currentView === 'chapter') stepChapter(-1);
});
setInterval(() => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date();
  const hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  if (hhmm === (S.reminder || '07:00') && S.notifiedOn !== todayStr() && !isDayDone(todayStr())) {
    const e = dayEntry(todayStr());
    if (e && e.chapters.length) {
      const c = chapterById(e.chapters[0]);
      new Notification('IELTS Study', { body: 'Aaj ka chapter: ' + (c ? c.title : 'Aaj ka plan') });
      S.notifiedOn = todayStr(); save();
    }
  }
}, 30000);

/* =====================================================================
   DEBUG PANEL (?debug=1)
   ===================================================================== */
function renderDebugPanel() {
  const panel = $('#debugPanel');
  if (!panel || panel.hidden) return;
  // Saari files pehle se register karo (jo abhi tak load nahi hui)
  allChapters().forEach(c => {
    (c.videos || []).forEach(v => {
      const conv = isRumble(v) ? v.url : isDrive(v.url) ? drivePreview(v.url) : v.url;
      if (!DEBUG_LOADS[conv]) DEBUG_LOADS[conv] = { kind: 'video', title: c.title + ' — ' + v.title, url: v.url, converted: conv, status: 'not opened yet' };
    });
    (c.audios || []).forEach(a => {
      const conv = isDrive(a.url) ? drivePreview(a.url) : a.url;
      if (!DEBUG_LOADS[conv]) DEBUG_LOADS[conv] = { kind: 'audio', title: c.title + ' — ' + a.title, url: a.url, converted: conv, status: 'not opened yet' };
    });
    (c.pdfs || []).forEach(p => {
      const conv = isDrive(p.url) ? drivePreview(p.url) : p.url;
      if (!DEBUG_LOADS[conv]) DEBUG_LOADS[conv] = { kind: 'pdf', title: c.title + ' — ' + p.title, url: p.url, converted: conv, status: 'not opened yet' };
    });
  });
  $('#debugList').innerHTML = Object.values(DEBUG_LOADS).map(x =>
    '<div>[' + esc(x.kind) + '] ' + esc(x.title) + ' — <span class="' +
    (x.status.includes('✓') ? 'ok' : x.status.includes('timeout') ? 'bad' : '') + '">' + esc(x.status) +
    '</span><br><code>' + esc(x.converted) + '</code></div>'
  ).join('');
}
$('#debugClose').addEventListener('click', () => { $('#debugPanel').hidden = true; });

/* =====================================================================
   INIT
   ===================================================================== */
(function init() {
  applyTheme(); applyFont();
  document.body.classList.toggle('focus-on', !!S.focus);
  $('#main').classList.toggle('focus-mode', !!S.focus);
  if (!S.plan && window.PLAN_DEFAULTS) {
    try { generatePlan(Object.assign({}, window.PLAN_DEFAULTS)); } catch (e) {}
  }
  renderSidebar();
  showView('home');
  pomoRender();
  checkMissedBanner();
  if (S.lastBackup && Date.now() - S.lastBackup > 7 * 24 * 3600 * 1000 &&
      Date.now() - (S.backupBannerOff || 0) > 24 * 3600 * 1000) {
    $('#backupBanner').hidden = false;
  }
  if (/[?&]debug=1/.test(location.search)) {
    $('#debugPanel').hidden = false;
    renderDebugPanel();
  }
  if (!window.FIREBASE_CONFIGURED) window.setSavedStatus('● Local', false);
})();
