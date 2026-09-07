import { describe, expect, it } from 'vitest';
import {
  actionClears,
  clampLane,
  createObstaclePattern,
  crossingX,
  getAvailablePatternIds,
  interpolate,
  laneX,
  patternHasSafeEscape,
  rangesOverlap,
  shiftLane,
} from './gameplay';

describe('lane movement', () => {
  it('clamps lane input and stops at the road edges', () => {
    expect(clampLane(-8)).toBe(-1);
    expect(clampLane(0.4)).toBe(0);
    expect(clampLane(9)).toBe(1);
    expect(shiftLane(-1, -1)).toBe(-1);
    expect(shiftLane(0, 1)).toBe(1);
    expect(shiftLane(1, 1)).toBe(1);
  });

  it('eases between lane centers without overshooting', () => {
    expect(interpolate(laneX(-1), laneX(1), -1)).toBe(laneX(-1));
    expect(interpolate(laneX(-1), laneX(1), 0.5)).toBe(0);
    expect(interpolate(laneX(-1), laneX(1), 2)).toBe(laneX(1));
  });
});

describe('collision helpers', () => {
  it('detects overlap during a lane transition', () => {
    const playerX = interpolate(laneX(0), laneX(1), 0.5);
    expect(rangesOverlap(playerX - 0.36, playerX + 0.36, laneX(0) - 1.25, laneX(0) + 1.25)).toBe(false);
    expect(rangesOverlap(playerX - 0.36, playerX + 0.36, playerX - 0.5, playerX + 0.5)).toBe(true);
  });

  it('moves crossing hazards from a side lane to the center', () => {
    const crossing = { fromLane: 1 as const, toLane: 0 as const, startZ: -58, endZ: -12 };
    expect(crossingX(crossing, -80)).toBe(laneX(1));
    expect(crossingX(crossing, -35)).toBeCloseTo(laneX(1) / 2);
    expect(crossingX(crossing, 0)).toBe(laneX(0));
  });

  it('models the intended response for every obstacle profile', () => {
    expect(actionClears('cactus', 1, 'jump')).toBe(true);
    expect(actionClears('cactus', 2.45, 'jump')).toBe(false);
    expect(actionClears('bird-low', 1, 'jump')).toBe(true);
    expect(actionClears('bird-low', 1, 'duck')).toBe(false);
    expect(actionClears('bird-mid', 1, 'duck')).toBe(true);
    expect(actionClears('bird-mid', 1, 'run')).toBe(false);
    expect(actionClears('bird-high', 1, 'run')).toBe(true);
  });
});

describe('obstacle patterns', () => {
  it('unlocks obstacle families with distance', () => {
    expect(getAvailablePatternIds(0)).toEqual(['single-cactus']);
    expect(getAvailablePatternIds(150)).toContain('double-wall');
    expect(getAvailablePatternIds(259)).not.toContain('crossing-bird');
    expect(getAvailablePatternIds(260)).toEqual(expect.arrayContaining(['single-bird', 'crossing-bird', 'layered-choice']));
  });

  it('only creates patterns with at least one valid escape', () => {
    let seed = 404;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0x100000000; };
    for (const distance of [0, 150, 260, 900]) {
      for (let sample = 0; sample < 100; sample += 1) {
        expect(patternHasSafeEscape(createObstaclePattern(distance, random))).toBe(true);
      }
    }
  });
});
