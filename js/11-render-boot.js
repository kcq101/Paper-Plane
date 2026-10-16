// Paper Planes · 11-render-boot.js
// Post-processing (outlines, color, grain), the frame loop and boot.
// Classic script: shares one global scope with the other js/ files, loaded in numeric order.
'use strict';

/* ---------- post-processing: color, light paint wash, paper grain, vignette ---------- */
let rt = null;
function makeTarget() {
  if (rt) { if (rt.depthTexture) rt.depthTexture.dispose(); rt.dispose(); }
  const w = Math.max(2, Math.floor(innerWidth * DPR)), h = Math.max(2, Math.floor(innerHeight * DPR));
  rt = new THREE.WebGLRenderTarget(w, h);
  rt.depthTexture = new THREE.DepthTexture(w, h);
  rt.depthTexture.type = THREE.UnsignedIntType;
  postU.uRes.value.set(w, h); postU.uThick.value = LOOK.outline * DPR;
}
const postU = { tColor: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uSat: { value: LOOK.sat }, uGrain: { value: LOOK.grain }, uWater: { value: LOOK.water },
  uNear: { value: camera.near }, uFar: { value: camera.far }, uThick: { value: LOOK.outline }, uInk: { value: new THREE.Color(GOUACHE_INK) }, uFogD: { value: LOOK.fogD } };
const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: postU, depthTest: false, depthWrite: false,
  vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`,
  fragmentShader: `uniform sampler2D tColor;uniform sampler2D tDepth;uniform vec2 uRes;uniform float uSat;uniform float uGrain;uniform float uWater;
uniform float uNear;uniform float uFar;uniform float uThick;uniform vec3 uInk;uniform float uFogD;varying vec2 vUv;
float lin(vec2 q){float d=texture2D(tDepth,q).x;float z=d*2.0-1.0;return 2.0*uNear*uFar/(uFar+uNear-z*(uFar-uNear));}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.03;a*=0.5;}return v;}
void main(){vec2 px=1.0/uRes;vec2 uv=vUv;vec2 sp=vUv*uRes;
uv+=(vec2(fbm(sp/55.0+3.1),fbm(sp/55.0+7.7))-0.5)*px*7.0*uWater;
vec3 c=texture2D(tColor,uv).rgb;
vec3 cx=texture2D(tColor,uv+vec2(px.x*1.5,0.0)).rgb-texture2D(tColor,uv-vec2(px.x*1.5,0.0)).rgb;
vec3 cy=texture2D(tColor,uv+vec2(0.0,px.y*1.5)).rgb-texture2D(tColor,uv-vec2(0.0,px.y*1.5)).rgb;
c*=1.0-clamp((length(cx)+length(cy))*1.2,0.0,1.0)*0.35*uWater;
c*=1.0-(fbm(sp/40.0)-0.5)*0.22*uWater;
if(uThick>0.05){vec2 o=uThick/uRes;float L0=lin(vUv);
 float lap=abs(lin(vUv+vec2(0.0,o.y))+lin(vUv-vec2(0.0,o.y))+lin(vUv+vec2(o.x,0.0))+lin(vUv-vec2(o.x,0.0))-4.0*L0)/L0;
 c=mix(c,uInk,smoothstep(0.035,0.09,lap)*0.9*exp(-pow(L0*uFogD*0.9,2.0)));}
float l=dot(c,vec3(0.299,0.587,0.114));c=mix(vec3(l),c,uSat);
float fib=fbm(sp/vec2(3.0,16.0));float pap=fbm(sp/2.2);
c*=1.0-uGrain*(0.07*pap+0.05*fib);c+=(hash(sp)-0.5)*0.05*uGrain;
float d=distance(vUv,vec2(0.5,0.47));c*=1.0-0.18*uGrain*smoothstep(0.42,0.9,d);
gl_FragColor=vec4(c,1.0);}`
})));
function renderFrame() {
  if (!look) { renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
  renderer.setRenderTarget(rt); renderer.render(scene, camera);
  postU.tColor.value = rt.texture; postU.tDepth.value = rt.depthTexture;
  renderer.setRenderTarget(null); renderer.render(postScene, postCam);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (hangarOpen) showroom(dt, now); else if (!paused) update(dt, now);
  renderFrame();
  drawOverlay();
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
