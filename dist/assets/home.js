import * as T from './vendor/three.module.js';
import { createHomeRoom } from './home-room.js';
import { bedTravelTime, createBedMotion } from './home-bed.js';

const { lerp, clamp } = T.MathUtils;
const ease = (value) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
const rest = {
  x: -.18, y: 1.23, z: .92, yaw: .12, pitch: 0, roll: 0,
  width: .90, height: .90, depth: .90, tuck: 0, leftArm: 0, rightArm: 0, leftFoot: 0, rightFoot: 0, blink: 0, night: 0
};

function idle(time, motion) {
  const breath = motion ? Math.sin(time * 2.6) * .013 : 0;
  const blinkAt = 2.3 + Math.sin(Math.floor(time / 3.75) * 2.4) * .52;
  const blink = motion ? Math.max(0, 1 - Math.abs((time % 3.75 - blinkAt) / .10)) : 0;
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

const poses = { idle, dance, jump };
const duration = { dance: 4.45, jump: 1.18 };

function blendPose(from, to, amount) {
  return Object.fromEntries(Object.entries(to).map(([key, value]) => [key, lerp(from[key], value, amount)]));
}

export function createHomeChapter(world) {
  const chapter = document.querySelector('#home');
  const buttons = [...chapter.querySelectorAll('.home-actions button')];
  const sleepButton = buttons.find((button) => button.dataset.homeAction === 'sleep');
  const sleepLabel = sleepButton.querySelector('span');
  const sleepIcon = sleepButton.querySelector('use');
  const state = { action: 'idle', visit: 0 };
  let active = false;
  let afterWake = 'idle';

  function cancelReveal() { delete world.dataset.homeReveal; }
  world.querySelector('.home-transition').addEventListener('animationend', (event) => {
    if (event.animationName === 'home-reveal' && world.dataset.homeReveal === 'revealing') cancelReveal();
  });

  function select(action) {
    state.action = action;
    chapter.dataset.homeAction = action;
    const busy = action === 'sleep' || action === 'wake';
    const wakeToggle = action === 'asleep' || action === 'wake';
    sleepLabel.textContent = wakeToggle ? 'الاستيقاظ' : 'النوم';
    sleepIcon.setAttribute('href', wakeToggle ? '#icon-sun' : '#icon-moon');
    sleepButton.toggleAttribute('data-awake-toggle', wakeToggle);
    for (const button of buttons) {
      button.disabled = busy;
      button.setAttribute('aria-pressed', String(button.dataset.homeAction === action || button === sleepButton && wakeToggle));
    }
  }

  function request(action) {
    if (!active || state.action === 'sleep' || state.action === 'wake') return;
    if (state.action === 'asleep') {
      afterWake = action === 'sleep' ? 'idle' : action;
      select('wake');
    } else select(action);
  }

  function startDance() { request('dance'); }
  function startSleep() { request('sleep'); }
  function startJump() { request('jump'); }
  const handlers = { dance: startDance, sleep: startSleep, jump: startJump };
  for (const button of buttons) button.addEventListener('click', handlers[button.dataset.homeAction]);

  return {
    state,
    cover() { world.dataset.homeReveal = 'covering'; },
    cancelReveal,
    enter(covered) {
      active = true;
      afterWake = 'idle';
      if (covered) world.dataset.homeReveal = 'covered';
      state.visit += 1;
      select('idle');
    },
    leave() {
      if (!active) return;
      active = false;
      cancelReveal();
      select('idle');
    },
    reveal(motion) {
      if (world.dataset.homeReveal !== 'covered') return;
      if (motion) world.dataset.homeReveal = 'revealing';
      else cancelReveal();
    },
    finish() {
      if (state.action === 'sleep') select('asleep');
      else if (state.action === 'wake') select(afterWake);
      else select('idle');
    }
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
  return (action, time, motion, spacing, foreground, pillow) => {
    for (const [kind, items] of Object.entries(sprites)) {
      for (const [index, sprite] of items.entries()) {
        sprite.visible = kind === action &&
          (kind !== 'jump' || time > .19);
        if (!sprite.visible) continue;
        const t = motion ? (time * .75 + index / items.length) % 1 : .34 + index * .13;
        const side = index % 2 ? -1 : 1;
        if (kind === 'sleep') {
          sprite.position.set(pillow.max.x - .52 + t * .28, pillow.max.y + 1.30 + t * .94, pillow.max.z);
        } else {
          if (kind === 'dance') sprite.position.set(rest.x + side * (1.37 + (index % 3) * .21), 1.68 + t * 1.19, 1.05);
          else sprite.position.set(rest.x + side * (1.20 + t * .65), 1.20 + (index % 3) * .56 + t * .27, 1.18);
          sprite.position.x *= spacing;
          sprite.position.z += foreground;
        }
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
  const { pivot, eyes, gaze, arms, feet, smile } = rig;
  scene.add(pivot);
  const eyeRest = eyes.map((eye) => eye.scale.y);
  const gazeRest = gaze.map((pupil) => pupil.position.clone());
  const armRest = arms.map((arm) => arm.position.clone());
  const smileRest = smile.scale.clone();
  const smileY = smile.position.y;
  const { state } = chapter;
  let width = 0, height = 0, visit = -1, action = 'idle', time = 0, entryAge = 0;
  let compact = 0, spacing = 1, foreground = 0, eyeLine = 1.73;
  let pose = rest, startPose = rest;
  let bed, bedMotion, rug, sleepingPose;
  const bounds = new T.Box3();
  const pointer = new T.Vector2();
  const look = new T.Vector2();
  const aim = new T.Vector2();

  window.addEventListener('pointermove', (event) => {
    if (!width || event.pointerType !== 'mouse' || target.parentElement.hidden) return;
    pointer.set(clamp(event.clientX / width * 2 - 1, -1, 1),
      clamp(1 - event.clientY / height * 2, -1, 1));
  });
  window.addEventListener('pointerout', (event) => {
    if (!event.relatedTarget) pointer.set(0, 0);
  });
  window.addEventListener('blur', () => pointer.set(0, 0));

  function onRug(goal) {
    return { ...goal, x: goal.x * spacing, z: goal.z + foreground };
  }

  function applyBody(goal) {
    pivot.position.set(goal.x, goal.y, goal.z);
    pivot.rotation.set(goal.pitch, goal.yaw, goal.roll);
    pivot.scale.set(goal.width, goal.height, goal.depth);
    arms.forEach((arm, index) => {
      arm.position.copy(armRest[index]);
      arm.position.x *= 1 - goal.tuck * .20;
      arm.position.z += goal.tuck * .13;
    });
    arms[0].rotation.z = goal.leftArm;
    arms[1].rotation.z = goal.rightArm;
    feet[0].rotation.x = goal.leftFoot;
    feet[1].rotation.x = goal.rightFoot;
  }

  function measure(goal) {
    applyBody(goal);
    return bounds.setFromObject(pivot, true);
  }

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
      bed = room.arrange(spacing);
      rug = onRug(rest);
      bedMotion = createBedMotion(rug, bed, measure);
      sleepingPose = bedMotion(1, false);
      camera.aspect = aspect;
      const portraitFov = T.MathUtils.radToDeg(2 * Math.atan(.316 / aspect));
      camera.fov = Math.max(lerp(46, 69, compact), portraitFov) + 10 * short;
      camera.updateProjectionMatrix();
    }

    if (visit !== state.visit) {
      visit = state.visit;
      action = 'idle';
      time = entryAge = 0;
      pose = startPose = rug;
      look.set(0, 0);
      pointer.set(0, 0);
    }
    if (action !== state.action) {
      action = state.action;
      time = 0;
      startPose = pose;
    }
    time += delta;
    entryAge += delta;
    if (action === 'sleep' || action === 'asleep' || action === 'wake') {
      const travel = !motion || action === 'asleep' ? 1 : clamp(time / bedTravelTime, 0, 1);
      const goal = action === 'asleep' ? sleepingPose : bedMotion(travel, action === 'wake');
      pose = action === 'sleep' && motion && time < .20 ? blendPose(startPose, goal, ease(time / .20)) : goal;
      if (action !== 'asleep' && travel === 1) chapter.finish();
    } else {
      const goal = onRug(poses[action](time, motion));
      const blend = !motion ? 1 : ease(time / (action === 'jump' ? .08 : .21));
      pose = blendPose(startPose, goal, blend);
      if (duration[action] && time >= duration[action]) chapter.finish();
    }

    const headingToBed = clamp((pose.x - rug.x) / (bed.mattress.max.x - rug.x), 0, 1);
    const pan = compact * .88 * headingToBed;
    camera.position.x = -.02 + pan;
    camera.lookAt(-.18 + pan, eyeLine, .16);
    const waveTime = clamp((entryAge - .27) / 1.06, 0, 1);
    const wave = motion && action === 'idle' ? Math.sin(Math.PI * waveTime) : 0;
    applyBody(pose);
    if (motion && action === 'idle' && wave < .03) aim.copy(pointer);
    else aim.set(0, 0);
    look.lerp(aim, motion ? 1 - Math.exp(-delta * 8) : 1);
    if (action === 'idle') {
      pivot.rotation.y += look.x * .28 + wave * .09;
      pivot.rotation.x -= look.y * .10;
      arms[1].rotation.z += wave * (1.23 + Math.sin(entryAge * 24) * .22);
    }
    gaze.forEach((pupil, index) => {
      pupil.position.copy(gazeRest[index]);
      if (action === 'idle') {
        pupil.position.x += look.x * .062;
        pupil.position.y += look.y * .072;
      }
    });
    eyes.forEach((eye, i) => { eye.scale.y = eyeRest[i] * (1 - pose.blink); });
    const calm = pose.night;
    smile.scale.set(smileRest.x * lerp(action === 'dance' ? 1.08 : 1, .72, calm),
      smileRest.y * lerp(1, .43, calm), smileRest.z);
    smile.position.y = smileY - .36 * (1 - smile.scale.y / smileRest.y);
    room.light(pose.night);
    const effect = action === 'asleep' ? 'sleep' : action === 'sleep' ? 'idle' : action;
    decorateAction(effect, time, motion, spacing, foreground, bed.pillow);
    renderer.render(scene, camera);
    chapter.reveal(motion);
  };
}
