import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Badge, Body, Button, Title } from '@/components/ui';
import { STYLE_RESULT } from '@/data/mock';
import { fonts, palette, radius, useColors } from '@/theme';

const PERKS = ['Sınırsız swipe ile stil keşfi', 'Akıllı sıralamalı kombin oluşturucu', 'Her sabah havaya göre bugünün kombini', 'Wishlist ve gardırop temizliği modları'];

const PLANS = [
  { id: 'yearly', name: 'Yıllık', sub: 'Aylık 158,33 TL’ye denk', price: '1.899,99 TL', badge: '%20 indirim' },
  { id: 'monthly', name: 'Aylık', sub: 'İstediğin zaman iptal', price: '199,99 TL', badge: '' },
];

export default function Paywall() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState('yearly');

  const start = () => {
    // Gerçek uygulamada: RevenueCat purchasePackage(). Demo: doğrudan uygulamaya geç.
    router.dismissAll();
    router.replace('/today');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 12 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 18, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Badge label={`Stilin: ${STYLE_RESULT.primary} + ${STYLE_RESULT.secondary}`} tone="lilac" />
          <Pressable accessibilityRole="button" accessibilityLabel="Kapat" onPress={start} style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: c.stage, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={18} color={c.ink} strokeWidth={2.2} />
          </Pressable>
        </View>

        <Title size={36}>
          Gardırobun artık cebinde. <Text style={{ color: palette.accent.coralText }}>7 gün bizden.</Text>
        </Title>

        <View style={{ gap: 12 }}>
          {PERKS.map((p) => (
            <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check" size={15} color={c.onInk} strokeWidth={3} />
              </View>
              <Body weight="semi">{p}</Body>
            </View>
          ))}
        </View>

        <View accessibilityRole="radiogroup" style={{ gap: 12, marginTop: 4 }}>
          {PLANS.map((p) => {
            const on = plan === p.id;
            return (
              <Pressable
                key={p.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setPlan(p.id)}
                style={{ minHeight: 76, padding: 16, borderRadius: radius.lg, borderWidth: on ? 2.5 : 1, borderColor: on ? c.ink : c.line, backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 22, height: 22, borderRadius: 999, borderWidth: 2, borderColor: c.ink, alignItems: 'center', justifyContent: 'center' }}>
                  {on ? <View style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: palette.accent.coral }} /> : null}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Body weight="bold" size={16}>
                    {p.name}
                  </Body>
                  <Body muted size={13}>
                    {p.sub}
                  </Body>
                </View>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: c.ink }}>{p.price}</Text>
                {p.badge ? <Badge label={p.badge} tone="coral" style={{ position: 'absolute', right: 14, top: -12 }} /> : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 12, gap: 10 }}>
        <Button label="7 gün ücretsiz başla" height={58} onPress={start} />
        <Body muted size={11.5} style={{ textAlign: 'center' }}>
          Deneme bitince seçtiğin plan App Store / Google Play hesabından ücretlendirilir. Bitmeden istediğin zaman iptal edebilirsin.
        </Body>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18 }}>
          {['Satın alımı geri yükle', 'Koşullar', 'Gizlilik'].map((l) => (
            <Body key={l} size={12} weight="semi" style={{ textDecorationLine: 'underline', paddingVertical: 6 }}>
              {l}
            </Body>
          ))}
        </View>
      </View>
    </View>
  );
}
