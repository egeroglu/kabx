import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { fonts, useColors } from '@/theme';

import { Body } from './ui';

export function ModeSwitch({ active }: { active: 'style' | 'wishlist' | 'cleanup' }) {
  const c = useColors();
  const modes = [
    { id: 'style', label: 'Stil', go: () => router.navigate('/discover') },
    { id: 'wishlist', label: 'Wishlist', go: () => router.push('/wishlist') },
    { id: 'cleanup', label: 'Temizlik', go: () => router.push('/cleanup') },
  ] as const;
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 16, backgroundColor: c.stage }}>
      {modes.map((m) => {
        const on = m.id === active;
        return (
          <Pressable
            key={m.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={on ? undefined : m.go}
            style={{ flex: 1, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.ink : 'transparent' }}>
            <Body weight={on ? 'bold' : 'semi'} size={14} color={on ? c.onInk : c.ink} style={{ fontFamily: on ? fonts.bodyBold : fonts.bodySemi }}>
              {m.label}
            </Body>
          </Pressable>
        );
      })}
    </View>
  );
}
