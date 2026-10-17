// Paper Planes · 09-game.js
// Game state, scoring, tricks, rings, birds, input, HUD overlay, resize and the per-frame update.
// Classic script: shares one global scope with the other js/ files, loaded in numeric order.
'use strict';

/* ---------- game state ---------- */
const LOOP_V = 12;
let loopTips = 0;
try { loopTips = +(localStorage.getItem('ppb-looptips') || 0); } catch (e) {}
const S = { tLow: 0, prevIy: 0, warnT: -9, trick: null, style: 0, tricks: 0, air: 0, combo: 0, lastTrick: -9, rings: 0, stars: 0, newStars: 0, ringStreak: 0, lastRing: -9, hold: 0, lowWarned: false, birdHits: 0, mode: 'aim', pos: LAUNCH.clone(), v: 0, g: 0, yaw: 0, bank: 0, stall: 0, stalled: false, r: 1, slide: new THREE.Vector3(), reason: '', stick: false, endT: 0, bounces: 0 };
let simT = 0, invert = false, steered = false, paused = false;
let best = null;
// first-time players start in Harbor City (easiest to navigate); after that, reopen the last world played
let level = 'harbor';
try { if (localStorage.getItem('ppb-level') === 'backyard') level = 'backyard'; } catch (e) {}
const bestKey = () => level === 'backyard' ? 'ppb-best' : 'ppb-best-' + level;
function loadBest() { try { best = JSON.parse(localStorage.getItem(bestKey()) || 'null'); } catch (e) { best = null; } }
loadBest();

const input = { x: 0, y: 0 };
const keys = {};
let drag = null;
let aim = { pull: 0, yaw: 0 };
const AIM_MAX = 60 * D2R;
const camLook = new THREE.Vector3();
const aimCamPos = new THREE.Vector3(), aimCamLook = new THREE.Vector3();
let orbit = 0;
let lastZone = null, zoneCool = {}, toastTimer = 0;

const horiz = p => Math.hypot(p.x, p.z);
const fmt = d => d.toFixed(1);

function setHint(t) { const h = $('hint'); if (t) { $('hintTxt').textContent = t; h.hidden = false; } else h.hidden = true; }
function toast(t) {
  const el = $('toast'); el.textContent = t; el.classList.remove('off'); toastTimer = 1.7;
}
function showBest() {
  $('best').textContent = best ? fmt(best.d) + ' m' : 'none yet';
  if (best) { flag.visible = true; flag.position.set(best.x, 0, best.z); }
}
function aimCamera(yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const rot = (x, z) => [x * c + z * s, -x * s + z * c];
  const [px, pz] = rot(0, 1.9), lx = -px * (14 / 1.9), lz = -pz * (14 / 1.9); // look straight through the plane so it sits centered
  aimCamPos.set(LAUNCH.x + px, LAUNCH.y + 0.55, LAUNCH.z + pz);
  aimCamLook.set(LAUNCH.x + lx, LAUNCH.y - 0.5, LAUNCH.z + lz);
}

function newConditions() {
  if (level === 'harbor') {
    const m = 0.3 + Math.random() * 1.1; breeze.set((Math.random() - 0.5) * m, 0, m * 0.6); // light onshore breeze
    fans.forEach(f => { if (f.kind === 'street') { f.on = Math.random() < 0.7; if (f.streaks) f.streaks.visible = f.on; } });
    return 0;
  }
  if (level === 'classroom') {
    breeze.set(0, 0, 0);
    devils.forEach(d => { d.on = Math.random() < 0.7; });
    fans.forEach(f => { if (f.kind === 'window') { f.on = Math.random() < 0.6; if (f.streaks) f.streaks.visible = f.on; } });
    return 0;
  }
  const m = Math.random() * 1.4, a = Math.random() * Math.PI * 2;
  breeze.set(Math.cos(a) * m, 0, Math.sin(a) * m);
  sprinklers.forEach(s => { s.on = Math.random() < 0.65; s.spray.visible = s.on; });
  const roll = Math.random();
  const count = roll < 0.35 ? 0 : roll < 0.8 ? 1 : 2;
  devils.forEach((d, i) => {
    d.on = i < count; d.grp.visible = d.on;
    if (d.on) {
      const p = polar(30 + Math.random() * 180, (Math.random() * 2 - 1) * 55);
      d.x = p.x; d.z = p.z; d.hd = Math.random() * Math.PI * 2;
    }
  });
  return count;
}

function resetThrow() {
  S.mode = 'aim'; S.stalled = false; S.stall = 0; S.bank = 0; S.g = 0.1; S.yaw = 0; S.pos.copy(LAUNCH); S.bounces = 0;
  aim = { pull: 0, yaw: 0 };
  aimCamera(0);
  input.x = input.y = 0; drag = null;
  const devilsOut = newConditions();
  camBase.copy(aimCamPos); camera.position.copy(aimCamPos); camLook.copy(aimCamLook);
  trailCount = 0; trail.visible = false;
  $('result').hidden = true; $('stall').hidden = true; $('tricks').hidden = true;
  S.style = 0; S.air = 0; S.tricks = 0; S.trick = null; S.rings = 0; S.stars = 0; S.newStars = 0; resetStars(); updateStyleLine();
  rings.forEach(r => { r.got = false; r.t = 0; r.mesh.visible = true; r.mesh.scale.setScalar(1); });
  birds.forEach(b => { b.gone = false; b.near = false; b.g.visible = true; });
  $('dist').textContent = '0.0';
  setHint('Pull back to throw · slide sideways to aim');
  preview.visible = false;
  lastZone = null; zoneCool = {};
  if (devilsOut) toast(devilsOut > 1 ? 'Two dust devils in the yard!' : 'A dust devil is roaming the yard');
  if (level === 'harbor') toast('Harbor City: follow the street down to the sea');
  if (level === 'classroom') toast(devils.some(d => d.on) ? 'Ceiling fans are on: watch for downdrafts' : 'Fans are off: clear skies to the chalkboard');
}

function launch() {
  S.mode = 'fly';
  S.pos.copy(LAUNCH);
  S.v = (LV[level].v0 + aim.pull * LV[level].vr) * PD.launch;
  S.g = 0.03 + aim.pull * 0.03;
  S.yaw = aim.yaw; S.bank = 0; S.stalled = false; S.stall = 0; S.bounces = 0;
  S.trick = null; S.style = 0; S.tricks = 0; S.air = 0; S.combo = 0; S.lastTrick = -9;
  S.rings = 0; S.stars = 0; S.newStars = 0; S.ringStreak = 0; S.lastRing = -9; S.tLow = 0; S.prevIy = 0; S.tipShown = false; S.birdHits = 0;
  updateStyleLine();
  simT = 0; preview.visible = false; trailCount = 0;
  Sfx.whoosh(aim.pull);
  setHint(steered ? '' : 'Drag to steer · snap back fast to loop · double-swipe to roll');
}

function updateStyleLine() { $('styleLine').textContent = `★ ${S.style} · rings ${S.rings}/${rings.length} · stars ${S.stars}/${starsTotal()} · ${S.air.toFixed(1)}s`; }
function heightAboveGround() { return S.pos.y - groundAt(S.pos.x, S.pos.z); }
function award(name, pts) {
  S.combo = simT - S.lastTrick < 2.5 ? Math.min(5, S.combo + 1) : 1; S.lastTrick = simT;
  const got = pts * S.combo; S.style += got; S.tricks++;
  popWord(S.combo > 1 ? `${name} x${S.combo}` : name, S.pos, S.combo > 1 ? '#f1b2a9' : '#ffd84a', 1.25);
  Sfx.lift(); updateStyleLine();
}
function startTrick(type, dir = 0, quiet = false) {
  if (S.mode !== 'fly' || S.trick) return false;
  Sfx.init();
  if (type === 'loop') {
    if (heightAboveGround() < 6) { if (!quiet) toast('Get a little higher for a loop'); return false; }
    S.trick = { type, t: 0, dur: 1.35, R: 3.4, p0: S.pos.clone(), g0: Math.max(-0.2, Math.min(0.2, S.g)), v0: S.v, fwd: 4 + S.v * 0.35, vis: 0 };
    Sfx.whoosh(1);
  } else {
    if (heightAboveGround() < 2.5) { if (!quiet) toast('Too low to roll'); return false; }
    S.trick = { type, t: 0, dur: 0.6, dir: dir || (S.bank < -0.05 ? -1 : 1), vis: 0, side: 0 };
    Sfx.whoosh(0.6);
  }
  return true;
}
let lastSwipe = null;
function registerSwipe(dir) {
  const now = performance.now();
  if (lastSwipe && lastSwipe.dir === dir && now - lastSwipe.t < 600) { lastSwipe = null; startTrick('roll', dir); }
  else lastSwipe = { dir, t: now };
}
// rings, birds
function checkRings(a, b) {
  for (const r of rings) {
    if (r.got) continue;
    const sa = (a.x - r.c.x) * r.n.x + (a.z - r.c.z) * r.n.z, sb = (b.x - r.c.x) * r.n.x + (b.z - r.c.z) * r.n.z;
    if ((sa > 0) === (sb > 0) || sa === sb) continue;
    const k = sa / (sa - sb);
    const px = a.x + (b.x - a.x) * k, py = a.y + (b.y - a.y) * k, pz = a.z + (b.z - a.z) * k;
    if (Math.hypot(px - r.c.x, py - r.c.y, pz - r.c.z) < r.R) {
      r.got = true; r.t = 0; S.rings++;
      S.ringStreak = simT - S.lastRing < 6 ? S.ringStreak + 1 : 1; S.lastRing = simT;
      S.style += 100 * Math.min(5, S.ringStreak);
      S.v = Math.min(S.v + 2.5, 20); Sfx.whoosh(0.35); // ring boost: a little burst of speed
      popWord(S.ringStreak > 1 ? `RING x${Math.min(5, S.ringStreak)}` : 'RING!', r.c, '#ffd84a', 1.2);
      Sfx.ring(S.ringStreak); spawnPuffs(r.c, 8, '#f2c14e'); updateStyleLine();
    }
  }
}
function checkBirds() {
  const rolling = S.trick && S.trick.type === 'roll';
  for (const b of birds) {
    if (b.gone) continue;
    const d = b.pos.distanceTo(S.pos);
    if (d < 1.15 && !rolling) {
      b.gone = true;
      b.vel.set(b.pos.x - S.pos.x, 3, b.pos.z - S.pos.z).normalize().multiplyScalar(9);
      S.v *= 0.65; S.g = Math.min(S.g, -0.35); S.bank += (Math.random() - 0.5) * 1.4; S.trick = null;
      S.style = Math.max(0, S.style - 75); S.birdHits++;
      popWord('SQUAWK!', S.pos, '#f1b2a9', 1.2); Sfx.squawk(); spawnPuffs(S.pos, 7, '#ffffff'); shake = RM ? 0 : 0.25;
      updateStyleLine();
      return;
    }
    if (d < 2.8 && !b.near) { b.near = true; S.style += 25; popWord('CLOSE!', S.pos, '#c6e2ff', 0.9); updateStyleLine(); }
  }
}
function stepLoop(h) {
  const tr = S.trick; tr.t += h;
  const k = Math.min(1, tr.t / tr.dur), th = k * Math.PI * 2;
  const hx = -Math.sin(S.yaw), hz = -Math.cos(S.yaw), along = tr.R * Math.sin(th) + tr.fwd * k;
  S.pos.set(tr.p0.x + hx * along, tr.p0.y + tr.R * (1 - Math.cos(th)), tr.p0.z + hz * along);
  tr.vis = th; S.bank *= 0.9;
  if (k >= 1) { S.trick = null; S.g = tr.g0; S.v = tr.v0 * 0.88; award('LOOP!', 250); }
}
$('loopBtn').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); startTrick('loop'); });
$('rollBtn').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); startTrick('roll'); });
function inPool(p) { return pools.find(o => Math.hypot(p.x - o.x, p.z - o.z) < o.r); }
function land() {
  const gh = groundAt(S.pos.x, S.pos.z);
  if (level === 'harbor' && Math.hypot(S.pos.x, S.pos.z) >= SHORE_R) { // splashdown
    S.pos.y = SEA_Y + 0.05; S.slide.set(0, 0, 0); S.g = 0;
    S.reason = Math.hypot(S.pos.x, S.pos.z) < SHORE_R + 120 ? 'Splashdown in the harbor' : 'Splashdown at sea';
    popWord('SPLASH!', S.pos, '#a9d0f5'); spawnPuffs(S.pos, 8, '#ffffff'); Sfx.splash(); S.mode = 'slide'; S.endT = 0; return;
  }
  if (level === 'backyard' && Math.hypot(S.pos.x, S.pos.z) >= RIM_R) { // touched down somewhere past the rim
    S.pos.y = gh + 0.05; S.slide.set(0, 0, 0); S.g = 0;
    S.reason = gh > 30 ? 'Made it to the far rim!' : gh > FLOOR + 12 ? 'Touched down on a mesa' : 'Landed on the canyon floor';
    spawnPuffs(S.pos, 6, '#e3a46e'); Sfx.skid(4); S.mode = 'slide'; S.endT = 0; return;
  }
  S.pos.y = 0.02;
  if (inPool(S.pos)) { splash(); return; }
  const cg = Math.cos(S.g);
  windAt(S.pos, simT, _w);
  S.slide.set(-Math.sin(S.yaw) * cg * S.v + _w.x, 0, -Math.cos(S.yaw) * cg * S.v + _w.z);
  spawnPuffs(S.pos, 6);
  if (S.g < -0.7) { S.slide.multiplyScalar(0.15); S.reason = 'Nose-dived into the lawn'; popWord('THUD!', S.pos, '#f1b2a9', 1.05); Sfx.thud(); shake = RM ? 0 : 0.12; }
  else { S.reason = S.v > 11 ? 'Skidded in hot' : 'Smooth landing'; Sfx.skid(S.slide.length()); }
  S.mode = 'slide'; S.endT = 0;
}
function splash() {
  S.pos.y = 0.3; S.slide.set(0, 0, 0); S.g = -0.15;
  S.mode = 'slide'; S.endT = 0;
  if (level === 'classroom') {
    S.reason = 'Swish! Right into the trash can';
    popWord('SWISH!', S.pos, '#ffd84a'); Sfx.fanfare();
  } else {
    S.reason = 'Splash! Soggy landing in the kiddie pool';
    popWord('SPLASH!', S.pos, '#a9d0f5'); spawnPuffs(S.pos, 8, '#2b4fbf'); Sfx.splash();
  }
}
function crash(o) {
  S.trick = null;
  if (o.roof && prevPos.y >= o.max[1] - 0.7) { // came down on top of a building
    S.reason = 'Landed on a rooftop'; S.stick = true; S.mode = 'crash'; S.endT = 0; S.pos.y = Math.max(S.pos.y, o.max[1] + 0.05);
    popWord('ROOFTOP!', S.pos, '#f2d27a'); Sfx.skid(3); return;
  }
  S.reason = o.msg; S.stick = !!o.stick; S.mode = 'crash'; S.endT = 0;
  if (o.stick) { popWord('CRUNCH!', S.pos, '#cfe2b0'); Sfx.rustle(); shake = RM ? 0 : 0.12; }
  else { popWord('BONK!', S.pos, '#ffd84a'); Sfx.bonk(); shake = RM ? 0 : 0.3; }
}
function finish() {
  S.mode = 'done'; S.trick = null; $('tricks').hidden = true;
  const d = horiz(S.pos);
  if (!best || d > best.d) {
    best = { d, x: S.pos.x, z: S.pos.z };
    try { localStorage.setItem(bestKey(), JSON.stringify(best)); } catch (e) {}
  }
  showBest();
  // casual scoring: tricks + time in the air + a little for distance
  const style = S.style + Math.round(S.air * 10) + Math.round(d);
  let bestStyle = 0;
  const bsKey = level === 'backyard' ? 'ppb-beststyle' : 'ppb-beststyle-' + level;
  try { bestStyle = +(localStorage.getItem(bsKey) || 0); } catch (e) {}
  const isBest = style > bestStyle;
  if (isBest) { bestStyle = style; try { localStorage.setItem(bsKey, String(style)); } catch (e) {} }
  $('why').textContent = S.reason;
  $('final').textContent = style.toLocaleString();
  $('stats2').textContent = `${S.rings}/${rings.length} rings · ${S.stars}/${starsTotal()} stars · ${S.tricks} trick${S.tricks === 1 ? '' : 's'} · ${S.birdHits} bird${S.birdHits === 1 ? '' : 's'} hit · ${fmt(d)} m · ${S.air.toFixed(1)}s`;
  const WN = { backyard: 'the Backyard', harbor: 'Harbor City', classroom: 'the classroom' }[level];
  $('starsFound').textContent = starsTotal() ? `Stars found in ${WN}: ${starsFound()}/${starsTotal()}` + (S.newStars ? ` (${S.newStars} new!)` : '') : '';
  $('starsFound').classList[S.newStars ? 'add' : 'remove']('fresh');
  const sub = $('sub');
  sub.textContent = isBest ? 'New best!' : 'best ★ ' + bestStyle.toLocaleString();
  sub.className = 'sub' + (isBest ? ' newbest' : '');
  if (isBest && style > 50) { popWord('NEW BEST!', S.pos, '#f1b2a9', 1.5); spawnConfetti(); Sfx.fanfare(); }
  $('stall').hidden = true;
  setHint('');
  $('result').hidden = false;
  $('again').focus({ preventScroll: true });
}

/* ---------- preview ---------- */
const ghost = { pos: new THREE.Vector3(), v: 0, g: 0, yaw: 0, bank: 0, stall: 0, stalled: false, r: 1 };
function updatePreview() {
  ghost.pos.copy(LAUNCH); ghost.v = (LV[level].v0 + aim.pull * LV[level].vr) * PD.launch; ghost.g = 0.03 + aim.pull * 0.03; ghost.yaw = aim.yaw; ghost.bank = 0; ghost.stall = 0; ghost.stalled = false;
  const arr = previewGeom.attributes.position.array;
  arr[0] = ghost.pos.x; arr[1] = ghost.pos.y; arr[2] = ghost.pos.z;
  let n = 1, t = 0;
  for (let i = 0; i < 420 && n < MAXP; i++) {
    stepFlight(ghost, 1 / 60, 0, 0, t); t += 1 / 60;
    const done = ghost.pos.y <= groundAt(ghost.pos.x, ghost.pos.z) + 0.02 || collide(ghost.pos);
    if (i % 3 === 2 || done) { arr[n * 3] = ghost.pos.x; arr[n * 3 + 1] = Math.max(0.03, ghost.pos.y); arr[n * 3 + 2] = ghost.pos.z; n++; }
    if (done) break;
  }
  previewGeom.setDrawRange(0, n);
  previewGeom.attributes.position.needsUpdate = true;
  previewGeom.computeBoundingSphere();
  preview.computeLineDistances();
  preview.visible = true;
}

/* ---------- input ---------- */
const STICK_R = 64;
cv.addEventListener('pointerdown', e => {
  if (hangarOpen) { spinDrag = { x: e.clientX, s: spin }; try { cv.setPointerCapture(e.pointerId); } catch (err) {} return; }
  if (drag || paused) return;
  if (S.mode === 'aim') drag = { kind: 'aim', id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, yaw0: aim.yaw };
  else if (S.mode === 'fly') { drag = { kind: 'stick', id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now() }; steered = true; if (!$('hint').hidden) setHint(''); }
  else return;
  try { cv.setPointerCapture(e.pointerId); } catch (err) {}
  e.preventDefault();
});
cv.addEventListener('pointermove', e => {
  if (hangarOpen && spinDrag) { spin = spinDrag.s + (e.clientX - spinDrag.x) * 0.012; return; }
  if (!drag || e.pointerId !== drag.id) return;
  drag.x = e.clientX; drag.y = e.clientY;
  const dx = drag.x - drag.x0, dy = drag.y - drag.y0;
  if (drag.kind === 'aim') {
    aim.pull = clamp(dy / (innerHeight * 0.32), 0, 1);
    // slingshot: pull left to aim right; gentle near center, up to 60° each way
    const nx = clamp(dx / (innerWidth * 0.42), -1, 1);
    aim.yaw = Math.sign(nx) * Math.pow(Math.abs(nx), 1.25) * AIM_MAX;
    aimCamera(aim.yaw);
    if (aim.pull > 0.04) updatePreview(); else preview.visible = false;
  } else {
    input.x = clamp(dx / STICK_R, -1, 1);
    input.y = clamp(-dy / STICK_R, -1, 1);
  }
});
function endDrag(e) {
  if (hangarOpen) { spinDrag = null; return; }
  if (!drag || e.pointerId !== drag.id) return;
  if (drag.kind === 'aim') {
    if (aim.pull > 0.06 && S.mode === 'aim') launch();
    else { aim.pull = 0; preview.visible = false; }
  } else {
    input.x = 0; input.y = 0;
    const dur = performance.now() - (drag.t0 || 0), dx = drag.x - drag.x0, dy = drag.y - drag.y0;
    if (dur < 280 && Math.abs(dx) > 32 && Math.abs(dx) > Math.abs(dy) * 1.4) registerSwipe(Math.sign(dx));
  }
  drag = null;
}
cv.addEventListener('pointerup', endDrag);
cv.addEventListener('pointercancel', endDrag);
addEventListener('keydown', e => {
  keys[e.key] = true;
  if (hangarOpen) { if (e.key === 'Escape') closeHangar(); return; }
  if (paused) { if (e.key === 'Escape') closeGuide(); return; }
  if (S.mode === 'aim' && (e.key === ' ' || e.key === 'Enter')) { aim.pull = 0.75; launch(); }
  else if (S.mode === 'fly' && (e.key === 'q' || e.key === 'Q')) startTrick('roll');
  else if (S.mode === 'fly' && (e.key === 'e' || e.key === 'E' || e.key === ' ')) startTrick('loop');
  else if (S.mode === 'done' && e.key === ' ') resetThrow();
  if (e.key.startsWith('Arrow')) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.key] = false; });
$('invert').addEventListener('click', () => {
  invert = !invert; Sfx.scratch();
  $('invert').textContent = invert ? 'Drag up = dive' : 'Drag up = climb';
  try { localStorage.setItem('ppb-invert', invert ? '1' : '0'); } catch (e) {}
});
try { if (localStorage.getItem('ppb-invert') === '1') { invert = true; $('invert').textContent = 'Drag up = dive'; } } catch (e) {}
$('again').addEventListener('click', () => { Sfx.init(); Sfx.scratch(); resetThrow(); });
function syncMute() { $('muteBtn').textContent = Sfx.muted ? 'Sound off' : 'Sound on'; }
syncMute();
$('muteBtn').addEventListener('click', () => {
  Sfx.init(); Sfx.setMuted(!Sfx.muted); syncMute(); Sfx.scratch();
  try { localStorage.setItem('ppb-mute', Sfx.muted ? '1' : '0'); } catch (e) {}
});
function openGuide() { Sfx.scratch(); paused = true; drag = null; input.x = input.y = 0; $('guide').hidden = false; $('guideClose').focus({ preventScroll: true }); }
function closeGuide() { Sfx.scratch(); paused = false; $('guide').hidden = true; last = performance.now(); }
$('guideBtn').addEventListener('click', openGuide);
$('guideClose').addEventListener('click', closeGuide);
$('guide').addEventListener('click', e => { if (e.target === $('guide')) closeGuide(); });

/* ---------- overlay drawing (pencil gestures) ---------- */
function wobblyCircle(cx, cy, r, seed) {
  seed += shared.uBoil.value * 0.9;
  octx.beginPath();
  for (let i = 0; i <= 44; i++) {
    const a = i / 40 * Math.PI * 2;
    const rr = r + Math.sin(a * 3 + seed) * 2 + Math.sin(a * 7 + seed * 2) * 1.2;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    i ? octx.lineTo(x, y) : octx.moveTo(x, y);
  }
  octx.stroke();
}
function drawAimGauge() {
  // protractor along the bottom: shows the aim angle out of ±60°
  const cx = innerWidth / 2, cy = innerHeight - 70 - (parseFloat(getComputedStyle(document.documentElement).paddingBottom) || 0), R = 58;
  octx.save();
  octx.strokeStyle = '#2a2a30'; octx.fillStyle = 'rgba(255,254,249,0.85)'; octx.lineWidth = 2;
  octx.beginPath(); octx.moveTo(cx, cy);
  octx.arc(cx, cy, R + 8, -Math.PI / 2 - AIM_MAX, -Math.PI / 2 + AIM_MAX); octx.closePath(); octx.fill(); octx.stroke();
  octx.lineWidth = 1.5;
  for (let d = -60; d <= 60; d += 15) {
    const a = -Math.PI / 2 + d * D2R, r0 = d % 30 === 0 ? R - 10 : R - 5;
    octx.beginPath(); octx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); octx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); octx.stroke();
  }
  const deg = -aim.yaw / D2R, na = -Math.PI / 2 + deg * D2R;
  octx.strokeStyle = '#2b4fbf'; octx.lineWidth = 3; octx.lineCap = 'round';
  octx.beginPath(); octx.moveTo(cx, cy); octx.lineTo(cx + Math.cos(na) * (R + 4), cy + Math.sin(na) * (R + 4)); octx.stroke();
  octx.fillStyle = '#2a2a30'; octx.font = '700 18px Kalam, "Patrick Hand", cursive'; octx.textAlign = 'center';
  const ad = Math.round(Math.abs(deg));
  octx.fillText(ad < 1 ? 'straight' : `${ad}° ${deg > 0 ? 'right' : 'left'}`, cx, cy + 20);
  octx.restore();
}
function drawSpeedLines() {
  if (S.mode !== 'fly' || RM) return;
  const a = clamp((S.v - 10) / 6, 0, 1);
  if (a <= 0) return;
  let seed = shared.uBoil.value * 7919 + 1;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const cx = innerWidth / 2, cy = innerHeight * 0.45, diag = Math.hypot(innerWidth, innerHeight) / 2;
  octx.save(); octx.strokeStyle = look ? '#ffffff' : '#2a2a30'; octx.lineCap = 'round';
  for (let i = 0; i < 20; i++) {
    const ang = rnd() * Math.PI * 2, r1 = diag * (0.62 + rnd() * 0.12), r2 = r1 - diag * (0.08 + rnd() * 0.14) * (0.5 + a);
    octx.globalAlpha = (0.11 + rnd() * 0.13) * a; octx.lineWidth = 1 + rnd() * 2.5;
    octx.beginPath(); octx.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1); octx.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2); octx.stroke();
  }
  octx.restore();
}
function drawConfetti() {
  if (!confetti.length) return;
  octx.save(); octx.lineWidth = 2.5; octx.lineCap = 'round';
  confetti.forEach(p => {
    octx.strokeStyle = p.c;
    const c = Math.cos(p.r) * p.l / 2, s = Math.sin(p.r) * p.l / 2;
    octx.beginPath(); octx.moveTo(p.x - c, p.y - s); octx.lineTo(p.x - s * 0.4, p.y + c * 0.4); octx.lineTo(p.x + c, p.y + s); octx.stroke();
  });
  octx.restore();
}
function drawOverlay() {
  octx.setTransform(DPR, 0, 0, DPR, 0, 0);
  octx.clearRect(0, 0, innerWidth, innerHeight);
  drawSpeedLines();
  drawConfetti();
  if (!drag) return;
  octx.lineCap = 'round'; octx.lineJoin = 'round';
  if (drag.kind === 'aim') {
    // slingshot: a clean anchor where the thumb first touched, with an elastic band to the thumb
    const stretch = Math.min(1, Math.hypot(drag.x - drag.x0, drag.y - drag.y0) / 160);
    octx.strokeStyle = '#2b4fbf'; octx.globalAlpha = 0.85; octx.lineWidth = 2.5 - stretch * 1.2;
    octx.beginPath(); octx.moveTo(drag.x0 - 11, drag.y0); octx.quadraticCurveTo((drag.x0 - 11 + drag.x) / 2, (drag.y0 + drag.y) / 2 + 6 * (1 - stretch), drag.x, drag.y);
    octx.moveTo(drag.x0 + 11, drag.y0); octx.quadraticCurveTo((drag.x0 + 11 + drag.x) / 2, (drag.y0 + drag.y) / 2 + 6 * (1 - stretch), drag.x, drag.y); octx.stroke();
    octx.globalAlpha = 1;
    octx.fillStyle = 'rgba(255,254,249,0.85)'; octx.strokeStyle = '#2b4fbf'; octx.lineWidth = 2;
    octx.beginPath(); octx.arc(drag.x0, drag.y0, 11, 0, Math.PI * 2); octx.fill(); octx.stroke();
    octx.fillStyle = '#2b4fbf'; octx.beginPath(); octx.arc(drag.x0, drag.y0, 3, 0, Math.PI * 2); octx.fill();
    octx.fillStyle = '#2b4fbf';
    octx.beginPath(); octx.arc(drag.x, drag.y, 9, 0, Math.PI * 2); octx.fill();
    octx.font = '700 22px Kalam, "Patrick Hand", cursive'; octx.textAlign = 'center';
    octx.fillText(Math.round(aim.pull * 100) + '%', drag.x, drag.y - 20);
    drawAimGauge();
  } else {
    octx.strokeStyle = '#2a2a30'; octx.globalAlpha = 0.55; octx.lineWidth = 2.5;
    wobblyCircle(drag.x0, drag.y0, STICK_R, 2);
    octx.globalAlpha = 0.35; octx.lineWidth = 1.5;
    octx.beginPath(); octx.moveTo(drag.x0 - STICK_R, drag.y0); octx.lineTo(drag.x0 + STICK_R, drag.y0);
    octx.moveTo(drag.x0, drag.y0 - STICK_R); octx.lineTo(drag.x0, drag.y0 + STICK_R); octx.stroke();
    octx.globalAlpha = 0.9; octx.fillStyle = '#2b4fbf';
    octx.beginPath(); octx.arc(drag.x0 + input.x * STICK_R, drag.y0 - input.y * STICK_R, 15, 0, Math.PI * 2); octx.fill();
    octx.globalAlpha = 1;
  }
}

/* ---------- background: notebook paper (sketch look only) ---------- */
// named apart from paperTexture(id) in 06-plane.js: all js/ files share one global scope
function notebookBackground() {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.floor(innerWidth * DPR)); c.height = Math.max(2, Math.floor(innerHeight * DPR));
  const x = c.getContext('2d');
  x.fillStyle = '#fbfaf4'; x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = '#c9d8ee'; x.lineWidth = 1.5 * DPR;
  for (let y = 70 * DPR; y < c.height; y += 30 * DPR) { x.beginPath(); x.moveTo(0, y); x.lineTo(c.width, y); x.stroke(); }
  x.strokeStyle = '#efb1aa'; x.lineWidth = 2 * DPR;
  const mx = Math.min(64, innerWidth * 0.12) * DPR;
  x.beginPath(); x.moveTo(mx, 0); x.lineTo(mx, c.height); x.stroke();
  return new THREE.CanvasTexture(c);
}

function skyTexture() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, SKY_TOP); g.addColorStop(0.55, '#b9daf2'); g.addColorStop(1, SKY_HORIZON);
  x.fillStyle = g; x.fillRect(0, 0, 4, 256);
  return new THREE.CanvasTexture(c);
}
const skyU = { uTop: { value: new THREE.Color(SKY_TOP) }, uHor: { value: new THREE.Color(SKY_HORIZON) }, uSunDir: { value: shared.uLight.value }, uSunCol: { value: new THREE.Color('#fff7ea') } };
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(2800, 32, 16), new THREE.ShaderMaterial({
  uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader: `uniform vec3 uTop;uniform vec3 uHor;uniform vec3 uSunDir;uniform vec3 uSunCol;varying vec3 vD;
void main(){float h=clamp(vD.y,0.0,1.0);vec3 c=mix(uHor,uTop,pow(h,0.55));
float s=max(dot(normalize(vD),uSunDir),0.0);c+=uSunCol*(pow(s,700.0)*1.2+pow(s,12.0)*0.18);
if(vD.y<0.0)c=uHor;gl_FragColor=vec4(c,1.0);}`
}));
skyDome.renderOrder = -10; skyDome.frustumCulled = false;
scene.add(skyDome);
function setBackground() {
  if (scene.background && scene.background.dispose) scene.background.dispose();
  scene.background = look ? new THREE.Color(FOG_COL) : notebookBackground();
  skyDome.visible = !!look;
}
function setLook(v) {
  look = v; shared.uLook.value = v;
  looks.forEach(l => { l.mesh.material = v ? l.sb : l.sk; l.mesh.castShadow = !!v && l.cast; l.mesh.receiveShadow = !!v; });
  softLines.forEach(m => { m.visible = !v; });
  sbHide.forEach(m => { m.visible = !v; });
  hullMeshes.forEach(m => { m.visible = !v; });
  ground.material = v ? groundSb : groundSk;
  sunLight.castShadow = !!v;
  PAPER.set(v ? FOG_COL : '#fbfaf4');
  INK.set(v ? GOUACHE_INK : '#2a2a30');
  scene.fog = v ? new THREE.FogExp2(FOG_COL, LOOK.fogD) : new THREE.Fog('#fbfaf4', FOG_NEAR, FOG_FAR);
  const fn = v ? 60 : FOG_NEAR, ff = v ? 700 : FOG_FAR;
  shared.uFogNear.value = fn; shared.uFogFar.value = ff;
  shadowFrames = 3;
  skySprites.forEach(o => { o.s.material.map = v ? o.sb : o.sk; o.s.material.needsUpdate = true; });
  skySprites[skySprites.length - 1].s.visible = !v; // the painted sky draws its own sun
  arcMat.color.set(v ? '#ffffff' : '#2a2a30'); arcMat.opacity = v ? 0.6 : 0.4;
  trail.material = v ? trailSb : trailSk;
  document.querySelector('.grain').style.opacity = v ? '0' : '0.55';
  $('lookBtn').textContent = v ? 'Look: Storybook' : 'Look: Sketch';
  setBackground();
  try { localStorage.setItem('ppb-look', v ? 'sb' : 'sketch'); } catch (e) {}
}
let fogBase = [74, 234];
function setLevel(id) {
  level = id;
  const L = LV[id];
  byGroup.visible = id === 'backyard'; clGroup.visible = id === 'classroom'; hbGroup.visible = id === 'harbor';
  ACTIVE = id;
  if (L.rings) { rings.length = 0; rings.push(...L.rings); }
  if (L.birds) { birds.length = 0; birds.push(...L.birds); }
  Object.keys(REG).forEach(k => { REG[k].length = 0; REG[k].push(...L[k]); });
  LAUNCH.set(L.launch[0], L.launch[1], L.launch[2]);
  GUST.z0 = L.gust[0]; GUST.z1 = L.gust[1];
  const fn = L.fog ? L.fog[0] : 20 + (1 - LOOK.haze) * 120, ff = L.fog ? L.fog[1] : 90 + (1 - LOOK.haze) * 320;
  if (!look) { scene.fog.near = fn; scene.fog.far = ff; shared.uFogNear.value = fn; shared.uFogFar.value = ff; }
  fogBase = [fn, ff];
  shadowFrames = 3;
  try { localStorage.setItem('ppb-level', id); } catch (e) {}
  $('levelBtn').textContent = 'World: ' + ({ backyard: 'Backyard', harbor: 'Harbor City', classroom: 'Classroom' })[id];
  loadBest(); flag.visible = false; showBest();
}
$('levelBtn').addEventListener('click', () => { Sfx.init(); Sfx.scratch(); setLevel(level === 'backyard' ? 'harbor' : 'backyard'); resetThrow(); });
$('lookBtn').addEventListener('click', () => { Sfx.init(); Sfx.scratch(); setLook(look ? 0 : 1); });

/* ---------- resize ---------- */
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  const sd = sceneDPR(); // 3D pixel ratio (lowered by the quality governor); the HUD overlay keeps DPR
  renderer.setPixelRatio(sd);
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 0.8 ? 70 : 60;
  camera.updateProjectionMatrix();
  ov.width = innerWidth * DPR; ov.height = innerHeight * DPR;
  shared.uPx.value = sd;
  shared.uRes.value.set(innerWidth * sd, innerHeight * sd);
  if (typeof makeTarget === 'function' && postU) makeTarget();
  setBackground();
}
addEventListener('resize', resize);

/* ---------- per-frame ---------- */
const tmpV = new THREE.Vector3(), prevPos = new THREE.Vector3();
const lookT = new THREE.Vector3();
function update(dt, now) {
  const tt = now / 1000;
  if (level === 'backyard' && !look) { // (sketch look only) the view opens up past the hedge
    const fk = clamp((horiz(camera.position) - (RIM_R - 34)) / 60, 0, 1), e = fk * fk * (3 - 2 * fk);
    const fn = fogBase[0] + (300 - fogBase[0]) * e, ff = fogBase[1] + (1900 - fogBase[1]) * e;
    scene.fog.near = fn; scene.fog.far = ff; shared.uFogNear.value = fn; shared.uFogFar.value = ff;
  }
  shared.uBoil.value = (RM || look) ? 0 : Math.floor(now / 170) % 97;
  if (shadowFrames > 0) { renderer.shadowMap.needsUpdate = true; shadowFrames--; }
  updateFx(dt); updateConfetti(dt);
  Sfx.update(S.mode, S.v, S.stall);
  if (S.mode === 'fly') { trailTick += dt; if (trailTick > 0.05) { trailTick = 0; pushTrail(S.pos); } }

  animateStars(dt, tt);
  rings.forEach(r => { if (r.got && r.mesh.visible) { r.t += dt; r.mesh.scale.setScalar(1 + r.t * 2.5); if (r.t > 0.3) r.mesh.visible = false; } });
  if (level !== 'classroom') birds.forEach(b => {
    if (b.gone) { b.pos.addScaledVector(b.vel, dt); b.vel.y += dt * 2; if (b.pos.y > 120) b.g.visible = false; }
    else {
      const a = b.ph + tt * b.w;
      b.pos.set(b.cx + Math.cos(a) * b.R, b.y + Math.sin(tt * 1.3 + b.ph * 3) * 0.6, b.cz + Math.sin(a) * b.R);
      const sg = Math.sign(b.w), tx = -Math.sin(a) * sg, tz = Math.cos(a) * sg;
      b.g.rotation.set(0, Math.atan2(-tx, -tz), sg * 0.35, 'YXZ');
    }
    b.g.position.copy(b.pos);
    const fl = Math.sin(tt * (b.gone ? 16 : 9) + b.flap) * 0.65;
    b.L.rotation.z = fl; b.Rw.rotation.z = -fl;
  });
  seaU.uTime.value = tt;
  if (level === 'harbor') harborBobs.forEach(b => {
    if (b.cloth) { b.g.rotation.x = Math.sin(tt * 2.2 + b.ph) * 0.18; b.g.rotation.z = Math.sin(tt * 1.6 + b.ph) * 0.06; }
    else { b.g.position.y = b.y + Math.sin(tt * 1.3 + b.ph) * 0.15; b.g.rotation.z = Math.sin(tt * 1.1 + b.ph) * 0.05; b.g.rotation.x = Math.sin(tt * 0.9 + b.ph * 2) * 0.03; }
  });
  // trees sway gently with the breeze
  if (!RM) {
    const bx = breeze.x * 0.35, bz = breeze.z * 0.35;
    swayers.forEach(t => t.crowns.forEach(({ c, base, k, lag }) => {
      const a = Math.sin(tt * 1.25 + t.ph + lag) * 0.6 + Math.sin(tt * 2.9 + t.ph * 1.7 + lag) * 0.25;
      const amp = 0.14 * t.s * k;
      c.position.set(base.x + (a * amp) + bx * 0.25 * t.s * k, base.y + Math.sin(tt * 2.1 + t.ph + lag) * 0.04 * t.s, base.z + Math.cos(tt * 1.05 + t.ph + lag) * amp * 0.6 + bz * 0.25 * t.s * k);
      c.rotation.z = -a * 0.025; c.rotation.x = Math.cos(tt * 1.05 + t.ph + lag) * 0.015;
      const br = 1 + Math.sin(tt * 1.7 + t.ph + lag) * 0.012; c.scale.set(br, 1 / br, br);
    }));
  }
  // dust devils wander (also while aiming, so you can watch them)
  devils.forEach(d => {
    if (d.fixed) { if (d.on) d.blades.rotation.y -= dt * 7; return; }
    if (!d.on) return;
    d.hd += (Math.random() - 0.5) * dt * 1.6;
    const r = Math.hypot(d.x, d.z), a = Math.atan2(d.x, -d.z) / D2R;
    if (r < 25 || r > RIM_R - 25 || Math.abs(a) > 58) {
      const back = Math.atan2(-d.x + polar(120, 0).x, -d.z + polar(120, 0).z);
      d.hd += Math.sin(back - d.hd) * dt * 1.5;
    }
    d.x += Math.sin(d.hd) * 1.4 * dt; d.z += Math.cos(d.hd) * 1.4 * dt;
    d.grp.position.set(d.x, 0, d.z);
    d.grp.rotation.y -= dt * 5;
  });

  if (S.mode === 'fly' && !drag) {
    const kx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
    const ky = (keys.ArrowUp || keys.w ? 1 : 0) - (keys.ArrowDown || keys.s ? 1 : 0);
    if (kx || ky) steered = true;
    input.x += (kx - input.x) * Math.min(1, dt * 8);
    input.y += (ky - input.y) * Math.min(1, dt * 8);
  }
  if (S.mode === 'aim' && !drag) {
    const kx = (keys.ArrowLeft || keys.a ? 1 : 0) - (keys.ArrowRight || keys.d ? 1 : 0);
    if (kx) { aim.yaw = clamp(aim.yaw + kx * dt * 0.9, -AIM_MAX, AIM_MAX); aimCamera(aim.yaw); }
  }

  if (S.mode === 'aim') {
    const back = aim.pull;
    plane.position.set(LAUNCH.x + Math.sin(aim.yaw) * back * 0.6, LAUNCH.y - back * 0.12, LAUNCH.z + Math.cos(aim.yaw) * back * 0.6);
    plane.rotation.set(0.05 + back * 0.03, aim.yaw, Math.sin(now * 0.002) * 0.04, 'YXZ');
  } else if (S.mode === 'fly') {
    const n = Math.ceil(dt / (1 / 120)), h = dt / n;
    const iy = input.y * (invert ? -1 : 1);
    const zone = zoneAt(S.pos);
    for (let i = 0; i < n; i++) {
      prevPos.copy(S.pos);
      if (S.trick && S.trick.type === 'loop') stepLoop(h); else stepFlight(S, h, input.x, iy, simT);
      if (S.trick && S.trick.type === 'roll') { // a roll also hops you sideways (dodge birds)
        const tr = S.trick, k = Math.min(1, tr.t / tr.dur), sp = 6.5 * Math.sin(Math.PI * k) * Math.PI / 2 / tr.dur * h;
        S.pos.x += Math.cos(S.yaw) * tr.dir * sp; S.pos.z += -Math.sin(S.yaw) * tr.dir * sp;
      }
      if (level !== 'classroom') { checkRings(prevPos, S.pos); checkStars(prevPos, S.pos); checkBirds(); }
      S.bank += (Math.random() - 0.5) * h * 5 * S.stall;
      if (zone === 'devil') S.bank += Math.sin(simT * 15) * h * 3;
      simT += h;
      const hit = collide(S.pos);
      if (hit) { crash(hit); break; }
      const tr = tramps.find(o => Math.hypot(S.pos.x - o.x, S.pos.z - o.z) < o.r);
      if (tr && S.pos.y < tr.y + 0.08 && S.pos.y > tr.y - 0.25 && Math.sin(S.g) < 0) {
        if (S.bounces < 4) {
          S.bounces++;
          S.g = clamp(-S.g * 0.8 + 0.3, 0.3, 0.9); S.v = S.v * 0.85 + 2.5; S.pos.y = tr.y + 0.1;
          popWord(S.bounces === 1 ? 'BOING!' : 'BOING'.padEnd(5 + S.bounces, 'G') + '!', S.pos, '#ffd84a'); Sfx.boing();
        } else { S.pos.y = tr.y + 0.05; S.slide.set(0, 0, 0); S.reason = tr.kind === 'beanbag' ? 'Sank into the beanbag' : 'Settled on the trampoline'; S.mode = 'slide'; S.endT = 0; break; }
      }
      const pl = inPool(S.pos);
      if (pl && S.pos.y < (pl.h || 0.32)) { splash(); break; }
      if (S.pos.y <= groundAt(S.pos.x, S.pos.z) + 0.02) { land(); break; }
      if (horiz(S.pos) > 1330) { S.reason = level === 'harbor' ? 'Sailed off toward the horizon' : 'Soared out over the far rim!'; finish(); break; }
    }
    if (S.mode === 'fly') {
      S.air += dt; updateStyleLine();
      // loop = a fast snap back on the stick with enough speed (a slow pull just climbs, and can stall)
      if (iy < 0.3) S.tLow = simT;
      const snapped = iy > 0.85 && S.prevIy <= 0.85 && simT - S.tLow < 0.25;
      S.prevIy = iy;
      if (snapped && !S.trick) {
        // a quiet tip at most once per flight, and only for the first few flights it comes up
        const tip = S.v < LOOP_V ? 'Tip: dive first to build speed for a loop' : (!startTrick('loop', 0, true) ? 'Tip: loops need a bit more height' : null);
        if (tip && !S.tipShown && loopTips < 3) { toast(tip); S.tipShown = true; loopTips++; try { localStorage.setItem('ppb-looptips', String(loopTips)); } catch (e) {} }
      }
      if (S.trick && S.trick.type === 'roll') {
        const tr = S.trick; tr.t += dt; const k = Math.min(1, tr.t / tr.dur);
        tr.vis = tr.dir * Math.PI * 2 * (k * k * (3 - 2 * k));
        if (k >= 1) { S.trick = null; award('BARREL ROLL!', 150); }
      }
    }
    if (S.mode === 'fly' && zone !== lastZone && zone && !(zoneCool[zone] > 0)) {
      toast(ZONE_TXT[zone]); Sfx[ZONE_SFX[zone]](); zoneCool[zone] = (zone === 'canyon' || zone === 'sea') ? 9999 : 3;
      if (zone === 'canyon' || zone === 'sea') popWord('WHOA!', S.pos, '#ffd84a', 1.4);
    }
    lastZone = zone;
    const st = $('stall'), show = S.mode === 'fly' && S.stall > 0.3;
    st.hidden = !show;
    if (show) { st.style.opacity = Math.min(1, (S.stall - 0.3) / 0.4).toFixed(2); st.textContent = S.stall > 0.6 ? 'Stall!' : 'Too slow…'; }
  } else if (S.mode === 'slide') {
    const sp = S.slide.length();
    const ns = Math.max(0, sp - 7 * dt);
    if (sp > 0) S.slide.multiplyScalar(ns / sp);
    S.pos.addScaledVector(S.slide, dt);
    S.g += (0 - S.g) * Math.min(1, dt * 8); S.bank += (0 - S.bank) * Math.min(1, dt * 6);
    const hit = collide(tmpV.copy(S.pos).setY(0.3));
    if (hit && !hit.stick && sp > 0) { S.reason = hit.msg; S.slide.set(0, 0, 0); }
    if (sp > 0 && S.pos.y < 0.1 && inPool(S.pos)) splash();
    if (ns < 0.05) { S.endT += dt; if (S.endT > 0.35) finish(); }
  } else if (S.mode === 'crash') {
    S.endT += dt;
    const cgh = groundAt(S.pos.x, S.pos.z) + 0.02;
    if (!S.stick && S.pos.y > cgh) { S.pos.y = Math.max(cgh, S.pos.y - dt * (2 + S.endT * 6)); S.g += (-1.2 - S.g) * Math.min(1, dt * 5); }
    S.bank += Math.sin(S.endT * 30) * dt * 3 * Math.max(0, 1 - S.endT * 2);
    if (S.endT > 0.9) finish();
  }
  Object.keys(zoneCool).forEach(k => { zoneCool[k] -= dt; });
  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $('toast').classList.add('off'); }

  if (S.mode !== 'aim') {
    const aoa = S.mode === 'fly' ? clamp((S.r - 1) * 0.1, -0.1, 0.25) : 0;
    plane.position.copy(S.pos);
    const tv = S.trick ? S.trick.vis : 0;
    plane.rotation.set(S.g + aoa + (S.trick && S.trick.type === 'loop' ? tv : 0), S.yaw, -S.bank - (S.trick && S.trick.type === 'roll' ? tv : 0), 'YXZ');
    $('dist').textContent = fmt(horiz(S.pos));
  }

  shadow.position.set(plane.position.x, groundAt(plane.position.x, plane.position.z) + 0.05, plane.position.z);
  const k = 1 / (1 + Math.max(0, plane.position.y - groundAt(plane.position.x, plane.position.z)) * 0.25);
  shadow.scale.setScalar(k);
  shadow.material.opacity = (look ? 0.26 : 0.24) * k;

  // camera
  if (S.mode === 'aim') {
    camBase.lerp(aimCamPos, 1 - Math.exp(-dt * 7));
    camLook.lerp(aimCamLook, 1 - Math.exp(-dt * 7));
    orbit = 0;
  } else {
    const hx = -Math.sin(S.yaw), hz = -Math.cos(S.yaw);
    if (S.mode === 'done') {
      orbit += dt * 0.25;
      const a = S.yaw + Math.PI + Math.sin(orbit) * 0.9;
      tmpV.set(S.pos.x + Math.sin(a) * 3.4, Math.max(1.3, S.pos.y + 1.6), S.pos.z + Math.cos(a) * 3.4);
    } else {
      const cx = S.pos.x - hx * 2.8, cz = S.pos.z - hz * 2.8;
      tmpV.set(cx, Math.max(groundAt(cx, cz) + 0.45, S.pos.y + 0.9), cz);
    }
    camBase.lerp(tmpV, 1 - Math.exp(-dt * 3.5));
    const ahead = S.mode === 'fly' ? 2.6 : 0;
    // aim the camera through the plane (not past it) so the plane stays centered even with the side offset
    const ox = S.pos.x - camBase.x, oz = S.pos.z - camBase.z, ol = Math.hypot(ox, oz) || 1;
    lookT.set(S.pos.x + ox / ol * ahead, S.pos.y + 0.15, S.pos.z + oz / ol * ahead);
    camLook.lerp(lookT, 1 - Math.exp(-dt * 6));
  }
  camera.position.copy(camBase);
  if (shake > 0.002) { camera.position.x += (Math.random() - 0.5) * shake; camera.position.y += (Math.random() - 0.5) * shake; shake *= Math.exp(-dt * 7); }
  camera.lookAt(camLook);
  sky.position.set(camera.position.x, 0, camera.position.z);
  skyDome.position.copy(camera.position);

  // wind arrow relative to view
  const fx = camLook.x - camera.position.x, fz = camLook.z - camera.position.z, fl = Math.hypot(fx, fz) || 1;
  const fwx = fx / fl, fwz = fz / fl;
  const sx = breeze.x * -fwz + breeze.z * fwx, sy = breeze.x * fwx + breeze.z * fwz;
  $('windArrow').style.transform = `rotate(${Math.atan2(sx, sy)}rad)`;
  const bm = breeze.length();
  $('windTxt').textContent = bm < 0.15 ? 'Still air' : `Breeze ${bm.toFixed(1)} m/s`;

  // rising squiggles over grills and sunspots
  heat.forEach(l => {
    const a = l.geometry.attributes.position.array, u = l.userData;
    for (let i = 0; i < 40; i++) {
      const yy = u.y0 + i / 39 * u.len;
      a[i * 3] = u.ox + Math.sin(yy * 2.2 - tt * u.spd + u.ph) * u.amp;
      a[i * 3 + 1] = yy;
      a[i * 3 + 2] = u.oz + Math.cos(yy * 1.7 - tt * u.spd * 0.75 + u.ph) * u.amp * 0.55;
    }
    l.geometry.attributes.position.needsUpdate = true;
  });
  // crosswind doodles drift across the band
  const gs = 0.65 + 0.35 * Math.sin(tt * 1.4);
  gustLines.forEach(l => {
    const u = l.userData;
    u.ph = (u.ph + dt * 0.035 * gs) % 1;
    l.position.set(-90 + u.ph * 180, u.y, u.z);
    l.material.opacity = 0.42 * Math.sin(u.ph * Math.PI);
  });
  // fans spin and blow
  fans.forEach(f => { f.blades.rotation.z -= dt * 18; });
  fanStreaks.forEach(l => {
    const u = l.userData;
    u.ph = (u.ph + dt * 0.45) % 1;
    l.position.set(u.lat, u.y, 0.6 + u.ph * (u.span > 14 ? u.span : 12));
    l.material.opacity = 0.45 * Math.sin(u.ph * Math.PI);
  });
  // sprinklers sweep
  sprinklers.forEach(s => { if (s.on) s.spray.rotation.y = Math.sin(tt * 0.9 + s.ph) * 1.3; });
  flag.rotation.y = Math.sin(tt * 2) * 0.15;
}
