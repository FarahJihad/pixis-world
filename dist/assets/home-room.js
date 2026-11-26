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
  const windowTexture = ([top, horizon, disc, sunY, far, near], mood) => illustratedTexture(256, 304, (ctx) => {
    ctx.save();
    arch(ctx);
    ctx.clip();
    const sky = ctx.createLinearGradient(0, 20, 0, 230);
    sky.addColorStop(0, top);
    sky.addColorStop(1, horizon);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 256, 304);
    const glow = ctx.createRadialGradient(163, sunY, 8, 163, sunY, 62);
    glow.addColorStop(0, disc + 'ad');
    glow.addColorStop(1, disc + '00');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 256, 260);
    ctx.fillStyle = disc;
    ctx.beginPath();
    if (mood === 'night') {
      ctx.arc(163, sunY, 26, .32, 4.35);
      ctx.quadraticCurveTo(146, sunY + 20, 188, sunY + 8);
    } else ctx.arc(163, sunY, 26, 0, Math.PI * 2);
    ctx.fill();
    if (mood === 'night') {
      ctx.fillStyle = '#f7e5fc';
      for (const [sx, sy] of [[72, 81], [97, 117], [195, 123], [129, 54], [57, 142]]) {
        ctx.fillRect(sx, sy - 4, 2, 10);
        ctx.fillRect(sx - 4, sy, 10, 2);
      }
    } else {
      ctx.fillStyle = '#ffe7f2b8';
      for (const [cx, cy, width] of [[65, 98, 32], [204, 119, 40], [82, 181, 45]]) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, width, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const [color, height, offset] of [
      [far, 203, -14], [near, 229, 38]
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
    ctx.strokeStyle = '#8760a6';
    ctx.lineWidth = 18;
    ctx.stroke();
    ctx.strokeStyle = '#f8e2fb';
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
  const views = {
    dawn: ['#a09be3', '#ffc3b8', '#fff0c1', 180, '#a88acc', '#c8a0d8'],
    night: ['#282752', '#5a548d', '#fff1d1', 89, '#403766', '#54487c']
  };
  const layers = Object.entries(views).map(([mood, colors], i) => {
    const layer = new T.MeshBasicMaterial({
      map: windowTexture(colors, mood), alphaTest: i === 0 ? .5 : .002,
      transparent: i > 0, depthWrite: i === 0, toneMapped: false
    });
    mesh(scene, geometry, layer, [x, y, z + i * .008]).renderOrder = i;
    return layer;
  });
  box(scene, [2.84, .14, .40], 0xddb8ed, [x, 1.20, -2.71], .05);
  return layers[1];
}

function flowerVase(scene, x, z, scale, pink) {
  const group = new T.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  scene.add(group);
  const profile = [[0, .01], [.19, .01], [.24, .05], [.29, .18], [.30, .30],
    [.27, .40], [.19, .48], [.16, .54], [.19, .55], [.19, .60], [.13, .60],
    [.12, .49], [.12, .39], [0, .38]].map(([r, y]) => new T.Vector2(r, y));
  mesh(group, new T.LatheGeometry(profile, 32), 0xbb91e1, [0, 0, 0]).castShadow = true;
  const stem = new T.QuadraticBezierCurve3(
    new T.Vector3(0, .42, 0), new T.Vector3(-.09, .92, 0), new T.Vector3(.07, 1.22, 0)
  );
  mesh(group, new T.TubeGeometry(stem, 16, .026, 8), 0x6d917d, [0, 0, 0]);
  const sphere = new T.SphereGeometry(1, 20, 14);
  const leaf = mesh(group, sphere, 0x91b7a2, [-.15, .86, .015]);
  leaf.scale.set(.075, .17, .038);
  leaf.rotation.z = .80;
  const petal = material(pink);
  for (let i = 0; i < 5; i++) {
    const angle = Math.PI / 2 + i * Math.PI * 2 / 5;
    const part = mesh(group, sphere, petal,
      [.07 + .17 * Math.cos(angle), 1.24 + .17 * Math.sin(angle), .035]);
    part.scale.set(.159, .122, .079);
    part.rotation.z = angle;
    part.castShadow = true;
  }
  mesh(group, sphere, 0xffd681, [.07, 1.24, .112]).scale.set(.113, .113, .061);
}

function makeBed(scene) {
  const bed = new T.Group();
  scene.add(bed);
  const x = 2.93, z = -.96;
  const frame = material(0x9d71c5);
  for (const dx of [-1.30, 1.30]) {
    for (const dz of [-.67, .67]) box(bed, [.19, .36, .19], frame, [x + dx, .18, z + dz], .06);
  }
  box(bed, [3.13, .33, 1.73], frame, [x, .46, z], .15).castShadow = true;
  const headboard = box(bed, [.24, 1.48, 1.85], 0xb389dd, [x + 1.52, .79, z], .19);
  const mattress = box(bed, [3, .25, 1.60], 0xfce7fa, [x, .72, z], .12);
  const cover = box(bed, [2.13, .15, 1.64], 0xb28ade, [x - .40, .90, z], .07);
  cover.castShadow = true;
  box(bed, [2.12, .34, .065], 0xbda0d6, [x - .40, .71, z + .80], .06);
  const fold = box(bed, [.18, .17, 1.65], 0xe4c9ea, [x + .68, .91, z], .06);
  const pillow = box(bed, [.70, .20, .94], 0xf7bfe3, [x + 1.05, .92, z - .09], .09);
  pillow.rotation.y = -.06;
  const seams = [];
  for (const dx of [-1.24, -.84, -.44, -.04, .36]) {
    seams.push(box(bed, [.025, .012, 1.44], 0xc5a9dc, [x + dx, .982, z]));
  }
  return { bed, mattress, headboard, pillow, bedding: [cover, fold, ...seams] };
}

function decorate(scene) {
  const picture = illustratedTexture(256, 236, (ctx) => {
    ctx.fillStyle = '#f9e6fb';
    ctx.fillRect(0, 0, 256, 236);
    ctx.fillStyle = '#efd4f7';
    ctx.beginPath();
    ctx.ellipse(128, 116, 101, 99, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const [x, y, size, color] of [[71, 114, 21, '#af79de'], [127, 69, 32, '#db77b8'], [186, 101, 25, '#9f6bd4']]) {
      ctx.strokeStyle = '#8054a8';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x, 163, 130, 198);
      ctx.stroke();
      ctx.fillStyle = '#a784c7';
      ctx.beginPath();
      ctx.ellipse(x + 13, y + 51, 16, 6, -.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(angle) * size * .73, y + Math.sin(angle) * size * .73,
          size * .55, size * .46, angle, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fff0c6';
      ctx.beginPath();
      ctx.arc(x, y, size * .32, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  box(scene, [2.22, 2.06, .15], 0x9467b6, [3.02, 2.90, -2.80], .16).castShadow = true;
  box(scene, [2.04, 1.88, .05], 0xdbb3ee, [3.02, 2.90, -2.71], .10);
  mesh(scene, new T.PlaneGeometry(1.87, 1.70), new T.MeshStandardMaterial({
    map: picture, roughness: .95
  }), [3.02, 2.90, -2.68]);
  box(scene, [1.58, .13, .49], 0xb88bd9, [.32, 2.35, -2.63], .05).castShadow = true;
  for (const [index, color] of [0xe2a1d3, 0x9f76c8, 0xc6a4e2, 0xe5bbec].entries()) {
    box(scene, [.12, .34 + index * .032, .23], color,
      [-.08 + index * .145, 2.57 + index * .016, -2.63], .025).rotation.z = index === 3 ? -.18 : 0;
  }
  const cabinet = box(scene, [.74, .70, .68], 0xc697df, [4.3, .36, .69], .12);
  box(scene, [.46, .11, .018], 0xe8c6f1, [4.3, .44, 1.039], .03);
  mesh(scene, new T.SphereGeometry(.035, 12, 8), 0xab7c98, [4.3, .45, 1.063]);
  mesh(scene, new T.CylinderGeometry(.027, .037, .41, 12), 0xa583ac, [4.3, .86, .69]);
  const shade = new T.MeshStandardMaterial({ color: 0xf5d29d, emissive: 0xf7ad69, emissiveIntensity: .28 });
  const lampshade = mesh(scene, new T.CylinderGeometry(.13, .28, .32, 24), shade, [4.3, 1.12, .69]);
  return { shade, cabinet, lampshade };
}

export function createHomeRoom(scene) {
  scene.background = new T.Color(0xe6cff7);
  const ambient = new T.HemisphereLight(0xf4e8ff, 0xb894d5, 1.36);
  const key = new T.DirectionalLight(0xffeddc, 2.15);
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
  const fill = new T.DirectionalLight(0xd4c6ff, .76);
  fill.position.set(4, 4, -2);
  const lamp = new T.PointLight(0xffc986, 1.1, 5);
  lamp.position.set(4.3, 1.21, .82);
  const daylight = new T.PointLight(0xffdfd1, 7.4, 11);
  daylight.position.set(-2.67, 3.6, -.76);
  scene.add(ambient, key, key.target, fill, lamp, daylight);
  box(scene, [56, .25, 27], 0xc6a2db, [0, -.125, 10.55]);
  box(scene, [56, 6.30, .22], 0xd8bcef, [0, 3.15, -2.98]);
  box(scene, [.22, 6.30, 27], 0xcdb0e5, [5.8, 3.15, 10.55]);
  box(scene, [56, .18, 27], 0xe9d0f5, [0, 6.39, 10.55]);
  box(scene, [56, .98, .075], 0xba93d4, [0, .52, -2.84]);
  box(scene, [56, .12, .12], 0xecd2f7, [0, 1.01, -2.79]);
  box(scene, [56, .16, .25], 0xecd2f7, [0, 6.17, -2.87]);
  box(scene, [.12, .98, 27], 0xb78dce, [5.64, .52, 10.55]);
  box(scene, [.15, .12, 27], 0xecd2f7, [5.61, 1.01, 10.55]);
  box(scene, [.24, .16, 27], 0xecd2f7, [5.57, 6.17, 10.55]);
  const panel = material(0xc2a0dc);
  for (let i = -9; i <= 5; i++) box(scene, [.65, .69, .035], panel, [i * .81, .51, -2.794], .10);
  const seam = material(0xb796cf);
  for (let i = -12; i <= 5; i++) box(scene, [.020, .008, 27], seam, [i * 1.05, .003, 10.55]);
  const rug = new T.CylinderGeometry(1, 1, .043, 72);
  for (const [radius, y, color] of [[2.32, .022, 0xa574cc], [2.14, .045, 0xf1bbdf], [1.93, .064, 0xe0baf5]]) {
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
  const { bed, mattress, headboard, pillow, bedding } = makeBed(furnishings);
  flowerVase(furnishings, -4.08, 1.04, 1.13, 0xef9bcd);
  flowerVase(furnishings, -4.42, -1.58, .77, 0xe889bf);
  const { shade, cabinet, lampshade } = decorate(furnishings);

  const presets = {
    dawn: {
      ambient: [0xffe1f6, 1.31], key: [0xffcbb5, 1.96], fill: [0xdad0ff, .75],
      daylight: [0xffbfaa, 10], lamp: .9, shade: .20, shadow: .58, source: [-5.8, 4.45, -.35]
    },
    night: {
      ambient: [0xa59ae8, .83], key: [0xb0c5ff, .61], fill: [0xa39dff, .81],
      daylight: [0xa6afff, 3.2], lamp: 7.4, shade: .95, shadow: .37, source: [-3.7, 5, -1.5]
    }
  };
  const lights = { ambient, key, fill, daylight };
  for (const preset of Object.values(presets)) {
    for (const name of Object.keys(lights)) preset[name][0] = new T.Color(preset[name][0]);
    preset.source = new T.Vector3(...preset.source);
  }
  const { lerp } = T.MathUtils;
  const { dawn, night } = presets;
  function light(amount) {
    for (const [name, light] of Object.entries(lights)) {
      const [dayColor, dayIntensity] = dawn[name];
      const [nightColor, nightIntensity] = night[name];
      light.color.lerpColors(dayColor, nightColor, amount);
      light.intensity = lerp(dayIntensity, nightIntensity, amount);
    }
    key.position.lerpVectors(dawn.source, night.source, amount);
    key.shadow.intensity = lerp(dawn.shadow, night.shadow, amount);
    lamp.intensity = lerp(dawn.lamp, night.lamp, amount);
    shade.emissiveIntensity = lerp(dawn.shade, night.shade, amount);
    sky.opacity = amount;
  }
  light(0);

  return {
    light,
    arrange(spacing) {
      furnishings.scale.x = spacing;
      lamp.position.x = 4.3 * spacing;
      daylight.position.x = -2.67 * spacing;
      furnishings.updateWorldMatrix(true, true);
      const bounds = (object) => new T.Box3().setFromObject(object, true);
      return {
        bed: bounds(bed), mattress: bounds(mattress), headboard: bounds(headboard),
        pillow: bounds(pillow), cabinet: bounds(cabinet).union(bounds(lampshade)), bedding: bedding.map(bounds)
      };
    }
  };
}
