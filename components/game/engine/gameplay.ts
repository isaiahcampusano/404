import { GAME, type Lane, type ObstacleKind } from './config';

export const LANES: readonly Lane[] = [-1, 0, 1];

export interface CrossingSpec {
  fromLane: Lane;
  toLane: Lane;
  startZ: number;
  endZ: number;
}

export interface HazardSpec {
  kind: ObstacleKind;
  lanes: Lane[];
  clusterSize?: number;
  scale?: number;
  crossing?: CrossingSpec;
}

export interface ObstaclePattern {
  id: 'single-cactus' | 'double-wall' | 'single-bird' | 'crossing-bird' | 'layered-choice';
  hazards: HazardSpec[];
}

interface WeightedPattern {
  id: ObstaclePattern['id'];
  minDistance: number;
  weight: number;
}

const PATTERNS: readonly WeightedPattern[] = [
  { id: 'single-cactus', minDistance: 0, weight: 6 },
  { id: 'double-wall', minDistance: GAME.clusterUnlock, weight: 3 },
  { id: 'single-bird', minDistance: GAME.pterodactylUnlock, weight: 3 },
  { id: 'crossing-bird', minDistance: GAME.pterodactylUnlock, weight: 2 },
  { id: 'layered-choice', minDistance: GAME.pterodactylUnlock, weight: 3 },
];

export function laneX(lane: Lane) { return lane * GAME.laneWidth; }

export function clampLane(value: number): Lane {
  return Math.max(-1, Math.min(1, Math.round(value))) as Lane;
}

export function shiftLane(lane: Lane, direction: -1 | 1): Lane {
  return clampLane(lane + direction);
}

export function smoothStep(progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  return t * t * (3 - 2 * t);
}

export function interpolate(from: number, to: number, progress: number) {
  return from + (to - from) * smoothStep(progress);
}

export function crossingX(crossing: CrossingSpec, z: number) {
  const distance = crossing.endZ - crossing.startZ;
  const progress = distance === 0 ? 1 : (z - crossing.startZ) / distance;
  return interpolate(laneX(crossing.fromLane), laneX(crossing.toLane), progress);
}

export function rangesOverlap(aMin: number, aMax: number, bMin: number, bMax: number) {
  return aMax > bMin && aMin < bMax;
}

export function getAvailablePatternIds(distance: number) {
  return PATTERNS.filter((pattern) => distance >= pattern.minDistance).map((pattern) => pattern.id);
}

function pick<T>(values: readonly T[], random: () => number) {
  return values[Math.min(values.length - 1, Math.floor(random() * values.length))];
}

function otherLanes(lane: Lane) { return LANES.filter((candidate) => candidate !== lane); }

export function createObstaclePattern(distance: number, random: () => number = Math.random): ObstaclePattern {
  const available = PATTERNS.filter((pattern) => distance >= pattern.minDistance);
  const totalWeight = available.reduce((total, pattern) => total + pattern.weight, 0);
  let roll = random() * totalWeight;
  const selected = available.find((pattern) => { roll -= pattern.weight; return roll < 0; }) ?? available[0];
  const lane = pick(LANES, random);

  if (selected.id === 'single-cactus') {
    return { id: selected.id, hazards: [{ kind: 'cactus', lanes: [lane], clusterSize: distance >= GAME.clusterUnlock && random() > 0.55 ? 2 : 1 }] };
  }
  if (selected.id === 'double-wall') {
    const openLane = lane;
    return { id: selected.id, hazards: [{ kind: 'cactus', lanes: otherLanes(openLane), scale: 2.45 }] };
  }
  if (selected.id === 'single-bird') {
    return { id: selected.id, hazards: [{ kind: random() < 0.48 ? 'bird-low' : 'bird-mid', lanes: [lane] }] };
  }
  if (selected.id === 'crossing-bird') {
    const fromLane = random() < 0.5 ? -1 : 1;
    return { id: selected.id, hazards: [{ kind: random() < 0.5 ? 'bird-low' : 'bird-mid', lanes: [fromLane, 0], crossing: { fromLane, toLane: 0, startZ: -58, endZ: -12 } }] };
  }

  const cactusLane = lane;
  const birdLane = pick(otherLanes(cactusLane), random);
  return {
    id: selected.id,
    hazards: [
      { kind: 'cactus', lanes: [cactusLane] },
      { kind: 'bird-mid', lanes: [birdLane] },
    ],
  };
}

export function actionClears(kind: ObstacleKind, scale: number, action: 'run' | 'jump' | 'duck') {
  if (kind === 'cactus') return scale < 2 && action === 'jump';
  if (kind === 'bird-low') return action === 'jump';
  if (kind === 'bird-mid') return action === 'duck';
  return action !== 'jump';
}

export function patternHasSafeEscape(pattern: ObstaclePattern) {
  const actions = ['run', 'jump', 'duck'] as const;
  return LANES.some((lane) => actions.some((action) => pattern.hazards.every((hazard) => {
    const occupiesLane = hazard.crossing ? hazard.crossing.toLane === lane : hazard.lanes.includes(lane);
    return !occupiesLane || actionClears(hazard.kind, hazard.scale ?? 1, action);
  })));
}
