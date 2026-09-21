// Kabx design tokens — "Sıcak Atölye"
// Kaynak: Kabx — UI Tasarımı v1 tuvali (screens/DesignSystem.dc.html)

export const palette = {
  light: {
    bg: '#F5EFE6',        // Zemin
    surface: '#FFFCF7',   // Yüzey (kartlar)
    stage: '#EDE5D8',     // Sahne (kıyafet görsellerinin arkası)
    line: '#E2D8C9',      // Çizgi / kenarlık
    textMuted: '#6A6158', // İkincil metin (zeminde 4.5:1 üstü)
    ink: '#1D1915',       // Mürekkep (ana metin, birincil buton)
    onInk: '#F5EFE6',     // Mürekkep zemin üstündeki metin
  },
  dark: {
    bg: '#15120F',
    surface: '#211D18',
    stage: '#2C2721',
    line: '#37302A',
    textMuted: '#A99F93',
    ink: '#F3ECE2',
    onInk: '#15120F',
  },
  accent: {
    coral: '#F0643A',     // Mercan: beğen, vurgu buton, "Çok uyumlu". Üstündeki metin HER ZAMAN ink (#1D1915)
    coralText: '#C2461F', // Mercanı metin rengi olarak kullanırken
    lilac: '#A99BF5',     // Lila: ikincil vurgu, stil etiketleri
    lilacSoft: '#E9E1F7', // İpucu kutuları, "Etiketleniyor…"
    sand: '#E9D8A6',      // "Uyumlu" rozeti
    peach: '#FBE3D6',     // "Benzeri var" uyarısı
    sage: '#E6EEDC',      // Temizlik modu zemini
    sageText: '#4F5A47',
  },
} as const;

export const radius = { sm: 12, md: 16, lg: 20, xl: 28, card: 30, pill: 999 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, screenX: 16, screenTop: 60 } as const;

// Fontlar: expo-font ile yükle (@expo-google-fonts/bricolage-grotesque, @expo-google-fonts/dm-sans)
export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemi: 'DMSans_600SemiBold',
  bodyBold: 'DMSans_700Bold',
} as const;

export const type = {
  screenTitle: { fontFamily: fonts.display, fontSize: 34, letterSpacing: -0.7, lineHeight: 36 },
  cardTitle: { fontFamily: fonts.displayBold, fontSize: 22, letterSpacing: -0.2 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  label: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' as const },
  button: { fontFamily: fonts.bodyBold, fontSize: 16 },
} as const;

export const sizes = {
  minTouch: 44,
  buttonHeight: 52,
  ctaHeight: 56,
  swipeMain: 64,   // beğen / beğenme
  swipeUndo: 46,   // geri al
  tabBarHeight: 88,
} as const;

export const shadow = {
  card: { shadowColor: '#1D1915', shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 16 }, elevation: 8 },
  garment: { shadowColor: '#1D1915', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  coralGlow: { shadowColor: '#F0643A', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
} as const;

export const motion = {
  cardTiltDeg: [1, 4],           // kartlarda hafif eğim aralığı
  swipeThresholdRatio: 0.3,      // ekran genişliğinin %30'u geçilince karar
  swipeRotateMaxDeg: 12,
  spring: { damping: 18, stiffness: 180 },
} as const;
