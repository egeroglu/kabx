import { router } from 'expo-router';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

import { Garment, OutfitCollage } from '@/components/Garment';
import { Icon } from '@/components/Icon';
import { Body, Button, Heading, Title } from '@/components/ui';
import { TODAY_LOOK } from '@/data/mock';
import { actions, useStore } from '@/data/store';
import { palette, radius, useColors } from '@/theme';

export default function Today() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const worn = useStore((s) => s.wornToday);
  const collageW = width - 32 - 28;
  const date = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: 64, paddingHorizontal: 16, paddingBottom: 32, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 4 }}>
        <View style={{ gap: 2 }}>
          <Body muted size={13} weight="medium" style={{ textTransform: 'capitalize' }}>
            {date}
          </Body>
          <Title>Günaydın!</Title>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line }}>
          <Icon name="cloud" size={22} color={c.ink} strokeWidth={1.8} />
          <View>
            <Body weight="bold" size={15}>
              22°
            </Body>
            <Body muted size={11}>
              İstanbul
            </Body>
          </View>
        </View>
      </View>

      <View style={{ backgroundColor: c.surface, borderRadius: 28, padding: 14, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="sparkle" size={16} color={palette.accent.coral} />
            <Body weight="bold" size={12} style={{ letterSpacing: 0.5 }}>
              BUGÜNÜN KOMBİNİ
            </Body>
          </View>
          <Body muted size={12}>
            Kayıtlı kombinlerinden
          </Body>
        </View>
        <View style={{ borderRadius: 20, overflow: 'hidden' }}>
          <OutfitCollage pieces={TODAY_LOOK.pieces} height={250 * (collageW / 326)} scale={collageW / 326} background={c.stage} />
          <View style={{ position: 'absolute', right: 12, bottom: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: c.surface }}>
            <Body weight="semi" size={12}>
              {worn ? 'Bugün giydin' : `Son giyilme: ${TODAY_LOOK.lastWorn}`}
            </Body>
          </View>
        </View>
        <View style={{ gap: 8, paddingHorizontal: 4 }}>
          <Heading>{TODAY_LOOK.title}</Heading>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {TODAY_LOOK.chips.map((chip) => (
              <View key={chip} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: c.bg }}>
                <Body weight="semi" size={12}>
                  {chip}
                </Body>
              </View>
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label={worn ? 'Kaydedildi' : 'Bunu giydim'} icon={worn ? 'check' : undefined} onPress={actions.markWorn} style={{ flex: 1 }} />
          <Button label="Sıradaki" variant="secondary" style={{ width: 120 }} />
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Body weight="bold" size={14} style={{ paddingHorizontal: 4 }}>
          Bugün için 2 alternatif
        </Body>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {TODAY_LOOK.alternatives.map((a) => (
            <Pressable key={a.title} onPress={() => router.push('/outfits')} style={{ flex: 1, height: 76, padding: 8, paddingRight: 12, borderRadius: 18, backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 60, height: 60, borderRadius: radius.sm, backgroundColor: c.stage, alignItems: 'center', justifyContent: 'center' }}>
                <Garment kind={a.kind} color={a.color} size={46} />
              </View>
              <View style={{ flex: 1 }}>
                <Body weight="bold" size={14}>
                  {a.title}
                </Body>
                <Body muted size={12}>
                  {a.subtitle}
                </Body>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
