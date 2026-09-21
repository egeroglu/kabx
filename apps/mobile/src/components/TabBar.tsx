import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import type Tabs from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, palette, useColors, useIsDark } from '@/theme';

import { Icon, type IconName } from './Icon';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS: Record<string, { label: string; icon: IconName; center?: boolean }> = {
  today: { label: 'Bugün', icon: 'sun' },
  wardrobe: { label: 'Gardırop', icon: 'hanger' },
  discover: { label: 'Keşfet', icon: 'cards', center: true },
  outfits: { label: 'Kombinler', icon: 'layers' },
  profile: { label: 'Profil', icon: 'user' },
};

export function TabBar({ state, navigation }: TabBarProps) {
  const c = useColors();
  const dark = useIsDark();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 12),
        backgroundColor: dark ? '#1B1814' : c.surface,
        borderTopWidth: 1,
        borderTopColor: c.line,
      }}>
      {state.routes.map((route, i) => {
        const meta = TABS[route.name];
        if (!meta) return null;
        const focused = state.index === i;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        if (meta.center) {
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={meta.label}
              accessibilityState={{ selected: focused }}
              onPress={onPress}
              style={({ pressed }) => ({
                width: 64,
                height: 64,
                marginBottom: 2,
                borderRadius: 22,
                backgroundColor: palette.accent.coral,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ rotate: '-4deg' }, { scale: pressed ? 0.94 : 1 }],
                shadowColor: palette.accent.coral,
                shadowOpacity: 0.35,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 8 },
                elevation: 6,
              })}>
              <Icon name="cards" size={30} color={palette.light.ink} />
            </Pressable>
          );
        }
        const color = focused ? c.ink : c.textMuted;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            onPress={onPress}
            style={{ width: 64, height: 52, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Icon name={meta.icon} size={24} color={color} strokeWidth={focused ? 2.2 : 1.7} />
            <Text style={{ fontFamily: focused ? fonts.bodyBold : fonts.bodyMedium, fontSize: 11, color }}>{meta.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
