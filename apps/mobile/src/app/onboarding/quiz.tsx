import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';

import { OutfitCollage } from '@/components/Garment';
import { SwipeActions } from '@/components/SwipeActions';
import { SwipeDeck, type SwipeDeckHandle } from '@/components/SwipeDeck';
import { Body, ProgressBar, Screen, Title } from '@/components/ui';
import { LOOKS, type Look } from '@/data/mock';
import { radius } from '@/theme';

const TOTAL = 10; // Gerçek testte ~20 kart

export default function StyleQuiz() {
  const deck = useRef<SwipeDeckHandle>(null);
  const [count, setCount] = useState(0);
  const { width, height } = useWindowDimensions();
  const cardW = width - 32;
  const cardH = Math.min(480, height * 0.55);
  const quiz: Look[] = Array.from({ length: TOTAL }, (_, i) => LOOKS[i % LOOKS.length]);

  const finish = () => router.replace('/onboarding/result');

  return (
    <Screen>
      <View style={{ gap: 16, flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <ProgressBar value={count / TOTAL} />
          <Body size={13} weight="bold">
            {count} / {TOTAL}
          </Body>
        </View>
        <View style={{ gap: 4, paddingHorizontal: 4 }}>
          <Title size={30}>Bu kombin senlik mi?</Title>
          <Body muted size={14}>
            Kaydır ya da dokun. Doğru cevap yok, sadece zevkin.
          </Body>
        </View>
        <SwipeDeck
          ref={deck}
          data={quiz}
          height={cardH}
          leftStamp="BANA GÖRE DEĞİL"
          rightStamp="BENİM!"
          backColors={['#E9D8A6', '#E9D8A6']}
          onSwipe={() => {
            const next = count + 1;
            setCount(next);
            if (next >= TOTAL) setTimeout(finish, 250);
          }}
          renderCard={(look) => (
            <View style={{ flex: 1, backgroundColor: look.stage, borderRadius: radius.card }}>
              <OutfitCollage pieces={look.pieces} height={cardH} scale={cardW / 358} background={look.stage} />
            </View>
          )}
        />
        <SwipeActions noLabel="Beğenmedim" yesLabel="Beğendim" onNo={() => deck.current?.swipe('left')} onYes={() => deck.current?.swipe('right')} onUndo={() => {
          deck.current?.undo();
          setCount((n) => Math.max(0, n - 1));
        }} />
        <Pressable accessibilityRole="button" onPress={finish} style={{ alignSelf: 'center', padding: 8 }}>
          <Body muted weight="semi" size={14} style={{ textDecorationLine: 'underline' }}>
            Sonucu şimdi gör
          </Body>
        </Pressable>
      </View>
    </Screen>
  );
}
