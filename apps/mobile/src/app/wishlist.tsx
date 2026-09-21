import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Garment } from '@/components/Garment';
import { Icon } from '@/components/Icon';
import { ModeSwitch } from '@/components/ModeSwitch';
import { Badge, Body, Button, IconButton, Title } from '@/components/ui';
import { useStore } from '@/data/store';
import { palette, useColors } from '@/theme';

export default function Wishlist() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const items = useStore((s) => s.wishlist);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconButton icon="back" label="Geri" onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Title size={30}>Wishlist</Title>
        </View>
      </View>
      <ModeSwitch active="wishlist" />
      <Body muted size={13} style={{ paddingHorizontal: 4 }}>
        {items.length} parça · Keşfet’te beğendiklerin buraya düşer
      </Body>

      <Pressable onPress={() => router.push('/wishlist-review')} style={{ padding: 14, paddingHorizontal: 16, borderRadius: 20, backgroundColor: palette.light.ink, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: palette.accent.coral, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="cards" size={22} color={palette.light.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Body weight="bold" color={palette.light.bg}>
            Hâlâ istiyor musun?
          </Body>
          <Body size={12} color="#D9CFC2">
            Wishlist’i kaydırarak ayıkla
          </Body>
        </View>
        <Icon name="arrowRight" size={20} color={palette.light.bg} />
      </Pressable>

      {items.map((it) => (
        <View key={it.id} style={{ padding: 12, borderRadius: 22, backgroundColor: c.surface, gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={{ width: 76, height: 76, borderRadius: 16, backgroundColor: it.stage, alignItems: 'center', justifyContent: 'center' }}>
              <Garment kind={it.kind} color={it.color} size={58} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Body muted size={12} weight="semi">
                {it.store}
              </Body>
              <Body weight="bold">{it.name}</Body>
              <Body muted size={13}>
                Kaydederken {it.price}
              </Body>
            </View>
          </View>
          {it.warn ? <Badge label={it.warn} tone="peach" /> : null}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Bunu alsam mı?" variant="secondary" height={44} style={{ flex: 1 }} onPress={() => router.navigate({ pathname: '/outfits', params: { wish: it.id } })} />
            <Button label="Mağazaya git" height={44} style={{ flex: 1 }} onPress={() => Linking.openURL('https://example.com')} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
