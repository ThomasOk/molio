import type { TextProps } from 'react-native';
import type { TxKeyPath } from '@/lib/i18n';
import * as React from 'react';
import { Text as RNText } from 'react-native';
import { tv } from 'tailwind-variants';

import { translate } from '@/lib/i18n';

/**
 * The Stride type scale, straight from the Claude Design system sheet.
 *
 * Screens pick a variant instead of restating sizes, weights and tracking, so
 * the scale stays in one place. Letter spacing is expressed in px rather than
 * em because React Native's `letterSpacing` is absolute.
 */
const strideText = tv({
  base: 'font-stride text-stride-text',
  variants: {
    variant: {
      /** 58 / 800 / -4.5% — the step count on Home. The hero number. */
      'hero': 'font-stride-black text-[58px] leading-[52px] tracking-[-2.6px]',
      /** 44 / 800 / -4% — large metric on Stats and share cards. */
      'metric': 'font-stride-black text-[44px] leading-[44px] tracking-[-1.8px]',
      /** 24 / 800 / -3% — the number inside a stat card. */
      'metric-md': 'font-stride-black text-[24px] leading-[28px] tracking-[-0.7px]',
      /** 17 / 800 — inline metric, e.g. the level number. */
      'metric-sm': 'font-stride-black text-[17px] leading-[20px]',
      /** 28 / 700 / -2% */
      'h1': 'font-stride-bold text-[28px] leading-[32px] tracking-[-0.56px]',
      /** 20 / 700 */
      'h2': 'font-stride-bold text-[20px] leading-[26px]',
      /** 19 / 700 — screen title, e.g. "Today". */
      'title': 'font-stride-bold text-[19px] leading-[24px]',
      /** 17 / 700 */
      'h3': 'font-stride-bold text-[17px] leading-[22px]',
      /** 14 / 700 — section heading above a card. */
      'section': 'font-stride-bold text-[14px] leading-[18px]',
      /** 15 / 500 / 1.55 */
      'body': 'font-stride-medium text-[15px] leading-[23px] text-stride-text-body',
      /** 15 / 600 — the coaching line under the gauge. */
      'message': 'font-stride-semibold text-[15px] leading-[22px] text-stride-text-body',
      /** 13 / 500 */
      'caption': 'font-stride-medium text-[13px] leading-[18px] text-stride-text-secondary',
      /** mono 10 / .14em — uppercase eyebrow. */
      'label': 'font-stride-mono text-[10px] leading-[14px] tracking-[1.4px] text-stride-label uppercase',
      /** mono 9 / .1em — the label under a stat-card number. */
      'label-sm': 'font-stride-mono text-[9px] leading-[12px] tracking-[0.9px] text-stride-label uppercase',
      /** mono 11 — inline mono value, e.g. "3,240 / 4,000". */
      'mono': 'font-stride-mono text-[11px] leading-[15px] text-stride-label',
    },
  },
  defaultVariants: { variant: 'body' },
});

/** Variants that render numbers and must not jitter as digits change. */
const TABULAR = new Set(['hero', 'metric', 'metric-md', 'metric-sm', 'mono']);

/** Dense variants where unbounded text scaling would destroy the layout. */
const SCALE_CAP: Record<string, number> = {
  'hero': 1.2,
  'metric': 1.2,
  'metric-md': 1.3,
  'metric-sm': 1.3,
  'label': 1.4,
  'label-sm': 1.4,
  'mono': 1.4,
};

export type StrideTextVariant = keyof typeof strideText.variants.variant;

type Props = {
  variant?: StrideTextVariant;
  className?: string;
  tx?: TxKeyPath;
} & TextProps;

export function StrideText({
  variant = 'body',
  className,
  tx,
  children,
  style,
  ...props
}: Props) {
  const textClassName = React.useMemo(
    () => strideText({ variant, className }),
    [variant, className],
  );

  return (
    <RNText
      className={textClassName}
      maxFontSizeMultiplier={SCALE_CAP[variant]}
      style={
        TABULAR.has(variant)
          ? [{ fontVariant: ['tabular-nums' as const] }, style]
          : style
      }
      {...props}
    >
      {tx ? translate(tx) : children}
    </RNText>
  );
}
