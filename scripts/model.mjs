import * as THREE from 'three';

const { Vector3, Color, Mesh, Group, MeshPhysicalMaterial, SphereGeometry, MathUtils } = THREE;
const sphere = new SphereGeometry(1, 48, 32);
const form = [1.27, 1.16, .99];
const clay = new MeshPhysicalMaterial({
  color: 0xb07ddc, roughness: .48, metalness: 0, clearcoat: .16,
  clearcoatRoughness: .62, sheen: .37, sheenColor: 0xcf92fc, sheenRoughness: .78
});
const bodyClay = clay.clone();
bodyClay.color.set(0xffffff);
bodyClay.vertexColors = true;
const earClay = clay.clone();
earClay.color.set(0x9e74c1);
earClay.roughness = .57;
const eye = new MeshPhysicalMaterial({
  color: 0x20102e, roughness: .16, clearcoat: .82, clearcoatRoughness: .12
});
const rose = new MeshPhysicalMaterial({ color: 0xf2a3c7, roughness: .61, clearcoat: .08 });
const mouthClay = new MeshPhysicalMaterial({ color: 0x4a184d, roughness: .72 });
const tongueClay = new MeshPhysicalMaterial({ color: 0xf980aa, roughness: .55 });
const sparkle = new MeshPhysicalMaterial({
  color: 0xffddfc, roughness: .28, emissive: 0xe5aafc, emissiveIntensity: .43
});

function oval(name, material, position, scale, parent) {
  const mesh = new Mesh(sphere, material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  parent.add(mesh);
  return mesh;
}

function sculptBody() {
  const geometry = new SphereGeometry(1, 128, 96);
  const points = geometry.attributes.position;
  const palette = [];
  const direction = new Vector3();
  const lilac = new Color(0xc092ec);
  const plum = new Color(0x9468c6);
  const tint = new Color();
  for (let i = 0; i < points.count; i++) {
    direction.fromBufferAttribute(points, i).normalize();
    const radius = 1 - .055 * direction.y;
    points.setXYZ(i, form[0] * direction.x * radius, form[1] * direction.y * radius, form[2] * direction.z * radius);
    const glaze = .57 + .35 * direction.y + .07 * direction.z;
    tint.copy(plum).lerp(lilac, MathUtils.clamp(glaze, 0, 1));
    palette.push(tint.r, tint.g, tint.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(palette, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function addEars(root) {
  const outline = new THREE.Shape();
  outline.moveTo(.43, .77);
  outline.bezierCurveTo(.58, .94, .82, 1.12, .968, 1.204);
  outline.bezierCurveTo(1.014, 1.233, 1.038, 1.210, 1.041, 1.158);
  outline.bezierCurveTo(1.058, .965, 1.075, .74, 1.025, .522);
  outline.bezierCurveTo(.844, .500, .594, .589, .43, .77);
  const geometry = new THREE.ExtrudeGeometry(outline, {
    depth: .17, bevelThickness: .101, bevelSize: .058, bevelSegments: 12, curveSegments: 24
  });
  geometry.translate(0, 0, -.26);
  for (const [side, sign] of [['Left', -1], ['Right', 1]]) {
    const ear = new Mesh(geometry, earClay);
    ear.name = side + ' Ear';
    ear.scale.x = sign;
    ear.position.set(-sign * .14, .012, 0);
    root.add(ear);
  }
}

function surface(x, y) {
  const t = 1 - (x / form[0]) ** 2 - (y / form[1]) ** 2;
  return form[2] * Math.sqrt(Math.max(t, .02)) * (1 - .055 * y / form[1]);
}

export function createPixi() {
  const root = new Group();
  root.name = 'PIXI';
  const body = new Mesh(sculptBody(), bodyClay);
  body.name = 'Round lavender body';
  root.add(body);
  addEars(root);

  for (const [side, x] of [['Left', -.51], ['Right', .51]]) {
    const pivot = new Group();
    pivot.name = side + ' Eye';
    pivot.position.set(x, .12, surface(x, .12) + .012);
    pivot.rotation.y = x * .59;
    root.add(pivot);
    const gaze = new Group();
    gaze.name = side + ' Gaze';
    pivot.add(gaze);
    oval(side + ' Eye gloss', eye, [0, 0, 0], [.238, .294, .117], gaze);
    oval(side + ' Eye glint', sparkle, [-.065, .105, .101], [.056, .064, .024], gaze);
    oval(side + ' Eye bounce', sparkle, [.071, -.066, .103], [.025, .024, .013], gaze);
    const brow = new Group();
    brow.name = side + ' Brow';
    brow.position.set(x, .432, surface(x, .432) - .125);
    const samples = [-.165, -.09, 0, .091, .16].map((offset) =>
      new Vector3(offset, .018 - .84 * offset ** 2, surface(x + offset, .432) - surface(x, .432)));
    brow.add(new Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(samples), 24, .036, 10), mouthClay));
    root.add(brow);

    const cheekX = Math.sign(x) * .76;
    const cheek = oval(side + ' Blush', rose, [cheekX, -.249, surface(cheekX, -.249) + .012], [.176, .104, .028], root);
    cheek.rotation.set(.19, cheekX * .72, -x * .15);
    for (let i = 0; i < 3; i++) {
      const fx = cheekX + (i - 1) * .068;
      const fy = -.25 + Math.sin(i * 1.57) * .027;
      oval(side + ' Freckle ' + i, sparkle, [fx, fy, surface(fx, fy) + .050], [.016, .015, .012], root);
    }
    const arm = new Group();
    arm.name = side + ' Arm';
    arm.position.set(Math.sign(x) * 1.02, -.51, .12);
    root.add(arm);
    const paw = oval(side + ' Paw', clay, [Math.sign(x) * .18, -.14, .055], [.39, .23, .245], arm);
    paw.rotation.z = -Math.sign(x) * .55;
    const foot = oval(side + ' Foot', clay, [Math.sign(x) * .56, -1.015, .29], [.375, .255, .448], root);
    foot.rotation.y = x * .4;
  }

  const smile = new Group();
  smile.name = 'Smile';
  root.add(smile);
  const shape = new THREE.Shape();
  shape.moveTo(-.237, -.232);
  shape.bezierCurveTo(-.12, -.327, .112, -.328, .234, -.23);
  shape.bezierCurveTo(.282, -.192, .198, -.459, 0, -.465);
  shape.bezierCurveTo(-.17, -.465, -.285, -.193, -.237, -.232);
  const lips = new THREE.ExtrudeGeometry(shape, {
    depth: .039, bevelThickness: .016, bevelSize: .018, bevelSegments: 4, curveSegments: 30
  });
  const positions = lips.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    positions.setZ(i, surface(x, y) - .019 + positions.getZ(i));
  }
  lips.computeVertexNormals();
  const lip = new Mesh(lips, mouthClay);
  lip.name = 'Curved mouth';
  smile.add(lip);
  oval('Tongue', tongueClay, [.026, -.408, surface(.026, -.408) + .024], [.104, .043, .026], smile);
  oval('Surprised mouth', mouthClay, [0, -.318, surface(0, -.318) - .065], [.124, .151, .045], root);
  const frownPoints = [-.175, -.09, 0, .09, .175].map((x) => {
    const y = -.29 - 2.45 * x ** 2;
    return new Vector3(x, y, surface(x, y) - .102);
  });
  const frown = new Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(frownPoints), 32, .029, 10), mouthClay);
  frown.name = 'Sad mouth';
  root.add(frown);
  return root;
}

