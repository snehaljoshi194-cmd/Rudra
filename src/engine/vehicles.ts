import * as THREE from 'three';
import { CharacterGender, VehicleId } from '../types/game';

export interface BuiltVehicle {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  wheels: THREE.Object3D[];
  thrusters: THREE.Object3D[];
  shadowPlane: THREE.Mesh;
  isHover: boolean;
  hitWidth: number;
  hitHeight: number;
  hitLength: number;
  exhaustOffsets: { x: number; y: number; z: number }[];
  tireHalfTrack: number;
}

function makeWheel(
  radius: number,
  width: number,
  rimColor = 0xd4d4d8,
  caliperColor = 0xdc2626
): THREE.Group {
  const wheel = new THREE.Group();
  const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 20);
  tireGeo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.9,
    metalness: 0.04,
  });
  const tire = new THREE.Mesh(tireGeo, tireMat);
  tire.castShadow = true;
  wheel.add(tire);

  // Subtle metallic rim lip ring
  const lipGeo = new THREE.TorusGeometry(radius * 0.62, Math.max(0.015, radius * 0.045), 6, 18);
  lipGeo.rotateY(Math.PI / 2);
  const rimMat = new THREE.MeshStandardMaterial({
    color: rimColor,
    roughness: 0.2,
    metalness: 0.9,
  });
  const lipOuterL = new THREE.Mesh(lipGeo, rimMat);
  lipOuterL.position.x = -width * 0.48;
  const lipOuterR = new THREE.Mesh(lipGeo, rimMat);
  lipOuterR.position.x = width * 0.48;
  wheel.add(lipOuterL, lipOuterR);

  // Inner alloy drum + 5 machined spokes so spinning rotation is unmistakable
  const rimGeo = new THREE.CylinderGeometry(radius * 0.4, radius * 0.4, width + 0.01, 12);
  rimGeo.rotateZ(Math.PI / 2);
  const rim = new THREE.Mesh(rimGeo, rimMat);
  wheel.add(rim);

  const spokeGeo = new THREE.BoxGeometry(width + 0.025, radius * 1.15, Math.max(0.028, radius * 0.14));
  for (let s = 0; s < 5; s++) {
    const spoke = new THREE.Mesh(spokeGeo, rimMat);
    spoke.rotation.x = (s * Math.PI) / 5;
    wheel.add(spoke);
  }

  // Brake rotor disc + painted brake caliper inside the barrel
  const rotorGeo = new THREE.CylinderGeometry(radius * 0.54, radius * 0.54, Math.max(0.02, width * 0.28), 16);
  rotorGeo.rotateZ(Math.PI / 2);
  const rotor = new THREE.Mesh(
    rotorGeo,
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.85 })
  );
  const caliper = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.42, radius * 0.28, radius * 0.22),
    new THREE.MeshStandardMaterial({ color: caliperColor, roughness: 0.3, metalness: 0.4 })
  );
  caliper.position.set(0, radius * 0.36, radius * 0.22);
  wheel.add(rotor, caliper);

  const hubGeo = new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, width + 0.05, 10);
  hubGeo.rotateZ(Math.PI / 2);
  const hub = new THREE.Mesh(
    hubGeo,
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.85 })
  );
  wheel.add(hub);

  return wheel;
}

function makeExtrudedWedge(
  points: [number, number][],
  width: number,
  bevel = 0.06
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i][0], points[i][1]);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
  });
  // Extrude is in XY extruded along +Z; rotate so profile is YZ (side profile) and width is X
  geo.translate(0, 0, -width / 2);
  geo.rotateY(Math.PI / 2);
  return geo;
}

function addBikeRider(
  body: THREE.Group,
  gender: CharacterGender,
  jacketMat: THREE.Material,
  helmetMat: THREE.Material,
  glassMat: THREE.Material,
  torsoPos: [number, number, number],
  torsoRotX: number,
  helmetPos: [number, number, number],
  visorOffset: [number, number, number],
  gripTarget: [number, number, number] = [0.34, 1.06, -0.46],
  footPegPos: [number, number, number] = [0.22, 0.44, 0.14]
): void {
  const isFemale = gender === 'female';
  const torsoRadius = isFemale ? 0.142 : 0.175;
  const torsoLen = isFemale ? 0.3 : 0.34;
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(torsoRadius, torsoLen, 6, 10),
    jacketMat
  );
  torso.position.set(torsoPos[0], torsoPos[1], torsoPos[2]);
  torso.rotation.x = torsoRotX;
  if (isFemale) {
    torso.scale.set(0.92, 1.0, 0.88);
  }
  torso.castShadow = true;

  // Riding pants & boots gripping the tank / frame
  const pantsMat = new THREE.MeshStandardMaterial({
    color: isFemale ? 0x1e293b : 0x0f172a,
    roughness: 0.8,
  });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.65 });
  const armGeo = new THREE.CapsuleGeometry(isFemale ? 0.045 : 0.055, 0.34, 4, 8);
  const thighGeo = new THREE.CapsuleGeometry(isFemale ? 0.065 : 0.075, 0.28, 4, 8);
  const shinGeo = new THREE.CapsuleGeometry(0.055, 0.26, 4, 8);
  const bootGeo = new THREE.BoxGeometry(0.1, 0.1, 0.2);

  [-1, 1].forEach((side) => {
    const sx = side * gripTarget[0];
    // Arm reaching from shoulder toward handlebar grip
    const arm = new THREE.Mesh(armGeo, jacketMat);
    arm.position.set(
      (side * 0.18 + sx) * 0.5,
      (torsoPos[1] + 0.1 + gripTarget[1]) * 0.5,
      (torsoPos[2] - 0.05 + gripTarget[2]) * 0.5
    );
    arm.lookAt(sx, gripTarget[1], gripTarget[2]);
    arm.rotateX(Math.PI / 2);

    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), bootMat);
    glove.position.set(sx, gripTarget[1], gripTarget[2]);

    // Thigh + knee + lower leg to footpeg
    const thigh = new THREE.Mesh(thighGeo, pantsMat);
    thigh.position.set(side * 0.19, torsoPos[1] - 0.22, torsoPos[2] - 0.04);
    thigh.rotation.x = Math.PI / 2 - 0.35;
    thigh.rotation.z = side * -0.14;

    const shin = new THREE.Mesh(shinGeo, pantsMat);
    shin.position.set(side * footPegPos[0], footPegPos[1] + 0.15, footPegPos[2] - 0.06);
    shin.rotation.x = 0.22;

    const boot = new THREE.Mesh(bootGeo, bootMat);
    boot.position.set(side * footPegPos[0], footPegPos[1], footPegPos[2] - 0.04);

    body.add(arm, glove, thigh, shin, boot);
  });

  // Shoulder & scarf / collar accent so Male & Female riders look distinct
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(isFemale ? 0.12 : 0.14, 0.035, 6, 12),
    new THREE.MeshStandardMaterial({
      color: isFemale ? 0xf43f5e : 0xf59e0b,
      roughness: 0.65,
    })
  );
  collar.rotation.x = Math.PI / 2 + torsoRotX * 0.5;
  collar.position.set(torsoPos[0], torsoPos[1] + 0.18, torsoPos[2] - 0.04);

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(isFemale ? 0.148 : 0.16, 14, 14),
    helmetMat
  );
  helmet.position.set(helmetPos[0], helmetPos[1], helmetPos[2]);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.085, 0.14), glassMat);
  visor.position.set(
    helmetPos[0] + visorOffset[0],
    helmetPos[1] + visorOffset[1],
    helmetPos[2] + visorOffset[2]
  );

  body.add(torso, collar, helmet, visor);

  if (isFemale) {
    // Flowing dark-chestnut ponytail trailing behind the helmet
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x3b1d0e,
      roughness: 0.72,
      metalness: 0.08,
    });
    const pony = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.28, 8), hairMat);
    pony.position.set(helmetPos[0], helmetPos[1] - 0.06, helmetPos[2] + 0.22);
    pony.rotation.x = Math.PI / 2 + 0.35;
    body.add(pony);
  }
}

function addBikeFinish(
  body: THREE.Group,
  darkMat: THREE.Material,
  chromeMat: THREE.Material,
  taillightMat: THREE.Material,
  gripPos: [number, number, number],
  gaugePos: [number, number, number],
  tailPos: [number, number, number],
  includeTwinDials = true
): void {
  // Rubber handlebar grips, brake/clutch levers & stalk mirrors
  [-1, 1].forEach((side) => {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.15, 8), darkMat);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(side * gripPos[0], gripPos[1], gripPos[2]);

    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.015, 0.025), chromeMat);
    lever.position.set(side * (gripPos[0] - 0.03), gripPos[1] - 0.015, gripPos[2] - 0.055);
    lever.rotation.y = side * -0.22;

    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 6), chromeMat);
    stalk.position.set(side * (gripPos[0] - 0.06), gripPos[1] + 0.07, gripPos[2] - 0.02);
    stalk.rotation.z = side * -0.25;

    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.03), chromeMat);
    mirror.position.set(side * (gripPos[0] - 0.01), gripPos[1] + 0.14, gripPos[2] - 0.03);
    body.add(grip, lever, stalk, mirror);
  });

  // Instrument cluster dials
  if (includeTwinDials) {
    [-0.065, 0.065].forEach((gx) => {
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.048, 0.04, 12), chromeMat);
      pod.position.set(gx, gaugePos[1], gaugePos[2]);
      pod.rotation.x = 0.55;
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.042, 12), darkMat);
      face.rotation.x = -Math.PI / 2 + 0.55;
      face.position.set(gx, gaugePos[1] + 0.018, gaugePos[2] + 0.012);
      body.add(pod, face);
    });
  }

  // Rear swingarm, tail lamp & number plate tidy
  [-0.14, 0.14].forEach((sx) => {
    const swing = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.65), darkMat);
    swing.position.set(sx, 0.4, 0.52);
    body.add(swing);
  });
  const tailLamp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.07), taillightMat);
  tailLamp.position.set(tailPos[0], tailPos[1], tailPos[2]);
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.11, 0.02),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 })
  );
  plate.position.set(tailPos[0], tailPos[1] - 0.12, tailPos[2] + 0.03);
  plate.rotation.x = -0.28;
  body.add(tailLamp, plate);
}

function addCarTrimDetails(
  body: THREE.Group,
  halfW: number,
  doorY: number,
  doorZs: number[],
  mirrorY: number,
  mirrorZ: number,
  plateY: number,
  frontPlateZ: number,
  rearPlateZ: number,
  paintMat: THREE.Material,
  darkMat: THREE.Material,
  chromeMat: THREE.Material,
  includeMirrors = true
): void {
  // Chrome door handles + lower rocker trim strips
  doorZs.forEach((dz) => {
    [-1, 1].forEach((side) => {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.045, 0.18), chromeMat);
      handle.position.set(side * (halfW + 0.015), doorY, dz);
      body.add(handle);
    });
  });

  [-1, 1].forEach((side) => {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 1.65), darkMat);
    skirt.position.set(side * (halfW - 0.01), 0.27, 0);
    body.add(skirt);

    if (includeMirrors) {
      const mir = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.12), paintMat);
      mir.position.set(side * (halfW + 0.09), mirrorY, mirrorZ);
      body.add(mir);
    }
  });

  // Himalayan registration plates (front & rear)
  const plateMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.4,
    metalness: 0.1,
  });
  const plateBandMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.5 });
  [frontPlateZ, rearPlateZ].forEach((pz) => {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.11, 0.03), plateMat);
    plate.position.set(0, plateY, pz);
    const blueTag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.11, 0.034), plateBandMat);
    blueTag.position.set(-0.18, plateY, pz);
    body.add(plate, blueTag);
  });
}

function addStickCockpitAndMirrors(
  body: THREE.Group,
  seatY: number,
  cabinZ: number,
  mirrorX: number,
  mirrorY: number,
  mirrorZ: number,
  paintMat: THREE.Material,
  darkMat: THREE.Material,
  chromeMat: THREE.Material,
  knobColor = 0xdc2626,
  gender: CharacterGender = 'male'
): void {
  // Racing bucket seats
  const seatGeo = new THREE.BoxGeometry(0.38, 0.46, 0.36);
  const seatL = new THREE.Mesh(seatGeo, darkMat);
  seatL.position.set(-0.34, seatY + 0.22, cabinZ + 0.16);
  const seatR = new THREE.Mesh(seatGeo, darkMat);
  seatR.position.set(0.34, seatY + 0.22, cabinZ + 0.16);

  // Visible Male / Female Driver seated in RHD seat (x = 0.34)
  const isFemale = gender === 'female';
  const driverJacket = new THREE.MeshStandardMaterial({
    color: isFemale ? 0xbe123c : 0x1d4ed8,
    roughness: 0.65,
  });
  const driverBust = new THREE.Mesh(
    new THREE.CapsuleGeometry(isFemale ? 0.11 : 0.135, 0.2, 6, 8),
    driverJacket
  );
  driverBust.position.set(0.34, seatY + 0.24, cabinZ + 0.04);
  const driverHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.115, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xe2a878, roughness: 0.6 })
  );
  driverHead.position.set(0.34, seatY + 0.46, cabinZ + 0.02);
  const helmetCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.125, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62),
    isFemale ? driverJacket : chromeMat
  );
  helmetCap.position.set(0.34, seatY + 0.48, cabinZ + 0.02);
  body.add(driverBust, driverHead, helmetCap);
  if (isFemale) {
    const hair = new THREE.Mesh(
      new THREE.ConeGeometry(0.055, 0.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x3b1d0e, roughness: 0.75 })
    );
    hair.position.set(0.34, seatY + 0.4, cabinZ + 0.14);
    hair.rotation.x = 0.7;
    body.add(hair);
  }

  // Steering wheel (right-hand drive Indian layout)
  const steeringWheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.025, 8, 16),
    darkMat
  );
  steeringWheel.position.set(0.34, seatY + 0.32, cabinZ - 0.26);
  steeringWheel.rotation.x = 0.35;

  // Center console + REAL Stick-Shift Gear Lever + Chrome Gate + Shift Knob
  const consoleBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.14, 0.65),
    darkMat
  );
  consoleBox.position.set(0, seatY + 0.08, cabinZ);

  const stickShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.022, 0.26, 8),
    chromeMat
  );
  stickShaft.position.set(0, seatY + 0.24, cabinZ - 0.05);
  stickShaft.rotation.x = -0.22;

  const shiftKnob = new THREE.Mesh(
    new THREE.SphereGeometry(0.048, 10, 10),
    new THREE.MeshStandardMaterial({
      color: knobColor,
      roughness: 0.2,
      metalness: 0.7,
    })
  );
  shiftKnob.position.set(0, seatY + 0.36, cabinZ - 0.08);

  // Side-view aerodynamic mirrors
  const mirGeo = new THREE.BoxGeometry(0.18, 0.1, 0.12);
  const mirL = new THREE.Mesh(mirGeo, paintMat);
  mirL.position.set(-mirrorX, mirrorY, mirrorZ);
  const mirR = new THREE.Mesh(mirGeo, paintMat);
  mirR.position.set(mirrorX, mirrorY, mirrorZ);

  body.add(seatL, seatR, steeringWheel, consoleBox, stickShaft, shiftKnob, mirL, mirR);
}

export function buildVehicleMesh(
  id: VehicleId,
  paintHex: string,
  contactShadowTex: THREE.Texture,
  characterGender: CharacterGender = 'male'
): BuiltVehicle {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const wheels: THREE.Object3D[] = [];
  const thrusters: THREE.Object3D[] = [];

  // Shared PBR material palette with strong roughness/metalness contrast
  const paintMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(paintHex),
    roughness: 0.22,
    metalness: 0.45,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
  });
  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.82,
    metalness: 0.12,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.14,
    metalness: 0.95,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.22,
    metalness: 0.88,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.08,
    metalness: 0.15,
    clearcoat: 1.0,
    opacity: 0.52,
    transparent: true,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfef08a,
    emissiveIntensity: 2.0,
    roughness: 0.2,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.8,
    roughness: 0.25,
  });
  const glowCyanMat = new THREE.MeshStandardMaterial({
    color: 0x2dd4bf,
    emissive: 0x14b8a6,
    emissiveIntensity: 2.2,
    roughness: 0.18,
  });

  // Contact shadow grounding plane
  const shadowGeo = new THREE.PlaneGeometry(2.4, 4.2);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: contactShadowTex,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.position.y = 0.02;
  root.add(shadowPlane);

  let isHover = false;
  let hitWidth = 1.65;
  let hitHeight = 1.4;
  let hitLength = 3.2;
  let exhaustOffsets: { x: number; y: number; z: number }[] = [
    { x: -0.42, y: 0.3, z: 1.68 },
    { x: 0.42, y: 0.3, z: 1.68 },
  ];
  let tireHalfTrack = 0.75;

  if (id === 'enfielder_350') {
    hitWidth = 0.95;
    hitHeight = 1.45;
    hitLength = 2.45;
    shadowPlane.scale.set(0.65, 1, 0.75);

    const wFront = makeWheel(0.38, 0.14);
    wFront.position.set(0, 0.38, -0.88);
    const wRear = makeWheel(0.38, 0.16);
    wRear.position.set(0, 0.38, 0.84);
    body.add(wFront, wRear);
    wheels.push(wFront, wRear);

    // Heavy crank single-cylinder thumper engine & cradle frame
    const engine = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.44, 0.68), chromeMat);
    engine.position.set(0, 0.48, 0.02);
    engine.castShadow = true;
    const cylinderFins = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.36), darkTrimMat);
    cylinderFins.position.set(0, 0.66, -0.05);
    body.add(engine, cylinderFins);

    // Classic Bullet 350 teardrop tank with Madras gold pinstripes
    const tankGeo = makeExtrudedWedge(
      [
        [-0.36, 0.0],
        [0.44, 0.0],
        [0.34, 0.29],
        [-0.26, 0.33],
      ],
      0.38,
      0.06
    );
    const tank = new THREE.Mesh(tankGeo, paintMat);
    tank.position.set(0, 0.74, -0.18);
    tank.castShadow = true;
    const emblemL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.44), goldMat);
    emblemL.position.set(-0.22, 0.88, -0.16);
    const emblemR = emblemL.clone();
    emblemR.position.x = 0.22;
    body.add(tank, emblemL, emblemR);

    // Classic Bullet long touring bench seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.74), darkTrimMat);
    seat.position.set(0, 0.78, 0.45);
    seat.castShadow = true;
    body.add(seat);

    // Front/rear mudguards + forks + casquette headlamp with visor brow
    const fenderF = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.16, 12, 1, true, -0.7, 1.4), paintMat);
    fenderF.rotation.z = Math.PI / 2;
    fenderF.position.set(0, 0.42, -0.88);
    const fenderR = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.18, 12, 1, true, 0.1, 1.45), paintMat);
    fenderR.rotation.z = Math.PI / 2;
    fenderR.position.set(0, 0.44, 0.84);
    body.add(fenderF, fenderR);

    const forkGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.82, 8);
    const forkL = new THREE.Mesh(forkGeo, chromeMat);
    forkL.position.set(-0.12, 0.72, -0.68);
    forkL.rotation.x = 0.38;
    const forkR = forkL.clone();
    forkR.position.x = 0.12;
    body.add(forkL, forkR);

    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.78, 8), chromeMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 1.07, -0.48);
    body.add(bar);

    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.16, 14), chromeMat);
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(0, 0.96, -0.7);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.12, 14), headlightMat);
    lens.position.set(0, 0.96, -0.79);
    lens.rotation.y = Math.PI;
    body.add(lamp, lens);

    // Long peashooter chrome exhaust + curved header downpipe + crash bar
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.28, 10), chromeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(0.24, 0.34, 0.52);
    const downpipe = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.52, 8), chromeMat);
    downpipe.position.set(0.22, 0.54, -0.24);
    downpipe.rotation.x = -0.52;
    const crashBar = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.04, 0.04), chromeMat);
    crashBar.position.set(0, 0.52, -0.34);
    body.add(pipe, downpipe, crashBar);

    addBikeFinish(
      body,
      darkTrimMat,
      chromeMat,
      taillightMat,
      [0.34, 1.07, -0.48],
      [0, 1.09, -0.57],
      [0, 0.72, 1.18],
      true
    );

    exhaustOffsets = [{ x: 0.24, y: 0.34, z: 1.15 }];
    tireHalfTrack = 0.14;
    addBikeRider(
      body,
      characterGender,
      darkTrimMat,
      goldMat,
      glassMat,
      [0, 1.1, 0.25],
      0.22,
      [0, 1.46, 0.15],
      [0, 0, -0.11],
      [0.34, 1.07, -0.48],
      [0.21, 0.42, 0.12]
    );
  } else if (id === 're_bullet_classic') {
    hitWidth = 0.98;
    hitHeight = 1.48;
    hitLength = 2.5;
    shadowPlane.scale.set(0.68, 1, 0.78);

    const tanLeatherMat = new THREE.MeshStandardMaterial({
      color: 0x92400e,
      roughness: 0.78,
      metalness: 0.05,
    });

    const wFront = makeWheel(0.39, 0.15, 0xe2e8f0);
    wFront.position.set(0, 0.39, -0.9);
    const wRear = makeWheel(0.39, 0.17, 0xe2e8f0);
    wRear.position.set(0, 0.39, 0.86);
    body.add(wFront, wRear);
    wheels.push(wFront, wRear);

    // Engine + twin rear shock absorbers
    const engine = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.66), darkTrimMat);
    engine.position.set(0, 0.48, 0.0);
    engine.castShadow = true;
    const crankCover = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.22, 0.44), chromeMat);
    crankCover.position.set(0, 0.42, 0.04);
    const shockL = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 8), chromeMat);
    shockL.position.set(-0.2, 0.64, 0.68);
    shockL.rotation.x = -0.38;
    const shockR = shockL.clone();
    shockR.position.x = 0.2;
    body.add(engine, crankCover, shockL, shockR);

    // Classic 350 rounded teardrop tank + rubber knee pads
    const tankGeo = makeExtrudedWedge(
      [
        [-0.38, 0.0],
        [0.44, 0.0],
        [0.34, 0.31],
        [-0.26, 0.35],
      ],
      0.42,
      0.07
    );
    const tank = new THREE.Mesh(tankGeo, paintMat);
    tank.position.set(0, 0.74, -0.2);
    tank.castShadow = true;
    const padL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.26), darkTrimMat);
    padL.position.set(-0.24, 0.88, -0.1);
    const padR = padL.clone();
    padR.position.x = 0.24;
    body.add(tank, padL, padR);

    // Split tan leather spring solo + pillion saddle
    const soloSeat = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.38), tanLeatherMat);
    soloSeat.position.set(0, 0.8, 0.28);
    const pillion = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.34), tanLeatherMat);
    pillion.position.set(0, 0.84, 0.74);
    body.add(soloSeat, pillion);

    // Wide retro rounded mudguards
    const fenderF = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.19, 14, 1, true, -0.85, 1.7), chromeMat);
    fenderF.rotation.z = Math.PI / 2;
    fenderF.position.set(0, 0.42, -0.9);
    const fenderR = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.21, 14, 1, true, 0.05, 1.65), paintMat);
    fenderR.rotation.z = Math.PI / 2;
    fenderR.position.set(0, 0.44, 0.86);
    body.add(fenderF, fenderR);

    // Wide cruiser bars, mirrors, and round chrome headlamp + flyscreen
    const forkGeo = new THREE.CylinderGeometry(0.044, 0.044, 0.84, 8);
    const forkL = new THREE.Mesh(forkGeo, chromeMat);
    forkL.position.set(-0.13, 0.73, -0.7);
    forkL.rotation.x = 0.38;
    const forkR = forkL.clone();
    forkR.position.x = 0.13;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.84, 8), chromeMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 1.09, -0.5);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.16, 14), chromeMat);
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(0, 0.96, -0.72);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.12, 14), headlightMat);
    lens.position.set(0, 0.96, -0.81);
    lens.rotation.y = Math.PI;
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.04), glassMat);
    screen.position.set(0, 1.18, -0.62);
    screen.rotation.x = -0.45;
    body.add(forkL, forkR, bar, lamp, lens, screen);

    // Upswept bottle silencer + header downpipe + Ladakh tan saddlebags
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.22, 10), chromeMat);
    pipe.rotation.x = Math.PI / 2 - 0.08;
    pipe.position.set(0.25, 0.38, 0.5);
    const downpipe = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.52, 8), chromeMat);
    downpipe.position.set(0.23, 0.54, -0.24);
    downpipe.rotation.x = -0.5;
    const bagGeo = new THREE.BoxGeometry(0.18, 0.28, 0.42);
    const bagL = new THREE.Mesh(bagGeo, tanLeatherMat);
    bagL.position.set(-0.29, 0.62, 0.74);
    const bagR = bagL.clone();
    bagR.position.x = 0.29;
    body.add(pipe, downpipe, bagL, bagR);

    addBikeFinish(
      body,
      darkTrimMat,
      chromeMat,
      taillightMat,
      [0.36, 1.09, -0.5],
      [0, 1.1, -0.6],
      [0, 0.76, 1.2],
      true
    );

    exhaustOffsets = [{ x: 0.25, y: 0.42, z: 1.12 }];
    tireHalfTrack = 0.15;
    addBikeRider(
      body,
      characterGender,
      tanLeatherMat,
      paintMat,
      glassMat,
      [0, 1.12, 0.26],
      0.24,
      [0, 1.48, 0.16],
      [0, -0.01, -0.11],
      [0.36, 1.09, -0.5],
      [0.22, 0.44, 0.12]
    );
  } else if (id === 're_gt_650') {
    hitWidth = 0.96;
    hitHeight = 1.38;
    hitLength = 2.48;
    shadowPlane.scale.set(0.68, 1, 0.78);

    const wFront = makeWheel(0.37, 0.15, 0xe2e8f0);
    wFront.position.set(0, 0.37, -0.88);
    const wRear = makeWheel(0.37, 0.18, 0xe2e8f0);
    wRear.position.set(0, 0.37, 0.85);
    body.add(wFront, wRear);
    wheels.push(wFront, wRear);

    // Parallel-twin 650cc air-cooled engine + twin chrome crankcases
    const engine = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.46, 0.64), chromeMat);
    engine.position.set(0, 0.48, -0.02);
    engine.castShadow = true;
    const twinHead = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.38), darkTrimMat);
    twinHead.position.set(0, 0.68, -0.08);
    body.add(engine, twinHead);

    // Sculpted long Café Racer fuel tank
    const tankGeo = makeExtrudedWedge(
      [
        [-0.44, 0.0],
        [0.46, 0.0],
        [0.36, 0.26],
        [-0.36, 0.28],
      ],
      0.42,
      0.06
    );
    const tank = new THREE.Mesh(tankGeo, paintMat);
    tank.position.set(0, 0.76, -0.18);
    tank.castShadow = true;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.82), goldMat);
    stripe.position.set(0, 1.06, -0.18);
    body.add(tank, stripe);

    // Quilted solo café seat + painted bullet tail cowl
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.46), darkTrimMat);
    seat.position.set(0, 0.78, 0.38);
    const tailCowl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.36), paintMat);
    tailCowl.position.set(0, 0.84, 0.76);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.06), taillightMat);
    tl.position.set(0, 0.82, 0.96);
    body.add(seat, tailCowl, tl);

    // Twin upswept chrome megaphones + header downpipes (left & right!)
    [-0.27, 0.27].forEach((px) => {
      const muffler = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.044, 1.18, 10), chromeMat);
      muffler.rotation.x = Math.PI / 2 - 0.14;
      muffler.position.set(px, 0.4, 0.46);
      const header = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.54, 8), chromeMat);
      header.position.set(px * 0.9, 0.54, -0.26);
      header.rotation.x = -0.5;
      body.add(muffler, header);
    });

    // Low clip-on handlebars + bar-end mirrors + round headlamp
    const forkGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.8, 8);
    const forkL = new THREE.Mesh(forkGeo, chromeMat);
    forkL.position.set(-0.13, 0.7, -0.7);
    forkL.rotation.x = 0.35;
    const forkR = forkL.clone();
    forkR.position.x = 0.13;
    const clipOnL = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.28, 8), darkTrimMat);
    clipOnL.rotation.z = Math.PI / 2 - 0.18;
    clipOnL.position.set(-0.24, 0.95, -0.54);
    const clipOnR = clipOnL.clone();
    clipOnR.rotation.z = -Math.PI / 2 + 0.18;
    clipOnR.position.x = 0.24;
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.14, 14), darkTrimMat);
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(0, 0.92, -0.72);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.11, 14), headlightMat);
    lens.position.set(0, 0.92, -0.8);
    lens.rotation.y = Math.PI;
    body.add(forkL, forkR, clipOnL, clipOnR, lamp, lens);

    addBikeFinish(
      body,
      darkTrimMat,
      chromeMat,
      taillightMat,
      [0.33, 0.93, -0.54],
      [0, 1.02, -0.6],
      [0, 0.8, 1.02],
      true
    );

    exhaustOffsets = [
      { x: -0.27, y: 0.48, z: 1.05 },
      { x: 0.27, y: 0.48, z: 1.05 },
    ];
    tireHalfTrack = 0.15;
    addBikeRider(
      body,
      characterGender,
      darkTrimMat,
      chromeMat,
      glassMat,
      [0, 1.06, 0.16],
      0.68,
      [0, 1.32, -0.05],
      [0, -0.01, -0.12],
      [0.33, 0.93, -0.54],
      [0.21, 0.43, 0.24]
    );
  } else if (id === 'ninja_h2r') {
    hitWidth = 0.96;
    hitHeight = 1.32;
    hitLength = 2.52;
    shadowPlane.scale.set(0.68, 1, 0.8);

    const kawaGreenMat = new THREE.MeshStandardMaterial({
      color: 0x84cc16,
      roughness: 0.25,
      metalness: 0.45,
      emissive: 0x365314,
      emissiveIntensity: 0.35,
    });
    const carbonMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.28,
      metalness: 0.55,
      clearcoat: 0.9,
    });

    // Wide track slicks with lime-green racing rims
    const wFront = makeWheel(0.36, 0.18, 0x84cc16);
    wFront.position.set(0, 0.36, -0.9);
    const wRear = makeWheel(0.37, 0.26, 0x84cc16);
    wRear.position.set(0, 0.37, 0.86);
    body.add(wFront, wRear);
    wheels.push(wFront, wRear);

    // Supercharged engine + exposed Kawasaki lime-green tubular trellis frame
    const engine = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.68), darkTrimMat);
    engine.position.set(0, 0.48, -0.04);
    engine.castShadow = true;
    const supercharger = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.16, 12), chromeMat);
    supercharger.rotation.z = Math.PI / 2;
    supercharger.position.set(-0.26, 0.56, 0.06);
    body.add(engine, supercharger);

    [-0.24, 0.24].forEach((tx) => {
      const spar1 = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, 0.92), kawaGreenMat);
      spar1.position.set(tx, 0.72, -0.08);
      spar1.rotation.x = 0.25;
      const spar2 = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, 0.65), kawaGreenMat);
      spar2.position.set(tx, 0.64, 0.34);
      spar2.rotation.x = -0.35;
      body.add(spar1, spar2);
    });

    // Razor angular Ninja H2R nose fairing, tank & tail section
    const fairingGeo = makeExtrudedWedge(
      [
        [-0.58, 0.0],
        [0.42, 0.0],
        [0.34, 0.54],
        [-0.2, 0.58],
        [-0.64, 0.2],
      ],
      0.5,
      0.04
    );
    const fairing = new THREE.Mesh(fairingGeo, paintMat);
    fairing.position.set(0, 0.58, -0.34);
    fairing.castShadow = true;

    const bubbleScreen = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.36), glassMat);
    bubbleScreen.position.set(0, 1.12, -0.68);
    bubbleScreen.rotation.x = 0.72;

    // 4 Carbon-fiber aerodynamic downforce winglets (upper & mid)
    [-0.36, 0.36].forEach((wx) => {
      const upperWing = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.18), carbonMat);
      upperWing.position.set(wx, 1.04, -0.64);
      upperWing.rotation.z = wx < 0 ? 0.18 : -0.18;
      const midWing = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.22), kawaGreenMat);
      midWing.position.set(wx, 0.74, -0.48);
      midWing.rotation.z = wx < 0 ? 0.12 : -0.12;
      body.add(upperWing, midWing);
    });

    // Ram-air glowing intake + split LED fang nose
    const ramAir = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.12), glowCyanMat);
    ramAir.position.set(0, 0.86, -0.96);
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.08), headlightMat);
    hlL.position.set(-0.18, 0.76, -0.94);
    const hlR = hlL.clone();
    hlR.position.x = 0.18;

    // Upswept titanium exhaust megaphone + raised tail section
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.045, 0.92, 12), chromeMat);
    exhaust.rotation.x = Math.PI / 2 - 0.34;
    exhaust.position.set(0.26, 0.52, 0.56);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.76), paintMat);
    tail.position.set(0, 0.92, 0.64);
    tail.rotation.x = 0.22;
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.06), taillightMat);
    tl.position.set(0, 1.0, 1.02);

    body.add(fairing, bubbleScreen, ramAir, hlL, hlR, exhaust, tail, tl);

    // Digital TFT race dash + clip-on grips + rear plate tidy
    const tftDash = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.04), glowCyanMat);
    tftDash.position.set(0, 1.02, -0.62);
    tftDash.rotation.x = -0.55;
    body.add(tftDash);

    addBikeFinish(
      body,
      carbonMat,
      chromeMat,
      taillightMat,
      [0.32, 0.94, -0.52],
      [0, 1.02, -0.62],
      [0, 0.96, 1.04],
      false
    );

    exhaustOffsets = [{ x: 0.26, y: 0.68, z: 1.04 }];
    tireHalfTrack = 0.18;
    addBikeRider(
      body,
      characterGender,
      carbonMat,
      kawaGreenMat,
      glassMat,
      [0, 1.02, 0.12],
      0.95,
      [0, 1.18, -0.2],
      [0, -0.02, -0.11],
      [0.32, 0.94, -0.52],
      [0.22, 0.44, 0.26]
    );
  } else if (id === 'ladakh_suv') {
    hitWidth = 1.75;
    hitHeight = 1.65;
    hitLength = 3.5;

    const wheelCoords: [number, number][] = [
      [-0.82, -1.05],
      [0.82, -1.05],
      [-0.82, 1.05],
      [0.82, 1.05],
    ];
    wheelCoords.forEach(([x, z]) => {
      const w = makeWheel(0.4, 0.26);
      w.position.set(x, 0.4, z);
      body.add(w);
      wheels.push(w);
    });

    // Lower body chassis + wheel arch flares + side steps
    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.62, 3.35), paintMat);
    lower.position.set(0, 0.68, 0);
    lower.castShadow = true;
    const flareGeo = new THREE.BoxGeometry(1.76, 0.22, 0.72);
    const fF = new THREE.Mesh(flareGeo, darkTrimMat);
    fF.position.set(0, 0.56, -1.05);
    const fR = new THREE.Mesh(flareGeo, darkTrimMat);
    fR.position.set(0, 0.56, 1.05);
    [-0.86, 0.86].forEach((sx) => {
      const step = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 1.38), chromeMat);
      step.position.set(sx, 0.34, 0);
      body.add(step);
    });
    body.add(lower, fF, fR);

    // Upper cabin + distinct A/B/C pillars
    const cabinGeo = makeExtrudedWedge(
      [
        [-0.9, 0],
        [1.4, 0],
        [1.35, 0.6],
        [-0.45, 0.6],
      ],
      1.44,
      0.05
    );
    const cabin = new THREE.Mesh(cabinGeo, paintMat);
    cabin.position.set(0, 0.98, 0.15);
    cabin.castShadow = true;
    body.add(cabin);

    // Tinted windshield, recessed side windows, wipers & rear glass
    const wind = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.46, 0.08), glassMat);
    wind.position.set(0, 1.24, -0.58);
    wind.rotation.x = -0.52;
    const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.4, 1.55), glassMat);
    rearGlass.position.set(0, 1.26, 0.58);
    [-0.25, 0.48, 1.22].forEach((pz) => {
      [-0.73, 0.73].forEach((px) => {
        const pil = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.46, 0.09), darkTrimMat);
        pil.position.set(px, 1.26, pz);
        body.add(pil);
      });
    });
    body.add(wind, rearGlass);

    // Roof expedition rack + amber beacons + jerrycan + spare tire
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.08, 1.6), darkTrimMat);
    rack.position.set(0, 1.66, 0.5);
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.22, 0.85), goldMat);
    cargo.position.set(0, 1.78, 0.65);
    const spare = makeWheel(0.34, 0.2);
    spare.rotation.y = Math.PI / 2;
    spare.position.set(0, 0.85, 1.74);
    [-0.48, 0.48].forEach((bx) => {
      const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.1), goldMat);
      beacon.position.set(bx, 1.64, -0.32);
      body.add(beacon);
    });
    body.add(rack, cargo, spare);

    // Slatted radiator grille, bull bar, fog lamps, headlights, taillights & twin chrome exhausts
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.28, 0.06), darkTrimMat);
    grille.position.set(0, 0.74, -1.68);
    for (let g = -1; g <= 1; g++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.035, 0.07), chromeMat);
      slat.position.set(0, 0.74 + g * 0.08, -1.68);
      body.add(slat);
    }
    const bullBar = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.22, 0.16), chromeMat);
    bullBar.position.set(0, 0.52, -1.72);
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.08), headlightMat);
    hlL.position.set(-0.56, 0.74, -1.68);
    const hlR = hlL.clone();
    hlR.position.x = 0.56;
    const fogL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 10), headlightMat);
    fogL.rotation.x = Math.PI / 2;
    fogL.position.set(-0.46, 0.44, -1.7);
    const fogR = fogL.clone();
    fogR.position.x = 0.46;
    const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.08), taillightMat);
    tlL.position.set(-0.62, 0.76, 1.68);
    const tlR = tlL.clone();
    tlR.position.x = 0.62;
    [-0.44, 0.44].forEach((ex) => {
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.22, 10), chromeMat);
      tip.rotation.x = Math.PI / 2;
      tip.position.set(ex, 0.3, 1.68);
      body.add(tip);
    });
    body.add(grille, bullBar, hlL, hlR, fogL, fogR, tlL, tlR);
    exhaustOffsets = [
      { x: -0.44, y: 0.3, z: 1.78 },
      { x: 0.44, y: 0.3, z: 1.78 },
    ];
    addCarTrimDetails(body, 0.81, 0.82, [-0.15, 0.58], 1.06, -0.42, 0.48, -1.74, 1.7, paintMat, darkTrimMat, chromeMat, true);
  } else if (id === 'mountain_buggy') {
    hitWidth = 1.75;
    hitHeight = 1.4;
    hitLength = 3.1;

    const coords: [number, number][] = [
      [-0.86, -1.02],
      [0.86, -1.02],
      [-0.88, 1.02],
      [0.88, 1.02],
    ];
    coords.forEach(([x, z], i) => {
      const w = makeWheel(i >= 2 ? 0.46 : 0.4, 0.3, 0xf59e0b);
      w.position.set(x, i >= 2 ? 0.46 : 0.4, z);
      body.add(w);
      wheels.push(w);
    });

    // Tapered dune chassis + suspension A-arms & rear gold coilovers
    const hullGeo = makeExtrudedWedge(
      [
        [-1.4, 0],
        [1.35, 0],
        [1.2, 0.42],
        [-1.3, 0.26],
      ],
      1.05,
      0.06
    );
    const hull = new THREE.Mesh(hullGeo, paintMat);
    hull.position.set(0, 0.36, 0);
    hull.castShadow = true;
    body.add(hull);

    [-1, 1].forEach((side) => {
      const armF = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.14), darkTrimMat);
      armF.position.set(side * 0.58, 0.42, -1.02);
      const coilR = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.48, 8), goldMat);
      coilR.position.set(side * 0.62, 0.68, 0.94);
      coilR.rotation.z = side * 0.35;
      const nerf = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 1.35), chromeMat);
      nerf.position.set(side * 0.66, 0.38, 0.0);
      body.add(armF, coilR, nerf);
    });

    // Open-cockpit buggy bucket seat, steering wheel & Male/Female driver!
    const isFemale = characterGender === 'female';
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.48, 0.36), darkTrimMat);
    seat.position.set(0, 0.78, 0.25);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 14), darkTrimMat);
    wheel.position.set(0, 0.88, -0.22);
    wheel.rotation.x = 0.35;
    const driverSuit = new THREE.MeshStandardMaterial({
      color: isFemale ? 0xbe123c : 0x0284c7,
      roughness: 0.6,
    });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(isFemale ? 0.12 : 0.14, 0.24, 6, 8), driverSuit);
    torso.position.set(0, 0.88, 0.12);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), paintMat);
    helmet.position.set(0, 1.15, 0.1);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.12), glassMat);
    visor.position.set(0, 1.15, 0.0);
    body.add(seat, wheel, torso, helmet, visor);
    if (isFemale) {
      const pony = new THREE.Mesh(
        new THREE.ConeGeometry(0.055, 0.22, 8),
        new THREE.MeshStandardMaterial({ color: 0x3b1d0e, roughness: 0.75 })
      );
      pony.position.set(0, 1.1, 0.28);
      pony.rotation.x = Math.PI / 2 + 0.35;
      body.add(pony);
    }

    // Tubular roll cage
    const cageMat = darkTrimMat;
    const arch1 = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.045, 8, 16, Math.PI), cageMat);
    arch1.position.set(0, 0.8, -0.15);
    arch1.rotation.y = Math.PI / 2;
    const arch2 = arch1.clone();
    arch2.position.z = 0.65;
    const roofRail = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.07, 1.15), paintMat);
    roofRail.position.set(0, 1.34, 0.25);
    body.add(arch1, arch2, roofRail);

    // Dual roof spotlights, front headlights, rear turbo engine & twin exhausts
    const lightBar = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.14, 0.14), chromeMat);
    lightBar.position.set(0, 1.42, -0.22);
    const spotL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 10), headlightMat);
    spotL.rotation.x = Math.PI / 2;
    spotL.position.set(-0.22, 1.42, -0.3);
    const spotR = spotL.clone();
    spotR.position.x = 0.22;
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.08), headlightMat);
    hlL.position.set(-0.36, 0.54, -1.36);
    const hlR = hlL.clone();
    hlR.position.x = 0.36;
    const engine = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.38, 0.65), chromeMat);
    engine.position.set(0, 0.72, 1.0);
    [-0.26, 0.26].forEach((ex) => {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.36, 10), chromeMat);
      pipe.rotation.x = Math.PI / 2 - 0.25;
      pipe.position.set(ex, 0.76, 1.34);
      body.add(pipe);
    });
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.08, 0.06), taillightMat);
    tl.position.set(0, 0.56, 1.38);
    body.add(lightBar, spotL, spotR, hlL, hlR, engine, tl);
    exhaustOffsets = [
      { x: -0.26, y: 0.8, z: 1.52 },
      { x: 0.26, y: 0.8, z: 1.52 },
    ];
    tireHalfTrack = 0.86;
  } else if (id === 'himalayan_truck') {
    hitWidth = 1.95;
    hitHeight = 2.05;
    hitLength = 3.9;

    const coords: [number, number][] = [
      [-0.88, -1.25],
      [0.88, -1.25],
      [-0.88, 0.75],
      [0.88, 0.75],
      [-0.88, 1.45],
      [0.88, 1.45],
    ];
    coords.forEach(([x, z]) => {
      const w = makeWheel(0.4, 0.26, 0xfbbf24);
      w.position.set(x, 0.4, z);
      body.add(w);
      wheels.push(w);
    });

    // Ornate Indian highway cab + wing mirrors + doors
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.78, 1.18, 1.35), paintMat);
    cab.position.set(0, 1.05, -1.1);
    cab.castShadow = true;
    const crown = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.28, 0.9), goldMat);
    crown.position.set(0, 1.76, -1.05);
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.46, 0.08), glassMat);
    windshield.position.set(0, 1.28, -1.78);
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.45, 0.1), chromeMat);
    grille.position.set(0, 0.82, -1.78);
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.2, 0.18), goldMat);
    bumper.position.set(0, 0.46, -1.82);

    // Twin vertical chrome exhaust stacks behind the cab + large truck wing mirrors
    [-0.94, 0.94].forEach((sx) => {
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 1.42, 10), chromeMat);
      stack.position.set(sx, 1.52, -0.34);
      const mirArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.04), chromeMat);
      mirArm.position.set(sx * 1.02, 1.34, -1.48);
      const mirGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.14), darkTrimMat);
      mirGlass.position.set(sx * 1.1, 1.3, -1.48);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.16), chromeMat);
      handle.position.set(sx * 0.96, 0.94, -1.15);
      body.add(stack, mirArm, mirGlass, handle);
    });
    body.add(cab, crown, windshield, grille, bumper);

    // Decorated wooden cargo bed + rear highway taillights & mudflaps
    const bed = new THREE.Mesh(
      new THREE.BoxGeometry(1.86, 0.95, 2.2),
      new THREE.MeshStandardMaterial({
        color: 0x7c2d12,
        roughness: 0.78,
        metalness: 0.08,
      })
    );
    bed.position.set(0, 1.05, 0.78);
    bed.castShadow = true;
    const trimBand = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.18, 2.22), goldMat);
    trimBand.position.set(0, 1.32, 0.78);
    const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.2, 0.12), goldMat);
    rearBumper.position.set(0, 0.48, 1.9);
    const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.08), taillightMat);
    tlL.position.set(-0.68, 0.56, 1.92);
    const tlR = tlL.clone();
    tlR.position.x = 0.68;
    const flapL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.04), darkTrimMat);
    flapL.position.set(-0.74, 0.26, 1.88);
    const flapR = flapL.clone();
    flapR.position.x = 0.74;
    body.add(bed, trimBand, rearBumper, tlL, tlR, flapL, flapR);

    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.08), headlightMat);
    hlL.position.set(-0.68, 0.72, -1.8);
    const hlR = hlL.clone();
    hlR.position.x = 0.68;
    body.add(hlL, hlR);
    exhaustOffsets = [
      { x: -0.94, y: 2.24, z: -0.34 },
      { x: 0.94, y: 2.24, z: -0.34 },
    ];
    tireHalfTrack = 0.88;
  } else if (id === 'yak_snowmobile') {
    hitWidth = 1.55;
    hitHeight = 1.35;
    hitLength = 3.1;

    // Front twin snow skis
    const skiGeo = new THREE.BoxGeometry(0.26, 0.08, 1.25);
    const skiL = new THREE.Mesh(skiGeo, chromeMat);
    skiL.position.set(-0.66, 0.1, -1.05);
    const skiR = skiL.clone();
    skiR.position.x = 0.66;
    body.add(skiL, skiR);

    // Rear caterpillar track assembly
    const track = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.38, 1.55), darkTrimMat);
    track.position.set(0, 0.24, 0.75);
    body.add(track);
    for (let i = 0; i < 3; i++) {
      const roller = makeWheel(0.18, 0.82, 0x38bdf8);
      roller.position.set(0, 0.22, 0.25 + i * 0.5);
      body.add(roller);
      wheels.push(roller);
    }

    // Aerodynamic snowmobile cowling
    const cowlGeo = makeExtrudedWedge(
      [
        [-1.35, 0],
        [1.15, 0],
        [0.9, 0.52],
        [-0.25, 0.62],
        [-1.3, 0.22],
      ],
      0.92,
      0.06
    );
    const cowl = new THREE.Mesh(cowlGeo, paintMat);
    cowl.position.set(0, 0.42, 0);
    cowl.castShadow = true;
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.35, 0.65), glassMat);
    canopy.position.set(0, 1.02, -0.35);
    canopy.rotation.x = -0.48;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.88), darkTrimMat);
    seat.position.set(0, 0.88, 0.55);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.14, 0.1), headlightMat);
    lamp.position.set(0, 0.72, -1.16);
    body.add(cowl, canopy, seat, lamp);
    exhaustOffsets = [{ x: 0.22, y: 0.38, z: 1.42 }];
    tireHalfTrack = 0.66;
    addBikeRider(
      body,
      characterGender,
      darkTrimMat,
      paintMat,
      glassMat,
      [0, 1.18, 0.42],
      0.32,
      [0, 1.54, 0.28],
      [0, 0, -0.11]
    );
  } else if (id === 'pangong_glider') {
    isHover = true;
    hitWidth = 1.85;
    hitHeight = 1.25;
    hitLength = 3.3;

    // Sleek central hull
    const hullGeo = makeExtrudedWedge(
      [
        [-1.55, 0.08],
        [1.45, 0.0],
        [1.3, 0.42],
        [-0.2, 0.58],
        [-1.45, 0.22],
      ],
      0.95,
      0.08
    );
    const hull = new THREE.Mesh(hullGeo, paintMat);
    hull.position.set(0, 0.34, 0);
    hull.castShadow = true;
    body.add(hull);

    // Glass canopy
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 12), glassMat);
    canopy.scale.set(0.88, 0.65, 1.55);
    canopy.position.set(0, 0.88, -0.05);
    body.add(canopy);

    // Swept solar wings
    const wingGeo = new THREE.BoxGeometry(2.1, 0.07, 0.88);
    const wing = new THREE.Mesh(wingGeo, darkTrimMat);
    wing.position.set(0, 0.52, 0.35);
    const solarCells = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.09, 0.68), new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.12,
      metalness: 0.85,
    }));
    solarCells.position.set(0, 0.53, 0.35);
    body.add(wing, solarCells);

    // Twin repulsor rings + rear glow thrusters
    const ringGeo = new THREE.TorusGeometry(0.28, 0.06, 10, 20);
    ringGeo.rotateX(Math.PI / 2);
    const ringL = new THREE.Mesh(ringGeo, glowCyanMat);
    ringL.position.set(-0.72, 0.22, 0.2);
    const ringR = ringL.clone();
    ringR.position.x = 0.72;
    const ringF = ringL.clone();
    ringF.position.set(0, 0.22, -1.05);
    body.add(ringL, ringR, ringF);
    thrusters.push(ringL, ringR, ringF);
  } else if (id === 'dragon_coupe') {
    hitWidth = 1.75;
    hitHeight = 1.25;
    hitLength = 3.45;

    const coords: [number, number][] = [
      [-0.84, -1.08],
      [0.84, -1.08],
      [-0.86, 1.08],
      [0.86, 1.08],
    ];
    coords.forEach(([x, z]) => {
      const w = makeWheel(0.36, 0.26, 0xfbbf24);
      w.position.set(x, 0.36, z);
      body.add(w);
      wheels.push(w);
    });

    const chassisGeo = makeExtrudedWedge(
      [
        [-1.6, 0],
        [1.55, 0],
        [1.5, 0.45],
        [0.45, 0.82],
        [-0.55, 0.82],
        [-1.55, 0.3],
      ],
      1.56,
      0.06
    );
    const chassis = new THREE.Mesh(chassisGeo, paintMat);
    chassis.position.set(0, 0.28, 0);
    chassis.castShadow = true;
    body.add(chassis);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.32, 1.1), glassMat);
    glass.position.set(0, 0.92, -0.05);
    const flareGeo = new THREE.BoxGeometry(1.74, 0.2, 0.66);
    const fF = new THREE.Mesh(flareGeo, darkTrimMat);
    fF.position.set(0, 0.4, -1.08);
    const fR = new THREE.Mesh(flareGeo, darkTrimMat);
    fR.position.set(0, 0.4, 1.08);
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.08, 0.35), darkTrimMat);
    splitter.position.set(0, 0.26, -1.58);
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.18, 0.08), darkTrimMat);
    grille.position.set(0, 0.38, -1.66);
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.14, 0.16), darkTrimMat);
    diffuser.position.set(0, 0.3, 1.62);
    [-0.5, -0.35, 0.35, 0.5].forEach((ex) => {
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 10), chromeMat);
      tip.rotation.x = Math.PI / 2;
      tip.position.set(ex, 0.28, 1.68);
      body.add(tip);
    });
    // Carbon rear GT wing
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.08, 0.36), darkTrimMat);
    wing.position.set(0, 1.15, 1.42);
    const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.36, 0.22), goldMat);
    strutL.position.set(-0.52, 0.94, 1.42);
    const strutR = strutL.clone();
    strutR.position.x = 0.52;
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.08), headlightMat);
    hlL.position.set(-0.58, 0.52, -1.66);
    const hlR = hlL.clone();
    hlR.position.x = 0.58;
    const tl = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.08), taillightMat);
    tl.position.set(0, 0.64, 1.66);
    body.add(glass, fF, fR, splitter, grille, diffuser, wing, strutL, strutR, hlL, hlR, tl);
    exhaustOffsets = [
      { x: -0.42, y: 0.28, z: 1.78 },
      { x: 0.42, y: 0.28, z: 1.78 },
    ];
    tireHalfTrack = 0.85;
    addCarTrimDetails(body, 0.81, 0.68, [0.05], 0.86, -0.46, 0.45, -1.68, 1.68, paintMat, darkTrimMat, goldMat, true);
  } else if (id === 'khardung_6x6') {
    hitWidth = 1.98;
    hitHeight = 1.95;
    hitLength = 3.95;

    const coords: [number, number][] = [
      [-0.92, -1.32],
      [0.92, -1.32],
      [-0.92, 0.25],
      [0.92, 0.25],
      [-0.92, 1.38],
      [0.92, 1.38],
    ];
    coords.forEach(([x, z]) => {
      const w = makeWheel(0.46, 0.32, 0xfacc15);
      w.position.set(x, 0.46, z);
      body.add(w);
      wheels.push(w);
    });

    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.72, 3.65), paintMat);
    hull.position.set(0, 0.88, 0);
    hull.castShadow = true;
    const flareGeo = new THREE.BoxGeometry(1.96, 0.22, 0.76);
    [-1.32, 0.25, 1.38].forEach((fz) => {
      const fl = new THREE.Mesh(flareGeo, darkTrimMat);
      fl.position.set(0, 0.72, fz);
      body.add(fl);
    });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.56, 1.65), paintMat);
    cabin.position.set(0, 1.48, -0.45);
    cabin.castShadow = true;
    const wind = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.42, 0.08), glassMat);
    wind.position.set(0, 1.48, -1.3);
    const snorkel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.92, 8), darkTrimMat);
    snorkel.position.set(-0.88, 1.42, -1.16);
    const floodBar = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.16, 0.18), headlightMat);
    floodBar.position.set(0, 1.82, -1.15);
    const rearRack = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.44, 1.35), darkTrimMat);
    rearRack.position.set(0, 1.4, 1.05);
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.26, 0.24), chromeMat);
    bumper.position.set(0, 0.72, -1.86);
    const winch = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.18), darkTrimMat);
    winch.position.set(0, 0.86, -1.86);
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.08), headlightMat);
    hlL.position.set(-0.62, 1.0, -1.84);
    const hlR = hlL.clone();
    hlR.position.x = 0.62;
    const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.08), taillightMat);
    tlL.position.set(-0.68, 0.96, 1.84);
    const tlR = tlL.clone();
    tlR.position.x = 0.68;
    [-0.52, 0.52].forEach((ex) => {
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.26, 10), chromeMat);
      tip.rotation.x = Math.PI / 2;
      tip.position.set(ex, 0.56, 1.86);
      body.add(tip);
    });
    body.add(hull, cabin, wind, snorkel, floodBar, rearRack, bumper, winch, hlL, hlR, tlL, tlR);
    exhaustOffsets = [
      { x: -0.52, y: 0.56, z: 1.96 },
      { x: 0.52, y: 0.56, z: 1.96 },
    ];
    tireHalfTrack = 0.92;
    addCarTrimDetails(body, 0.9, 1.04, [-0.55, 0.1], 1.38, -1.12, 0.74, -1.9, 1.86, paintMat, darkTrimMat, chromeMat, true);
  } else if (id === 'garuda_trike') {
    hitWidth = 1.75;
    hitHeight = 1.3;
    hitLength = 3.35;

    const wFL = makeWheel(0.38, 0.24, 0x38bdf8);
    wFL.position.set(-0.82, 0.38, -0.95);
    const wFR = makeWheel(0.38, 0.24, 0x38bdf8);
    wFR.position.set(0.82, 0.38, -0.95);
    const wRear = makeWheel(0.46, 0.42, 0x38bdf8);
    wRear.position.set(0, 0.46, 1.18);
    body.add(wFL, wFR, wRear);
    wheels.push(wFL, wFR, wRear);

    const noseGeo = makeExtrudedWedge(
      [
        [-1.65, 0],
        [1.15, 0],
        [0.85, 0.55],
        [-0.25, 0.72],
        [-1.6, 0.16],
      ],
      0.86,
      0.06
    );
    const nose = new THREE.Mesh(noseGeo, paintMat);
    nose.position.set(0, 0.36, 0);
    nose.castShadow = true;
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.34, 1.05), glassMat);
    canopy.position.set(0, 0.96, -0.05);

    // Swept Garuda wings & twin jet intakes
    const finL = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 1.05), paintMat);
    finL.position.set(-0.56, 0.65, -0.22);
    finL.rotation.z = 0.24;
    const finR = finL.clone();
    finR.position.x = 0.56;
    finR.rotation.z = -0.24;

    const jetGeo = new THREE.CylinderGeometry(0.16, 0.2, 0.85, 12);
    jetGeo.rotateX(Math.PI / 2);
    const jetL = new THREE.Mesh(jetGeo, chromeMat);
    jetL.position.set(-0.42, 0.85, 0.95);
    const jetR = jetL.clone();
    jetR.position.x = 0.42;

    const flameL = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.45, 10), glowCyanMat);
    flameL.rotation.x = Math.PI / 2;
    flameL.position.set(-0.42, 0.85, 1.5);
    const flameR = flameL.clone();
    flameR.position.x = 0.42;

    body.add(nose, canopy, finL, finR, jetL, jetR, flameL, flameR);
    thrusters.push(flameL, flameR);
  } else {
    // surya_chariot — Apex Golden Mythic Hovercraft
    isHover = true;
    hitWidth = 1.85;
    hitHeight = 1.4;
    hitLength = 3.5;

    const hullGeo = makeExtrudedWedge(
      [
        [-1.68, 0.14],
        [1.55, 0.0],
        [1.25, 0.52],
        [-0.3, 0.68],
        [-1.58, 0.28],
      ],
      1.1,
      0.08
    );
    const hull = new THREE.Mesh(hullGeo, paintMat);
    hull.position.set(0, 0.36, 0);
    hull.castShadow = true;
    body.add(hull);

    // Ornate golden lotus wings
    const wingGeo = new THREE.BoxGeometry(2.25, 0.08, 1.15);
    const wings = new THREE.Mesh(wingGeo, goldMat);
    wings.position.set(0, 0.58, 0.2);

    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), glassMat);
    canopy.scale.set(0.95, 0.68, 1.55);
    canopy.position.set(0, 0.96, -0.05);

    // Dharma chakra halo ring at rear
    const chakraRing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.055, 10, 24), goldMat);
    chakraRing.position.set(0, 1.1, 1.25);

    // Radiant solar repulsor discs
    const discGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 16);
    const discL = new THREE.Mesh(discGeo, headlightMat);
    discL.position.set(-0.82, 0.25, 0.25);
    const discR = discL.clone();
    discR.position.x = 0.82;
    const discF = discL.clone();
    discF.position.set(0, 0.25, -1.15);

    body.add(wings, canopy, chakraRing, discL, discR, discF);
    thrusters.push(discL, discR, discF, chakraRing);
  }

  // ---- 5 REAL STICK-SHIFT CAR MODELS ----
  if (id === 'swift_rally_5mt') {
    hitWidth = 1.72;
    hitHeight = 1.42;
    hitLength = 3.25;

    const coords: [number, number][] = [
      [-0.82, -0.98],
      [0.82, -0.98],
      [-0.82, 0.98],
      [0.82, 0.98],
    ];
    coords.forEach(([x, z]) => {
      const w = makeWheel(0.36, 0.24, 0xf8fafc);
      w.position.set(x, 0.36, z);
      body.add(w);
      wheels.push(w);
    });

    // Lower hatchback body with sculpted hood & rear hatch
    const lowerHull = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.54, 3.08), paintMat);
    lowerHull.position.set(0, 0.54, 0);
    lowerHull.castShadow = true;

    // Wheel arch fender flares
    const flareGeo = new THREE.BoxGeometry(1.74, 0.2, 0.62);
    const fFront = new THREE.Mesh(flareGeo, darkTrimMat);
    fFront.position.set(0, 0.44, -0.98);
    const fRear = new THREE.Mesh(flareGeo, darkTrimMat);
    fRear.position.set(0, 0.44, 0.98);

    // Pillars + roof (open interior for stick-shift visibility)
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.09, 1.38), darkTrimMat);
    roof.position.set(0, 1.34, 0.25);
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 0.36), paintMat);
    scoop.position.set(0, 1.42, 0.15);
    const pillarGeo = new THREE.BoxGeometry(0.08, 0.58, 0.08);
    [
      [-0.64, -0.42],
      [0.64, -0.42],
      [-0.64, 0.9],
      [0.64, 0.9],
    ].forEach(([px, pz]) => {
      const p = new THREE.Mesh(pillarGeo, darkTrimMat);
      p.position.set(px, 1.06, pz);
      body.add(p);
    });

    // Sloped front windshield + rear hatch glass
    const wind = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.52, 0.05), glassMat);
    wind.position.set(0, 1.08, -0.52);
    wind.rotation.x = -0.45;
    const hoodScoop = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.45), darkTrimMat);
    hoodScoop.position.set(0, 0.84, -1.0);
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.08, 0.28), paintMat);
    spoiler.position.set(0, 1.36, 1.25);
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.24, 0.08), darkTrimMat);
    grille.position.set(0, 0.48, -1.55);
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.08), headlightMat);
    hlL.position.set(-0.56, 0.64, -1.55);
    const hlR = hlL.clone();
    hlR.position.x = 0.56;
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.25, 10), chromeMat);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(0.45, 0.28, 1.58);
    const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.08), taillightMat);
    tlL.position.set(-0.56, 0.64, 1.55);
    const tlR = tlL.clone();
    tlR.position.x = 0.56;

    body.add(
      lowerHull,
      fFront,
      fRear,
      roof,
      scoop,
      wind,
      hoodScoop,
      spoiler,
      grille,
      hlL,
      hlR,
      tlL,
      tlR,
      exhaust
    );
    exhaustOffsets = [{ x: 0.45, y: 0.28, z: 1.65 }];
    tireHalfTrack = 0.82;
    addStickCockpitAndMirrors(body, 0.68, 0.12, 0.88, 0.92, -0.42, paintMat, darkTrimMat, chromeMat, 0xdc2626, characterGender);
    addCarTrimDetails(body, 0.8, 0.68, [-0.08], 0.92, -0.42, 0.42, -1.56, 1.56, paintMat, darkTrimMat, chromeMat, false);
  } else if (id === 'thar_roadster_4x4') {
    hitWidth = 1.82;
    hitHeight = 1.68;
    hitLength = 3.35;

    const coords: [number, number][] = [
      [-0.86, -1.04],
      [0.86, -1.04],
      [-0.86, 1.04],
      [0.86, 1.04],
    ];
    coords.forEach(([x, z]) => {
      const w = makeWheel(0.44, 0.3, 0x18181b);
      w.position.set(x, 0.44, z);
      body.add(w);
      wheels.push(w);
    });

    // Tub & hood
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.46, 1.15), paintMat);
    hood.position.set(0, 0.84, -1.02);
    hood.castShadow = true;
    const tub = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.52, 1.95), paintMat);
    tub.position.set(0, 0.62, 0.52);
    tub.castShadow = true;
    const fenderGeo = new THREE.BoxGeometry(1.8, 0.14, 0.72);
    const fF = new THREE.Mesh(fenderGeo, darkTrimMat);
    fF.position.set(0, 0.82, -1.04);
    const fR = new THREE.Mesh(fenderGeo, darkTrimMat);
    fR.position.set(0, 0.82, 1.04);

    // Classic 7-slot vertical grille & round headlamps
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.42, 0.08), darkTrimMat);
    grille.position.set(0, 0.84, -1.61);
    const hlGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12);
    hlGeo.rotateX(Math.PI / 2);
    const hlL = new THREE.Mesh(hlGeo, headlightMat);
    hlL.position.set(-0.56, 0.86, -1.61);
    const hlR = hlL.clone();
    hlR.position.x = 0.56;

    // Open-top rollbar & upright windshield frame
    const windFrame = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.52, 0.06), glassMat);
    windFrame.position.set(0, 1.24, -0.38);
    windFrame.rotation.x = -0.18;
    const rollbar = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.055, 8, 16, Math.PI), darkTrimMat);
    rollbar.position.set(0, 0.96, 0.78);
    const spare = makeWheel(0.38, 0.24, 0xf59e0b);
    spare.rotation.y = Math.PI / 2;
    spare.position.set(0, 0.88, 1.62);
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.18, 0.2), chromeMat);
    bumper.position.set(0, 0.52, -1.68);

    const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.08), taillightMat);
    tlL.position.set(-0.62, 0.72, 1.52);
    const tlR = tlL.clone();
    tlR.position.x = 0.62;
    body.add(hood, tub, fF, fR, grille, hlL, hlR, tlL, tlR, windFrame, rollbar, spare, bumper);
    exhaustOffsets = [{ x: -0.52, y: 0.34, z: 1.58 }];
    tireHalfTrack = 0.86;
    addStickCockpitAndMirrors(body, 0.8, 0.18, 0.88, 1.04, -0.35, darkTrimMat, darkTrimMat, chromeMat, 0xf59e0b, characterGender);
    addCarTrimDetails(body, 0.79, 0.74, [0.12], 1.04, -0.35, 0.56, -1.68, 1.54, darkTrimMat, darkTrimMat, chromeMat, false);
  } else if (id === 'manali_drift_6mt') {
    hitWidth = 1.76;
    hitHeight = 1.34;
    hitLength = 3.55;

    const coords: [number, number][] = [
      [-0.84, -1.08],
      [0.84, -1.08],
      [-0.84, 1.08],
      [0.84, 1.08],
    ];
    coords.forEach(([x, z]) => {
      const w = makeWheel(0.35, 0.26, 0xfacc15);
      w.position.set(x, 0.35, z);
      body.add(w);
      wheels.push(w);
    });

    const sedanBody = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.48, 3.42), paintMat);
    sedanBody.position.set(0, 0.52, 0);
    sedanBody.castShadow = true;

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.08, 1.32), paintMat);
    roof.position.set(0, 1.24, 0.12);
    const pillarGeo = new THREE.BoxGeometry(0.07, 0.52, 0.07);
    [
      [-0.64, -0.48],
      [0.64, -0.48],
      [-0.64, 0.72],
      [0.64, 0.72],
    ].forEach(([px, pz]) => {
      const p = new THREE.Mesh(pillarGeo, darkTrimMat);
      p.position.set(px, 1.0, pz);
      body.add(p);
    });

    const wind = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.46, 0.05), glassMat);
    wind.position.set(0, 1.0, -0.58);
    wind.rotation.x = -0.52;
    const intercooler = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.22, 0.1), chromeMat);
    intercooler.position.set(0, 0.38, -1.72);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.08, 0.28), darkTrimMat);
    lip.position.set(0, 0.24, -1.68);
    const ducktail = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.14, 0.24), paintMat);
    ducktail.position.set(0, 0.84, 1.62);
    ducktail.rotation.x = -0.35;

    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.08), headlightMat);
    hlL.position.set(-0.58, 0.62, -1.72);
    const hlR = hlL.clone();
    hlR.position.x = 0.58;
    const tl = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.12, 0.08), taillightMat);
    tl.position.set(0, 0.64, 1.72);

    body.add(sedanBody, roof, wind, intercooler, lip, ducktail, hlL, hlR, tl);
    exhaustOffsets = [{ x: 0.48, y: 0.28, z: 1.74 }];
    tireHalfTrack = 0.84;
    addStickCockpitAndMirrors(body, 0.62, 0.08, 0.9, 0.84, -0.48, paintMat, darkTrimMat, chromeMat, 0xfacc15, characterGender);
    addCarTrimDetails(body, 0.82, 0.64, [0.04], 0.84, -0.48, 0.42, -1.73, 1.73, paintMat, darkTrimMat, chromeMat, false);
  } else if (id === 'zanskar_gtr_6mt') {
    hitWidth = 1.84;
    hitHeight = 1.28;
    hitLength = 3.6;

    const coords: [number, number][] = [
      [-0.88, -1.1],
      [0.88, -1.1],
      [-0.88, 1.1],
      [0.88, 1.1],
    ];
    coords.forEach(([x, z]) => {
      const w = makeWheel(0.37, 0.28, 0xe2e8f0);
      w.position.set(x, 0.37, z);
      body.add(w);
      wheels.push(w);
    });

    const bodyHull = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.48, 3.48), paintMat);
    bodyHull.position.set(0, 0.5, 0);
    bodyHull.castShadow = true;

    const carbonHood = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.06, 1.15), darkTrimMat);
    carbonHood.position.set(0, 0.76, -1.02);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.08, 1.18), darkTrimMat);
    roof.position.set(0, 1.2, 0.1);
    const wind = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.44, 0.05), glassMat);
    wind.position.set(0, 0.98, -0.55);
    wind.rotation.x = -0.58;

    // Swan-neck GT wing + quad exhausts + front splitter
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.07, 0.36), darkTrimMat);
    splitter.position.set(0, 0.24, -1.7);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.07, 0.38), darkTrimMat);
    wing.position.set(0, 1.18, 1.54);
    const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.44, 0.16), chromeMat);
    strutL.position.set(-0.48, 0.95, 1.52);
    const strutR = strutL.clone();
    strutR.position.x = 0.48;

    const exGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.2, 10);
    exGeo.rotateX(Math.PI / 2);
    [-0.55, -0.38, 0.38, 0.55].forEach((ex) => {
      const p = new THREE.Mesh(exGeo, chromeMat);
      p.position.set(ex, 0.28, 1.76);
      body.add(p);
    });

    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.08), headlightMat);
    hlL.position.set(-0.62, 0.58, -1.75);
    const hlR = hlL.clone();
    hlR.position.x = 0.62;
    const tlL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 12), taillightMat);
    tlL.rotation.x = Math.PI / 2;
    tlL.position.set(-0.56, 0.6, 1.75);
    const tlR = tlL.clone();
    tlR.position.x = 0.56;

    body.add(bodyHull, carbonHood, roof, wind, splitter, wing, strutL, strutR, hlL, hlR, tlL, tlR);
    exhaustOffsets = [
      { x: -0.46, y: 0.28, z: 1.82 },
      { x: 0.46, y: 0.28, z: 1.82 },
    ];
    tireHalfTrack = 0.88;
    addStickCockpitAndMirrors(body, 0.6, 0.06, 0.94, 0.84, -0.45, paintMat, darkTrimMat, chromeMat, 0x38bdf8, characterGender);
    addCarTrimDetails(body, 0.86, 0.62, [0.02], 0.84, -0.45, 0.4, -1.76, 1.76, paintMat, darkTrimMat, chromeMat, false);
  } else if (id === 'khardung_v12_stick') {
    hitWidth = 1.88;
    hitHeight = 1.22;
    hitLength = 3.68;

    const coords: [number, number][] = [
      [-0.9, -1.12],
      [0.9, -1.12],
      [-0.9, 1.12],
      [0.9, 1.12],
    ];
    coords.forEach(([x, z]) => {
      const w = makeWheel(0.38, 0.3, 0xfbbf24);
      w.position.set(x, 0.38, z);
      body.add(w);
      wheels.push(w);
    });

    const wedgeGeo = makeExtrudedWedge(
      [
        [-1.78, 0],
        [1.72, 0],
        [1.64, 0.56],
        [0.55, 0.78],
        [-0.45, 0.78],
        [-1.74, 0.24],
      ],
      1.68,
      0.06
    );
    const wedge = new THREE.Mesh(wedgeGeo, paintMat);
    wedge.position.set(0, 0.24, 0);
    wedge.castShadow = true;

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.3, 1.35), glassMat);
    canopy.position.set(0, 0.94, -0.08);
    // Mid-engine V12 louver deck
    for (let l = 0; l < 4; l++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.04, 0.14), darkTrimMat);
      slat.position.set(0, 0.84 + (3 - l) * 0.03, 0.72 + l * 0.22);
      slat.rotation.x = 0.22;
      body.add(slat);
    }

    const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.06, 0.38), goldMat);
    splitter.position.set(0, 0.22, -1.76);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.08, 0.36), darkTrimMat);
    wing.position.set(0, 1.12, 1.62);
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.1), headlightMat);
    hlL.position.set(-0.62, 0.48, -1.78);
    const hlR = hlL.clone();
    hlR.position.x = 0.62;
    const tl = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.08), taillightMat);
    tl.position.set(0, 0.68, 1.76);

    body.add(wedge, canopy, splitter, wing, hlL, hlR, tl);
    exhaustOffsets = [
      { x: -0.35, y: 0.36, z: 1.8 },
      { x: 0.35, y: 0.36, z: 1.8 },
    ];
    tireHalfTrack = 0.9;
    addStickCockpitAndMirrors(body, 0.56, -0.02, 0.96, 0.78, -0.52, paintMat, darkTrimMat, goldMat, 0xfbbf24, characterGender);
    addCarTrimDetails(body, 0.88, 0.58, [-0.04], 0.78, -0.52, 0.4, -1.8, 1.78, paintMat, darkTrimMat, goldMat, false);
  }

  return {
    group: root,
    bodyGroup: body,
    wheels,
    thrusters,
    shadowPlane,
    isHover,
    hitWidth,
    hitHeight,
    hitLength,
    exhaustOffsets,
    tireHalfTrack,
  };
}
