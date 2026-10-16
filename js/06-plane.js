// Paper Planes · 06-plane.js
// The paper plane: fold geometry, flight modifiers per fold, paper textures.
// Classic script: shares one global scope with the other js/ files, loaded in numeric order.
'use strict';

/* ---------- the plane: folded from a design ---------- */
const PS = 0.7;
const plane = new THREE.Group();
// how each fold changes the flight
const FOLDS = {
  nose: { pointed: { drag: 0.9, launch: 1.06, lift: 0.98 }, classic: {}, blunt: { drag: 1.02, launch: 0.96, lift: 1.04, ki: 0.86, turn: 0.95, bankRate: 0.9 } },
  wings: { narrow: { lift: 0.95, drag: 0.9, ki: 1.12, turn: 0.85, launch: 1.03 }, classic: {}, wide: { lift: 1.05, drag: 1.02, ki: 0.78, turn: 1.15, launch: 0.98 } },
  tips: { flat: {}, up: { bankRate: 0.75, bankMax: 0.85, turn: 0.92 }, down: { bankRate: 1.3, bankMax: 1.08, turn: 1.15 } }
};
const PD = { drag: 1, lift: 1, ki: 1, turn: 1, bankRate: 1, bankMax: 1, launch: 1 };
function designPD(d) {
  const o = { drag: 1, lift: 1, ki: 1, turn: 1, bankRate: 1, bankMax: 1, launch: 1 };
  [FOLDS.nose[d.nose], FOLDS.wings[d.wings], FOLDS.tips[d.tips]].forEach(f => Object.keys(f || {}).forEach(k => { o[k] *= f[k]; }));
  return o;
}
function designStats(d) {
  const o = designPD(d), sc = v => Math.round(clamp(v, 1, 10));
  return {
    Speed: sc(5 + (o.launch - 1) * 60 + (1 - o.drag) * 25),
    Glide: sc(5 + (o.lift - 1) * 30 + (1 - o.ki) * 14 + (1 - o.drag) * 10),
    Turning: sc(5 + (o.turn - 1) * 18 + (o.bankRate - 1) * 6),
    Stability: sc(5 + (1 - o.bankRate) * 12 + (o.lift - 1) * 18 - (o.turn - 1) * 6)
  };
}
function planeGeom(d) {
  const span = { narrow: 0.31, classic: 0.42, wide: 0.56 }[d.wings] || 0.42, tipZ = { narrow: 0.47, classic: 0.45, wide: 0.38 }[d.wings] || 0.45;
  const nz = { pointed: -0.62, classic: -0.5, blunt: -0.4 }[d.nose] || -0.5, dh = 0.15;
  const N = [0, 0, nz], T = [0, 0, 0.5], K = [0, -0.14, 0.45], Lt = [-span, dh, tipZ], Rt = [span, dh, tipZ];
  const tris = [];
  if (d.nose === 'blunt') { const A = [-0.08, 0.012, nz + 0.035], B = [0.08, 0.012, nz + 0.035]; tris.push(N, A, Lt, N, Lt, T, N, T, Rt, N, Rt, B); }
  else tris.push(N, Lt, T, N, T, Rt);
  tris.push(N, K, T);
  if (d.tips !== 'flat') { // small folded winglets at the tips
    const up = d.tips === 'up' ? 1 : -1;
    [Lt, Rt].forEach(P => { const Wb = [P[0] + (N[0] - P[0]) * 0.26, P[1] + (N[1] - P[1]) * 0.26, P[2] + (N[2] - P[2]) * 0.26]; tris.push(P, Wb, [P[0] * 0.98, P[1] + 0.12 * up, P[2] - 0.06]); });
  }
  const pos = [], uv = [];
  tris.forEach(v => { pos.push(v[0] * PS, v[1] * PS, v[2] * PS); uv.push(v[0] / 0.84 + 0.5, v[2] + 0.5); });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  const crease = [N[0], N[1], N[2], -span * 0.48, dh * 0.5, 0.47, N[0], N[1], N[2], span * 0.48, dh * 0.5, 0.47].map(v => v * PS);
  return { g, crease };
}
// paper stock
const PAPERS = {
  notebook: { name: 'Notebook', sw: '#f3f1e8', line: '#5b86cf' },
  graph: { name: 'Graph', sw: '#eef4ee', line: '#8fc2ad' },
  news: { name: 'Newspaper', sw: '#e9e5d8', line: '#7d7a72' },
  kraft: { name: 'Kraft', sw: '#c9a57a', line: '#9a7a52' },
  coral: { name: 'Coral', sw: '#ef7d67', line: '#ffd2c6' },
  sky: { name: 'Sky', sw: '#79b3e0', line: '#d7ebfa' },
  mint: { name: 'Mint', sw: '#8fcfb4', line: '#e1f4ea' }
};
const paperTex = {};
function paperTexture(id) {
  if (paperTex[id]) return paperTex[id];
  const pc = document.createElement('canvas'); pc.width = pc.height = 256;
  const x = pc.getContext('2d'), P = PAPERS[id] || PAPERS.notebook;
  x.fillStyle = P.sw; x.fillRect(0, 0, 256, 256);
  x.lineCap = 'round';
  if (id === 'notebook') {
    x.strokeStyle = '#5b86cf'; x.lineWidth = 4; for (let y = 14; y < 256; y += 24) { x.beginPath(); x.moveTo(0, y); x.lineTo(256, y); x.stroke(); }
    x.strokeStyle = '#d65f56'; x.beginPath(); x.moveTo(180, 0); x.lineTo(180, 256); x.stroke();
  } else if (id === 'graph') {
    for (let k = 0; k <= 256; k += 16) { x.strokeStyle = k % 64 ? 'rgba(80,160,130,0.55)' : 'rgba(60,140,110,0.85)'; x.lineWidth = k % 64 ? 1.5 : 3;
      x.beginPath(); x.moveTo(k, 0); x.lineTo(k, 256); x.stroke(); x.beginPath(); x.moveTo(0, k); x.lineTo(256, k); x.stroke(); }
  } else if (id === 'news') {
    x.fillStyle = '#3f3d39'; x.fillRect(14, 12, 228, 16); x.fillRect(14, 34, 150, 9);
    x.fillStyle = '#a8a397'; x.fillRect(150, 54, 92, 70);
    for (let col = 0; col < 3; col++) for (let y = 54; y < 248; y += 7) {
      const cx = 14 + col * 78; if (col === 2 && y < 128) continue; if (col === 1 && y < 128 && cx + 70 > 150) continue;
      x.fillStyle = 'rgba(60,58,54,0.55)'; x.fillRect(cx, y, 62 + Math.random() * 8 - (Math.random() < 0.15 ? 26 : 0), 3);
    }
  } else if (id === 'kraft') {
    for (let i = 0; i < 900; i++) { x.strokeStyle = Math.random() < 0.5 ? 'rgba(120,85,45,0.25)' : 'rgba(240,215,170,0.25)'; x.lineWidth = 1 + Math.random();
      const x0 = Math.random() * 256, y0 = Math.random() * 256, a = Math.random() * 6.28, l = 4 + Math.random() * 14; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x0 + Math.cos(a) * l, y0 + Math.sin(a) * l); x.stroke(); }
  } else { // origami solids with a soft printed dot pattern
    x.fillStyle = P.line; x.globalAlpha = 0.5;
    for (let yy = 8; yy < 256; yy += 26) for (let xx = (yy / 26 % 2) * 13 + 6; xx < 256; xx += 26) { x.beginPath(); x.arc(xx, yy, 3.2, 0, Math.PI * 2); x.fill(); }
    x.globalAlpha = 1;
    const gr = x.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(0,0,0,0.08)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
  }
  for (let i = 0; i < 160; i++) { const x0 = Math.random() * 256, y0 = Math.random() * 256, l = 14 + Math.random() * 26;
    x.strokeStyle = `rgba(55,55,65,${0.04 + Math.random() * 0.06})`; x.lineWidth = 1.5 + Math.random(); x.beginPath(); x.moveTo(x0, y0); x.lineTo(x0 + l * 0.7, y0 - l * 0.7); x.stroke(); }
  x.strokeStyle = 'rgba(40,40,50,0.5)'; x.lineWidth = 3; x.beginPath();
  for (let y = 0; y <= 256; y += 8) { const xx = 128 + Math.sin(y * 0.09) * 1.5; y ? x.lineTo(xx, y) : x.moveTo(xx, y); } x.stroke();
  const t = new THREE.CanvasTexture(pc);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
  return (paperTex[id] = t);
}
const planeSb = pencilize(new THREE.MeshToonMaterial({ map: paperTexture('notebook'), gradientMap, side: THREE.DoubleSide,
  color: new THREE.Color(1, 1, 1).multiplyScalar(1 / Math.max(1, litMaxU.value)) }), 'plane');
const planeMesh = new THREE.Mesh(new THREE.BufferGeometry(), planeSb);
const planeEdge = lineSeg([0, 0, 0, 0, 0, 0.001], { c: '#3a2a26', px: 1.0, op: 1, keep: true });
const planeCrease = lineSeg([0, 0, 0, 0, 0, 0.001], inkSoft);
plane.add(planeMesh, planeEdge, planeCrease);
function buildPlane(d) {
  const { g, crease } = planeGeom(d);
  planeMesh.geometry.dispose(); planeMesh.geometry = g;
  planeEdge.geometry.dispose(); planeEdge.geometry = fatGeom(new THREE.EdgesGeometry(g, 1).attributes.position.array);
  planeCrease.geometry.dispose(); planeCrease.geometry = fatGeom(crease);
  planeSb.map = paperTexture(d.paper); planeSb.needsUpdate = true;
  Object.assign(PD, designPD(d));
}
buildPlane({ nose: 'classic', wings: 'classic', tips: 'flat', paper: 'notebook' });
scene.add(plane);
const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.28, 18).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.22, depthWrite: false }));
scene.add(shadow);

// trajectory preview (ballpoint dashes)
const MAXP = 160;
const previewGeom = new THREE.BufferGeometry();
previewGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXP * 3), 3));
const preview = new THREE.Line(previewGeom, new THREE.LineDashedMaterial({ color: '#2b4fbf', dashSize: 0.35, gapSize: 0.25, transparent: true, opacity: 0.9, fog: false }));
preview.visible = false; preview.frustumCulled = false;
scene.add(preview);
