import { router } from 'expo-router';
import { useEffect } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OutfitCollage } from '@/components/Garment';
import { Body, Button } from '@/components/ui';
import { STYLE_RESULT } from '@/data/mock';
import { fonts, palette } from '@/theme';

function Bar({ value, color, delay }: { value: number; color: string; delay: number }) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withDelay(delay, withTiming(value, { duration: 700 }));
  }, [value, delay, w]);
  const style = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={{ flex: 1, height: 12, borderRadius: 999, backgroundColor: '#E2D8C9', overflow: 'hidden' }}>
      <Animated.View style={[{ height: 12, borderRadius: 999, backgroundColor: color }, style]} />
    </View>
  );
}

export default function StyleResult() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const inner = width - 40 - 40;
  const ink = palette.light.ink;

  return (
    <View style={{ flex: 1, backgroundColor: ink, paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 16, gap: 18 }}>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 1, color: palette.accent.coral }}>STİL TESTİN TAMAM</Text>

      <Animated.View
        entering={FadeInDown.duration(500).springify()}
        style={{ borderRadius: 32, backgroundColor: palette.light.bg, padding: 20, gap: 16, transform: [{ rotate: '-1.5deg' }] }}>
        <View>
          <Text style={{ fontFamily: fonts.display, fontSize: 50, letterSpacing: -1.5, lineHeight: 50, color: ink }}>{STYLE_RESULT.primary}</Text>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 30, letterSpacing: -0.6, color: ink }}>
            + bir tutam <Text style={{ backgroundColor: palette.accent.lilac }}> {STYLE_RESULT.secondary} </Text>
          </Text>
        </View>
        <View style={{ borderRadius: 22, overflow: 'hidden' }}>
          <OutfitCollage
            height={150}
            scale={inner / 330}
            background={palette.light.stage}
            pieces={[
              { kind: 'knit', color: '#F4E9D8', x: 10, y: 10, s: 130, r: -6 },
              { kind: 'jeans', color: '#7FA3D6', x: 118, y: 16, s: 120, r: 4 },
              { kind: 'sneaker', color: '#FFFFFF', x: 222, y: 40, s: 100, r: -3 },
            ]}
          />
        </View>
        <View style={{ gap: 10 }}>
          {STYLE_RESULT.mix.map((m, i) => (
            <View key={m.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Body weight="bold" size={14} color={ink} style={{ width: 92 }}>
                {m.label}
              </Body>
              <Bar value={m.value} color={m.color} delay={300 + i * 120} />
              <Body weight="bold" size={13} color={ink} style={{ width: 38, textAlign: 'right' }}>
                %{m.value}
              </Body>
            </View>
          ))}
        </View>
      </Animated.View>

      <Body size={15} color="#D9CFC2">
        Sade temeller, nötr tonlar ve arada bir renkli sürpriz. Keşfet’i bu zevke göre ayarladık, ama arada farklı stiller de göstereceğiz.
      </Body>

      <View style={{ flex: 1 }} />
      <View style={{ gap: 10 }}>
        <Button label="Gardırobumu kuralım" variant="accent" height={56} onPress={() => router.push('/onboarding/paywall')} />
        <Button label="Stil kartımı paylaş" variant="secondary" height={48} textColor="#F5EFE6" style={{ borderColor: '#6A6158' }} />
      </View>
    </View>
  );
}
