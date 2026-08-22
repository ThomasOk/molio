import type { ProgressVariant } from '@/features/progress';
import type { ScenarioId } from '@/features/progress/mock-data';
import { Pressable, View } from 'react-native';

import { StrideText } from '@/components/ui/stride-text';
import { useHomeScenario } from '@/features/home/use-home-scenario';
import { SCENARIO_IDS, SCENARIO_LABELS } from '@/features/progress/mock-data';

const VARIANTS: { id: ProgressVariant; label: string }[] = [
  { id: 'refined-grid', label: 'Refined Grid' },
  { id: 'living-cells', label: 'Living Cells' },
];

/**
 * Development-only control for flipping between mocked states and the two
 * visualisation variants.
 *
 * It renders nothing outside `__DEV__`, and it lives at the bottom of the
 * scroll so it never competes with the screen's real hierarchy.
 */
export function ScenarioSwitcher() {
  const scenario = useHomeScenario.use.scenario();
  const variant = useHomeScenario.use.variant();
  const setScenario = useHomeScenario.use.setScenario();
  const setVariant = useHomeScenario.use.setVariant();

  if (!__DEV__)
    return null;

  return (
    <View className="mt-8 gap-[10px] border-t border-stride-hairline pt-4">
      <StrideText variant="label-sm">Dev · mock state</StrideText>

      <View className="flex-row flex-wrap gap-[6px]">
        {SCENARIO_IDS.map(id => (
          <Chip
            key={id}
            label={SCENARIO_LABELS[id]}
            active={id === scenario}
            onPress={() => setScenario(id as ScenarioId)}
          />
        ))}
      </View>

      <View className="flex-row flex-wrap gap-[6px]">
        {VARIANTS.map(item => (
          <Chip
            key={item.id}
            label={item.label}
            active={item.id === variant}
            onPress={() => setVariant(item.id)}
          />
        ))}
      </View>
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={6}
      onPress={onPress}
      className={`
        rounded-lg border px-[9px] py-[7px]
        ${active
      ? 'border-stride-accent-ring bg-stride-raised'
      : 'border-stride-hairline bg-stride-surface'}
      `}
    >
      <StrideText
        variant="label-sm"
        className={active ? 'text-stride-text' : 'text-stride-muted'}
      >
        {label}
      </StrideText>
    </Pressable>
  );
}
