import * as T from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { createScenery } from './scenery.js';
import { createChapters } from './chapters.js';
import { createMazeView } from './maze-view.js';
import { createLoading } from './loading.js';

const stage = document.querySelector('#stage');
const begin = document.querySelector('#begin');
const world = document.querySelector('.world');
const status = document.querySelector('#status');
const chapters = createChapters(world, status);
const loader = createLoading(world, chapters.sound, () => chapters.ready());
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const splitWelcome = matchMedia('(min-width: 760px) and (min-aspect-ratio: 1/1)');
const clamp = T.MathUtils.clamp;
const mix = T.MathUtils.lerp;
const easing = (t) => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };
const follow = (current, goal, speed, delta) => mix(current, goal, 1 - Math.exp(-delta * speed));

function addLighting(scene) {
  scene.add(new T.HemisphereLight(0xfff0df, 0xd6b0b4, 1.38));
  const key = new T.DirectionalLight(0xfff0dc, 2.35);
  key.position.set(-4, 6.5, 5);
  key.target.position.set(0, 1, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -4.4, right: 4.4, top: 4.4, bottom: -4.4, near: .15, far: 16 });
  key.shadow.bias = -.0003;
  key.shadow.normalBias = .032;
  key.shadow.intensity = .57;
  key.shadow.radius = 3;
  scene.add(key, key.target);

  const rim = new T.DirectionalLight(0xc8c4ee, 1.87);
  rim.position.set(3.3, 3.7, -3.6);
  scene.add(rim);
  const bounce = new T.DirectionalLight(0xf0c9d2, .58);
  bounce.position.set(3.2, .6, 3.4);
  scene.add(bounce);
  const pool = new T.PointLight(0xd8b7ed, 13, 9, 2);
  pool.position.set(0, 1.5, -2.65);
  scene.add(pool);
  return pool;
}

function characterRig(model) {
  const get = (name) => {
    const node = model.getObjectByName(T.PropertyBinding.sanitizeNodeName(name));
    if (!node) throw new Error('Missing PIXI node ' + name);
    return node;
  };
  model.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = /body|Ear|Foot|Paw/.test(node.name);
      node.receiveShadow = false;
    }
  });

  return {
    pivot: model,
    smile: get('Smile'),
    surprise: get('Surprised mouth'),
    frown: get('Sad mouth'),
    eyes: [get('Left Eye'), get('Right Eye')],
    brows: [get('Left Brow'), get('Right Brow')],
    gaze: [get('Left Gaze'), get('Right Gaze')],
    arms: [get('Left Arm'), get('Right Arm')],
    feet: [get('Left Foot'), get('Right Foot')]
  };
}

function attachInteraction(scene, camera, renderer, scenery, pool, pixi, mazeAvatar) {
  const { pivot, eyes, brows, gaze, arms, smile, surprise, frown, feet } = pixi;
  const browRest = brows.map((brow) => brow.position.z);
  const play = chapters.sound;
  const ray = new T.Raycaster();
  const rightArmRest = arms[1].position.clone();
  const pointer = new T.Vector2();
  const hitBody = pivot.children.filter((child) => child.isMesh || child.name.includes('Arm'));
  const surpriseZ = surprise.position.z;
  const started = performance.now();
  const reactionDuration = 1.46;
  let previous = started, reactionStart = -10, ceremonyStart = -10, welcomeStart = -10;
  const reactions = ['wave', 'surprised', 'happy'];
  let reaction = '', rotationIndex = 0, concern = 0, framing = 0, mazeView;
  let turned = 0, turnGoal = 0, pitch = 0, pitchGoal = 0, drag;
  let lastBlink = .85, blinkDelay = 3.2, hoverTime = 0;
  let lookX = 0, lookY = 0;
  let touchActivation = false;
  let inCeremony = false;
  let effectWasReduced = reduced.matches;
  let viewportWidth, viewportHeight;
  let welcomeX = 0, welcomeY = 0, projectionX = -1, projectionY = -1;
  const seconds = () => (performance.now() - started) / 1000;
  const nowSmooth = (time, from, duration) => easing((time - from) / duration);

  function updatePointer(event) {
    const box = stage.getBoundingClientRect();
    pointer.set((event.clientX - box.left) / box.width * 2 - 1, 1 - (event.clientY - box.top) / box.height * 2);
    ray.setFromCamera(pointer, camera);
    return ray.intersectObjects(hitBody, true).length > 0;
  }

  function animateReaction(next) {
    reaction = next;
    reactionStart = seconds();
    const lines = { happy: 'قفزت بيكسي من الفرح.', wave: 'لوّحت بيكسي.', surprised: 'تفاجأت بيكسي.', concerned: 'بيكسي متضايقة وعندها طلب.' };
    status.textContent = lines[reaction];
    window.dispatchEvent(new CustomEvent('pixi:reaction', { detail: { reaction } }));
  }

  function react() {
    if (chapters.reactToRequest()) return;
    const next = chapters.state.emotion || reactions[rotationIndex++ % reactions.length];
    play.play(next);
    animateReaction(next);
  }

  stage.addEventListener('pointermove', (event) => {
    if (drag && drag.id === event.pointerId) {
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (drag.moving || Math.hypot(dx, dy) > 6) {
        drag.moving = true;
        stage.dataset.dragging = '';
        turnGoal = drag.angle + dx * .014;
        pitchGoal = clamp(drag.pitch + dy * .006, -.34, .34);
      }
      return;
    }
    const hit = updatePointer(event);
    stage.toggleAttribute('data-hit', hit);
    hoverTime = seconds();
  });

  stage.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || drag || !updatePointer(event)) return;
    touchActivation = false;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, angle: turnGoal, pitch: pitchGoal, moving: false };
    stage.setPointerCapture(event.pointerId);
  });

  function endDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    touchActivation = event.type === 'pointerup' && !drag.moving;
    drag = undefined;
    delete stage.dataset.dragging;
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('lostpointercapture', endDrag);
  stage.addEventListener('pointerleave', () => {
    if (!drag) {
      pointer.set(0, 0);
      delete stage.dataset.hit;
    }
  });
  stage.addEventListener('click', (event) => {
    if (event.detail === 0 || touchActivation) react();
    touchActivation = false;
  });
  stage.addEventListener('keydown', (event) => {
    const offsets = { ArrowLeft: [-.30, 0], ArrowRight: [.30, 0], ArrowUp: [0, -.14], ArrowDown: [0, .14] };
    if (event.key === 'Escape') {
      turnGoal = Math.round(turnGoal / (Math.PI * 2)) * Math.PI * 2;
      pitchGoal = 0;
    } else if (offsets[event.key]) {
      const [x, y] = offsets[event.key];
      turnGoal += x;
      pitchGoal = clamp(pitchGoal + y, -.34, .34);
    } else return;
    event.preventDefault();
  });

  chapters.connect(() => {
    inCeremony = true;
    world.dataset.ceremony = '';
    turnGoal = Math.round(turnGoal / (Math.PI * 2)) * Math.PI * 2;
    pitchGoal = 0;
    reaction = 'happy';
    reactionStart = ceremonyStart = seconds();
    if (chapters.state.screen === 'welcome') window.dispatchEvent(new Event('pixi:begin'));
  }, (emotion) => {
    turnGoal = Math.round(turnGoal / (Math.PI * 2)) * Math.PI * 2;
    pitchGoal = 0;
    animateReaction(emotion);
  }, () => {
    turnGoal = Math.round(turnGoal / (Math.PI * 2)) * Math.PI * 2;
    pitchGoal = 0;
    welcomeStart = seconds();
    window.dispatchEvent(new Event('pixi:welcome-wave'));
  });

  const resize = () => {
    const width = stage.clientWidth, height = stage.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(devicePixelRatio, width * height > 2600000 ? 1.3 : 1.65);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = Math.max(36, T.MathUtils.radToDeg(2 * Math.atan(.225 / camera.aspect)));
    viewportWidth = width;
    viewportHeight = height;
    projectionX = projectionY = -1;
  };
  new ResizeObserver(resize).observe(stage);
  resize();

  function frame(stamp) {
    const time = (stamp - started) / 1000;
    const delta = Math.min(.052, (stamp - previous) / 1000);
    previous = stamp;
    const effects = !reduced.matches;
    const { screen, emotion } = chapters.state;
    if (screen === 'surprise') {
      mazeView ??= createMazeView(mazeAvatar, () => chapters.maze.clickCharacter());
      mazeView(chapters.maze, delta, effects);
      return;
    }
    framing = follow(framing, screen === 'welcome' ? 0 : 1, effects ? 5 : 24, delta);
    if (effectWasReduced === effects) {
      lastBlink = time + .4;
      effectWasReduced = !effects;
    }
    const entrance = effects ? nowSmooth(time, 0, 1.95) : 1;
    const greetingAge = time - welcomeStart;
    const greeting = effects && screen === 'welcome' ?
      nowSmooth(greetingAge, .06, .38) * (1 - nowSmooth(greetingAge, 1.43, .46)) : 0;
    const activeReaction = clamp((time - reactionStart) / reactionDuration, 0, 1);
    const pulse = Math.sin(Math.PI * activeReaction);
    const p = clamp((time - ceremonyStart) / (effects ? 1.10 : .28), 0, 1);
    const ceremony = inCeremony ? Math.sin(p * Math.PI) ** 1.35 : 0;
    if (inCeremony && p >= 1) {
      inCeremony = false;
      delete world.dataset.ceremony;
      chapters.finishTransition();
      if (screen === 'welcome') window.dispatchEvent(new Event('pixi:welcome-transition-end'));
    }

    if (effects && time - lastBlink > blinkDelay) {
      lastBlink = time;
      blinkDelay = 2.8 + (Math.sin(time * 1.45) + 1) * .72;
    }
    const close = effects ? Math.max(0, 1 - Math.abs((time - lastBlink - .115) / .115)) : 0;
    const surprised = reaction === 'surprised' ? easing(pulse * 1.9) : 0;
    const concernTarget = emotion === 'concerned' ? 1 : reaction === 'concerned' ? pulse * .55 : 0;
    concern = follow(concern, concernTarget, effects ? 7 : 26, delta);
    const jump = effects && reaction === 'happy' ? pulse ** 1.55 * .43 : 0;
    const wave = reaction === 'wave' ? easing(pulse * 1.55) : 0;
    const waveMotion = wave + ceremony * .32;
    const bounce = effects ? Math.sin(time * 2.04) * .039 : 0;
    const breath = effects ? Math.sin(time * 1.8) * .014 : 0;
    const mouse = !drag && !inCeremony && time - hoverTime < 7 && effects ? pointer : null;
    lookX = follow(lookX, mouse?.x ?? 0, 5, delta);
    lookY = follow(lookY, mouse?.y ?? 0, 5, delta);
    turned = follow(turned, turnGoal, reduced.matches ? 28 : 9, delta);
    pitch = follow(pitch, pitchGoal, reduced.matches ? 28 : 8, delta);

    pivot.position.set(0, 1.345 + bounce + jump + (1 - entrance) * .84 - concern * .05, 0);
    pivot.rotation.set(pitch - lookY * .069 + concern * .085,
      turned + lookX * .19 + (1 - entrance) * -.82 + concern * .08,
      (effects ? Math.sin(time * 1.22) * .025 - wave * .075 : 0) - concern * .068 - greeting * .045);
    pivot.scale.set(1 - breath - jump * .041, 1 + breath + jump * .071 - concern * .036, 1 - breath);
    for (const [i, eye] of eyes.entries()) {
      eye.scale.x = 1 + surprised * .10;
      eye.scale.y = Math.max(.071, (1 - easing(close)) * (1 + surprised * .18 - concern * .22));
      eye.rotation.z = (i === 0 ? .13 : -.13) * concern;
      brows[i].position.z = browRest[i] + concern * .169;
      brows[i].rotation.z = (i === 0 ? -.30 : .30) * concern;
    }
    for (const pupil of gaze) {
      pupil.position.x = lookX * .036;
      pupil.position.y = lookY * .047 + concern * .021;
    }
    const reveal = easing((surprised - .31) / .69);
    smile.scale.set(1 - reveal * .43, 1 - reveal * .30, 1);
    smile.position.set(0, -.36 * reveal * .30, -.13 * Math.max(reveal, concern));
    surprise.position.z = surpriseZ + reveal * .125;
    surprise.scale.x = .124 * (.70 + reveal * .30);
    frown.position.z = .126 * concern;
    arms[0].rotation.z = jump * -.70 + surprised * -.64 + concern * .35;
    const raised = Math.max(greeting, wave * .86);
    arms[1].position.set(rightArmRest.x + raised * .24, rightArmRest.y + raised * .51,
      rightArmRest.z + raised * .30);
    arms[1].rotation.z = waveMotion * (1.79 + (effects ? Math.sin(time * 17) * .31 : 0)) +
      greeting * (1.68 + Math.sin(greetingAge * 14) * .28) + jump * .60 + surprised * .66 - concern * .49;
    arms[1].rotation.x = -waveMotion * .25 - greeting * .19;
    feet[0].rotation.x = jump * .48;
    feet[1].rotation.x = jump * -.29;

    const aspect = camera.aspect;
    const wide = aspect > .94;
    const welcome = screen === 'welcome';
    const split = splitWelcome.matches;
    const ease = effects ? 7 : 40;
    welcomeX = follow(welcomeX, split ? .195 : .025, ease, delta);
    welcomeY = follow(welcomeY, split ? 0 : welcome ? .11 : .175, ease, delta);
    if (viewportWidth && (Math.abs(welcomeX - projectionX) > .0002 || Math.abs(welcomeY - projectionY) > .0002)) {
      projectionX = welcomeX;
      projectionY = welcomeY;
      camera.setViewOffset(viewportWidth, viewportHeight, welcomeX * viewportWidth, welcomeY * viewportHeight,
        viewportWidth, viewportHeight);
    }
    camera.position.set(
      (effects ? .15 + Math.sin(time * .37) * .14 : .15) + lookX * .21,
      (wide ? 3.14 : 2.77) + (1 - entrance) * 1.11 + lookY * .10 + (effects ? ceremony * .32 : 0),
      (wide ? 8.65 : 9.15) + (1 - entrance) * 1.50 + framing * .72 - (effects ? ceremony * .78 : 0)
    );
    camera.lookAt(0, (wide ? 1.47 : 1.53) + framing * .04, 0);
    pool.intensity = 13 + ceremony * 11;
    scenery.update(ceremony, jump + (1 - entrance) * .84, pivot.position.x);
    renderer.render(scene, camera);
  }

  stage.disabled = begin.disabled = false;
  world.dataset.ready = '';
  renderer.setAnimationLoop(frame);
  loader.complete();
}

async function boot() {
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(36, 1, .05, 110);
  const pool = addLighting(scene);
  const scenery = createScenery(scene);
  const url = typeof PIXI_OFFLINE_MODEL === 'string'
    ? PIXI_OFFLINE_MODEL
    : new URL('./assets/pixi.glb', document.baseURI).href;
  const fonts = document.fonts?.load('700 24px Alexandria', 'مرحبًا PIXI').catch(() => {});
  const [gltf] = await Promise.all([new GLTFLoader().loadAsync(url, loader.transfer), fonts]);
  const pixi = characterRig(gltf.scene.getObjectByName('PIXI'));
  const mazeAvatar = pixi.pivot.clone(true);
  scene.add(pixi.pivot);
  stage.append(renderer.domElement);
  attachInteraction(scene, camera, renderer, scenery, pool, pixi, mazeAvatar);
}

boot().catch((error) => {
  console.error('Could not initialize PIXI’s World', error);
  world.dataset.fallback = '';
  document.querySelector('#maze-canvas').dataset.fallback = '';
  begin.disabled = false;
  loader.complete();
  status.textContent = 'يحتاج المشهد ثلاثي الأبعاد إلى متصفح يدعم WebGL 2.';
});

