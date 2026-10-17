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
- Paper stars (`10-stars.js`): one `InstancedMesh` per world (one draw call). Spots are listed by intent
  (`line` between rings, `lift` atop thermals/vents, `gate`, `river`, `sea`) and checked against the world at
  load; blocked spots are nudged up, and anything still blocked lands in `STARS_DROPPED`. +50 per star each
  throw, +50 more the first time; found stars persist in `ppb-stars-<world>` and draw pale instead of coral.
- First-time players start in Harbor City (easiest to navigate, so it's the first impression for friends);
  after that the game reopens the last world played (`ppb-level`).
- Music (`Music` in `07-fx-sound.js`): `audio/summer-sky-1.mp3` and `-2.mp3` take turns, starting on the first
  tap (browsers block sound before that). The `<audio>` element runs through a Web Audio gain so volume works on
  iPhones too; it pauses when the tab is hidden. The Sound chip opens a panel with separate on/off and volume
  for music (`ppb-music`, `ppb-music-vol`, default 50%) and effects (`ppb-mute`, `ppb-sfx-vol`).
- Storage: localStorage keys `ppb-*` (best per world, style best, hangar designs, active plane, settings).
  Inside a Claude artifact, designs also sync to the private `db` path `data/users/<id>/<designId>`
  (capabilities `db` + `user`); outside Claude `window.claude` is absent and it silently stays local.

## Art direction (decided with Kevin via the Look Lab; keep it)
"Painted gouache": smooth toon shading (32-step ramp), pencil hatching only in deep shadow at 10%
(`LOOK.hatch`), thin 0.5 px warm-brown silhouette outline from a depth pass in post (`12-render-boot.js`),
color saturation 115%, sun 54° high ahead-right, exp fog haze 0.5, paper grain 0.1.
Kevin's feedback so far:
- Camera stays **directly behind** the plane (don't offset it sideways).
- No "boiling"/jittery lines; avoid noisy texture and busy hatching.
- Plane must read clearly: visible notebook lines, not washed out.
- Thin lines (heat shimmer, wind streaks) must not write depth or the outline pass turns them black.
- Objects need contact shading so they don't look like they float.
- He prefers concrete options and iterates quickly; ask before big art changes.

## Performance (phones)
- The scene renders into an offscreen target at `sceneDPR()` (full `DPR` unless `?q=` forces a lower tier).
- Quality governor (`governor` in `12-render-boot.js`) is **off** (`Q.auto = false`): on Kevin's phone a lower
  render scale looked soft and shimmery and did not raise the frame rate (still 35-45 fps in flight), so the
  bottleneck is not pixel fill. Likely draw calls / CPU; investigate before turning it back on.
- URL switches: `?q=0..3` forces a tier, `?fps` shows fps, tier, render scale and the GPU driver name.
- Post shader samplers are declared `highp`: mobile GPUs default `sampler2D` to lowp, which (in Android
  Chrome, not the Claude app) quantized depth into screen-wide dark outline bands across the ground.
- Paper grain is baked once into a 512 px tiling texture (`grainTex`); the paint-wash warp (`LOOK.water`) is
  compiled out with `#if WATER` while it's 0.
- All js/ files share one global scope: never reuse a top-level name across files (a duplicate
  `paperTexture` once silently replaced the plane's notebook paper with a plain sheet).

## Testing and publishing
- `node tools/smoke-test.js [section ...]` runs the real game code against a stubbed browser/three.js (randomness
  is seeded, so runs are identical). It checks logic only, not visuals. Loading the game always runs; then
  pick only the sections a change touches (Kevin asked for targeted runs):
  - `backyard`, `harbor`: simulated throws in that world (flight, wind, scoring, rings, birds, collisions)
  - `hangar`: plane designs; `stars`: paper stars; `sound`: music + effects settings panel; `quality`: governor
  - No sections = everything; use that for changes to shared code (flight, scoring, core, render) or before
    a big push. Pure asset/art/CSS changes need only the load check plus the closest section.
- `node tools/bundle.js` writes `dist/paper-planes.html` (single file) for publishing as the Claude
  artifact at https://claude.ai/artifact/LvFrEE7R81wehQGS1jnX4C (declare capabilities `{db:{}, user:{}}`). The
  music isn't inlined: publish `audio/summer-sky-1.mp3` and `audio/summer-sky-2.mp3` alongside it via `files`.
- GitHub Pages serves the repo root from `main`.

## Ideas queued (from Kevin's list)
Updraft surfing (skim walls for lift + bonus), gust bursts, daily challenges,
ghost replay of best flight, landing targets, photo mode, weather/time of day. Performance leftovers (only if
phones still struggle): merge harbor clutter (~270 draw calls), upgrade three.js.
