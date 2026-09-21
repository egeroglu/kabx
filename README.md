# Kabx

Genç kadınlara yönelik, eğlenceli ve oyunsu dijital gardırop ve stil uygulaması.

## Klasörler

| Yol | İçerik |
| --- | --- |
| `apps/mobile` | Expo (React Native) mobil uygulama — şu an **demo**: mock veri, gerçek backend yok |
| `apps/api` | Backend (NestJS + Postgres/pgvector + Redis) — **Faz 1 tamam**: iskelet, kimlik ve hesap |
| `docs/MOBILE_SPEC.md` | Mobil v1 geliştirme prompt'u (Claude Code için) |
| `docs/BACKEND_SPEC.md` | Backend v1 geliştirme prompt'u (Claude Code için) |
| `docs/design/` | Tasarım kaynakları: `tokens.ts` ve ekranların HTML tasarım dosyaları |

## Demo'yu çalıştırma (Mac)

Gerekenler: Node.js 20+ (LTS), iPhone'da **Expo Go** uygulaması. iOS simülatörü için Xcode.

```bash
cd apps/mobile
npm install
npx expo start
```

- **Telefonda:** Terminalde çıkan QR kodu iPhone kamerasıyla okut, Expo Go'da açılır (telefon ve Mac aynı Wi-Fi'da olmalı).
- **iOS simülatörde:** Terminal açıkken `i` tuşuna bas.
- **Tarayıcıda (hızlı bakış):** `w` tuşuna bas. Swipe ve haptik hissi için telefonda dene.

Demo her açılışta onboarding'den (stil testi → sonuç → paywall) başlar. Profil sekmesinden tekrar izlenebilir.

## Demo'da neler var

Stil testi, stil sonucu, paywall, Bugün, Gardırop, parça detayı, toplu parça ekleme (simülasyon), Keşfet swipe, Kombin oluşturucu (akıllı sıralama), Wishlist ve wishlist swipe'ı, gardırop temizliği swipe'ı, Profil. Açık ve koyu mod.

Kıyafet görselleri şimdilik SVG silüetler; gerçek uygulamada arka planı silinmiş fotoğraflar gelecek.

## Backend'i çalıştırma

Gerekenler: **Node 24+** (`.nvmrc`) ve Docker.

```bash
nvm use
docker compose up -d
cd apps/api && cp .env.example .env && npm ci && npm run db:migrate && npm run db:seed && npm run dev:api
```

API <http://localhost:3000/v1>, OpenAPI arayüzü <http://localhost:3000/v1/docs>.
Dış servis anahtarı gerekmez — hepsi mock modunda. Ayrıntılar: `apps/api/README.md`.
