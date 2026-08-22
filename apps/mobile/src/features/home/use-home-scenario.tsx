import type { ProgressVariant } from '@/features/progress';
import type { ScenarioId } from '@/features/progress/mock-data';
import { create } from 'zustand';

import { DEFAULT_PROGRESS_VARIANT } from '@/features/progress';
import { createSelectors } from '@/lib/utils';

/**
 * Which mocked scenario and visualisation Home renders.
 *
 * This is a development affordance, not product state: it exists so every Home
 * state can be reviewed against the design without waiting for real health
 * data. When the health service layer lands, `scenario` disappears and
 * `variant` moves to real user/experiment settings.
 */
type HomeScenarioState = {
  scenario: ScenarioId;
  variant: ProgressVariant;
  setScenario: (scenario: ScenarioId) => void;
  setVariant: (variant: ProgressVariant) => void;
};

const _useHomeScenario = create<HomeScenarioState>(set => ({
  scenario: 'low-progress',
  variant: DEFAULT_PROGRESS_VARIANT,
  setScenario: scenario => set({ scenario }),
  setVariant: variant => set({ variant }),
}));

export const useHomeScenario = createSelectors(_useHomeScenario);
