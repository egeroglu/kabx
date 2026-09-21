import { useRef } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { OutfitCollage } from '@/components/Garment';
import { ModeSwitch } from '@/components/ModeSwitch';
import { SwipeActions } from '@/components/SwipeActions';
import { SwipeDeck, type SwipeDeckHandle } from '@/components/SwipeDeck';
import { Badge, Body, Heading, IconButton, Title } from '@/components/ui';
import { LOOKS } from '@/data/mock';
import { actions } from '@/data/store';
import { palette, useColors } from '@/theme';

export default function Discover() {
  const c = useColors();
  const deck = useRef<SwipeDeckHandle>(null);
  const { width, height } = useWindowDimensions();
  const cardW = width - 32;
  const cardH = Math.min(470, height * 0.56);
  const stageH = cardH - 124;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: 64, paddingHorizontal: 16, gap: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 }}>
        <Title>Keşfet</Title>
        <IconButton icon="filter" label="Filtreler" />
      </View>
      <ModeSwitch active="style" />
      <SwipeDeck
        ref={deck}
        data={LOOKS}
        loop
        height={cardH}
        leftStamp="GEÇ"
        rightStamp="BAYILDIM"
        onSwipe={(look, dir) => {
          if (dir === 'right') actions.likeLook(look.id, look.title, look.stage);
        }}
        renderCard={(look) => (
          <View style={{ flex: 1, backgroundColor: c.surface }}>
            <View>
              <OutfitCollage pieces={look.pieces} height={stageH} scale={Math.min(cardW / 358, stageH / 340)} background={look.stage} />
              <Badge label={look.source} tone="soft" style={{ position: 'absolute', left: 14, top: 14, backgroundColor: palette.light.surface }} />
            </View>
            <View style={{ padding: 16, gap: 8 }}>
              <Heading size={24}>{look.title}</Heading>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {look.tags.map((t) => (
                  <View key={t} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: c.bg }}>
                    <Body weight="semi" size={12}>
                      {t}
                    </Body>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      />
      <SwipeActions noLabel="Beğenmedim" yesLabel="Beğendim" onNo={() => deck.current?.swipe('left')} onYes={() => deck.current?.swipe('right')} onUndo={() => deck.current?.undo()} />
    </View>
  );
}
