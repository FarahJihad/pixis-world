# PIXI’s World

A browser-based 3D workshop with Welcome, Requests, and Surprise screens. PIXI’s round head and small, rounded ears are based on the supplied illustration. The site loads the same binary glTF model included in this project.

## Run locally

The prebuilt site is in `dist/`. With Node.js installed, run `node scripts/serve.mjs` from the project folder and open `http://127.0.0.1:4173`. The separately supplied standalone HTML preview can also open directly in a WebGL 2 browser.

The workshop opens automatically when loaded. The speaker icon in the corner controls sound during loading and play. Browsers that permit autoplay can play the arrival cue immediately. Otherwise the game opens silently and sound becomes available through interaction. PIXI waves as her name resolves from scrambled letters. Click or tap PIXI to trigger an effect. Drag her to inspect the model from any side, or use the arrow keys when the scene is focused. In Requirements, read PIXI’s written dialogue and pick the requirement she describes. In Surprise, PIXI walks automatically through a 3D maze and stops at three question gates. Click a choice or use keys 1–3. Wrong answers leave the gate locked and show a hint. Correct answers open the gates. Any collected requirements appear after the escape.

## Edit the project

| File | Purpose |
| --- | --- |
| `dist/index.html` and `dist/style.css` | Logo, Arabic button, and responsive layout |
| `dist/assets/world.js` | Lighting, camera, input, and character animation |
| `dist/assets/loading.js`, `dist/assets/chapters.js`, and `dist/assets/dialogue.js` | Opening, screen navigation, and the Arabic greeting |
| `dist/assets/sound.js` | Synthesized effects |
| `dist/assets/maze.js` and `dist/assets/maze-view.js` | Editable questions, gate logic, and the 3D maze |
| `dist/assets/scenery.js` | The workshop, arched window, furniture, plants, and rug |
| `dist/assets/requirements.js` | PIXI’s dialogue, requirement activity, and collected summary |
| `scripts/model.mjs` | Procedural PIXI sculpt and editable facial, arm, and foot parts |
| `dist/assets/pixi.glb` | Full 3D model with named parts and physically based materials |

Run `npm ci` to install development dependencies. After changing the character, run `node scripts/export-model.mjs` to regenerate the model. You can also import the GLB into Blender using **File → Import → glTF 2.0**. Keep the named eye, mouth, arm, and foot objects when re-exporting it for the site. The browser applies the interactive animations to these named parts at runtime.

The included Three.js modules are rebuilt by `node scripts/vendor.mjs`. Run `node scripts/offline.mjs PIXI-preview.html` to generate the standalone preview.

`node scripts/verify.mjs https://pixi.test/` runs the browser checks using Chrome and serves the included files through Playwright request interception.

## Deploy publicly

1. Extract the project ZIP and locate `dist/`. The folder contains `index.html`, the styles, JavaScript, and the GLB.
2. Sign in to Netlify and drag the entire `dist/` folder onto [Netlify Drop](https://app.netlify.com/drop). Netlify publishes the prebuilt files. [Netlify’s deployment guide](https://docs.netlify.com/deploy/create-deploys/)
3. Open the generated public URL and try the camera, character reactions, and start button on the intended display.
4. To update the site, upload the revised `dist/` folder from the project’s **Deploys** page.

Third-party license information is in `dist/assets/vendor/LICENSE-three.txt` and `dist/assets/fonts/LICENSE-alexandria.txt`.

