/* =====================================================================
   IELTS STUDY — app.js (v5 redesign)
   Plan data/plan.json se, material data/resources.json se aata hai.
   Kuch bhi hardcoded nahi. Chapters/players/notes/pomodoro barkarar.
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
function fmtDateShort(s) {
  return parseDate(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
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

/* ---------------- Drive helpers ---------------- */
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
function isRumble(item) { return item.type === 'rumble' || /rumble\.com\/embed/.test(item.url || ''); }
const DEBUG_LOADS = {};
function debugRegister(kind, title, url, converted) { DEBUG_LOADS[converted] = { kind, title, url, converted, status: 'pending' }; }
function debugSet(converted, status) { if (DEBUG_LOADS[converted]) { DEBUG_LOADS[converted].status = status; renderDebugPanel(); } }

/* ---------------- State ---------------- */
function defaultState() {
  return {
    progress: {}, completedOn: {}, notes: {}, bookmarks: {}, positions: {},
    pdfPage: {}, favorites: [], theme: null, font: 'm', focus: false,
    custom: [], edits: {}, deleted: [],
    dayDone: {}, focusByDate: {},
    lastBackup: 0, reminder: '07:00', notifiedOn: null,
    hideDownload: true, lastOpen: null, recent: {},
    backupBannerOff: 0, localModeAck: false,
    taskDone: {}, dayDonePlan: {}, movedTasks: {}, catchup: {},
    dayNotes: {}, resStars: [], lastResource: null
  };
}
let S = defaultState();
try {
  const raw = localStorage.getItem(LS_KEY);
  if (raw) S = Object.assign(defaultState(), JSON.parse(raw));
} catch (e) {}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {}
    if (window.CloudSync && window.CloudSync.enabled) window.CloudSync.save(S);
  }, 200);
}
window.applyCloudState = function (cloudState) {
  if (!cloudState || typeof cloudState !== 'object') return;
  S = Object.assign(defaultState(), cloudState);
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {}
  applyTheme(); applyFont();
  renderSidebarProgress();
  showView(currentView || 'home');
  toast('Cloud progress load ho gaya ☁️✓');
};
window.getLocalState = function () { return S; };
window.setSavedStatus = function (text, isCloud, blocked) {
  const el = $('#savedDot');
  if (el) {
    el.textContent = text;
    el.classList.toggle('cloud', !!isCloud);
    el.classList.toggle('blocked', !!blocked);
  }
};
window.setSyncBlocked = function (blocked) {
  const box = $('#syncFixBox');
  if (box) box.hidden = !blocked;
  if (blocked) window.setSavedStatus('⚠ Sync blocked — rules', false, true);
};

/* ---------------- Plan + Resources data ---------------- */
let PLAN = null, RES = [], RES_BY_ID = {}, DAY_BY_DATE = {}, DAYS = [];
async function loadData() {
  try {
    const [pr, rr] = await Promise.all([fetch('data/plan.json'), fetch('data/resources.json')]);
    PLAN = await pr.json();
    const rj = await rr.json();
    RES = rj.resources || [];
    RES_BY_ID = {};
    RES.forEach(r => { RES_BY_ID[r.id] = r; });
    DAYS = PLAN.days || [];
    DAY_BY_DATE = {};
    DAYS.forEach(d => { DAY_BY_DATE[d.date] = d; });
  } catch (e) {
    toast('Plan data load nahi ho paya — internet check karke refresh karo.');
  }
}
function resOf(task) { return task && task.resourceId ? RES_BY_ID[task.resourceId] : null; }

/* ---------------- Chapters data (legacy, barkarar) ---------------- */
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
function doneCount() { return allChapters().filter(c => S.progress[c.id] === 'done').length; }

/* ---------------- Plan progress engine ---------------- */
function taskKey(date, taskId) { return date + '|' + taskId; }
function isTaskDone(date, task) { return !!S.taskDone[taskKey(date, task.id)]; }
function isMoved(date, task) { return !!S.movedTasks[taskKey(date, task.id)]; }
function dayTasks(date) {
  const d = DAY_BY_DATE[date];
  const base = d ? d.tasks.filter(t => !isMoved(date, t)) : [];
  const extra = (S.catchup[date] || []).map(t => Object.assign({}, t, { catchup: true }));
  return base.concat(extra);
}
function dayProgress(date) {
  const tasks = dayTasks(date);
  if (S.dayDonePlan[date]) return { done: tasks.length, total: tasks.length, pct: 1 };
  if (!tasks.length) return { done: 0, total: 0, pct: 0 };
  const done = tasks.filter(t => isTaskDone(date, t)).length;
  return { done, total: tasks.length, pct: done / tasks.length };
}
function isDayDone(date) {
  const d = DAY_BY_DATE[date];
  if (!d) return false;
  if (S.dayDonePlan[date]) return true;
  const p = dayProgress(date);
  return p.total > 0 && p.done === p.total;
}
function dayStatus(date) {
  const d = DAY_BY_DATE[date];
  if (!d) return 'upcoming';
  if (isDayDone(date)) return 'done';
  if (d.rest) return 'rest';
  const t = todayStr();
  if (date === t) return 'today';
  if (date < t) return 'missed';
  return 'upcoming';
}
function rangeProgress(dates) {
  let done = 0, total = 0;
  dates.forEach(dt => { const p = dayProgress(dt); done += p.done; total += p.total; });
  return { done, total, pct: total ? done / total : 0 };
}
function planStreak() {
  if (!DAYS.length) return { streak: 0, best: 0 };
  const t = todayStr();
  let best = 0, run = 0;
  DAYS.forEach(d => {
    if (d.date > t) return;
    if (d.rest) return;
    if (isDayDone(d.date)) { run++; best = Math.max(best, run); }
    else if (d.date < t) run = 0;
  });
  let streak = 0;
  const idx = DAYS.findIndex(d => d.date === t);
  for (let i = idx >= 0 ? idx : DAYS.length - 1; i >= 0; i--) {
    const d = DAYS[i];
    if (d.date > t) continue;
    if (d.rest) continue;
    if (isDayDone(d.date)) streak++;
    else if (d.date < t) break;
    else if (d.date === t) continue;
  }
  return { streak, best: Math.max(best, streak) };
}
function missedDays() {
  const t = todayStr();
  return DAYS.filter(d => d.date < t && !d.rest && !isDayDone(d.date) &&
    d.tasks.some(x => !isTaskDone(d.date, x) && !isMoved(d.date, x)));
}
function nextBufferDate(afterDate) {
  // Agla Sunday (halka din) ya review-week Friday — jo pehle mile
  const t = todayStr();
  const cand = DAYS.filter(d => d.date > t && d.date > afterDate);
  const sun = cand.find(d => d.rest);
  if (sun) return sun.date;
  return cand.length ? cand[0].date : null;
}
function catchUpDay(date) {
  const d = DAY_BY_DATE[date];
  if (!d) return;
  const pending = d.tasks.filter(x => !isTaskDone(date, x) && !isMoved(date, x));
  if (!pending.length) { toast('Is din ka kuch baaki nahi hai.'); return; }
  const target = nextBufferDate(date);
  if (!target) { toast('Aage koi buffer din nahi mila.'); return; }
  pending.forEach(x => {
    S.movedTasks[taskKey(date, x)] = target;
    (S.catchup[target] = S.catchup[target] || []).push(
      Object.assign({}, x, { id: 'cu-' + date + '-' + x.id, fromDate: date }));
  });
  save();
  toast(pending.length + ' tasks ' + fmtDateShort(target) + ' par shift ho gaye (catch-up) ✓');
}

/* ---------------- Navigation ---------------- */
let currentView = 'home';
let currentChapterId = null;
let currentTab = 'video';
const VIEWS = ['home', 'plan', 'important', 'library', 'chapter', 'notes', 'stats', 'profile'];
function showView(name) {
  currentView = name;
  VIEWS.forEach(v => { $('#view-' + v).hidden = v !== name; });
  $$('.nav-item').forEach(b => b.classList.toggle('is-active', b.dataset.nav === name));
  $$('.tab-item').forEach(b => b.classList.toggle('is-active', b.dataset.nav === name));
  closeSidebarMobile();
  if (name === 'home') renderHome();
  if (name === 'plan') renderPlanView();
  if (name === 'important') renderImportant();
  if (name === 'library') { renderLibrary(); renderChapters(); }
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
$('#btnOpenChapters').addEventListener('click', () => showView('library'));
function closeSidebarMobile() { $('#sidebar').classList.remove('open'); $('#sidebarScrim').hidden = true; }
$('#btnSidebar').addEventListener('click', () => { $('#sidebar').classList.add('open'); $('#sidebarScrim').hidden = false; });
$('#sidebarScrim').addEventListener('click', closeSidebarMobile);
$('#btnCollapse').addEventListener('click', () => document.body.classList.toggle('sidebar-collapsed'));
function renderSidebarProgress() {
  if (!DAYS.length) { $('#sideProgressText').textContent = 'Plan load ho raha hai…'; return; }
  const all = rangeProgress(DAYS.map(d => d.date));
  $('#sideProgressText').textContent = 'Band 8 plan: ' + all.done + ' / ' + all.total + ' tasks (' + Math.round(all.pct * 100) + '%)';
  $('#sideProgressBar').style.width = Math.round(all.pct * 100) + '%';
  const st = planStreak();
  $('#sideStreakText').textContent = '🔥 Streak ' + st.streak + ' din · Best ' + st.best;
}

/* ---------------- Viewer overlay (sab files site ke andar) ---------------- */
let viewerRes = null;
function openResource(resId, opts) {
  const r = RES_BY_ID[resId];
  if (!r) { if (opts && opts.fallbackChapter) openChapter(opts.fallbackChapter); return; }
  viewerRes = r;
  S.lastResource = resId; save();
  $('#viewerTitle').textContent = r.title;
  $('#viewerMeta').textContent = [r.skill, r.level, r.type.toUpperCase(), r.sizeMB ? r.sizeMB + ' MB' : ''].filter(Boolean).join(' · ');
  const chBtn = $('#viewerChapterBtn');
  if (r.chapterId && chapterById(r.chapterId)) {
    chBtn.hidden = false;
    chBtn.onclick = () => { closeViewer(); openChapter(r.chapterId, r.type === 'audio' ? 'audio' : r.type === 'video' ? 'video' : 'pdf'); };
  } else chBtn.hidden = true;
  const overlay = $('#viewerOverlay');
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  loadViewerFrame();
}
function loadViewerFrame() {
  if (!viewerRes) return;
  const r = viewerRes;
  const wrap = $('#viewerFrameWrap'), sk = $('#viewerSkeleton'), err = $('#viewerError');
  wrap.hidden = true; err.hidden = true; sk.hidden = false;
  wrap.style.height = r.type === 'audio' ? '190px' : '';
  wrap.style.flex = r.type === 'audio' ? '0 0 auto' : '';
  const src = isDrive(r.url) ? drivePreview(r.url) : r.url;
  debugRegister('viewer-' + r.type, r.title, r.url, src);
  let done = false;
  const timer = setTimeout(() => {
    if (!done) { sk.hidden = true; wrap.hidden = false; err.hidden = false; debugSet(src, 'timeout (>8s)'); }
  }, 8000);
  const frame = $('#viewerFrame');
  frame.onload = () => { done = true; clearTimeout(timer); sk.hidden = true; wrap.hidden = false; debugSet(src, 'loaded ✓'); };
  frame.src = src;
}
$('#viewerRetry').addEventListener('click', loadViewerFrame);
function closeViewer() {
  $('#viewerOverlay').hidden = true;
  $('#viewerFrame').src = 'about:blank';
  document.body.style.overflow = '';
  viewerRes = null;
}
$('#viewerClose').addEventListener('click', closeViewer);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && viewerRes) closeViewer(); });
function starBtnHTML(r) {
  const on = S.resStars.includes(r.id);
  return '<button class="fav-btn" data-star="' + r.id + '" aria-label="Bookmark">' + (on ? '★' : '☆') + '</button>';
}
function wireStars(root) {
  $$('[data-star]', root).forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const id = b.dataset.star;
    const i = S.resStars.indexOf(id);
    if (i >= 0) S.resStars.splice(i, 1); else S.resStars.push(id);
    save();
    b.textContent = S.resStars.includes(id) ? '★' : '☆';
  }));
}
function typeIcon(t) { return { pdf: '📄', audio: '🎧', video: '🎬', doc: '📝' }[t] || '📁'; }
function skillIcon(s) {
  return { Listening: '🎧', Reading: '📖', Writing: '✍️', Speaking: '🗣️', Grammar: '📐', Vocabulary: '🔤', Mixed: '🎯' }[s] || '🎯';
}

/* =====================================================================
   HOME — TODAY DASHBOARD
   ===================================================================== */
const MOTIVES = [
  'Chhota kadam roz, bada result saal ke ant me. 🌱',
  'Band 8 sapna nahi, roz ka system hai. Aaj ke tasks khatm karo. 💪',
  'Consistency hi asli talent hai. Bas aaj ka kaam. 🎯',
  'Kal ki chinta chhodo, aaj ka page kholo. 📖',
  'Har din 2 ghante — yehi tumhari superpower hai. ⏰',
  'Galtiyaan error log me, seekh dimaag me. ✍️',
  'Slow progress bhi progress hai. Rukna mana hai. 🚶'
];
function taskRowHTML(date, t, mini) {
  const r = resOf(t);
  const done = isTaskDone(date, t);
  return '<div class="task-mini' + (done ? ' done' : '') + '">' +
    '<input type="checkbox" data-task-check="' + esc(t.id) + '"' + (done ? ' checked' : '') + ' aria-label="Task done">' +
    '<span class="tm-title">' + typeIcon(t.type === 'read' ? 'pdf' : t.type === 'listen' ? 'audio' : t.type === 'watch' ? 'video' : 'pdf') + ' ' + esc(t.title) + '</span>' +
    '<span class="pill">' + t.minutes + ' min</span>' +
    (r ? '<button class="btn btn-small" data-open-res="' + r.id + '">Open</button>' : '') +
    '</div>';
}
function wireTaskList(root, date, rerender) {
  $$('[data-task-check]', root).forEach(cb => cb.addEventListener('change', () => {
    S.taskDone[taskKey(date, cb.dataset.taskCheck)] = cb.checked ? 1 : 0;
    if (!cb.checked) delete S.taskDone[taskKey(date, cb.dataset.taskCheck)];
    if (cb.checked && isDayDone(date) && !S.dayDonePlan[date]) celebrate();
    save();
    rerender();
    renderSidebarProgress();
  }));
  $$('[data-open-res]', root).forEach(b => b.addEventListener('click', () => openResource(b.dataset.openRes)));
}
function renderHome() {
  renderSidebarProgress();
  const t = todayStr();
  $('#dashDate').textContent = fmtDate(t);
  $('#dashMotiv').textContent = MOTIVES[parseDate(t).getDate() % MOTIVES.length];
  const day = DAY_BY_DATE[t];
  const box = $('#dashTasks');
  if (!PLAN) { box.innerHTML = '<p class="muted">Plan load ho raha hai…</p>'; return; }
  if (!day) {
    const first = DAYS[0], last = DAYS[DAYS.length - 1];
    $('#todayTitle').textContent = t < (first && first.date) ? 'Plan ' + fmtDateShort(first.date) + ' se shuru hota hai' : 'Plan poora ho gaya 🎉';
    $('#todayGoal').textContent = t < (first && first.date)
      ? 'Kal Day 1 hai — Diagnostic Week. Aaj aaram se site ghuma lo, Important wala hissa dekh lo.'
      : '365 din ka safar khatm. Ab sirf revision aur exam!';
    $('#todayMeta').textContent = '';
    box.innerHTML = '';
    $('#btnStartToday').style.display = 'none';
    $('#dashRingText').textContent = '—';
  } else {
    $('#btnStartToday').style.display = '';
    $('#todayTitle').textContent = 'Day ' + day.dayNumber + ' of 365 · ' + parseDate(t).toLocaleDateString('en-IN', { weekday: 'long' });
    $('#todayGoal').textContent = '🎯 ' + day.goal;
    const tasks = dayTasks(t);
    $('#todayMeta').textContent = day.theme + ' · ' + day.estimatedMinutes + ' min · ' + tasks.length + ' tasks';
    box.innerHTML = tasks.map(x => taskRowHTML(t, x)).join('') || '<p class="muted">Aaj koi task nahi hai.</p>';
    wireTaskList(box, t, renderHome);
    const p = dayProgress(t);
    $('#dashRing').style.strokeDashoffset = String(213.6 * (1 - p.pct));
    $('#dashRingText').textContent = Math.round(p.pct * 100) + '%';
  }
  const st = planStreak();
  $('#dashStreak').textContent = st.streak + ' days';
  $('#dashBest').textContent = st.best;
  const all = rangeProgress(DAYS.map(d => d.date));
  $('#dashYearPct').textContent = Math.round(all.pct * 100) + '% (' + all.done + '/' + all.total + ' tasks)';
  // Tomorrow
  const tm = DAY_BY_DATE[addDays(t, 1)];
  const tp = $('#dashTomorrow');
  if (tm) {
    tp.innerHTML = '<p><strong>Day ' + tm.dayNumber + ':</strong> ' + esc(tm.goal) + '</p>' +
      tm.tasks.slice(0, 3).map(x => '<p class="muted">• ' + esc(x.title) + ' (' + x.minutes + ' min)</p>').join('');
  } else tp.innerHTML = '<p class="muted">Kal plan ke bahar ka din hai.</p>';
  // Continue
  const cb = $('#dashContinue');
  if (S.lastResource && RES_BY_ID[S.lastResource]) {
    const r = RES_BY_ID[S.lastResource];
    cb.innerHTML = '<div class="continue-item"><span>' + typeIcon(r.type) + ' <strong>' + esc(r.title) + '</strong></span>' +
      '<button class="btn btn-small btn-primary" id="btnContinueRes">▶ Continue</button></div>';
    $('#btnContinueRes').addEventListener('click', () => openResource(r.id));
  } else if (S.lastOpen && chapterById(S.lastOpen.chId)) {
    const c = chapterById(S.lastOpen.chId);
    cb.innerHTML = '<div class="continue-item"><span>Chapter ' + chapterNum(c.id) + ': <strong>' + esc(c.title) + '</strong></span>' +
      '<button class="btn btn-small btn-primary" id="btnContinue">▶ Continue</button></div>';
    $('#btnContinue').addEventListener('click', () => openChapter(c.id, S.lastOpen.tab));
  } else cb.innerHTML = '<p class="muted">Jaha chhoda tha, wahi se shuru hoga. Aaj ka pehla task kholo.</p>';
  // Missed reminder on home
  const missed = missedDays();
  if (missed.length && day) {
    const note = document.createElement('p');
    note.className = 'muted';
    note.innerHTML = '⚠️ ' + missed.length + ' purane din adhoore hain. Plan me jaakar <strong>Catch up</strong> se unke tasks aage ke buffer din me daal do.';
    box.appendChild(note);
  }
}
$('#btnStartToday').addEventListener('click', () => {
  const t = todayStr();
  if (DAY_BY_DATE[t]) openDay(t);
  else showView('plan');
});

/* =====================================================================
   PLAN — DRILL-DOWN (Year → Month → Week → Day)
   ===================================================================== */
let planNav = { level: 'year', month: null, week: null, date: null };
function monthsOfPlan() {
  const map = new Map();
  DAYS.forEach(d => {
    if (!map.has(d.month)) map.set(d.month, []);
    map.get(d.month).push(d);
  });
  return Array.from(map.entries()).map(([key, days]) => ({
    key, days,
    label: parseDate(days[0].date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    range: fmtDateShort(days[0].date) + ' – ' + fmtDateShort(days[days.length - 1].date),
    theme: days[Math.floor(days.length / 2)].phase
  }));
}
function monthStatus(m) {
  const t = todayStr();
  if (m.days.every(d => isDayDone(d.date) || d.rest && dayProgress(d.date).total === 0)) return 'completed';
  if (m.days.some(d => d.date === t)) return 'current';
  if (m.days[0].date > t) return 'upcoming';
  if (m.days.every(d => dayProgress(d.date).pct === 1)) return 'completed';
  return 'upcoming';
}
function ringSVG(pct, size) {
  const off = 213.6 * (1 - pct);
  return '<div class="ring-wrap ' + (size || '') + '"><svg class="ring" viewBox="0 0 80 80" width="' +
    (size === 'small' ? 56 : 80) + '" height="' + (size === 'small' ? 56 : 80) + '" aria-hidden="true">' +
    '<circle cx="40" cy="40" r="34" class="ring-bg"></circle>' +
    '<circle cx="40" cy="40" r="34" class="ring-fg" style="stroke-dashoffset:' + off + '"></circle></svg>' +
    '<div class="ring-label"><strong>' + Math.round(pct * 100) + '%</strong></div></div>';
}
function renderPlanView() {
  renderSidebarProgress();
  const body = $('#planBody');
  const back = $('#btnPlanBack');
  const crumbs = $('#planCrumbs');
  const t = todayStr();
  const todayDay = DAY_BY_DATE[t];
  if (!PLAN) { body.innerHTML = '<p class="empty">Plan load ho raha hai…</p>'; return; }

  if (planNav.level === 'year') {
    back.hidden = true;
    crumbs.innerHTML = '<span class="here">🗓️ Year Plan</span>';
    const months = monthsOfPlan();
    body.innerHTML = '<h1>Year Plan — Nov 2026 to Nov 2027</h1>' +
      '<p class="muted">365 din · ' + DAYS.reduce((a, d) => a + d.tasks.length, 0) + ' tasks · Target Band 8. Kisi month par tap karo.</p>' +
      '<div class="year-grid">' + months.map(m => {
        const p = rangeProgress(m.days.map(d => d.date));
        const st = monthStatus(m);
        return '<article class="card month-box' + (st === 'current' ? ' current' : '') + '" data-month="' + m.key + '" tabindex="0" role="button">' +
          ringSVG(p.pct, 'small') +
          '<div class="mb-info"><h3>' + m.label + '</h3><p class="muted">' + m.range + '</p>' +
          '<p class="muted">' + esc(m.theme) + '</p>' +
          '<span class="status-pill ' + st + '">' + st + '</span></div></article>';
      }).join('') + '</div>';
    $$('[data-month]', body).forEach(el => {
      const go = () => { planNav = { level: 'month', month: el.dataset.month, week: null, date: null }; renderPlanView(); };
      el.addEventListener('click', go);
      el.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    });
    return;
  }

  if (planNav.level === 'month') {
    const m = monthsOfPlan().find(x => x.key === planNav.month) || monthsOfPlan()[0];
    back.hidden = false;
    crumbs.innerHTML = '<button data-crumb="year">Year</button><span class="sep">›</span><span class="here">' + m.label + '</span>';
    wireCrumbs(crumbs);
    const weekNums = [...new Set(m.days.map(d => d.weekNumber))];
    body.innerHTML = '<h1>' + m.label + '</h1><p class="muted">' + m.range + ' · ' + esc(m.theme) + '</p>' +
      '<div class="week-list2">' + weekNums.map(w => {
        const wdays = DAYS.filter(d => d.weekNumber === w);
        const p = rangeProgress(wdays.map(d => d.date));
        const skills = [...new Set(wdays.flatMap(d => d.tasks.map(x => x.skill)))];
        return '<article class="card week-card" data-week="' + w + '" tabindex="0" role="button">' +
          '<div class="wc-head"><h3>Week ' + w + '</h3><span class="muted">' +
          fmtDateShort(wdays[0].date) + ' to ' + fmtDateShort(wdays[wdays.length - 1].date) + '</span>' +
          '<span class="wc-pct">' + Math.round(p.pct * 100) + '% done</span></div>' +
          '<p class="muted">' + esc(wdays[0].theme) + '</p>' +
          '<div class="skill-preview">' + skills.map(s => '<span>' + skillIcon(s) + ' ' + s + ' ×' +
            wdays.flatMap(d => d.tasks).filter(x => x.skill === s).length + '</span>').join('') + '</div>' +
          '<div class="mini-track"><div class="mini-fill" style="width:' + Math.round(p.pct * 100) + '%"></div></div></article>';
      }).join('') + '</div>';
    $$('[data-week]', body).forEach(el => {
      const go = () => { planNav.level = 'week'; planNav.week = parseInt(el.dataset.week, 10); renderPlanView(); };
      el.addEventListener('click', go);
      el.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    });
    return;
  }

  if (planNav.level === 'week') {
    const wdays = DAYS.filter(d => d.weekNumber === planNav.week);
    const m = monthsOfPlan().find(x => x.key === planNav.month);
    back.hidden = false;
    crumbs.innerHTML = '<button data-crumb="year">Year</button><span class="sep">›</span>' +
      '<button data-crumb="month">' + (m ? m.label : 'Month') + '</button><span class="sep">›</span>' +
      '<span class="here">Week ' + planNav.week + '</span>';
    wireCrumbs(crumbs);
    body.innerHTML = '<h1>Week ' + planNav.week + ' · ' + fmtDateShort(wdays[0].date) + ' – ' + fmtDateShort(wdays[wdays.length - 1].date) + '</h1>' +
      '<p class="muted">' + esc(wdays[0].theme) + ' · ' + esc(wdays[0].phase) + '</p>' +
      '<div class="day-grid">' + wdays.map(d => {
        const st = dayStatus(d.date);
        const p = dayProgress(d.date);
        const icons = [...new Set(d.tasks.map(x => skillIcon(x.skill)))].join(' ');
        return '<article class="card day-card ' + st + '" data-day="' + d.date + '" tabindex="0" role="button">' +
          '<div class="dc-top"><strong>' + parseDate(d.date).toLocaleDateString('en-IN', { weekday: 'short' }) + '</strong>' +
          '<span class="muted">' + fmtDateShort(d.date) + '</span></div>' +
          '<p class="dc-goal">' + esc(d.goal) + '</p>' +
          '<p class="dc-icons">' + icons + '</p>' +
          '<p class="muted">' + d.tasks.length + ' tasks · ~' + d.estimatedMinutes + ' min · ' + p.done + '/' + p.total + ' done</p>' +
          '<span class="dc-status">' + (st === 'done' ? '✅ Done' : st === 'today' ? '📍 Today' : st === 'missed' ? '⚠️ Missed' : st === 'rest' ? '🌿 Rest / light' : 'Upcoming') + '</span>' +
          (st === 'missed' ? '<button class="btn btn-small" data-catchup="' + d.date + '">↪ Catch up</button>' : '') +
          '</article>';
      }).join('') + '</div>';
    $$('[data-day]', body).forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.dataset.catchup) return;
        planNav.level = 'day'; planNav.date = el.dataset.day; renderPlanView();
      });
    });
    $$('[data-catchup]', body).forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      catchUpDay(b.dataset.catchup);
      renderPlanView();
    }));
    return;
  }

  if (planNav.level === 'day') renderDayInto(body, planNav.date, true);
}
function wireCrumbs(root) {
  $$('[data-crumb]', root).forEach(b => b.addEventListener('click', () => {
    if (b.dataset.crumb === 'year') planNav.level = 'year';
    if (b.dataset.crumb === 'month') planNav.level = 'month';
    renderPlanView();
  }));
}
$('#btnPlanBack').addEventListener('click', () => {
  if (planNav.level === 'day') planNav.level = 'week';
  else if (planNav.level === 'week') planNav.level = 'month';
  else if (planNav.level === 'month') planNav.level = 'year';
  renderPlanView();
});
function openDay(date) {
  const d = DAY_BY_DATE[date];
  if (!d) { showView('plan'); return; }
  planNav = { level: 'day', month: d.month, week: d.weekNumber, date };
  showView('plan');
}
$('#btnJumpToday').addEventListener('click', () => {
  const t = todayStr();
  if (DAY_BY_DATE[t]) openDay(t);
  else { planNav = { level: 'year', month: null, week: null, date: null }; showView('plan'); }
});
$('#btnJumpTodayTop').addEventListener('click', () => {
  const t = todayStr();
  if (DAY_BY_DATE[t]) openDay(t);
  else showView('plan');
});
function renderDayInto(body, date, inPlan) {
  const d = DAY_BY_DATE[date];
  if (!d) { body.innerHTML = '<p class="empty">Ye din plan me nahi hai.</p>'; return; }
  const st = dayStatus(date);
  const tasks = dayTasks(date);
  const prev = addDays(date, -1), next = addDays(date, 1);
  const m = monthsOfPlan().find(x => x.key === d.month);
  if (inPlan) {
    $('#btnPlanBack').hidden = false;
    $('#planCrumbs').innerHTML = '<button data-crumb="year">Year</button><span class="sep">›</span>' +
      '<button data-crumb="month">' + (m ? m.label : '') + '</button><span class="sep">›</span>' +
      '<button data-crumb="week">Week ' + d.weekNumber + '</button><span class="sep">›</span>' +
      '<span class="here">Day ' + d.dayNumber + '</span>';
    $$('#planCrumbs [data-crumb]').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.crumb === 'year') planNav.level = 'year';
      if (b.dataset.crumb === 'month') planNav.level = 'month';
      if (b.dataset.crumb === 'week') planNav.level = 'week';
      renderPlanView();
    }));
  }
  let html = '<div class="dayview-head">' +
    (DAY_BY_DATE[prev] ? '<button class="btn btn-small" data-nav-day="' + prev + '">← Pichla din</button>' : '') +
    '<span class="spacer"></span>' +
    '<span class="status-pill ' + (st === 'done' ? 'completed' : st === 'today' ? 'current' : '') + '">' +
    (st === 'done' ? '✅ Done' : st === 'today' ? '📍 Today' : st === 'missed' ? '⚠️ Missed' : st === 'rest' ? '🌿 Light day' : 'Upcoming') + '</span>' +
    (DAY_BY_DATE[next] ? '<button class="btn btn-small" data-nav-day="' + next + '">Agla din →</button>' : '') +
    '</div>' +
    '<div class="day-goal-box"><p class="eyebrow">Day ' + d.dayNumber + ' of 365 · ' + fmtDate(date) + ' · ' + esc(d.theme) + '</p>' +
    '<h2>🎯 ' + esc(d.goal) + '</h2>' +
    '<p class="muted">Kul ~' + d.estimatedMinutes + ' min · ' + esc(d.phase) + '</p></div>';
  if (st === 'missed') {
    html += '<div class="catchup-box"><strong>Ye din chhoot gaya — koi baat nahi.</strong> ' +
      'Baaki tasks ko aane wale halke din (buffer) me daal do, plan apne aap sambhal jayega.<br>' +
      '<button class="btn btn-primary btn-small" data-catchup="' + date + '" style="margin-top:.5rem">↪ Catch up — tasks buffer day par shift karo</button></div>';
  }
  html += tasks.map(t => {
    const r = resOf(t);
    const done = isTaskDone(date, t);
    return '<article class="card task-card' + (done ? ' done' : '') + '">' +
      '<input type="checkbox" data-task-check="' + esc(t.id) + '"' + (done ? ' checked' : '') + ' aria-label="Task done">' +
      '<div class="tc-body"><h3>' + esc(t.title) + '</h3>' +
      (t.detail ? '<p class="muted">' + esc(t.detail) + '</p>' : '') +
      '<div class="tc-meta"><span class="pill">' + skillIcon(t.skill) + ' ' + esc(t.skill) + '</span>' +
      '<span class="pill">⏱ ' + t.minutes + ' min</span>' +
      (r ? '<span class="pill">' + typeIcon(r.type) + ' ' + esc(r.title) + '</span>' : '') +
      (t.catchup ? '<span class="pill catchup">Catch-up · ' + fmtDateShort(t.fromDate) + ' se</span>' : '') +
      (t.transcriptId && RES_BY_ID[t.transcriptId] ? '<button class="btn btn-small" data-open-res="' + t.transcriptId + '">📝 Transcript</button>' : '') +
      '</div></div>' +
      (r ? '<button class="btn btn-primary btn-small" data-open-res="' + r.id + '">Open</button>' : '') +
      '</article>';
  }).join('');
  html += '<label class="notes-label" for="dayNotesArea">📝 Aaj ke notes</label>' +
    '<textarea id="dayNotesArea" class="day-notes" rows="4" placeholder="Aaj kya seekha, kaha atke… apne aap save hota hai.">' + esc(S.dayNotes[date] || '') + '</textarea>' +
    '<p class="muted"><span id="dayNotesSaved">Saved</span></p>' +
    '<button class="btn btn-primary btn-big" id="btnDayDone">' + (S.dayDonePlan[date] ? '✓ Done hai — undo karo' : '✓ Mark day done') + '</button>';
  body.innerHTML = html;
  $$('[data-nav-day]', body).forEach(b => b.addEventListener('click', () => { planNav.date = b.dataset.navDay; planNav.week = DAY_BY_DATE[planNav.date].weekNumber; planNav.month = DAY_BY_DATE[planNav.date].month; renderPlanView(); }));
  $$('[data-catchup]', body).forEach(b => b.addEventListener('click', () => { catchUpDay(b.dataset.catchup); renderPlanView(); }));
  wireTaskList(body, date, () => renderDayInto(body, date, inPlan));
  const na = $('#dayNotesArea');
  let nt = null;
  na.addEventListener('input', () => {
    $('#dayNotesSaved').textContent = 'Saving…';
    clearTimeout(nt);
    nt = setTimeout(() => { S.dayNotes[date] = na.value; save(); $('#dayNotesSaved').textContent = 'Saved ✓'; }, 500);
  });
  $('#btnDayDone').addEventListener('click', () => {
    if (S.dayDonePlan[date]) { delete S.dayDonePlan[date]; toast('Day wapas open kar diya.'); }
    else {
      S.dayDonePlan[date] = 1;
      dayTasks(date).forEach(t => { S.taskDone[taskKey(date, t.id)] = 1; });
      celebrate(); toast('Day ' + d.dayNumber + ' complete! 🎉');
    }
    save(); renderDayInto(body, date, inPlan); renderSidebarProgress();
  });
}

/* =====================================================================
   IMPORTANT + LIBRARY
   ===================================================================== */
function resourceCardHTML(r, showBadge) {
  return '<article class="card chapter-card" data-res-card="' + r.id + '" tabindex="0" role="button">' +
    '<div class="cc-top"><span class="cc-num">' + typeIcon(r.type) + '</span><h3>' + esc(r.title) + '</h3>' + starBtnHTML(r) + '</div>' +
    '<p class="muted">' + esc(r.note || '') + '</p>' +
    '<p class="cc-icons">' + skillIcon(r.skill) + ' ' + r.skill + ' · ' + r.level + (r.sizeMB ? ' · ' + r.sizeMB + ' MB' : '') + (r.split ? ' · ' + esc(r.split) : '') + '</p>' +
    (showBadge ? '<span class="badge ' + (r.bucket === 'IMPORTANT' ? 'imp' : r.bucket === 'CORE' ? 'progress' : '') + '">' + r.bucket + '</span>' : '') +
    '</article>';
}
function wireResourceCards(root) {
  $$('[data-res-card]', root).forEach(el => {
    el.addEventListener('click', e => { if (!e.target.dataset.star) openResource(el.dataset.resCard); });
    el.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.target.dataset.star) openResource(el.dataset.resCard); });
  });
  wireStars(root);
}
function renderImportant() {
  const body = $('#importantBody');
  const imp = RES.filter(r => r.bucket === 'IMPORTANT');
  const cheat = imp.filter(r => /band 9|descriptor|official cambridge guide|mistake|template/i.test(r.title + ' ' + (r.note || '')));
  const cheatIds = new Set(cheat.map(r => r.id));
  let html = '';
  if (cheat.length) {
    html += '<div class="imp-group"><h2>🏆 Band 8 cheat sheets</h2><div class="chapter-grid">' +
      cheat.map(r => resourceCardHTML(r, false)).join('') + '</div></div>';
  }
  ['Listening', 'Reading', 'Writing', 'Speaking', 'Grammar', 'Vocabulary', 'Mixed'].forEach(skill => {
    const items = imp.filter(r => r.skill === skill && !cheatIds.has(r.id));
    if (!items.length) return;
    html += '<div class="imp-group"><h2>' + skillIcon(skill) + ' ' + skill + '</h2><div class="chapter-grid">' +
      items.map(r => resourceCardHTML(r, false)).join('') + '</div></div>';
  });
  body.innerHTML = html || '<p class="empty">Important material load nahi hua.</p>';
  wireResourceCards(body);
}
let libFilter = 'all';
function renderLibrary() {
  const q = ($('#libSearch').value || '').toLowerCase();
  const type = $('#libType').value, level = $('#libLevel').value;
  let items = RES.filter(r => r.bucket === 'REFERENCE' || libFilter === 'star');
  if (libFilter === 'star') items = RES.filter(r => S.resStars.includes(r.id));
  else if (libFilter !== 'all') items = items.filter(r => r.skill === libFilter);
  if (type !== 'all') items = items.filter(r => r.type === type);
  if (level !== 'all') items = items.filter(r => r.level === level);
  if (q) items = items.filter(r => (r.title + ' ' + r.skill + ' ' + (r.note || '')).toLowerCase().includes(q));
  const totalLib = items.length;
  items = items.slice(0, 400);
  $('#libCount').textContent = totalLib + ' files library me hain (' + items.length + ' dikh rahe hain) — excluded files yaha kabhi nahi dikhte';
  $('#libGrid').innerHTML = items.map(r => resourceCardHTML(r, true)).join('');
  $('#libEmpty').hidden = items.length > 0;
  wireResourceCards($('#libGrid'));
}
$('#libSearch').addEventListener('input', renderLibrary);
$('#libType').addEventListener('change', renderLibrary);
$('#libLevel').addEventListener('change', renderLibrary);
$$('.chip[data-lfilter]').forEach(ch => ch.addEventListener('click', () => {
  libFilter = ch.dataset.lfilter;
  $$('.chip[data-lfilter]').forEach(x => x.classList.toggle('is-active', x === ch));
  renderLibrary();
}));

/* =====================================================================
   CHAPTERS (Library ke neeche — purana system barkarar)
   ===================================================================== */
let homeFilter = 'all';
function fuzzyScore(text, q) {
  text = (text || '').toLowerCase(); q = (q || '').toLowerCase().trim();
  if (!q) return 1;
  if (text.includes(q)) return 100 - text.indexOf(q);
  let ti = 0, score = 0;
  for (const ch of q) { const idx = text.indexOf(ch, ti); if (idx < 0) return 0; score += 2; ti = idx + 1; }
  return score;
}
function renderChapters() {
  const total = allChapters().length, done = doneCount();
  const pct = total ? Math.round(done / total * 100) : 0;
  $('#chaptersProgressText').textContent = done + ' of ' + total + ' chapters done';
  $('#chaptersProgressBar').style.width = pct + '%';
  const q = $('#searchInput').value || '';
  let items = allChapters().map((c, i) => ({ c, i, score: fuzzyScore([c.title, c.description, (c.tags || []).join(' '), S.notes[c.id] || ''].join(' '), q) }));
  if (q) items = items.filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  items = items.filter(({ c }) => {
    switch (homeFilter) {
      case 'video': return (c.videos || []).length > 0;
      case 'audio': return (c.audios || []).length > 0;
      case 'pdf': return (c.pdfs || []).length > 0;
      case 'done': return statusOf(c.id) === 'done';
      case 'fav': return S.favorites.includes(c.id);
      default: return true;
    }
  });
  const sort = $('#sortSelect').value;
  if (!q) {
    if (sort === 'title') items.sort((a, b) => a.c.title.localeCompare(b.c.title));
    else if (sort === 'recent') items.sort((a, b) => (S.recent[b.c.id] || 0) - (S.recent[a.c.id] || 0));
    else items.sort((a, b) => a.i - b.i);
  }
  const grid = $('#chapterGrid'); grid.innerHTML = '';
  items.forEach(({ c, i }) => {
    const st = statusOf(c.id);
    const card = document.createElement('article');
    card.className = 'card chapter-card'; card.tabIndex = 0; card.setAttribute('role', 'button');
    const icons = [(c.videos || []).length ? '🎬 ' + c.videos.length : '', (c.audios || []).length ? '🎧 ' + c.audios.length : '', (c.pdfs || []).length ? '📄 ' + c.pdfs.length : ''].filter(Boolean).join(' · ');
    card.innerHTML = '<div class="cc-top"><span class="cc-num">#' + (i + 1) + '</span><h3>' + esc(c.title) + '</h3>' +
      '<button class="fav-btn" aria-label="Favorite">' + (S.favorites.includes(c.id) ? '★' : '☆') + '</button></div>' +
      '<p class="muted">' + esc(c.description || '') + '</p>' + (icons ? '<p class="cc-icons">' + icons + '</p>' : '') +
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

/* ---------------- Chapter page + players ---------------- */
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
  if (statusOf(id) === 'done') { S.progress[id] = 'progress'; delete S.completedOn[id]; toast('Chapter wapas In progress.'); }
  else { S.progress[id] = 'done'; S.completedOn[id] = todayStr(); celebrate(); toast('Chapter complete 🎉'); }
  save(); updateMarkDoneBtn();
});
$('#btnFavChapter').addEventListener('click', () => {
  toggleFav(currentChapterId);
  $('#btnFavChapter').textContent = S.favorites.includes(currentChapterId) ? '★' : '☆';
});
$('#btnBackChapters').addEventListener('click', () => showView('library'));
$('#btnEditChapter').addEventListener('click', () => openChapterForm(currentChapterId));
$('#btnPrevChapter').addEventListener('click', () => stepChapter(-1));
$('#btnNextChapter').addEventListener('click', () => stepChapter(1));
function stepChapter(dir) {
  const list = allChapters();
  const n = list[chapterIndex(currentChapterId) + dir];
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

function loadIframe(frame, wrap, skeleton, errorBox, src, kind, title) {
  wrap.hidden = true; errorBox.hidden = true; skeleton.hidden = false;
  debugRegister(kind, title, src, src);
  let done = false;
  const timer = setTimeout(() => {
    if (!done) { skeleton.hidden = true; wrap.hidden = false; errorBox.hidden = false; debugSet(src, 'timeout (>8s)'); }
  }, 8000);
  frame.onload = () => { done = true; clearTimeout(timer); skeleton.hidden = true; wrap.hidden = false; debugSet(src, 'loaded ✓'); };
  frame.src = src;
}
/* VIDEO */
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
  const v = (c.videos || [])[i]; if (!v) return;
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
    $('#vDriveWrap').hidden = true; $('#vRumbleWrap').hidden = true; $('#vSkeleton').hidden = true;
    $('#fileVideoWrap').hidden = false;
    vid.src = v.url;
    vid.playbackRate = parseFloat($('#vSpeed').value);
    const pos = S.positions[vKey];
    vid.onloadedmetadata = () => { if (pos && pos > 5 && pos < vid.duration - 5) vid.currentTime = pos; };
    vid.onerror = () => { $('#vError').hidden = false; };
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
/* AUDIO */
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
    b.innerHTML = '<span>🎧</span><span>' + esc(a.title) + '</span>' + (pos && !isDrive(a.url) ? '<span class="done-mark">' + fmtTime(pos) + ' se aage</span>' : '');
    b.addEventListener('click', () => playAudioAt(i));
    li.appendChild(b); list.appendChild(li);
  });
  if (auds.length && aIdx < 0) playAudioAt(0, false);
  renderBookmarkList();
}
function playAudioAt(i, autoplay = true) {
  const c = chapterById(currentChapterId); if (!c) return;
  const a = (c.audios || [])[i]; if (!a) return;
  aIdx = i; aKey = currentChapterId + ':a' + i;
  $$('#audioPlaylist button').forEach((b, bi) => b.classList.toggle('is-playing', bi === i));
  $('#aError').hidden = true;
  if (isDrive(a.url)) {
    $('#localAudioCard').hidden = true;
    audioEl().pause();
    loadIframe($('#aDriveFrame'), $('#aDriveWrap'), $('#aSkeleton'), $('#aError'), drivePreview(a.url), 'audio-drive', a.title);
  } else {
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
  }
  renderBookmarkList();
}
$('#aRetry').addEventListener('click', () => { if (aIdx >= 0) playAudioAt(aIdx); });
function updateMediaSession(c, a) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({ title: a.title, artist: c.title, album: "Noor's Classroom" });
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
      sleepTimerId = setTimeout(() => { el.pause(); toast('Sleep timer: audio band. Shubh raatri 🌙'); }, min * 60000);
      toast('Sleep timer set: ' + min + ' min');
    }
  });
  $('#aBookmark').addEventListener('click', () => {
    if (aIdx < 0 || !currentChapterId) { toast('Pehle koi local audio chalao.'); return; }
    const t = Math.floor(el.currentTime);
    const label = prompt('Bookmark note (' + fmtTime(t) + '):', '');
    if (label === null) return;
    (S.bookmarks[currentChapterId] = S.bookmarks[currentChapterId] || []).push({ t, label: label || 'Bookmark', a: aIdx });
    save(); renderBookmarkList(); toast('Bookmark save 🔖');
  });
})();
function renderBookmarkList() {
  const ul = $('#aBookmarkList'); if (!ul) return;
  ul.innerHTML = '';
  const items = (S.bookmarks[currentChapterId] || []).slice().sort((x, y) => x.t - y.t);
  if (!items.length) { ul.innerHTML = '<li class="muted">Abhi koi bookmark nahi hai. (Bookmarks sirf local audio par chalte hain.)</li>'; return; }
  items.forEach(bm => {
    const li = document.createElement('li');
    li.innerHTML = '<button class="bm-time">' + fmtTime(bm.t) + '</button><span>' + esc(bm.label) + '</span><button class="bm-del icon-btn" aria-label="Delete bookmark">✕</button>';
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
/* PDF */
let pdfDoc = null, pdfIdx = 0, pdfPageNum = 1, pdfScale = 1, pdfKey = null, pdfRendering = false;
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
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
  const p = (c.pdfs || [])[i]; if (!p) return;
  pdfIdx = i; pdfKey = currentChapterId + ':p' + i;
  $$('#pdfTabs .chip').forEach((b, bi) => b.classList.toggle('is-active', bi === i));
  $('#pdfError').hidden = true; $('#pdfEmpty').hidden = true;
  if (isDrive(p.url)) {
    $('#pdfLocalWrap').hidden = true;
    loadIframe($('#pdfDriveFrame'), $('#pdfDriveWrap'), $('#pSkeleton'), $('#pdfError'), drivePreview(p.url), 'pdf-drive', p.title);
  } else {
    $('#pdfDriveWrap').hidden = true; $('#pSkeleton').hidden = true;
    $('#pdfLocalWrap').hidden = false;
    loadLocalPdf(p);
  }
}
function loadLocalPdf(p) {
  if (!window.pdfjsLib) { $('#pdfError').hidden = false; return; }
  $('#pdfLoading').hidden = false; $('#pdfLoadPct').textContent = '';
  const task = pdfjsLib.getDocument({ url: p.url, withCredentials: false });
  task.onProgress = pr => { if (pr && pr.total) $('#pdfLoadPct').textContent = Math.round(pr.loaded / pr.total * 100) + '%'; };
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
    canvas.width = viewport.width; canvas.height = viewport.height;
    return page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  }).then(() => {
    pdfRendering = false;
    $('#pdfJump').value = pdfPageNum;
    $('#pdfCounter').textContent = 'Page ' + pdfPageNum + ' of ' + (pdfDoc ? pdfDoc.numPages : '–');
    $('#pdfZoomLabel').textContent = pdfScale === 'fit' ? 'Fit' : Math.round(pdfScale * 100) + '%';
    if (pdfKey) { S.pdfPage[pdfKey] = pdfPageNum; save(); }
  }).catch(() => { pdfRendering = false; });
}
function pdfGo(n) { if (!pdfDoc) return; pdfPageNum = Math.max(1, Math.min(pdfDoc.numPages, n)); renderPdfPage(); }
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
/* Chapter notes */
let notesTimer = null;
function renderNotesTab(c) { $('#notesArea').value = S.notes[c.id] || ''; updateNotesMeta(); }
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

/* =====================================================================
   NOTES VIEW / STATS / PROFILE
   ===================================================================== */
function renderNotesView() {
  const dl = $('#dayNotesList'); dl.innerHTML = '';
  const dn = Object.entries(S.dayNotes).filter(([, v]) => (v || '').trim()).sort((a, b) => b[0].localeCompare(a[0]));
  if (!dn.length) dl.innerHTML = '<p class="empty">Abhi koi day note nahi hai. Kisi din ke page par notes likho.</p>';
  dn.forEach(([date, text]) => {
    const card = document.createElement('article');
    card.className = 'card note-card'; card.tabIndex = 0;
    card.innerHTML = '<h3>' + fmtDate(date) + '</h3><p>' + esc(text) + '</p>';
    card.addEventListener('click', () => openDay(date));
    dl.appendChild(card);
  });
  const list = $('#notesList'); list.innerHTML = '';
  const withNotes = allChapters().filter(c => (S.notes[c.id] || '').trim());
  if (!withNotes.length) list.innerHTML = '<p class="empty">Abhi koi chapter note nahi hai.</p>';
  withNotes.forEach(c => {
    const card = document.createElement('article');
    card.className = 'card note-card'; card.tabIndex = 0;
    card.innerHTML = '<h3>Chapter ' + chapterNum(c.id) + ': ' + esc(c.title) + '</h3><p>' + esc(S.notes[c.id]) + '</p>';
    card.addEventListener('click', () => openChapter(c.id, 'notes'));
    list.appendChild(card);
  });
}
function dateRangeStats(from, to) {
  let chapters = 0, days = new Set(), focusSec = 0;
  Object.entries(S.completedOn).forEach(([, d]) => { if (d >= from && d <= to) { chapters++; days.add(d); } });
  Object.entries(S.focusByDate).forEach(([d, sec]) => { if (d >= from && d <= to) { focusSec += sec; if (sec > 0) days.add(d); } });
  return { chapters, days: days.size, focusMin: Math.round(focusSec / 60) };
}
function renderStats() {
  const t = todayStr();
  const dow = (parseDate(t).getDay() + 6) % 7;
  const weekFrom = addDays(t, -dow), monthFrom = t.slice(0, 8) + '01';
  const w = dateRangeStats(weekFrom, t), m = dateRangeStats(monthFrom, t);
  const all = rangeProgress(DAYS.map(d => d.date));
  const st = planStreak();
  $('#statPlan').innerHTML = '<p>Tasks done: <strong>' + all.done + ' / ' + all.total + '</strong> (' + Math.round(all.pct * 100) + '%)</p>' +
    '<p>Streak: <strong>' + st.streak + ' din</strong> · Best: <strong>' + st.best + '</strong></p>' +
    '<p>Missed days: <strong>' + missedDays().length + '</strong></p>';
  $('#statWeek').innerHTML = '<p>Chapters completed: <strong>' + w.chapters + '</strong></p><p>Days studied: <strong>' + w.days + '</strong></p><p>Focus: <strong>' + w.focusMin + ' min</strong></p>';
  $('#statMonth').innerHTML = '<p>Chapters completed: <strong>' + m.chapters + '</strong></p><p>Days studied: <strong>' + m.days + '</strong></p><p>Focus: <strong>' + m.focusMin + ' min</strong></p>';
  $('#statAll').innerHTML = '<p>Chapters done: <strong>' + doneCount() + ' / ' + allChapters().length + '</strong></p>';
  const chart = $('#weekChart'); chart.innerHTML = '';
  const byWeek = {};
  DAYS.forEach(d => {
    const p = dayProgress(d.date);
    byWeek[d.weekNumber] = (byWeek[d.weekNumber] || 0) + p.done;
  });
  const weeks = Object.keys(byWeek).map(Number).sort((a, b) => a - b).slice(-10);
  const max = Math.max(1, ...weeks.map(x => byWeek[x]));
  weeks.forEach(x => {
    const col = document.createElement('div'); col.className = 'bar-col';
    col.innerHTML = '<div class="bar" style="height:' + Math.round(byWeek[x] / max * 120 + 4) + 'px"></div><strong>' + byWeek[x] + '</strong><small>W' + x + '</small>';
    chart.appendChild(col);
  });
}
function renderProfile() {
  $('#reminderTime').value = S.reminder || '07:00';
  $('#fontSizeSel').value = S.font || 'm';
  $('#lastBackupText').textContent = S.lastBackup ? 'Aakhri backup: ' + new Date(S.lastBackup).toLocaleString('en-IN') : 'Abhi tak koi backup nahi liya.';
  if (window.renderAccountInfo) window.renderAccountInfo();
}
$('#reminderTime').addEventListener('change', e => { S.reminder = e.target.value; save(); toast('Reminder time set: ' + S.reminder); });
$('#btnNotifyPerm').addEventListener('click', async () => {
  if (!('Notification' in window)) { toast('Is browser me notifications nahi hain.'); return; }
  const p = await Notification.requestPermission();
  toast(p === 'granted' ? 'Permission mil gayi ✓' : 'Permission nahi mili.');
});
$('#fontSizeSel').addEventListener('change', e => { S.font = e.target.value; applyFont(); save(); });
$('#btnBackup').addEventListener('click', doBackup);
$('#backupNowBtn').addEventListener('click', doBackup);
function doBackup() {
  const payload = { app: 'ielts-study', version: 2, exportedAt: new Date().toISOString(), state: S };
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
      renderSidebarProgress(); renderHome();
      toast('Backup restore ho gaya ✓');
    } catch (err) { toast('Ye file sahi backup nahi lagti.'); }
  };
  r.readAsText(f);
  e.target.value = '';
});
$('#btnExportChapters').addEventListener('click', () => {
  const body = 'window.IELTS_CHAPTERS = ' + JSON.stringify(allChapters(), null, 2) + ';\n' +
    'window.IELTS_SCHEDULE = ' + JSON.stringify(window.IELTS_SCHEDULE || {}, null, 2) + ';\n' +
    'window.PLAN_DEFAULTS = ' + JSON.stringify(window.PLAN_DEFAULTS || {}, null, 2) + ';\n';
  const blob = new Blob([body], { type: 'text/javascript' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'chapters.js'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
});
$('#backupBannerClose').addEventListener('click', () => { $('#backupBanner').hidden = true; S.backupBannerOff = Date.now(); save(); });

/* ---------------- Modals + chapter form ---------------- */
function openModal(id) {
  $('#modalScrim').hidden = false;
  ['chapterFormModal', 'shortcutsModal'].forEach(m => { $('#' + m).hidden = m !== id; });
}
function closeModals() {
  $('#modalScrim').hidden = true;
  ['chapterFormModal', 'shortcutsModal'].forEach(m => { $('#' + m).hidden = true; });
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
    toast('Chapter update ✓');
  } else {
    S.custom.push(Object.assign({ id: 'ch-' + Date.now().toString(36) }, data));
    toast('Naya chapter jud gaya ✓');
  }
  save(); closeModals(); renderChapters();
  if (currentChapterId === editingId && currentView === 'chapter') openChapter(editingId);
});
$('#cfDelete').addEventListener('click', () => {
  if (!editingId) return;
  if (!confirm('Ye chapter delete kar dein?')) return;
  if (S.custom.some(c => c.id === editingId)) S.custom = S.custom.filter(c => c.id !== editingId);
  else { S.deleted.push(editingId); delete S.edits[editingId]; }
  delete S.progress[editingId]; delete S.notes[editingId]; delete S.bookmarks[editingId];
  save(); closeModals();
  if (currentChapterId === editingId) { currentChapterId = null; showView('library'); }
  renderChapters(); toast('Chapter delete ho gaya.');
});

/* ---------------- Appearance / Pomodoro / shortcuts ---------------- */
function applyTheme() {
  const dark = S.theme ? S.theme === 'dark' : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  $('#btnTheme').textContent = dark ? '☀️' : '🌙';
}
function toggleTheme() {
  S.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  save(); applyTheme();
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
  toast(S.focus ? 'Focus mode ON' : 'Focus mode OFF');
});
$('#btnShortcuts').addEventListener('click', () => openModal('shortcutsModal'));
const pomo = { mode: 'focus', left: 25 * 60, running: false, timer: null };
function pomoRender() {
  $('#pomoTime').textContent = fmtTime(pomo.left);
  $('#pomoMode').textContent = pomo.mode === 'focus' ? 'Focus · 25 min' : 'Break · 5 min';
  $('#pomoStart').textContent = pomo.running ? 'Pause' : 'Start';
  $('#pomoToday').textContent = Math.round((S.focusByDate[todayStr()] || 0) / 60) + ' min';
}
function pomoTick() {
  pomo.left--;
  if (pomo.mode === 'focus') { S.focusByDate[todayStr()] = (S.focusByDate[todayStr()] || 0) + 1; save(); }
  if (pomo.left <= 0) {
    clearInterval(pomo.timer); pomo.running = false;
    if (pomo.mode === 'focus') { toast('Focus session poora! 5 min break ☕'); pomo.mode = 'break'; pomo.left = 5 * 60; }
    else { toast('Break khatm — wapas padhai par 💪'); pomo.mode = 'focus'; pomo.left = 25 * 60; }
  }
  pomoRender();
}
$('#pomoStart').addEventListener('click', () => {
  if (pomo.running) { clearInterval(pomo.timer); pomo.running = false; }
  else { pomo.timer = setInterval(pomoTick, 1000); pomo.running = true; }
  pomoRender();
});
$('#pomoReset').addEventListener('click', () => { clearInterval(pomo.timer); pomo.running = false; pomo.left = pomo.mode === 'focus' ? 25 * 60 : 5 * 60; pomoRender(); });
$('#pomoSwitch').addEventListener('click', () => { clearInterval(pomo.timer); pomo.running = false; pomo.mode = pomo.mode === 'focus' ? 'break' : 'focus'; pomo.left = pomo.mode === 'focus' ? 25 * 60 : 5 * 60; pomoRender(); });
$('#pomoToggle').addEventListener('click', () => { const b = $('#pomoBody'); b.hidden = !b.hidden; $('#pomoToggle').textContent = b.hidden ? '+' : '–'; });
document.addEventListener('keydown', e => {
  const tag = (e.target.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
  if (e.key === 'Escape') { closeModals(); closeSidebarMobile(); return; }
  if (typing) return;
  if (e.key === '/') { e.preventDefault(); showView('library'); $('#libSearch').focus(); }
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
    const d = DAY_BY_DATE[todayStr()];
    if (d) {
      new Notification("Noor's Classroom", { body: 'Day ' + d.dayNumber + ': ' + d.goal });
      S.notifiedOn = todayStr(); save();
    }
  }
}, 30000);

/* ---------------- Debug panel ---------------- */
function renderDebugPanel() {
  const panel = $('#debugPanel');
  if (!panel || panel.hidden) return;
  RES.forEach(r => {
    const conv = isDrive(r.url) ? drivePreview(r.url) : r.url;
    if (!DEBUG_LOADS[conv]) DEBUG_LOADS[conv] = { kind: r.type, title: r.title, url: r.url, converted: conv, status: 'not opened yet' };
  });
  $('#debugList').innerHTML = Object.values(DEBUG_LOADS).slice(0, 200).map(x =>
    '<div>[' + esc(x.kind) + '] ' + esc(x.title) + ' — <span class="' +
    (x.status.includes('✓') ? 'ok' : x.status.includes('timeout') ? 'bad' : '') + '">' + esc(x.status) +
    '</span><br><code>' + esc(x.converted) + '</code></div>').join('');
}
$('#debugClose').addEventListener('click', () => { $('#debugPanel').hidden = true; });

/* ---------------- INIT ---------------- */
(async function init() {
  applyTheme(); applyFont();
  document.body.classList.toggle('focus-on', !!S.focus);
  $('#main').classList.toggle('focus-mode', !!S.focus);
  await loadData();
  renderSidebarProgress();
  showView('home');
  pomoRender();
  if (S.lastBackup && Date.now() - S.lastBackup > 7 * 24 * 3600 * 1000 &&
      Date.now() - (S.backupBannerOff || 0) > 24 * 3600 * 1000) {
    $('#backupBanner').hidden = false;
  }
  if (/[?&]debug=1/.test(location.search)) { $('#debugPanel').hidden = false; renderDebugPanel(); }
  if (!window.FIREBASE_CONFIGURED) window.setSavedStatus('● Local', false);
})();
