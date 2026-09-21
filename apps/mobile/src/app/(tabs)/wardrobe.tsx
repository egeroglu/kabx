import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';

import { Garment } from '@/components/Garment';
import { Icon } from '@/components/Icon';
import { Badge, Body, Chip, Title } from '@/components/ui';
import { CATEGORY_LABEL, WARDROBE, type Category } from '@/data/mock';
import { useStore } from '@/data/store';
import { fonts, palette, radius, shadow, useColors } from '@/theme';

const CATS: (Category | 'all')[] = ['all', 'top', 'bottom', 'dress', 'shoes', 'outerwear', 'bag'];

export default function Wardrobe() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const donated = useStore((s) => s.donated);
  const [cat, setCat] = useState<Category | 'all'>('all');
  const [q, setQ] = useState('');
  const cell = (width - 32 - 20) / 3;

  const items = WARDROBE.filter((i) => !donated.includes(i.id))
    .filter((i) => cat === 'all' || i.category === cat)
    .filter((i) => !q || `${i.name} ${i.colorName} ${i.styles.join(' ')}`.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')));
  const busy = WARDROBE.filter((i) => i.processing).length;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: 64 }}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        numColumns={3}
        columnWrapperStyle={{ gap: 10, paddingHorizontal: 16 }}
        contentContainerStyle={{ gap: 10, paddingBottom: 120 }}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 20 }}>
              <View style={{ gap: 2 }}>
                <Title>Gardırop</Title>
                <Body muted size={13}>
                  {WARDROBE.length - donated.length} parça{busy ? ` · ${busy} tanesi işleniyor` : ''}
                </Body>
              </View>
              <Pressable onPress={() => router.push('/cleanup')} style={{ height: 36, paddingHorizontal: 12, borderRadius: 999, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="gift" size={16} color={c.ink} />
                <Body weight="bold" size={13}>
                  Temizlik
                </Body>
              </Pressable>
            </View>
            <View style={{ marginHorizontal: 16, height: 48, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name="search" size={18} color={c.textMuted} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Renk, parça veya stil ara"
                placeholderTextColor={c.textMuted}
                accessibilityLabel="Gardıropta ara"
                style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, color: c.ink }}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {CATS.map((k) => (
                <Chip key={k} label={CATEGORY_LABEL[k]} selected={cat === k} onPress={() => setCat(k)} />
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <Body muted style={{ textAlign: 'center', marginTop: 40 }}>
            Bu filtrede parça yok.
          </Body>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityLabel={item.name}
            onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
            style={({ pressed }) => ({ width: cell, height: 112, borderRadius: 20, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.96 : 1 }] })}>
            <Garment kind={item.kind} color={item.color} size={76} opacity={item.processing ? 0.45 : 1} />
            {item.processing ? <Badge label="Etiketleniyor…" tone="lilac" style={{ position: 'absolute', bottom: 8, alignSelf: 'center', paddingVertical: 3 }} /> : null}
          </Pressable>
        )}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Parça ekle"
        onPress={() => router.push('/add-items')}
        style={({ pressed }) => [
          { position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 20, backgroundColor: palette.light.ink, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] },
          shadow.card,
        ]}>
        <Icon name="plus" size={26} color={palette.light.bg} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}
