// Paper Planes · 08-flight.js
// Flight model, wind and lift zones, collisions.
// Classic script: shares one global scope with the other js/ files, loaded in numeric order.
'use strict';

/* ---------- flight model ---------- */
const G = 9.8, GRAV = G * 0.9, VT = 9.4, CD0 = 0.0045, KI = 0.33;
let breeze = new THREE.Vector3();
const _w = new THREE.Vector3();
function windAt(p, t, out) {
  const bf = clamp(0.45 + p.y * 0.12, 0.45, 1);
  out.set(breeze.x * bf, 0, breeze.z * bf);
  for (const u of updrafts) {
    const dx = p.x - u.x, dz = p.z - u.z, d2 = dx * dx + dz * dz;
    if (d2 < u.r * u.r && p.y < u.top) out.y += u.w * (1 - d2 / (u.r * u.r)) * (1 - Math.pow(p.y / u.top, 2));
  }
  for (const s of sprinklers) {
    if (!s.on) continue;
    const dx = p.x - s.x, dz = p.z - s.z, d2 = dx * dx + dz * dz;
    if (d2 < s.r * s.r && p.y < s.top) out.y -= s.w * (1 - d2 / (s.r * s.r)) * (1 - p.y / s.top * 0.6);
  }
  for (const f of fans) {
    if (f.on === false) continue;
    const rx = p.x - f.x, rz = p.z - f.z, along = rx * f.dx + rz * f.dz, lat = Math.abs(rx * f.dz - rz * f.dx);
    if (along > 0.3 && along < f.len && lat < f.half && p.y < f.y1) {
      const k = f.w * (1 - along / f.len) * (1 - lat / f.half);
      out.x += f.dx * k; out.z += f.dz * k;
    }
  }
  for (const d of devils) {
    if (!d.on) continue;
    const dx = p.x - d.x, dz = p.z - d.z, dd = Math.hypot(dx, dz);
    if (dd < d.r && p.y < d.top && dd > 0.01) {
      const sw = d.spin * Math.sin(Math.PI * dd / d.r) * (1 - 0.5 * p.y / d.top);
      out.x += (-dz / dd) * sw; out.z += (dx / dd) * sw;
      out.y += d.up * (1 - dd / d.r) * (1 - p.y / d.top);
    }
  }
  if (p.z < GUST.z0 && p.z > GUST.z1) {
    const e = Math.min(1, (GUST.z0 - p.z) / 3, (p.z - GUST.z1) / 3);
    out.x += GUST.w * e * (0.65 + 0.35 * Math.sin(t * 1.4));
  }
  if (level === 'backyard') {
    const r = Math.hypot(p.x, p.z);
    if (r > RIM_R - 40 && r < RIM_R + 26 && p.y < 60) out.y += 3.6 * Math.sin(Math.PI * (r - RIM_R + 40) / 66); // wind rising up the cliff, starting just before the hedge // wind rising up the cliff
    if (r > RIM_R + 2) out.y += 0.85 * clamp(1 - (p.y - 30) / 40, 0, 1); // the canyon air holds you up, fading high up
  } else if (level === 'harbor') {
    const r = Math.hypot(p.x, p.z);
    if (r > SHORE_R - 26 && r < SHORE_R + 30 && p.y < 50) out.y += 3.4 * Math.sin(Math.PI * (r - SHORE_R + 26) / 56); // sea breeze rising off the seawall
    if (r > SHORE_R + 4) out.y += 0.62 * clamp(1 - (p.y - 30) / 40, 0, 1); // warm sea air helps, but the stacks' thermals keep you up
  }
  return out;
}
function zoneAt(p) {
  for (const d of devils) if (d.on && Math.hypot(p.x - d.x, p.z - d.z) < d.r && p.y < d.top) return d.kind || 'devil';
  for (const f of fans) { if (f.on === false) continue; const rx = p.x - f.x, rz = p.z - f.z, al = rx * f.dx + rz * f.dz; if (al > 0.3 && al < f.len && Math.abs(rx * f.dz - rz * f.dx) < f.half && p.y < f.y1) return f.kind || 'fan'; }
  for (const s of sprinklers) if (s.on && Math.hypot(p.x - s.x, p.z - s.z) < s.r && p.y < s.top) return 'sprinkler';
  for (const u of updrafts) if (Math.hypot(p.x - u.x, p.z - u.z) < u.r * 0.85 && p.y < u.top) return u.kind;
  if (p.z < GUST.z0 && p.z > GUST.z1) return 'gust';
  if (level === 'backyard') { const r = Math.hypot(p.x, p.z); if (r > RIM_R - 30 && r <= RIM_R + 2 && p.y < 60) return 'rim'; if (r > RIM_R + 2) return 'canyon'; }
  if (level === 'harbor') { const r = Math.hypot(p.x, p.z); if (r > SHORE_R - 22 && r <= SHORE_R + 4 && p.y < 50) return 'shore'; if (r > SHORE_R + 4) return 'sea'; }
  return null;
}
const ZONE_SFX = { grill: 'lift', sun: 'lift', devil: 'gust', fan: 'gust', gust: 'gust', sprinkler: 'hiss',
  heater: 'lift', sunbeam: 'lift', cfan: 'gust', window: 'gust', deskfan: 'gust', rim: 'lift', canyon: 'fanfare', thermal: 'lift', vent: 'lift', street: 'gust', shore: 'lift', sea: 'fanfare' };
const ZONE_TXT = {
  vent: 'Rooftop vent: warm lift', street: 'Wind tunnel!', shore: 'Sea breeze off the seawall!', sea: 'Open water! Float, loop and roll',
  rim: 'Cliff updraft!', canyon: 'The canyon! Float, loop and roll', thermal: 'Rising air: ride it up',
  heater: 'Heater vent: warm lift!', sunbeam: 'Sunbeam: gentle lift', cfan: 'Ceiling fan: pushing you down!',
  window: 'Breeze from the window!', deskfan: 'Desk fan: headwind!',
  grill: 'Grill updraft: free lift!', sun: 'Sunspot thermal: gentle lift', devil: 'Dust devil! Hang on!',
  sprinkler: 'Sprinkler spray: pushing you down', fan: 'Box fan: big shove!', gust: 'Crosswind!'
};
function stepFlight(s, dt, ix, iy, t) {
  const v = Math.max(s.v, 0.5);
  s.bank += (ix * 0.95 * PD.bankMax - s.bank) * Math.min(1, dt * 3.5 * PD.bankRate);
  let c = iy >= 0 ? 1 + iy * 0.9 : Math.max(0.25, 1 + iy * 0.75);
  // Soft limiter: pulling harder than the wing can handle at this speed gives diminishing returns
  const cLim = 1.8 * Math.pow(v / VT, 0.6);
  if (c > cLim) c = cLim + (c - cLim) * 0.3;
  const r = c * Math.pow(VT / v, 0.6);
  // Progressive stall: eases in over ~half a second instead of switching on
  const sT = Math.min(1, Math.max(0, (r - 1.8) / 0.6) + Math.max(0, (3 - v) / 2));
  const sTarget = sT * sT * (3 - 2 * sT);
  s.stall = (s.stall || 0) + (sTarget - (s.stall || 0)) * Math.min(1, dt * (sTarget > s.stall ? 2.2 : 3.5));
  s.stalled = s.stall > 0.5;
  const L = G * c * Math.pow(v / VT, 0.6) * (1 - 0.35 * s.stall) * PD.lift;
  const D = CD0 * PD.drag * v * v + KI * PD.ki * L * L / (v * v);
  s.v = Math.max(0.5, s.v + (-D - GRAV * Math.sin(s.g)) * dt);
  let gd = (L * Math.cos(s.bank) - GRAV * Math.cos(s.g)) / v;
  gd -= 0.8 * s.stall;
  s.g = clamp(s.g + clamp(gd, -1.6, 1.3) * dt, -1.4, 1.15);
  s.yaw -= L * Math.sin(s.bank) / (v * Math.max(0.35, Math.cos(s.g))) * dt * PD.turn;
  const cg = Math.cos(s.g);
  windAt(s.pos, t, _w);
  s.pos.x += (-Math.sin(s.yaw) * cg * s.v + _w.x) * dt;
  s.pos.y += (Math.sin(s.g) * s.v + _w.y) * dt;
  s.pos.z += (-Math.cos(s.yaw) * cg * s.v + _w.z) * dt;
  s.r = r;
}
function collide(p) {
  for (const o of obstacles) {
    if (o.t === 'box') {
      if (p.x > o.min[0] && p.x < o.max[0] && p.y > o.min[1] && p.y < o.max[1] && p.z > o.min[2] && p.z < o.max[2]) return o;
    } else if (o.t === 'sph') {
      const dx = p.x - o.c[0], dy = p.y - o.c[1], dz = p.z - o.c[2];
      if (dx * dx + dy * dy + dz * dz < o.r * o.r) return o;
    } else if (o.t === 'cyl') {
      const dx = p.x - o.x, dz = p.z - o.z;
      if (p.y < o.h && dx * dx + dz * dz < o.r * o.r) return o;
    } else if (o.t === 'seg') {
      const abx = o.b[0] - o.a[0], aby = o.b[1] - o.a[1], abz = o.b[2] - o.a[2];
      const t = clamp(((p.x - o.a[0]) * abx + (p.y - o.a[1]) * aby + (p.z - o.a[2]) * abz) / (abx * abx + aby * aby + abz * abz), 0, 1);
      if (Math.hypot(p.x - o.a[0] - abx * t, p.y - o.a[1] - aby * t, p.z - o.a[2] - abz * t) < o.r) return o;
    } else if (o.t === 'arc') {
      const rr = Math.hypot(p.x, p.z);
      if (Math.abs(rr - o.r) < o.th && p.y < o.h) {
        const a = Math.abs(Math.atan2(p.x, -p.z));
        if (a <= o.maxA && a >= o.gate) return o;
      }
    }
  }
  return null;
}
