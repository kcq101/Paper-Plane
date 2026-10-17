// Paper Planes · 10-stars.js
// Paper-star collectibles: where they sit in each world, picking them up, and the permanent "found" tally.
// Classic script: shares one global scope with the other js/ files, loaded in numeric order.
'use strict';

/* ---------- the star: a puffy folded "lucky star", flat-shaded so its facets catch the sun ---------- */
const STAR_R = 1.0, STAR_PICK = 2.0, STAR_PTS = 50, STAR_NEW_PTS = 50;
const STAR_NEW = new THREE.Color('#f2917a'), STAR_FOUND = new THREE.Color('#f3d9cc'); // coral = not found yet, pale = found before
const starGeom = (() => {
  const rim = [];
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, r = i % 2 ? STAR_R * 0.46 : STAR_R; rim.push([Math.sin(a) * r, Math.cos(a) * r]); }
  const p = [], T = STAR_R * 0.42; // puffy, so it never vanishes edge-on while it spins
  for (let i = 0; i < 10; i++) {
    const a = rim[i], b = rim[(i + 1) % 10];
    p.push(0, 0, T, a[0], a[1], 0, b[0], b[1], 0); // front face
    p.push(0, 0, -T, b[0], b[1], 0, a[0], a[1], 0); // back face
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.computeVertexNormals();
  return g;
})();
const starMat = pencilize(new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap, flatShading: true }), 'star');

/* ---------- placement: each star sits on a line worth flying ---------- */
// Candidates are checked against the world: clear of obstacles and rings, above the ground; if blocked, a star
// is nudged upward a few times and dropped only if it still doesn't fit.
const STARS = {}, STARS_DROPPED = [];
const starSpot = new THREE.Vector3();
function buildStars(world, group, spots) {
  const L = LV[world], keepActive = ACTIVE, keepObs = obstacles.slice();
  ACTIVE = world; obstacles.length = 0; obstacles.push(...L.obstacles);
  const list = [];
  const blocked = (p, tight) => { // returns why a spot doesn't fit, or '' when it does
    if (p.y < groundAt(p.x, p.z) + (tight ? 1.2 : 2.5)) return 'ground';
    for (const r of L.rings) if (r.c.distanceTo(p) < r.R + STAR_R + 0.6) return 'ring';
    for (const s of list) if (s.c.distanceTo(p) < 6) return 'star';
    const rad = tight ? 0.6 : 1.4; // gate stars thread a narrow gap, so they only need a small clear bubble
    for (let k = 0; k < 7; k++) {
      const a = k / 6 * Math.PI * 2;
      starSpot.set(p.x + (k < 6 ? Math.cos(a) * rad : 0), p.y + (k < 6 ? 0 : rad), p.z + (k < 6 ? Math.sin(a) * rad : 0));
      const o = collide(starSpot); if (o) return o.msg || o.t;
    }
    const o = collide(p); return o ? (o.msg || o.t) : '';
  };
  for (const [x, y, z, tag] of spots) {
    const c = new THREE.Vector3(x, y, z);
    let why = '';
    for (let k = 0; k < 6 && (why = blocked(c, tag === 'gate')); k++) c.y += 2;
    if (!why) list.push({ c, tag, got: false, t: 0, ph: list.length * 1.7 });
    else STARS_DROPPED.push([world, tag, x, y, z, why]);
  }
  obstacles.length = 0; obstacles.push(...keepObs); ACTIVE = keepActive;
  const mesh = new THREE.InstancedMesh(starGeom, starMat, Math.max(1, list.length));
  mesh.count = list.length; mesh.frustumCulled = false; // instances spread over the whole world
  group.add(mesh);
  STARS[world] = { list, mesh, found: loadFound(world) };
  paintStars(world);
}
const foundKey = w => 'ppb-stars-' + w;
function loadFound(world) {
  try { const a = JSON.parse(localStorage.getItem(foundKey(world)) || '[]'); return new Set(Array.isArray(a) ? a.filter(n => Number.isInteger(n)) : []); } catch (e) { return new Set(); }
}
function saveFound(world) { try { localStorage.setItem(foundKey(world), JSON.stringify([...STARS[world].found])); } catch (e) {} }
function paintStars(world) {
  const W = STARS[world];
  W.list.forEach((s, i) => W.mesh.setColorAt(i, W.found.has(i) ? STAR_FOUND : STAR_NEW));
  if (W.mesh.instanceColor) W.mesh.instanceColor.needsUpdate = true;
}
const mid = (a, b, lift = 1.5) => [(a.c.x + b.c.x) / 2, (a.c.y + b.c.y) / 2 + lift, (a.c.z + b.c.z) / 2, 'line'];
const alongZ = list => list.slice().sort((a, b) => b.c.z - a.c.z);

// Backyard: between the yard rings, atop thermals, through the fence gate, and out over the canyon
{
  const R = alongZ(LV.backyard.rings), U = LV.backyard.updrafts;
  const up = (kind, x, z, y) => { const u = U.find(u => u.kind === kind && Math.abs(u.x - x) < 3 && Math.abs(u.z - z) < 3); return u ? [u.x, y, u.z, 'lift'] : null; };
  const spots = [
    mid(R[0], R[1]), mid(R[1], R[2]), mid(R[2], R[3]),
    [0, 1.8, -FENCE_R, 'gate'], // low through the open gate
    up('grill', 35, -51, 12), up('grill', 41, -144, 12),
    up('sun', -40, -69, 24), up('sun', 72, -75, 22), up('sun', -97, -101, 20), up('sun', 7, -206, 26),
    up('thermal', -91, -338, 45), up('thermal', 210, -364, 45), up('thermal', 84, -594, 50), up('thermal', -71, -817, 40),
    [riverX(-480), FLOOR + 16, -480, 'river'], [riverX(-660), FLOOR + 16, -660, 'river'], // a long dive to the river
  ];
  for (let i = 6; i < R.length - 1 && spots.length < 21; i += 2) spots.push(mid(R[i], R[i + 1], 3));
  buildStars('backyard', byGroup, spots.filter(Boolean));
}
// Harbor City: down the main street, over the rooftop vents, past the sea arches and up the sea thermals
{
  const R = alongZ(LV.harbor.rings), U = LV.harbor.updrafts;
  const street = R.filter(r => r.c.z > -390), sea = R.filter(r => r.c.z <= -390);
  const vents = U.filter(u => u.kind === 'vent');
  const vent = z => { // the vent nearest that point down the street
    const u = vents.reduce((b, u) => (!b || Math.abs(u.z - z) < Math.abs(b.z - z) ? u : b), null);
    return u ? [u.x, u.top - 5, u.z, 'lift'] : null;
  };
  const th = (x, z) => { const u = U.find(u => u.kind === 'thermal' && Math.abs(u.x - x) < 3 && Math.abs(u.z - z) < 3); return u ? [u.x, Math.min(u.top - 12, 50), u.z, 'lift'] : null; };
  const spots = [
    mid(street[0], street[1]), mid(street[2], street[3]), mid(street[4], street[5]), mid(street[5], street[6]),
    vent(-62), vent(-160), vent(-264),
    mid(sea[0], sea[1]), mid(sea[2], sea[3]), mid(sea[4], sea[5]), mid(sea[5], sea[6]),
    th(151, -340), th(191, -429), th(-230, -472), th(237, -827),
    [-120, SEA_Y + 4.5, -520, 'sea'], // a skim just above the waves
  ];
  buildStars('harbor', hbGroup, spots.filter(Boolean));
}

/* ---------- per throw ---------- */
const starM = new THREE.Matrix4(), starQ = new THREE.Quaternion(), starE = new THREE.Euler(), starS = new THREE.Vector3(), starP = new THREE.Vector3();
const curStars = () => STARS[level] || null;
function resetStars() {
  const W = curStars(); if (!W) return;
  W.list.forEach(s => { s.got = false; s.t = 0; });
  paintStars(level);
}
function checkStars(a, b) {
  const W = curStars(); if (!W) return;
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z, L2 = abx * abx + aby * aby + abz * abz || 1;
  W.list.forEach((s, i) => {
    if (s.got) return;
    const t = clamp(((s.c.x - a.x) * abx + (s.c.y - a.y) * aby + (s.c.z - a.z) * abz) / L2, 0, 1);
    if (Math.hypot(a.x + abx * t - s.c.x, a.y + aby * t - s.c.y, a.z + abz * t - s.c.z) > STAR_PICK) return;
    s.got = true; s.t = 0; S.stars++;
    const isNew = !W.found.has(i);
    S.style += STAR_PTS + (isNew ? STAR_NEW_PTS : 0);
    if (isNew) { W.found.add(i); S.newStars++; saveFound(level); }
    popWord(isNew ? 'NEW STAR!' : 'STAR', s.c, isNew ? '#f1b2a9' : '#ffe39a', isNew ? 1.2 : 1.0);
    spawnPuffs(s.c, isNew ? 9 : 6, '#f2917a'); Sfx.star(isNew); updateStyleLine();
  });
}
function animateStars(dt, tt) {
  const W = curStars(); if (!W) return;
  W.list.forEach((s, i) => {
    let sc = 1;
    if (s.got) { s.t += dt; sc = s.t < 0.3 ? 1 + s.t * 2.5 : 0; }
    starE.set(0, tt * 1.6 + s.ph, Math.sin(tt * 0.9 + s.ph) * 0.12);
    starP.copy(s.c); starP.y += Math.sin(tt * 1.4 + s.ph) * 0.25;
    starM.compose(starP, starQ.setFromEuler(starE), starS.set(sc, sc, sc));
    W.mesh.setMatrixAt(i, starM);
  });
  W.mesh.instanceMatrix.needsUpdate = true;
}
const starsTotal = () => (curStars() ? curStars().list.length : 0);
const starsFound = () => (curStars() ? curStars().found.size : 0);
