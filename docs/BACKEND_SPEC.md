

## 1. Rolün ve ürün bağlamı

Sen kıdemli bir Node.js/TypeScript backend mühendisisin. **Kabx** adlı mobil uygulamanın (React Native, iOS + Android) backend'ini sıfırdan kuracaksın.

Kabx, ağırlıklı olarak genç kadınlara yönelik, eğlenceli ve oyunsu bir **dijital gardırop ve stil uygulaması**. Uygulama içinde alım satım YOK. Temel işlevler:

- Kullanıcı kıyafetlerini fotoğraflar, yapay zekâ otomatik etiketler (dijital gardırop).
- Kullanıcı kombinlerini **kendisi** kurar; backend sadece aday parçaları **akıllı sıralar**. Otomatik kombin üretimi YOK.
- Tinder tarzı 3 swipe modu: stil keşfi, wishlist, gardırop temizliği.
- Wishlist + affiliate linkler (gelir kaynağı).
- Abonelik: 7 gün ücretsiz deneme, sonra aylık 199,99 TL / yıllık 1.899,99 TL. Ödemeler App Store / Google Play üzerinden, **RevenueCat** ile yönetilir.
- Diller: Türkçe ve İngilizce. İlk pazar Türkiye.
- Sohbet eden yapay zekâ asistanı YOK; yapay zekâ arka planda çalışır.

## 2. Teknoloji yığını

- **Runtime:** Node.js güncel LTS, TypeScript (strict).
- **Framework:** NestJS + Fastify adapter `[VARSAYILAN]`.
- **Veritabanı:** PostgreSQL 16+ ve `pgvector` eklentisi.
- **ORM:** Drizzle ORM `[VARSAYILAN]` (pgvector tipini destekler). Migration'lar repoda versiyonlu.
- **Kuyruk:** BullMQ + Redis. Redis aynı zamanda cache ve rate limit için.
- **Depolama:** S3 uyumlu obje depolama (Cloudflare R2 `[VARSAYILAN]`) + CDN. Görseller ASLA Node sürecinin içinden akmaz; presigned URL kullanılır.
- **Görsel işleme:** `sharp` (sadece worker'da; thumbnail ve WebP dönüşümü).
- **Validasyon:** Zod (DTO'lar ve yapay zekâ çıktıları için).
- **API dokümanı:** OpenAPI 3 otomatik üretilsin; mobil tarafta tipli client üretmek için kullanılacak.
- **Loglama:** pino (JSON). **Hata takibi:** Sentry.
- **Test:** Vitest; entegrasyon testleri Testcontainers (Postgres + Redis) ile.
- **Yerel geliştirme:** `docker-compose` (postgres+pgvector, redis, minio).
- **CI:** GitHub Actions (lint, typecheck, test, migration kontrolü).

Tüm dış servis anahtarları ve **model adları** ortam değişkeninde durur, kodda sabit yazılmaz. `.env.example` eksiksiz olsun.

## 3. Mimari kurallar

1. **Stateless API.** Uygulama sunucusu yatayda çoğaltılabilir olmalı; oturum durumu tutma.
2. **Ağır iş kuyrukta.** Yapay zekâ çağrıları, thumbnail, embedding, katalog importu → BullMQ worker'ları. API anında cevap döner, durum `processing` → `ready` / `failed` olarak izlenir.
3. **API ve worker aynı kod tabanında, ayrı süreçler** (`main.api.ts`, `main.worker.ts`).
4. Modüler yapı: her domain kendi NestJS modülü (aşağıdaki bölüm 5).
5. API versiyonlu: `/v1/...`.
6. Hata cevapları tek formatta: `{ error: { code: "WARDROBE_ITEM_NOT_FOUND", message, details? } }`. `code` alanı mobilde i18n anahtarı olarak kullanılacak. Backend kullanıcıya gösterilecek metin üretmez; enum/anahtar döner.
7. Tüm listeler cursor tabanlı sayfalama kullanır.
8. Gemini API anahtarı yalnızca sunucuda. Mobil uygulama hiçbir yapay zekâ servisini doğrudan çağırmaz.
9. Idempotency: istemcinin tekrar gönderebileceği POST'lar (`swipe`, `upload complete`, webhook'lar) `Idempotency-Key` veya olay ID'si ile güvenli olmalı.

## 4. Kimlik doğrulama ve hesap

- Giriş yöntemleri: **Sign in with Apple**, **Google Sign-In**, **e-posta + tek kullanımlık kod (OTP)** `[VARSAYILAN]`.
  - Apple ve Google ID token'larını sunucuda doğrula (issuer, audience, imza, süre).
  - E-posta OTP için transactional e-posta sağlayıcısı arayüz arkasında olsun (Resend/Postmark vb. `[VARSAYILAN: Resend]`).
- Oturum: kısa ömürlü access JWT (15 dk) + rotasyonlu refresh token (DB'de hash'li, cihaz başına, iptal edilebilir). Refresh token yeniden kullanımı tespit edilirse o zincirin tamamı iptal edilir.
- Kullanıcı profili: `locale` (tr | en), `displayName`, `city` + koordinat (hava durumu için), `stylePreference` (women | men | all), onboarding durumu, bildirim tercihleri, stil profili (bölüm 5.9).
- **Hesap silme zorunlu** (Apple kuralı + KVKK): `DELETE /v1/me` → tüm kullanıcı verisi, S3 objeleri ve refresh token'lar silinir; RevenueCat'te ilgili müşteri kaydı için RevenueCat REST API'nin silme uç noktası çağrılır. İş kuyrukta yapılır, kullanıcıya hemen 202 döner.
- **Veri dışa aktarma** (KVKK): `POST /v1/me/export` → kuyrukta JSON + görsel linkleri içeren zip üretilir, süreli link döner.
- Açık rıza kayıtları: KVKK aydınlatma metni ve açık rıza sürümü + onay zamanı saklansın.

## 5. Modüller

### 5.1 Subscriptions (RevenueCat)

- RevenueCat'te `app_user_id` = bizim kullanıcı UUID'miz. Mobil uygulama girişten sonra RevenueCat `logIn(userId)` çağırır. Backend bunu dokümante etsin.
- Tek entitlement: `premium`. Ürünler (mağazalarda ve RevenueCat'te tanımlanır, backend'de hardcode edilmez): aylık, yıllık; ikisinde de 7 günlük ücretsiz deneme (introductory offer).
- **Webhook uç noktası:** `POST /v1/webhooks/revenuecat`
  - Authorization header'ı sabit zamanlı karşılaştırmayla doğrula; HMAC imza (`X-RevenueCat-Webhook-Signature`) açıksa ham gövde üzerinden doğrula.
  - Olay `id`'sini `webhook_events` tablosunda tut; aynı olayı ikinci kez işleme.
  - 200'ü hızlı dön (60 sn limiti var), asıl işi kuyruğa at.
  - Worker, olay tipine göre ayrı ayrı mantık yazmak yerine RevenueCat REST API'den abonenin güncel durumunu çeker ve `subscriptions` tablosunu senkronlar (RevenueCat'in önerdiği yöntem).
  - Saklanacaklar: entitlement aktif mi, `period_type` (trial | normal | intro), `expires_at`, `store` (app_store | play_store), ürün ID, `will_renew`, `billing_issue_detected_at`, `grace period` bilgisi, son senkron zamanı.
- `GET /v1/me/subscription` → istemcinin gösterebileceği özet.
- `PremiumGuard`: premium gerektiren uç noktaları korur. Hangi özelliklerin premium olduğu **remote config'ten** okunur (bkz. 5.12), çünkü deneme bitince ücretsiz kullanıcının neye erişeceği henüz kesinleşmedi. Guard, DB'deki durum eskiyse (örn. 24 saatten eski) arka planda senkron tetikler.
- Webhook için imzalı örnek payload'larla entegrasyon testi yaz.

### 5.2 Media / Uploads

Akış:
1. İstemci arka planı **cihazda** siler (iOS Vision / Android ML Kit), PNG/WebP üretir.
2. `POST /v1/uploads` → `{ purpose: "wardrobe_item" | "avatar" | ..., contentType, size }` → presigned PUT URL + `uploadId`. Toplu ekleme için `POST /v1/uploads/batch` (en fazla 20).
3. İstemci doğrudan R2'ye yükler.
4. `POST /v1/uploads/:id/complete` → backend objeyi HEAD ile doğrular (boyut, MIME, sahiplik), `sharp` worker'ına thumbnail (256, 768 px WebP) işi atar.
- Limitler: maks. 10 MB, sadece image/png, image/webp, image/jpeg. Tamamlanmamış yüklemeler 24 saat sonra cron ile temizlenir.
- Görseller CDN URL'leriyle sunulur; özel içerik için imzalı/süreli URL seçeneği olsun.

### 5.3 Wardrobe (Gardırop)

- `wardrobe_items`: kullanıcı, görsel referansları, `status` (processing | ready | failed | donated | archived), `tags` (JSONB, şema aşağıda), `tags_source` (ai | user_edited), `ai_model_version`, `embedding vector(768)`, `last_worn_at`, `wear_count`, `created_at`.
- CRUD + filtreleme (kategori, renk, mevsim, resmiyet, durum) + metin araması.
- Kullanıcı yapay zekâ etiketlerini düzeltebilir; düzeltilen alanlar işaretlenir (ileride model değerlendirmesi için).
- `POST /v1/wardrobe/items/:id/worn` ve kombin üzerinden giyildi işaretleme → `wear_events` tablosu, `last_worn_at` ve `wear_count` güncellenir.
- **"Benzeri var" uyarısı:** `GET /v1/wardrobe/items/:id/similar` ve wishlist'e ekleme sırasında aynı kategori + kosinüs benzerliği eşiği (config) ile benzer parçaları döner.

**Etiket şeması (Zod ile tanımla, OpenAPI'de yayınla):**

```ts
{
  category: "top" | "bottom" | "dress" | "outerwear" | "shoes" | "bag" | "accessory",
  subcategory: string,            // enum listesi: shirt, t-shirt, blouse, jeans, skirt, sneakers, ...
  colors: { name: ColorEnum, hex: string, role: "primary" | "secondary" | "accent" }[],
  pattern: "solid" | "striped" | "checked" | "floral" | "graphic" | "animal" | "other",
  material?: MaterialEnum,
  seasons: ("spring" | "summer" | "autumn" | "winter")[],
  formality: 1 | 2 | 3 | 4 | 5,   // 1 = spor/ev, 5 = çok resmi
  warmth: 1 | 2 | 3,              // hafif / orta / kalın
  styleTags: StyleEnum[],         // casual, minimal, streetwear, y2k, clean-girl, boho, classic, sporty, romantic, ...
  waterproof?: boolean
}
```

Enum listelerini tek bir `taxonomy` modülünde tut; hem yapay zekâ prompt'u hem validasyon hem OpenAPI buradan beslensin. Kullanıcıya dönük çeviriler mobil tarafta.

### 5.4 AI Pipeline (worker'lar)

- **Etiketleme işi:** thumbnail hazır olunca tetiklenir. Gemini'nin Flash-Lite sınıfı modeli (`GEMINI_TAGGING_MODEL` env), **yapılandırılmış JSON çıktı** (response schema taxonomy'den üretilir). Çıktı Zod ile doğrulanır; geçersizse 1 kez düzeltme denemesi, sonra `failed` + kullanıcı elle etiketler.
- **Embedding işi:** `gemini-embedding-2` (multimodal, görsel girdi alır), 768 boyut (`GEMINI_EMBEDDING_MODEL`, `EMBEDDING_DIM` env). pgvector'da HNSW index, kosinüs mesafesi.
- Aynı pipeline affiliate ürünleri ve editör kombin parçaları için de çalışır (tek servis, farklı kaynak tipi).
- Retry: üstel geri çekilme, maks. 3 deneme; 429/5xx ayrımı. Kuyruk başına eşzamanlılık limiti config'ten.
- **Maliyet koruması:** kullanıcı başına günlük yapay zekâ iş kotası (config), aşılırsa iş ertesi güne ertelenir. Her çağrının model, token ve süre bilgisi `ai_usage` tablosuna yazılır.
- Model sağlayıcısı bir arayüz arkasında olsun (`TaggingProvider`, `EmbeddingProvider`); ileride model değiştirmek tek dosyalık iş olsun.
- **Gemini SDK ve API detaylarını güncel resmi dokümandan kontrol et; hatırladığın imzalara güvenme.**

### 5.5 Outfits (Kombinler)

- `outfits`: kullanıcı, ad, slotlar, etiketler (occasion: work | casual | party | date | sport | travel ...), `is_draft`, kapak görseli (istemcinin ürettiği kolaj yüklenebilir), `last_worn_at`.
- Slot kuralları: `top + bottom` VEYA `dress`; `shoes` önerilir; `outerwear`, `bag`, `accessory[]` opsiyonel. Sunucu validasyonu yapar.
- Bir kombinde gardırop parçası veya **wishlist parçası** olabilir (wishlist parçaları "sahip değil" olarak işaretlenir). "Bunu alsam mı?" akışı bu sayede taslak kombinle çalışır.
- **Akıllı sıralama uç noktası:** `POST /v1/outfits/candidates`
  - Girdi: `{ targetSlot, selectedItemIds[], date?, includeWishlist? }`
  - Çıktı: hedef slottaki **tüm** uygun parçalar, skora göre sıralı, skor kırılımıyla: `{ itemId, score, breakdown: { formality, color, weather, taste } }`. Uyumsuzlar gizlenmez, sona düşer.
  - Skor = ağırlıklı toplam (ağırlıklar remote config'te):
    1. **Resmiyet eşleşmesi** (en yüksek ağırlık): seçili parçaların resmiyet ortalamasına mesafe.
    2. **Renk uyumu:** nötr + vurgu, ton uyumu, çatışan desen cezası (örn. iki desenli parça).
    3. **Hava / mevsim:** tarih verilmişse hava durumuna göre `warmth`, `waterproof`, mevsim.
    4. **Kişisel zevk:** parça embedding'i ile kullanıcının zevk vektörü arasındaki benzerlik.
  - Skorlama saf, test edilebilir bir fonksiyon olsun; kapsamlı birim testleri yaz (örn. "resmi gömlek seçildiğinde ilk 3 alt parça resmi olmalı").
- Kombin CRUD, "giyildi" işaretleme (içindeki tüm parçaların wear kaydını da günceller).

### 5.6 Today (Bugünün kombini)

- `GET /v1/today` → kullanıcının şehri için hava durumu + kullanıcının **kendi kayıtlı kombinlerinden** güne en uygun 1 ana + 2 alternatif. Sistem yeni kombin üretmez.
- Kriterler: hava/mevsim uyumu, son 7 günde giyilmemiş olması, etkinlik etiketi (hafta içi → work ağırlığı), zevk skoru.
- Kayıtlı kombin yoksa boş durum + "kombin oluştur" önerisi için bayrak döner.
- Sonuç kullanıcı başına gün boyunca cache'lenir (tarih + saat dilimi Europe/Istanbul varsayılan, kullanıcı ayarından).
- Sabah bildirimi: cron ile kullanıcının yerel saatine göre (varsayılan 08:00) push. Push sağlayıcısı arayüz arkasında: Expo Push `[VARSAYILAN, mobil Expo kullanıyorsa]`, değilse FCM + APNs. Push token kayıt uç noktası: `POST /v1/me/devices`.

### 5.7 Weather

- `WeatherProvider` arayüzü; varsayılan sağlayıcı config'ten `[VARSAYILAN: Open-Meteo ticari plan veya OpenWeatherMap — lisans koşullarını kontrol et]`.
- Konum (yuvarlanmış koordinat) + gün bazında Redis cache (1 saat).
- Normalize çıktı: min/max sıcaklık, yağış olasılığı, rüzgâr, genel durum kodu.

### 5.8 Discovery (Stil keşfi swipe'ı)

- İçerik kaynakları (v1): **editör kombinleri** (admin'in oluşturduğu, parçaları affiliate ürünlerden veya editör görsellerinden) ve **affiliate ürünler**. Kullanıcı kombinleri v2; veri modeli buna açık olsun (`source_type` alanı).
- `GET /v1/discovery/feed?mode=style&limit=20` → kart listesi. Karışım:
  - ~%70 kullanıcının zevk vektörüne yakın içerik,
  - ~%30 **keşif** (zevk vektöründen uzak, farklı stil etiketleri). Oran `discovery.exploration_ratio` remote config'ten okunur, A/B testine uygun olsun (kullanıcı bazlı deney grubu ataması).
  - Daha önce swipe edilmiş kartlar tekrar gösterilmez.
- `POST /v1/discovery/swipes` → `{ cardId, cardType, direction: "like" | "dislike", mode, dwellMs? }` (toplu gönderime izin ver).
- Beğeni/beğenmeme → kullanıcının zevk vektörü güncellenir (v1: beğenilenlerin üstel hareketli ortalaması, beğenilmeyenlere hafif negatif ağırlık). Güncelleme kuyrukta, toplu.
- Beğenilen affiliate ürünü otomatik olarak wishlist'e eklenir (kullanıcı ayarıyla kapatılabilir).
- **Tüm swipe olayları ham olarak saklanır** (`swipe_events`); ileride kendi sıralama modelini eğitmek için ana veri kaynağı bu. Şemayı buna göre tasarla.

### 5.9 Onboarding stil testi

- `GET /v1/onboarding/style-quiz` → editörün seçtiği, stilleri dengeli dağılmış ~20 kart (config'ten set ID).
- Swipe'lar 5.8 ile aynı uç noktadan gelir (`mode=onboarding`).
- `POST /v1/onboarding/style-quiz/complete` → beğenilen kartların stil etiketlerinden ağırlıklı dağılım hesaplanır, en baskın 2 stil + yüzdeler döner (örn. `{ primary: "clean-girl", secondary: "y2k", distribution: {...} }`). Sonuç kullanıcının stil profiline yazılır ve zevk vektörünün başlangıç değeri olur. İstemci sonuç kartını ve ardından paywall'u gösterir.

### 5.10 Wishlist

- `wishlist_items`: kaynak (`affiliate_product` | `manual_link` | `manual_photo`), ürün referansı, görsel, başlık, marka, **kayıt anındaki** fiyat (bilgi amaçlı; fiyat takibi v1'de YOK), affiliate URL, `status` (active | dropped | purchased).
- Manuel ekleme: link (sadece OpenGraph başlık/görsel çekme, arka planda, zaman aşımı ve SSRF korumasıyla) veya fotoğraf.
- Wishlist parçaları da etiketleme + embedding pipeline'ından geçer (kombin sıralaması ve "benzeri var" için).
- **Wishlist swipe'ı:** `GET /v1/wishlist/review-queue` → 14+ gündür bakılmamış öğeler; `POST /v1/wishlist/:id/review` → `drop` (vazgeç) | `keep` (hâlâ istiyorum; tekrar sorma süresi uzar).
- "Satın aldım" işaretlenirse öğe gardıroba taşınabilir (tek tık, görsel ve etiketler kopyalanır).

### 5.11 Cleanup (Gardırop temizliği swipe'ı)

- `GET /v1/cleanup/queue` → `last_worn_at` N günden eski (varsayılan 180, config) ya da eklendiği tarihten M gün geçmiş ve hiç giyilmemiş parçalar.
- `POST /v1/cleanup/:itemId/decision` → `donate` (bağışla: `status = donated`, gardırop listelerinde gizlenir ama istatistik için saklanır) | `keep` (tut: kullanıcı bazlı erteleme, varsayılan 90 gün tekrar sorma).
- "Sat" seçeneği bilinçli olarak YOK.

### 5.12 Remote config ve feature flag'ler

- `app_config` tablosu + Redis cache: `discovery.exploration_ratio`, skor ağırlıkları, cleanup gün sayıları, yapay zekâ kotaları, premium'a bağlı özellik listesi, benzerlik eşikleri, minimum desteklenen uygulama sürümü.
- `GET /v1/config` → istemciye açık alt küme.
- Basit A/B desteği: deney tanımı + kullanıcıya deterministik grup ataması (userId hash).

### 5.13 Affiliate katalog

- `products`: `source` (ağ/mağaza), `external_id`, başlık, marka, kategori, fiyat, para birimi, görsel URL'leri, ürün URL'si, affiliate URL'si, stok/aktiflik, etiketler, embedding, `last_seen_at`.
- **Importer arayüzü:** `AffiliateFeedImporter` (CSV/XML/JSON feed okuma, normalize etme, upsert). Hangi affiliate ağıyla çalışılacağı henüz belli değil; örnek olarak genel bir CSV importer'ı ve bir mock feed yaz. Import zamanlanmış iş olarak çalışır; feed'de görünmeyen ürünler pasife alınır.
- Ürün görselleri kendi depolamamıza kopyalanır (hotlink yok), sonra etiketleme + embedding.
- **Tıklama yönlendirme:** `GET /v1/r/:productId` (veya kısa link) → tıklamayı `affiliate_clicks` tablosuna yazar (kullanıcı, ürün, kaynak ekran), UTM/alt ID ekler, 302 ile affiliate URL'ye yönlendirir. Affiliate URL'leri istemciye çıplak verilmez.

### 5.14 Admin

- `role = admin` kullanıcılar için ayrı `/v1/admin` altında API: editör kombini oluşturma/düzenleme (ürün veya editör görsellerinden), onboarding quiz setleri, katalog import tetikleme, remote config düzenleme, kullanıcı arama (destek için, hassas alanlar maskeli).
- v1'de ayrı admin arayüzü yazma; OpenAPI + basit bir seed/CLI yeterli. (İleride hafif bir panel eklenebilir.)

## 6. Güvenlik ve operasyon

- Rate limit: IP bazlı (auth uç noktaları sıkı) + kullanıcı bazlı (Redis). Yapay zekâ tetikleyen uç noktalarda ayrıca günlük kota.
- `helmet` benzeri güvenlik başlıkları, istek gövdesi boyut limiti, tüm girdilerde Zod validasyonu.
- Her sorguda kullanıcı sahipliği kontrolü (başkasının parçasına erişim → 404). Bunun için ortak bir repository/guard deseni kullan ve testle.
- Link önizleme ve feed importunda SSRF koruması (özel IP aralıklarını engelle, zaman aşımı, boyut limiti).
- Sırlar sadece env / secret manager'da. Loglarda token, e-posta, görsel URL imzası maskelenir.
- Health: `/health/live`, `/health/ready` (DB, Redis, kuyruk).
- Metrikler: istek süresi, kuyruk derinliği, yapay zekâ çağrı süresi/hatası (Prometheus formatı veya sağlayıcıya göre).
- Graceful shutdown (API ve worker).
- Deploy hedefi `[VARSAYILAN: Docker imajı; platform sonra seçilecek — Fly.io / Railway / Render / kendi VPS]`. Tek Dockerfile, iki komut (api, worker).

## 7. Veritabanı

Önerilen tablolar (gerekirse genişlet, gerekçesini yaz):
`users`, `auth_identities`, `refresh_tokens`, `email_otps`, `consents`, `devices`, `subscriptions`, `webhook_events`, `uploads`, `wardrobe_items`, `wear_events`, `outfits`, `outfit_items`, `wishlist_items`, `products`, `editorial_outfits`, `editorial_outfit_items`, `discovery_cards` (feed'e girecek içerik için birleşik görünüm veya tablo), `swipe_events`, `user_taste_profiles` (stil profili + zevk vektörü), `cleanup_decisions`, `affiliate_clicks`, `app_config`, `experiments`, `ai_usage`, `data_export_jobs`.

- Tüm ID'ler UUID v7.
- `created_at` / `updated_at` her tabloda.
- Hesap silmede kaskad kuralları net olsun; istatistik için gereken toplu veriler anonimleştirilir.
- Seed script'i: örnek taxonomy, 50 mock ürün, 3 editör kombini, 1 onboarding quiz seti, test kullanıcısı.

## 8. Çalışma şeklin

1. **Başlamadan önce** bana şunları sor (varsayılanları öner, onayımı al):
   - `[VARSAYILAN]` işaretli kararlar (NestJS vs saf Fastify, Drizzle, R2, Resend, push sağlayıcı, deploy hedefi).
   - Mobil uygulama Expo mu, bare React Native mi?
   - Deneme/abonelik bittikten sonra ücretsiz kullanıcı hangi özellikleri kullanabilecek?
2. Her faz için önce kısa bir plan yaz, onayımı bekle, sonra uygula. Her faz sonunda: çalışan kod, testler, migration'lar, güncel OpenAPI, README'de nasıl çalıştırılacağı.
3. Küçük, anlamlı commit'ler at.
4. Harici servislerin (RevenueCat, Gemini, Apple/Google auth, R2, push) API detaylarını **güncel resmi dokümandan** kontrol et. Emin olmadığın bir alanı uydurma, bana sor veya TODO ile işaretle.
5. Her harici servis bir arayüz arkasında olsun ve testlerde mock'lansın; yerel geliştirmede gerçek anahtar olmadan çalışabilsin (mock sağlayıcılar).

## 9. Fazlar

- **Faz 0 — İskelet:** repo yapısı, docker-compose, config/env yönetimi, logging, hata formatı, health, OpenAPI, CI, migration altyapısı, test altyapısı.
- **Faz 1 — Kimlik ve hesap:** Apple/Google/e-posta OTP, JWT + refresh rotasyonu, profil, cihaz kaydı, rıza kayıtları, hesap silme ve veri dışa aktarma iskeleti.
- **Faz 2 — Abonelik:** RevenueCat webhook, senkron worker, `PremiumGuard`, remote config'e bağlı premium özellik listesi.
- **Faz 3 — Medya ve gardırop:** presigned upload, thumbnail worker, gardırop CRUD, taxonomy modülü.
- **Faz 4 — AI pipeline:** etiketleme + embedding worker'ları, kota, `ai_usage`, "benzeri var".
- **Faz 5 — Kombinler:** kombin CRUD, slot validasyonu, akıllı sıralama motoru (kapsamlı birim testleriyle), giyildi takibi, hava durumu servisi, Today uç noktası.
- **Faz 6 — Katalog ve keşif:** affiliate importer, ürün pipeline'ı, editör kombinleri (admin API), discovery feed + keşif oranı + A/B, swipe olayları, zevk vektörü, onboarding stil testi.
- **Faz 7 — Wishlist ve temizlik:** wishlist (affiliate + manuel), wishlist swipe, cleanup swipe, affiliate tıklama yönlendirme.
- **Faz 8 — Sertleştirme:** rate limit ve kotaların son hali, sabah bildirimi cron'u, metrikler, yük testi (k6 ile temel senaryolar), güvenlik gözden geçirmesi, deploy dokümanı.

## 10. Kapsam dışı (v1'de YAPMA)

- Uygulama içi alım satım, ödeme alma (ödemeler sadece mağazalar + RevenueCat).
- Sohbet eden yapay zekâ asistanı.
- Otomatik kombin üretimi (sadece sıralama).
- Fiyat takibi / fiyat düşüş bildirimi.
- Virtual try-on (v2; ama kota ve `ai_usage` altyapısı ileride "günde 1 try-on hakkı" için yeniden kullanılabilecek şekilde tasarlansın).
- Kullanıcıların paylaştığı kombinler, sosyal özellikler, moderasyon (v2; veri modeli buna kapı bıraksın).
- Bakım hatırlatıcıları, etiketten yıkama talimatı okuma, eşya konumu, ödünç takibi.
- Bavul planlayıcı, istatistikler/Wrapped, renk analizi, challenge'lar (v2).
