import * as T from './vendor/three.module.js';

function makeGlasses(eyes) {
  const glasses = new T.Group();
  const frame = new T.MeshStandardMaterial({ color: 0x684180, roughness: .34 });
  const ring = new T.TorusGeometry(.278, .033, 12, 44);
  for (const eye of eyes) {
    const lens = new T.Mesh(ring, frame);
    lens.position.set(eye.position.x, eye.position.y + .018, eye.position.z + .21);
    lens.scale.y = 1.15;
    glasses.add(lens);
  }
  const bridge = new T.CatmullRomCurve3([
    new T.Vector3(-.24, .16, eyes[0].position.z + .23),
    new T.Vector3(0, .215, eyes[0].position.z + .32),
    new T.Vector3(.24, .16, eyes[1].position.z + .23)
  ]);
  glasses.add(new T.Mesh(new T.TubeGeometry(bridge, 20, .033, 10), frame));
  return glasses;
}

export function createDesignView(renderer, rig, scene, scenery) {
  const chapter = document.querySelector('#design');
  const target = chapter.querySelector('.design-avatar');
  const visual = target.parentElement;
  const { pivot, eyes, brows, arms, smile, frown } = rig;
  const camera = new T.PerspectiveCamera(36, 1, .05, 110);
  const projected = new T.Vector3();
  scene.add(pivot);
  const glasses = makeGlasses(eyes);
  pivot.add(glasses);
  const paw = arms[1];
  const pawRest = paw.position.clone();
  const browRest = brows.map((brow) => brow.position.z);
  let width, height, landscape, current, age = 0;
  let concern = 0, reach = 0, zoom = 0;

  function place(prop, x, y, z) {
    projected.set(x, y, z).project(camera);
    visual.style.setProperty('--' + prop + '-x', ((1 + projected.x) * 50).toFixed(2) + '%');
    visual.style.setProperty('--' + prop + '-y', ((1 - projected.y) * 50).toFixed(2) + '%');
  }

  return (delta, motion) => {
    if (renderer.domElement.parentElement !== target) {
      target.append(renderer.domElement);
      target.dataset.rendered = '';
      current = undefined;
      width = undefined;
      concern = reach = zoom = 0;
    }
    const w = target.clientWidth, h = target.clientHeight;
    if (!w || !h) return;
    if (width !== w || height !== h) {
      width = w;
      height = h;
      camera.aspect = w / h;
      landscape = w >= 760 && w >= h;
      camera.fov = Math.max(36, T.MathUtils.radToDeg(2 * Math.atan(.25 / camera.aspect)));
      camera.setViewOffset(w, h, w * (landscape ? .197 : .09), h * (landscape ? -.025 : .142), w, h);
      camera.position.set(.15, landscape ? 3.14 : 2.77, landscape ? 8.65 : 9.15);
      camera.lookAt(0, 1.47, 0);
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
      renderer.setSize(w, h, false);
    }
    const step = chapter.dataset.scene;
    if (step !== current) {
      current = step;
      age = 0;
    }
    age += delta;
    const approach = motion ? 1 - Math.exp(-delta * 8) : 1;
    const awkward = ['sip', 'clutter'].includes(step);
    concern = T.MathUtils.lerp(concern, Number(awkward), approach);
    const sip = step === 'sip' ? (motion ? Math.sin(Math.PI * Math.min(age / 1.35, 1)) ** .75 : 1) : 0;
    const holding = ['mug', 'sip', 'phone'].includes(step);
    reach = T.MathUtils.lerp(reach, holding ? .78 + sip * .59 : 0, approach);
    const cheer = step === 'done' && motion ? Math.sin(Math.PI * Math.min(age / .85, 1)) : 0;
    zoom = T.MathUtils.lerp(zoom, Number(chapter.hasAttribute('data-zoomed')), approach);
    const scale = 1 - zoom * (landscape ? .12 : .39);
    const bob = motion ? Math.sin(age * 2.6) * .019 : 0;
    pivot.position.set(-zoom * (landscape ? .57 : .95), 1.345 * scale + bob + cheer * .37, -zoom * .11);
    pivot.scale.setScalar(scale);
    pivot.rotation.set(0, step === 'teacher' || step === 'rule' ? 0 : .10 - sip * .19, concern * .11 - cheer * .09);
    paw.position.set(pawRest.x + reach * .13, pawRest.y + reach * .39, pawRest.z + reach * .47);
    paw.rotation.z = reach * 1.05 + cheer * 1.1;
    arms[0].rotation.z = -cheer * 1.35;
    smile.position.z = -.16 * concern;
    frown.position.z = .12 * concern;
    for (const [index, eye] of eyes.entries()) {
      eye.scale.y = 1 - concern * (index ? .46 : .16);
      brows[index].rotation.z = (index ? .29 : -.29) * concern;
      brows[index].position.z = browRest[index] + .15 * concern;
    }
    glasses.visible = ['teacher', 'rule', 'done'].includes(step);
    const settling = step === 'teacher' && motion ? Math.max(0, 1 - age / .58) : 0;
    glasses.position.y = settling ** 2 * 1.25;
    glasses.rotation.z = settling * -.26;
    camera.updateMatrixWorld();
    place('gift', landscape ? 2.10 : 1.49, .51, .58);
    place('mug', T.MathUtils.lerp(1.39, .64, sip), T.MathUtils.lerp(1.46, 1.59, sip), .99);
    place('held', 1.25, 1.43, .96);
    visual.style.setProperty('--sip-angle', (7 - sip * 38).toFixed(1) + 'deg');
    visual.style.setProperty('--sip-scale', (1 - sip * .23).toFixed(3));
    scenery.update(0, cheer * .37, pivot.position.x);
    renderer.render(scene, camera);
  };
}
