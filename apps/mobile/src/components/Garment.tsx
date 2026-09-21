import { View, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { shadow } from '@/theme';

export type GarmentKind =
  | 'tee'
  | 'shirt'
  | 'knit'
  | 'blazer'
  | 'pants'
  | 'jeans'
  | 'skirt'
  | 'dress'
  | 'loafer'
  | 'sneaker'
  | 'bag';

// Yer tutucu silüetler. Gerçek uygulamada arka planı silinmiş fotoğraf (expo-image) gelecek.
export const GARMENT_PATHS: Record<GarmentKind, string> = {
  tee: 'M32 14 L44 9 Q50 16 56 9 L68 14 L84 30 L74 40 L68 34 L68 90 L32 90 L32 34 L26 40 L16 30 Z',
  shirt: 'M33 12 L44 8 L50 18 L56 8 L67 12 L86 34 L78 42 L68 32 L68 92 L32 92 L32 32 L22 42 L14 34 Z',
  knit: 'M32 12 L44 8 Q50 14 56 8 L68 12 L88 62 L78 66 L68 38 L68 90 L32 90 L32 38 L22 66 L12 62 Z',
  blazer: 'M30 10 L44 8 L50 40 L56 8 L70 10 L86 62 L76 66 L70 42 L70 92 L30 92 L30 42 L24 66 L14 62 Z',
  pants: 'M30 8 L70 8 L75 92 L57 92 L50 34 L43 92 L25 92 Z',
  jeans: 'M30 8 L70 8 L77 92 L58 92 L50 36 L42 92 L23 92 Z',
  skirt: 'M33 14 L67 14 L82 84 L18 84 Z',
  dress: 'M41 6 L59 6 L57 26 L76 92 L24 92 L43 26 Z',
  loafer: 'M10 66 Q14 52 30 54 L60 58 Q86 60 90 70 L90 78 L10 78 Z',
  sneaker: 'M8 62 Q10 44 26 44 L40 50 Q58 58 80 59 Q94 61 94 72 L94 80 L8 80 Z',
  bag: 'M22 40 L78 40 L84 90 L16 90 Z M36 40 Q36 18 50 18 Q64 18 64 40 L60 40 Q60 22 50 22 Q40 22 40 40 Z',
};

type Props = {
  kind: GarmentKind;
  color: string;
  size: number;
  rotate?: number;
  withShadow?: boolean;
  opacity?: number;
  style?: ViewStyle;
};

export function Garment({ kind, color, size, rotate = 0, withShadow = false, opacity = 1, style }: Props) {
  return (
    <View
      style={[
        { width: size, height: size, opacity, transform: [{ rotate: `${rotate}deg` }] },
        withShadow ? shadow.garment : null,
        style,
      ]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d={GARMENT_PATHS[kind]} fill={color} stroke="#1D1915" strokeWidth={size > 90 ? 1.6 : 2.4} strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

export type CollagePiece = { kind: GarmentKind; color: string; x: number; y: number; s: number; r: number };

// Kolaj koordinatları 358 px genişliğe göre tasarlandı; `scale` ile ekrana uyarlanır.
export function OutfitCollage({ pieces, height, scale = 1, background }: { pieces: CollagePiece[]; height: number; scale?: number; background: string }) {
  return (
    <View style={{ height, backgroundColor: background, overflow: 'hidden' }}>
      {pieces.map((p, i) => (
        <Garment
          key={i}
          kind={p.kind}
          color={p.color}
          size={p.s * scale}
          rotate={p.r}
          withShadow
          style={{ position: 'absolute', left: p.x * scale, top: p.y * scale }}
        />
      ))}
    </View>
  );
}
