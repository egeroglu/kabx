import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, palette, radius, sizes, useColors } from '@/theme';

import { Icon, type IconName } from './Icon';

// ---------- Metin ----------
export function Title({ children, size = 34, style }: { children: ReactNode; size?: number; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return (
    <Text style={[{ fontFamily: fonts.display, fontSize: size, letterSpacing: -size * 0.02, lineHeight: size * 1.05, color: c.ink }, style]}>
      {children}
    </Text>
  );
}

export function Heading({ children, size = 22, style }: { children: ReactNode; size?: number; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text style={[{ fontFamily: fonts.displayBold, fontSize: size, letterSpacing: -0.2, color: c.ink }, style]}>{children}</Text>;
}

type Weight = 'regular' | 'medium' | 'semi' | 'bold';
const WEIGHT: Record<Weight, string> = { regular: fonts.body, medium: fonts.bodyMedium, semi: fonts.bodySemi, bold: fonts.bodyBold };

export function Body({
  children,
  size = 15,
  weight = 'regular',
  muted = false,
  color,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  size?: number;
  weight?: Weight;
  muted?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const c = useColors();
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: WEIGHT[weight], fontSize: size, lineHeight: size * 1.35, color: color ?? (muted ? c.textMuted : c.ink) }, style]}>
      {children}
    </Text>
  );
}

// ---------- Ekran ----------
export function Screen({ children, background, style, padded = true }: { children: ReactNode; background?: string; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[{ flex: 1, backgroundColor: background ?? c.bg, paddingTop: insets.top + 8, paddingHorizontal: padded ? 16 : 0 }, style]}>
      {children}
    </View>
  );
}

// ---------- Butonlar ----------
type Variant = 'primary' | 'secondary' | 'accent' | 'dashed';

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  height = sizes.buttonHeight,
  textColor,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  height?: number;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const bg = variant === 'primary' ? c.ink : variant === 'accent' ? palette.accent.coral : 'transparent';
  const fg = textColor ?? (variant === 'primary' ? c.onInk : variant === 'accent' ? palette.light.ink : c.ink);
  const border =
    variant === 'secondary' ? { borderWidth: 1.5, borderColor: c.ink } : variant === 'dashed' ? { borderWidth: 1.5, borderColor: c.textMuted, borderStyle: 'dashed' as const } : null;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        Haptics.selectionAsync();
        onPress?.();
      }}
      style={({ pressed }) => [
        { height, borderRadius: radius.md, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 18, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        border,
        style,
      ]}>
      {icon ? <Icon name={icon} size={20} color={fg} /> : null}
      <Text style={{ fontFamily: variant === 'accent' ? fonts.display : fonts.bodyBold, fontSize: 16, color: fg }}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, size = 44, style }: { icon: IconName; onPress?: () => void; label: string; size?: number; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 },
        style,
      ]}>
      <Icon name={icon} size={20} color={c.ink} strokeWidth={2.2} />
    </Pressable>
  );
}

// ---------- Çipler ve rozetler ----------
export function Chip({ label, selected = false, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        height: 36,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        justifyContent: 'center',
        backgroundColor: selected ? c.ink : c.surface,
        borderWidth: selected ? 0 : 1,
        borderColor: c.line,
      }}>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: selected ? c.onInk : c.ink }}>{label}</Text>
    </Pressable>
  );
}

const BADGE_BG = {
  coral: palette.accent.coral,
  sand: palette.accent.sand,
  lilac: palette.accent.lilacSoft,
  peach: palette.accent.peach,
  soft: palette.light.bg,
};

export function Badge({ label, tone = 'soft', style, textColor }: { label: string; tone?: keyof typeof BADGE_BG; style?: StyleProp<ViewStyle>; textColor?: string }) {
  return (
    <View style={[{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: BADGE_BG[tone] }, style]}>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: textColor ?? palette.light.ink }}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ value, color = palette.accent.coral }: { value: number; color?: string }) {
  const c = useColors();
  return (
    <View style={{ height: 8, borderRadius: radius.pill, backgroundColor: c.line, overflow: 'hidden', flex: 1 }}>
      <View style={{ width: `${Math.round(value * 100)}%`, height: 8, borderRadius: radius.pill, backgroundColor: color }} />
    </View>
  );
}
