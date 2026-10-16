// Paper Planes · 01-core.js
// Renderer, scene, lighting, materials (gouache toon + pencil hatching), ink lines and outlines.
// Classic script: shares one global scope with the other js/ files, loaded in numeric order.
'use strict';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const D2R = Math.PI / 180;
let ACTIVE = 'backyard'; // which world the ground lookup uses
// polar layout: deg 0 = straight out from the deck, positive = to the right
const polar = (r, deg) => ({ x: r * Math.sin(deg * D2R), z: -r * Math.cos(deg * D2R) });
const cv = $('game'), ov = $('overlay'), octx = ov.getContext('2d');

/* ---------- renderer & scene ---------- */
let DPR = Math.min(window.devicePixelRatio || 1, 2);
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
renderer.setPixelRatio(DPR);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
let look = 1; // Ink + flat color, tuned in the Look Lab (the old pencil look stays in code but is switched off)
const scene = new THREE.Scene();
const PAPER = new THREE.Color('#fbfaf4'), INK = new THREE.Color('#2a2a30');
const FOG_NEAR = 45, FOG_FAR = 180;
scene.fog = new THREE.Fog(PAPER, FOG_NEAR, FOG_FAR);
const camera = new THREE.PerspectiveCamera(62, 1, 0.25, 3000);

const shared = {
  uPx: { value: DPR }, uFogNear: { value: FOG_NEAR }, uFogFar: { value: FOG_FAR },
  uInk: { value: INK }, uPaper: { value: PAPER },
  uLight: { value: new THREE.Vector3(0.311, 0.809, -0.498).normalize() }, // sun: 54° high, ahead and to the right
  uBoil: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uLook: { value: look }
};
// Storybook lighting: soft sun with real shadows plus sky/ground fill
// Look Lab pick: Ink + flat color | outline 1.1px | color 105% | 4 tones | sun 55 | grain 90 | wash 20 | haze 55 | notebook lines on
// Look Lab 2 pick: Painted gouache | outline 0.5px | pencil 10 | color 115% | shading Smooth | sun 54° | haze 50 | grain 10
const LOOK = { outline: 0.5, hatch: 0.1, sat: 1.15, grain: 0.1, water: 0, haze: 0.5 };
LOOK.fogD = 0.00012 + LOOK.haze * 0.0026;
const SKY_TOP = '#6a9bd0', SKY_HORIZON = '#f1d9c6', FOG_COL = '#d9d1d6', LAWN = '#93b46a', GOUACHE_INK = '#3a2a26';
const hemi = new THREE.HemisphereLight('#ffffff', new THREE.Color(LAWN).lerp(new THREE.Color('#ffffff'), 0.5), 0.62);
const sunLight = new THREE.DirectionalLight('#fff7ea', 0.9);
// one shadow map for the whole yard, drawn once, so shadows never pop in
sunLight.castShadow = true;
const SHADOW_RES = Math.min(4096, renderer.capabilities.maxTextureSize || 2048);
sunLight.shadow.mapSize.set(SHADOW_RES, SHADOW_RES);
Object.assign(sunLight.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260, near: 1, far: 700 });
sunLight.shadow.bias = -0.0006; sunLight.shadow.normalBias = 0.05;
sunLight.target.position.set(0, 0, -115);
sunLight.position.set(0, 0, -115).addScaledVector(shared.uLight.value, 300);
renderer.shadowMap.autoUpdate = false;
let shadowFrames = 3;
scene.add(hemi, sunLight, sunLight.target);
const gradientMap = new THREE.DataTexture(Uint8Array.from({ length: 32 }, (_, i) => Math.round(255 * (0.4 + 0.6 * i / 31))), 32, 1, THREE.LuminanceFormat);
gradientMap.minFilter = gradientMap.magFilter = THREE.LinearFilter; gradientMap.needsUpdate = true; // smooth painted shading
const litMaxU = { value: hemi.intensity + sunLight.intensity };
const PENCIL = `
float pLumO = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
float pLumD = max(0.001, dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)));
float pShade = pLumO / (pLumD * uLitMax);
vec2 pHp = gl_FragCoord.xy / uHatchPx;
float pH1 = 1.0 - smoothstep(0.35, 1.0, abs(fract((pHp.x + pHp.y) / 5.0) - 0.5) * 5.0);
float pH2 = 1.0 - smoothstep(0.35, 1.0, abs(fract((pHp.x - pHp.y) / 5.0) - 0.5) * 5.0);
float pInk = (pH1 * smoothstep(0.8, 0.62, pShade) * 0.6 + pH2 * smoothstep(0.55, 0.42, pShade) * 0.5) * uHatch;
gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * vec3(0.4, 0.4, 0.44), clamp(pInk, 0.0, 0.75));`;
const hatchU = { value: LOOK.hatch };
function pencilize(m, key) {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.uHatchPx = shared.uPx; sh.uniforms.uLitMax = litMaxU; sh.uniforms.uHatch = hatchU;
    sh.fragmentShader = 'uniform float uHatchPx;\nuniform float uLitMax;\nuniform float uHatch;\n' + sh.fragmentShader.replace('#include <tonemapping_fragment>', PENCIL + '\n#include <tonemapping_fragment>');
  };
  m.customProgramCacheKey = () => 'pencil-' + key;
  return m;
}
const toonCache = {};
function toonMat(color, side) {
  const c = new THREE.Color(color), key = c.getHexString() + (side || 0);
  return toonCache[key] || (toonCache[key] = pencilize(new THREE.MeshToonMaterial({ color: c, gradientMap, side: side || THREE.FrontSide }), 'toon'));
}
function richer(hex) { const c = new THREE.Color(hex), h = {}; c.getHSL(h); c.setHSL(h.h, Math.min(1, h.s * 1.6 + 0.08), h.l * 0.8); return c; }
const looks = [], softLines = [], sbHide = [], hullMeshes = [];
const RM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const HL = `float hl(float t,float s){float f=abs(fract(t/s)-0.5)*s;return 1.0-smoothstep(0.35,1.1,f);}`;

const hatchVert = `varying vec3 vN;varying vec3 vLocal;varying float vDepth;
void main(){vN=normalize(mat3(modelMatrix)*normal);vLocal=position;vec4 mv=modelViewMatrix*vec4(position,1.0);vDepth=-mv.z;gl_Position=projectionMatrix*mv;}`;
const hatchFrag = `uniform vec3 uColor;uniform vec3 uInk;uniform vec3 uPaper;uniform vec3 uLight;
uniform float uPx;uniform float uFogNear;uniform float uFogFar;uniform float uRuled;uniform float uHatch;uniform float uBoil;
varying vec3 vN;varying vec3 vLocal;varying float vDepth;${HL}
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;
float d=dot(n,uLight)*0.5+0.5;vec2 p=gl_FragCoord.xy/uPx+vec2(fract(sin(uBoil*12.99)*437.5),fract(sin(uBoil*78.23)*437.5))*3.0;float wob=sin(p.y*0.045+uBoil)*1.6;
float ink=0.0;
ink=max(ink,hl(p.x+p.y+wob,6.0)*smoothstep(0.74,0.64,d)*0.5);
ink=max(ink,hl(p.x-p.y+wob,6.0)*smoothstep(0.52,0.43,d)*0.55);
ink=max(ink,hl(p.x+wob*0.6,4.0)*smoothstep(0.3,0.22,d)*0.6);
ink*=uHatch;vec3 col=uColor;
if(uRuled>0.5){float r=1.0-smoothstep(0.05,0.12,abs(fract(vLocal.z/0.045+0.5)-0.5));col=mix(col,vec3(0.6,0.71,0.9),r*0.75);
 float m=1.0-smoothstep(0.004,0.008,abs(vLocal.x-0.11));col=mix(col,vec3(0.86,0.45,0.42),m*0.7);}
col=mix(col,uInk,ink);col=mix(col,uPaper,smoothstep(uFogNear,uFogFar,vDepth));gl_FragColor=vec4(col,1.0);}`;

function hatchMat(color, o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, shared, {
      uColor: { value: new THREE.Color(color) }, uRuled: { value: o.ruled ? 1 : 0 }, uHatch: { value: o.hatch ?? 1 }
    }),
    vertexShader: hatchVert, fragmentShader: hatchFrag, side: o.side || THREE.FrontSide,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1
  });
}
/* ---------- ink: thick felt-tip strokes that "boil" like hand-drawn animation ---------- */
const inkLine = { c: '#2a2a30', px: 1.8, op: 1 };
const inkSoft = { c: '#2a2a30', px: 1.1, op: 0.35 };
const toSpec = m => (m && m.isMaterial) ? { c: m.color, px: 1.4, op: m.transparent ? m.opacity : 1 } : m;
const fatVert = `attribute vec3 aA;attribute vec3 aB;attribute float aSide;attribute float aEnd;attribute float aW;attribute float aSeed;
uniform vec2 uRes;uniform float uWidth;uniform float uBoil;uniform float uJit;uniform float uPx;uniform float uLook;uniform float uKeep;
varying float vSide;varying float vDepth;varying float vOp;
float h1(float n){return fract(sin(n)*43758.5453);}
void main(){
vec4 a=projectionMatrix*modelViewMatrix*vec4(aA,1.0);vec4 b=projectionMatrix*modelViewMatrix*vec4(aB,1.0);
if(a.w<0.06||b.w<0.06){gl_Position=vec4(2.0,2.0,2.0,1.0);vSide=0.0;vDepth=0.0;return;}
vec2 sa=a.xy/a.w*uRes*0.5;vec2 sb=b.xy/b.w*uRes*0.5;vec2 d=sb-sa;float L=length(d);d=L>0.0001?d/L:vec2(1.0,0.0);
vec2 n=vec2(-d.y,d.x);vec4 p=aEnd<0.5?a:b;
float s=aSeed*91.7+uBoil*13.13;vec2 jit=(vec2(h1(s),h1(s+7.3))-0.5)*2.0*uJit*uPx;
float sc=clamp(24.0/p.w,0.5,1.15);float lk=uLook*(1.0-uKeep);float w=uWidth*uPx*mix(aW,1.0,lk)*sc*mix(1.0,0.8,lk);jit*=1.0-lk;vOp=mix(1.0,0.7,lk);
vec2 off=n*aSide*w*0.5+d*(aEnd<0.5?-1.0:1.0)*1.2*uPx*sc+jit;
p.xy+=off/(uRes*0.5)*p.w;vSide=aSide;vDepth=p.w;gl_Position=p;}`;
const fatFrag = `uniform vec3 uColor;uniform float uOpacity;uniform float uFogNear;uniform float uFogFar;
varying float vSide;varying float vDepth;varying float vOp;
void main(){float a=1.0-smoothstep(0.5,1.0,abs(vSide));a*=vOp*uOpacity*(1.0-smoothstep(uFogNear,uFogFar,vDepth));if(a<0.01)discard;gl_FragColor=vec4(uColor,a);}`;
const fatCache = {};
function fatMat(spec) {
  const col = new THREE.Color(spec.c), jit = spec.jit ?? 0.7, keep = spec.keep ? 1 : 0;
  const key = col.getHexString() + '|' + spec.px + '|' + spec.op + '|' + jit + '|' + keep;
  if (fatCache[key]) return fatCache[key];
  return (fatCache[key] = new THREE.ShaderMaterial({
    uniforms: { uRes: shared.uRes, uBoil: shared.uBoil, uPx: shared.uPx, uFogNear: shared.uFogNear, uFogFar: shared.uFogFar,
      uColor: { value: col }, uWidth: { value: spec.px }, uOpacity: { value: spec.op }, uJit: { value: jit },
      uLook: shared.uLook, uKeep: { value: keep } },
    vertexShader: fatVert, fragmentShader: fatFrag, transparent: true, depthWrite: false
  }));
}
// turn line-segment pairs into screen-space quads with varying width per end
function fatGeom(seg, wMin = 0.55, wMax = 1.35) {
  const n = Math.floor(seg.length / 6);
  const A = new Float32Array(n * 12), B = new Float32Array(n * 12), P = new Float32Array(n * 12);
  const side = new Float32Array(n * 4), end = new Float32Array(n * 4), W = new Float32Array(n * 4), seed = new Float32Array(n * 4);
  const idx = n * 4 > 65535 ? new Uint32Array(n * 6) : new Uint16Array(n * 6);
  for (let i = 0; i < n; i++) {
    const o = i * 6, w0 = wMin + Math.random() * (wMax - wMin), w1 = wMin + Math.random() * (wMax - wMin);
    const s0 = Math.random() * 100, s1 = Math.random() * 100;
    for (let k = 0; k < 4; k++) {
      const v = i * 4 + k, e = k >> 1;
      for (let j = 0; j < 3; j++) { A[v * 3 + j] = seg[o + j]; B[v * 3 + j] = seg[o + 3 + j]; P[v * 3 + j] = seg[o + e * 3 + j]; }
      side[v] = (k & 1) ? 1 : -1; end[v] = e; W[v] = e ? w1 : w0; seed[v] = e ? s1 : s0;
    }
    const b = i * 4, q = i * 6;
    idx[q] = b; idx[q + 1] = b + 1; idx[q + 2] = b + 2; idx[q + 3] = b + 2; idx[q + 4] = b + 1; idx[q + 5] = b + 3;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('aA', new THREE.BufferAttribute(A, 3)); g.setAttribute('aB', new THREE.BufferAttribute(B, 3));
  g.setAttribute('aSide', new THREE.BufferAttribute(side, 1)); g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  g.setAttribute('aW', new THREE.BufferAttribute(W, 1)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}
function lineSeg(pts, spec, wMin, wMax) { return new THREE.Mesh(fatGeom(pts, wMin, wMax), fatMat(toSpec(spec))); }
function ringPts(r, y, seg = 40, wob = 0) {
  const p = []; let prev = null;
  for (let i = 0; i <= seg; i++) {
    const a = i / seg * Math.PI * 2, rr = r + Math.sin(a * 5) * wob, q = [Math.cos(a) * rr, y, Math.sin(a) * rr];
    if (prev) p.push(prev[0], prev[1], prev[2], q[0], q[1], q[2]);
    prev = q;
  }
  return p;
}
function ringLine(r, y, spec, seg = 40, wob = 0) { return lineSeg(ringPts(r, y, seg, wob), spec, 0.7, 1.2); }

// bold silhouette outline: back faces pushed out in screen space, thickness wobbles per boil frame
const hullVert = `attribute vec3 oNormal;uniform vec2 uRes;uniform float uThick;uniform float uBoil;uniform float uPx;uniform float uLook;varying float vDepth;
float h3(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
void main(){vec4 c=projectionMatrix*modelViewMatrix*vec4(position,1.0);
vec3 nv=normalize(normalMatrix*oNormal);vec2 d=(projectionMatrix*vec4(nv,0.0)).xy*uRes;float l=length(d);d=l>0.00001?d/l:vec2(0.0);
float t=uThick*uPx*mix(0.65+0.7*h3(floor(position*4.0)+uBoil),1.0,uLook)*mix(1.0,0.46,uLook)*clamp(24.0/c.w,0.45,1.15);
c.xy+=d*t*2.0/uRes*c.w;vDepth=c.w;gl_Position=c;}`;
const hullFrag = `uniform vec3 uInk;uniform vec3 uPaper;uniform float uFogNear;uniform float uFogFar;varying float vDepth;
void main(){gl_FragColor=vec4(mix(uInk,uPaper,smoothstep(uFogNear,uFogFar,vDepth)),1.0);}`;
const hullCache = {};
function hullMat(px) {
  return hullCache[px] || (hullCache[px] = new THREE.ShaderMaterial({
    uniforms: { uRes: shared.uRes, uBoil: shared.uBoil, uPx: shared.uPx, uInk: shared.uInk, uPaper: shared.uPaper,
      uFogNear: shared.uFogNear, uFogFar: shared.uFogFar, uThick: { value: px }, uLook: shared.uLook },
    vertexShader: hullVert, fragmentShader: hullFrag, side: THREE.BackSide
  }));
}
function smoothNormals(g) {
  if (g.attributes.oNormal) return;
  const p = g.attributes.position.array, n = g.attributes.normal.array, cnt = p.length / 3, map = new Map();
  const key = i => Math.round(p[i * 3] * 500) + ',' + Math.round(p[i * 3 + 1] * 500) + ',' + Math.round(p[i * 3 + 2] * 500);
  for (let i = 0; i < cnt; i++) {
    const k = key(i); let a = map.get(k);
    if (!a) map.set(k, (a = [0, 0, 0]));
    a[0] += n[i * 3]; a[1] += n[i * 3 + 1]; a[2] += n[i * 3 + 2];
  }
  const o = new Float32Array(p.length);
  for (let i = 0; i < cnt; i++) {
    const a = map.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1;
    o[i * 3] = a[0] / l; o[i * 3 + 1] = a[1] / l; o[i * 3 + 2] = a[2] / l;
  }
  g.setAttribute('oNormal', new THREE.BufferAttribute(o, 3));
}
function sketch(geom, color, o = {}) {
  const grp = new THREE.Group();
  const mesh = new THREE.Mesh(geom, hatchMat(color, o));
  looks.push({ mesh, sk: mesh.material, sb: o.sbMat || toonMat(o.sb || richer(color), o.side), cast: o.cast !== false });
  grp.add(mesh);
  if (o.hull !== false && geom.attributes.normal) { smoothNormals(geom); const hm = new THREE.Mesh(geom, hullMat(o.hullPx ?? 2.4)); grp.add(hm); hullMeshes.push(hm); }
  const ep = new THREE.EdgesGeometry(geom, o.thr ?? 28).attributes.position.array;
  const edge = lineSeg(ep, { c: o.lc || '#2a2a30', px: o.lw ?? 1.7, op: 1, keep: o.keepLines });
  grp.add(edge);
  if (!o.keepLines) sbHide.push(edge);
  const jp = ep.slice(), j = o.jit ?? 0.03;
  for (let i = 0; i < jp.length; i++) jp[i] += (Math.random() - 0.5) * 2 * j;
  const soft = lineSeg(jp, inkSoft, 0.5, 1.1);
  grp.add(soft); softLines.push(soft);
  if (o.sbEdges === false) sbHide.push(soft);
  return grp;
}
function merge(geoms) {
  const pos = [], nor = [];
  geoms.forEach(g => {
    const n = g.index ? g.toNonIndexed() : g;
    const pa = n.attributes.position.array, na = n.attributes.normal.array;
    for (let i = 0; i < pa.length; i++) { pos.push(pa[i]); nor.push(na[i]); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}
const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
