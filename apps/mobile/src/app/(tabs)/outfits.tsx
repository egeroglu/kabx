import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { Garment } from '@/components/Garment';
import { Icon } from '@/components/Icon';
import { Badge, Body, Button, Chip, Heading } from '@/components/ui';
import { WARDROBE, matchBadge, rankCandidates, type Category, type WardrobeItem } from '@/data/mock';
import { useStore } from '@/data/store';
import { palette, useColors } from '@/theme';

type SlotId = 'top' | 'bottom' | 'shoes';
const SLOTS: { id: SlotId; label: string; cats: Category[] }[] = [
  { id: 'top', label: 'Üst', cats: ['top', 'outerwear'] },
  { id: 'bottom', label: 'Alt', cats: ['bottom'] },
  { id: 'shoes', label: 'Ayakkabı', cats: ['shoes'] },
];
const OCCASIONS = ['İş', 'Günlük', 'Davet', 'Buluşma'];

export default function OutfitBuilder() {
  const c = useColors();
  const { wish } = useLocalSearchParams<{ wish?: string }>();
  const wishlist = useStore((s) => s.wishlist);
  const wishItem = wish ? wishlist.find((w) => w.id === wish) : undefined;
  const donated = useStore((s) => s.donated);
  const [sel, setSel] = useState<Record<SlotId, string | null>>({ top: 'shirt-white', bottom: null, shoes: null });
  const [occasion, setOccasion] = useState('İş');
  const [saved, setSaved] = useState(false);

  const selectedItems = (except: SlotId) =>
    (Object.entries(sel) as [SlotId, string | null][])
      .filter(([k, v]) => k !== except && v)
      .map(([, v]) => WARDROBE.find((i) => i.id === v) as WardrobeItem);

  const top = sel.top ? WARDROBE.find((i) => i.id === sel.top) : undefined;
  const tip = top && top.formality >= 4 ? 'Resmi bir parça seçtin. Alt ve ayakkabıda resmi parçalar önde.' : 'Bir parça seç; diğer slotlar ona göre sıralansın.';

  const pick = (slot: SlotId, id: string) => {
    Haptics.selectionAsync();
    setSaved(false);
    setSel((s) => ({ ...s, [slot]: s[slot] === id ? null : id }));
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: 64, paddingBottom: 110, gap: 16 }}>
        <View style={{ paddingHorizontal: 20 }}>
          <Heading size={30} style={{ letterSpacing: -0.6 }}>
            Yeni kombin
          </Heading>
        </View>

        <View style={{ marginHorizontal: 16, padding: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: palette.accent.lilacSoft, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Icon name="sparkle" size={20} color={palette.light.ink} />
          <Body size={13} color={palette.light.ink} style={{ flex: 1 }}>
            {tip}
          </Body>
        </View>

        {wishItem ? (
          <View style={{ gap: 8 }}>
            <Body weight="bold" style={{ paddingHorizontal: 20 }}>
              Wishlist’ten deniyorsun
            </Body>
            <View style={{ marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 20, backgroundColor: c.surface, borderWidth: 2.5, borderColor: palette.accent.coral }}>
              <View style={{ width: 80, height: 80, borderRadius: 16, backgroundColor: wishItem.stage, alignItems: 'center', justifyContent: 'center' }}>
                <Garment kind={wishItem.kind} color={wishItem.color} size={60} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Body weight="bold">{wishItem.name}</Body>
                <Badge label="Henüz sende yok" tone="peach" />
              </View>
            </View>
          </View>
        ) : null}

        {SLOTS.map((slot) => {
          const pool = WARDROBE.filter((i) => slot.cats.includes(i.category) && !donated.includes(i.id) && !i.processing);
          const ranked = rankCandidates(pool, selectedItems(slot.id));
          const hasContext = selectedItems(slot.id).length > 0;
          return (
            <View key={slot.id} style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 }}>
                <Body weight="bold">{slot.label}</Body>
                <Body muted size={12}>
                  {sel[slot.id] ? 'Seçildi' : hasContext ? 'Uyuma göre sıralı' : 'Bir parça seç'}
                </Body>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
                {ranked.map(({ item, score }) => {
                  const on = sel[slot.id] === item.id;
                  const badge = !on && hasContext ? matchBadge(score) : null;
                  const low = hasContext && !on && score < 0.55;
                  return (
                    <Animated.View key={item.id} layout={LinearTransition.springify().damping(18)}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={item.name}
                        accessibilityState={{ selected: on }}
                        onPress={() => pick(slot.id, item.id)}
                        style={{ width: 100, height: 100, borderRadius: 20, backgroundColor: c.surface, borderWidth: on ? 2.5 : 1, borderColor: on ? c.ink : c.line, alignItems: 'center', justifyContent: 'center', opacity: low ? 0.5 : 1 }}>
                        <Garment kind={item.kind} color={item.color} size={70} />
                        {on ? (
                          <View style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 999, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="check" size={13} color={c.onInk} strokeWidth={3} />
                          </View>
                        ) : null}
                        {badge ? <Badge label={badge.label} tone={badge.tone} style={{ position: 'absolute', left: 6, bottom: 6, paddingHorizontal: 7, paddingVertical: 3 }} /> : null}
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </ScrollView>
            </View>
          );
        })}

        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
          <Button label="+ Dış giyim" variant="dashed" height={44} style={{ flex: 1 }} />
          <Button label="+ Aksesuar" variant="dashed" height={44} style={{ flex: 1 }} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {OCCASIONS.map((o) => (
            <Chip key={o} label={o} selected={occasion === o} onPress={() => setOccasion(o)} />
          ))}
        </ScrollView>
      </ScrollView>

      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
        <Button
          label={saved ? 'Kombin kaydedildi' : 'Kombini kaydet'}
          icon={saved ? 'check' : undefined}
          height={56}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setSaved(true);
          }}
        />
      </View>
    </View>
  );
}
