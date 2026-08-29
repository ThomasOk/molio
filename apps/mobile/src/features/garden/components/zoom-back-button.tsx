import { Pressable, StyleSheet, Text } from 'react-native';

import { strideFonts } from '@/lib/theme';

/**
 * The way out of a zoom, for anyone who does not think to swipe down.
 *
 * It names where it goes — « ‹ août », « ‹ Mon activité » — the way an iOS back
 * button carries the title of the screen behind it. The zooms stack three deep
 * at the same corner of the same screen, so a bare "Retour" on each would be
 * the same word meaning three different things; the destination is the only
 * thing that tells them apart.
 */
export function ZoomBackButton({
  label,
  color,
  top,
  onPress,
}: {
  /** Where it goes back to, as that place calls itself. */
  label: string;
  color: string;
  top: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Retour vers ${label}`}
      hitSlop={16}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { top, opacity: pressed ? 0.5 : 1 }]}
    >
      <Text style={[styles.label, { color }]}>{`‹ ${label}`}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: 20,
    zIndex: 1,
  },
  label: {
    fontFamily: strideFonts.medium,
    fontSize: 15,
    lineHeight: 20,
  },
});
