// Paper Planes · 11-render-boot.js
// Post-processing (outlines, color, grain), the frame loop and boot.
// Classic script: shares one global scope with the other js/ files, loaded in numeric order.
'use strict';

/* ---------- post-processing: color, light paint wash, paper grain, vignette ---------- */
let rt = null;
function makeTarget() {
  if (rt) { if (rt.depthTexture) rt.depthTexture.dispose(); rt.dispose(); }
  const sd = sceneDPR();
  const w = Math.max(2, Math.floor(innerWidth * sd)), h = Math.max(2, Math.floor(innerHeight * sd));
  rt = new THREE.WebGLRenderTarget(w, h);
  rt.depthTexture = new THREE.DepthTexture(w, h);
  rt.depthTexture.type = THREE.UnsignedIntType;
  // outline width and grain size follow screen pixels, so they look the same at every quality tier
  postU.uRes.value.set(w, h); postU.uThick.value = LOOK.outline * sd; postU.uGrainK.value = DPR / sd;
}
// Paper grain baked once into a tiling texture (same recipe the post shader used to evaluate per pixel:
// a fine paper mottle plus vertical fibers in R, per-pixel speckle in G). Saves ~20 noise calls per pixel.
const GRAIN_N = 512;
const grainTex = (() => {
  const N = GRAIN_N, d = new Uint8Array(N * N * 4);
  const hash = (x, y) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };
  const md = (a, n) => ((a % n) + n) % n;
  const noise = (x, y, px, py) => { // value noise whose lattice wraps every px by py cells, so the tile is seamless
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const h = (a, b) => hash(md(ix + a, px), md(iy + b, py));
    return (h(0, 0) * (1 - ux) + h(1, 0) * ux) * (1 - uy) + (h(0, 1) * (1 - ux) + h(1, 1) * ux) * uy;
  };
  const fbm = (x, y, px, py) => { let v = 0, a = 0.5; for (let i = 0; i < 4; i++) { v += a * noise(x, y, px, py); x *= 2; y *= 2; px *= 2; py *= 2; a *= 0.5; } return v; };
  const PAP = 233, FIBX = 171, FIBY = 16; // lattice cells per tile (≈ the original sp/2.2 and sp/vec2(3,16) scales)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const pap = fbm(x * PAP / N, y * PAP / N, PAP, PAP), fib = fbm(x * FIBX / N, y * FIBY / N, FIBX, FIBY);
    const k = (y * N + x) * 4;
    d[k] = Math.round(255 * clamp((0.07 * pap + 0.05 * fib) / 0.12, 0, 1)); d[k + 1] = Math.round(255 * hash(x + 0.5, y + 0.5)); d[k + 2] = 0; d[k + 3] = 255;
  }
  const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
})();
const postU = { tColor: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uSat: { value: LOOK.sat }, uGrain: { value: LOOK.grain }, uWater: { value: LOOK.water },
  uNear: { value: camera.near }, uFar: { value: camera.far }, uThick: { value: LOOK.outline }, uInk: { value: new THREE.Color(GOUACHE_INK) }, uFogD: { value: LOOK.fogD },
  tGrain: { value: null }, uGrainK: { value: 1 } };
postU.tGrain.value = grainTex;
const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: postU, depthTest: false, depthWrite: false,
  defines: { WATER: LOOK.water > 0 ? 1 : 0 }, // the paint-wash warp is off in the chosen look, so compile it out
  vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`,
  fragmentShader: `uniform sampler2D tColor;uniform sampler2D tDepth;uniform vec2 uRes;uniform float uSat;uniform float uGrain;uniform float uWater;
uniform float uNear;uniform float uFar;uniform float uThick;uniform vec3 uInk;uniform float uFogD;uniform sampler2D tGrain;uniform float uGrainK;varying vec2 vUv;
float lin(vec2 q){float d=texture2D(tDepth,q).x;float z=d*2.0-1.0;return 2.0*uNear*uFar/(uFar+uNear-z*(uFar-uNear));}
#if WATER
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.03;a*=0.5;}return v;}
#endif
void main(){vec2 px=1.0/uRes;vec2 uv=vUv;vec2 sp=vUv*uRes;
#if WATER
uv+=(vec2(fbm(sp/55.0+3.1),fbm(sp/55.0+7.7))-0.5)*px*7.0*uWater;
#endif
vec3 c=texture2D(tColor,uv).rgb;
#if WATER
vec3 cx=texture2D(tColor,uv+vec2(px.x*1.5,0.0)).rgb-texture2D(tColor,uv-vec2(px.x*1.5,0.0)).rgb;
vec3 cy=texture2D(tColor,uv+vec2(0.0,px.y*1.5)).rgb-texture2D(tColor,uv-vec2(0.0,px.y*1.5)).rgb;
c*=1.0-clamp((length(cx)+length(cy))*1.2,0.0,1.0)*0.35*uWater;
c*=1.0-(fbm(sp/40.0)-0.5)*0.22*uWater;
#endif
if(uThick>0.05){vec2 o=uThick/uRes;float L0=lin(vUv);
 float lap=abs(lin(vUv+vec2(0.0,o.y))+lin(vUv-vec2(0.0,o.y))+lin(vUv+vec2(o.x,0.0))+lin(vUv-vec2(o.x,0.0))-4.0*L0)/L0;
 c=mix(c,uInk,smoothstep(0.035,0.09,lap)*0.9*exp(-pow(L0*uFogD*0.9,2.0)));}
float l=dot(c,vec3(0.299,0.587,0.114));c=mix(vec3(l),c,uSat);
vec2 gr=texture2D(tGrain,(floor(sp*uGrainK)+0.5)/512.0).rg;
c*=1.0-uGrain*0.12*gr.r;c+=(gr.g-0.5)*0.05*uGrain;
float d=distance(vUv,vec2(0.5,0.47));c*=1.0-0.18*uGrain*smoothstep(0.42,0.9,d);
gl_FragColor=vec4(c,1.0);}`
})));
function renderFrame() {
  if (!look) { renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
  renderer.setRenderTarget(rt); renderer.render(scene, camera);
  postU.tColor.value = rt.texture; postU.tDepth.value = rt.depthTexture;
  renderer.setRenderTarget(null); renderer.render(postScene, postCam);
}

/* ---------- quality governor: steps down (never up) when a phone can't hold ~48 fps ---------- */
const Q = { pinned: !!QPARAM, samples: [], settleUntil: 3000, fpsEl: null, fpsT: 0, fpsN: 0 };
if (/[?&]fps\b/.test(URLQ)) {
  Q.fpsEl = document.createElement('div');
  Object.assign(Q.fpsEl.style, { position: 'fixed', left: '6px', bottom: '6px', zIndex: 50, font: '12px monospace', color: '#3a2a26',
    background: 'rgba(251,250,244,0.8)', padding: '2px 5px', borderRadius: '4px', pointerEvents: 'none' });
  document.body.appendChild(Q.fpsEl);
}
function setQuality(t) {
  const sh0 = shadowRes();
  qTier = clamp(t, 0, QTIERS.length - 1);
  resize();
  if (shadowRes() !== sh0) {
    if (sunLight.shadow.map) { sunLight.shadow.map.dispose(); sunLight.shadow.map = null; }
    sunLight.shadow.mapSize.set(shadowRes(), shadowRes());
    shadowFrames = 3; renderer.shadowMap.needsUpdate = true;
  }
}
function governor(now, rawMs) {
  if (Q.fpsEl) {
    Q.fpsN++;
    if (now - Q.fpsT > 500) { Q.fpsEl.textContent = `${Math.round(Q.fpsN * 1000 / (now - Q.fpsT))} fps · q${qTier} · ${sceneDPR().toFixed(2)}x`; Q.fpsT = now; Q.fpsN = 0; }
  }
  if (Q.pinned || qTier >= QTIERS.length - 1) return;
  if (now < Q.settleUntil || rawMs > 250 || (typeof document !== 'undefined' && document.hidden)) { Q.samples.length = 0; return; }
  Q.samples.push(rawMs);
  if (Q.samples.length < 90) return;
  const med = Q.samples.slice().sort((a, b) => a - b)[45]; // median shrugs off shader-compile and GC hitches
  Q.samples.length = 0;
  if (med > 21) { setQuality(qTier + 1); Q.settleUntil = now + 1500; }
}

let last = performance.now();
function frame(now) {
  const rawMs = now - last;
  const dt = Math.min(0.05, rawMs / 1000); last = now;
  if (hangarOpen) showroom(dt, now); else if (!paused) update(dt, now);
  renderFrame();
  drawOverlay();
  governor(now, rawMs);
  requestAnimationFrame(frame);
}

/* ---------- boot ---------- */
scene.traverse(o => { if ((o.isLine || o.isLineSegments) && o.material) o.material.depthWrite = false; });
setActive(activeId);
resize();
setLook(look);
setLevel(level);
resetThrow();
showBest();
const fontsReady = (document.fonts && document.fonts.load) ? Promise.race([
  Promise.all([document.fonts.load('700 76px Kalam'), document.fonts.load('20px "Patrick Hand"')]),
  new Promise(r => setTimeout(r, 1500))
]) : Promise.resolve();
fontsReady.then(() => {
  for (let d = 10; d <= 230; d += 10) {
    [-66, 66].forEach(a => { const p = polar(d, a); const s = textSprite(d + ' m'); s.position.set(p.x, 0.7, p.z); byGroup.add(s); });
  }
  for (let d = 10; d <= 50; d += 10) { const s = textSprite(d + ' m', '#2a2a30', 1.1); s.position.set(-7.4, 0.35, -d); clGroup.add(s); }
  drawChalkboard();
  const bs = textSprite('best', '#c8443c', 1.4, 64); bs.position.set(0.4, 2.05, 0); flag.add(bs);
}).catch(() => {});
requestAnimationFrame(frame);
