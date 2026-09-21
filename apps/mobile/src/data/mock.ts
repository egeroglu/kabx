import type { CollagePiece, GarmentKind } from '@/components/Garment';

// Demo verisi. Backend hazır olunca bu dosya API katmanıyla değiştirilecek.

export type Category = 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'bag';

export type WardrobeItem = {
  id: string;
  name: string;
  kind: GarmentKind;
  color: string;
  colorName: string;
  category: Category;
  formality: 1 | 2 | 3 | 4 | 5;
  pattern: string;
  material: string;
  seasons: string[];
  styles: string[];
  wearCount: number;
  lastWorn: string;
  processing?: boolean;
};

export const CATEGORY_LABEL: Record<Category | 'all', string> = {
  all: 'Tümü',
  top: 'Üst',
  bottom: 'Alt',
  dress: 'Elbise',
  shoes: 'Ayakkabı',
  outerwear: 'Dış giyim',
  bag: 'Çanta',
};

const w = (
  id: string,
  name: string,
  kind: GarmentKind,
  color: string,
  colorName: string,
  category: Category,
  formality: WardrobeItem['formality'],
  extra: Partial<WardrobeItem> = {},
): WardrobeItem => ({
  id,
  name,
  kind,
  color,
  colorName,
  category,
  formality,
  pattern: 'Düz',
  material: 'Pamuk',
  seasons: ['İlkbahar', 'Sonbahar'],
  styles: ['Minimal'],
  wearCount: 4,
  lastWorn: '2 hafta önce',
  ...extra,
});

export const WARDROBE: WardrobeItem[] = [
  w('shirt-white', 'Beyaz poplin gömlek', 'shirt', '#FFFFFF', 'Beyaz', 'top', 4, {
    material: 'Pamuk poplin',
    seasons: ['İlkbahar', 'Yaz', 'Sonbahar'],
    styles: ['Klasik', 'Minimal'],
    wearCount: 7,
    lastWorn: '3 gün önce',
  }),
  w('tee-lilac', 'Lila tişört', 'tee', '#A99BF5', 'Lila', 'top', 1, { styles: ['Y2K'], processing: true }),
  w('blazer-camel', 'Camel blazer', 'blazer', '#C99A6B', 'Camel', 'outerwear', 4, { material: 'Yün karışım', styles: ['Klasik'], processing: true }),
  w('knit-cream', 'Krem triko', 'knit', '#F4E9D8', 'Krem', 'top', 2, { material: 'Yün', styles: ['Clean girl'] }),
  w('tee-black', 'Siyah tişört', 'tee', '#2A2420', 'Siyah', 'top', 1),
  w('jeans-light', 'Açık mavi jean', 'jeans', '#7FA3D6', 'Açık mavi', 'bottom', 2, { material: 'Denim' }),
  w('pants-black', 'Siyah kumaş pantolon', 'pants', '#2A2420', 'Siyah', 'bottom', 4, { material: 'Krep', styles: ['Klasik'] }),
  w('skirt-beige', 'Bej kalem etek', 'skirt', '#C99A6B', 'Bej', 'bottom', 4, { styles: ['Klasik'] }),
  w('pants-cargo', 'Haki kargo pantolon', 'pants', '#7C8A5A', 'Haki', 'bottom', 1, { styles: ['Streetwear'], wearCount: 0, lastWorn: 'Hiç' }),
  w('dress-black', 'Siyah midi elbise', 'dress', '#2F3B2C', 'Koyu yeşil', 'dress', 4),
  w('bag-coral', 'Mercan çanta', 'bag', '#F0643A', 'Mercan', 'bag', 3, { material: 'Deri' }),
  w('loafer-black', 'Siyah loafer', 'loafer', '#1D1915', 'Siyah', 'shoes', 4, { material: 'Deri' }),
  w('loafer-tan', 'Taba loafer', 'loafer', '#9C5A34', 'Taba', 'shoes', 3, { material: 'Süet' }),
  w('sneaker-white', 'Beyaz sneaker', 'sneaker', '#FFFFFF', 'Beyaz', 'shoes', 1),
  w('knit-yellow', 'Sarı triko', 'knit', '#E9C46A', 'Sarı', 'top', 2, { wearCount: 1, lastWorn: '7 ay önce' }),
];

export const findItem = (id: string) => WARDROBE.find((i) => i.id === id);

// --- Kombin oluşturucu: backend'deki skorlamanın basit bir taklidi ---
export function rankCandidates(candidates: WardrobeItem[], selected: WardrobeItem[]) {
  if (selected.length === 0) return candidates.map((item) => ({ item, score: 0.5 }));
  const avg = selected.reduce((s, i) => s + i.formality, 0) / selected.length;
  const neutral = ['#FFFFFF', '#2A2420', '#1D1915', '#F4E9D8', '#C99A6B'];
  return candidates
    .map((item) => {
      const formality = 1 - Math.abs(item.formality - avg) / 4;
      const color = neutral.includes(item.color) || selected.some((s) => neutral.includes(s.color)) ? 1 : 0.6;
      return { item, score: formality * 0.7 + color * 0.3 };
    })
    .sort((a, b) => b.score - a.score);
}

export function matchBadge(score: number): { label: string; tone: 'coral' | 'sand' } | null {
  if (score >= 0.85) return { label: 'Çok uyumlu', tone: 'coral' };
  if (score >= 0.65) return { label: 'Uyumlu', tone: 'sand' };
  return null;
}

// --- Keşfet ve stil testi kartları ---
export type Look = { id: string; title: string; source: string; stage: string; tags: string[]; pieces: CollagePiece[] };

export const LOOKS: Look[] = [
  {
    id: 'brunch',
    title: 'Hafta sonu brunch',
    source: 'Editör kombini',
    stage: '#E9E1F7',
    tags: ['Clean girl', 'Rahat', 'İlkbahar'],
    pieces: [
      { kind: 'knit', color: '#F4E9D8', x: 20, y: 24, s: 170, r: -5 },
      { kind: 'skirt', color: '#9C7A5B', x: 176, y: 70, s: 150, r: 4 },
      { kind: 'loafer', color: '#1D1915', x: 44, y: 206, s: 120, r: -3 },
      { kind: 'bag', color: '#F0643A', x: 214, y: 218, s: 104, r: 8 },
    ],
  },
  {
    id: 'y2k',
    title: 'Şehirde Y2K',
    source: 'Mağazadan',
    stage: '#FBE3D6',
    tags: ['Y2K', 'Renkli', 'Yaz'],
    pieces: [
      { kind: 'tee', color: '#A99BF5', x: 30, y: 20, s: 160, r: 6 },
      { kind: 'jeans', color: '#7FA3D6', x: 180, y: 44, s: 150, r: -4 },
      { kind: 'sneaker', color: '#FFFFFF', x: 40, y: 210, s: 130, r: 0 },
    ],
  },
  {
    id: 'dinner',
    title: 'Akşam yemeği',
    source: 'Editör kombini',
    stage: '#E6EEDC',
    tags: ['Minimal', 'Şık', 'Sonbahar'],
    pieces: [
      { kind: 'dress', color: '#2F3B2C', x: 40, y: 20, s: 200, r: -3 },
      { kind: 'loafer', color: '#B24A2E', x: 206, y: 196, s: 118, r: 5 },
      { kind: 'bag', color: '#E9D8A6', x: 220, y: 60, s: 96, r: 10 },
    ],
  },
  {
    id: 'office',
    title: 'Ofiste rahat',
    source: 'Editör kombini',
    stage: '#EDE5D8',
    tags: ['Klasik', 'İş', 'Sonbahar'],
    pieces: [
      { kind: 'blazer', color: '#C99A6B', x: 16, y: 20, s: 170, r: -6 },
      { kind: 'pants', color: '#2A2420', x: 186, y: 50, s: 150, r: 3 },
      { kind: 'loafer', color: '#1D1915', x: 50, y: 214, s: 116, r: -2 },
    ],
  },
  {
    id: 'sporty',
    title: 'Sabah yürüyüşü',
    source: 'Mağazadan',
    stage: '#E6EEDC',
    tags: ['Sporty', 'Rahat', 'Yaz'],
    pieces: [
      { kind: 'tee', color: '#FFFFFF', x: 30, y: 30, s: 160, r: -4 },
      { kind: 'pants', color: '#7C8A5A', x: 180, y: 50, s: 150, r: 4 },
      { kind: 'sneaker', color: '#A99BF5', x: 50, y: 214, s: 130, r: 0 },
    ],
  },
];

// --- Bugün ---
export const TODAY_LOOK = {
  title: 'Ofis günü, rahat şık',
  lastWorn: '12 gün önce',
  chips: ['İş', 'Havaya uygun', 'Akşam serin: ceket al'],
  pieces: [
    { kind: 'blazer', color: '#C99A6B', x: 16, y: 14, s: 142, r: -6 },
    { kind: 'tee', color: '#FFFFFF', x: 112, y: 22, s: 112, r: 5 },
    { kind: 'jeans', color: '#4A6FA5', x: 196, y: 58, s: 126, r: 3 },
    { kind: 'loafer', color: '#3A2E26', x: 36, y: 150, s: 104, r: -4 },
  ] as CollagePiece[],
  alternatives: [
    { title: 'Hafif ve rahat', subtitle: 'Elbise + babet', kind: 'dress' as GarmentKind, color: '#A99BF5' },
    { title: 'Katmanlı', subtitle: 'Triko + etek', kind: 'knit' as GarmentKind, color: '#E9D8A6' },
  ],
};

// --- Wishlist ---
export type WishItem = { id: string; name: string; store: string; price: string; kind: GarmentKind; color: string; stage: string; warn?: string };

export const WISHLIST: WishItem[] = [
  { id: 'w1', name: 'Oversize trençkot', store: '[Mağaza adı]', price: '[Fiyat]', kind: 'blazer', color: '#C99A6B', stage: '#EDE5D8' },
  { id: 'w2', name: 'Saten midi elbise', store: '[Mağaza adı]', price: '[Fiyat]', kind: 'dress', color: '#A99BF5', stage: '#E9E1F7' },
  {
    id: 'w3',
    name: 'Beyaz oversize gömlek',
    store: '[Mağaza adı]',
    price: '[Fiyat]',
    kind: 'shirt',
    color: '#FFFFFF',
    stage: '#EDE5D8',
    warn: 'Benzeri var: gardırobunda 1 beyaz gömlek var',
  },
];

// --- Temizlik ---
export const CLEANUP_IDS = ['knit-yellow', 'pants-cargo', 'tee-black'];
export const CLEANUP_META: Record<string, { title: string; meta: string }> = {
  'knit-yellow': { title: 'Bunu 7 aydır giymedin', meta: 'Mart 2025’te eklendi · 1 kez giyildi' },
  'pants-cargo': { title: 'Hiç giymedin', meta: '8 ay önce eklendi · 0 kez giyildi' },
  'tee-black': { title: 'Bunu 6 aydır giymedin', meta: 'Geçen yıl eklendi · 3 kez giyildi' },
};

// --- Stil testi sonucu ---
export const STYLE_RESULT = {
  primary: 'Clean Girl',
  secondary: 'Y2K',
  mix: [
    { label: 'Clean girl', value: 46, color: '#1D1915' },
    { label: 'Y2K', value: 28, color: '#A99BF5' },
    { label: 'Minimal', value: 16, color: '#C99A6B' },
    { label: 'Sporty', value: 10, color: '#F0643A' },
  ],
};
