import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Garment, type GarmentKind } from '@/components/Garment';
import { Badge, Body, Button, Heading, IconButton, ProgressBar } from '@/components/ui';
import { palette, useColors } from '@/theme';

type Stage = 'bg' | 'tag' | 'ready';
const PICKS: { kind: GarmentKind; color: string; label: string }[] = [
  { kind: 'tee', color: '#A99BF5', label: 'Tişört · Lila' },
  { kind: 'skirt', color: '#C99A6B', label: 'Etek · Bej' },
  { kind: 'dress', color: '#2F3B2C', label: 'Elbise · Haki' },
  { kind: 'sneaker', color: '#FFFFFF', label: 'Sneaker · Beyaz' },
  { kind: 'knit', color: '#E9C46A', label: 'Triko · Sarı' },
  { kind: 'bag', color: '#F0643A', label: 'Çanta · Mercan' },
];

// Demo: gerçek uygulamada arka plan cihazda silinir, etiketler backend'den gelir.
export default function AddItems() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [run, setRun] = useState(0);
  const [stages, setStages] = useState<Stage[]>(PICKS.map(() => 'bg'));
  const cell = (width - 32 - 10) / 2;

  useEffect(() => {
    setStages(PICKS.map(() => 'bg'));
    const timers: ReturnType<typeof setTimeout>[] = [];
    PICKS.forEach((_, i) => {
      timers.push(setTimeout(() => setStages((s) => s.map((v, j) => (j === i ? 'tag' : v))), 600 + i * 450));
      timers.push(setTimeout(() => setStages((s) => s.map((v, j) => (j === i ? 'ready' : v))), 1600 + i * 700));
    });
    return () => timers.forEach(clearTimeout);
  }, [run]);

  const ready = stages.filter((s) => s === 'ready').length;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 120, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton icon="x" label="Kapat" onPress={() => router.back()} />
          <Heading>Parça ekle</Heading>
          <View style={{ width: 44 }} />
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button label="Fotoğraf çek" icon="camera" height={64} style={{ flex: 1 }} onPress={() => setRun((r) => r + 1)} />
          <Button label="Galeriden seç" icon="gallery" variant="secondary" height={64} style={{ flex: 1 }} onPress={() => setRun((r) => r + 1)} />
        </View>

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Body weight="bold">{PICKS.length} fotoğraf seçildi</Body>
            <Body weight="bold" size={13}>
              {ready} / {PICKS.length} hazır
            </Body>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <ProgressBar value={ready / PICKS.length} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {PICKS.map((p, i) => {
            const st = stages[i];
            const bg = st === 'ready' ? c.surface : st === 'tag' ? palette.accent.lilacSoft : '#D8CFC2';
            return (
              <View key={i} style={{ width: cell, height: 150, borderRadius: 22, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <Garment kind={p.kind} color={p.color} size={104} withShadow={st === 'ready'} opacity={st === 'ready' ? 1 : st === 'tag' ? 0.55 : 0.35} />
                {st === 'ready' ? (
                  <Animated.View entering={FadeIn} style={{ position: 'absolute', left: 10, top: 10 }}>
                    <Body weight="bold" size={12}>
                      {p.label}
                    </Body>
                  </Animated.View>
                ) : null}
                <Badge
                  label={st === 'ready' ? 'Hazır' : st === 'tag' ? 'Etiketleniyor…' : 'Arka plan siliniyor…'}
                  textColor={st === 'ready' ? palette.light.bg : undefined}
                  style={{ position: 'absolute', left: 8, bottom: 8, backgroundColor: st === 'ready' ? palette.light.ink : palette.light.surface }}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>
      <View style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 12, gap: 6 }}>
        <Button label={`Hazır olan ${ready} parçayı ekle`} height={56} onPress={() => router.back()} />
        <Body muted size={12} style={{ textAlign: 'center' }}>
          Diğerleri arka planda bitince gardırobuna düşer.
        </Body>
      </View>
    </View>
  );
}
