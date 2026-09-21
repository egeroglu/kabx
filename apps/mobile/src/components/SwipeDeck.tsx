import * as Haptics from 'expo-haptics';
import { useEffect, useImperativeHandle, useState, type ReactNode, type Ref } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { fonts, motion, palette, radius, shadow } from '@/theme';

export type SwipeDir = 'left' | 'right';
export type SwipeDeckHandle = { swipe: (dir: SwipeDir) => void; undo: () => void };

type Props<T> = {
  data: T[];
  renderCard: (item: T) => ReactNode;
  onSwipe?: (item: T, dir: SwipeDir) => void;
  height: number;
  leftStamp: string;
  rightStamp: string;
  loop?: boolean;
  renderEmpty?: () => ReactNode;
  backColors?: [string, string];
  ref?: Ref<SwipeDeckHandle>;
};

const hapticTick = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
const hapticDone = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

export function SwipeDeck<T>({
  data,
  renderCard,
  onSwipe,
  height,
  leftStamp,
  rightStamp,
  loop = false,
  renderEmpty,
  backColors = [palette.accent.lilac, palette.accent.sand],
  ref,
}: Props<T>) {
  const [index, setIndex] = useState(0);
  const [request, setRequest] = useState<{ dir: SwipeDir; n: number } | null>(null);
  const [enterFrom, setEnterFrom] = useState(0);
  const [lastDir, setLastDir] = useState<SwipeDir>('right');

  const done = !loop && index >= data.length;
  const at = (i: number) => data[((i % data.length) + data.length) % data.length];

  useImperativeHandle(ref, () => ({
    swipe: (dir) => setRequest({ dir, n: Date.now() }),
    undo: () => {
      if (index === 0) return;
      setEnterFrom(lastDir === 'right' ? 1 : -1);
      setIndex((i) => i - 1);
    },
  }));

  const handleDone = (dir: SwipeDir) => {
    onSwipe?.(at(index), dir);
    setLastDir(dir);
    setEnterFrom(0);
    setRequest(null);
    setIndex((i) => i + 1);
  };

  if (data.length === 0 || done) {
    return <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>{renderEmpty?.()}</View>;
  }

  const showBack = loop || index + 1 < data.length;

  return (
    <View style={{ height }}>
      {showBack ? (
        <>
          <View pointerEvents="none" style={{ position: 'absolute', top: 14, left: 10, right: 10, bottom: -6, borderRadius: radius.card, backgroundColor: backColors[0], transform: [{ rotate: '4deg' }] }} />
          <View pointerEvents="none" style={{ position: 'absolute', top: 8, left: 4, right: 4, bottom: 0, borderRadius: radius.card, backgroundColor: backColors[1], transform: [{ rotate: '-3deg' }] }} />
        </>
      ) : null}
      <TopCard key={index} request={request} enterFrom={enterFrom} onDone={handleDone} leftStamp={leftStamp} rightStamp={rightStamp}>
        {renderCard(at(index))}
      </TopCard>
    </View>
  );
}

function TopCard({
  children,
  request,
  enterFrom,
  onDone,
  leftStamp,
  rightStamp,
}: {
  children: ReactNode;
  request: { dir: SwipeDir; n: number } | null;
  enterFrom: number;
  onDone: (dir: SwipeDir) => void;
  leftStamp: string;
  rightStamp: string;
}) {
  const { width } = useWindowDimensions();
  const threshold = width * motion.swipeThresholdRatio;
  const tx = useSharedValue(enterFrom * width);
  const ty = useSharedValue(0);
  const crossed = useSharedValue(false);

  useEffect(() => {
    if (enterFrom !== 0) tx.value = withSpring(0, motion.spring);
  }, [enterFrom, tx]);

  const flyOut = (dir: SwipeDir) => {
    hapticDone();
    const target = (dir === 'right' ? 1 : -1) * width * 1.5;
    tx.value = withTiming(target, { duration: 260 }, (finished) => {
      if (finished) scheduleOnRN(onDone, dir);
    });
  };

  useEffect(() => {
    if (request) flyOut(request.dir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.n]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY * 0.4;
      const over = Math.abs(e.translationX) > threshold;
      if (over !== crossed.value) {
        crossed.value = over;
        if (over) scheduleOnRN(hapticTick);
      }
    })
    .onEnd((e) => {
      const fling = Math.abs(e.velocityX) > 900;
      if (Math.abs(tx.value) > threshold || fling) {
        const dir: SwipeDir = (fling ? e.velocityX : tx.value) > 0 ? 'right' : 'left';
        scheduleOnRN(flyOut, dir);
      } else {
        tx.value = withSpring(0, motion.spring);
        ty.value = withSpring(0, motion.spring);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${interpolate(tx.value, [-width, 0, width], [-motion.swipeRotateMaxDeg, 0, motion.swipeRotateMaxDeg])}deg` },
    ],
  }));
  const likeStyle = useAnimatedStyle(() => ({ opacity: interpolate(tx.value, [0, threshold], [0, 1], 'clamp') }));
  const nopeStyle = useAnimatedStyle(() => ({ opacity: interpolate(tx.value, [-threshold, 0], [1, 0], 'clamp') }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.card, overflow: 'hidden' }, shadow.card, cardStyle]}>
        {children}
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 22, left: 18, transform: [{ rotate: '-12deg' }] }, likeStyle]}>
          <Stamp label={rightStamp} color={palette.accent.coral} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 22, right: 18, transform: [{ rotate: '12deg' }] }, nopeStyle]}>
          <Stamp label={leftStamp} color={palette.light.ink} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

function Stamp({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 3, borderColor: color, backgroundColor: palette.light.surface }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 20, color: palette.light.ink, letterSpacing: 0.5 }}>{label}</Text>
    </View>
  );
}
