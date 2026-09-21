import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Garment } from '@/components/Garment';
import { SwipeActions } from '@/components/SwipeActions';
import { SwipeDeck, type SwipeDeckHandle } from '@/components/SwipeDeck';
import { Body, Button, Heading, IconButton, Title } from '@/components/ui';
import { actions, useStore } from '@/data/store';
import { useColors } from '@/theme';

export default function WishlistReview() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const deck = useRef<SwipeDeckHandle>(null);
  const initial = useStore((s) => s.wishlist);
  const [items] = useState(initial);
  const [seen, setSeen] = useState(0);
  const cardH = Math.min(440, height * 0.52);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 16, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton icon="x" label="Kapat" onPress={() => router.back()} />
        <Body weight="bold" size={14}>
          Wishlist · {Math.min(seen + 1, items.length)} / {items.length}
        </Body>
        <View style={{ width: 44 }} />
      </View>
      <Title size={30} style={{ paddingHorizontal: 4 }}>
        Hâlâ istiyor musun?
      </Title>
      <SwipeDeck
        ref={deck}
        data={items}
        height={cardH}
        leftStamp="VAZGEÇ"
        rightStamp="HÂLÂ İSTİYORUM"
        onSwipe={(it, dir) => {
          setSeen((n) => n + 1);
          if (dir === 'left') actions.dropWish(it.id);
        }}
        renderEmpty={() => (
          <View style={{ alignItems: 'center', gap: 12 }}>
            <Heading>Wishlist tertemiz</Heading>
            <Button label="Wishlist’e dön" onPress={() => router.back()} />
          </View>
        )}
        renderCard={(it) => (
          <View style={{ flex: 1, backgroundColor: it.stage, alignItems: 'center', justifyContent: 'center' }}>
            <Garment kind={it.kind} color={it.color} size={240} withShadow rotate={-3} />
            <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16, padding: 14, borderRadius: 18, backgroundColor: c.surface, gap: 2 }}>
              <Body muted size={12} weight="semi">
                {it.store}
              </Body>
              <Body weight="bold" size={16}>
                {it.name}
              </Body>
            </View>
          </View>
        )}
      />
      <SwipeActions noLabel="Vazgeç" yesLabel="Hâlâ istiyorum" onNo={() => deck.current?.swipe('left')} onYes={() => deck.current?.swipe('right')} onUndo={() => deck.current?.undo()} />
    </View>
  );
}
