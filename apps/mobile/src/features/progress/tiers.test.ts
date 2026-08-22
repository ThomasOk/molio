import { TIER_SCALE, tierForDay, tierForPercentage } from './tiers';

import { createDayProgress } from './types';

describe('progress tiers', () => {
  it('maps each design band to its own tier', () => {
    expect(tierForPercentage(null)).toBe(-1);
    expect(tierForPercentage(0)).toBe(0);
    expect(tierForPercentage(1)).toBe(1);
    expect(tierForPercentage(24.9)).toBe(1);
    expect(tierForPercentage(25)).toBe(2);
    expect(tierForPercentage(50)).toBe(3);
    expect(tierForPercentage(75)).toBe(4);
    expect(tierForPercentage(99.9)).toBe(4);
    expect(tierForPercentage(100)).toBe(5);
    expect(tierForPercentage(120)).toBe(6);
    expect(tierForPercentage(180)).toBe(7);
    expect(tierForPercentage(400)).toBe(7);
  });

  it('separates an unmeasured day from a measured zero-step day', () => {
    const noData = createDayProgress({
      date: '2026-08-22',
      steps: 0,
      dailyGoal: 8000,
      xp: 0,
      hasData: false,
    });
    const zeroSteps = { ...noData, hasData: true };

    expect(tierForDay(noData)).toBe(-1);
    expect(tierForDay(zeroSteps)).toBe(0);
  });

  it('gives both variants a scale for every tier', () => {
    expect(TIER_SCALE['refined-grid']).toHaveLength(8);
    expect(TIER_SCALE['living-cells']).toHaveLength(8);
  });
});

describe('createDayProgress', () => {
  it('derives percentage and completion from steps and goal', () => {
    const day = createDayProgress({
      date: '2026-08-22',
      steps: 8420,
      dailyGoal: 8000,
      xp: 310,
    });

    expect(day.progressPercentage).toBeCloseTo(105.25);
    expect(day.goalCompleted).toBe(true);
  });

  it('leaves percentage uncapped so 120%+ days stay distinguishable', () => {
    const day = createDayProgress({
      date: '2026-08-22',
      steps: 16_000,
      dailyGoal: 8000,
      xp: 0,
    });

    expect(day.progressPercentage).toBe(200);
    expect(tierForDay(day)).toBe(7);
  });

  it('does not divide by a zero goal', () => {
    const day = createDayProgress({
      date: '2026-08-22',
      steps: 5000,
      dailyGoal: 0,
      xp: 0,
    });

    expect(day.progressPercentage).toBe(0);
    expect(day.goalCompleted).toBe(false);
  });
});
