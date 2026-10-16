// Paper Planes · 03-sky.js
// Clouds, sun, distance labels and the best-throw flag.
// Classic script: shares one global scope with the other js/ files, loaded in numeric order.
'use strict';

/* ---------- sprites (text, clouds, sun) ---------- */
function canvasSprite(w, h, draw, scale, fog = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog }));
  s.scale.set(scale, scale * h / w, 1);
  return s;
}
function textSprite(txt, color = '#2a2a30', scale = 2.2, size = 76) {
  return canvasSprite(256, 128, (x, w, h) => {
    x.font = `700 ${size}px Kalam, "Patrick Hand", cursive`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = color; x.fillText(txt, w / 2, h / 2 + 6);
  }, scale);
}
function scribbleCloud(x, w, h) {
  const blobs = [[0.3, 0.6, 0.2], [0.5, 0.45, 0.26], [0.7, 0.6, 0.2], [0.42, 0.66, 0.18], [0.6, 0.68, 0.18]];
  x.fillStyle = '#ffffff';
  blobs.forEach(([bx, by, r]) => { x.beginPath(); x.arc(bx * w, by * h, r * h * 1.1, 0, Math.PI * 2); x.fill(); });
  x.strokeStyle = '#2a2a30'; x.lineWidth = 3; x.lineCap = 'round';
  for (let pass = 0; pass < 2; pass++) {
    x.globalAlpha = pass ? 0.35 : 0.85;
    blobs.slice(0, 3).forEach(([bx, by, r]) => { x.beginPath(); x.arc(bx * w + pass * 2, by * h - pass * 2, r * h * 1.1, Math.PI * 1.05, Math.PI * 1.95); x.stroke(); });
    x.beginPath(); x.moveTo(0.12 * w, 0.82 * h); x.lineTo(0.88 * w + pass * 3, 0.83 * h); x.stroke();
  }
}
function puffyCloud(x, w, h) {
  const blobs = [[0.28, 0.62, 0.22], [0.47, 0.46, 0.3], [0.68, 0.58, 0.24], [0.38, 0.68, 0.2], [0.58, 0.7, 0.2], [0.8, 0.68, 0.15]];
  blobs.forEach(([bx, by, r]) => {
    const g = x.createRadialGradient(bx * w, by * h - r * h * 0.3, r * h * 0.2, bx * w, by * h, r * h * 1.15);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.75, 'rgba(244,248,252,0.97)'); g.addColorStop(1, 'rgba(225,236,247,0)');
    x.fillStyle = g; x.beginPath(); x.arc(bx * w, by * h, r * h * 1.15, 0, Math.PI * 2); x.fill();
  });
  const b = x.createLinearGradient(0, h * 0.6, 0, h * 0.9);
  b.addColorStop(0, 'rgba(200,218,236,0)'); b.addColorStop(1, 'rgba(190,210,232,0.55)');
  x.globalCompositeOperation = 'source-atop'; x.fillStyle = b; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'source-over';
}
function cloudTex(fn) { const c = document.createElement('canvas'); c.width = 256; c.height = 128; fn(c.getContext('2d'), 256, 128); return new THREE.CanvasTexture(c); }
const sky = new THREE.Group(); scene.add(sky);
const skySprites = [];
[[-40, 34, -230, 46], [35, 44, -260, 56], [130, 30, -190, 36], [-150, 46, -200, 50], [5, 26, -170, 30], [-210, 36, -90, 44], [220, 40, -110, 48]].forEach(([x, y, z, s]) => {
  const c = canvasSprite(256, 128, scribbleCloud, s, false); c.position.set(x, y, z); sky.add(c);
  skySprites.push({ s: c, sk: c.material.map, sb: cloudTex(puffyCloud) });
});
{
  const sun = canvasSprite(128, 128, (x) => {
    x.strokeStyle = '#2a2a30'; x.lineWidth = 3; x.lineCap = 'round';
    x.fillStyle = '#fff1bd'; x.beginPath(); x.arc(64, 64, 26, 0, Math.PI * 2); x.fill(); x.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + 0.1; x.beginPath(); x.moveTo(64 + Math.cos(a) * 34, 64 + Math.sin(a) * 34); x.lineTo(64 + Math.cos(a) * (46 + (i % 2) * 8), 64 + Math.sin(a) * (46 + (i % 2) * 8)); x.stroke(); }
  }, 30, false);
  sun.position.set(80, 70, -250); sky.add(sun);
  const glow = document.createElement('canvas'); glow.width = glow.height = 128;
  const gx = glow.getContext('2d'), gg = gx.createRadialGradient(64, 64, 6, 64, 64, 64);
  gg.addColorStop(0, 'rgba(255,253,240,1)'); gg.addColorStop(0.25, 'rgba(255,244,200,0.95)'); gg.addColorStop(0.5, 'rgba(255,236,180,0.35)'); gg.addColorStop(1, 'rgba(255,236,180,0)');
  gx.fillStyle = gg; gx.fillRect(0, 0, 128, 128);
  skySprites.push({ s: sun, sk: sun.material.map, sb: new THREE.CanvasTexture(glow) });
}

// best-throw flag
const flag = new THREE.Group();
{
  flag.add(lineSeg([0, 0, 0, 0, 1.6, 0], inkLine));
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([0, 1.6, 0, 0.75, 1.38, 0, 0, 1.16, 0], 3));
  tri.computeVertexNormals();
  flag.add(sketch(tri, '#f1b2a9', { side: THREE.DoubleSide, thr: 1, jit: 0.01, hull: false, sb: '#e2483d' }));
  flag.visible = false;
  scene.add(flag);
}
