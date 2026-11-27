import * as T from './vendor/three.module.js';

function clay(color, roughness = .78) {
  return new T.MeshStandardMaterial({ color, roughness });
}

function mesh(parent, geometry, material, x, y, z) {
  const item = new T.Mesh(geometry, material);
  item.position.set(x, y, z);
  parent.add(item);
  return item;
}

function box(parent, w, h, d, material, x, y, z) {
  return mesh(parent, new T.BoxGeometry(w, h, d), material, x, y, z);
}

function roundedRectangle(width, height, corner) {
  const shape = new T.Shape();
  const x = -width / 2, y = -height / 2;
  shape.moveTo(x + corner, y);
  shape.lineTo(x + width - corner, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + corner);
  shape.lineTo(x + width, y + height - corner);
  shape.quadraticCurveTo(x + width, y + height, x + width - corner, y + height);
  shape.lineTo(x + corner, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - corner);
  shape.lineTo(x, y + corner);
  shape.quadraticCurveTo(x, y, x + corner, y);
  return shape;
}

function panel(parent, width, height, corner, depth, material, x, y, z) {
  const value = new T.ExtrudeGeometry(roundedRectangle(width, height, corner), {
    depth, bevelEnabled: true, bevelThickness: .024, bevelSize: .023,
    bevelSegments: 3, curveSegments: 12
  });
  return mesh(parent, value, material, x, y, z);
}

function arch(width, height) {
  const shape = new T.Shape();
  const r = width / 2;
  shape.moveTo(-r, 0);
  shape.lineTo(r, 0);
  shape.lineTo(r, height - r);
  shape.absarc(0, height - r, r, 0, Math.PI, false);
  shape.lineTo(-r, 0);
  return shape;
}

function diffuseShadow(parent, width, depth, x, y, z, opacity) {
  const material = new T.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { alpha: { value: opacity } },
    vertexShader: `
      varying vec2 coords;
      void main() { coords = uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }
    `,
    fragmentShader: `
      uniform float alpha;
      varying vec2 coords;
      void main() { vec2 p=(coords-.5)*2.; float d=length(p);
      gl_FragColor=vec4(.21,.127,.23,exp(-d*d*3.3)*(1.-smoothstep(.64,1.,d))*alpha); }
    `
  });
  const shadow = mesh(parent, new T.PlaneGeometry(width, depth), material, x, y, z);
  shadow.rotation.x = -Math.PI / 2;
  return shadow;
}

function windowLight(scene) {
  const back = new T.Group();
  back.position.set(-2.80, .67, -8.24);
  scene.add(back);
  const trim = clay(0xf3ddd2);
  const recess = clay(0xcaa998);
  mesh(back, new T.ShapeGeometry(arch(5.02, 4.96), 44), recess, 0, -.09, 0);
  mesh(back, new T.ShapeGeometry(arch(4.83, 4.78), 44), trim, 0, 0, .055);

  const sky = new T.ShaderMaterial({
    uniforms: { atmosphere: { value: new T.Vector3() } },
    vertexShader: `
      varying vec2 place;
      void main() { place=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }
    `,
    fragmentShader: `
      varying vec2 place;
      uniform vec3 atmosphere;
      float cloud(vec2 p,vec2 c,vec2 s) { return 1.-smoothstep(.72,1.05,length((p-c)/s)); }
      void main() {
        vec3 low = vec3(.97,.91,.81), high = vec3(.72,.82,.86);
        vec3 c = mix(low,high,smoothstep(-.25,4.5,place.y));
        float hills = .67 + .30*cos(place.x*.85+.85)+.26*sin(place.x*.54);
        c=mix(c,vec3(.66,.77,.64),1.-smoothstep(hills-.04,hills+.04, place.y));
        float s=cloud(place,vec2(.95,3.30),vec2(.77,.14))+cloud(place,vec2(.65,3.43),vec2(.42,.13));
        s+=cloud(place,vec2(-1.46,2.48),vec2(.54,.13));
        c=mix(c,vec3(1.,.98,.92),clamp(s,0.,.72));
        float height = smoothstep(0.,4.3,place.y);
        float horizon = smoothstep(hills-.03,hills+.03,place.y);
        vec3 morning = mix(vec3(1.,.94,.75),vec3(.52,.77,.91),height);
        vec3 sunset = mix(vec3(1.,.62,.43),vec3(.56,.38,.68),height);
        vec3 night = mix(vec3(.41,.46,.69),vec3(.13,.17,.35),height);
        sunset = mix(sunset,vec3(1.,.9,.64),cloud(place,vec2(-.9,2.55),vec2(.28)));
        night = mix(night,vec3(.98,.91,.75),cloud(place,vec2(-.92,3.1),vec2(.25)));
        vec2 star = fract((place+vec2(.44,.19))*vec2(2.37,2.91))-.5;
        night += .55*(1.-smoothstep(.024,.073,length(star)))*smoothstep(1.9,3.,place.y);
        c = mix(c,mix(vec3(.62,.77,.61),morning,horizon),atmosphere.x);
        c = mix(c,mix(vec3(.64,.49,.53),sunset,horizon),atmosphere.y);
        c = mix(c,mix(vec3(.27,.32,.45),night,horizon),atmosphere.z);
        gl_FragColor=vec4(c,1.);
      }
    `
  });
  mesh(back, new T.ShapeGeometry(arch(4.42, 4.40), 44), sky, 0, .17, .073);
  box(back, .094, 4.36, .105, trim, 0, 2.31, .16);
  box(back, 4.42, .104, .102, trim, 0, 2.24, .16);
  const sill = panel(back, 5.23, .14, .063, .39, clay(0xd7ae97), 0, .028, .064);
  sill.receiveShadow = true;
  return sky.uniforms.atmosphere.value;
}

function pot(parent, x, y, z, size, color) {
  const p = new T.Group();
  p.position.set(x, y, z);
  p.scale.setScalar(size);
  parent.add(p);
  const ceramic = clay(color, .58);
  mesh(p, new T.CylinderGeometry(.30, .232, .42, 40), ceramic, 0, .22, 0);
  mesh(p, new T.CylinderGeometry(.306, .30, .075, 40), ceramic, 0, .423, 0);
  mesh(p, new T.CircleGeometry(.25, 40), clay(0x8f6f65), 0, .462, 0).rotation.x = -Math.PI / 2;
  const leaf = new T.SphereGeometry(1, 22, 14);
  const palette = [clay(0x7aa391), clay(0x91bba2), clay(0xabc4a2)];
  for (const [i, a] of [-1.6, -.85, -.36, .36, .82, 1.33].entries()) {
    const reach = .57 + .085 * (i % 3);
    const foliage = mesh(p, leaf, palette[i % 3], Math.sin(a) * reach * .46, .63 + Math.cos(a) * .38, (i % 2 - .5) * .21);
    foliage.scale.set(.121, reach * .59, .054);
    foliage.rotation.z = -a * .63;
    foliage.rotation.x = (i % 3 - 1) * .26;
  }
  return p;
}

function supplies(scene) {
  const maple = clay(0xd9b39b);
  const mauve = clay(0xc59bc5);
  const cream = clay(0xf5e8d6);
  const coral = clay(0xdfa69c);
  const green = clay(0x9bb8a3);
  const shelf = new T.Group();
  shelf.position.set(3.56, 2.46, -7.95);
  scene.add(shelf);
  panel(shelf, 3.28, .15, .065, .69, maple, 0, 0, -.36);

  for (const [index, material] of [mauve, cream, green, coral].entries()) {
    const height = .42 + (index % 3) * .14;
    const book = panel(shelf, .17, height, .047, .34, material, -.98 + index * .231, height / 2 + .088, -.03);
    book.rotation.z = index === 3 ? -.18 : .022 * (index - 1);
  }
  pot(shelf, .88, .084, .079, .70, 0xe7b3a6);

  const picture = new T.Group();
  picture.position.set(2.42, 3.87, -8.18);
  picture.rotation.z = -.06;
  scene.add(picture);
  panel(picture, .93, 1.12, .10, .075, maple, 0, 0, 0);
  panel(picture, .77, .94, .083, .012, cream, 0, 0, .104);
  for (const [x, y, material] of [[-.16, .10, mauve], [.14, .12, coral], [-.01, -.15, green]]) {
    mesh(picture, new T.CircleGeometry(.11, 30), material, x, y, .158);
  }

  const desk = new T.Group();
  desk.position.set(3.37, -.02, -4.45);
  desk.rotation.y = -.07;
  scene.add(desk);
  const table = panel(desk, 1.93, 1.03, .18, .14, maple, 0, .87, 0);
  table.rotation.x = -Math.PI / 2;
  for (const x of [-.74, .74]) {
    for (const z of [-.34, .34]) {
      mesh(desk, new T.CylinderGeometry(.072, .053, .89, 22), maple, x, .44, z);
    }
  }
  for (const [index, material] of [mauve, cream, coral].entries()) {
    const paper = panel(desk, .58, .39, .065, .025, material, -.38 + index * .030, 1.055 + index * .038, .045);
    paper.rotation.set(-Math.PI / 2, 0, .10 - index * .18);
  }
  const cup = mesh(desk, new T.CylinderGeometry(.134, .112, .21, 28), green, .49, 1.144, -.16);
  mesh(desk, new T.CircleGeometry(.105, 24), clay(0x87a28f), .49, 1.253, -.16).rotation.x = -Math.PI / 2;
  cup.receiveShadow = true;
  for (const [i, material] of [coral, mauve, maple].entries()) {
    const pencil = mesh(desk, new T.CylinderGeometry(.022, .022, .36 + i * .071, 12), material,
      .43 + i * .06, 1.31 + i * .02, -.16);
    pencil.rotation.z = .19 - i * .18;
  }
  diffuseShadow(scene, 2.80, 1.82, 3.38, -.081, -4.43, .36);

  pot(scene, -4.66, -.07, -2.96, 1.53, 0xdfa79c);
  diffuseShadow(scene, 1.9, 1.34, -4.65, -.081, -2.93, .29);
  pot(scene, 6.39, -.08, -7.38, 1.85, 0xe0b8ae);
  diffuseShadow(scene, 2.2, 1.63, 6.47, -.09, -7.38, .37);
}

function rug(scene) {
  const surface = clay(0xc4a7ce, .98);
  const hem = clay(0xa888b5, .84);
  const top = mesh(scene, new T.CylinderGeometry(3.40, 3.45, .069, 144),
    [hem, surface, hem], 0, -.043, 0);
  top.receiveShadow = true;
  const line = new T.MeshBasicMaterial({ color: 0xeee0ec, transparent: true, opacity: .64 });
  for (const [r, thickness] of [[3.25, .012], [3.08, .007]]) {
    mesh(scene, new T.TorusGeometry(r, thickness, 5, 154), line, 0, -.006, 0).rotation.x = -Math.PI / 2;
  }
  const seam = new T.InstancedMesh(new T.BoxGeometry(.012, .006, .075), line, 112);
  const tick = new T.Object3D();
  for (let i = 0; i < seam.count; i++) {
    const a = i / seam.count * Math.PI * 2;
    tick.position.set(3.171 * Math.sin(a), -.008, 3.171 * Math.cos(a));
    tick.rotation.y = a;
    tick.updateMatrix();
    seam.setMatrixAt(i, tick.matrix);
  }
  scene.add(seam);
  diffuseShadow(scene, 7.72, 7.52, .075, -.085, .02, .40);
}

function sunPatch(scene) {
  const material = new T.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: `
      varying vec2 coords;
      void main() { coords=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }
    `,
    fragmentShader: `
      varying vec2 coords;
      void main() {
        vec2 p = coords-.5;
        float d=length(p*vec2(1.,1.45));
        float light=(1.-smoothstep(.06,.55,d))*.27;
        gl_FragColor=vec4(1.,.884,.73,light);
      }
    `
  });
  const patch = mesh(scene, new T.PlaneGeometry(12, 8), material, -3.65, -.091, -.35);
  patch.rotation.set(-Math.PI / 2, 0, -.44);
}

export function createScenery(scene) {
  const wall = clay(0xf0dcd0);
  scene.background = new T.Color(0xead6cf);
  scene.fog = new T.FogExp2(0xf1ddd0, .024);
  box(scene, 47, 21, .26, wall, 0, 10.36, -8.55);
  box(scene, 45, .15, .13, clay(0xd8b6a5), 0, -.006, -8.33);
  const floor = mesh(scene, new T.PlaneGeometry(100, 100), clay(0xe7cbb6, .94), 0, -.094, 0);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  sunPatch(scene);
  const atmosphere = windowLight(scene);
  supplies(scene);
  rug(scene);
  const baseShadow = diffuseShadow(scene, 3.8, 2.70, .10, .009, -.065, .62);
  const sparkle = new T.MeshBasicMaterial({
    color: 0xffe8aa, transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide
  });
  const glow = mesh(scene, new T.RingGeometry(.95, 1.02, 112), sparkle, 0, .032, 0);
  glow.rotation.x = -Math.PI / 2;
  const wallColors = {
    lavender: new T.Color(0xe3ccf3), blush: new T.Color(0xf5c4d4), mint: new T.Color(0xbde3d4)
  };
  const originalWall = wall.color.clone();
  const skies = {
    morning: new T.Vector3(1, 0, 0), sunset: new T.Vector3(0, 1, 0), night: new T.Vector3(0, 0, 1)
  };
  const originalSky = new T.Vector3();
  return {
    workshop(theme, sky, blend) {
      wall.color.lerp(wallColors[theme] ?? originalWall, blend);
      atmosphere.lerp(skies[sky] ?? originalSky, blend);
    },
    update(ceremony, elevation, characterX) {
      baseShadow.material.uniforms.alpha.value = .63 - Math.min(elevation, 1) * .51;
      baseShadow.scale.setScalar(1 + elevation * .19);
      baseShadow.position.x = .12 + characterX;
      glow.scale.setScalar(1.15 + ceremony * 3.75);
      sparkle.opacity = Math.sin(Math.PI * ceremony) * .44;
    }
  };
}

