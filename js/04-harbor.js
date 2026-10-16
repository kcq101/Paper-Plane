// Paper Planes · 04-harbor.js
// World 2: Harbor City (tower, streets, buildings, laundry lines, promenade, sea, stacks, arches, gulls).
// Classic script: shares one global scope with the other js/ files, loaded in numeric order.
'use strict';

/* ---------- world 2: Harbor City (rooftops down to the sea) ---------- */
const hbGroup = new THREE.Group(); hbGroup.visible = false; _sceneAdd(hbGroup);
const SHORE_R = 336, SEA_Y = -3, harborBobs = [];
const seaU = { uTime: { value: 0 } };
function harborGround(x, z) { return Math.hypot(x, z) < SHORE_R ? 0 : SEA_Y; }
{
  scene.add = (...o) => { hbGroup.add(...o); return scene; };
  const keepRings = rings.slice(), keepBirds = birds.slice();
  Object.keys(REG).forEach(k => { REG[k].length = 0; });
  rings.length = 0; birds.length = 0;
  const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
  function mergeUV(geoms) {
    const pos = [], nor = [], uv = [];
    geoms.forEach(g => {
      const n = g.index ? g.toNonIndexed() : g, pa = n.attributes.position.array, na = n.attributes.normal.array, ua = n.attributes.uv ? n.attributes.uv.array : null;
      for (let i = 0; i < pa.length; i++) { pos.push(pa[i]); nor.push(na[i]); }
      for (let i = 0; i < pa.length / 3; i++) uv.push(ua ? ua[i * 2] : 0, ua ? ua[i * 2 + 1] : 0);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return g;
  }
  // facade: one 3 m window bay, tiled across every wall
  const fc = document.createElement('canvas'); fc.width = fc.height = 128;
  { const x = fc.getContext('2d');
    x.fillStyle = '#f6f1e8'; x.fillRect(0, 0, 128, 128);
    x.fillStyle = 'rgba(0,0,0,0.06)'; x.fillRect(0, 0, 128, 5);
    x.fillStyle = '#ece4d6'; x.fillRect(30, 26, 68, 80);
    x.fillStyle = '#7c97ab'; x.fillRect(36, 32, 56, 68);
    x.fillStyle = 'rgba(255,255,255,0.3)'; x.beginPath(); x.moveTo(40, 98); x.lineTo(60, 34); x.lineTo(70, 34); x.lineTo(50, 98); x.fill();
    x.fillStyle = '#ece4d6'; x.fillRect(62, 32, 4, 68); x.fillRect(36, 62, 56, 4);
    x.fillStyle = '#dccfba'; x.fillRect(26, 104, 76, 6); }
  const facadeTex = new THREE.CanvasTexture(fc); facadeTex.wrapS = facadeTex.wrapT = THREE.RepeatWrapping;
  facadeTex.anisotropy = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
  const facadeMats = {};
  const facade = c => facadeMats[c] || (facadeMats[c] = pencilize(new THREE.MeshToonMaterial({ map: facadeTex, gradientMap, color: new THREE.Color(c).multiplyScalar(0.94) }), 'facade'));
  function boxUV(w, h, d, x, y, z) {
    const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv.array;
    for (let v = 0; v < 24; v++) { const f = Math.floor(v / 4); uv[v * 2] *= (f < 2 ? d : w) / 3; uv[v * 2 + 1] *= (f === 2 || f === 3 ? d : h) / 3; }
    return g.translate(x, y, z);
  }
  function heatAt(x, y, z, n) {
    for (let k = 0; k < n; k++) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(40 * 3), 3));
      const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#eeae8a', transparent: true, opacity: 0.5, depthWrite: false }));
      l.userData = { ox: x + rnd(-0.8, 0.8), oz: z + rnd(-0.8, 0.8), ph: Math.random() * 6, y0: y, len: 7, amp: 0.22, spd: 2.4 }; l.frustumCulled = false;
      heat.push(l); scene.add(l);
    }
  }

  // the launch tower with its high balcony
  const BY = 22;
  scene.add(sketch(mergeUV([boxUV(12, 33, 12, 0, 16.5, 8.6)]), '#f4ece0', { sbMat: facade('#f4ece0') }));
  scene.add(sketch(new THREE.BoxGeometry(12.6, 0.6, 12.6).translate(0, 33.3, 8.6), '#a7a29a', { sb: '#b3ada3' }));
  scene.add(sketch(new THREE.BoxGeometry(6.2, 0.25, 3.6).translate(0, BY - 0.12, 0.8), '#e8d5b3', { sb: '#c69c6e' }));
  { const rail = [];
    [-3, -1.5, 0, 1.5, 3].forEach(x => rail.push(new THREE.BoxGeometry(0.09, 0.95, 0.09).translate(x, BY + 0.47, -0.95)));
    rail.push(new THREE.BoxGeometry(6.2, 0.08, 0.12).translate(0, BY + 0.95, -0.95), new THREE.BoxGeometry(0.08, 0.08, 3.5).translate(-3.05, BY + 0.95, 0.8), new THREE.BoxGeometry(0.08, 0.08, 3.5).translate(3.05, BY + 0.95, 0.8));
    scene.add(sketch(merge(rail), '#3e3e46', { sb: '#3e3e46' })); }
  obstacles.push({ t: 'box', min: [-6, 0, 2.62], max: [6, 34, 14.9], msg: 'Flew into the tower' },
    { t: 'box', min: [-3.1, BY - 0.25, -1], max: [3.1, BY + 0.02, 2.6], msg: 'Landed back on the balcony', stick: true });

  // ground, streets, promenade, seawall
  scene.add(sketch(new THREE.CircleGeometry(SHORE_R, 160).rotateX(-Math.PI / 2), '#cdbfa5', { sb: '#c9bba1', hull: false, cast: false, sbEdges: false }));
  const STREETS_X = [-96, -64, -32, 0, 32, 64, 96], CROSS_Z = [-10, -50, -90, -130, -170, -210, -250, -290];
  { const st = [];
    STREETS_X.forEach(x => st.push(new THREE.PlaneGeometry(10, 292).rotateX(-Math.PI / 2).translate(x, 0.02, -146)));
    CROSS_Z.forEach(z => st.push(new THREE.PlaneGeometry(202, 10).rotateX(-Math.PI / 2).translate(0, 0.025, z)));
    scene.add(sketch(merge(st), '#8a8580', { sb: '#8d8883', hull: false, cast: false, sbEdges: false }));
    const dash = []; for (let z = -6; z > -288; z -= 7) dash.push(new THREE.PlaneGeometry(0.25, 3).rotateX(-Math.PI / 2).translate(0, 0.04, z));
    scene.add(sketch(merge(dash), '#f3efe6', { sb: '#f3efe6', hull: false, cast: false, sbEdges: false })); }
  scene.add(sketch(new THREE.RingGeometry(SHORE_R - 18, SHORE_R, 160, 1).rotateX(-Math.PI / 2).translate(0, 0.035, 0), '#caa57c', { sb: '#c9a47b', hull: false, cast: false, sbEdges: false }));
  scene.add(sketch(new THREE.CylinderGeometry(SHORE_R, SHORE_R, 3.4, 220, 1, true).translate(0, -1.65, 0), '#b7a68c', { sb: '#b5a38a', side: THREE.DoubleSide, hull: false, cast: false, sbEdges: false }));

  // city blocks: colorful buildings, taller near the tower, lower toward the water
  const WALLS = ['#efe0c4', '#e8b58f', '#d98e5a', '#9cc3bb', '#e9b9ab', '#bccbdb', '#f1d27e', '#f4ece0'];
  const byColor = {}, flatRoofs = [], pitched = [], lots = [];
  for (let i = 0; i < STREETS_X.length - 1; i++) for (let j = 0; j < CROSS_Z.length - 1; j++) {
    const x0 = STREETS_X[i] + 5, x1 = STREETS_X[i + 1] - 5, z0 = CROSS_Z[j + 1] + 5, z1 = CROSS_Z[j] - 5;
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
      const lx0 = x0 + a * (x1 - x0) / 2 + 0.5, lx1 = x0 + (a + 1) * (x1 - x0) / 2 - 0.5;
      const lz0 = z0 + b * (z1 - z0) / 2 + 0.5, lz1 = z0 + (b + 1) * (z1 - z0) / 2 - 0.5;
      const cx = (lx0 + lx1) / 2, cz = (lz0 + lz1) / 2;
      if (Math.abs(Math.atan2(cx, -cz)) / D2R > 66 || Math.hypot(cx, cz) > SHORE_R - 34) continue;
      const hMax = 30 - 18 * clamp(-cz / 290, 0, 1), h = Math.round(rnd(6, hMax));
      const w = lx1 - lx0 - rnd(0, 1.2), d = lz1 - lz0 - rnd(0, 2), col = pick(WALLS);
      (byColor[col] = byColor[col] || []).push(boxUV(w, h, d, cx, h / 2, cz));
      let top = h + 0.45;
      if (h < 10) {
        const sh = new THREE.Shape([new THREE.Vector2(-w / 2 - 0.3, 0), new THREE.Vector2(w / 2 + 0.3, 0), new THREE.Vector2(0, 2.3)]);
        pitched.push(new THREE.ExtrudeGeometry(sh, { depth: d + 0.4, bevelEnabled: false }).translate(cx, h, cz - d / 2 - 0.2)); top = h + 2.3;
      } else flatRoofs.push(new THREE.BoxGeometry(w + 0.3, 0.45, d + 0.3).translate(cx, h + 0.22, cz));
      lots.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2, h, cx, cz, flat: h >= 10 });
      obstacles.push({ t: 'box', min: [cx - w / 2, 0, cz - d / 2], max: [cx + w / 2, top, cz + d / 2], msg: 'Smacked into a building', roof: true });
    }
  }
  Object.keys(byColor).forEach(c => scene.add(sketch(mergeUV(byColor[c]), c, { sbMat: facade(c), thr: 30, jit: 0.02 })));
  scene.add(sketch(merge(flatRoofs), '#a7a29a', { sb: '#b3ada3' }));
  scene.add(sketch(merge(pitched), '#b5533f', { sb: '#b9563f' }));

  // rooftop water towers and warm AC vents (lift)
  const towers = [], acs = [];
  lots.filter(l => l.flat).forEach(l => {
    const roof = l.h + 0.45;
    if (l.h >= 16 && Math.random() < 0.3) {
      const x = l.cx + rnd(-1.5, 1.5), z = l.cz + rnd(-2, 2);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => towers.push(new THREE.CylinderGeometry(0.08, 0.08, 3, 6).translate(x + a * 1.05, roof + 1.5, z + b * 1.05)));
      towers.push(new THREE.CylinderGeometry(1.5, 1.5, 2.6, 18).translate(x, roof + 4.3, z), new THREE.ConeGeometry(1.7, 1.0, 18).translate(x, roof + 6.1, z));
      obstacles.push({ t: 'box', min: [x - 1.7, roof, z - 1.7], max: [x + 1.7, roof + 6.6, z + 1.7], msg: 'Bonked a water tower' });
    } else if ((Math.abs(l.cx) < 20 && Math.random() < 0.3) || Math.random() < 0.15) {
      const x = l.cx + (l.cx > 0 ? -1 : 1) * rnd(0.5, 2), z = l.cz + rnd(-3, 3);
      acs.push(new THREE.BoxGeometry(1.8, 1.1, 1.4).translate(x, roof + 0.55, z));
      updrafts.push({ x: l.cx > 0 ? Math.min(x, 7.5) : Math.max(x, -7.5), z, r: 6, top: l.h + 18, w: 3.2, kind: 'vent' });
      heatAt(x, roof + 1.2, z, 4);
    }
  });
  if (towers.length) scene.add(sketch(merge(towers), '#9a6e4a', { sb: '#9a6e4a' }));
  if (acs.length) scene.add(sketch(merge(acs), '#d8d6d0', { sb: '#d2d0ca' }));

  // laundry lines across the main street
  const CLOTH = ['#e2483d', '#4f86d4', '#f2c14e', '#ffffff', '#7aa557', '#e98a3b'];
  lots.filter(l => l.x1 > -7 && l.x1 < 0 && Math.random() < 0.7).forEach(L => {
    const R = lots.find(r => r.x0 > 0 && r.x0 < 7 && r.z0 < L.z1 - 2 && r.z1 > L.z0 + 2);
    if (!R) return;
    const y = Math.min(L.h, R.h) - 2.2, z = (Math.max(L.z0, R.z0) + Math.min(L.z1, R.z1)) / 2;
    if (y < 5) return;
    const pts = [];
    for (let k = 0; k < 8; k++) { const t0 = k / 8, t1 = (k + 1) / 8, yy = t => y - 0.6 * Math.sin(Math.PI * t), xx = t => L.x1 + (R.x0 - L.x1) * t; pts.push(xx(t0), yy(t0), z, xx(t1), yy(t1), z); }
    scene.add(lineSeg(pts, { c: '#5a5048', px: 1.6, op: 1, keep: true }));
    for (let k = 0; k < 5; k++) {
      const t = 0.15 + k * 0.17, cw = rnd(0.6, 1.0), ch = rnd(0.8, 1.2);
      const cl = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch).translate(0, -ch / 2, 0), toonMat(pick(CLOTH), THREE.DoubleSide));
      cl.position.set(L.x1 + (R.x0 - L.x1) * t, y - 0.6 * Math.sin(Math.PI * t), z);
      scene.add(cl); harborBobs.push({ g: cl, ph: Math.random() * 6, cloth: true });
    }
    obstacles.push({ t: 'seg', a: [L.x1, y - 0.5, z], b: [R.x0, y - 0.5, z], r: 0.75, msg: 'Snagged on a laundry line', stick: true });
  });

  // wind tunnels down some cross streets (on some throws)
  [[CROSS_Z[2], 1], [CROSS_Z[4], -1], [CROSS_Z[6], 1]].forEach(([z, dir]) => {
    addFan(0, 0, dir > 0 ? 90 : -90, { pos: { x: -104 * dir, z }, table: false, body: false, obstacle: false, len: 208, half: 4.5, y1: 16, w: 3.0, kind: 'street', streakY: 2 });
  });

  // promenade: lampposts and palm trees
  { const lamps = [];
    for (let deg = -64; deg <= 64; deg += 8) { const p = polar(SHORE_R - 2.5, deg); lamps.push(new THREE.CylinderGeometry(0.08, 0.1, 4, 8).translate(p.x, 2, p.z), new THREE.SphereGeometry(0.26, 10, 8).translate(p.x, 4.15, p.z)); obstacles.push({ t: 'cyl', x: p.x, z: p.z, r: 0.3, h: 4.4, msg: 'Bonked a lamppost' }); }
    scene.add(sketch(merge(lamps), '#3e3e46', { sb: '#3e3e46' })); }
  [-54, -38, -22, 22, 38, 54].forEach(deg => {
    const p = polar(SHORE_R - 11, deg + rnd(-2, 2)), lean = rnd(-0.12, 0.12);
    const trunk = sketch(new THREE.CylinderGeometry(0.22, 0.34, 7.5, 8).translate(0, 3.75, 0), '#a07c58', { sb: '#9a7552' });
    trunk.position.set(p.x, 0, p.z); trunk.rotation.z = lean; scene.add(trunk);
    const fr = [];
    for (let k = 0; k < 7; k++) fr.push(new THREE.SphereGeometry(1, 10, 6).scale(0.55, 0.12, 2.8).translate(0, 0, 2.3).rotateX(0.45).rotateY(k * Math.PI * 2 / 7 + rnd(-0.2, 0.2)));
    const leaves = sketch(merge(fr), '#7aa557', { sb: '#6f9e4a' });
    leaves.position.set(p.x - Math.sin(lean) * 7.5, 7.4, p.z); scene.add(leaves);
    contactBlob(p.x, p.z, 1.2, 1.2, 0.4);
    swayers.push({ s: 1, ph: Math.random() * 6.28, crowns: [{ c: leaves, base: leaves.position.clone(), k: 1.3, lag: 0 }] });
    obstacles.push({ t: 'cyl', x: p.x, z: p.z, r: 0.45, h: 7.3, msg: 'Bonked a palm tree' }, { t: 'sph', c: [leaves.position.x, 7.4, p.z], r: 2.6, msg: 'Caught in a palm tree', stick: true });
  });

  // the sea
  { const m = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap });
    m.onBeforeCompile = sh => {
      sh.uniforms.uTime = seaU.uTime;
      sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = `varying vec3 vWP;uniform float uTime;
float sH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float sN(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);return mix(mix(sH(i),sH(i+vec2(1.0,0.0)),u.x),mix(sH(i+vec2(0.0,1.0)),sH(i+vec2(1.0,1.0)),u.x),u.y);}
` + sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );',
        `float r = length(vWP.xz);
         float n1 = sN(vWP.xz / 40.0 + uTime * 0.02), n2 = sN(vWP.xz / 9.0 - uTime * 0.06), n3 = sN(vWP.xz * 0.55 + vec2(uTime * 0.3, -uTime * 0.2));
         vec3 deep = vec3(0.19, 0.46, 0.57), shallow = vec3(0.33, 0.67, 0.70);
         vec3 c = mix(deep, shallow, (1.0 - smoothstep(${SHORE_R + 4}.0, ${SHORE_R + 110}.0, r)) * 0.85 + n1 * 0.15);
         c *= 0.92 + 0.12 * n2;
         c = mix(c, vec3(0.95, 0.97, 0.96), smoothstep(${SHORE_R + 7}.0, ${SHORE_R + 1}.0, r) * (0.55 + 0.45 * n3));
         c += smoothstep(0.82, 0.96, n3) * (1.0 - smoothstep(30.0, 160.0, distance(vWP, cameraPosition))) * 0.16;
         vec4 diffuseColor = vec4(c, opacity);`);
    };
    const sea = new THREE.Mesh(new THREE.CircleGeometry(1500, 160).rotateX(-Math.PI / 2).translate(0, SEA_Y, 0), pencilize(m, 'sea'));
    sea.receiveShadow = true; scene.add(sea); }

  // rocky point with a lighthouse
  { const p = polar(372, 24);
    scene.add(sketch(blob(new THREE.IcosahedronGeometry(1, 3), 15, 7, 12).translate(p.x, SEA_Y + 0.5, p.z), '#c9b08a', { sb: '#c2a882' }));
    const base = SEA_Y + 5;
    scene.add(sketch(new THREE.CylinderGeometry(1.9, 2.6, 22, 24).translate(p.x, base + 11, p.z), '#f4f1ea', { sb: '#f4f1ea' }));
    scene.add(sketch(merge([new THREE.CylinderGeometry(2.38, 2.48, 3, 24).translate(p.x, base + 6, p.z), new THREE.CylinderGeometry(2.08, 2.18, 3, 24).translate(p.x, base + 15, p.z),
      new THREE.ConeGeometry(2.2, 2.2, 24).translate(p.x, base + 26.3, p.z)]), '#d64535', { sb: '#d64535' }));
    scene.add(sketch(merge([new THREE.CylinderGeometry(2.7, 2.7, 0.3, 24).translate(p.x, base + 22.1, p.z), new THREE.TorusGeometry(2.6, 0.06, 6, 32).rotateX(Math.PI / 2).translate(p.x, base + 23, p.z)]), '#3e3e46', { sb: '#3e3e46' }));
    scene.add(sketch(new THREE.CylinderGeometry(1.5, 1.5, 2.6, 20).translate(p.x, base + 23.6, p.z), '#fff3c4', { sb: '#fff3c4', cast: false }));
    obstacles.push({ t: 'cyl', x: p.x, z: p.z, r: 3, h: base + 27.5, msg: 'Bonked the lighthouse' }, { t: 'sph', c: [p.x, SEA_Y - 1, p.z], r: 9, msg: 'Landed on the rocky point', stick: true });
    updrafts.push({ x: p.x, z: p.z, r: 16, top: 60, w: 2.8, kind: 'thermal' }); }

  // pier with moored boats
  function boat(x, z, rot, sail) {
    const g = new THREE.Group();
    g.add(sketch(new THREE.BoxGeometry(1.7, 0.8, 4.6).translate(0, 0.4, 0), '#f4f1ea', { sb: '#f4f1ea' }));
    g.add(sketch(new THREE.BoxGeometry(1.75, 0.18, 4.65).translate(0, 0.25, 0), sail === '#ffffff' ? '#4f86d4' : '#e2483d', { sb: sail === '#ffffff' ? '#4f86d4' : '#e2483d', hull: false }));
    g.add(sketch(new THREE.CylinderGeometry(0.06, 0.06, 7, 6).translate(0, 4.3, -0.3), '#5a5048', { sb: '#5a5048', hull: false }));
    const s = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0, 5.6), new THREE.Vector2(2.4, 0.5)]);
    const sm = new THREE.Mesh(new THREE.ShapeGeometry(s).rotateY(-Math.PI / 2).translate(0, 1.3, -0.25), toonMat(sail, THREE.DoubleSide));
    g.add(sm);
    g.position.set(x, SEA_Y + 0.05, z); g.rotation.y = rot; scene.add(g);
    harborBobs.push({ g, ph: Math.random() * 6, y: SEA_Y + 0.05 });
    obstacles.push({ t: 'cyl', x, z, r: 0.7, h: SEA_Y + 8.4, msg: 'Snagged a sailboat mast' });
  }
  { const deg = -24, len = 60;
    const deck = [], posts = [];
    for (let k = 0; k < len; k += 6) {
      const p = polar(SHORE_R + k + 3, deg);
      deck.push(new THREE.BoxGeometry(5, 0.35, 6.1).rotateY(-deg * D2R).translate(p.x, -0.2, p.z));
      [-2.2, 2.2].forEach(o => { const q = { x: p.x + Math.cos(deg * D2R) * o, z: p.z + Math.sin(deg * D2R) * o }; posts.push(new THREE.CylinderGeometry(0.16, 0.16, 3.4, 6).translate(q.x, -1.8, q.z)); });
      obstacles.push({ t: 'box', min: [p.x - 3.2, SEA_Y, p.z - 3.2], max: [p.x + 3.2, 0, p.z + 3.2], msg: 'Landed on the pier', stick: true });
    }
    scene.add(sketch(merge(deck), '#b58a5e', { sb: '#b0855a' }));
    scene.add(sketch(merge(posts), '#7d5d45', { sb: '#7d5d45' }));
    [[14, 1], [26, -1], [40, 1], [50, -1]].forEach(([k, side], i) => {
      const p = polar(SHORE_R + k, deg), o = 5.2 * side;
      boat(p.x + Math.cos(deg * D2R) * o, p.z + Math.sin(deg * D2R) * o, -deg * D2R + rnd(-0.1, 0.1), i % 2 ? '#ffffff' : '#f2c14e');
    }); }
  [[520, 32], [640, -40], [760, 4], [900, 38], [980, -22]].forEach(([r, deg]) => { const p = polar(r, deg); boat(p.x, p.z, Math.random() * 6.28, pick(['#ffffff', '#f2c14e', '#e98a3b'])); });

  // sea stacks (grassy tops, rising air) and rock arches
  function stackGeo(rad, h) {
    const g = new THREE.CylinderGeometry(rad * 0.72, rad * 1.1, h, 16, 8), p = g.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { const y = p[i + 1], a = Math.atan2(p[i + 2], p[i]), k = 1 + 0.12 * Math.sin(y * 0.35 + a * 3) + 0.08 * Math.sin(a * 5 + y * 0.2); p[i] *= k; p[i + 2] *= k; }
    g.computeVertexNormals();
    return g.translate(0, h / 2, 0);
  }
  const foam = [];
  [[470, 24, 38, 9], [525, -26, 52, 11], [625, -3, 22, 8], [690, 30, 60, 13], [780, -36, 45, 10], [860, 16, 35, 9], [960, -12, 70, 14], [1060, 26, 40, 12]].forEach(([r, deg, h, rad]) => {
    const p = polar(r, deg);
    const st = sketch(stackGeo(rad, h + 4), '#d9b48a', { sb: '#d4ac80' }); st.position.set(p.x, SEA_Y - 4, p.z); scene.add(st);
    const cap = sketch(blob(new THREE.IcosahedronGeometry(rad * 0.78, 2), 1, 0.32, 1), '#7aa557', { sb: '#79a456' }); cap.position.set(p.x, SEA_Y + h, p.z); scene.add(cap);
    foam.push(new THREE.RingGeometry(rad * 1.05, rad * 1.5, 32).rotateX(-Math.PI / 2).translate(p.x, SEA_Y + 0.05, p.z));
    obstacles.push({ t: 'cyl', x: p.x, z: p.z, r: rad * 1.05, h: SEA_Y + h + 1.2, msg: 'Bonked a sea stack' });
    updrafts.push({ x: p.x, z: p.z, r: rad + 10, top: SEA_Y + h + 45, w: 3.2, kind: 'thermal' });
  });
  const archRings = [];
  [[430, -8], [570, 12], [730, -16]].forEach(([r, deg]) => {
    const p = polar(r, deg), R = 14, tube = 3.6, g = new THREE.TorusGeometry(R, tube, 12, 32, Math.PI), pa = g.attributes.position.array;
    for (let i = 0; i < pa.length; i += 3) { const k = 1 + 0.06 * Math.sin(pa[i] * 0.5 + pa[i + 1] * 0.7) * Math.sin(pa[i + 2] * 0.9); pa[i] *= k; pa[i + 1] *= k; pa[i + 2] *= k; }
    g.computeVertexNormals();
    const a = sketch(g, '#d9b48a', { sb: '#d4ac80' }); a.position.set(p.x, SEA_Y - 1, p.z); a.rotation.y = -deg * D2R; scene.add(a);
    const th = -deg * D2R;
    for (let k = 0; k <= 10; k++) { const ang = k / 10 * Math.PI, lx = Math.cos(ang) * R, ly = Math.sin(ang) * R; obstacles.push({ t: 'sph', c: [p.x + lx * Math.cos(th), SEA_Y - 1 + ly, p.z - lx * Math.sin(th)], r: tube * 1.05, msg: 'Bonked the rock arch' }); }
    [-1, 1].forEach(sd => foam.push(new THREE.RingGeometry(tube, tube * 1.6, 24).rotateX(-Math.PI / 2).translate(p.x + sd * R * Math.cos(th), SEA_Y + 0.05, p.z - sd * R * Math.sin(th))));
    archRings.push([p.x, SEA_Y - 1 + R * 0.45, p.z]);
  });
  scene.add(new THREE.Mesh(merge(foam), new THREE.MeshBasicMaterial({ color: '#f2f6f4', transparent: true, opacity: 0.7, depthWrite: false })));
  // distant islands
  [[1180, -18, 90, 16, 60], [1250, 32, 120, 22, 70], [1150, 55, 70, 12, 45]].forEach(([r, deg, sx, sy, sz]) => {
    const p = polar(r, deg);
    scene.add(sketch(blob(new THREE.IcosahedronGeometry(1, 3), sx, sy, sz).translate(p.x, SEA_Y - 2, p.z), '#7aa557', { sb: '#6f9a4c', cast: false }));
  });

  // rings and seagulls
  function ringAt(x, y, z) {
    const deg = Math.atan2(x, -z) / D2R;
    const m = sketch(ringGeom, '#f2c14e', { sb: '#f2b928', cast: false, thr: 60 });
    m.position.set(x, y, z); m.rotation.y = -deg * D2R; scene.add(m);
    rings.push({ c: new THREE.Vector3(x, y, z), n: new THREE.Vector3(Math.sin(deg * D2R), 0, -Math.cos(deg * D2R)), R: 2.45, mesh: m, got: false, t: 0 });
  }
  [[0, 21.5, -40], [0, 19, -100], [32, 17, -150], [0, 18, -205], [-32, 15, -250], [0, 14, -300], [0, 20, -380]].forEach(a => ringAt(...a));
  archRings.forEach(a => ringAt(...a));
  [[38, 18, -480], [-33, 34, -625], [20, 10, -800], [-40, 18, -905]].forEach(a => ringAt(...a));
  const gullMat = toonMat('#f6f5f0', THREE.DoubleSide), gullWing = toonMat('#cfd3d8', THREE.DoubleSide);
  function gulls(x, z, R, y, w, count = 2) {
    for (let i = 0; i < count; i++) {
      const g = new THREE.Group(), L = new THREE.Mesh(wingGeom, gullWing), Rw = new THREE.Mesh(wingGeom, gullWing);
      Rw.scale.x = -1;
      g.add(new THREE.Mesh(birdBody, gullMat), new THREE.Mesh(birdBeak, beakMat), L, Rw);
      g.scale.setScalar(1.6); scene.add(g);
      birds.push({ cx: x, cz: z, R: R * (0.85 + 0.3 * Math.random()), y: y + rnd(-1, 1), w, ph: i * 0.55 + Math.random() * 0.3, g, L, Rw, flap: Math.random() * 6, gone: false, near: false, pos: new THREE.Vector3(), vel: new THREE.Vector3() });
    }
  }
  [[0, -100, 9, 19.5, 0.4, 2], [0, -205, 8, 18.5, -0.42, 2], [-20, -250, 14, 15, 0.35, 2], [0, -320, 18, 15, 0.3, 3], [0, -380, 12, 21, -0.36, 2],
    [38, -480, 12, 18, 0.32, 2], [-33, -625, 10, 34, -0.3, 2], [20, -800, 14, 10, 0.28, 3], [-60, -700, 25, 20, 0.22, 2]].forEach(a => gulls(...a));

  scene.add = _sceneAdd;
  LV.harbor = Object.assign(snapshot(), { launch: [0, BY + 1.1, 0], v0: 6, vr: 11, gust: [0, 0], group: hbGroup, fog: null, rings: rings.slice(), birds: birds.slice() });
  LV.backyard.rings = keepRings; LV.backyard.birds = keepBirds;
  rings.length = 0; rings.push(...keepRings); birds.length = 0; birds.push(...keepBirds);
  Object.keys(REG).forEach(k => { REG[k].length = 0; REG[k].push(...LV.backyard[k]); });
}
