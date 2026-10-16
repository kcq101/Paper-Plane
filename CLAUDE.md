# Paper Planes: notes for working on this repo

Casual mobile 3D paper-plane game. Plain HTML/CSS/JS + three.js r128 from cdnjs. No build step, no npm.
Owner: Kevin. Iterates by playing on an Android phone and sending screenshots or screen recordings.

## How the code is organized
- `js/*.js` are **classic scripts sharing one global scope**, loaded in numeric order by `index.html`.
  Top-level `const`/`let`/`function` in one file are visible to later files. Keep that order; never
  turn them into modules without converting the whole set. Don't declare top-level names that clash
  with browser globals (`top`, `name`, `status`, `location`, ...).
- Worlds are built at load time into their own `THREE.Group` (`byGroup` backyard, `hbGroup` harbor,
  `clGroup` classroom). While a world is built, `scene.add` is redirected into its group and the shared
  registries (`REG`: obstacles, updrafts, sprinklers, fans, devils, tramps, pools) are filled, then
  snapshotted into `LV[world]`. `setLevel(id)` swaps registries, rings and birds, `LAUNCH`, and `ACTIVE`
  (used by `groundAt`).
- Physics: `stepFlight` in `08-flight.js`. Constants `G=9.8`, `GRAV=G*0.9` (10% lighter gravity),
  `VT=9.4`, `CD0=0.0045`, `KI=0.33`. Plane folds multiply these through `PD` (see `FOLDS` in `06-plane.js`).
- Wind/lift: `windAt` (updrafts, fans, devils, gust band, cliff/seawall updrafts, canyon/sea float) and
  `zoneAt` (HUD toasts). Ring boost +2.5 m/s (cap 20). Loop = fast stick snap (<0.25 s) at >= 12 m/s and
  >= 6 m height. Roll = two horizontal swipes within 600 ms.
- Storage: localStorage keys `ppb-*` (best per world, style best, hangar designs, active plane, settings).
  Inside a Claude artifact, designs also sync to the private `db` path `data/users/<id>/<designId>`
  (capabilities `db` + `user`); outside Claude `window.claude` is absent and it silently stays local.

## Art direction (decided with Kevin via the Look Lab; keep it)
"Painted gouache": smooth toon shading (32-step ramp), pencil hatching only in deep shadow at 10%
(`LOOK.hatch`), thin 0.5 px warm-brown silhouette outline from a depth pass in post (`11-render-boot.js`),
color saturation 115%, sun 54° high ahead-right, exp fog haze 0.5, paper grain 0.1.
Kevin's feedback so far:
- Camera stays **directly behind** the plane (don't offset it sideways).
- No "boiling"/jittery lines; avoid noisy texture and busy hatching.
- Plane must read clearly: visible notebook lines, not washed out.
- Thin lines (heat shimmer, wind streaks) must not write depth or the outline pass turns them black.
- Objects need contact shading so they don't look like they float.
- He prefers concrete options and iterates quickly; ask before big art changes.

## Testing and publishing
- `node tools/smoke-test.js` runs the real game code against a stubbed browser/three.js and plays
  simulated throws in both worlds plus hangar actions. It checks logic only, not visuals. Run it after
  every change.
- `node tools/bundle.js` writes `dist/paper-planes.html` (single file) for publishing as the Claude
  artifact at https://claude.ai/artifact/LvFrEE7R81wehQGS1jnX4C (declare capabilities `{db:{}, user:{}}`).
- GitHub Pages serves the repo root from `main`.

## Ideas queued (from Kevin's list)
Updraft surfing (skim walls for lift + bonus), collectibles (paper stars), gust bursts, daily challenges,
ghost replay of best flight, landing targets, photo mode, weather/time of day. Performance pass:
smaller shadow map on phones, cap DPR, cheaper outline, merge harbor clutter, upgrade three.js.
