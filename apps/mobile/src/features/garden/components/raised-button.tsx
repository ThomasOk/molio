import type { GardenPalette } from '../palette';
import * as React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

/** How far the face sinks under a finger, and the two clocks it moves on. */
const PRESS_SCALE = 0.965;
/** Down fast — the finger is already there, so the reaction must not lag it. */
const PRESS_IN_MS = 90;
/** Up slower, so releasing reads as the face rising back rather than snapping. */
const PRESS_OUT_MS = 220;

/**
 * A button with a face that stands off the paper.
 *
 * The XP bar's recipe inverted. There, coral is sunk into a groove by an inset
 * shadow at the TOP edge; here the same inset sits at the BOTTOM, which rounds
 * the face over toward the viewer instead of hollowing it. The highlight along
 * the top does the rest — it is the whole illusion, the shadows only seat it.
 *
 * That highlight is a BLURRED INSET, not the solid layer the XP bar paints over
 * its top 40%. At 14 px tall the bar's layer ends within a pixel or two of the
 * crest and nobody sees its edge; blown up to this button it draws a hard white
 * seam across the middle of the face. Light falling on a curve has no edge, so
 * the shadow's blur is doing the one thing a view cannot.
 *
 * The press is the other half of the affordance. A raised thing that does not
 * move under a finger stops being raised at exactly the moment you test it, so
 * the face sinks and dims, quickly down and slowly back — never a bounce, which
 * this app has ruled out everywhere. Under reduced motion the scale drops out
 * and only the dimming remains, so the press still answers.
 */
export function RaisedButton({
  palette,
  onPress,
  accessibilityLabel,
  children,
}: {
  palette: GardenPalette;
  onPress: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
}) {
  const { raised } = palette;
  const reduced = useReducedMotion();
  const press = useSharedValue(0);

  const rFace = useAnimatedStyle(() => ({
    opacity: 1 - 0.1 * press.get(),
    transform: [{ scale: reduced ? 1 : 1 - (1 - PRESS_SCALE) * press.get() }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={12}
      onPress={onPress}
      onPressIn={() =>
        press.set(withTiming(1, { duration: PRESS_IN_MS, easing: Easing.out(Easing.quad) }))}
      onPressOut={() =>
        press.set(withTiming(0, { duration: PRESS_OUT_MS, easing: Easing.out(Easing.cubic) }))}
    >
      <Animated.View
        style={[
          styles.face,
          {
            backgroundColor: raised.face,
            // Top inset = light on the crest, fading out; bottom inset = the face
            // curving over; ring = the bezel; then the drop that lifts it off the
            // paper. Read in paint order, front to back.
            boxShadow: `inset 0px 7px 9px ${raised.gloss}, inset 0px -3px 6px ${raised.seat}, 0px 0px 0px 1px ${raised.bezel}, 0px 4px 10px ${raised.shadow}`,
          },
          rFace,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 16,
    paddingRight: 20,
    paddingVertical: 13,
    borderRadius: 999,
  },
});
