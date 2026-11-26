import * as T from './vendor/three.module.js';
import { createHomeRoom } from './home-room.js';

const { lerp, clamp } = T.MathUtils;
const ease = (value) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
const rest = {
  x: -.18, y: 1.23, z: .92, yaw: .12, pitch: 0, roll: 0,
  width: .90, height: .90, leftArm: 0, rightArm: 0, leftFoot: 0, rightFoot: 0, blink: 0, night: 0
};

function idle(time, motion) {
  const breath = motion ? Math.sin(time * 2.6) * .013 : 0;
  const blink = motion ? Math.max(0, 1 - Math.abs((time % 3.75 - 2.55) / .11)) : 0;
  return { ...rest, y: rest.y + breath, height: rest.height + breath, blink };
}

function dance(time, motion) {
  const beat = time * 10;
  const sway = motion ? Math.sin(beat * .5) : .48;
  return {
    ...rest, x: rest.x + sway * .31, y: rest.y + (motion ? Math.abs(Math.sin(beat)) * .22 : 0),
    yaw: rest.yaw + sway * .88, roll: sway * -.21,
    leftArm: -.68 + sway * .68, rightArm: .68 + sway * .68,
    leftFoot: sway * .53, rightFoot: sway * -.53
  };
}

function sleep(time, motion) {
  const walk = motion ? ease(time / 1.05) : 1;
  const settle = motion ? ease((time - 1.05) / .62) : 1;
  const stride = motion && time < 1.05 ? Math.sin(time * 16) * Math.sin(Math.PI * walk) : 0;
  const breath = motion ? Math.sin(time * 2) * .014 * settle : 0;
  return {
    ...rest, x: lerp(rest.x, 3.08, walk), z: lerp(rest.z, -.98, walk),
    y: rest.y + Math.sin(walk * Math.PI) * .22 + settle * .52 + breath,
    yaw: lerp(rest.yaw + Math.sin(walk * Math.PI) * 1.48 + walk * .45, .10, settle), roll: -1.50 * settle,
    width: lerp(rest.width, .62, settle) + breath, height: lerp(rest.height, .77, settle),
    blink: settle * .96, night: motion ? ease((time - .72) / 1.50) : 1,
    leftArm: stride * .32 - settle * .25, rightArm: -stride * .32 + settle * .45,
    leftFoot: stride * .43, rightFoot: -stride * .43
  };
}

function jump(time, motion) {
  const flight = clamp((time - .19) / .65, 0, 1);
  const height = motion ? Math.sin(flight * Math.PI) * 1.38 : 0;
  const crouch = Math.sin(Math.PI * clamp(time / .23, 0, 1));
  const squash = Math.sin(Math.PI * clamp((time - .81) / .31, 0, 1));
  const stretch = Math.sin(flight * Math.PI) * .12 - crouch * .16 - squash * .17;
  return {
    ...rest, y: rest.y + height - (motion ? (crouch + squash) * .13 : 0),
    height: rest.height + stretch, width: rest.width - stretch * .78, pitch: -height * .07,
    leftArm: -.68 * height, rightArm: .68 * height, leftFoot: height * .21, rightFoot: height * -.18
  };
}

const poses = { idle, dance, sleep, jump };
const duration = { dance: 4.45, jump: 1.18 };

function blendPose(from, to, amount) {
  return Object.fromEntries(Object.entries(to).map(([key, value]) => [key, lerp(from[key], value, amount)]));
}

export function createHomeChapter() {
  const chapter = document.querySelector('#home');
  const buttons = [...chapter.querySelectorAll('.home-actions button')];
  const state = { action: 'idle', visit: 0 };
  let active = false;

  function select(action) {
    state.action = action;
    chapter.dataset.homeAction = action;
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button.dataset.homeAction === action));
    }
  }

  function startDance() { if (active) select('dance'); }
  function startSleep() { if (active) select('sleep'); }
  function startJump() { if (active) select('jump'); }
  const handlers = { dance: startDance, sleep: startSleep, jump: startJump };
  for (const button of buttons) button.addEventListener('click', handlers[button.dataset.homeAction]);

  return {
    state,
    enter() {
      active = true;
      state.visit += 1;
      select('idle');
    },
    leave() {
      if (!active) return;
      active = false;
      select('idle');
    },
    finish() { select('idle'); }
  };
}

function decoration(symbol, color) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 64px "Segoe UI Symbol", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = '#fff4ee';
  ctx.lineWidth = 8;
  ctx.strokeText(symbol, 48, 49);
  ctx.fillStyle = color;
  ctx.fillText(symbol, 48, 49);
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  return map;
}

function makeEffects(scene) {
  const sprites = {};
  for (const [action, symbols, color] of [
    ['dance', ['♪', '♫', '♪', '♫', '♪'], '#9b5496'],
    ['sleep', ['z', 'Z', 'Z'], '#c0a5f2'],
    ['jump', ['✦', '✧', '✦', '✧', '✦'], '#d18e52']
  ]) {
    sprites[action] = symbols.map((symbol) => {
      const sprite = new T.Sprite(new T.SpriteMaterial({ map: decoration(symbol, color), depthWrite: false }));
      sprite.visible = false;
      scene.add(sprite);
      return sprite;
    });
  }
  return (action, time, motion, spacing, foreground) => {
    for (const [kind, items] of Object.entries(sprites)) {
      for (const [index, sprite] of items.entries()) {
        sprite.visible = kind === action &&
          (kind !== 'sleep' || time > 1.22 || !motion) && (kind !== 'jump' || time > .19);
        if (!sprite.visible) continue;
        const t = motion ? (time * .75 + index / items.length) % 1 : .34 + index * .13;
        const side = index % 2 ? -1 : 1;
        if (kind === 'sleep') sprite.position.set(3.67 + t * .62, 2.50 + t * 1.09, -.65);
        else if (kind === 'dance') sprite.position.set(rest.x + side * (1.37 + (index % 3) * .21), 1.68 + t * 1.19, 1.05);
        else sprite.position.set(rest.x + side * (1.20 + t * .65), 1.20 + (index % 3) * .56 + t * .27, 1.18);
        sprite.position.x *= spacing;
        if (kind !== 'sleep') sprite.position.z += foreground;
        sprite.scale.setScalar(lerp(.37, .65, t));
        sprite.material.opacity = motion ? Math.sin(t * Math.PI) : .86;
      }
    }
  };
}

export function createHomeView(renderer, rig, chapter) {
  const target = document.querySelector('#home-room');
  const scene = new T.Scene();
  const room = createHomeRoom(scene);
  const decorateAction = makeEffects(scene);
  const camera = new T.PerspectiveCamera(46, 1, .1, 65);
  camera.position.set(-.02, 2.73, 7.52);
  const { pivot, eyes, arms, feet, smile } = rig;
  scene.add(pivot);
  const eyeRest = eyes.map((eye) => eye.scale.y);
  const smileRest = smile.scale.clone();
  const smileY = smile.position.y;
  const { state } = chapter;
  let width = 0, height = 0, visit = -1, action = 'idle', time = 0, wake = 0;
  let compact = 0, spacing = 1, foreground = 0, eyeLine = 1.73;
  let pose = rest, startPose = rest;

  return (delta, motion) => {
    const remount = renderer.domElement.parentElement !== target;
    if (remount) target.append(renderer.domElement);
    const w = target.clientWidth, h = target.clientHeight;
    if (!w || !h) return;
    if (remount || w !== width || h !== height) {
      width = w;
      height = h;
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
      renderer.setSize(w, h, false);
      const aspect = w / h;
      compact = clamp((1.22 - aspect) / .76, 0, 1);
      const short = clamp((560 - h) / 240, 0, 1);
      spacing = lerp(1, .65, compact);
      foreground = compact * .72;
      eyeLine = 1.73 - .12 * short;
      room.arrange(spacing);
      camera.aspect = aspect;
      const portraitFov = T.MathUtils.radToDeg(2 * Math.atan(.316 / aspect));
      camera.fov = Math.max(lerp(46, 69, compact), portraitFov) + 10 * short;
      camera.updateProjectionMatrix();
    }

    if (visit !== state.visit) {
      visit = state.visit;
      action = 'idle';
      time = wake = 0;
      pose = startPose = rest;
    }
    if (action !== state.action) {
      action = state.action;
      time = 0;
      startPose = pose;
      wake = state.action !== 'sleep' && motion &&
        (Math.abs(pose.x - rest.x) > .5 || pose.night > .05) ? .72 : 0;
    }
    time += delta;
    const elapsed = Math.max(0, time - wake);
    if (wake && time < wake) {
      pose = blendPose(startPose, rest, ease(time / wake));
    } else {
      const goal = poses[action](elapsed, motion);
      const blend = !motion || wake ? 1 : ease(elapsed / (action === 'jump' ? .08 : .21));
      pose = blendPose(startPose, goal, blend);
    }
    if (duration[action] && elapsed >= duration[action]) chapter.finish();

    const rugPosition = clamp((pose.z + .86) / (rest.z + .86), 0, 1);
    const pan = compact * .66 * (1 - rugPosition);
    camera.position.x = -.02 + pan;
    camera.lookAt(-.18 + pan, eyeLine, .16);
    pivot.position.set(pose.x * spacing, pose.y, pose.z + foreground * rugPosition);
    pivot.rotation.set(pose.pitch, pose.yaw, pose.roll);
    pivot.scale.set(pose.width, pose.height, .90);
    arms[0].rotation.z = pose.leftArm;
    arms[1].rotation.z = pose.rightArm;
    feet[0].rotation.x = pose.leftFoot;
    feet[1].rotation.x = pose.rightFoot;
    eyes.forEach((eye, i) => { eye.scale.y = eyeRest[i] * (1 - pose.blink); });
    const calm = pose.night;
    smile.scale.set(smileRest.x * lerp(action === 'dance' ? 1.08 : 1, .72, calm),
      smileRest.y * lerp(1, .43, calm), smileRest.z);
    smile.position.y = smileY - .36 * (1 - smile.scale.y / smileRest.y);
    room.light(pose.night);
    decorateAction(time < wake ? 'idle' : action, elapsed, motion, spacing, foreground);
    renderer.render(scene, camera);
  };
}
