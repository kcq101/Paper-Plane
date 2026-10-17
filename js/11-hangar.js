// Paper Planes · 11-hangar.js
// Hangar and folding studio: saved designs (private db storage with local fallback).
// Classic script: shares one global scope with the other js/ files, loaded in numeric order.
'use strict';

/* ---------- hangar: saved designs + folding studio ---------- */
const BUILT_IN = [
  { id: 'b-classic', name: 'Classic Dart', nose: 'classic', wings: 'classic', tips: 'flat', paper: 'notebook', builtIn: true },
  { id: 'b-speed', name: 'Speed Dart', nose: 'pointed', wings: 'narrow', tips: 'flat', paper: 'graph', builtIn: true },
  { id: 'b-glider', name: 'Floaty Glider', nose: 'blunt', wings: 'wide', tips: 'up', paper: 'kraft', builtIn: true },
  { id: 'b-stunt', name: 'Stunt Flyer', nose: 'classic', wings: 'wide', tips: 'down', paper: 'coral', builtIn: true }
];
let custom = [], activeId = 'b-classic', editId = 'b-classic', hangarOpen = false, spin = 0, spinDrag = null;
const store = { db: null, uid: null, chain: {} };
const allDesigns = () => BUILT_IN.concat(custom);
const findDesign = id => allDesigns().find(d => d.id === id) || BUILT_IN[0];
const clean = d => ({ name: String(d.name || 'My plane').slice(0, 24), nose: FOLDS.nose[d.nose] ? d.nose : 'classic', wings: FOLDS.wings[d.wings] ? d.wings : 'classic',
  tips: FOLDS.tips[d.tips] ? d.tips : 'flat', paper: PAPERS[d.paper] ? d.paper : 'notebook' });
try { custom = (JSON.parse(localStorage.getItem('ppb-hangar') || '[]') || []).filter(d => d && typeof d.id === 'string' && d.id[0] === 'p').map(d => Object.assign({ id: d.id }, clean(d))); } catch (e) { custom = []; }
try { activeId = localStorage.getItem('ppb-active') || 'b-classic'; } catch (e) {}
if (!allDesigns().some(d => d.id === activeId)) activeId = 'b-classic';
function saveLocal() {
  try { localStorage.setItem('ppb-hangar', JSON.stringify(custom)); localStorage.setItem('ppb-active', activeId); } catch (e) {}
}
function note(t) { $('hNote').textContent = t || ''; }
function persist(d) { // one write at a time per design, mirrored on this device
  saveLocal();
  if (!store.db) return;
  const ref = store.db.doc('data/users/' + store.uid + '/' + d.id), body = Object.assign(clean(d), { updated: Date.now() });
  store.chain[d.id] = (store.chain[d.id] || Promise.resolve()).then(() => ref.set(body)).catch(e => {
    if (e && (e.code === 'invalid_argument' || e.code === 'not_granted' || e.code === 'revoked')) store.db = null;
    note('Saved on this device only.');
  });
}
function unpersist(id) {
  saveLocal();
  if (!store.db) return;
  const ref = store.db.doc('data/users/' + store.uid + '/' + id);
  store.chain[id] = (store.chain[id] || Promise.resolve()).then(() => ref.delete()).catch(() => {});
}
function setActive(id) {
  activeId = id; const d = findDesign(id);
  buildPlane(d);
  $('hangarBtn').textContent = '✈ ' + d.name;
  saveLocal();
}
function newId() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function makeCopy(src, name) {
  const d = Object.assign({ id: newId() }, clean(src), { name: (name || ('My ' + src.name)).slice(0, 24) });
  custom.push(d); persist(d);
  return d;
}
const ICON = {
  nose: { pointed: '<path d="M4 13L42 6v14Z" fill="#fff" stroke="#2a2a30" stroke-width="2" stroke-linejoin="round"/>', classic: '<path d="M8 13L42 5v16Z" fill="#fff" stroke="#2a2a30" stroke-width="2" stroke-linejoin="round"/>',
    blunt: '<path d="M14 10v6L42 21V5Z" fill="#fff" stroke="#2a2a30" stroke-width="2" stroke-linejoin="round"/>' },
  wings: { narrow: '<path d="M23 3L16 23h14Z" fill="#fff" stroke="#2a2a30" stroke-width="2" stroke-linejoin="round"/>', classic: '<path d="M23 3L11 23h24Z" fill="#fff" stroke="#2a2a30" stroke-width="2" stroke-linejoin="round"/>',
    wide: '<path d="M23 3L3 21h40Z" fill="#fff" stroke="#2a2a30" stroke-width="2" stroke-linejoin="round"/>' },
  tips: { flat: '<path d="M3 16h40" stroke="#2a2a30" stroke-width="2.5" stroke-linecap="round"/>', up: '<path d="M3 6v10h40V6" fill="none" stroke="#2a2a30" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
    down: '<path d="M3 24V14h40v10" fill="none" stroke="#2a2a30" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' }
};
const STEPS = [
  { key: 'nose', label: '1 · Fold the nose', opts: [['pointed', 'Pointed', 'faster'], ['classic', 'Classic', 'balanced'], ['blunt', 'Blunt', 'floatier']] },
  { key: 'wings', label: '2 · Fold the wings', opts: [['narrow', 'Narrow', 'quick, less lift'], ['classic', 'Classic', 'balanced'], ['wide', 'Wide', 'glides, turns']] },
  { key: 'tips', label: '3 · Wingtips', opts: [['flat', 'Flat', 'neutral'], ['up', 'Up', 'steady'], ['down', 'Down', 'agile']] },
  { key: 'paper', label: '4 · Paper', opts: Object.keys(PAPERS).map(k => [k, PAPERS[k].name, '']) }
];
function renderHangar() {
  const d = findDesign(editId);
  const list = $('hList'); list.textContent = '';
  allDesigns().forEach(x => {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-pressed', x.id === editId ? 'true' : 'false');
    b.textContent = x.name; if (x.id === activeId) { const t = document.createElement('span'); t.className = 'tag'; t.textContent = '✈ flying'; b.appendChild(t); }
    b.addEventListener('click', () => { Sfx.scratch(); editId = x.id; buildPlane(x); renderHangar(); note(x.builtIn ? 'A starter plane. Change any fold to make your own copy.' : ''); });
    list.appendChild(b);
  });
  const nm = $('hName'); nm.value = d.name; nm.disabled = !!d.builtIn;
  const fold = $('hFold'); fold.textContent = '';
  STEPS.forEach(st => {
    const row = document.createElement('div'); row.className = 'frow';
    const lab = document.createElement('div'); lab.className = 'fl'; lab.textContent = st.label; row.appendChild(lab);
    const opts = document.createElement('div'); opts.className = 'fopts' + (st.key === 'paper' ? ' paper' : '');
    st.opts.forEach(([val, name, hint]) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'fopt'; b.setAttribute('aria-pressed', d[st.key] === val ? 'true' : 'false');
      if (st.key === 'paper') { const sw = document.createElement('span'); sw.className = 'sw'; sw.style.background = PAPERS[val].sw; b.appendChild(sw); }
      else { const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sv.setAttribute('viewBox', '0 0 46 26'); sv.setAttribute('aria-hidden', 'true'); sv.innerHTML = ICON[st.key][val]; b.appendChild(sv); }
      const t = document.createElement('span'); t.textContent = name; b.appendChild(t);
      if (hint) { const sm = document.createElement('small'); sm.textContent = hint; b.appendChild(sm); }
      b.addEventListener('click', () => chooseFold(st.key, val));
      opts.appendChild(b);
    });
    row.appendChild(opts); fold.appendChild(row);
  });
  const stats = $('hStats'); stats.textContent = '';
  const ss = designStats(d);
  Object.keys(ss).forEach(k => {
    const l = document.createElement('span'); l.textContent = k; stats.appendChild(l);
    const bar = document.createElement('div'); bar.className = 'bar'; bar.setAttribute('role', 'img'); bar.setAttribute('aria-label', k + ' ' + ss[k] + ' out of 10');
    for (let i = 1; i <= 10; i++) { const c = document.createElement('i'); if (i <= ss[k]) c.className = 'on'; bar.appendChild(c); }
    stats.appendChild(bar);
  });
  $('hDel').disabled = !!d.builtIn;
  $('hDel').textContent = 'Delete';
  $('hFly').textContent = d.id === activeId ? 'Fly this plane' : 'Fly ' + d.name;
}
function chooseFold(key, val) {
  Sfx.scratch();
  let d = findDesign(editId);
  if (d[key] === val) return;
  if (d.builtIn) { d = makeCopy(d); editId = d.id; note('Made your own copy to fold. Rename it above.'); }
  d[key] = val; persist(d);
  buildPlane(d); renderHangar();
}
$('hName').addEventListener('change', () => {
  const d = findDesign(editId); if (d.builtIn) return;
  d.name = ($('hName').value || '').trim().slice(0, 24) || 'My plane'; persist(d);
  if (d.id === activeId) $('hangarBtn').textContent = '✈ ' + d.name;
  renderHangar();
});
$('hCopy').addEventListener('click', () => { Sfx.scratch(); const src = findDesign(editId); const d = makeCopy(src, src.name + ' copy'); editId = d.id; buildPlane(d); renderHangar(); note('Copied. Fold away.'); });
$('hNew').addEventListener('click', () => { Sfx.scratch(); const d = makeCopy(BUILT_IN[0], 'My plane ' + (custom.length + 1)); editId = d.id; buildPlane(d); renderHangar(); note('A fresh sheet. Pick your folds.'); });
let delArmed = 0;
$('hDel').addEventListener('click', () => {
  const d = findDesign(editId); if (d.builtIn) return;
  if (Date.now() - delArmed > 3000) { delArmed = Date.now(); $('hDel').textContent = 'Tap again to delete'; return; }
  delArmed = 0; Sfx.scratch();
  custom = custom.filter(x => x.id !== d.id);
  if (activeId === d.id) activeId = 'b-classic';
  unpersist(d.id);
  editId = activeId; buildPlane(findDesign(editId)); renderHangar(); note('Deleted ' + d.name + '.');
});
$('hFly').addEventListener('click', () => { Sfx.scratch(); setActive(editId); closeHangar(); });
$('hClose').addEventListener('click', () => { Sfx.scratch(); closeHangar(); });
function openHangar() {
  if (S.mode !== 'aim' && S.mode !== 'done') return;
  Sfx.init(); Sfx.scratch();
  if (S.mode === 'done') resetThrow();
  hangarOpen = true; drag = null; input.x = input.y = 0; preview.visible = false;
  editId = activeId; spin = 0.7;
  document.body.classList.add('in-hangar'); $('hangar').hidden = false;
  renderHangar(); note(store.db ? 'Your planes are saved to your account.' : '');
}
function closeHangar() {
  hangarOpen = false; spinDrag = null;
  document.body.classList.remove('in-hangar'); $('hangar').hidden = true;
  buildPlane(findDesign(activeId));
  last = performance.now();
}
$('hangarBtn').addEventListener('click', openHangar);
function showroom(dt, now) {
  const t = now / 1000;
  if (!spinDrag) spin += dt * 0.35;
  plane.position.copy(LAUNCH);
  plane.rotation.set(-0.08 + Math.sin(t * 1.1) * 0.03, spin, Math.sin(t * 0.8) * 0.06, 'YXZ');
  const dist = 1.75;
  camera.position.set(LAUNCH.x + Math.sin(0.5) * dist, LAUNCH.y + 0.55, LAUNCH.z + Math.cos(0.5) * dist);
  camera.lookAt(LAUNCH.x, LAUNCH.y - 0.42, LAUNCH.z);
  skyDome.position.copy(camera.position);
  sky.position.set(camera.position.x, 0, camera.position.z);
  shadow.position.set(plane.position.x, groundAt(plane.position.x, plane.position.z) + 0.05, plane.position.z);
}
// keep designs in the viewer's private storage on this page (falls back to this device)
(async () => {
  try {
    if (!window.claude || typeof window.claude.use !== 'function') return;
    const [user, db] = await Promise.all([window.claude.use('user'), window.claude.use('db')]);
    if (!user || !db) return;
    const uid = await user.id();
    if (!uid) return;
    store.db = db; store.uid = uid;
    const snap = await db.collection('data/users/' + uid).get();
    const remote = snap.docs.filter(x => x.exists && x.id[0] === 'p').map(x => Object.assign({ id: x.id }, clean(x.data() || {})));
    const ids = new Set(remote.map(r => r.id));
    const localOnly = custom.filter(c => !ids.has(c.id));
    custom = remote.concat(localOnly);
    localOnly.forEach(c => persist(c));
    if (!allDesigns().some(d => d.id === activeId)) activeId = 'b-classic';
    saveLocal();
    if (!hangarOpen) setActive(activeId);
    else { renderHangar(); note('Your planes are saved to your account.'); }
  } catch (e) { /* keep this device's copy */ }
})();
