# Paylaşımlık API Rehberi

Web sitesi ve ileride yazılacak mobil uygulama aynı API'yi kullanır. Bu dosya her uç noktayı listeler. `tests/api-docs.test.ts`, uygulamadaki her uç noktanın burada bir başlığı olduğunu ve burada olup artık var olmayan bir uç nokta kalmadığını kontrol eder: yeni bir uç nokta eklerken buraya da eklemezsen testler kırılır.

## Genel kurallar

**Adres.** Canlıda API sitenin kendi adresinde, `/api` altında çalışır (örneğin `https://63-185-181-190.sslip.io/api/items`). Yerelde backend `http://localhost:4000` adresindedir.

**Biçim.** İstek ve yanıt gövdeleri JSON'dur. Dosya yükleyen uç noktalar `multipart/form-data` alır. Tarihler `YYYY-MM-DD` biçimindedir; zaman damgaları ISO 8601'dir. Para tutarları veritabanından geldiği gibi metin (`"150.00"`) ya da sayı olabilir; alan açıklamalarına bakın.

**Kimlik doğrulama.** Giriş, kayıt ve Google girişi bir `accessToken` (15 dakika geçerli) ve bir `refreshToken` (30 gün) döndürür. Korumalı uç noktalar `Authorization: Bearer <accessToken>` başlığı ister. Access token süresi dolunca `POST /api/auth/refresh` ile yeni bir çift alınır. Her refresh token **tek kullanımlıktır**: kullanıldığında yenisi verilir, aynı token ikinci kez kullanılırsa kullanıcının bütün oturumları kapatılır. Mobil uygulama refresh token'ı cihazın güvenli deposunda saklamalı ve aynı anda iki yenileme isteği göndermemelidir.

Aşağıda her uç noktanın erişimi şöyle belirtilmiştir:
- **Herkese açık**: token gerekmez.
- **Giriş gerekli**: geçerli bir access token gerekir.
- **İsteğe bağlı giriş**: token varsa kullanılır (örneğin sahibine taslak ilanını göstermek için), yoksa da çalışır.
- **Admin**: admin rolündeki kullanıcı gerekir.

**Hatalar.** Hata yanıtları hep aynı biçimdedir:

```json
{ "error": { "message": "Açıklama", "code": "MAKİNE_OKUNUR_KOD" } }
```

Doğrulama hatalarında (400, `VALIDATION_ERROR`) alan bazında mesajlar `details.fieldErrors` içinde gelir. Uygulama mantığı `message` metnine değil `code` değerine bakmalıdır; mesajlar değişebilir.

**İstek sınırları.** IP başına 15 dakikada: kayıt, giriş, Google girişi ve çıkış için 20; yenileme için 120; diğer tüm API istekleri için 600. Sınır aşılınca 429 döner.

**Yüklemeler.** Fotoğraflar JPEG, PNG ya da WebP olmalı (en fazla 25 MB). Teslim ve uyuşmazlık kanıtları fotoğraf ya da MP4, WebM, QuickTime video olabilir (en fazla 100 MB). Yüklenen dosyalar `/uploads/...` adresinden sunulur.

**Değişiklik yaparken.** Mobil uygulama yayınlandıktan sonra eski sürümler bir süre kullanılmaya devam eder. Bu yüzden mevcut alanları silmek ya da anlamlarını değiştirmek yerine yeni alan ekleyin; kaldırılması gereken bir şey varsa önce burada "kullanımdan kalkacak" diye işaretleyin.

---

## Sistem

### GET /health
Herkese açık. Sunucunun ayakta olduğunu söyler: `{ "status": "ok" }`.

## Kimlik doğrulama

### POST /api/auth/register
Herkese açık. Yeni hesap açar. Gövde: `email`, `password` (8-72 karakter), `fullName` (2-150), isteğe bağlı `phone`. Yanıt: `{ user, accessToken, refreshToken }`.

### POST /api/auth/login
Herkese açık. Gövde: `email`, `password`. Yanıt: `{ user, accessToken, refreshToken }`. Hesap Google ile açılmışsa ya da askıya alınmışsa hata döner.

### POST /api/auth/google
Herkese açık. Google ile giriş ya da kayıt. Gövde: `idToken` (Google Identity Services'ten alınan kimlik belirteci). Aynı e-postayla şifreli bir hesap varsa ona bağlanır. Yanıt: `{ user, accessToken, refreshToken }`.

### POST /api/auth/refresh
Herkese açık. Gövde: `refreshToken`. Yeni bir `{ user, accessToken, refreshToken }` çifti döndürür; gönderilen token geçersiz olur.

### POST /api/auth/logout
Herkese açık. Gövde: `refreshToken`. O oturumu kapatır. Token zaten geçersizse de başarılı döner.

## Kullanıcılar

### GET /api/users/me
Giriş gerekli. Giriş yapmış kullanıcının bilgileri, güven puanı dahil. `hasPassword` alanı hesabın şifreli mi yoksa yalnızca Google ile mi açıldığını söyler.

### PATCH /api/users/me
Giriş gerekli. Profili günceller. Gövde (hepsi isteğe bağlı): `fullName`, `phone`, `bio`, `city`, `district`, `avatarUrl`.

### DELETE /api/users/me
Giriş gerekli. Hesabı kalıcı olarak siler: kişisel bilgiler temizlenir, ilanlar yayından kalkar, oturumlar kapanır; geçmiş kiralamalar, mesajlar ve yorumlar "Silinmiş kullanıcı" adıyla kalır. Gövde: şifreli hesaplarda `password`, yalnızca Google ile açılan hesaplarda `confirmEmail` (hesabın e-postası). Devam eden bir kiralama varsa 409 `ACTIVE_RENTALS` döner; yanıtlanmamış talepler kendiliğinden iptal edilir. Başarıda 204.

### GET /api/users/me/listings
Giriş gerekli. Kullanıcının kendi ilanları (taslak ve pasifler dahil, silinenler hariç).

### GET /api/users/me/earnings
Giriş gerekli. İlan sahibinin kazanç özeti: `totals` (tamamlanan kazanç, devam edenlerden beklenen, sayılar), son 6 ay (`months`, Türkiye saatine göre) ve ilan bazında döküm (`items`). Tutarlar kiralama bedelidir; ödeme sistemi bağlı olmadığı için gerçek para hareketini göstermez.

### GET /api/users/:id
Herkese açık. Bir kullanıcının herkese açık profili, puanı ve güven seviyesi. Silinmiş hesaplar için 404. Kullanıcı hakkında en az 3 herkese açık yorum varsa ve yapay zeka açıksa `reviewSummary` alanında yorumların özeti gelir (`{ summary, positives, negatives }`); yoksa `null`. Özet arka planda hazırlanır, bu yüzden yeni yorumlar özete bir sonraki görüntülemede yansır.

### GET /api/users/:id/reviews
Herkese açık. Kullanıcı hakkında yazılmış yorumlar.

## Hesap doğrulama

### GET /api/verification
Giriş gerekli. Doğrulama durumu: e-posta, telefon ve kimlik adımları, her adımın puanı, `demoMode` (kodların ekranda gösterildiği mod) ve `realEmail` (e-posta kodlarının gerçekten gönderilip gönderilmediği).

### POST /api/verification/email/send
Giriş gerekli. E-posta doğrulama kodu gönderir (10 dakika geçerli). E-posta sunucusu yapılandırılmamışsa ve demo modu açıksa kod yanıtta `demoCode` olarak döner.

### POST /api/verification/email/confirm
Giriş gerekli. Gövde: `code` (6 hane). En fazla 5 deneme hakkı vardır.

### POST /api/verification/phone/send
Giriş gerekli. Önce e-postanın doğrulanmış olması gerekir. Gövde: `phone` (Türkiye cep numarası). SMS sağlayıcısı olmadığı için şu an yalnızca demo modunda çalışır ve kodu `demoCode` olarak döndürür.

### POST /api/verification/phone/confirm
Giriş gerekli. Gövde: `code` (6 hane).

### POST /api/verification/id
Giriş gerekli. Önce telefonun doğrulanmış olması gerekir. Gövde: `tckn` (11 hane), `consent: true`. Şu an yalnızca numaranın yapısını kontrol eder; numara saklanmaz, yalnızca tek yönlü özeti tutulur.

## Kategoriler

### GET /api/categories
Herkese açık. Aktif kategoriler, varsayılan risk seviyeleriyle.

## İlanlar

### POST /api/items
Giriş gerekli. Yeni ilan. Gövde: `title`, `description`, `categoryId`, `dailyPrice`; isteğe bağlı `weeklyPrice`, `depositAmount`, `brand`, `model`, `serialNumber`, `condition` (`new`, `like_new`, `good`, `fair`), `riskLevel`, `deliveryMethod` (`pickup`, `delivery`, `both`), `city`, `district`, `lat`, `lng`, `status` (`draft` ya da `active`), `accessories` (`[{ name, quantity }]`).

### GET /api/items
Herkese açık. Yayındaki ilanları arar. Sorgu parametreleri (hepsi isteğe bağlı): `q` (metin), `categoryId`, `ownerId`, `minPrice`, `maxPrice`, `city`, `condition`, `riskLevel`, `lat` + `lng` + `radiusKm` (konuma göre, varsayılan 25 km), `startDate` + `endDate` (o tarihlerde müsait olanlar), `page`, `pageSize` (en fazla 50). Yanıt: `{ items, total, page, pageSize }`.

### GET /api/items/:id
İsteğe bağlı giriş. İlan detayı: fotoğraflar, aksesuarlar, kategori ve sahibi. Taslak ya da pasif ilanları yalnızca sahibi görür.

### PATCH /api/items/:id
Giriş gerekli, yalnızca ilan sahibi. `POST /api/items` alanlarının herhangi biri; `status` ayrıca `paused` olabilir.

### DELETE /api/items/:id
Giriş gerekli, yalnızca ilan sahibi. İlanı yayından kaldırır (geçmiş kiralamalar için kayıt kalır). 204.

### POST /api/items/:id/images
Giriş gerekli, yalnızca ilan sahibi. `multipart/form-data`, alan adı `images` (birden çok dosya).

### DELETE /api/items/:id/images/:imageId
Giriş gerekli, yalnızca ilan sahibi. Bir fotoğrafı siler.

### GET /api/items/:id/availability
Herkese açık. İlanın dolu tarih aralıkları (kabul edilmiş kiralamalar ve sahibinin kapattığı günler).

### POST /api/items/:id/availability-blocks
Giriş gerekli, yalnızca ilan sahibi. Tarih kapatır. Gövde: `startDate`, `endDate`.

### DELETE /api/items/:id/availability-blocks/:blockId
Giriş gerekli, yalnızca ilan sahibi. Elle kapatılan bir aralığı açar; kiralamadan gelen aralıklar silinemez.

## Favoriler

### GET /api/favorites
Giriş gerekli. Favori ilanlar, en son eklenen önce. Yayından kalkan ilanlar listede görünmez.

### PUT /api/favorites/:itemId
Giriş gerekli. İlanı favorilere ekler; zaten ekliyse bir şey değişmez. Yayında olmayan ilan için 404. 204.

### DELETE /api/favorites/:itemId
Giriş gerekli. İlanı favorilerden çıkarır. 204.

## Kiralamalar

Bir kiralamanın durumları sırasıyla: `PENDING` (talep) → `ACCEPTED` → `READY_FOR_HANDOVER` → `ACTIVE` (eşya kiracıda) → `RETURN_PENDING` → `RETURNED` → `COMPLETED`. Yan yollar: `REJECTED`, `CANCELLED`, `DISPUTED` (uyuşmazlık).

### POST /api/rentals
Giriş gerekli. Kiralama talebi. Gövde: `itemId`, `startDate`, `endDate` (başlangıç geçmişte olamaz). Fiyat, hizmet bedeli ve depozito sunucuda hesaplanır. Yüksek riskli ürünler için belirli bir güven puanı gerekir.

### GET /api/rentals
Giriş gerekli. Kullanıcının kiralamaları. Sorgu: `role` (`renter` ya da `owner`), `status`.

### GET /api/rentals/:id
Giriş gerekli, yalnızca tarafları. Kiralama detayı.

### PATCH /api/rentals/:id/accept
Giriş gerekli, yalnızca eşya sahibi. Bekleyen talebi kabul eder; tarihleri kapatır ve depozitoyu kaydeder.

### PATCH /api/rentals/:id/reject
Giriş gerekli, yalnızca eşya sahibi. Bekleyen talebi reddeder.

### PATCH /api/rentals/:id/cancel
Giriş gerekli, taraflardan biri. Bekleyen ya da kabul edilmiş kiralamayı iptal eder.

### GET /api/rentals/:id/handover
Giriş gerekli, yalnızca tarafları. Teslim alma ve iade kayıtlarının özeti: hangi adımların fotoğrafı yüklendi, kim hazır dedi, kim onayladı.

### POST /api/rentals/:id/handover/pickup/media
Giriş gerekli, eşya sahibi. Teslim alma kaydı için tek bir adımın fotoğrafını ya da videosunu yükler. `multipart/form-data`: dosya alanı `media`, adım alanı `step` (`FRONT`, `BACK`, `LEFT`, `RIGHT`, `DAMAGE`, `SERIAL`, `ACCESSORIES`, `VIDEO`).

### PATCH /api/rentals/:id/handover/pickup/ready
Giriş gerekli, eşya sahibi. Teslim kaydını tamamlar ve kiracının onayına sunar. Gövde: isteğe bağlı `notes`.

### PATCH /api/rentals/:id/handover/pickup/confirm
Giriş gerekli, kiracı. Eşyayı kayıttaki haliyle teslim aldığını onaylar; kiralama `ACTIVE` olur. Gövde: isteğe bağlı `notes`.

### POST /api/rentals/:id/handover/return/media
Giriş gerekli, kiracı. İade kaydı için adım yüklemesi; alanlar teslim almadakiyle aynı.

### PATCH /api/rentals/:id/handover/return/ready
Giriş gerekli, kiracı. İade kaydını tamamlar ve sahibin onayına sunar.

### PATCH /api/rentals/:id/handover/return/confirm
Giriş gerekli, eşya sahibi. İadeyi onaylar; kiralama tamamlanır ve depozito serbest kalır.

### POST /api/rentals/:id/damage-reports
Giriş gerekli, taraflardan biri. Hasar bildirir. Gövde: `description`, `severity` (`minor`, `moderate`, `severe`), isteğe bağlı `handoverType` (`PICKUP` ya da `RETURN`).

### GET /api/rentals/:id/damage-reports
Giriş gerekli, yalnızca tarafları. Kiralamanın hasar bildirimleri.

### POST /api/rentals/:id/reviews
Giriş gerekli, taraflardan biri. Tamamlanan kiralama için karşı tarafa yorum. Gövde: `rating` (1-5), isteğe bağlı `comment`.

### GET /api/rentals/:id/reviews
Giriş gerekli, yalnızca tarafları. Kiralamaya yazılmış yorumlar.

### POST /api/rentals/:id/disputes
Giriş gerekli, taraflardan biri. Uyuşmazlık açar; kiralama `DISPUTED` olur. Gövde: `reason` (en az 10 karakter).

### GET /api/rentals/:id/disputes
Giriş gerekli, yalnızca tarafları. Kiralamanın uyuşmazlıkları.

## Uyuşmazlıklar

### GET /api/disputes/:disputeId
Giriş gerekli, yalnızca tarafları. Uyuşmazlık detayı ve kanıtları.

### POST /api/disputes/:disputeId/evidence
Giriş gerekli, yalnızca tarafları. Kanıt ekler. `multipart/form-data`: dosya alanı `media`, isteğe bağlı `description`.

## Bildirimler

### GET /api/notifications
Giriş gerekli. Son 100 bildirim ve okunmamış sayısı: `{ notifications, unreadCount }`. E-postası doğrulanmış kullanıcılara bildirimler e-postayla da gider.

### PATCH /api/notifications/:id/read
Giriş gerekli. Bildirimi okundu işaretler.

## Mesajlaşma

### POST /api/conversations
Giriş gerekli. Bir kullanıcıyla sohbet başlatır ya da var olanı döndürür. Gövde: `recipientId`, isteğe bağlı `itemId`, `rentalId`. Silinmiş hesaplarla sohbet başlatılamaz.

### GET /api/conversations
Giriş gerekli. Kullanıcının sohbetleri ve okunmamış mesaj sayısı.

### GET /api/conversations/:id/messages
Giriş gerekli, yalnızca katılımcılar. Sohbetin mesajları; okunmamışları okundu işaretler.

### POST /api/conversations/:id/messages
Giriş gerekli, yalnızca katılımcılar. Gövde: `content` (1-4000 karakter). İletişim bilgisi içeren mesajlar admin incelemesi için işaretlenir. Karşı taraf hesabını sildiyse 409 `RECIPIENT_DELETED`.

## Yapay zeka

### GET /api/ai/status
Herkese açık. Yapay zeka özelliklerinin açık olup olmadığını söyler: `{ "enabled": true }`. Sunucuda API anahtarı yoksa `false` olur; arayüz bu durumda yapay zeka öğelerini göstermez.

### POST /api/ai/assistant
Giriş gerekli. Destek asistanına soru sorar. Gövde: `messages` (`[{ role: "user" | "assistant", text }]`, son mesaj kullanıcıdan olmalı ve en fazla 1000 karakter). Sunucu durum tutmaz; istemci sohbetin geçmişini her istekte gönderir, sunucu son 12 mesajı kullanır. Yanıt: `{ reply }`, düz metin. Asistan yalnızca okur: kullanıcının kendi kiralamalarına, depozito durumuna ve doğrulama durumuna bakabilir, hiçbir işlem yapamaz. Günlük kullanım sınırı aşılınca 429 `AI_USER_CAP`; model geçici olarak ulaşılamazsa 502 `AI_UNAVAILABLE`.

## Admin

### GET /api/admin/stats
Admin. Kullanıcı, ilan, kiralama ve uyuşmazlık sayıları; toplam platform hizmet bedeli.

### GET /api/admin/users
Admin. Kullanıcı listesi. Sorgu: `q` (ad ya da e-posta), `page`, `pageSize` (en fazla 100).

### PATCH /api/admin/users/:id/suspend
Admin. Kullanıcıyı askıya alır. Gövde: `reason`. Adminler ve silinmiş hesaplar askıya alınamaz.

### PATCH /api/admin/users/:id/activate
Admin. Askıdaki kullanıcıyı yeniden etkinleştirir. Silinmiş hesaplar etkinleştirilemez.

### GET /api/admin/items
Admin. Tüm ilanlar. Sorgu: `status`, `page`, `pageSize`.

### DELETE /api/admin/items/:id
Admin. İlanı yayından kaldırır.

### GET /api/admin/rentals
Admin. Tüm kiralamalar. Sorgu: `status`, `page`, `pageSize`.

### GET /api/admin/disputes
Admin. Uyuşmazlıklar.

### GET /api/admin/disputes/:id
Admin. Uyuşmazlık detayı, kanıtlar ve iki tarafın teslim kayıtları.

### PATCH /api/admin/disputes/:id/resolve
Admin. Uyuşmazlığı sonuçlandırır. Gövde: `status` (`resolved_favor_owner`, `resolved_favor_renter`, `resolved_split`), `resolutionNotes`; paylaştırmada `claimedAmount` (depozitodan sahibe verilecek tutar).

### GET /api/admin/messages/flagged
Admin. İletişim bilgisi içerdiği için işaretlenen mesajlar.
