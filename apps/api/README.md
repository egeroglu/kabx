# Kabx API

Kabx'in backend'i: NestJS (Fastify) + PostgreSQL/pgvector + Redis/BullMQ.
Tek kod tabanı, **iki süreç**: `main.api.ts` (HTTP) ve `main.worker.ts` (kuyruk işleri).

Ürün ve kapsam kararları için `docs/BACKEND_SPEC.md`.

## Hızlı başlangıç

Gerekenler: **Node 24+** (repo kökünde `.nvmrc` var) ve Docker.

```bash
nvm use                       # repo kokunde, .nvmrc'yi okur
docker compose up -d          # repo kokunde: postgres+pgvector, redis, minio
cd apps/api
cp .env.example .env
npm ci
npm run db:migrate
npm run db:seed
npm run dev:api               # ayri bir terminalde: npm run dev:worker
```

- API: <http://localhost:3000/v1>
- OpenAPI arayüzü: <http://localhost:3000/v1/docs>
- MinIO konsolu: <http://localhost:59001> (kabxminio / kabxminio)

Hiçbir dış servis anahtarı gerekmez: Gemini, RevenueCat, Apple/Google, R2, hava
durumu ve e-posta varsayılan olarak `mock` modunda çalışır (`.env` içindeki
`*_PROVIDER` değişkenleri).

> Compose'un host portları bilerek standart dışı (`55432`, `56379`, `59000/59001`)
> ki makinende zaten çalışan bir Postgres/Redis ile çakışmasın.

## Komutlar

| Komut | Ne yapar |
| --- | --- |
| `npm run dev:api` / `dev:worker` | Geliştirme modu, dosya değişiminde yeniden başlar |
| `npm run build` | `dist/` üretir ve `.sql` migration'larını yanına kopyalar |
| `npm run start:api` / `start:worker` | Derlenmiş kodu çalıştırır |
| `npm run typecheck` / `lint` / `format` | Statik kontroller |
| `npm test` | Birim testleri (container gerekmez, ~1 sn) |
| `npm run test:int` | Entegrasyon testleri (Testcontainers ile gerçek Postgres + Redis) |
| `npm run db:generate` | Şema değişikliğinden SQL migration üretir |
| `npm run db:migrate` / `db:seed` | Migration'ları uygular / remote config varsayılanlarını yazar |
| `npm run openapi:export` | `openapi.json` üretir (mobil tipli client'ın kaynağı) |

## Mimari

```
src/
  main.api.ts / main.worker.ts   iki ayrı süreç, aynı kod tabanı
  core.module.ts                 ikisinin paylaştığı çekirdek (config, db, kuyruk)
  api.module.ts                  HTTP uçları
  worker.module.ts               kuyruk işleyicileri
  common/
    config/       Zod ile doğrulanan env; process.env yalnızca burada okunur
    errors/       ErrorCode sözlüğü, AppException, global filter
    logging/      pino + istek kimliği + maskeleme
    validation/   Zod pipe ve DTO yardımcıları
    openapi/      Zod → OpenAPI köprüsü, doküman üretici
    pagination/   cursor tabanlı sayfalama
  db/             Drizzle şeması, migration'lar, seed
  queue/          BullMQ bağlantısı, kuyruk kaydı, worker çalışma zamanı
  health/         /v1/health/live, /v1/health/ready
  modules/
    auth/         Apple/Google/OTP girişi, JWT + refresh rotasyonu, guard'lar
    users/        profil, cihazlar, rıza kayıtları, hesap silme, veri dışa aktarma
    email/        transactional e-posta (Resend / mock)
```

### Bilinmesi gereken kararlar

- **ESM zorunlu.** NestJS 12 ESM-only yayımlanıyor, bu yüzden paket `"type": "module"`
  ve göreli import'lar `.js` uzantılı yazılır (TypeScript kaynağında bile).
- **Derleyici `tsc`, dev çalıştırıcı SWC.** esbuild (`tsx`, Vitest'in varsayılanı)
  `emitDecoratorMetadata` desteklemez; NestJS'in DI'ı buna dayandığı için dev
  script'leri ve Vitest SWC kullanır. Production derlemesi `tsc` ile yapılır.
- **`nestjs-zod` kullanılmıyor.** 5.x peer'ları NestJS 12'yi desteklemiyor;
  Zod 4'ün yerleşik `z.toJSONSchema()`'sı üzerine ince bir köprü yazıldı.
- **`class-validator` yok.** Tek doğrulama yolu Zod.
- **DTO'lar SINIF olmalı.** Controller'da `@Body() body: SomeDto` yazılır.
  `@Body() body: z.infer<typeof schema>` yazmak doğrulamayı **sessizce** devre
  dışı bırakır: `emitDecoratorMetadata` tip takma adlarını `Object` olarak
  yayar ve pipe DTO'yu tanımaz. `test/unit/controller-validation.spec.ts` bunu
  her controller için kontrol eder; yeni controller eklerken o listeye ekle.

### Hata sözleşmesi

Her hata aynı gövdeyi döner:

```json
{ "error": { "code": "WARDROBE_ITEM_NOT_FOUND", "message": "...", "details": {} } }
```

`code`, mobil tarafta **i18n anahtarı** olarak kullanılır — backend kullanıcıya
gösterilecek metin üretmez. Tüm kodlar `src/common/errors/error-codes.ts` içinde
ve `openapi.json`'da enum olarak yayımlanır. Bir kod yayımlandıktan sonra
yeniden adlandırılmaz.

Başkasının kaynağına erişim **404** döner (403 değil): kaynağın varlığı sızmasın.

### Kimlik doğrulama

Üç giriş yöntemi de aynı yere çıkar: kullanıcı bulunur ya da oluşturulur ve bir
oturum verilir.

- **Apple / Google:** ID token sunucuda doğrulanır — JWKS'ten imza, `iss`, `aud`
  ve süre. `aud` mutlaka kendi client ID'lerimizle karşılaştırılır; aksi halde
  başka bir uygulama için verilmiş geçerli bir token kabul edilirdi.
- **E-posta OTP:** 6 haneli kod, HMAC'lenerek saklanır. Kod isteği, adres
  kayıtlı olsun olmasın **aynı cevabı** döner (hesap sayımı önlenir).
- **Hesap birleştirme:** önce `(provider, subject)`, sonra **doğrulanmış**
  e-posta ile eşleşme aranır. Doğrulanmamış e-postayla asla eşleştirme yapılmaz.

**Oturum:** 15 dakikalık access JWT + rotasyonlu refresh token. Refresh token
düz metin saklanmaz; yalnızca HMAC'i. Her yenileme eskisini tüketir ve yenisini
verir. Aynı token ikinci kez gelirse çalınmış sayılır ve o zincirin **tamamı**
iptal edilir. Sahiplenme atomik bir `UPDATE` ile yapılır, böylece eşzamanlı iki
yenilemede yalnızca biri geçebilir.

Guard'lar **global**: uçlar varsayılan olarak kapalıdır, açık olanlar `@Public()`
ile işaretlenir. Tersi olsaydı yeni bir uca guard eklemeyi unutmak sessizce veri
sızdırırdı. Kullanıcı her istekte DB'den okunur; rol değişikliği ve hesap silme
access token'ın ömrünü beklemez.

**Yerel geliştirme:** `IDENTITY_PROVIDER_MODE=mock` iken belirteç
`mock:<subject>:<email>:<ad>` biçimindedir; gerçek Apple/Google hesabı
gerekmez. E-posta sağlayıcısı da mock: OTP kodu terminale yazılır.

### KVKK

- **Rıza kayıtları** eklenir, güncellenmez ve silinmez. Metin değişince
  `CONSENT_*_VERSION` yükseltilir; `GET /v1/me` eksik rızaları `pendingConsents`
  içinde döner.
- **Hesap silme** (`DELETE /v1/me`) hemen 202 döner: hesap `pending_deletion`
  işaretlenir ve tüm oturumlar düşer. Asıl silme kuyrukta yapılır; tüm ilişkili
  satırlar `ON DELETE CASCADE` ile gider. Geri alınamaz.
- **Veri dışa aktarma** (`POST /v1/me/export`) kuyruğa iş atar; istemci durumu
  sorgular. Sürmekte olan iş varken yenisi açılmaz.

### Sayfalama

Tüm listeler cursor tabanlı. Cursor istemci için opaktır (base64url'lenmiş
`{sıralama anahtarı, id}`); içeriği sözleşmenin parçası değildir. Sorgudan
`limit + 1` kayıt çekip `buildPage()` kullanın.

## Testler

- **Birim** (`npm test`): saf fonksiyonlar, hata filtresi, env doğrulama,
  maskeleme, Zod pipe. Docker gerekmez.
- **Entegrasyon** (`npm run test:int`): Testcontainers gerçek Postgres+pgvector
  ve Redis kaldırır, migration'ları uygular, sonra gerçek Nest uygulamasını
  (filter ve Fastify eklentileri dahil) `app.inject()` ile sürer.

## Dağıtım

Tek imaj, iki komut:

```bash
docker build -t kabx-api .
docker run kabx-api node dist/main.api.js      # API
docker run kabx-api node dist/main.worker.js   # worker
docker run kabx-api node dist/db/migrate.js    # deploy öncesi migration
```

İmaj `node` kullanıcısıyla çalışır, `SIGTERM`'i doğrudan Node'a iletir
(graceful shutdown: açık istekler ve işlenen kuyruk işleri tamamlanır).

Production'da `.env` dosyası yoktur; değerler secret manager'dan gerçek ortam
değişkeni olarak gelir. `.env` yüklense bile tanımlı ortam değişkenlerini ezmez.

## Faz durumu

| Faz | Durum |
| --- | --- |
| 0 — İskelet | ✅ |
| 1 — Kimlik ve hesap | ✅ |
| 2 — Abonelik | ⏳ |
| 3 — Medya ve gardırop | ⏳ |
| 4 — AI pipeline | ⏳ |
| 5 — Kombinler | ⏳ |
| 6 — Katalog ve keşif | ⏳ |
| 7 — Wishlist ve temizlik | ⏳ |
| 8 — Sertleştirme | ⏳ |
