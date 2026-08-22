import type { ProgressTier } from './tiers';
import type { StrideTheme } from '@/lib/theme';

import { stridePalettes, strideProgressRamp } from '@/lib/theme';
import { dayCellVisual } from './cell-visual';

const darkTheme: StrideTheme = {
  scheme: 'dark',
  isDark: true,
  colors: stridePalettes.dark,
  ramp: strideProgressRamp.dark,
};

const lightTheme: StrideTheme = {
  scheme: 'light',
  isDark: false,
  colors: stridePalettes.light,
  ramp: strideProgressRamp.light,
};

function visual(tier: ProgressTier, overrides = {}) {
  return dayCellVisual({
    variant: 'refined-grid',
    tier,
    size: 26,
    theme: darkTheme,
    ...overrides,
  });
}

describe('dayCellVisual', () => {
  it('keeps every cell in a fixed box so the grid never shifts', () => {
    for (const tier of [-1, 0, 3, 5, 7] as ProgressTier[]) {
      expect(visual(tier).box).toMatchObject({ width: 26, height: 26 });
      expect(visual(tier, { variant: 'living-cells' }).box).toMatchObject({
        width: 26,
        height: 26,
      });
    }
  });

  it('walks the ramp as the tier climbs', () => {
    expect(visual(1).inner.backgroundColor).toBe(strideProgressRamp.dark[1]);
    expect(visual(5).inner.backgroundColor).toBe(strideProgressRamp.dark[5]);
    expect(visual(7).inner.backgroundColor).toBe(strideProgressRamp.dark[7]);
  });

  it('glows only from the goal tier upwards, and only in the dark', () => {
    const belowGoal = visual(4).inner.boxShadow as unknown[];
    const atGoal = visual(5).inner.boxShadow as unknown[];

    expect(belowGoal).toHaveLength(1); // top-edge highlight only
    expect(atGoal).toHaveLength(2); // highlight + glow

    const lightAtGoal = visual(5, { theme: lightTheme }).inner.boxShadow;
    expect(lightAtGoal).toBeUndefined();
  });

  it('draws an unmeasured day as an outline, not as a zero-step day', () => {
    const noData = visual(-1).inner;
    const zeroSteps = visual(0).inner;

    expect(noData.backgroundColor).toBe('transparent');
    expect(noData.borderWidth).toBe(1);
    expect(zeroSteps.backgroundColor).toBe(strideProgressRamp.dark[0]);
  });

  it('marks today with a ring and a partial fill rather than a colour', () => {
    const today = dayCellVisual({
      variant: 'refined-grid',
      tier: 4,
      size: 26,
      theme: darkTheme,
      isToday: true,
      percentage: 80,
    });

    expect(today.inner.borderWidth).toBe(1);
    expect(today.todayFillRatio).toBe(0.8);
    expect(today.todayFillColor).toBe(stridePalettes.dark.accent);
  });

  it('clamps an over-goal today to a full cell', () => {
    const today = dayCellVisual({
      variant: 'refined-grid',
      tier: 5,
      size: 26,
      theme: darkTheme,
      isToday: true,
      percentage: 240,
    });

    expect(today.todayFillRatio).toBe(1);
  });

  it('rings a selected day so selection survives without colour', () => {
    expect(visual(3, { isSelected: true }).inner.borderWidth).toBe(1.5);
    expect(visual(3, { isSelected: true }).inner.borderColor).toBe(
      stridePalettes.dark.focusRing,
    );
  });
});

describe('variant interchangeability', () => {
  it('produces squares for Refined Grid and circles for Living Cells', () => {
    const grid = visual(5).inner;
    const cells = visual(5, { variant: 'living-cells' }).inner;

    expect(grid.borderRadius).toBeLessThan(Number(grid.width) / 2);
    expect(cells.borderRadius).toBe(Number(cells.width) / 2);
  });

  it('uses scale as Living Cells\' signal and fill as Refined Grid\'s', () => {
    const gridLow = Number(visual(1).inner.width);
    const gridHigh = Number(visual(7).inner.width);
    const cellsLow = Number(visual(1, { variant: 'living-cells' }).inner.width);
    const cellsHigh = Number(visual(7, { variant: 'living-cells' }).inner.width);

    expect(gridHigh - gridLow).toBeLessThan(cellsHigh - cellsLow);
  });

  it('gives Living Cells a specular core on the top tiers only', () => {
    expect(visual(4, { variant: 'living-cells' }).coreHighlight).toBeNull();
    expect(visual(6, { variant: 'living-cells' }).coreHighlight).not.toBeNull();
    expect(visual(6).coreHighlight).toBeNull();
  });
});
