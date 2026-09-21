import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Garment } from '@/components/Garment';
import { Icon } from '@/components/Icon';
import { Body, Button, IconButton, Title } from '@/components/ui';
import { CATEGORY_LABEL, WARDROBE, findItem } from '@/data/mock';
import { palette, useColors } from '@/theme';

export default function ItemDetail() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = findItem(id) ?? WARDROBE[0];
  const similar = WARDROBE.filter((i) => i.id !== item.id && i.kind === item.kind);

  const rows: { k: string; v: string; swatch?: string }[] = [
    { k: 'Kategori', v: CATEGORY_LABEL[item.category] },
    { k: 'Renk', v: item.colorName, swatch: item.color },
    { k: 'Desen', v: item.pattern },
    { k: 'Kumaş', v: item.material },
    { k: 'Mevsim', v: item.seasons.join(', ') },
    { k: 'Resmiyet', v: `${item.formality} / 5` },
    { k: 'Stil', v: item.styles.join(', ') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 110, gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <IconButton icon="back" label="Geri" onPress={() => router.back()} />
          <IconButton icon="more" label="Daha fazla" />
        </View>

        <View style={{ height: 200, borderRadius: 28, backgroundColor: c.stage, alignItems: 'center', justifyContent: 'center' }}>
          <Garment kind={item.kind} color={item.color} size={170} rotate={-4} withShadow />
          <View style={{ position: 'absolute', left: 14, bottom: 14, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: c.surface }}>
            <Body weight="bold" size={12}>
              {item.wearCount} kez giyildi · son {item.lastWorn}
            </Body>
          </View>
        </View>

        <View style={{ gap: 4 }}>
          <Title size={26}>{item.name}</Title>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="sparkle" size={14} color={c.textMuted} />
            <Body muted size={13}>
              {item.processing ? 'Yapay zekâ etiketliyor…' : 'Yapay zekâ etiketledi. Dokunarak düzeltebilirsin.'}
            </Body>
          </View>
        </View>

        <View style={{ borderRadius: 20, backgroundColor: c.surface }}>
          {rows.map((r, i) => (
            <View key={r.k} style={{ minHeight: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: i === rows.length - 1 ? 0 : 1, borderBottomColor: c.line }}>
              <Body muted size={14}>
                {r.k}
              </Body>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {r.swatch ? <View style={{ width: 16, height: 16, borderRadius: 999, backgroundColor: r.swatch, borderWidth: 1, borderColor: palette.light.ink }} /> : null}
                <Body weight="bold" size={14}>
                  {r.v}
                </Body>
              </View>
            </View>
          ))}
        </View>

        {similar.length > 0 ? (
          <View style={{ padding: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: palette.accent.peach, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flexDirection: 'row' }}>
              {similar.slice(0, 2).map((s, i) => (
                <View key={s.id} style={{ width: 40, height: 40, marginLeft: i ? -10 : 0, borderRadius: 12, backgroundColor: palette.light.surface, borderWidth: 2, borderColor: palette.accent.peach, alignItems: 'center', justifyContent: 'center' }}>
                  <Garment kind={s.kind} color={s.color} size={30} />
                </View>
              ))}
            </View>
            <Body size={13} color={palette.light.ink} style={{ flex: 1 }}>
              <Body weight="bold" size={13} color={palette.light.ink}>
                Benzeri var:{' '}
              </Body>
              {similar.length} benzer parçan daha var.
            </Body>
          </View>
        ) : null}
      </ScrollView>
      <View style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 12 }}>
        <Button label="Bununla kombin yap" height={56} onPress={() => router.navigate('/outfits')} />
      </View>
    </View>
  );
}
