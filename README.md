# PIXI’s World

A browser-based 3D workshop with Welcome, Requirements, Home, the Surprise maze, and a Design lesson. The scenes share the same PIXI model.

## Run locally

The prebuilt site is in `dist/`. With Node.js installed, run `node scripts/serve.mjs` from the project folder and open `http://127.0.0.1:4173`. The separately supplied standalone HTML preview can also open directly in a WebGL 2 browser.

The workshop opens automatically when loaded. The speaker icon in the corner controls sound during loading and play. Browsers that permit autoplay can play the arrival cue immediately. Otherwise the game opens silently and sound becomes available through interaction. PIXI waves as her name resolves from scrambled letters. Click or tap PIXI to trigger an effect. Drag her to inspect the model from any side, or use the arrow keys when the scene is focused. In Requirements, read PIXI’s written dialogue and pick the requirement she describes. In **السر**, PIXI first asks for help in a short emergency scene. Click her in the overhead 3D maze whenever you want her to walk to the next gate. Answer each question by clicking an option or using keys 1–3; wrong answers show a hint and keep the gate locked. After all three gates open, click PIXI once more to reach the exit.

## Edit the project

| File | Purpose |
| --- | --- |
| `dist/index.html` and `dist/style.css` | Logo, Arabic button, and responsive layout |
| `dist/assets/world.js` | Lighting, camera, input, and character animation |
| `dist/assets/loading.js`, `dist/assets/chapters.js`, and `dist/assets/dialogue.js` | Opening, screen navigation, and the Arabic greeting |
| `dist/assets/sound.js` | Synthesized effects |
| `dist/assets/maze.js` and `dist/assets/maze-view.js` | Editable questions, presenter-controlled gate logic, and the 3D maze |
| `dist/assets/scenery.js` | The workshop, arched window, furniture, plants, and rug |
| `dist/assets/requirements.js` | PIXI’s dialogue, requirement activity, and collected summary |
| `dist/assets/design-copy.js` | Editable Design dialogue, rule explanations, and example app text |
| `dist/assets/design.js`, `dist/assets/design-view.js`, and `dist/design.css` | Design lesson, 3D character poses, and the changing phone interface |
| `scripts/model.mjs` | Procedural PIXI sculpt and editable facial, arm, and foot parts |
| `dist/assets/pixi.glb` | Full 3D model with named parts and physically based materials |

Run `npm ci` to install development dependencies. After changing the character, run `node scripts/export-model.mjs` to regenerate the model. You can also import the GLB into Blender using **File → Import → glTF 2.0**. Keep the named eye, mouth, arm, and foot objects when re-exporting it for the site. The browser applies the interactive animations to these named parts at runtime.

In Requirements, confirm all three ideas and wait for PIXI’s requirements file. Choose **يلا نصمم** to start the Design lesson. The house button and the **التصميم** navigation tab also open it directly. Click the gift, try the mug, and then zoom in on PIXI’s phone. For each rule, choose **طبّقي القاعدة** to update the same app. The last rule enables a simulated send action so the audience can see immediate feedback. The lesson can be replayed or closed by returning to the house.

The included Three.js modules are rebuilt by `node scripts/vendor.mjs`. Run `node scripts/offline.mjs PIXI-preview.html` to generate the standalone preview.

`node scripts/verify.mjs https://pixi.test/` runs the browser checks using Chrome and serves the included files through Playwright request interception.

## Deploy publicly

1. Extract the project ZIP and locate `dist/`. The folder contains `index.html`, the styles, JavaScript, and the GLB.
2. Sign in to Netlify and drag the entire `dist/` folder onto [Netlify Drop](https://app.netlify.com/drop). Netlify publishes the prebuilt files. [Netlify’s deployment guide](https://docs.netlify.com/deploy/create-deploys/)
3. Open the generated public URL and try the camera, character reactions, and start button on the intended display.
4. To update the site, upload the revised `dist/` folder from the project’s **Deploys** page.

Third-party license information is in `dist/assets/vendor/LICENSE-three.txt` and `dist/assets/fonts/LICENSE-alexandria.txt`.

