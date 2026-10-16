# Paper Planes

A casual 3D paper-plane flying game for your phone, in a painted gouache style.
Fold your own plane, throw it from a high balcony, thread rings, dodge birds,
and float out over a canyon or the open sea.

**Play it:** https://kcq101.github.io/Paper-Plane/ (works in any modern mobile or desktop browser)

## How to play

| Action | Touch | Keyboard |
| --- | --- | --- |
| Throw | Pull back anywhere and let go; slide sideways to aim (up to 60° each way) | Space or Enter |
| Steer | Drag your thumb: sideways to turn, up/down to climb or dive | Arrow keys or WASD |
| Loop | Snap the stick back fast while you have speed (at least 12 m/s) | E |
| Barrel roll | Two quick swipes left or right (also hops you sideways and dodges birds) | Q |
| Flip climb/dive | "Drag up = climb / dive" button | |

**Scoring (★):** points for tricks (loops 250, rolls 150, combos up to ×5), rings (100, streaks up to ×5),
close calls with birds (+25), time in the air and distance. Hitting a bird costs 75.

## Worlds

- **Backyard:** launch from a top-floor balcony, cross a long lawn with grills, sunspots, box fans,
  sprinklers, dust devils and a trampoline, clear the hedge, and drop into a huge canyon with mesas and a river.
- **Harbor City:** launch from a tower, fly down a colorful street under laundry lines and over rooftop vents,
  catch the sea breeze off the seawall, then thread rings through rock arches around sea stacks and a lighthouse.

## The hangar

Tap the ✈ plane name before a throw. Fold the nose, wings and wingtips (each changes speed, glide,
turning and stability), pick a paper, name it, and save it. Four starter planes are included:
Classic Dart, Speed Dart, Floaty Glider and Stunt Flyer.

Saved planes are stored in the browser (and privately per person when played as a Claude artifact).

## Run it locally

No build step. Serve the folder with any static server, for example:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Project layout

```
index.html          page markup (HUD, hangar, field guide) + script tags in load order
css/style.css       all styles
js/01-core.js       renderer, lighting, materials, ink lines
js/02-backyard.js   world 1 + canyon terrain + rings and birds
js/03-sky.js        clouds, sun, labels, best-throw flag
js/04-harbor.js     world 2: Harbor City and the sea
js/05-classroom.js  hidden prototype level
js/06-plane.js      plane folds, flight modifiers, paper textures
js/07-fx-sound.js   comic effects and synthesized sound
js/08-flight.js     flight model, wind and lift zones, collisions
js/09-game.js       game state, scoring, input, HUD, per-frame update
js/10-hangar.js     hangar and folding studio
js/11-render-boot.js post-processing, frame loop, boot
lab/index.html      Look Lab: the art-direction bench used to pick the visual style
tools/smoke-test.js headless test that plays simulated throws in both worlds
tools/bundle.js     builds dist/paper-planes.html, a single self-contained file
```

## Tools

```sh
node tools/smoke-test.js   # simulated throws in both worlds + hangar checks
node tools/bundle.js       # one-file build in dist/ (used for the Claude artifact version)
```

## Credits

Designed by Kevin Quinn. Built with [Claude](https://claude.ai).
3D rendering by [three.js](https://threejs.org) (r128). Fonts: Kalam and Patrick Hand (Google Fonts).

## License

MIT, see [LICENSE](LICENSE).
