import * as THREE from 'three';
import type { FlashcardSpec } from '../data/documentary';
import {
  createFlashcardFaceTexture,
  createValidatorPlateTexture,
} from './proceduralTextures';

export interface InteractiveNodeMeta {
  id: string;
  title: string;
  subtitle: string;
  kind: 'crown' | 'validator' | 'vault' | 'flashcard';
  flashcardId?: string;
}

function tagInteractiveLayer(obj: THREE.Object3D, meta: InteractiveNodeMeta) {
  obj.userData.meta = meta;
  obj.traverse((child) => {
    child.layers.enable(1);
    child.userData.meta = meta;
  });
}

/**
 * Composite 8-part Toxicology Neon-Red Crown + Mascot Visor Beacon (bottom-center pivot y=0)
 */
export function createCrownBeaconGroup(): {
  group: THREE.Group;
  crownGroup: THREE.Group;
  orbRing: THREE.Mesh;
} {
  const group = new THREE.Group();

  // 1. Lathe obsidian pedestal base
  const lathePoints = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(1.45, 0.0),
    new THREE.Vector2(1.38, 0.14),
    new THREE.Vector2(1.18, 0.24),
    new THREE.Vector2(1.06, 0.42),
    new THREE.Vector2(0.92, 0.46),
    new THREE.Vector2(0.0, 0.46),
  ];
  const pedestalGeo = new THREE.LatheGeometry(lathePoints, 48);
  const pedestalMat = new THREE.MeshStandardMaterial({
    color: 0x0e0e10,
    roughness: 0.72,
    metalness: 0.22,
  });
  const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  group.add(pedestal);

  // 2. Brushed titanium collar ring
  const collarGeo = new THREE.CylinderGeometry(0.98, 1.08, 0.14, 48);
  const collarMat = new THREE.MeshPhysicalMaterial({
    color: 0x26262b,
    metalness: 0.92,
    roughness: 0.2,
    clearcoat: 0.6,
    clearcoatRoughness: 0.18,
  });
  const collar = new THREE.Mesh(collarGeo, collarMat);
  collar.position.y = 0.5;
  collar.castShadow = true;
  group.add(collar);

  // 3. Saturated red emblem disc (echoing avatar hero circle)
  const discGeo = new THREE.CylinderGeometry(0.86, 0.86, 0.06, 48);
  const discMat = new THREE.MeshStandardMaterial({
    color: 0xe10000,
    emissive: 0x550000,
    emissiveIntensity: 0.65,
    roughness: 0.35,
    metalness: 0.15,
  });
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.position.y = 0.59;
  group.add(disc);

  // 4. Composite Floating Mascot Dome + Cap Crown
  const crownGroup = new THREE.Group();
  crownGroup.position.y = 1.65;

  // Clay white mascot head dome (matte ceramic look)
  const bodyGeo = new THREE.CapsuleGeometry(0.42, 0.32, 12, 28);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xf4f4f6,
    roughness: 0.62,
    metalness: 0.04,
  });
  const mascotBody = new THREE.Mesh(bodyGeo, bodyMat);
  mascotBody.position.y = -0.18;
  mascotBody.castShadow = true;
  crownGroup.add(mascotBody);

  // Two glossy black eyes
  const eyeGeo = new THREE.SphereGeometry(0.055, 16, 16);
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x050505,
    roughness: 0.18,
    metalness: 0.25,
  });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.15, -0.02, 0.39);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.15, -0.02, 0.39);
  crownGroup.add(leftEye, rightEye);

  // Black streetwear cap dome
  const capGeo = new THREE.SphereGeometry(
    0.455,
    32,
    20,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.54
  );
  const capMat = new THREE.MeshStandardMaterial({
    color: 0x09090b,
    roughness: 0.78,
    metalness: 0.12,
  });
  const capDome = new THREE.Mesh(capGeo, capMat);
  capDome.position.y = 0.06;
  capDome.castShadow = true;
  crownGroup.add(capDome);

  // Cap visor brim via TubeGeometry curve
  const brimCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.42, 0.06, 0.14),
    new THREE.Vector3(-0.28, 0.05, 0.58),
    new THREE.Vector3(0.0, 0.04, 0.68),
    new THREE.Vector3(0.28, 0.05, 0.58),
    new THREE.Vector3(0.42, 0.06, 0.14),
  ]);
  const brimGeo = new THREE.TubeGeometry(brimCurve, 28, 0.055, 12, false);
  const brimMesh = new THREE.Mesh(brimGeo, capMat);
  brimMesh.castShadow = true;
  crownGroup.add(brimMesh);

  // 5. Extruded Beveled 3-Peak Neon-Red Crown floating directly over cap front
  const crownShape = new THREE.Shape();
  crownShape.moveTo(-0.34, 0.0);
  crownShape.lineTo(0.34, 0.0);
  crownShape.lineTo(0.42, 0.34);
  crownShape.lineTo(0.18, 0.16);
  crownShape.lineTo(0.0, 0.44);
  crownShape.lineTo(-0.18, 0.16);
  crownShape.lineTo(-0.42, 0.34);
  crownShape.closePath();

  const crownGeo = new THREE.ExtrudeGeometry(crownShape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.018,
    bevelSegments: 3,
  });
  crownGeo.center();

  const crownMat = new THREE.MeshPhysicalMaterial({
    color: 0xe10000,
    emissive: 0xe10000,
    emissiveIntensity: 1.35,
    roughness: 0.16,
    metalness: 0.45,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  });
  const crownMesh = new THREE.Mesh(crownGeo, crownMat);
  crownMesh.position.set(0, 0.62, 0.12);
  crownMesh.castShadow = true;
  crownGroup.add(crownMesh);

  // 6. Precision orbital telemetry ring around beacon
  const orbRingGeo = new THREE.TorusGeometry(1.15, 0.028, 16, 72);
  const orbRingMat = new THREE.MeshStandardMaterial({
    color: 0xe10000,
    emissive: 0xc20000,
    emissiveIntensity: 0.9,
    roughness: 0.25,
    metalness: 0.85,
  });
  const orbRing = new THREE.Mesh(orbRingGeo, orbRingMat);
  orbRing.position.y = 1.65;
  orbRing.rotation.x = Math.PI * 0.42;
  group.add(orbRing);

  group.add(crownGroup);

  tagInteractiveLayer(group, {
    id: 'crown-beacon',
    title: 'Solana 1.0 · Toxicology Beacon',
    subtitle:
      'Mainnet Beta retired into production. Multi-client architecture with zero token migration.',
    kind: 'crown',
  });

  return { group, crownGroup, orbRing };
}

/**
 * Composite 7-part Validator Rig (Agave or Firedancer) grounded at y=0
 */
export function createValidatorRigGroup(
  title: string,
  subtitle: string,
  accentHex: string,
  isSoftwareGl: boolean,
  maxAnisotropy: number,
  nodeId: string,
  detailSummary: string
): { group: THREE.Group; coreTube: THREE.Mesh } {
  const group = new THREE.Group();

  // 1. Stepped Base Plinth
  const plinthGeo = new THREE.BoxGeometry(1.45, 0.16, 1.15);
  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x111114,
    roughness: 0.72,
    metalness: 0.3,
  });
  const plinth = new THREE.Mesh(plinthGeo, plinthMat);
  plinth.position.y = 0.08;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  // 2. Main Armored Chassis
  const chassisGeo = new THREE.BoxGeometry(1.16, 2.05, 0.86);
  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0x18181c,
    roughness: 0.48,
    metalness: 0.65,
  });
  const chassis = new THREE.Mesh(chassisGeo, chassisMat);
  chassis.position.y = 1.18;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  group.add(chassis);

  // 3. Procedural Front Telemetry Faceplate
  const plateTex = createValidatorPlateTexture(
    title,
    subtitle,
    accentHex,
    maxAnisotropy
  );
  const plateGeo = new THREE.PlaneGeometry(1.06, 1.9);
  const plateMat = new THREE.MeshStandardMaterial({
    map: plateTex,
    roughness: 0.35,
    metalness: 0.25,
    emissive: new THREE.Color(accentHex),
    emissiveIntensity: 0.18,
  });
  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.position.set(0, 1.18, 0.436);
  group.add(plate);

  // 4. Side Anodized Heat-Sink Fins (Left & Right)
  const finMat = new THREE.MeshPhysicalMaterial({
    color: 0x2c2c32,
    metalness: 0.9,
    roughness: 0.22,
    clearcoat: 0.5,
  });
  for (let i = 0; i < 4; i++) {
    const finGeo = new THREE.BoxGeometry(0.06, 1.72, 0.12);
    const leftFin = new THREE.Mesh(finGeo, finMat);
    leftFin.position.set(-0.62, 1.18, -0.26 + i * 0.17);
    const rightFin = new THREE.Mesh(finGeo, finMat);
    rightFin.position.set(0.62, 1.18, -0.26 + i * 0.17);
    group.add(leftFin, rightFin);
  }

  // 5. Top Crown Cap & Waveguide Tube
  const capGeo = new THREE.BoxGeometry(1.26, 0.14, 0.96);
  const cap = new THREE.Mesh(capGeo, plinthMat);
  cap.position.y = 2.27;
  group.add(cap);

  const coreGeo = new THREE.CylinderGeometry(0.11, 0.11, 2.15, 20);
  const coreMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(accentHex),
    emissive: new THREE.Color(accentHex),
    emissiveIntensity: 1.4,
    roughness: 0.15,
    metalness: 0.3,
  });
  const coreTube = new THREE.Mesh(coreGeo, coreMat);
  coreTube.position.set(0, 1.24, 0.46);
  coreTube.scale.set(0.5, 1, 0.3);
  group.add(coreTube);

  // 6. Outer Glass Acoustic/Telemetry Shroud
  const glassGeo = new THREE.BoxGeometry(1.24, 2.08, 0.94);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.08,
    transmission: isSoftwareGl ? 0 : 0.72,
    transparent: true,
    opacity: isSoftwareGl ? 0.22 : 1,
    thickness: 0.4,
    ior: 1.5,
    clearcoat: 1.0,
    depthWrite: false,
  });
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.position.y = 1.18;
  glass.renderOrder = 2;
  group.add(glass);

  tagInteractiveLayer(group, {
    id: nodeId,
    title: `${title} Validator Client`,
    subtitle: detailSummary,
    kind: 'validator',
  });

  return { group, coreTube };
}

/**
 * Composite 5-part User Asset Vault Pillar grounded at y=0
 */
export function createVaultNodeGroup(
  id: string,
  label: string,
  summary: string
): { group: THREE.Group; core: THREE.Mesh; ring: THREE.Mesh } {
  const group = new THREE.Group();

  // 1. Hexagonal stone/carbon base
  const baseGeo = new THREE.CylinderGeometry(0.46, 0.56, 0.22, 6);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x121215,
    roughness: 0.7,
    metalness: 0.25,
  });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.11;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // 2. Machined lock pedestal
  const stemGeo = new THREE.CylinderGeometry(0.28, 0.34, 0.55, 16);
  const stemMat = new THREE.MeshStandardMaterial({
    color: 0x222228,
    roughness: 0.3,
    metalness: 0.85,
  });
  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = 0.49;
  stem.castShadow = true;
  group.add(stem);

  // 3. Crystalline Lock Core (Octahedron)
  const coreGeo = new THREE.OctahedronGeometry(0.26, 0);
  const coreMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    emissive: 0x330000,
    emissiveIntensity: 0.5,
    roughness: 0.14,
    metalness: 0.4,
    clearcoat: 1,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.y = 1.1;
  core.castShadow = true;
  group.add(core);

  // 4. Security Halo Collar
  const ringGeo = new THREE.TorusGeometry(0.38, 0.032, 12, 42);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x55555d,
    emissive: 0x000000,
    roughness: 0.28,
    metalness: 0.82,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 1.1;
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  tagInteractiveLayer(group, {
    id,
    title: `${label} — Locked Safe`,
    subtitle: summary,
    kind: 'vault',
  });

  return { group, core, ring };
}

/**
 * Physical 3D Beveled Flashcard Slab for Scene 02 & Always-Accessible Interaction
 */
export function createFlashcard3DGroup(
  card: FlashcardSpec,
  maxAnisotropy: number
): { group: THREE.Group; pivot: THREE.Group } {
  const group = new THREE.Group();
  const pivot = new THREE.Group();

  // Beveled dark aluminum card body
  const shape = new THREE.Shape();
  const w = 1.48;
  const h = 0.98;
  const r = 0.08;
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);

  const slabGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.04,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
  });
  slabGeo.center();

  const slabMat = new THREE.MeshStandardMaterial({
    color: 0x18181c,
    roughness: 0.35,
    metalness: 0.78,
  });
  const slab = new THREE.Mesh(slabGeo, slabMat);
  slab.castShadow = true;
  pivot.add(slab);

  // Front Question Texture Plane
  const frontTex = createFlashcardFaceTexture(
    card.code,
    card.front,
    'Click card in 3D or below to flip',
    false,
    maxAnisotropy
  );
  const faceGeo = new THREE.PlaneGeometry(1.4, 0.92);
  const frontMat = new THREE.MeshStandardMaterial({
    map: frontTex,
    roughness: 0.42,
    metalness: 0.1,
  });
  const frontMesh = new THREE.Mesh(faceGeo, frontMat);
  frontMesh.position.z = 0.036;
  pivot.add(frontMesh);

  // Back Answer Texture Plane
  const backTex = createFlashcardFaceTexture(
    card.code,
    card.back,
    card.detail,
    true,
    maxAnisotropy
  );
  const backMat = new THREE.MeshStandardMaterial({
    map: backTex,
    roughness: 0.36,
    metalness: 0.12,
    emissive: 0x220000,
    emissiveIntensity: 0.25,
  });
  const backMesh = new THREE.Mesh(faceGeo, backMat);
  backMesh.position.z = -0.036;
  backMesh.rotation.y = Math.PI;
  pivot.add(backMesh);

  // Bottom neon trim rail
  const railGeo = new THREE.BoxGeometry(1.36, 0.035, 0.075);
  const railMat = new THREE.MeshStandardMaterial({
    color: 0xe10000,
    emissive: 0xe10000,
    emissiveIntensity: 0.9,
    roughness: 0.2,
    metalness: 0.4,
  });
  const rail = new THREE.Mesh(railGeo, railMat);
  rail.position.y = -0.5;
  pivot.add(rail);

  group.add(pivot);

  tagInteractiveLayer(group, {
    id: card.id,
    title: `3D Flashcard ${card.code}`,
    subtitle: `${card.front} — ${card.back}`,
    kind: 'flashcard',
    flashcardId: card.id,
  });

  return { group, pivot };
}

/**
 * InstancedMesh QUIC & Local Fee Market Packets (36 instances with color tints)
 */
export function createQuicPacketsMesh(count = 36): THREE.InstancedMesh {
  const geo = new THREE.CapsuleGeometry(0.05, 0.14, 6, 10);
  geo.rotateZ(Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe10000,
    emissiveIntensity: 0.85,
    roughness: 0.2,
    metalness: 0.5,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;

  const palette = [
    new THREE.Color(0xe10000),
    new THREE.Color(0xff5247),
    new THREE.Color(0xffffff),
  ];
  const dummy = new THREE.Object3D();

  for (let i = 0; i < count; i++) {
    dummy.position.set(0, 1.2, 0);
    const scaleJitter = 0.85 + (i % 4) * 0.1;
    dummy.scale.setScalar(scaleJitter);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, palette[i % palette.length]);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();

  return mesh;
}
