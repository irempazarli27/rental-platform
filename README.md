# Paylaşımlık

Kişiler arası eşya kiralama platformu. Kullanıcılar eşyalarını ilan olarak ekler, başkalarının eşyalarını kiralar ve teslim sürecini uygulama üzerinden takip eder.

## Özellikler

- E-posta ve Google ile giriş, kimlik doğrulama adımları
- İlan oluşturma, fotoğraf yükleme, kategori ve arama
- Kiralama talepleri, onay ve teslim alma/iade süreci
- Teslim sırasında fotoğraf ve video kaydı, hasar bildirimi
- Anlaşmazlık yönetimi
- Mesajlaşma, bildirimler, favoriler ve değerlendirmeler
- Kullanıcı güven puanı
- Gemini destekli yapay zekâ asistanı ve yorum özetleri
- Yönetici paneli

## Teknolojiler

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript, Zod
- **Veritabanı:** PostgreSQL
- **Yapay zekâ:** Google Gemini
- **Test:** Vitest, Playwright
- **Yayın:** Docker, Caddy, AWS

## Kurulum

```bash
docker compose up -d          # PostgreSQL

cd backend
cp .env.example .env          # değerleri doldurun
npm install
npm run migrate:up
npm run dev                   # http://localhost:4000

cd ../frontend
npm install
npm run dev
```

## Proje yapısı

- `backend/`: API, veritabanı göçleri ve testler. Uç noktalar [backend/API.md](backend/API.md) dosyasında listelenir.
- `frontend/`: Next.js arayüzü ve uçtan uca testler
- `deploy/aws/`: Sunucu kurulum ve yayın betikleri
