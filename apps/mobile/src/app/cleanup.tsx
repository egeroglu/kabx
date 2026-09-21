import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Garment } from '@/components/Garment';
import { ModeSwitch } from '@/components/ModeSwitch';
import { SwipeDeck, type SwipeDeckHandle } from '@/components/SwipeDeck';
import { Body, Button, Heading, IconButton, Title } from '@/components/ui';
import { CLEANUP_IDS, CLEANUP_META, findItem, type WardrobeItem } from '@/data/mock';
import { actions } from '@/data/store';
import { palette } from '@/theme';

const SAGE = palette.accent.sage;
const SAGE_TEXT = palette.accent.sageText;

export default function Cleanup() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const deck = useRef<SwipeDeckHandle>(null);
  const items = CLEANUP_IDS.map(findItem).filter(Boolean) as WardrobeItem[];
  const [i, setI] = useState(0);
  const current = items[Math.min(i, items.length - 1)];
  const meta = CLEANUP_META[current.id];
  const cardH = Math.min(420, height * 0.48);
  const finished = i >= items.length;

  return (
    <View style={{ flex: 1, backgroundColor: SAGE, paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 16, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton icon="x" label="Kapat" onPress={() => router.back()} style={{ borderWidth: 0 }} />
        <Body weight="bold" size={14} color={palette.light.ink}>
          Temizlik · {Math.min(i + 1, items.length)} / {items.length}
        </Body>
        <View style={{ width: 44 }} />
      </View>
      <ModeSwitch active="cleanup" />

      {finished ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <Heading style={{ color: palette.light.ink }}>Gardırobun ferahladı</Heading>
          <Body color={SAGE_TEXT} style={{ textAlign: 'center' }}>
            Bağışladığın parçalar gardıroptan gizlendi.
          </Body>
          <Button label="Gardıroba dön" onPress={() => router.back()} />
        </View>
      ) : (
        <>
          <View style={{ gap: 4, paddingHorizontal: 4 }}>
            <Title size={30} style={{ color: palette.light.ink }}>
              {meta.title}
            </Title>
            <Body size={14} color={SAGE_TEXT}>
              {meta.meta}
            </Body>
          </View>
          <SwipeDeck
            ref={deck}
            data={items}
            height={cardH}
            leftStamp="BAĞIŞLA"
            rightStamp="TUT"
            backColors={['#CFDDBF', '#DCE6D0']}
            onSwipe={(it, dir) => {
              if (dir === 'left') actions.donate(it.id);
              setI((n) => n + 1);
            }}
            renderCard={(it) => (
              <View style={{ flex: 1, backgroundColor: palette.light.surface, alignItems: 'center', justifyContent: 'center' }}>
                <Garment kind={it.kind} color={it.color} size={250} withShadow />
                <View style={{ position: 'absolute', left: 18, bottom: 18, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: palette.light.stage }}>
                  <Body weight="bold" size={13} color={palette.light.ink}>
                    {it.name}
                  </Body>
                </View>
              </View>
            )}
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button label="Bağışla" icon="gift" variant="secondary" height={64} textColor={palette.light.ink} style={{ flex: 1, borderColor: palette.light.ink, backgroundColor: palette.light.surface }} onPress={() => deck.current?.swipe('left')} />
            <Button label="Tut" icon="heart" height={64} textColor={palette.light.bg} style={{ flex: 1, backgroundColor: palette.light.ink }} onPress={() => deck.current?.swipe('right')} />
          </View>
          <Body size={12} color={SAGE_TEXT} style={{ textAlign: 'center' }}>
            Sola kaydır: bağışla · Sağa kaydır: tut
          </Body>
        </>
      )}
    </View>
  );
}
