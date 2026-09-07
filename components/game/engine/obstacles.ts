import * as THREE from 'three';
import type { ObstacleKind } from './config';

export interface ActiveObstacle { group: THREE.Group; kind: ObstacleKind; halfWidth: number; halfHeight: number; centerY: number; halfDepth: number; passed: boolean; wings?: THREE.Mesh[]; }
const bone = new THREE.MeshStandardMaterial({ color: 0xd9d6ce, roughness: 0.9, metalness: 0.02 });
const dark = new THREE.MeshStandardMaterial({ color: 0x8f908b, roughness: 1 });
function box(w: number, h: number, d: number, material = bone) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); }
function cactusPiece(scale: number) {
  const group = new THREE.Group();
  const trunk = box(0.52 * scale, 1.45 * scale, 0.52 * scale); trunk.position.y = 0.725 * scale;
  const leftArm = box(0.42 * scale, 0.28 * scale, 0.42 * scale); leftArm.position.set(-0.4 * scale, 0.72 * scale, 0);
  const leftTip = box(0.25 * scale, 0.62 * scale, 0.42 * scale); leftTip.position.set(-0.57 * scale, 0.93 * scale, 0);
  const rightArm = box(0.38 * scale, 0.24 * scale, 0.42 * scale); rightArm.position.set(0.37 * scale, 1.02 * scale, 0);
  const rightTip = box(0.24 * scale, 0.52 * scale, 0.42 * scale); rightTip.position.set(0.52 * scale, 1.2 * scale, 0);
  group.add(trunk, leftArm, leftTip, rightArm, rightTip); return group;
}
export function createCactus(clusterSize: number): ActiveObstacle {
  const group = new THREE.Group(); const spacing = 1.05;
  for (let i = 0; i < clusterSize; i += 1) { const scale = 0.86 + ((i * 17) % 3) * 0.12; const piece = cactusPiece(scale); piece.position.x = (i - (clusterSize - 1) / 2) * spacing; group.add(piece); }
  group.position.z = -92;
  return { group, kind: 'cactus', halfWidth: 0.62 + (clusterSize - 1) * 0.55, halfHeight: 0.78, centerY: 0.78, halfDepth: 0.42, passed: false };
}
export function createBird(kind: Exclude<ObstacleKind, 'cactus'>): ActiveObstacle {
  const group = new THREE.Group(); const height = kind === 'bird-low' ? 0.72 : kind === 'bird-mid' ? 1.5 : 3.15;
  const body = box(1.15, 0.38, 0.48); body.rotation.z = -0.06;
  const neck = box(0.38, 0.28, 0.34, dark); neck.position.x = 0.65;
  const beak = box(0.5, 0.1, 0.18); beak.position.x = 1.05;
  const leftWing = box(0.62, 0.1, 1.65, dark); leftWing.position.set(-0.1, 0.04, 0.72); leftWing.rotation.x = 0.25;
  const rightWing = box(0.62, 0.1, 1.65, dark); rightWing.position.set(-0.1, 0.04, -0.72); rightWing.rotation.x = -0.25;
  group.add(body, neck, beak, leftWing, rightWing); group.position.set(0, height, -92);
  return { group, kind, halfWidth: 1.25, halfHeight: 0.28, centerY: height, halfDepth: 1.18, passed: false, wings: [leftWing, rightWing] };
}
export function animateObstacle(obstacle: ActiveObstacle, time: number) { if (!obstacle.wings) return; const flap = Math.sin(time * 11) * 0.46; obstacle.wings[0].rotation.x = 0.25 + flap; obstacle.wings[1].rotation.x = -0.25 - flap; obstacle.group.position.y = obstacle.centerY + Math.sin(time * 4.4) * 0.06; }
