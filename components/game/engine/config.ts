export const GAME = {
  baseSpeed: 17, maxSpeed: 34, speedGain: 0.006, initialGap: 48,
  pterodactylUnlock: 260, clusterUnlock: 150, playerDepth: 0.7,
  playerHeight: 1.65, duckHeight: 0.72, eyeHeight: 1.62,
  duckEyeHeight: 0.78, jumpHeight: 2.15, jumpDuration: 0.68, duckDuration: 0.62,
  laneWidth: 3.6, laneChangeDuration: 0.18, playerWidth: 0.72,
} as const;
export type GamePhase = 'ready' | 'running' | 'over';
export type ActionState = 'run' | 'jump' | 'duck';
export type ObstacleKind = 'cactus' | 'bird-low' | 'bird-mid' | 'bird-high';
export type Lane = -1 | 0 | 1;
