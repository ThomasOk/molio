import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';

/**
 * Loads the two Stride typefaces at runtime.
 *
 * The template registers Inter through the `expo-font` config plugin, which
 * embeds fonts natively. These are loaded at runtime instead so the keys below
 * are the exact `fontFamily` strings React Native resolves — RN cannot
 * synthesise weights for custom fonts, so each weight is its own family, and
 * the names must match `strideFonts` / the `--font-stride-*` tokens.
 */
export function useStrideFonts(): boolean {
  const [loaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  return loaded;
}
