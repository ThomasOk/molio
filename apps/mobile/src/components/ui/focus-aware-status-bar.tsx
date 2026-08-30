import { useIsFocused } from '@react-navigation/native';
import * as React from 'react';
import { Platform } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';
import { useUniwind } from 'uniwind';

type Props = {
  hidden?: boolean;
  /**
   * Force the icon colour instead of deriving it from the system theme. For a
   * screen pinned to one background regardless of dark mode — the garden's
   * `ComingSoonScreen` placeholders, which stay on the light `gardenPalettes`
   * paper until Home has dark art (ADR 0001) — the icons must stay pinned too.
   */
  style?: 'dark' | 'light';
};
export function FocusAwareStatusBar({ hidden = false, style }: Props) {
  const isFocused = useIsFocused();
  const { theme } = useUniwind();

  if (Platform.OS === 'web')
    return null;

  return isFocused
    ? (
        <SystemBars
          style={style ?? (theme === 'light' ? 'dark' : 'light')}
          hidden={hidden}
        />
      )
    : null;
}
