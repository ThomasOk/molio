import type { SharedValue } from 'react-native-reanimated';
import * as React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import Animated, { useAnimatedProps } from 'react-native-reanimated';

import { strideFonts } from '@/lib/theme';
import { formatSteps, MAX_STEPS } from '../bloom';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type Props = {
  progress: SharedValue<number>;
  color: string;
};

/**
 * The step counter, animated without a single React render.
 *
 * A number that counts up is the classic way to accidentally ship one
 * `setState` per frame. The way out is a read-only `TextInput`: `text` is an
 * internal RN prop that Reanimated can drive straight from the UI thread, so
 * the digits change on every frame while React sits still.
 *
 * `tabular-nums` is not decoration — without it the digits change width as they
 * roll and the whole number visibly trembles.
 */
export function AnimatedSteps({ progress, color }: Props) {
  const animatedProps = useAnimatedProps(
    () =>
      ({
        text: formatSteps(progress.get() * MAX_STEPS),

      }) as any,
  );

  return (
    <AnimatedTextInput
      editable={false}
      allowFontScaling={false}
      pointerEvents="none"
      underlineColorAndroid="transparent"
      accessible={false}
      defaultValue={formatSteps(0)}
      animatedProps={animatedProps}
      style={[styles.steps, { color }]}
    />
  );
}

const styles = StyleSheet.create({
  steps: {
    // Sized so the widest value the range can show — "20 000" — sits inside the
    // ring with clear margin, tabular so the digits never jitter as they roll.
    width: 200,
    padding: 0,
    margin: 0,
    textAlign: 'center',
    fontFamily: strideFonts.black,
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -1.6,
    includeFontPadding: false,
    fontVariant: ['tabular-nums'],
  },
});
