import * as T from './vendor/three.module.js';
import { branches, gates, route } from './maze.js';

const tile = .88;
const columns = 13;
const rows = 7;
const point = ([x, z]) => [(x - 6) * tile, (z - 3) * tile];
const key = ([x, z]) => x + ':' + z;
const trail = route.map(point);
const colors = [0x9f7bb8, 0xab86c1, 0xb192c8, 0xa17cb5, 0xac91c5];

function stone(color, roughness = .84) {
  return new T.MeshStandardMaterial({ color, roughness });
}

function box(parent, dimensions, material, position) {
  const mesh = new T.Mesh(new T.BoxGeometry(...dimensions), material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function tiles(scene) {
  const path = new Set(route.map(key));
  const other = new Set(branches.map(key));
  const base = stone(0x805d9b);
  const border = stone(0xb794ca);
  box(scene, [12.12, .32, 6.86], base, [0, -.38, 0]);
  box(scene, [11.99, .12, 6.73], border, [0, -.185, 0]);
  box(scene, [11.60, .14, 6.34], stone(0xe2cce8), [0, -.088, 0]);

  const pieces = new T.InstancedMesh(new T.BoxGeometry(.863, 1, .863), stone(0xffffff), columns * rows);
  const dummy = new T.Object3D();
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const tileKey = key([column, row]);
      const [x, z] = point([column, row]);
      const walking = path.has(tileKey), side = other.has(tileKey);
      const blocked = !walking && !side;
      const index = row * columns + column;
      const height = blocked ? .45 + (index % 3) * .027 : .058;
      dummy.position.set(x, height / 2 - .031, z);
      dummy.scale.set(1, height, 1);
      dummy.updateMatrix();
      pieces.setMatrixAt(index, dummy.matrix);
      const color = blocked ? colors[(row * 3 + column * 2) % colors.length] : walking ? 0xf0e4f9 : 0xcdafd9;
      pieces.setColorAt(index, new T.Color(color));
    }
  }
  pieces.receiveShadow = true;
  scene.add(pieces);

  const borderWall = stone(0xbc9dcc);
  box(scene, [11.85, .22, .16], borderWall, [0, .055, -3.18]);
  box(scene, [11.85, .22, .16], borderWall, [0, .055, 3.18]);
  for (const x of [-5.91, 5.91]) {
    const entry = trail[0][1];
    box(scene, [.16, .22, 3.59], borderWall, [x, .055, -1.39]);
    box(scene, [.16, .22, 1.83], borderWall, [x, .055, (entry + .48 + 3.19) / 2]);
  }

  box(scene, [.18, .045, .81], stone(0xa2c7ae), [5.90, -.002, trail.at(-1)[1]]);

  const highlight = new T.InstancedMesh(new T.BoxGeometry(.087, .011, .087),
    new T.MeshBasicMaterial({ color: 0x9e77c1 }), (trail.length - 1) * 5 + 1);
  dummy.scale.setScalar(1);
  for (let i = 0; i < highlight.count; i++) {
    const segment = Math.min(Math.floor(i / 5), trail.length - 2);
    const progress = i === highlight.count - 1 ? 1 : i % 5 / 5;
    dummy.position.set(T.MathUtils.lerp(trail[segment][0], trail[segment + 1][0], progress), .034,
      T.MathUtils.lerp(trail[segment][1], trail[segment + 1][1], progress));
    dummy.updateMatrix();
    highlight.setMatrixAt(i, dummy.matrix);
  }
  scene.add(highlight);
}

function sign(scene, camera, label, fill, dimensions, position) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(5, 5, 246, 118, 25);
  ctx.fill();
  ctx.strokeStyle = '#fff6ff';
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.fillStyle = '#493453';
  ctx.font = 'bold ' + (label.length === 1 ? 88 : 53) + 'px "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 128, 67, 224);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  const mat = new T.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });
  const badge = new T.Mesh(new T.PlaneGeometry(...dimensions), mat);
  badge.position.set(...position);
  badge.quaternion.copy(camera.quaternion);
  badge.renderOrder = 4;
  scene.add(badge);
  return badge;
}

function createGate(scene, camera, item, index) {
  const group = new T.Group();
  const [x, z] = trail[item.at];
  const [nextX, nextZ] = trail[item.at + 1];
  group.position.set((x + nextX) / 2, .028, (z + nextZ) / 2);
  group.rotation.y = nextX === x ? Math.PI / 2 : 0;
  scene.add(group);
  const pastel = stone(item.color, .45);
  const frame = stone(0x8b5f9f);
  for (const z of [-.35, .35]) box(group, [.19, .69, .15], frame, [0, .35, z]);
  box(group, [.20, .15, .85], pastel, [0, .72, 0]);
  const door = new T.Group();
  group.add(door);
  for (const z of [-.22, 0, .22]) box(door, [.115, .57, .15], pastel, [0, .29, z]);
  box(door, [.13, .11, .62], frame, [0, .31, 0]);
  const badge = sign(scene, camera, '١٢٣'[index], '#' + item.color.toString(16).padStart(6, '0'),
    [.61, .46], [group.position.x, .99, group.position.z - .13]);

  return { door, badge, raised: 0 };
}

function makeConfetti(scene) {
  const data = Array.from({ length: 42 }, (_, i) => {
    const angle = i * 2.399963;
    return { x: Math.cos(angle) * (1 + i % 7 * .22), z: Math.sin(angle) * (1 + i % 7 * .20), lift: 2.2 + i % 8 * .28 };
  });
  const shapes = new T.InstancedMesh(new T.BoxGeometry(.083, .083, .152),
    new T.MeshBasicMaterial({ color: 0xffffff }), data.length);
  const palette = [0xe8a5c9, 0xacdbbf, 0xffd67c, 0xd1b6eb];
  data.forEach((_, i) => shapes.setColorAt(i, new T.Color(palette[i % palette.length])));
  shapes.frustumCulled = false;
  scene.add(shapes);
  const dummy = new T.Object3D();
  const [x, z] = trail.at(-1);
  return (t) => {
    shapes.visible = t >= 0 && t < 1.8;
    if (!shapes.visible) return;
    for (const [i, piece] of data.entries()) {
      dummy.position.set(x + piece.x * t, Math.max(.06, .65 + piece.lift * t - 2.75 * t ** 2), z + piece.z * t);
      dummy.scale.setScalar(1 - t / 1.8);
      dummy.rotation.set(i + t * 4, i + t * 6, i + t * 5);
      dummy.updateMatrix();
      shapes.setMatrixAt(i, dummy.matrix);
    }
    shapes.instanceMatrix.needsUpdate = true;
  };
}

export function createMazeView(model, onCharacterClick) {
  const target = document.querySelector('#maze-canvas');
  const mazeFrame = target.parentElement;
  const emergencyFrame = document.querySelector('.emergency-character');
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    target.dataset.fallback = '';
    return () => {};
  }
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  target.append(renderer.domElement);

  const scene = new T.Scene();
  const emergencyColor = new T.Color(0x260710);
  const pastelColor = new T.Color(0xe9d7ef);
  const sceneColor = emergencyColor.clone();
  const hemisphere = new T.HemisphereLight(0xff8991, 0x321321, .82);
  scene.add(hemisphere);
  const sun = new T.DirectionalLight(0xffc7b9, 1.64);
  sun.position.set(-5, 12, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(768, 768);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: .1, far: 35 });
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);
  const alarmA = new T.PointLight(0xff172c, 18, 10, 2);
  const alarmB = new T.PointLight(0xff3d42, 13, 9, 2);
  scene.add(alarmA, alarmB);
  const mapRoot = new T.Group();
  scene.add(mapRoot);
  const camera = new T.OrthographicCamera(-4, 4, 2.5, -2.5, .1, 70);
  camera.up.set(0, 0, -1);
  camera.position.set(0, 17, 0);
  camera.lookAt(0, .35, 0);
  tiles(mapRoot);
  const doors = gates.map((item, index) => createGate(mapRoot, camera, item, index));
  sign(mapRoot, camera, 'البداية', '#ecd7f5', [1.19, .54], [-5.17, .26, 2.88]);
  const exit = sign(mapRoot, camera, 'المخرج', '#d6e9dc', [1.08, .52], [5.79, .61, 2.49]);
  const confetti = makeConfetti(mapRoot);
  const transitionFloor = new T.MeshStandardMaterial({ color: 0x35111b, roughness: .96, transparent: true });
  const emergencyFloor = new T.ShadowMaterial({ opacity: .38 });
  const introFloor = new T.Mesh(new T.PlaneGeometry(24, 18), transitionFloor);
  introFloor.rotation.x = -Math.PI / 2;
  introFloor.position.y = -.025;
  introFloor.receiveShadow = true;
  scene.add(introFloor);
  const pixi = model;
  pixi.scale.setScalar(.257);
  scene.add(pixi);
  const shadow = new T.Mesh(new T.CircleGeometry(.344, 29),
    new T.MeshBasicMaterial({ color: 0x825b9b, transparent: true, opacity: .25, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);
  const skirt = new T.Mesh(new T.RingGeometry(.381, .413, 32),
    new T.MeshBasicMaterial({ color: 0xf6e5ff, transparent: true, opacity: 0, side: T.DoubleSide }));
  skirt.rotation.x = -Math.PI / 2;
  scene.add(skirt);
  const rightArm = pixi.getObjectByName('Right Arm');
  const leftArm = pixi.getObjectByName('Left Arm');
  const leftFoot = pixi.getObjectByName('Left Foot');
  const rightFoot = pixi.getObjectByName('Right Foot');
  const smile = pixi.getObjectByName('Smile');
  const frown = pixi.getObjectByName('Sad mouth');
  const brows = ['Left Brow', 'Right Brow'].map((name) => pixi.getObjectByName(name));
  const browRest = brows.map((brow) => brow?.position.z ?? 0);
  const rightRest = rightArm?.position.clone();
  const leftRest = leftArm?.position.clone();
  const frownRest = frown?.position.z ?? 0;
  const smileRest = smile?.position.z ?? 0;
  const emergencyParts = ['Left Eye', 'Right Eye', 'Left Brow', 'Right Brow',
    'Left Arm', 'Right Arm', 'Smile', 'Sad mouth', 'Surprised mouth'].map((name) => {
    const part = pixi.getObjectByName(T.PropertyBinding.sanitizeNodeName(name));
    return {
      part, position: part.position.clone(), rotation: part.rotation.clone(),
      scale: part.scale.clone(), visible: part.visible
    };
  });
  const [scaredLeftEye, scaredRightEye, scaredLeftBrow, scaredRightBrow,
    scaredLeftArm, scaredRightArm, scaredSmile, scaredFrown, scaredMouth] = emergencyParts;
  const eyes = [scaredLeftEye, scaredRightEye];
  const scaredBrows = [scaredLeftBrow, scaredRightBrow];
  const scaredArms = [scaredLeftArm, scaredRightArm];
  let scared = false;

  function poseEmergency(time, effects) {
    const tremble = effects ? Math.sin(time * 24) * .65 + Math.sin(time * 17) * .35 : 0;
    const breath = effects ? (1 + Math.sin(time * 5)) * .5 : 0;
    pixi.scale.set(.60, .59 + breath * .009, .61);
    pixi.position.set(tremble * .014, .78 + breath * .019, 0);
    pixi.rotation.set(.075, tremble * .018, tremble * .026);
    for (const [i, eye] of eyes.entries()) {
      const side = i === 0 ? -1 : 1;
      eye.part.scale.set(eye.scale.x * 1.10, eye.scale.y * 1.29, eye.scale.z);
      const brow = scaredBrows[i];
      brow.part.position.set(brow.position.x, brow.position.y + .15, brow.position.z + .18);
      brow.part.rotation.z = -side * .49;
      const arm = scaredArms[i];
      arm.part.position.set(arm.position.x - side * .13, arm.position.y + .23, arm.position.z + .43);
      arm.part.rotation.y = -side * .55;
      arm.part.rotation.z = side * (.89 + tremble * .035);
    }
    scaredSmile.part.visible = false;
    scaredFrown.part.visible = false;
    scaredMouth.part.position.z = scaredMouth.position.z + .15;
    scaredMouth.part.scale.set(scaredMouth.scale.x * .88, scaredMouth.scale.y, scaredMouth.scale.z);
    scared = true;
  }

  function restoreEmergencyPose() {
    for (const { part, position, rotation, scale, visible } of emergencyParts) {
      part.position.copy(position);
      part.rotation.copy(rotation);
      part.scale.copy(scale);
      part.visible = visible;
    }
    pixi.rotation.x = pixi.rotation.z = 0;
    scared = false;
  }
  const cameraStart = new T.Vector3(0, 4, 7.8);
  const emergencyCamera = new T.OrthographicCamera(-1, 1, 1, -1, .1, 70);
  emergencyCamera.position.set(0, 2.6, 7.8);
  emergencyCamera.lookAt(0, .83, 0);
  const cameraMap = new T.Vector3(0, 17, 0);
  const cameraTarget = new T.Vector3(0, .35, 0);
  const introUp = new T.Vector3(0, 1, 0);
  const mapUp = new T.Vector3(0, 0, -1);
  const raycaster = new T.Raycaster();
  const pointer = new T.Vector2();
  let width = 0, height = 0, angle = 0, previousBlend = -1;

  function hitCharacter(event, state) {
    if (state.phase !== 'waiting') return false;
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1,
      1 - (event.clientY - bounds.top) / bounds.height * 2);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(pixi, true).length > 0;
  }

  renderer.domElement.addEventListener('pointermove', (event) => {
    renderer.domElement.style.cursor = hitCharacter(event, currentState) ? 'pointer' : '';
  });
  renderer.domElement.addEventListener('pointerleave', () => { renderer.domElement.style.cursor = ''; });
  renderer.domElement.addEventListener('click', (event) => {
    if (hitCharacter(event, currentState)) onCharacterClick();
  });

  let currentState = { phase: 'intro' };
  return (state, delta, effects) => {
    currentState = state;
    const intro = state.phase === 'intro';
    if (!intro && scared) restoreEmergencyPose();
    const frame = intro ? emergencyFrame : mazeFrame;
    const frameChanged = target.parentElement !== frame;
    if (frameChanged) frame.append(target);
    const w = target.clientWidth, h = target.clientHeight;
    if (!w || !h) return;
    const resized = w !== width || h !== height;
    if (resized) {
      width = w;
      height = h;
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
      renderer.setSize(width, height, false);
    }
    if (resized || frameChanged || Math.abs(state.sceneBlend - previousBlend) > .003) {
      previousBlend = state.sceneBlend;
      const aspect = width / height;
      const view = intro ? emergencyCamera : camera;
      const vertical = intro ? Math.max(2.2, 2.25 / aspect) : T.MathUtils.lerp(
        Math.max(4.7, 7.3 / aspect), Math.max(7.45, 13.15 / aspect), state.sceneBlend);
      view.right = vertical * aspect / 2;
      view.left = -view.right;
      view.top = vertical / 2;
      view.bottom = -view.top;
      view.updateProjectionMatrix();
    }
    const blend = state.sceneBlend;
    scene.background = intro ? null : sceneColor.copy(emergencyColor).lerp(pastelColor, blend);
    introFloor.material = intro ? emergencyFloor : transitionFloor;
    transitionFloor.opacity = 1 - blend;
    introFloor.visible = blend < .99;
    hemisphere.color.set(0xff8991).lerp(new T.Color(0xfff2ed), blend);
    hemisphere.groundColor.set(0x321321).lerp(new T.Color(0xc4acdd), blend);
    hemisphere.intensity = T.MathUtils.lerp(.82, 1.3, blend);
    sun.intensity = T.MathUtils.lerp(1.64, 2.08, blend);
    alarmA.intensity = (1 - blend) * (10 + state.alarmGlow * 8);
    alarmB.intensity = (1 - blend) * (7 + state.alarmGlow * 6);
    if (state.phase === 'intro') {
      const beaconAngle = effects ? state.clocks * .62 : 0;
      alarmA.position.set(Math.sin(beaconAngle) * 3.4, 3.4, Math.cos(beaconAngle) * 2.4);
      alarmB.position.set(-alarmA.position.x, 2.8, -alarmA.position.z);
    }
    mapRoot.visible = blend > .015;
    mapRoot.scale.setScalar(Math.max(.001, blend));
    camera.position.lerpVectors(cameraStart, cameraMap, blend);
    camera.up.lerpVectors(introUp, mapUp, blend).normalize();
    camera.lookAt(cameraTarget);
    for (const [i, gate] of doors.entries()) {
      const unlocked = i < state.gate || (i === state.gate && state.phase === 'opening');
      gate.raised = effects ? T.MathUtils.lerp(gate.raised, unlocked ? 1 : 0, 1 - Math.exp(-delta * 8)) : Number(unlocked);
      gate.door.position.y = gate.raised * .76;
      gate.door.visible = gate.raised < .95;
      gate.badge.material.opacity = 1 - gate.raised * .48;
    }
    exit.material.opacity = state.phase === 'escaped' ? 1 : .68;

    const index = Math.min(trail.length - 2, Math.floor(state.position));
    const along = state.position - index;
    const [x0, z0] = trail[index];
    const [x1, z1] = trail[index + 1];
    const routeX = T.MathUtils.lerp(x0, x1, along);
    const routeZ = T.MathUtils.lerp(z0, z1, along);
    const x = T.MathUtils.lerp(0, routeX, blend);
    const z = T.MathUtils.lerp(0, routeZ, blend);
    const walking = state.phase === 'walking';
    const walk = effects && walking ? Math.abs(Math.sin(state.clocks * 15)) * .075 : 0;
    const celebrating = effects && state.phase === 'escaped' ? Math.max(0, 1 - (state.clocks - state.escapedAt) / 2.2) : 0;
    const jump = celebrating * Math.abs(Math.sin((state.clocks - state.escapedAt) * 9)) * .28;
    const facing = walking ? (x1 > x0 ? .32 : z1 > z0 ? 0 : -.20) : 0;
    angle = T.MathUtils.lerp(angle, facing, 1 - Math.exp(-delta * 12));
    const introScale = T.MathUtils.lerp(.40, .257, blend);
    pixi.scale.setScalar(intro ? .62 : introScale);
    pixi.position.set(x, intro ? .81 : .344 + walk + jump, z);
    pixi.rotation.y = angle;
    const worried = state.phase !== 'escaped';
    if (smile) smile.position.z = worried ? smileRest - .14 : smileRest;
    if (frown) frown.position.z = worried ? frownRest + .126 : frownRest;
    for (const [i, brow] of brows.entries()) {
      if (!brow) continue;
      brow.position.z = browRest[i] + (worried ? .09 : 0);
      brow.rotation.z = (i === 0 ? -.24 : .24) * (worried ? 1 : 0);
    }
    shadow.position.set(x, .039, z);
    skirt.position.set(x, .041, z);
    const ringPulse = effects && state.phase === 'waiting' ? (1 + Math.sin(state.clocks * 2.8) * .075) : 1;
    skirt.visible = state.phase === 'waiting' && blend > .95;
    skirt.scale.setScalar(ringPulse);
    skirt.material.opacity = state.phase === 'waiting' ? .64 + Math.sin(state.clocks * 2.8) * .14 : 0;
    if (rightArm && rightRest && leftArm && leftRest) {
      const stride = walking && effects ? Math.sin(state.clocks * 15) * .22 : 0;
      rightArm.rotation.z = celebrating * (1.35 + Math.sin(state.clocks * 15) * .22) + stride;
      leftArm.rotation.z = -stride - celebrating * .48;
      rightArm.position.set(rightRest.x + .18 * celebrating, rightRest.y + .36 * celebrating, rightRest.z + .18 * celebrating);
      leftArm.position.copy(leftRest);
    }
    if (leftFoot) leftFoot.rotation.x = walking ? Math.sin(state.clocks * 15) * .31 : 0;
    if (rightFoot) rightFoot.rotation.x = walking ? -Math.sin(state.clocks * 15) * .31 : 0;
    if (intro) poseEmergency(state.clocks, effects);
    confetti(celebrating > 0 ? state.clocks - state.escapedAt : -1);
    renderer.render(scene, intro ? emergencyCamera : camera);
  };
}

