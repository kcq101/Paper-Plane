// Paper Planes · 02-backyard.js
// World 1: the backyard (grills, sunspots, trees, fans, sprinklers, fence, hedge), the canyon terrain, rings and birds.
// Classic script: shares one global scope with the other js/ files, loaded in numeric order.
'use strict';

/* ---------- world registries ---------- */
const obstacles = [], updrafts = [], sprinklers = [], fans = [], devils = [], tramps = [], pools = [];
const REG = { obstacles, updrafts, sprinklers, fans, devils, tramps, pools };
const LV = {};
const snapshot = () => { const o = {}; Object.keys(REG).forEach(k => { o[k] = REG[k].slice(); }); return o; };
const _sceneAdd = scene.add.bind(scene);
const byGroup = new THREE.Group(); _sceneAdd(byGroup);
scene.add = (...o) => { byGroup.add(...o); return scene; }; // everything below until the sprites lands in the backyard
const LAUNCH = new THREE.Vector3(0, 2.4, 0);
const GUST = { z0: -44, z1: -62, w: 3.2 };
const FENCE_R = 90, HEDGE_R = 240, YARD_DEG = 75, RIM_R = 244;

// ground: mowed stripes, hatched in pencil
const groundMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({}, shared, { uA: { value: new THREE.Color('#e7f0d8') }, uB: { value: new THREE.Color('#dbe8c6') } }),
  vertexShader: `varying vec3 vW;varying float vDepth;void main(){vec4 w=modelMatrix*vec4(position,1.0);vW=w.xyz;vec4 mv=viewMatrix*w;vDepth=-mv.z;gl_Position=projectionMatrix*mv;}`,
  fragmentShader: `uniform vec3 uA;uniform vec3 uB;uniform vec3 uInk;uniform vec3 uPaper;uniform float uPx;uniform float uFogNear;uniform float uFogFar;
varying vec3 vW;varying float vDepth;${HL}
void main(){float s=step(0.5,fract(length(vW.xz)/8.0));vec3 c=mix(uA,uB,s);vec2 p=gl_FragCoord.xy/uPx;
c=mix(c,uInk,hl(p.x*0.7+p.y*1.3,7.0)*s*0.16);c=mix(c,uPaper,smoothstep(uFogNear,uFogFar,vDepth));gl_FragColor=vec4(c,1.0);}`
});
const ground = new THREE.Mesh(new THREE.CircleGeometry(RIM_R, 160).rotateX(-Math.PI / 2), groundMat);
ground.receiveShadow = true;
scene.add(ground);
const groundSb = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap });
groundSb.onBeforeCompile = sh => {
  sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = `varying vec3 vWP;
float gH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float gN(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);return mix(mix(gH(i),gH(i+vec2(1.0,0.0)),u.x),mix(gH(i+vec2(0.0,1.0)),gH(i+vec2(1.0,1.0)),u.x),u.y);}
` + sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );',
    `float rr = length(vWP.xz) / 8.0; float st = smoothstep(0.4, 0.6, abs(fract(rr) - 0.5) * 2.0);
     vec3 gA = vec3(0.40, 0.575, 0.27), gB = gA * 0.86;
     vec3 gc = mix(gA, gB, st);
     float n1 = gN(vWP.xz / 16.0), n2 = gN(vWP.xz / 3.6 + 7.3), n3 = gN(vWP.xz * 1.7 + 3.1);
     float near = 1.0 - smoothstep(18.0, 70.0, distance(vWP, cameraPosition));
     gc *= 0.88 + 0.24 * n1;
     gc = mix(gc, gc * vec3(1.1, 1.06, 0.8), smoothstep(0.62, 0.9, n1) * 0.55);
     gc *= 0.93 + 0.14 * n2;
     gc *= 1.0 + (n3 - 0.5) * 0.22 * near;
     vec4 diffuseColor = vec4(gc, opacity);`);
};
const groundSk = groundMat;
pencilize(groundSb, 'ground');

// grass tufts across the whole fan
{
  const pts = [];
  for (let i = 0; i < 2800; i++) {
    const r = 3 + Math.sqrt(Math.random()) * (RIM_R - 11), a = (Math.random() * 2 - 1) * 78;
    const { x, z } = polar(r, a);
    if (Math.abs(x) < 3 && z > -1.5) continue;
    for (let k = -1; k <= 1; k++) pts.push(x + k * 0.06, 0.01, z, x + k * 0.13 + (Math.random() - 0.5) * 0.05, 0.18 + Math.random() * 0.12 - Math.abs(k) * 0.05, z);
  }
  scene.add(lineSeg(pts, new THREE.LineBasicMaterial({ color: '#5d7748', transparent: true, opacity: 0.55 })));
}

// tall house with a top-floor balcony: the high launch spot
{
  const HH = 11.6, BY = 9.9;
  scene.add(sketch(box(12, HH, 10, 0, HH / 2, 7.6), '#e9d8bf', { sb: '#e6d3b6' }));
  const shape = new THREE.Shape([new THREE.Vector2(-6.6, 0), new THREE.Vector2(6.6, 0), new THREE.Vector2(0, 3.4)]);
  scene.add(sketch(new THREE.ExtrudeGeometry(shape, { depth: 10.8, bevelEnabled: false }).translate(0, HH, 2.2), '#d6a891', { sb: '#b5533f' }));
  const wins = [];
  [[-3.6, 2.2], [3.6, 2.2], [-3.6, 5.8], [3.6, 5.8], [-3.6, 9.4], [3.6, 9.4]].forEach(([wx, wy]) => wins.push(box(1.5, 1.7, 0.08, wx, wy, 2.6)));
  wins.push(box(1.4, 2.3, 0.08, 0, 1.15, 2.6), box(1.6, 2.3, 0.08, 0, BY + 1.15, 2.6));
  scene.add(sketch(merge(wins), '#5d7fa3', { sb: '#4d6f96' }));
  // balcony floor, railing and stilts
  scene.add(sketch(box(6.2, 0.25, 3.6, 0, BY - 0.12, 0.8), '#e8d5b3', { sb: '#c69c6e' }));
  const rail = [];
  [-3, -1.5, 0, 1.5, 3].forEach(x => rail.push(box(0.09, 0.95, 0.09, x, BY + 0.47, -0.95)));
  rail.push(box(6.2, 0.08, 0.12, 0, BY + 0.95, -0.95), box(0.08, 0.08, 3.5, -3.05, BY + 0.95, 0.8), box(0.08, 0.08, 3.5, 3.05, BY + 0.95, 0.8),
    box(0.09, 0.95, 0.09, -3.05, BY + 0.47, 2.5), box(0.09, 0.95, 0.09, 3.05, BY + 0.47, 2.5));
  scene.add(sketch(merge(rail), '#efe0c4', { jit: 0.015, sb: '#efe2c8' }));
  scene.add(sketch(merge([new THREE.CylinderGeometry(0.16, 0.2, BY, 8).translate(-2.8, BY / 2, -0.7), new THREE.CylinderGeometry(0.16, 0.2, BY, 8).translate(2.8, BY / 2, -0.7)]), '#efe0c4', { sb: '#d9c4a3' }));
  obstacles.push({ t: 'box', min: [-6, 0, 2.62], max: [6, HH + 3.4, 12.6], msg: 'Flew into the house' },
    { t: 'box', min: [-3.1, BY - 0.25, -1], max: [3.1, BY + 0.02, 2.6], msg: 'Landed back on the balcony', stick: true },
    { t: 'cyl', x: -2.8, z: -0.7, r: 0.25, h: BY, msg: 'Bonked a balcony post' }, { t: 'cyl', x: 2.8, z: -0.7, r: 0.25, h: BY, msg: 'Bonked a balcony post' });
}

/* ---------- lift: grills ---------- */
const heat = [];
// soft contact shading so objects sit firmly on the lawn
let blobTex = null;
function contactBlob(x, z, rx, rz = rx, op = 0.42, rot = 0) {
  if (!blobTex) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g2 = c.getContext('2d'), gr = g2.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.65)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g2.fillStyle = gr; g2.fillRect(0, 0, 128, 128);
    blobTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(rx * 2, rz * 2).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: blobTex, color: '#1f2e14', transparent: true, opacity: op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.position.set(x, 0.025, z); m.rotation.y = rot; m.renderOrder = 1;
  scene.add(m);
  return m;
}
// porcelain enamel for the kettle grills: glossy, finely speckled, with a little orange-peel texture
let enamelMat = null, grillTrimMat = null;
function grillEnamel() {
  if (enamelMat) return enamelMat;
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#d9503f'); g.addColorStop(0.55, '#cc4436'); g.addColorStop(1, '#b8392e');
  x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) { // enamel flecks
    const r = Math.random() < 0.85 ? 0.6 + Math.random() * 0.9 : 1.6 + Math.random() * 1.4;
    x.fillStyle = Math.random() < 0.6 ? `rgba(70,16,12,${0.25 + Math.random() * 0.35})` : `rgba(255,214,190,${0.18 + Math.random() * 0.3})`;
    x.beginPath(); x.arc(Math.random() * 512, Math.random() * 512, r, 0, Math.PI * 2); x.fill();
  }
  for (let i = 0; i < 14; i++) { // faint heat-tint streaks near the bottom of the bowl
    x.strokeStyle = `rgba(90,30,20,${0.05 + Math.random() * 0.06})`; x.lineWidth = 6 + Math.random() * 10;
    const px = Math.random() * 512; x.beginPath(); x.moveTo(px, 300 + Math.random() * 80); x.lineTo(px + (Math.random() - 0.5) * 40, 512); x.stroke();
  }
  const b = document.createElement('canvas'); b.width = b.height = 256;
  const bx = b.getContext('2d'), id = bx.createImageData(256, 256);
  for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 70; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  bx.putImageData(id, 0, 0); bx.filter = 'blur(1.5px)'; bx.drawImage(b, 0, 0);
  const map = new THREE.CanvasTexture(c), bump = new THREE.CanvasTexture(b);
  map.anisotropy = bump.anisotropy = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping; bump.repeat.set(3, 2);
  enamelMat = pencilize(new THREE.MeshPhongMaterial({ map, bumpMap: bump, bumpScale: 0.012, shininess: 70, specular: new THREE.Color('#ffe9de').multiplyScalar(0.45),
    color: new THREE.Color(1, 1, 1).multiplyScalar(1 / Math.max(1, litMaxU.value)), side: THREE.DoubleSide }), 'enamel');
  grillTrimMat = pencilize(new THREE.MeshPhongMaterial({ color: '#2f2f35', shininess: 40, specular: new THREE.Color('#888888') }), 'grilltrim');
  return enamelMat;
}
function addGrill(r, deg) {
  const { x, z } = polar(r, deg);
  const grp = new THREE.Group();
  const legs = [0, 1, 2].map(i => { const a = i * 2.094; return new THREE.CylinderGeometry(0.025, 0.025, 0.85, 8).translate(Math.cos(a) * 0.3, 0.42, Math.sin(a) * 0.3); });
  legs.push(new THREE.TorusGeometry(0.3, 0.012, 6, 24).rotateX(Math.PI / 2).translate(0, 0.3, 0)); // ash-pan ring
  grp.add(sketch(merge(legs), '#55555c', { jit: 0.01, sb: '#3e3e46' }));
  const em = grillEnamel();
  grp.add(sketch(new THREE.SphereGeometry(0.45, 36, 18, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0, 0.98, 0), '#e9a497', { sbMat: em, side: THREE.DoubleSide, thr: 50, jit: 0.015, hull: false }));
  grp.add(sketch(new THREE.SphereGeometry(0.44, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 1.02, 0), '#e9a497', { sbMat: em, thr: 50, jit: 0.015 }));
  // trim: lid rim seam, top vent, lid handle and side handles
  const trim = [new THREE.TorusGeometry(0.452, 0.014, 8, 40).rotateX(Math.PI / 2).translate(0, 1.0, 0),
    new THREE.CylinderGeometry(0.09, 0.1, 0.035, 20).translate(0, 1.465, 0),
    new THREE.TorusGeometry(0.1, 0.018, 8, 20, Math.PI).translate(0, 1.36, 0).rotateY(0.3),
    new THREE.BoxGeometry(0.03, 0.06, 0.03).translate(-0.1, 1.335, 0).rotateY(0.3), new THREE.BoxGeometry(0.03, 0.06, 0.03).translate(0.1, 1.335, 0).rotateY(0.3),
    new THREE.BoxGeometry(0.16, 0.03, 0.05).translate(0.5, 0.97, 0), new THREE.BoxGeometry(0.16, 0.03, 0.05).translate(-0.5, 0.97, 0)];
  grp.add(sketch(merge(trim), '#55555c', { sbMat: grillTrimMat, thr: 50, jit: 0.01 }));
  grp.position.set(x, 0, z);
  scene.add(grp);
  contactBlob(x, z, 0.6, 0.6, 0.5);
  updrafts.push({ x, z, r: 6, top: 16, w: 4.2, kind: 'grill' });
  obstacles.push({ t: 'cyl', x, z, r: 0.5, h: 1.5, msg: 'Singed on the grill' });
  for (let i = 0; i < 7; i++) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(40 * 3), 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#eeae8a', transparent: true, opacity: 0.5, depthWrite: false }));
    const a = i / 7 * Math.PI * 2, rr = 0.3 + (i % 3) * 1.1;
    l.userData = { ox: x + Math.cos(a) * rr, oz: z + Math.sin(a) * rr, ph: Math.random() * 6, y0: 1.3, len: 8.6, amp: 0.22, spd: 3.2 };
    l.frustumCulled = false;
    heat.push(l); scene.add(l);
  }
}
addGrill(17, 8); addGrill(36, -42); addGrill(62, 34);

/* ---------- lift: sunspot thermals ---------- */
function addSunspot(r, deg, rad) {
  const { x, z } = polar(r, deg);
  const patch = new THREE.Mesh(new THREE.CircleGeometry(rad, 36).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#f6e39a', transparent: true, opacity: 0.6, depthWrite: false }));
  patch.position.set(x, 0.015, z);
  scene.add(patch);
  const ring = ringLine(rad, 0.03, new THREE.LineBasicMaterial({ color: '#b8891a', transparent: true, opacity: 0.6 }), 48, 0.15);
  ring.position.set(x, 0, z); scene.add(ring);
  const rays = [];
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; rays.push(Math.cos(a) * (rad + 0.4), 0.03, Math.sin(a) * (rad + 0.4), Math.cos(a) * (rad + 1.4 + (i % 2)), 0.03, Math.sin(a) * (rad + 1.4 + (i % 2))); }
  const rl = lineSeg(rays, new THREE.LineBasicMaterial({ color: '#b8891a', transparent: true, opacity: 0.55 }));
  rl.position.set(x, 0, z); scene.add(rl);
  updrafts.push({ x, z, r: rad + 1.5, top: 32, w: 2.3, kind: 'sun' });
  for (let i = 0; i < 6; i++) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(40 * 3), 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#f5dc86', transparent: true, opacity: 0.5, depthWrite: false }));
    const a = i / 6 * Math.PI * 2 + 0.4, rr = rad * (0.3 + (i % 3) * 0.25);
    l.userData = { ox: x + Math.cos(a) * rr, oz: z + Math.sin(a) * rr, ph: Math.random() * 6, y0: 0.6, len: 14, amp: 0.4, spd: 1.4 };
    l.frustumCulled = false;
    heat.push(l); scene.add(l);
  }
}
addSunspot(46, -2, 5.5); addSunspot(80, -30, 6.5); addSunspot(104, 44, 6.5);

/* ---------- trees, shed, swing set ---------- */
// round, slightly lumpy foliage with smooth normals (the facets were catching light one by one)
function blob(g, sx = 1, sy = 1, sz = 1) {
  const p = g.attributes.position.array, n = g.attributes.normal.array;
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i], y = p[i + 1], z = p[i + 2];
    const d = 1 + 0.07 * Math.sin(x * 1.7 + y * 2.3) * Math.sin(z * 1.9 - y * 1.3) + 0.04 * Math.sin(x * 3.1 - z * 2.7);
    p[i] = x * d * sx; p[i + 1] = y * d * sy; p[i + 2] = z * d * sz;
    const nx = x / (sx * sx), ny = y / (sy * sy), nz = z / (sz * sz), l = Math.hypot(nx, ny, nz) || 1;
    n[i] = nx / l; n[i + 1] = ny / l; n[i + 2] = nz / l;
  }
  g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true;
  return g;
}
const swayers = [];
function addTree(r, deg, s = 1) {
  const { x, z } = polar(r, deg);
  const trunk = sketch(new THREE.CylinderGeometry(0.32 * s, 0.5 * s, 4.8 * s, 8), '#dcc4a0', { jit: 0.03, sb: '#7d5d45' });
  trunk.position.set(x, 2.4 * s, z);
  const c1 = sketch(blob(new THREE.IcosahedronGeometry(3.6 * s, 3), 1, 0.9, 1), '#cfe2b0', { thr: 1, jit: 0.08, sb: '#7aa557', sbEdges: false });
  c1.position.set(x, 6.7 * s, z);
  const ox = x + 2.4 * s, oz = z + 1.4 * s;
  const c2 = sketch(blob(new THREE.IcosahedronGeometry(2.2 * s, 3)), '#c4dca4', { thr: 1, jit: 0.06, sb: '#6c9a4c', sbEdges: false });
  c2.position.set(ox, 5.5 * s, oz);
  const c3 = sketch(blob(new THREE.IcosahedronGeometry(2.0 * s, 3)), '#c4dca4', { thr: 1, jit: 0.06, sb: '#6c9a4c', sbEdges: false });
  c3.position.set(x - 2.2 * s, 5.8 * s, z + 0.8 * s);
  scene.add(trunk, c1, c2, c3);
  contactBlob(x, z, 1.1 * s, 1.1 * s, 0.5); contactBlob(x, z, 3.6 * s, 3.6 * s, 0.22);
  swayers.push({ s, ph: Math.random() * 6.28, crowns: [c1, c2, c3].map((c, i) => ({ c, base: c.position.clone(), k: [1, 0.8, 0.85][i], lag: i * 0.35 })) });
  obstacles.push({ t: 'sph', c: [x, 6.7 * s, z], r: 3.4 * s, msg: 'Stuck in a maple tree', stick: true },
    { t: 'sph', c: [ox, 5.5 * s, oz], r: 2.05 * s, msg: 'Stuck in a maple tree', stick: true },
    { t: 'sph', c: [x - 2.2 * s, 5.8 * s, z + 0.8 * s], r: 1.85 * s, msg: 'Stuck in a maple tree', stick: true },
    { t: 'cyl', x, z, r: 0.5 * s, h: 5 * s, msg: 'Bonked a tree trunk' });
}
addTree(30, -16); addTree(50, 54, 1.1); addTree(84, -50); addTree(106, 14, 1.2); addTree(108, -36); addTree(72, 62, 0.9);

{ // shed
  const { x, z } = polar(102, -4);
  const grp = new THREE.Group();
  grp.add(sketch(new THREE.BoxGeometry(5, 2.8, 4).translate(0, 1.4, 0), '#efd9b6', { sb: '#e8b77f' }));
  const shape = new THREE.Shape([new THREE.Vector2(-2.8, 0), new THREE.Vector2(2.8, 0), new THREE.Vector2(0, 1.4)]);
  grp.add(sketch(new THREE.ExtrudeGeometry(shape, { depth: 4.6, bevelEnabled: false }).translate(0, 2.8, -2.3), '#d6a891', { sb: '#b5533f' }));
  grp.add(lineSeg([-1.1, 0, 2.01, -1.1, 2, 2.01, -1.1, 2, 2.01, 0.3, 2, 2.01, 0.3, 2, 2.01, 0.3, 0, 2.01, 0, 1, 2.01, 0.15, 1, 2.01], inkLine));
  grp.position.set(x, 0, z);
  grp.rotation.y = 4 * D2R;
  scene.add(grp);
  contactBlob(x, z, 3.3, 2.8, 0.45, 4 * D2R);
  obstacles.push({ t: 'box', min: [x - 2.7, 0, z - 2.3], max: [x + 2.7, 4.2, z + 2.3], msg: 'Bonked the shed' });
}

{ // swing set
  const { x, z } = polar(66, 4);
  const parts = [];
  [-2, 2].forEach(sx => {
    parts.push(new THREE.CylinderGeometry(0.06, 0.06, 2.7, 6).rotateX(0.38).translate(sx, 1.25, -0.5));
    parts.push(new THREE.CylinderGeometry(0.06, 0.06, 2.7, 6).rotateX(-0.38).translate(sx, 1.25, 0.5));
  });
  parts.push(new THREE.CylinderGeometry(0.07, 0.07, 4.3, 6).rotateZ(Math.PI / 2).translate(0, 2.5, 0));
  const grp = new THREE.Group();
  grp.add(sketch(merge(parts), '#c9d4e4', { jit: 0.02, thr: 40, sb: '#4f86d4' }));
  [-0.9, 0.9].forEach(sx => {
    grp.add(lineSeg([sx - 0.25, 2.5, 0, sx - 0.25, 0.6, 0, sx + 0.25, 2.5, 0, sx + 0.25, 0.6, 0], inkLine));
    grp.add(sketch(box(0.6, 0.06, 0.25, sx, 0.6, 0), '#f1b2a9', { jit: 0.01, sb: '#f2c14e' }));
  });
  grp.position.set(x, 0, z);
  grp.rotation.y = -4 * D2R;
  contactBlob(x, z, 2.7, 1.2, 0.3, -4 * D2R);
  scene.add(grp);
  obstacles.push({ t: 'box', min: [x - 2.2, 2.3, z - 0.3], max: [x + 2.2, 2.7, z + 0.3], msg: 'Tangled in the swing set' },
    { t: 'box', min: [x - 1.3, 0.5, z - 0.2], max: [x + 1.3, 2.4, z + 0.2], msg: 'Tangled in the swing set' });
}

/* ---------- trampoline & kiddie pool ---------- */
{
  const { x, z } = polar(42, 24);
  const grp = new THREE.Group();
  grp.add(sketch(new THREE.CylinderGeometry(2.2, 2.2, 0.05, 28).translate(0, 0.6, 0), '#56565e', { thr: 40, jit: 0.02, sb: '#34343c' }));
  grp.add(sketch(new THREE.TorusGeometry(2.25, 0.13, 6, 28).rotateX(Math.PI / 2).translate(0, 0.62, 0), '#a9c1ef', { thr: 40, jit: 0.02, sb: '#3f78d8' }));
  const legs = [];
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; legs.push(Math.cos(a) * 2.2, 0.6, Math.sin(a) * 2.2, Math.cos(a) * 2.25, 0, Math.sin(a) * 2.25); }
  grp.add(lineSeg(legs, inkLine));
  grp.position.set(x, 0, z);
  scene.add(grp);
  contactBlob(x, z, 2.5, 2.5, 0.38);
  tramps.push({ x, z, r: 2.25, y: 0.62 });
}
{
  const { x, z } = polar(56, -20);
  const grp = new THREE.Group();
  grp.add(sketch(new THREE.CylinderGeometry(1.8, 1.8, 0.35, 28, 1, true).translate(0, 0.175, 0), '#a9cdee', { sb: '#58a8e8', side: THREE.DoubleSide, thr: 40, jit: 0.02, hull: false }));
  const water = new THREE.Mesh(new THREE.CircleGeometry(1.78, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#d4e8f8' }));
  water.position.y = 0.28; grp.add(water);
  const wav = [];
  for (let k = -1; k <= 1; k++) for (let i = 0; i < 10; i++) {
    const xa = -1.1 + i * 0.22, xb = xa + 0.22;
    wav.push(xa, 0.29, k * 0.6 + Math.sin(i * 1.6) * 0.06, xb, 0.29, k * 0.6 + Math.sin((i + 1) * 1.6) * 0.06);
  }
  grp.add(lineSeg(wav, new THREE.LineBasicMaterial({ color: '#2b4fbf', transparent: true, opacity: 0.5 })));
  grp.position.set(x, 0, z);
  scene.add(grp);
  pools.push({ x, z, r: 1.8 });
}

/* ---------- push: box fans on picnic tables ---------- */
const fanStreaks = [];
function addFan(r, deg, blowDeg, o = {}) {
  const { x, z } = o.pos || polar(r, deg);
  const dx = Math.sin(blowDeg * D2R), dz = -Math.cos(blowDeg * D2R);
  const grp = new THREE.Group();
  const fy = o.fanY ?? 1.3;
  let blades = new THREE.Object3D();
  if (o.table !== false) {
    const table = [box(2.2, 0.08, 1.2, 0, 0.75, 0)];
    [-0.95, 0.95].forEach(sx => { table.push(box(0.08, 0.75, 0.08, sx, 0.37, -0.45), box(0.08, 0.75, 0.08, sx, 0.37, 0.45)); });
    grp.add(sketch(merge(table), '#d9bf98', { jit: 0.02, sb: '#b5865a' }));
  }
  if (o.body !== false) {
    const sz = o.size ?? 1;
    grp.add(sketch(box(sz, sz, 0.3 * sz, 0, fy, 0), '#fdfcf6', { jit: 0.015, sb: '#f2f2ec' }));
    const grille = ringLine(0.4 * sz, 0, inkLine, 28); grille.rotation.x = Math.PI / 2; grille.position.set(0, fy, 0.16 * sz); grp.add(grille);
    blades = lineSeg([0, 0, 0, 0.36, 0.08, 0, 0, 0, 0, -0.25, 0.27, 0, 0, 0, 0, -0.1, -0.35, 0].map(v => v * sz), inkLine);
    blades.position.set(0, fy, 0.17 * sz); grp.add(blades);
  }
  grp.position.set(x, o.baseY || 0, z);
  grp.rotation.y = Math.atan2(dx, dz);
  scene.add(grp);
  if (o.table !== false) contactBlob(x, z, 1.4, 0.9, 0.4, Math.atan2(dx, dz));
  const f = { x, z, dx, dz, len: o.len ?? 14, half: o.half ?? 2.8, y1: o.y1 ?? 3.8, w: o.w ?? 7, blades, kind: o.kind || 'fan', on: true, streaks: null };
  fans.push(f);
  if (o.obstacle !== false) obstacles.push({ t: 'cyl', x, z, r: o.obsR ?? 1.2, h: o.obsH ?? 1.85, msg: o.msg || 'Bonked the box fan' });
  // wind streaks along the blast
  const pts = [];
  for (let i = 0; i <= 16; i++) pts.push(0, 0, i * 0.12);
  for (let i = 0; i <= 20; i++) { const a = Math.PI + i / 20 * Math.PI * 1.6; pts.push(Math.cos(a) * 0.28 + 0.28, 0.28 + Math.sin(a) * 0.28, 1.92); }
  const sg = new THREE.Group(); sg.position.set(x, o.streakY ?? 0, z); sg.rotation.y = Math.atan2(dx, dz); scene.add(sg); f.streaks = sg;
  const geo = new THREE.BufferGeometry().setFromPoints([]);
  const lp = [];
  for (let i = 0; i <= 14; i++) lp.push(new THREE.Vector3(0, 0, i * 0.14));
  for (let i = 1; i <= 14; i++) { const a = -Math.PI / 2 + i / 14 * Math.PI * 1.6; lp.push(new THREE.Vector3(0.3 * Math.cos(a) - 0.0, 0.3 + 0.3 * Math.sin(a), 1.96 + 0.3 * Math.cos(a) * 0)); }
  geo.setFromPoints(lp);
  for (let i = 0; i < 6; i++) {
    const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.2, depthWrite: false }));
    l.userData = { ph: Math.random(), lat: (Math.random() * 2 - 1) * 2, y: 0.9 + Math.random() * 2.4, span: Math.min(o.len ?? 14, 200) - 2 };
    sg.add(l); fanStreaks.push(l);
  }
}
addFan(24, -30, 70); addFan(84, 46, -80);

/* ---------- push: sprinklers ---------- */
function addSprinkler(r, deg) {
  const { x, z } = polar(r, deg);
  const wet = new THREE.Mesh(new THREE.CircleGeometry(4.5, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#c9dcee', transparent: true, opacity: 0.55, depthWrite: false }));
  wet.position.set(x, 0.016, z); scene.add(wet);
  const head = sketch(new THREE.CylinderGeometry(0.08, 0.14, 0.3, 8).translate(0, 0.15, 0), '#9aa3b2', { jit: 0.01, sb: '#5d6573' });
  head.position.set(x, 0, z); scene.add(head);
  const spray = new THREE.Group(); spray.position.set(x, 0.3, z); scene.add(spray);
  const mat = new THREE.LineDashedMaterial({ color: '#e6f2ff', dashSize: 0.18, gapSize: 0.16, transparent: true, opacity: 0.55, depthWrite: false });
  for (let k = -3; k <= 3; k++) {
    const pts = [];
    for (let i = 0; i <= 24; i++) { const t = i / 24, d = t * 4.2; pts.push(new THREE.Vector3(k * 0.35 * t, Math.sin(t * Math.PI) * 3.2, -d + 2.1)); }
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
    l.computeLineDistances(); spray.add(l);
  }
  contactBlob(x, z, 0.25, 0.25, 0.5);
  sprinklers.push({ x, z, r: 4.8, top: 5.5, w: 3.6, on: true, spray, ph: Math.random() * 6 });
}
addSprinkler(76, 20); addSprinkler(114, -16); addSprinkler(30, 40);

/* ---------- push: crosswind band ---------- */
const gustLines = [];
{
  const curl = [];
  for (let i = 0; i <= 30; i++) curl.push(i * 0.1, 0, 0);
  for (let i = 0; i <= 26; i++) { const a = -Math.PI / 2 + i / 26 * Math.PI * 1.7; curl.push(3 + Math.cos(a) * 0.35, 0.35 + Math.sin(a) * 0.35, 0); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(curl, 3));
  for (let i = 0; i < 16; i++) {
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.2, depthWrite: false }));
    l.userData = { ph: Math.random(), y: 1.2 + Math.random() * 5, z: GUST.z1 + 2 + Math.random() * (GUST.z0 - GUST.z1 - 4) };
    gustLines.push(l); scene.add(l);
  }
}

/* ---------- dust devils (wander; appear on some throws) ---------- */
function makeDevil() {
  const grp = new THREE.Group();
  const pts = [];
  for (let k = 0; k < 3; k++) {
    let prev = null;
    for (let i = 0; i <= 70; i++) {
      const h = i / 70 * 12, rad = 0.3 + h * 0.2, a = h * 1.5 + k * 2.094, q = [Math.cos(a) * rad, h, Math.sin(a) * rad];
      if (prev) pts.push(...prev, ...q);
      prev = q;
    }
  }
  grp.add(lineSeg(pts, { c: '#8a6d4b', px: 1.8, op: 0.7 }, 0.5, 1.4));
  const dust = ringLine(1.4, 0.1, new THREE.LineBasicMaterial({ color: '#8a6d4b', transparent: true, opacity: 0.45 }), 30, 0.35);
  grp.add(dust);
  const puff = ringLine(0.8, 0.25, new THREE.LineBasicMaterial({ color: '#8a6d4b', transparent: true, opacity: 0.35 }), 24, 0.25);
  grp.add(puff);
  grp.visible = false;
  scene.add(grp);
  return { x: 0, z: 0, hd: 0, r: 4.2, top: 14, spin: 6, up: 3.5, on: false, grp };
}
devils.push(makeDevil(), makeDevil());

/* ---------- fence (with an open gate) and hedge ---------- */
{
  const parts = [], step = 0.55 / FENCE_R, gate = 4 * D2R;
  for (let a = -YARD_DEG * D2R; a <= YARD_DEG * D2R; a += step) {
    if (Math.abs(a) < gate) continue;
    parts.push(new THREE.BoxGeometry(0.3, 1.0, 0.05).rotateY(-a).translate(FENCE_R * Math.sin(a), 0.5, -FENCE_R * Math.cos(a)));
    parts.push(new THREE.ConeGeometry(0.21, 0.2, 4).rotateY(Math.PI / 4).scale(1, 1, 0.25).rotateY(-a).translate(FENCE_R * Math.sin(a), 1.1, -FENCE_R * Math.cos(a)));
  }
  const rs = 3 * D2R;
  for (let a = -YARD_DEG * D2R; a < YARD_DEG * D2R - 1e-6; a += rs) {
    const m = a + rs / 2;
    if (Math.abs(m) < gate + rs / 2) continue;
    const chord = 2 * FENCE_R * Math.sin(rs / 2) + 0.05, cx = FENCE_R * Math.sin(m) * Math.cos(rs / 2), cz = -FENCE_R * Math.cos(m) * Math.cos(rs / 2);
    parts.push(new THREE.BoxGeometry(chord, 0.09, 0.06).rotateY(-m).translate(cx, 0.3, cz));
    parts.push(new THREE.BoxGeometry(chord, 0.09, 0.06).rotateY(-m).translate(cx, 0.85, cz));
  }
  [-gate, gate].forEach(a => parts.push(new THREE.BoxGeometry(0.16, 1.5, 0.16).translate(FENCE_R * Math.sin(a), 0.75, -FENCE_R * Math.cos(a))));
  scene.add(sketch(merge(parts), '#fdfcf6', { jit: 0.012, sb: '#f7f3ea', sbEdges: false, hullPx: 1.8 }));
  obstacles.push({ t: 'arc', r: FENCE_R, th: 0.18, h: 1.18, maxA: YARD_DEG * D2R, gate, msg: 'Snagged on the fence' });

  const hp = [], hs = 4 * D2R;
  for (let a = -YARD_DEG * D2R; a < YARD_DEG * D2R - 1e-6; a += hs) {
    const m = a + hs / 2, chord = 2 * HEDGE_R * Math.sin(hs / 2) + 0.4;
    for (let k = 0; k < 5; k++) {
      const mm = m + (k - 2) * hs / 5, rr = HEDGE_R + (Math.random() - 0.5) * 0.8;
      hp.push(blob(new THREE.IcosahedronGeometry(2.3, 2), 1.25, 0.95, 1.1).rotateY(-mm).translate(rr * Math.sin(mm), 1.45, -rr * Math.cos(mm)));
    }
  }
  scene.add(sketch(merge(hp), '#bfd6a1', { thr: 1, jit: 0.09, sb: '#5e8c4a', sbEdges: false }));
  obstacles.push({ t: 'arc', r: HEDGE_R, th: 2, h: 2.6, maxA: YARD_DEG * D2R, gate: -1, msg: 'Lost in the hedge', stick: true });
}

// distance arcs every 10 m (painted white lines in Storybook, pencil dashes in Sketch)
const arcMat = new THREE.LineDashedMaterial({ color: INK, dashSize: 0.6, gapSize: 0.45, transparent: true, opacity: 0.4 });
{
  for (let d = 10; d <= 230; d += 10) {
    const mat = arcMat;
    const pts = [];
    for (let a = -72; a <= 72; a += 1.5) { const p = polar(d, a); pts.push(new THREE.Vector3(p.x, 0.02, p.z)); }
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat); l.computeLineDistances(); scene.add(l);
  }
}

// the far half of the field
addTree(150, -24); addTree(178, 30, 1.2); addTree(208, -46); addTree(160, 58); addTree(228, 26, 1.1); addTree(192, -64, 1.1);
addGrill(150, 16); addSunspot(186, -14, 6.5); addSunspot(118, -1, 7); addSunspot(206, 2, 7); addSunspot(140, -44, 6); addSprinkler(168, 40); addFan(200, 22, -70);

/* ---------- beyond the hedge: the canyon ---------- */
const FLOOR = -270;
const MESAS = [[230, -15, 38, 78, -60], [300, 30, 55, 95, -25], [420, -45, 45, 85, -85], [480, 8, 16, 38, -8], [560, -20, 60, 110, -40],
  [620, 50, 40, 80, -15], [700, -5, 30, 62, -70], [380, 70, 35, 70, -50], [360, -72, 40, 75, -30], [820, 30, 50, 90, -35], [900, -40, 60, 100, -55]]
  .map(([r, a, R1, R2, top]) => Object.assign(polar(r + 120, a), { R1, R2, top }));
const terr01 = t => { const n = 5, k = Math.min(t, 0.99999) * n, f = Math.floor(k); return t >= 1 ? 1 : (f + Math.pow(k - f, 5)) / n; };
const riverX = z => 110 * Math.sin(-z * 0.0042 + 0.6) + 35 * Math.sin(-z * 0.013);
function canyonH(x, z) {
  const r = Math.hypot(x, z);
  if (r < RIM_R) return -2;
  let h = FLOOR * terr01(Math.min(1, (r - RIM_R) / 44));
  h = Math.max(h, FLOOR + (70 - FLOOR) * terr01(Math.max(0, Math.min(1, (r - 1120) / 150))));
  for (const m of MESAS) { const d = Math.hypot(x - m.x, z - m.z); if (d < m.R2) h = Math.max(h, FLOOR + (m.top - FLOOR) * terr01((m.R2 - d) / (m.R2 - m.R1))); }
  if (h < FLOOR + 1) h += Math.sin(x * 0.02) * Math.cos(z * 0.017) * 3;
  if (z < -(RIM_R + 16)) { const d = Math.abs(x - riverX(z)); if (d < 34) h = Math.min(h, FLOOR - 4 + (h - FLOOR + 4) * Math.min(1, Math.max(0, (d - 14) / 20))); }
  return h;
}
const TER = { n: 240, size: 2700, cx: 0, cz: -650 };
TER.step = TER.size / TER.n; TER.x0 = TER.cx - TER.size / 2; TER.z0 = TER.cz - TER.size / 2;
TER.h = new Float32Array((TER.n + 1) * (TER.n + 1));
{
  const g = new THREE.PlaneGeometry(TER.size, TER.size, TER.n, TER.n).rotateX(-Math.PI / 2).translate(TER.cx, 0, TER.cz);
  const pos = g.attributes.position.array, cols = new Float32Array(pos.length);
  const STRATA = ['#d98e5a', '#c06f45', '#a3553b', '#e4b07a'].map(c => new THREE.Color(c));
  const TOP = new THREE.Color('#c9a06a'), FLOORC = new THREE.Color('#c98d5f');
  for (let k = 0; k < pos.length / 3; k++) {
    const x = pos[k * 3], z = pos[k * 3 + 2], h = canyonH(x, z);
    pos[k * 3 + 1] = h; TER.h[k] = h;
  }
  const N = TER.n + 1;
  for (let k = 0; k < pos.length / 3; k++) {
    const ix = k % N, iz = Math.floor(k / N), h = TER.h[k];
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].reduce((m, [a, b]) => { const jx = ix + a, jz = iz + b; return (jx < 0 || jz < 0 || jx >= N || jz >= N) ? m : Math.max(m, Math.abs(TER.h[jz * N + jx] - h)); }, 0);
    let c;
    if (h < FLOOR + 2) c = FLOORC;
    else if (nb < 2.5) c = TOP;
    else c = STRATA[Math.abs(Math.floor((h - FLOOR) / 13)) % STRATA.length];
    const v = 0.96 + Math.random() * 0.06;
    cols[k * 3] = c.r * v; cols[k * 3 + 1] = c.g * v; cols[k * 3 + 2] = c.b * v;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  g.computeVertexNormals();
  const m = pencilize(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap }), 'canyon');
  const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; mesh.frustumCulled = false;
  scene.add(mesh);
  // the river
  const rp = [];
  for (let z = -(RIM_R + 26); z > -1370; z -= 12) { const x = riverX(z), x2 = riverX(z - 12); rp.push(x - 9, FLOOR - 2.5, z, x + 9, FLOOR - 2.5, z, x2 - 9, FLOOR - 2.5, z - 12, x + 9, FLOOR - 2.5, z, x2 + 9, FLOOR - 2.5, z - 12, x2 - 9, FLOOR - 2.5, z - 12); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
  scene.add(new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: '#5f9fc4', side: THREE.DoubleSide })));
  // warm air over the mesas
  MESAS.forEach(mz => updrafts.push({ x: mz.x, z: mz.z, r: mz.R2 * 0.7, top: 75, w: 3.2, kind: 'thermal' }));
}
function groundAt(x, z) {
  if (ACTIVE === 'harbor') return harborGround(x, z);
  if (Math.hypot(x, z) < RIM_R) return 0;
  const N = TER.n + 1, fx = (x - TER.x0) / TER.step, fz = (z - TER.z0) / TER.step;
  if (fx < 0 || fz < 0 || fx >= TER.n || fz >= TER.n) return 70;
  const ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz;
  const a = TER.h[iz * N + ix], b = TER.h[iz * N + ix + 1], c = TER.h[(iz + 1) * N + ix], d = TER.h[(iz + 1) * N + ix + 1];
  return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
}

/* ---------- rings to fly through + birds to dodge ---------- */
const rings = [], birds = [];
const ringGeom = new THREE.TorusGeometry(2.6, 0.2, 10, 40);
function addRing(r, deg, y) {
  const { x, z } = polar(r, deg);
  if (r > RIM_R) y = Math.max(y, groundAt(x, z) + 9);
  const m = sketch(ringGeom, '#f2c14e', { sb: '#f2b928', cast: false, thr: 60 });
  m.position.set(x, y, z); m.rotation.y = -deg * D2R;
  scene.add(m);
  const rg = { c: new THREE.Vector3(x, y, z), n: new THREE.Vector3(Math.sin(deg * D2R), 0, -Math.cos(deg * D2R)), R: 2.45, mesh: m, got: false, t: 0 };
  rings.push(rg);
  return rg;
}
const birdMat = toonMat('#3e3e46', THREE.DoubleSide), beakMat = toonMat('#e98a3b');
const wingGeom = new THREE.BufferGeometry();
wingGeom.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.12, 0, 0, 0.18, 0.75, 0.02, 0.06], 3)); wingGeom.computeVertexNormals();
const birdBody = new THREE.SphereGeometry(1, 10, 8).scale(0.13, 0.11, 0.38), birdBeak = new THREE.ConeGeometry(0.05, 0.16, 6).rotateX(-Math.PI / 2).translate(0, 0, -0.44);
function addFlock(r, deg, R, y, w, count = 2) {
  const { x, z } = polar(r, deg);
  if (r > RIM_R) { let gm = -999; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; gm = Math.max(gm, groundAt(x + Math.cos(a) * R, z + Math.sin(a) * R)); } y = Math.max(y, gm + 8); }
  for (let i = 0; i < count; i++) {
    const g = new THREE.Group(), L = new THREE.Mesh(wingGeom, birdMat), Rw = new THREE.Mesh(wingGeom, birdMat);
    Rw.scale.x = -1;
    g.add(new THREE.Mesh(birdBody, birdMat), new THREE.Mesh(birdBeak, beakMat), L, Rw);
    g.scale.setScalar(1.5);
    scene.add(g);
    birds.push({ cx: x, cz: z, R: R * (0.85 + 0.3 * Math.random()), y: y + (Math.random() - 0.5) * 2, w, ph: i * 0.55 + Math.random() * 0.3,
      g, L, Rw, flap: Math.random() * 6, gone: false, near: false, pos: new THREE.Vector3(), vel: new THREE.Vector3() });
  }
}
// rings across the field (avoiding the trees), then down into the canyon
[[40, 0, 15], [78, -10, 11], [130, 6, 9], [172, -6, 8], [195, -30, 5], [215, 8, 11]].forEach(a => addRing(...a));
[[290, 0, 4], [340, 12, -2], [400, -8, -10], [470, 6, 6], [540, -14, 0], [610, 10, 40], [680, -4, -5], [760, 14, 10], [850, -10, 0], [950, 6, 20]].forEach(a => addRing(...a));
// birds circle near some rings, plus a few loners
[[78, -10, 9, 11, 0.45, 2], [130, 6, 12, 9.5, -0.38, 2], [172, -6, 10, 8, 0.42, 3], [215, 8, 9, 11.5, -0.4, 2], [110, -30, 16, 10, 0.3, 1], [185, 30, 14, 7, -0.33, 1]]
  .forEach(a => addFlock(...a));
[[340, 12, 12, -2, 0.3, 2], [470, 6, 14, 6, -0.28, 3], [610, 10, 12, 40, 0.32, 2], [760, 14, 16, 10, -0.26, 3], [540, -14, 20, 4, 0.22, 2], [880, -2, 22, 8, 0.2, 2]]
  .forEach(a => addFlock(...a));

scene.add = _sceneAdd;
LV.backyard = Object.assign(snapshot(), { launch: [0, 11, 0], v0: 6, vr: 11, gust: [GUST.z0, GUST.z1], group: byGroup, fog: null });
