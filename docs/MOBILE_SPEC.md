# Kabx — Mobil Uygulama v1 Geliştirme Prompt'u (Claude Code için)

> Kullanım: Bu klasörü repoda `docs/design/` altına koy. Claude Code'a şunu yaz:
> "docs/design/MOBILE_SPEC.md dosyasını oku. Önce 'Başlamadan önce' bölümündeki soruları sor, sonra Faz 0 için plan çıkar ve onayımı bekle."

---

## 1. Bağlam

Sen kıdemli bir React Native / Expo geliştiricisisin. **Kabx** adlı mobil uygulamanın (iOS + Android) istemcisini kuracaksın.

Kabx; ağırlıklı olarak genç kadınlara yönelik, eğlenceli ve oyunsu bir dijital gardırop ve stil uygulaması. Uygulama içinde alım satım yok. Diller Türkçe ve İngilizce, ilk pazar Türkiye.

**Tasarım kaynağı bu klasörde:**

- `tokens.ts` → renkler (açık/koyu), radius, boşluk, tipografi, gölge, hareket değerleri. **Tek doğruluk kaynağı bu.**
- `screens/*.dc.html` → her ekranın HTML tasarım kaynağı. Bunları **görsel referans ve ölçü kaynağı** olarak oku (boşluklar, boyutlar, hiyerarşi, metinler). HTML'i React Native'e birebir çevirmeye çalışma; aynı görünümü RN bileşenleriyle kur.
- `screens/DesignSystem.dc.html` → bileşen kütüphanesinin görsel özeti.
- Tasarımdaki kıyafet çizimleri (SVG silüetler) **yer tutucu**. Gerçek uygulamada arka planı silinmiş PNG/WebP fotoğraflar gösterilecek.

## 2. Teknoloji

- Expo (güncel SDK) + **Expo Router** + TypeScript (strict)
- Animasyon ve jestler: **react-native-reanimated** + **react-native-gesture-handler**
- Listeler: **@shopify/flash-list**; görseller: **expo-image**
- Haptik: **expo-haptics**; fontlar: **expo-font** + `@expo-google-fonts/bricolage-grotesque`, `@expo-google-fonts/dm-sans`
- Stil: `tokens.ts` üzerine kurulu hafif bir tema katmanı (useTheme hook + StyleSheet). Açık/koyu mod sistem ayarını takip eder.
- Sunucu verisi: **TanStack Query**; basit global durum: **Zustand**
- i18n: **i18next** + `expo-localization` (tr varsayılan, en)
- Abonelik: **react-native-purchases** (RevenueCat) — dev build gerektirir
- Kamera/galeri: `expo-camera`, `expo-image-picker` (çoklu seçim)
- Konum (hava durumu için): `expo-location`; bildirim: `expo-notifications`
- Arka plan silme: iOS Vision / Android ML Kit Subject Segmentation için native modül. Uygun bir Expo modülü yoksa kendi Expo Module'ünü yaz (Faz 4).
- Test: Jest + React Native Testing Library; kritik akışlar için Maestro E2E.
- Build: **EAS Build** (development, preview, production profilleri).

Kütüphane API'lerini **güncel resmi dokümandan** kontrol et; hatırladığın imzalara güvenme.

## 3. Mimari kurallar

1. Klasör yapısı: `app/` (Expo Router ekranları), `src/components/`, `src/features/<domain>/`, `src/theme/`, `src/api/`, `src/i18n/`.
2. **API katmanı mock ile başlar.** Backend ayrı geliştiriliyor; OpenAPI şeması hazır olunca tipli client üretilecek. O zamana kadar `src/api/mock/` altında gerçekçi mock veriler ve gecikmeler kullan. Mock ve gerçek API arasında geçiş tek bir env değişkeniyle olsun.
3. Hiçbir renk, boyut, font değeri bileşenlerde sabit yazılmaz; hepsi `tokens.ts`'ten gelir.
4. Kullanıcıya görünen hiçbir metin koda gömülmez; hepsi i18n dosyalarında (tr + en). Türkçe metinler daha uzun; düzeni Türkçeyle test et.
5. Her ekranın **yükleniyor, boş, hata ve çevrimdışı** durumları olmalı.
6. Erişilebilirlik: dokunma alanı ≥ 44 pt, ikon butonlarda `accessibilityLabel`, dinamik yazı boyutunu kırılmadan destekle.
7. Mercan (`coral`) zemin üzerindeki metin her zaman `ink` rengindedir.

## 4. Ortak bileşenler (Faz 1)

| Bileşen | Notlar |
| --- | --- |
| `Button` | primary (ink), secondary (outline), accent (coral), dashed; loading ve disabled halleri |
| `Chip` | seçili / normal; `Badge` varyantları: Çok uyumlu (coral), Uyumlu (sand), Etiketleniyor (lilacSoft), Benzeri var (peach) |
| `GarmentImage` | arka planı silinmiş görseli `stage` zeminde, hafif gölge ve isteğe bağlı eğimle gösterir; yüklenirken iskelet |
| `OutfitCollage` | 2–5 parçayı üst üste binen, hafif döndürülmüş kolaj olarak dizer (Bugün, Keşfet, stil testi) |
| `SwipeDeck` | **Kendin yaz** (hazır kütüphane kullanma). Reanimated + Gesture Handler; sürüklerken kart dönüşü (maks. 12°), eşik = ekran genişliğinin %30'u, eşik geçilince haptik, bırakınca yay animasyonu, arkada 2 kart hafif eğik ve ölçekli, geri al desteği. Sol/sağ etiketleri prop olarak alır (Beğenmedim/Beğendim, Vazgeç/Hâlâ istiyorum, Bağışla/Tut). Butonlarla da tetiklenebilir. |
| `SwipeActions` | 64 / 46 / 64 pt yuvarlak butonlar (hayır, geri al, evet) |
| `TabBar` | 5 sekme; ortadaki Keşfet butonu mercan, yükseltilmiş ve hafif eğik |
| `ScreenHeader`, `SegmentedControl`, `WeatherPill`, `ProgressBar`, `EmptyState`, `ErrorState` | tasarımdaki ölçülerle |

Bileşenler için basit bir önizleme ekranı (`/dev/components`) yap, sadece geliştirme build'inde görünsün.

## 5. Ekranlar ve akışlar

| Ekran | Tasarım dosyası | Önemli davranışlar |
| --- | --- | --- |
| Stil testi | `StyleQuiz.dc.html` | ~20 kart, ilerleme çubuğu, SwipeDeck, "Sonucu şimdi gör" |
| Stil sonucu | `StyleResult.dc.html` | koyu zemin, ana + ikincil stil, yüzde çubukları (animasyonlu dolum), paylaşılabilir kart görseli |
| Paywall | `Paywall.dc.html` | RevenueCat offering'lerinden yıllık/aylık, yıllık varsayılan seçili, "7 gün ücretsiz başla", geri yükle, koşullar/gizlilik linkleri |
| Bugün | `Today.dc.html`, `TodayDark.dc.html` | hava durumu, kayıtlı kombinlerden seçilen kombin, "Bunu giydim", "Sıradaki", 2 alternatif; kayıtlı kombin yoksa boş durum |
| Gardırop | `Wardrobe.dc.html` | arama, kategori çipleri, 3 sütunlu grid (FlashList), işlenen parçalarda "Etiketleniyor…", FAB → parça ekleme, Temizlik girişi |
| Parça ekleme | `AddItems.dc.html` | kamera veya çoklu galeri seçimi, her görsel için durum (arka plan siliniyor → etiketleniyor → hazır), hazır olanları ekleme |
| Parça detayı | `ItemDetail.dc.html` | AI etiketleri listesi (dokununca düzenleme sheet'i), giyilme bilgisi, "Benzeri var" kutusu, "Bununla kombin yap" |
| Keşfet | `Discover.dc.html` | segment: Stil / Wishlist / Temizlik; SwipeDeck; beğenilen ürün wishlist'e düşer |
| Kombin oluşturucu | `OutfitBuilder.dc.html` | dikey slotlar (Üst/Alt/Ayakkabı + opsiyonel), her slot yatay kaydırılan aday şeridi; seçim değişince diğer slotlar API'den gelen skora göre yeniden sıralanır (animasyonlu), rozetler, ipucu kutusu, etkinlik çipleri, kaydet/taslak |
| Wishlist | `Wishlist.dc.html` | liste, "Hâlâ istiyor musun?" girişi (SwipeDeck: Vazgeç/Hâlâ istiyorum), "Bunu alsam mı?" → kombin oluşturucu (wishlist parçası seçili), "Mağazaya git" → backend'in yönlendirme linki (tarayıcıda açılır) |
| Temizlik | `Cleanup.dc.html` | sage zemin, tek kart, Bağışla/Tut, sayaç |

**Tasarımı henüz olmayan ekranlar** (tasarım sistemine sadık kalarak sen kur, kısa bir önerinle bana göster):
karşılama, giriş (Apple / Google / e-posta kodu), izin açıklama ekranları (kamera, galeri, konum, bildirim), Profil ve Ayarlar (abonelik durumu, dil, tema, bildirim saati, KVKK metni, veri dışa aktarma, **hesap silme**), wishlist'e manuel ekleme (link / fotoğraf).

**Navigasyon:** Onboarding (stil testi → sonuç → paywall → izinler) ilk açılışta; sonra 5 sekmeli ana yapı. Parça ekleme, parça detayı, kombin oluşturucu ve swipe modları modal/stack olarak açılır.

## 6. Başlamadan önce bana sor

- Monorepo mu (backend ile aynı repo, paylaşılan tipler) yoksa ayrı repo mu?
- Uygulama paket adı / bundle ID (örn. `com.kabx.app`)?
- Analitik aracı (PostHog, Firebase Analytics, Amplitude…) şimdiden eklensin mi?
- Deneme bittikten sonra abone olmayan kullanıcıya neler açık kalacak? (Şimdilik tüm özellikleri remote config'ten gelen bir listeye göre kilitle.)

## 7. Fazlar

- **Faz 0 — Kurulum:** Expo projesi, Router, TypeScript, lint/format, tema katmanı (`tokens.ts`), fontlar, açık/koyu mod, i18n iskeleti, mock API katmanı, EAS profilleri.
- **Faz 1 — Bileşenler:** bölüm 4'teki bileşenler + önizleme ekranı. SwipeDeck'i ayrıca gerçek cihazda test ettir.
- **Faz 2 — Ana sekmeler (mock veriyle):** Bugün, Gardırop, Parça detayı, Keşfet (stil), Kombin oluşturucu.
- **Faz 3 — Onboarding ve abonelik:** stil testi, sonuç, paywall (RevenueCat sandbox), giriş ekranları, izinler.
- **Faz 4 — Parça ekleme:** kamera/galeri, cihaz içi arka plan silme modülü, presigned URL ile yükleme, durum takibi.
- **Faz 5 — Wishlist ve temizlik:** wishlist, wishlist swipe, temizlik swipe, "Bunu alsam mı?" akışı.
- **Faz 6 — Profil ve cila:** ayarlar, hesap silme, veri dışa aktarma, bildirimler, boş/hata durumları, erişilebilirlik ve performans turu.
- **Faz 7 — Gerçek API'ye geçiş:** OpenAPI'den client üret, mock'ları kaldır, uçtan uca test.

Her faz sonunda: çalışan uygulama, testler, kısa bir ekran kaydı veya ekran görüntüsü listesi, README güncellemesi. Küçük ve anlamlı commit'ler at.

## 8. v1'de yapma

Uygulama içi alım satım, sohbet eden yapay zekâ, otomatik kombin üretimi, fiyat takibi, virtual try-on, kullanıcı kombini paylaşımı/sosyal özellikler, bavul planlayıcı, istatistikler, renk analizi, challenge'lar.
