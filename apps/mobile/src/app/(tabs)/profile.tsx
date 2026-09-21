import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Badge, Body, Button, Heading, Title } from '@/components/ui';
import { STYLE_RESULT } from '@/data/mock';
import { palette, useColors } from '@/theme';

const ROWS: { label: string; value?: string; danger?: boolean }[] = [
  { label: 'Abonelik', value: 'Deneme · 7 gün kaldı' },
  { label: 'Dil', value: 'Türkçe' },
  { label: 'Tema', value: 'Sistem' },
  { label: 'Sabah bildirimi', value: '08:00' },
  { label: 'KVKK ve gizlilik' },
  { label: 'Verilerimi dışa aktar' },
  { label: 'Hesabımı sil', danger: true },
];

export default function Profile() {
  const c = useColors();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: 64, paddingHorizontal: 16, paddingBottom: 32, gap: 16 }}>
      <Title style={{ paddingHorizontal: 4 }}>Profil</Title>

      <View style={{ borderRadius: 28, backgroundColor: palette.light.ink, padding: 20, gap: 8 }}>
        <Body size={12} weight="bold" color={palette.accent.coral} style={{ letterSpacing: 1 }}>
          STİL KARTIN
        </Body>
        <Heading size={30} style={{ color: palette.light.bg, letterSpacing: -0.6 }}>
          {STYLE_RESULT.primary} + {STYLE_RESULT.secondary}
        </Heading>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {STYLE_RESULT.mix.map((m) => (
            <Badge key={m.label} label={`${m.label} %${m.value}`} tone="soft" />
          ))}
        </View>
      </View>

      <View style={{ borderRadius: 20, backgroundColor: c.surface }}>
        {ROWS.map((r, i) => (
          <Pressable
            key={r.label}
            accessibilityRole="button"
            style={{ minHeight: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: i === ROWS.length - 1 ? 0 : 1, borderBottomColor: c.line }}>
            <Body weight="semi" color={r.danger ? palette.accent.coralText : undefined}>
              {r.label}
            </Body>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {r.value ? (
                <Body muted size={14}>
                  {r.value}
                </Body>
              ) : null}
              <Icon name="arrowRight" size={16} color={c.textMuted} />
            </View>
          </Pressable>
        ))}
      </View>

      <Button label="Demo: onboarding’i yeniden izle" variant="secondary" onPress={() => router.replace('/onboarding/quiz')} />
    </ScrollView>
  );
}
