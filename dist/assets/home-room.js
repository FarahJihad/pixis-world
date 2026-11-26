import * as T from './vendor/three.module.js';

function material(color, roughness = .82) {
  return new T.MeshStandardMaterial({ color, roughness });
}

function rounded(w, h, d, radius) {
  const x = w / 2, y = h / 2;
  const s = new T.Shape();
  s.moveTo(-x + radius, -y);
  s.lineTo(x - radius, -y);
  s.quadraticCurveTo(x, -y, x, -y + radius);
  s.lineTo(x, y - radius);
  s.quadraticCurveTo(x, y, x - radius, y);
  s.lineTo(-x + radius, y);
  s.quadraticCurveTo(-x, y, -x, y - radius);
  s.lineTo(-x, -y + radius);
  s.quadraticCurveTo(-x, -y, -x + radius, -y);
  return new T.ExtrudeGeometry(s, { depth: d, steps: 1, bevelEnabled: false, curveSegments: 7 })
    .translate(0, 0, -d / 2);
}

function mesh(parent, geometry, color, position) {
  const object = new T.Mesh(geometry, typeof color === 'number' ? material(color) : color);
  object.position.set(...position);
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function box(parent, size, color, position, radius = 0) {
  return mesh(parent, radius ? rounded(...size, radius) : new T.BoxGeometry(...size), color, position);
}

function illustratedTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'));
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  return texture;
}

function makeWindow(scene) {
  const x = -2.67, y = 2.52, z = -2.84;
  const arch = (ctx) => {
    ctx.beginPath();
    ctx.moveTo(20, 284);
    ctx.lineTo(20, 123);
    ctx.arc(128, 123, 108, Math.PI, 0);
    ctx.lineTo(236, 284);
    ctx.closePath();
  };
  const windowTexture = (night) => illustratedTexture(256, 304, (ctx) => {
    ctx.save();
    arch(ctx);
    ctx.clip();
    ctx.fillStyle = night ? '#686eab' : '#b8dbe8';
    ctx.fillRect(0, 0, 256, 304);
    ctx.fillStyle = night ? '#fff1c3' : '#fff0a8';
    ctx.beginPath();
    ctx.arc(163, 91, 27, 0, Math.PI * 2);
    ctx.fill();
    if (night) {
      ctx.fillStyle = '#686eab';
      ctx.beginPath();
      ctx.arc(174, 81, 25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f7e5fc';
      for (const [sx, sy] of [[72, 81], [97, 117], [195, 123], [129, 54], [57, 142]]) {
        ctx.fillRect(sx, sy - 4, 2, 10);
        ctx.fillRect(sx - 4, sy, 10, 2);
      }
    }
    for (const [color, height, offset] of [
      [night ? '#515981' : '#9bc1b2', 203, -14],
      [night ? '#646c9c' : '#b4d2ba', 229, 38]
    ]) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, 280);
      ctx.quadraticCurveTo(43 + offset, height - 59, 115 + offset, height);
      ctx.quadraticCurveTo(183 + offset, height + 43, 261, height - 28);
      ctx.lineTo(256, 304);
      ctx.lineTo(0, 304);
      ctx.fill();
    }
    ctx.restore();
    arch(ctx);
    ctx.strokeStyle = '#98779f';
    ctx.lineWidth = 18;
    ctx.stroke();
    ctx.strokeStyle = '#fff2e8';
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(128, 19);
    ctx.lineTo(128, 283);
    ctx.moveTo(24, 159);
    ctx.lineTo(233, 159);
    ctx.stroke();
  });
  const geometry = new T.PlaneGeometry(2.84, 3.04);
  mesh(scene, geometry, new T.MeshBasicMaterial({ map: windowTexture(false), transparent: true }), [x, y, z]);
  const nightSky = new T.MeshBasicMaterial({ map: windowTexture(true), transparent: true, opacity: 0, depthWrite: false });
  mesh(scene, geometry, nightSky, [x, y, z + .008]).renderOrder = 1;
  box(scene, [2.84, .12, .36], 0xf5e3e7, [x, 1.20, -2.71], .05);
  return nightSky;
}

function plant(scene, x, z, scale) {
  const group = new T.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  scene.add(group);
  mesh(group, new T.CylinderGeometry(.32, .23, .42, 18), 0xd59eaa, [0, .21, 0]);
  mesh(group, new T.CylinderGeometry(.34, .34, .09, 18), 0xe7b1bd, [0, .42, 0]);
  mesh(group, new T.CylinderGeometry(.28, .28, .025, 18), 0x82646b, [0, .47, 0]);
  const leaf = new T.SphereGeometry(1, 18, 12);
  for (const [x, y, z, angle, color] of [
    [-.22, .83, .04, .62, 0x89bba7], [.24, .89, .05, -.66, 0xa2cbb6],
    [.02, 1.07, -.08, -.08, 0x94c3aa], [-.29, .66, -.04, .98, 0x78ad99]
  ]) {
    const part = mesh(group, leaf, color, [x, y, z]);
    part.scale.set(.15, .46, .083);
    part.rotation.z = angle;
    part.castShadow = true;
  }
}

function makeBed(scene) {
  const x = 2.93, z = -.96;
  const frame = material(0xa584bb);
  for (const dx of [-1.30, 1.30]) {
    for (const dz of [-.67, .67]) box(scene, [.19, .36, .19], frame, [x + dx, .18, z + dz], .06);
  }
  box(scene, [3.13, .33, 1.73], frame, [x, .46, z], .15).castShadow = true;
  box(scene, [.24, 1.48, 1.85], 0xad8aca, [x + 1.52, .79, z], .12);
  box(scene, [3, .25, 1.60], 0xffede9, [x, .72, z], .12);
  const cover = box(scene, [2.13, .15, 1.64], 0xae91cc, [x - .40, .90, z], .07);
  cover.castShadow = true;
  box(scene, [2.12, .34, .065], 0xbda0d6, [x - .40, .71, z + .80], .06);
  box(scene, [.18, .17, 1.65], 0xe4c9ea, [x + .68, .91, z], .06);
  box(scene, [.70, .20, .94], 0xf9d8e1, [x + 1.05, .92, z - .09], .09).rotation.y = -.06;
  for (const dx of [-1.24, -.84, -.44, -.04, .36]) {
    box(scene, [.025, .012, 1.44], 0xc5a9dc, [x + dx, .982, z]);
  }
}

function decorate(scene) {
  const picture = illustratedTexture(128, 148, (ctx) => {
    ctx.fillStyle = '#fff1e7';
    ctx.fillRect(0, 0, 128, 148);
    ctx.fillStyle = '#dca96a';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = i * Math.PI / 5 - Math.PI / 2;
      const radius = i % 2 ? 16 : 35;
      ctx.lineTo(64 + Math.cos(angle) * radius, 70 + Math.sin(angle) * radius);
    }
    ctx.fill();
    ctx.fillStyle = '#d5a3bd';
    ctx.beginPath();
    ctx.arc(24, 42, 4, 0, Math.PI * 2);
    ctx.arc(100, 105, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  box(scene, [1.11, 1.25, .13], 0xae8ab9, [3.2, 2.91, -2.83], .1);
  mesh(scene, new T.PlaneGeometry(.91, 1.05), new T.MeshBasicMaterial({ map: picture }), [3.2, 2.91, -2.75]);
  box(scene, [1.3, .10, .45], 0xe3b6ba, [.32, 2.35, -2.68], .04);
  for (const [index, color] of [0xd7a2b3, 0xb49aca, 0x9ac0b0, 0xe8c591].entries()) {
    box(scene, [.12, .34 + index * .032, .23], color,
      [-.08 + index * .145, 2.57 + index * .016, -2.63], .025).rotation.z = index === 3 ? -.18 : 0;
  }
  box(scene, [.74, .70, .68], 0xe3b3b9, [4.3, .36, .69], .12);
  box(scene, [.46, .11, .018], 0xf4cbd1, [4.3, .44, 1.039], .03);
  mesh(scene, new T.SphereGeometry(.035, 12, 8), 0xab7c98, [4.3, .45, 1.063]);
  mesh(scene, new T.CylinderGeometry(.027, .037, .41, 12), 0xa583ac, [4.3, .86, .69]);
  const shade = new T.MeshStandardMaterial({ color: 0xf5d29d, emissive: 0xf7ad69, emissiveIntensity: .28 });
  mesh(scene, new T.CylinderGeometry(.13, .28, .32, 24), shade, [4.3, 1.12, .69]);
  return shade;
}

export function createHomeRoom(scene) {
  const day = new T.Color(0xf0e0eb), night = new T.Color(0x8588b1);
  const background = day.clone();
  scene.background = background;
  const ambient = new T.HemisphereLight(0xfff3ea, 0xd5b1cf, 1.31);
  const key = new T.DirectionalLight(0xffe6c8, 2.45);
  key.position.set(-4.3, 6.6, .95);
  key.target.position.set(.2, .35, .85);
  key.castShadow = true;
  key.shadow.mapSize.set(1536, 1536);
  key.shadow.camera.left = key.shadow.camera.bottom = -6.5;
  key.shadow.camera.right = key.shadow.camera.top = 6.5;
  key.shadow.camera.far = 19;
  key.shadow.normalBias = .025;
  key.shadow.bias = -.0002;
  key.shadow.intensity = .68;
  const fill = new T.DirectionalLight(0xd4d6ff, .76);
  fill.position.set(4, 4, -2);
  const lamp = new T.PointLight(0xffc986, 1.1, 5);
  lamp.position.set(4.3, 1.21, .82);
  const daylight = new T.PointLight(0xffdfd1, 7.4, 11);
  daylight.position.set(-2.67, 3.6, -.76);
  scene.add(ambient, key, key.target, fill, lamp, daylight);
  box(scene, [56, .25, 27], 0xdcb3b6, [0, -.125, 10.55]);
  box(scene, [56, 6.30, .22], 0xe9cfe2, [0, 3.15, -2.98]);
  box(scene, [.22, 6.30, 27], 0xe4c4db, [5.8, 3.15, 10.55]);
  box(scene, [56, .18, 27], 0xf1dce5, [0, 6.39, 10.55]);
  box(scene, [56, .98, .075], 0xd6b5d5, [0, .52, -2.84]);
  box(scene, [56, .12, .12], 0xf7e3e8, [0, 1.01, -2.79]);
  box(scene, [56, .16, .25], 0xf7e2e7, [0, 6.17, -2.87]);
  box(scene, [.12, .98, 27], 0xd3afd0, [5.64, .52, 10.55]);
  box(scene, [.15, .12, 27], 0xf7e3e8, [5.61, 1.01, 10.55]);
  box(scene, [.24, .16, 27], 0xf7e2e7, [5.57, 6.17, 10.55]);
  const seam = material(0xcfa5b1);
  for (let i = -12; i <= 5; i++) box(scene, [.020, .008, 27], seam, [i * 1.05, .003, 10.55]);
  const rug = new T.CylinderGeometry(1, 1, .043, 72);
  for (const [radius, y, color] of [[2.32, .022, 0xb78acb], [2.14, .045, 0xcfade2], [1.93, .064, 0xe1c5ec]]) {
    mesh(scene, rug, color, [-.18, y, .92]).scale.set(radius, 1, radius * .63);
  }
  const dot = new T.SphereGeometry(.045, 10, 7);
  for (let i = 0; i < 22; i++) {
    const angle = i / 22 * Math.PI * 2;
    mesh(scene, dot, 0xf5e0ef, [-.18 + Math.cos(angle) * 2.04, .085, .92 + Math.sin(angle) * 1.28]).scale.y = .4;
  }
  const furnishings = new T.Group();
  scene.add(furnishings);
  const sky = makeWindow(furnishings);
  makeBed(furnishings);
  plant(furnishings, -4.08, 1.04, 1.15);
  plant(furnishings, -4.42, -1.58, .67);
  const shade = decorate(furnishings);

  function light(amount) {
    background.copy(day).lerp(night, amount);
    ambient.intensity = T.MathUtils.lerp(1.31, .68, amount);
    key.intensity = T.MathUtils.lerp(2.45, .46, amount);
    fill.intensity = T.MathUtils.lerp(.76, 1.13, amount);
    lamp.intensity = T.MathUtils.lerp(1.1, 5.8, amount);
    daylight.intensity = T.MathUtils.lerp(7.4, .18, amount);
    shade.emissiveIntensity = T.MathUtils.lerp(.28, .97, amount);
    sky.opacity = amount;
  }

  return {
    light,
    arrange(spacing) {
      furnishings.scale.x = spacing;
      lamp.position.x = 4.3 * spacing;
      daylight.position.x = -2.67 * spacing;
    }
  };
}
