import * as T from './vendor/three.module.js';

const { lerp, clamp } = T.MathUtils;
const clear = .035;
export const bedTravelTime = 3.2;

function between(t, start, end) {
  const amount = clamp((t - start) / (end - start), 0, 1);
  return amount * amount * (3 - 2 * amount);
}

export function createBedMotion(rug, bed, measure) {
  const standing = { ...rug, width: .67, height: .74, depth: .70, yaw: 0 };
  const lying = { ...standing, width: .62, height: .77, roll: -1.50, leftArm: 1.12, rightArm: -1.12 };
  const neutral = { x: 0, y: 0, z: 0 };
  const walkingBounds = measure({ ...rug, ...neutral });
  const radius = Math.hypot(Math.max(-walkingBounds.min.x, walkingBounds.max.x),
    Math.max(-walkingBounds.min.z, walkingBounds.max.z)) + .12;
  const lyingBounds = measure({ ...lying, ...neutral });
  const approachX = Math.min(lerp(bed.mattress.min.x, bed.mattress.max.x, .22), bed.cabinet.min.x - radius - clear);
  const approachZ = Math.max(rug.z, bed.bed.max.z + radius + clear);
  const mattressZ = (bed.mattress.min.z + bed.mattress.max.z) / 2;
  const standingX = (bed.mattress.min.x + bed.mattress.max.x) / 2 - .18;
  const sleepingX = (bed.pillow.min.x + bed.pillow.max.x) / 2 - lyingBounds.max.x * .87;
  const cover = Math.max(bed.mattress.max.y, ...bed.bedding.map(({ max }) => max.y));
  const air = Math.max(cover + .20, bed.pillow.max.y + .20, bed.cabinet.max.y + .06);
  const startYaw = Math.atan2(approachX - rug.x, approachZ - rug.z);
  const bedYaw = Math.atan2(standingX - approachX, mattressZ - approachZ);

  return (time, waking) => {
    const progress = waking ? 1 - time : time;
    const turn = between(progress, 0, .11);
    const stepForward = between(progress, .09, .21);
    const walkAcross = between(progress, .17, .40);
    const lift = between(progress, .40, .50);
    const climb = between(progress, .50, .65);
    const land = between(progress, .65, .73);
    const settle = between(progress, .73, 1);
    const stride = Math.sin(progress * 63) * between(progress, .09, .17) * (1 - lift);
    const onBed = progress >= .50;
    const pose = {
      ...rug,
      x: lerp(lerp(rug.x, approachX, walkAcross), lerp(standingX, sleepingX, settle), climb),
      y: 0,
      z: lerp(lerp(rug.z, approachZ, stepForward), mattressZ, climb),
      yaw: lerp(lerp(lerp(rug.yaw, startYaw, turn), bedYaw, between(progress, .32, .48)), 0, climb),
      roll: lying.roll * settle,
      width: lerp(lerp(rug.width, standing.width, lift), lying.width, settle),
      height: lerp(lerp(rug.height, standing.height, lift), lying.height, settle),
      depth: lerp(rug.depth, standing.depth, lift),
      tuck: settle,
      leftArm: stride * .34 + lying.leftArm * settle,
      rightArm: -stride * .34 + lying.rightArm * settle,
      leftFoot: stride * .43,
      rightFoot: -stride * .43,
      blink: .96 * (waking ? 1 - between(time, 0, .14) : between(progress, .81, 1)),
      night: waking ? 1 - between(time, .02, .9) : between(progress, .64, 1)
    };
    if (waking) pose.yaw += Math.PI * between(progress, .04, .14) * (1 - between(progress, .40, .49));
    const bounds = measure(pose);
    if (onBed) {
      const shift = Math.min(0, bed.headboard.min.x - clear - bounds.max.x);
      pose.x += shift;
      const pillowUnderPose = bounds.max.x + shift > bed.pillow.min.x &&
        bounds.min.x + shift < bed.pillow.max.x &&
        bounds.max.z > bed.pillow.min.z && bounds.min.z < bed.pillow.max.z;
      const surface = pillowUnderPose ? Math.max(cover, bed.pillow.max.y) : cover;
      pose.y = lerp(air, surface, land) - bounds.min.y + .003;
    } else {
      const onRug = 1 - between(Math.hypot(pose.x - rug.x, pose.z - rug.z), .35, 1.40);
      pose.y = lerp(.086 * onRug, air, lift) - bounds.min.y + .003;
      pose.y += Math.abs(stride) * .029;
    }
    return pose;
  };
}
