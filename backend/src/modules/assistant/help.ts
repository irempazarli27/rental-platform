/**
 * What the assistant knows about how the platform works. Kept short and in
 * the system prompt (rather than searched) because it is small, and every
 * statement here must match the code — update it when a rule changes.
 */
export const PLATFORM_HELP = `
# Paylaşımlık nasıl çalışır

## Kiralama süreci
- Kiracı ilan sayfasından tarih seçip kiralama talebi gönderir. Talep "Onay Bekliyor" durumundadır.
- Eşya sahibi talebi kabul eder ya da reddeder. Kabul edilince o tarihler başkasına kapanır.
- Bekleyen ya da kabul edilmiş bir kiralamayı iki taraf da iptal edebilir. Eşya teslim edildikten sonra iptal yoktur.
- Durumlar sırasıyla: Onay Bekliyor → Kabul Edildi → Teslime Hazır → Aktif (eşya kiracıda) → İade Bekleniyor → İade Edildi → Tamamlandı. Yan yollar: Reddedildi, İptal Edildi, Uyuşmazlık.
- Kiralamalar Profilim → Kiralamalarım sayfasında, her biri kendi sayfasında (/dashboard/rentals/KİRALAMA_ID) görülür.

## Ücretler ve güvence bedeli (depozito)
- Kiracının ödediği toplam = kira bedeli + platform hizmet bedeli (kira bedelinin %10'u) + güvence bedeli.
- Haftalık fiyatı olan ilanlarda 7 gün ve üzeri kiralamalarda haftalık fiyat uygulanır.
- Güvence bedeli depozitodur: talep kabul edilince bloke edilir, eşya sorunsuz iade edilip sahibi iadeyi onaylayınca kiracıya iade edilir. Kabul edilmiş kiralama iptal edilirse de iade edilir.
- Uyuşmazlıkta admin karar verir: kiracı lehine (depozito kiracıya), eşya sahibi lehine (depozito sahibe) ya da paylaştırma (bir kısmı sahibe, kalanı kiracıya).
- Tamamlanan bir kiralamada kira bedeli ve hizmet bedeli iade edilmez.
- İptal edilen kiralamalarda kira ve hizmet bedelinin iadesine dair bir kural henüz yok; ödeme sistemi bağlandığında belirlenecek. Bu konuda kesin bir şey söyleme.
- ÖNEMLİ: Ödeme sistemi henüz bağlı değildir. Şu an gerçek para çekilmez ya da iade edilmez; tutarlar yalnızca kayıt olarak tutulur.

## Teslim ve iade kaydı
- Teslimde eşya sahibi, iadede kiracı eşyanın fotoğraflarını adım adım yükler: ön, arka, sol, sağ, varsa hasar, varsa seri numarası, varsa aksesuarlar ve bir video.
- Teslimde kaydı eşya sahibi tamamlar, kiracı eşyayı o haliyle aldığını onaylar; kiralama Aktif olur.
- İadede kaydı kiracı tamamlar, eşya sahibi onaylar; kiralama tamamlanır ve depozito iade edilir.
- Bu fotoğraflar bir sorun çıkarsa kanıt olarak kullanılır.

## Hasar ve uyuşmazlık
- Taraflar kiralama sayfasından hasar bildirebilir.
- Uyuşmazlık yalnızca kiralama Aktif ya da İade Bekleniyor durumundayken açılabilir; en az 10 karakterlik bir açıklama gerekir.
- İki taraf da uyuşmazlığa fotoğraf ya da video kanıt ekleyebilir. Kararı admin verir.
- Uyuşmazlığı kaybetmek güven puanını 20 puan düşürür.

## Güven puanı (0-100)
- Tamamlanan kiralamalar: her biri +8, en fazla 40 puan.
- Değerlendirmeler: en fazla 30 puan, yüksek puan ve daha çok yorumla artar.
- Hesap doğrulama: e-posta 3, telefon 6, kimlik 15 puan (toplam olarak).
- Hesap yaşı: en fazla 15 puan, 60 günde tamamlanır.
- Yüksek riskli ilanları (örneğin kamera) kiralamak için en az 40 puan gerekir.

## Hesap doğrulama
- Sırasıyla e-posta, telefon ve kimlik doğrulanır: Profilim → Hesap Doğrulama (/dashboard/verification).
- E-posta kodu e-postayla gelir. Telefon ve kimlik adımları şimdilik demo modundadır; kod ekranda gösterilir.

## Değerlendirmeler
- Tamamlanan kiralamadan sonra iki taraf birbirini 1-5 yıldızla değerlendirir.
- Değerlendirmeler iki taraf da yazınca ya da tamamlanmadan 14 gün sonra görünür olur.

## Diğer
- Favoriler: ilanlardaki kalple kaydedilir, Profilim → Favorilerim'de görülür.
- Kazançlarım: ilan sahibinin kiralamalardan kazancını gösterir.
- Mesajlar: üst menüdeki mesaj simgesinden. Platform dışında ödeme ve iletişim güvence kapsamı dışındadır.
- Profil bilgileri ve hesap silme: Profilim → Ayarlar (/dashboard/settings). Devam eden kiralama varken hesap silinemez.
`.trim();
