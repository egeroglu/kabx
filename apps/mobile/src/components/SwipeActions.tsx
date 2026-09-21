import { Pressable, View } from 'react-native';

import { palette, shadow, sizes, useColors } from '@/theme';

import { Icon } from './Icon';

export function SwipeActions({ onNo, onUndo, onYes, noLabel, yesLabel }: { onNo: () => void; onUndo: () => void; onYes: () => void; noLabel: string; yesLabel: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={noLabel}
        onPress={onNo}
        style={({ pressed }) => ({ width: sizes.swipeMain, height: sizes.swipeMain, borderRadius: 999, borderWidth: 1.5, borderColor: c.ink, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.92 : 1 }] })}>
        <Icon name="x" size={26} color={c.ink} strokeWidth={2.4} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Geri al"
        onPress={onUndo}
        style={({ pressed }) => ({ width: sizes.swipeUndo, height: sizes.swipeUndo, borderRadius: 999, backgroundColor: c.stage, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.9 : 1 }] })}>
        <Icon name="undo" size={20} color={c.ink} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={yesLabel}
        onPress={onYes}
        style={({ pressed }) => [
          { width: sizes.swipeMain, height: sizes.swipeMain, borderRadius: 999, backgroundColor: palette.accent.coral, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.92 : 1 }] },
          shadow.coralGlow,
        ]}>
        <Icon name="heart" size={28} color={palette.light.ink} />
      </Pressable>
    </View>
  );
}
