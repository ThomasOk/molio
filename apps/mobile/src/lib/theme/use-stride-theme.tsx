import type { StridePalette, StrideScheme } from './stride-tokens';
import * as React from 'react';
import { useUniwind } from 'uniwind';

import { stridePalettes, strideProgressRamp } from './stride-tokens';

export type StrideTheme = {
  scheme: StrideScheme;
  isDark: boolean;
  colors: StridePalette;
  /** Eight-step fill ramp indexed by progress tier. */
  ramp: readonly string[];
};

/**
 * Resolves the active Stride palette from the app's Uniwind theme.
 *
 * Product UI should style itself with `className` + the `stride-*` tokens in
 * `global.css`; this hook exists for the progress-visualisation layer, whose
 * colours are computed from data rather than picked from a fixed set.
 */
export function useStrideTheme(): StrideTheme {
  const { theme } = useUniwind();
  const scheme: StrideScheme = theme === 'dark' ? 'dark' : 'light';

  return React.useMemo(
    () => ({
      scheme,
      isDark: scheme === 'dark',
      colors: stridePalettes[scheme],
      ramp: strideProgressRamp[scheme],
    }),
    [scheme],
  );
}
