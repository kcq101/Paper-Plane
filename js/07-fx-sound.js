// Paper Planes · 07-fx-sound.js
// Comic effects (words, puffs, trail, confetti) and synthesized sound.
// Classic script: shares one global scope with the other js/ files, loaded in numeric order.
'use strict';

/* ---------- comic FX: words, puffs, trail, shake, confetti ---------- */
const fx = [];
const wordTexCache = {};
function wordTex(text, fill) {
  const key = text + fill;
  if (wordTexCache[key]) return wordTexCache[key];
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const x = c.getContext('2d');
  x.translate(256, 128);
  x.fillStyle = '#fffef9'; x.strokeStyle = '#2a2a30'; x.lineWidth = 6; x.lineJoin = 'round';
  x.beginPath();
  for (let i = 0; i <= 22; i++) {
    const a = i / 22 * Math.PI * 2, r = (i % 2 ? 92 : 120) + Math.sin(i * 2.3) * 8;
    const px = Math.cos(a) * r * 1.95, py = Math.sin(a) * r * 0.95;
    i ? x.lineTo(px, py) : x.moveTo(px, py);
  }
  x.closePath(); x.fill(); x.stroke();
  x.rotate(-0.08);
  let size = 104;
  x.font = `700 ${size}px Kalam, "Patrick Hand", cursive`;
  const w = x.measureText ? x.measureText(text).width : 300;
  if (w > 380) { size = Math.floor(size * 380 / w); x.font = `700 ${size}px Kalam, "Patrick Hand", cursive`; }
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 14; x.strokeText(text, 0, 8);
  x.fillStyle = fill; x.fillText(text, 0, 8);
  return (wordTexCache[key] = new THREE.CanvasTexture(c));
}
function popWord(text, pos, fill = '#ffd84a', size = 1.25) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: wordTex(text, fill), transparent: true, depthTest: false, depthWrite: false, fog: false }));
  s.renderOrder = 20;
  s.material.rotation = (Math.random() - 0.5) * 0.3;
  s.position.set(pos.x, pos.y + 0.55, pos.z);
  s.scale.set(0.01, 0.01, 1);
  scene.add(s);
  fx.push({ o: s, kind: 'word', t: 0, life: 1.25, size });
}
let puffTexture = null;
function puffTex() {
  if (puffTexture) return puffTexture;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.strokeStyle = '#ffffff'; x.lineWidth = 5; x.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    x.beginPath();
    for (let i = 0; i <= 30; i++) {
      const a = i / 26 * Math.PI * 2, r = 40 - k * 9 + Math.sin(a * 4 + k) * 5;
      const px = 64 + Math.cos(a) * r, py = 64 + Math.sin(a) * r;
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    }
    x.stroke();
  }
  return (puffTexture = new THREE.CanvasTexture(c));
}
function spawnPuffs(pos, n = 6, tint = null) {
  tint = tint || (look ? '#ffffff' : '#6b5b4a');
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), color: new THREE.Color(tint), transparent: true, depthWrite: false }));
    s.position.set(pos.x, Math.max(0.15, pos.y), pos.z);
    const a = Math.random() * Math.PI * 2, sp = 0.8 + Math.random() * 1.4;
    scene.add(s);
    fx.push({ o: s, kind: 'puff', t: 0, life: 0.7 + Math.random() * 0.3, v: new THREE.Vector3(Math.cos(a) * sp, 0.4 + Math.random() * 0.8, Math.sin(a) * sp), s0: 0.15, s1: 0.5 + Math.random() * 0.5 });
  }
}
function updateFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i]; f.t += dt;
    const m = f.o.material;
    if (f.kind === 'word') {
      const k = Math.min(1, f.t / 0.2), back = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
      const sc = f.size * back;
      f.o.scale.set(sc, sc * 0.5, 1);
      f.o.position.y += dt * 0.5;
      m.opacity = f.t > f.life - 0.4 ? Math.max(0, (f.life - f.t) / 0.4) : 1;
    } else {
      f.o.position.addScaledVector(f.v, dt);
      f.v.multiplyScalar(Math.exp(-dt * 3));
      const k = f.t / f.life, sc = f.s0 + (f.s1 - f.s0) * Math.sqrt(k);
      f.o.scale.set(sc, sc, 1);
      m.opacity = 0.75 * (1 - k);
    }
    if (f.t >= f.life) { scene.remove(f.o); m.dispose(); fx.splice(i, 1); }
  }
}
// pencil trail behind the plane
const TRAILN = 90;
const trailGeom = new THREE.BufferGeometry();
trailGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAILN * 3), 3));
const trailSk = new THREE.LineDashedMaterial({ color: '#7d7d86', dashSize: 0.3, gapSize: 0.22, transparent: true, opacity: 0.5 });
const trailSb = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false });
const trail = new THREE.Line(trailGeom, trailSk);
trail.frustumCulled = false; trail.visible = false;
scene.add(trail);
let trailCount = 0, trailTick = 0;
function pushTrail(p) {
  const a = trailGeom.attributes.position.array;
  if (trailCount < TRAILN) trailCount++; else a.copyWithin(0, 3);
  const i = (trailCount - 1) * 3;
  a[i] = p.x; a[i + 1] = p.y; a[i + 2] = p.z;
  trailGeom.setDrawRange(0, trailCount);
  trailGeom.attributes.position.needsUpdate = true;
  if (trailCount > 1) trail.computeLineDistances();
  trail.visible = trailCount > 1;
}
let shake = 0;
const camBase = new THREE.Vector3();
// 2D confetti on the overlay for a new best
const confetti = [];
const CONF_COLORS = ['#c8443c', '#2b4fbf', '#d9a520', '#5d7748', '#e9a497'];
function spawnConfetti() {
  if (RM) return;
  for (let i = 0; i < 90; i++) confetti.push({
    x: Math.random() * innerWidth, y: -Math.random() * innerHeight * 0.4, vx: (Math.random() - 0.5) * 70, vy: 60 + Math.random() * 90,
    r: Math.random() * 6, vr: (Math.random() - 0.5) * 8, c: CONF_COLORS[i % CONF_COLORS.length], l: 7 + Math.random() * 8
  });
}
function updateConfetti(dt) {
  for (let i = confetti.length - 1; i >= 0; i--) {
    const p = confetti[i];
    p.vy += 120 * dt; p.vx *= Math.exp(-dt); p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
    if (p.y > innerHeight + 20) confetti.splice(i, 1);
  }
}

/* ---------- sound: everything synthesized, no audio files ---------- */
const Sfx = {
  ctx: null, muted: false,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      const c = this.ctx = new AC();
      this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 0.9; this.master.connect(c.destination);
      const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
      // rushing-air bed that follows airspeed
      const w = c.createBufferSource(); w.buffer = buf; w.loop = true;
      this.windF = c.createBiquadFilter(); this.windF.type = 'lowpass'; this.windF.frequency.value = 300;
      this.windG = c.createGain(); this.windG.gain.value = 0;
      w.connect(this.windF); this.windF.connect(this.windG); this.windG.connect(this.master); w.start();
      // paper flutter for stalls
      const f = c.createBufferSource(); f.buffer = buf; f.loop = true; f.playbackRate.value = 0.7;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 1.2;
      const am = c.createGain(); am.gain.value = 0.5;
      const lfo = c.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 19;
      const depth = c.createGain(); depth.gain.value = 0.5;
      lfo.connect(depth); depth.connect(am.gain);
      this.flutG = c.createGain(); this.flutG.gain.value = 0;
      f.connect(bp); bp.connect(am); am.connect(this.flutG); this.flutG.connect(this.master);
      f.start(); lfo.start();
    } catch (e) { this.ctx = null; }
  },
  setMuted(m) { this.muted = m; if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05); },
  ok() { return this.ctx && !this.muted && this.ctx.state === 'running'; },
  burst(o) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime + (o.delay || 0);
    const s = c.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = o.rate || 1;
    const f = c.createBiquadFilter(); f.type = o.type || 'bandpass'; f.Q.value = o.q ?? 1;
    f.frequency.setValueAtTime(o.f0, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.gain, t + (o.att || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t, Math.random() * 1.5); s.stop(t + o.dur + 0.05);
  },
  tone(o) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime + (o.delay || 0);
    const osc = c.createOscillator(); osc.type = o.wave || 'sine';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1 && o.f1 !== o.f0) osc.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
    if (o.vib) {
      const l = c.createOscillator(), dg = c.createGain();
      l.frequency.value = o.vib; dg.gain.value = o.vibDepth || 20;
      l.connect(dg); dg.connect(osc.frequency); l.start(t); l.stop(t + o.dur + 0.05);
    }
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.gain, t + (o.att || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + o.dur + 0.05);
  },
  whoosh(p) { this.burst({ type: 'bandpass', f0: 300, f1: 1800 + p * 1500, q: 0.8, dur: 0.35 + p * 0.25, gain: 0.3 + p * 0.3, att: 0.06 }); },
  boing() { this.tone({ f0: 150, f1: 430, dur: 0.5, gain: 0.35, vib: 14, vibDepth: 45 }); this.tone({ wave: 'triangle', f0: 80, f1: 210, dur: 0.3, gain: 0.18 }); },
  splash() {
    this.burst({ type: 'lowpass', f0: 3200, f1: 400, q: 0.5, dur: 0.6, gain: 0.5, att: 0.005 });
    for (let i = 0; i < 5; i++) { const f = 400 + Math.random() * 500; this.tone({ f0: f, f1: f * 1.8, dur: 0.08, gain: 0.1, delay: 0.1 + i * 0.07 }); }
  },
  bonk() { this.tone({ f0: 190, f1: 55, dur: 0.28, gain: 0.55 }); this.burst({ type: 'bandpass', f0: 2500, q: 2, dur: 0.05, gain: 0.35, att: 0.002 }); },
  rustle() { this.burst({ type: 'bandpass', f0: 4200, f1: 2400, q: 0.7, dur: 0.5, gain: 0.28, att: 0.02 }); this.burst({ type: 'bandpass', f0: 3000, f1: 1800, q: 0.7, dur: 0.4, gain: 0.2, att: 0.02, delay: 0.14 }); },
  thud() { this.tone({ f0: 120, f1: 45, dur: 0.2, gain: 0.5 }); this.burst({ type: 'lowpass', f0: 600, q: 0.7, dur: 0.12, gain: 0.3, att: 0.003 }); },
  skid(sp) { this.burst({ type: 'bandpass', f0: 2200, f1: 900, q: 1.5, dur: clamp(sp / 7, 0.2, 1.2), gain: 0.14 + Math.min(0.2, sp * 0.015), att: 0.02 }); },
  lift() { this.tone({ f0: 520, f1: 880, dur: 0.4, gain: 0.1 }); this.tone({ f0: 660, f1: 1100, dur: 0.4, gain: 0.07, delay: 0.06 }); },
  gust() { this.burst({ type: 'bandpass', f0: 300, f1: 1300, q: 0.7, dur: 0.7, gain: 0.28, att: 0.2 }); },
  hiss() { this.burst({ type: 'highpass', f0: 5000, q: 0.7, dur: 0.6, gain: 0.16, att: 0.05 }); },
  scratch() { for (let i = 0; i < 3; i++) this.burst({ type: 'bandpass', f0: 3000 + Math.random() * 2000, q: 3, dur: 0.045, gain: 0.12, att: 0.004, delay: i * 0.05 }); },
  ring(n) { const f = 660 * Math.pow(1.122, Math.min(n, 8) - 1); this.tone({ wave: 'triangle', f0: f, f1: f, dur: 0.25, gain: 0.18 }); this.tone({ f0: f * 1.5, f1: f * 1.5, dur: 0.35, gain: 0.12, delay: 0.07 }); },
  squawk() { this.tone({ wave: 'sawtooth', f0: 900, f1: 480, dur: 0.18, gain: 0.1, vib: 30, vibDepth: 120 }); this.tone({ wave: 'sawtooth', f0: 1000, f1: 560, dur: 0.15, gain: 0.08, delay: 0.2, vib: 30, vibDepth: 100 }); },
  fanfare() { [523, 659, 784, 1046].forEach((f, i) => this.tone({ wave: 'triangle', f0: f, f1: f, dur: 0.2, gain: 0.16, delay: i * 0.09 })); },
  update(mode, v, stall) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, fly = mode === 'fly';
    this.windG.gain.setTargetAtTime(fly ? clamp((v - 2.5) / 14, 0, 1) * 0.26 : 0, t, 0.15);
    this.windF.frequency.setTargetAtTime(250 + v * 70, t, 0.2);
    this.flutG.gain.setTargetAtTime(fly ? Math.max(0, stall - 0.25) * 0.35 : 0, t, 0.08);
  }
};
try { Sfx.muted = localStorage.getItem('ppb-mute') === '1'; } catch (e) {}
addEventListener('pointerdown', () => Sfx.init(), true);
addEventListener('keydown', () => Sfx.init(), true);
