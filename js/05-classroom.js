// Paper Planes · 05-classroom.js
// Hidden prototype level: the classroom (built but not reachable from the World button).
// Classic script: shares one global scope with the other js/ files, loaded in numeric order.
'use strict';

/* ---------- level 2: the classroom ---------- */
const clGroup = new THREE.Group(); clGroup.visible = false; _sceneAdd(clGroup);
let chalkCanvas = null, chalkTex = null;
function drawChalkboard() {
  const x = chalkCanvas.getContext('2d'), W = chalkCanvas.width, H = chalkCanvas.height;
  x.fillStyle = '#3c5a4c'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`; x.fillRect(Math.random() * W, Math.random() * H, 80 + Math.random() * 200, 20 + Math.random() * 40); }
  x.strokeStyle = 'rgba(245,245,235,0.9)'; x.fillStyle = 'rgba(245,245,235,0.9)'; x.lineCap = 'round'; x.lineJoin = 'round';
  x.font = '700 64px Kalam, "Patrick Hand", cursive'; x.fillText('Paper Planes 101', 60, 95);
  x.font = '400 40px Kalam, "Patrick Hand", cursive';
  x.fillText('lift  >  weight', 70, 175); x.fillText('distance = ?', 70, 235); x.fillText('no planes in class!', 640, 320);
  x.lineWidth = 4; x.beginPath(); x.moveTo(630, 330); x.lineTo(1000, 335); x.stroke();
  x.lineWidth = 5; x.beginPath(); x.moveTo(560, 170); x.lineTo(690, 120); x.lineTo(610, 210); x.closePath(); x.stroke();
  x.setLineDash([12, 14]); x.beginPath(); x.moveTo(690, 125); x.quadraticCurveTo(850, 40, 980, 160); x.stroke(); x.setLineDash([]);
  x.lineWidth = 3; x.beginPath(); x.moveTo(60, 270); x.lineTo(420, 270); x.stroke();
  if (chalkTex) chalkTex.needsUpdate = true;
}
{
  scene.add = (...o) => { clGroup.add(...o); return scene; };
  Object.keys(REG).forEach(k => { REG[k].length = 0; });
  const W = 18, L = 58, H = 7, ZB = 4, ZF = -54, ZC = (ZB + ZF) / 2;
  // floor: wooden planks
  const fc = document.createElement('canvas'); fc.width = fc.height = 512;
  { const x = fc.getContext('2d');
    for (let i = 0; i < 8; i++) {
      const tone = 200 + Math.floor(Math.random() * 28);
      x.fillStyle = `rgb(${tone},${Math.floor(tone * 0.76)},${Math.floor(tone * 0.52)})`; x.fillRect(i * 64, 0, 64, 512);
      x.strokeStyle = 'rgba(90,60,35,0.55)'; x.lineWidth = 3; x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, 512); x.stroke();
      const j = Math.random() * 512; x.beginPath(); x.moveTo(i * 64, j); x.lineTo(i * 64 + 64, j); x.stroke();
      for (let g = 0; g < 6; g++) { x.strokeStyle = 'rgba(120,80,45,0.18)'; x.lineWidth = 1.5; const gx = i * 64 + 6 + Math.random() * 52; x.beginPath(); x.moveTo(gx, 0); x.bezierCurveTo(gx + 6, 170, gx - 6, 340, gx + 3, 512); x.stroke(); }
    } }
  const floorTex = new THREE.CanvasTexture(fc); floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(W / 4, L / 4);
  floorTex.anisotropy = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
  const floorMat = pencilize(new THREE.MeshToonMaterial({ map: floorTex, gradientMap, color: new THREE.Color(1, 1, 1).multiplyScalar(0.95) }), 'floor');
  const floor = sketch(new THREE.PlaneGeometry(W, L).rotateX(-Math.PI / 2).translate(0, 0, ZC), '#d9b98c', { hull: false, sbMat: floorMat, cast: false, sbEdges: false });
  scene.add(floor);
  // walls + ceiling face inward, so the chase camera can see through them from outside
  const wallC = '#cfdde4', trimC = '#9fbaa9';
  scene.add(sketch(new THREE.PlaneGeometry(W, L).rotateX(Math.PI / 2).translate(0, H, ZC), '#f3efe6', { hull: false, cast: false, sb: '#f1ede4' }));
  scene.add(sketch(new THREE.PlaneGeometry(L, H).rotateY(Math.PI / 2).translate(-W / 2, H / 2, ZC), wallC, { hull: false, cast: false, sb: wallC }));
  scene.add(sketch(new THREE.PlaneGeometry(L, H).rotateY(-Math.PI / 2).translate(W / 2, H / 2, ZC), wallC, { hull: false, cast: false, sb: wallC }));
  scene.add(sketch(new THREE.PlaneGeometry(W, H).translate(0, H / 2, ZF), wallC, { hull: false, cast: false, sb: wallC }));
  scene.add(sketch(new THREE.PlaneGeometry(W, H).rotateY(Math.PI).translate(0, H / 2, ZB), wallC, { hull: false, cast: false, sb: wallC }));
  // painted lower band (wainscot) and baseboards
  scene.add(sketch(new THREE.PlaneGeometry(L, 1.1).rotateY(Math.PI / 2).translate(-W / 2 + 0.02, 0.55, ZC), trimC, { hull: false, cast: false, sb: trimC }));
  scene.add(sketch(new THREE.PlaneGeometry(L, 1.1).rotateY(-Math.PI / 2).translate(W / 2 - 0.02, 0.55, ZC), trimC, { hull: false, cast: false, sb: trimC }));
  scene.add(sketch(new THREE.PlaneGeometry(W, 1.1).translate(0, 0.55, ZF + 0.02), trimC, { hull: false, cast: false, sb: trimC }));
  // room shell collisions
  obstacles.push({ t: 'box', min: [-20, H, -60], max: [20, H + 10, 10], msg: 'Bonked the ceiling' },
    { t: 'box', min: [-20, 0, -60], max: [-W / 2, 20, 10], msg: 'Smacked the window wall' },
    { t: 'box', min: [W / 2, 0, -60], max: [20, 20, 10], msg: 'Smacked the side wall' },
    { t: 'box', min: [-20, 0, -70], max: [20, 20, ZF], msg: 'Smacked into the chalkboard' },
    { t: 'box', min: [-20, 0, ZB], max: [20, 20, 12], msg: 'Flew into the back wall' });

  // chalkboard
  chalkCanvas = document.createElement('canvas'); chalkCanvas.width = 1024; chalkCanvas.height = 384;
  drawChalkboard();
  chalkTex = new THREE.CanvasTexture(chalkCanvas);
  const boardMat = pencilize(new THREE.MeshToonMaterial({ map: chalkTex, gradientMap, color: new THREE.Color(1, 1, 1).multiplyScalar(0.9) }), 'board');
  scene.add(sketch(new THREE.PlaneGeometry(10, 3.75).translate(0, 3.3, ZF + 0.06), '#3c5a4c', { hull: false, sbMat: boardMat, cast: false, keepLines: true }));
  scene.add(sketch(merge([box(10.4, 0.18, 0.12, 0, 1.38, ZF + 0.08), box(10.4, 0.18, 0.12, 0, 5.22, ZF + 0.08), box(0.18, 4, 0.12, -5.15, 3.3, ZF + 0.08), box(0.18, 4, 0.12, 5.15, 3.3, ZF + 0.08), box(10, 0.08, 0.25, 0, 1.45, ZF + 0.15)]), '#b5865a', { sb: '#a8744a', cast: false }));
  // clock
  scene.add(sketch(new THREE.CylinderGeometry(0.45, 0.45, 0.08, 28).rotateX(Math.PI / 2).translate(6.6, 5.4, ZF + 0.06), '#ffffff', { sb: '#fbfaf5', cast: false }));
  scene.add(lineSeg([6.6, 5.4, ZF + 0.12, 6.6, 5.72, ZF + 0.12, 6.6, 5.4, ZF + 0.12, 6.82, 5.35, ZF + 0.12], inkLine));

  // windows on the left wall, radiators under two, sunbeams on the floor
  const heatLine = (ox, oz, color) => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(40 * 3), 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45 }));
    l.userData = { ox, oz, ph: Math.random() * 6, y0: 1.0, len: 5.2, amp: 0.25, spd: 2.4 }; l.frustumCulled = false;
    heat.push(l); scene.add(l);
  };
  [-8, -20, -32, -44].forEach((wz, i) => {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.6).rotateY(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#e2f2fc' }));
    pane.position.set(-W / 2 + 0.03, 3.2, wz); scene.add(pane);
    scene.add(sketch(merge([box(0.12, 0.14, 3.2, 0, 1.3, 0), box(0.12, 0.14, 3.2, 0, -1.3, 0), box(0.12, 2.74, 0.14, 0, 0, 1.55), box(0.12, 2.74, 0.14, 0, 0, -1.55),
      box(0.1, 2.6, 0.08, 0, 0, 0), box(0.1, 0.08, 3, 0, 0, 0), box(0.35, 0.08, 3.4, 0.12, -1.38, 0)]).translate(-W / 2 + 0.07, 3.2, wz), '#f7f3ea', { sb: '#f7f3ea', cast: false }));
    if (i === 0 || i === 2) { // radiator + heater updraft
      const fins = [box(0.25, 0.75, 1.8, 0, 0.5, 0)];
      for (let k = -0.8; k <= 0.8; k += 0.2) fins.push(box(0.3, 0.68, 0.04, 0, 0.5, k));
      scene.add(sketch(merge(fins).translate(-W / 2 + 0.25, 0, wz), '#e9e4da', { sb: '#e2ddd2' }));
      updrafts.push({ x: -W / 2 + 1.8, z: wz, r: 3.2, top: H, w: 3.4, kind: 'heater' });
      obstacles.push({ t: 'box', min: [-W / 2, 0, wz - 1], max: [-W / 2 + 0.45, 0.9, wz + 1], msg: 'Bonked the radiator' });
      for (let k = 0; k < 5; k++) heatLine(-W / 2 + 0.6 + Math.random() * 1.6, wz - 0.8 + Math.random() * 1.6, '#e0663f');
    }
    if (i === 1 || i === 3) { // sunbeam patch + gentle lift
      const beam = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#fff0b0', transparent: true, opacity: 0.5, depthWrite: false }));
      beam.position.set(-4.6, 0.012, wz + 0.4); beam.rotation.y = 0.12; scene.add(beam);
      updrafts.push({ x: -4.6, z: wz + 0.4, r: 2.8, top: H, w: 2.0, kind: 'sunbeam' });
      for (let k = 0; k < 4; k++) heatLine(-6 + Math.random() * 2.8, wz - 0.8 + Math.random() * 2.2, '#c99a22');
    }
    if (i === 1 || i === 3) { // open windows: breeze across the room (on some throws)
      addFan(0, 0, 90, { pos: { x: -W / 2 + 0.4, z: wz }, table: false, body: false, obstacle: false, len: 13, half: 1.9, y1: 4.6, w: 3.6, kind: 'window', streakY: 1.0 });
    }
  });

  // right wall: door, bulletin board, bookshelf
  scene.add(sketch(box(0.08, 2.4, 1.2, W / 2 - 0.05, 1.2, -1.5), '#a8744a', { sb: '#9a6a43', cast: false }));
  scene.add(sketch(box(0.06, 1.9, 4.2, W / 2 - 0.04, 2.7, -14), '#c99a62', { sb: '#c08f58', cast: false }));
  [['#fff6a8', -15.4, 3.1, 0.1], ['#ffc9c4', -13.6, 2.4, -0.15], ['#c6e2ff', -12.6, 3.2, 0.2], ['#ffffff', -14.4, 2.2, 0.05], ['#d9f2c6', -15.6, 2.3, -0.1]].forEach(([c, z, y, r]) => {
    const n = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.55).rotateY(-Math.PI / 2), toonMat(c)); n.position.set(W / 2 - 0.08, y, z); n.rotation.x = r; scene.add(n);
  });
  { const shelf = [box(0.7, 2.4, 0.08, 0, 1.2, -1.5), box(0.7, 2.4, 0.08, 0, 1.2, 1.5), box(0.7, 0.06, 3, 0, 0.05, 0), box(0.7, 0.06, 3, 0, 0.85, 0), box(0.7, 0.06, 3, 0, 1.65, 0), box(0.7, 0.06, 3, 0, 2.4, 0), box(0.06, 2.4, 3, 0.33, 1.2, 0)];
    scene.add(sketch(merge(shelf).translate(W / 2 - 0.4, 0, -28), '#b07d4f', { sb: '#a8744a' }));
    const bookCols = ['#d45545', '#4f86d4', '#f2c14e', '#57924a', '#8a5cb8', '#e98a3b'];
    [0.08, 0.88, 1.68].forEach(by => { let bz = -1.4; while (bz < 1.3) { const t = 0.08 + Math.random() * 0.1, h = 0.5 + Math.random() * 0.22;
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, t), toonMat(bookCols[Math.floor(Math.random() * bookCols.length)]));
      b.position.set(W / 2 - 0.45, by + h / 2, -28 + bz + t / 2); scene.add(b); bz += t + 0.01; } });
    obstacles.push({ t: 'box', min: [W / 2 - 0.8, 0, -29.6], max: [W / 2, 2.45, -26.4], msg: 'Bonked the bookshelf' }); }

  // student desks and chairs
  const tops = [], legs = [], chairsA = [], chairsB = [];
  [-7, -13, -19, -25, -31].forEach((dz, row) => [-6, -2, 2, 6].forEach(dx => {
    tops.push(box(1.2, 0.06, 0.7, dx, 0.76, dz));
    [[-0.52, -0.28], [0.52, -0.28], [-0.52, 0.28], [0.52, 0.28]].forEach(([lx, lz]) => legs.push(box(0.05, 0.74, 0.05, dx + lx, 0.37, dz + lz)));
    const ch = row % 2 ? chairsB : chairsA;
    ch.push(box(0.5, 0.05, 0.45, dx, 0.45, dz + 0.7), box(0.5, 0.42, 0.05, dx, 0.68, dz + 0.94));
    [[-0.22, 0.5], [0.22, 0.5], [-0.22, 0.9], [0.22, 0.9]].forEach(([lx, lz]) => legs.push(box(0.04, 0.45, 0.04, dx + lx, 0.22, dz + lz)));
    obstacles.push({ t: 'box', min: [dx - 0.62, 0, dz - 0.37], max: [dx + 0.62, 0.82, dz + 0.37], msg: 'Landed on a desk', stick: true },
      { t: 'box', min: [dx - 0.27, 0, dz + 0.9], max: [dx + 0.27, 0.92, dz + 0.98], msg: 'Bonked a chair' });
  }));
  scene.add(sketch(merge(tops), '#d6a874', { sb: '#c99566' }));
  scene.add(sketch(merge(legs), '#7d7f86', { sb: '#6d6f76', jit: 0.01 }));
  scene.add(sketch(merge(chairsA), '#4f86d4', { sb: '#4f86d4' }));
  scene.add(sketch(merge(chairsB), '#e98a3b', { sb: '#e98a3b' }));

  // teacher's desk, globe, apple, desk fan (headwind), trash can, beanbag
  const TD = -46;
  scene.add(sketch(merge([box(2.8, 0.08, 1.2, 0, 0.8, TD), box(0.1, 0.8, 1.2, -1.35, 0.4, TD), box(0.1, 0.8, 1.2, 1.35, 0.4, TD), box(2.6, 0.6, 0.06, 0, 0.45, TD + 0.55)]), '#a8744a', { sb: '#9a6a43' }));
  obstacles.push({ t: 'box', min: [-1.45, 0, TD - 0.65], max: [1.45, 0.86, TD + 0.65], msg: "Landed on the teacher's desk", stick: true });
  scene.add(sketch(new THREE.SphereGeometry(0.28, 20, 14).translate(0.9, 1.25, TD), '#5b9bd5', { sb: '#4f8fd0' }));
  scene.add(sketch(merge([new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6).translate(0.9, 0.97, TD), new THREE.CylinderGeometry(0.14, 0.16, 0.05, 12).translate(0.9, 0.86, TD)]), '#7d6a5a', { sb: '#6d5a4a' }));
  scene.add(sketch(new THREE.SphereGeometry(0.1, 14, 10).translate(-0.4, 0.94, TD + 0.1), '#d64535', { sb: '#d64535' }));
  scene.add(sketch(merge([box(0.5, 0.08, 0.36, 0.2, 0.88, TD - 0.2), box(0.46, 0.07, 0.34, 0.22, 0.955, TD - 0.2), box(0.48, 0.08, 0.35, 0.19, 1.03, TD - 0.21)]), '#4f86d4', { sb: '#57924a' }));
  addFan(0, 0, 180, { pos: { x: -0.9, z: TD - 0.2 }, table: false, baseY: 0.84, fanY: 0.32, size: 0.55, len: 11, half: 2.2, y1: 3.4, w: 4.6, kind: 'deskfan', obsR: 0.35, obsH: 1.3, msg: 'Bonked the desk fan', streakY: 0.6 });
  scene.add(sketch(new THREE.CylinderGeometry(0.36, 0.3, 0.62, 18, 1, true).translate(-2.6, 0.31, TD - 1.2), '#7f8fa3', { side: THREE.DoubleSide, hull: false, sb: '#7f8fa3' }));
  pools.push({ x: -2.6, z: TD - 1.2, r: 0.34, h: 0.6, kind: 'trash' });
  scene.add(sketch(new THREE.SphereGeometry(1, 22, 14).scale(1.1, 0.5, 1.1).translate(6.4, 0.48, TD - 1), '#e98a3b', { sb: '#e98a3b' }));
  tramps.push({ x: 6.4, z: TD - 1, r: 1.05, y: 0.95, kind: 'beanbag' });
  // crumpled paper balls
  for (let i = 0; i < 9; i++) scene.add(sketch(new THREE.IcosahedronGeometry(0.09, 0).translate((Math.random() - 0.5) * 14, 0.08, -4 - Math.random() * 44), '#fbfaf5', { sb: '#f3f1e8', jit: 0.005 }));

  // ceiling fans (downdraft that twists you) and hanging lights
  [-16, -34].forEach(fz => {
    const bladesG = new THREE.Group(); bladesG.position.set(0, 6.25, fz); scene.add(bladesG);
    [0, 1, 2, 3].forEach(k => { const b = sketch(box(1.5, 0.04, 0.32, 0.95, 0, 0), '#d9bf98', { sb: '#c9a77a' }); b.rotation.y = k * Math.PI / 2; bladesG.add(b); });
    scene.add(sketch(merge([new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6).translate(0, 6.65, fz), new THREE.CylinderGeometry(0.25, 0.2, 0.25, 14).translate(0, 6.25, fz)]), '#e9e4da', { sb: '#d8d2c6' }));
    devils.push({ x: 0, z: fz, r: 3.2, top: H, spin: 3.2, up: -3.0, on: true, fixed: true, kind: 'cfan', blades: bladesG, grp: new THREE.Object3D() });
    obstacles.push({ t: 'sph', c: [0, 6.25, fz], r: 1.5, msg: 'Clipped the ceiling fan' });
  });
  [-10, -25, -40].forEach(lz => [-5.5, 5.5].forEach(lx => {
    scene.add(lineSeg([lx, H, lz, lx, 5.75, lz], inkLine));
    scene.add(sketch(new THREE.ConeGeometry(0.42, 0.36, 18, 1, true).translate(lx, 5.6, lz), '#4f86d4', { side: THREE.DoubleSide, hull: false, sb: '#2f6a8f' }));
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff6cc' })); bulb.position.set(lx, 5.42, lz); scene.add(bulb);
    obstacles.push({ t: 'sph', c: [lx, 5.6, lz], r: 0.48, msg: 'Bumped a hanging light' });
  }));
  // blue tape distance lines
  for (let d = 10; d <= 50; d += 10) scene.add(sketch(box(W - 0.4, 0.006, 0.07, 0, 0.004, -d), '#5b86cf', { sb: '#5b86cf', hull: false, cast: false }));

  scene.add = _sceneAdd;
  LV.classroom = Object.assign(snapshot(), { launch: [0, 1.6, 0], v0: 5, vr: 8, gust: [0, 0], group: clGroup, fog: [45, 150] });
  Object.keys(REG).forEach(k => { REG[k].length = 0; REG[k].push(...LV.backyard[k]); });
}
