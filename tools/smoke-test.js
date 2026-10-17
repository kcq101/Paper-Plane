// Headless smoke test: runs the real game code against a stubbed browser + stubbed three.js,
// then simulates throws in each world. It checks logic (flight, scoring, rings, hangar), not visuals.
// Usage: node tools/smoke-test.js [section ...]
//   No sections = everything. Loading the game and running 30 frames always happens first.
//   Sections: backyard, harbor (simulated throws), ride (wall riding), hangar, stars, sound, quality.
//   Pick what the change touches, e.g. a sound change: node tools/smoke-test.js sound
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const mk = () => { const f = function () {}; return new Proxy(f, {
  get(t, k) { if (k === Symbol.toPrimitive) return () => 1; if (k === 'array') return new Float32Array(300); if (k === 'length') return 1; if (k === 'then') return undefined; if (k in t) return t[k]; return t[k] = mk(); },
  set(t, k, v) { t[k] = v; return true; }, apply() { return mk(); }, construct() { return mk(); } }); };
global.THREE = mk();
THREE.Vector3 = class { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; } set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } copy(v) { return this.set(v.x, v.y, v.z); }
  clone() { return new THREE.Vector3(this.x, this.y, this.z); } lerp(v, a) { this.x += (v.x - this.x) * a; this.y += (v.y - this.y) * a; this.z += (v.z - this.z) * a; return this; }
  length() { return Math.hypot(this.x, this.y, this.z); } multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; } addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
  normalize() { const l = this.length() || 1; return this.multiplyScalar(1 / l); } setY(y) { this.y = y; return this; } distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); } };
THREE.Vector2 = THREE.Vector3;
const ctx2d = () => new Proxy({}, { get: (t, k) => k in t ? t[k] : (k === 'measureText' ? () => ({ width: 200 }) : (String(k).startsWith('create') ? () => ({ addColorStop() {}, data: new Uint8ClampedArray(16) }) : () => {})), set: (t, k, v) => { t[k] = v; return true; } });
const el = () => ({ hidden: false, textContent: '', value: '', disabled: false, style: {}, appendChild() {}, setAttribute() {}, classList: { add() {}, remove() {} },
  addEventListener(k, f) { (this.h || (this.h = {}))[k] = f; }, setPointerCapture() {}, focus() {}, getContext: ctx2d, width: 0, height: 0 });
const els = {};
global.document = { createElementNS: () => el(), body: { classList: { add() {}, remove() {} } }, getElementById: id => els[id] || (els[id] = el()),
  createElement: () => el(), querySelector: () => el(), documentElement: {}, fonts: { load: () => Promise.resolve() } };
global.getComputedStyle = () => ({ paddingBottom: '0px' });
global.window = global; global.innerWidth = 390; global.innerHeight = 780; global.devicePixelRatio = 2;
global.addEventListener = () => {};
const mem = {}; global.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
let frames = 0, rafCb;
global.requestAnimationFrame = cb => { rafCb = cb; };
global.performance = { now: () => frames * 16 };

// seeded randomness: wind, dust devils and city layout come out the same every run, so a result is reproducible
let seed = 20261016;
Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

const SECTIONS = ['backyard', 'harbor', 'ride', 'hangar', 'stars', 'sound', 'quality'];
const asked = process.argv.slice(2).map(a => a.toLowerCase());
const bad = asked.filter(a => !SECTIONS.includes(a));
if (bad.length) { console.error(`Unknown section: ${bad.join(', ')}. Choose from: ${SECTIONS.join(', ')}`); process.exit(2); }
const run = name => !asked.length || asked.includes(name);

const dir = path.join(__dirname, '..', 'js');
const code = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n;\n');
vm.runInThisContext(code, { filename: 'game.js' });

const step = n => { for (let i = 0; i < n; i++) { rafCb(frames * 16); frames++; } };
const ev = (x, y) => ({ pointerId: 1, clientX: x, clientY: y, preventDefault() {} });
const key = (k, on) => vm.runInThisContext(`keys.${k} = ${on}`); // arrow keys steer like the stick
step(30);
let failures = 0;
console.log(`ok  game loads and runs 30 frames${asked.length ? ' · sections: ' + asked.join(', ') : ''}`);
function throwOnce(label, steer) {
  const g = els.game;
  g.h.pointerdown(ev(200, 300)); g.h.pointermove(ev(200, 560)); g.h.pointerup(ev(200, 560));
  let n = 0;
  while (n < 25000 && els.result.hidden !== false) { if (steer) steer(n, g); step(1); n++; }
  const ok = els.result.hidden === false;
  if (!ok) failures++;
  console.log(`${ok ? 'ok ' : 'FAIL'} ${label.padEnd(26)} ${els.why.textContent} | ★ ${els.final.textContent} | ${els.stats2.textContent}`);
  els.again.h.click();
}
for (const [key, world] of [['backyard', 'Backyard'], ['harbor', 'Harbor City']]) {
  if (!run(key)) continue;
  if (!els.levelBtn.textContent.includes(world)) els.levelBtn.h.click();
  console.log(`\n== ${els.levelBtn.textContent}`);
  throwOnce('plain throw');
  throwOnce('gentle climb', (n, g) => { if (n === 40) { g.h.pointerdown(ev(200, 400)); g.h.pointermove(ev(200, 378)); } });
  throwOnce('snap loop', (n, g) => { if (n === 30) { g.h.pointerdown(ev(200, 400)); g.h.pointermove(ev(200, 320)); } if (n === 140) g.h.pointerup(ev(200, 320)); });
  throwOnce('double-swipe rolls', (n, g) => { if (n % 200 === 100 || n % 200 === 104) { g.h.pointerdown(ev(200, 400)); g.h.pointermove(ev(260, 400)); g.h.pointerup(ev(260, 400)); } });
}
if (run('ride')) {
  console.log('\n== Wall ride');
  const g = s => vm.runInThisContext(s);
  if (!els.levelBtn.textContent.includes('Harbor')) els.levelBtn.h.click();
  // drop the plane into the main street, a couple of metres from the right-hand buildings, flying down the street
  g('resetThrow(); S.mode = "fly"; S.pos.set(4, 6, -58); S.yaw = 0; S.g = 0; S.v = 10; S.bank = 0;');
  key('ArrowUp', true); // pull up hard
  let n = 0; while (n < 20 && !g('S.ride')) { step(1); n++; }
  const grabbed = !!g('S.ride'), side = g('S.ride && S.ride.side'), v0 = g('S.v');
  const z0 = g('S.pos.z');
  const climbKey = side > 0 ? 'ArrowRight' : 'ArrowLeft'; key(climbKey, true); // slide toward climbing
  step(45);
  const riding = !!g('S.ride'), gap = g('S.ride ? S.ride.d : -1'), dz = z0 - g('S.pos.z'), up = g('S.pos.y') > 6;
  const camRolled = g('rideCam.k') > 0.9; // (the stubbed camera can't report its roll; the browser check covers that)
  const style0 = g('S.style');
  key('ArrowUp', false); key(climbKey, false); step(20); // let go of everything: the wall is sticky, so you stay on
  const sticky = !!g('S.ride');
  key('ArrowUp', true); step(12); key('ArrowUp', false); // drag away from the wall (screen-up): hop off
  const off = !g('S.ride') && g('S.mode') === 'fly' && g('S.style') > style0;
  step(60); const camBack = g('rideCam.k') < 0.1;
  const checks = { grabbed, riding, steadyGap: gap > 1 && gap < 2.2, travelled: dz > 8, climbed: up, boost: v0 >= 13, camRolled, staysOnWhenLetGo: sticky, dragAwayHopsOff: off, cameraLevelsOut: camBack };
  const failed = Object.keys(checks).filter(k => !checks[k]);
  if (failed.length) failures++;
  console.log(`${failed.length ? 'FAIL' : 'ok '} grab after ${n} frames (wall on the ${side > 0 ? 'right' : 'left'}), ride ${dz.toFixed(1)} m along it, gap ${gap.toFixed(2)} m, stays on when you let go, drag away to hop off, camera rolls and levels out${failed.length ? ' · failed: ' + failed.join(', ') : ''}`);
  g('resetThrow();');
}
if (run('hangar')) {
console.log('\n== Hangar');
els.hangarBtn.h.click(); step(10);
els.hNew.h.click(); const made = els.hName.value;
els.hCopy.h.click(); els.hDel.h.click(); els.hDel.h.click();
els.hFly.h.click(); step(5);
const saved = JSON.parse(mem['ppb-hangar'] || '[]');
const hangarOk = made.startsWith('My plane') && saved.length === 1;
if (!hangarOk) failures++;
console.log(`${hangarOk ? 'ok ' : 'FAIL'} new + copy + delete -> ${saved.length} saved design(s); flying: ${els.hangarBtn.textContent}`);
}
if (run('stars')) {
console.log('\n== Paper stars');
  const g = s => vm.runInThisContext(s);
  if (!els.levelBtn.textContent.includes('Backyard')) els.levelBtn.h.click();
  const n = g('starsTotal()'), dropped = g('STARS_DROPPED.length');
  g('resetThrow(); S.mode = "fly"; S.stars = 0;');
  const through = 'checkStars(new THREE.Vector3(c.x, c.y, c.z + 3), new THREE.Vector3(c.x, c.y, c.z - 3))';
  g(`{ const c = STARS.backyard.list[0].c; ${through}; }`);
  const got = g('S.stars'), saved = JSON.parse(mem['ppb-stars-backyard'] || '[]');
  g('checkStars(new THREE.Vector3(0, -50, 0), new THREE.Vector3(0, -50, 1));'); // nowhere near a star
  g('resetThrow(); S.mode = "fly";'); // next throw: the collected star stays gone
  g(`{ const c = STARS.backyard.list[0].c; ${through}; }`);
  const gone = g('S.stars') === 0 && g('starsFound()') === 1;
  g('resetCollection(); resetThrow(); S.mode = "fly";'); // reset brings it back
  g(`{ const c = STARS.backyard.list[0].c; ${through}; }`);
  const back = g('S.stars') === 1 && g('starsFound()') === 1;
  g('resetCollection();');
  const ok = n >= 15 && g('STARS.harbor.list.length') >= 12 && got === 1 && saved.length === 1 && gone && back;
  if (!ok) failures++;
  console.log(`${ok ? 'ok ' : 'FAIL'} backyard ${n} stars, harbor ${g('STARS.harbor.list.length')}, dropped ${dropped} (stubbed geometry; check in a browser); pickup ${got}, saved ${saved.length}, stays collected next throw ${gone}, reset brings it back ${back}`);
  g('resetThrow();');
}
if (run('sound')) {
  console.log('\n== Sound');
  const g = s => vm.runInThisContext(s);
  // a stand-in <audio> element: Node has no audio, so this records what the game asks of it
  global.Audio = class { constructor() { this.src = ''; this.paused = true; this.volume = 1; this.h = {}; }
    addEventListener(k, f) { this.h[k] = f; } play() { this.paused = false; return Promise.resolve(); } pause() { this.paused = true; } };
  const slide = (id, v) => { els[id].value = String(v); els[id].h.input({ target: els[id] }); };
  g('Sfx.init();');
  const started = g('!!Music.el && !Music.el.paused') && g("Music.el.src.endsWith('summer-sky-1.mp3')");
  els.soundBtn.h.click();
  const opened = els.sound.hidden === false && g('paused');
  slide('musicVol', 30);
  const vol = g('Music.vol') === 0.3 && Math.abs(g('Music.el.volume') - 0.24) < 1e-9 && mem['ppb-music-vol'] === '0.3';
  els.musicOn.h.click();
  const off = g('!Music.on && Music.el.paused') && mem['ppb-music'] === '0' && els.musicVol.disabled === true;
  els.musicOn.h.click();
  const back = g('Music.on && !Music.el.paused');
  g("Music.el.h.ended()");
  const next = g("Music.el.src.endsWith('summer-sky-2.mp3') && !Music.el.paused") && els.nowPlaying.textContent.includes('reprise');
  els.sfxOn.h.click(); const sfxOff = g('Sfx.muted') && mem['ppb-mute'] === '1';
  els.sfxOn.h.click(); slide('sfxVol', 40); const sfxVol = g('Sfx.vol') === 0.4 && mem['ppb-sfx-vol'] === '0.4';
  els.soundClose.h.click(); const closed = els.sound.hidden === true && !g('paused');
  const checks = { started, opened, vol, off, back, next, sfxOff, sfxVol, closed };
  const failed = Object.keys(checks).filter(k => !checks[k]);
  if (failed.length) failures++;
  console.log(`${failed.length ? 'FAIL' : 'ok '} music starts on first tap, panel opens/closes, music on/off + volume, next track, effects on/off + volume${failed.length ? ' · failed: ' + failed.join(', ') : ''}`);
  slide('musicVol', 50); slide('sfxVol', 100);
}
if (run('quality')) {
console.log('\n== Quality governor');
{
  const g = s => vm.runInThisContext(s);
  g('Q.auto = true'); // the governor is off by default; switch it on to test the logic
  const t0 = g('qTier'); let now = 10000;
  for (let i = 0; i < 95; i++) g(`governor(${now += 16}, 16)`); // steady 60 fps: stays put
  const t1 = g('qTier');
  for (let i = 0; i < 95; i++) g(`governor(${now += 30}, 30)`); // ~33 fps: one step down
  const t2 = g('qTier');
  const ok = t0 === 0 && t1 === 0 && t2 === 1 && g('sceneDPR()') < 2;
  if (!ok) failures++;
  console.log(`${ok ? 'ok ' : 'FAIL'} 60fps keeps tier ${t1}; 33fps steps to tier ${t2} (scene ${g('sceneDPR()').toFixed(2)}x, shadow ${g('shadowRes()')})`);
  g('setQuality(0)'); g('Q.auto = false');
}
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
