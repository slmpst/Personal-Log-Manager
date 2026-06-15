# Personal Log & Devlog Manager 🚀

Kişisel yazılım geliştirme günlüklerinizi (devlog), toplantı notlarınızı, raporlarınızı, yapılacaklar listelerinizi (todo) ve belgelerinizi düzenli bir şekilde yönetmenizi sağlayan, modern ve yapay zeka destekli bir **Kişisel Günlük Yönetim Sistemi** (Personal Log Manager).

---

## ✨ Özellikler

### 📝 Gelişmiş Markdown Editörü
- **Canlı Önizleme & Otomatik Kaydetme:** Yazarken anında önizleme yapın. Değişiklikleriniz arka planda otomatik olarak kaydedilir.
- **Diyagram Desteği (Mermaid):** Kod bloklarına yazacağınız Mermaid şemalarını görsel diyagramlara dönüştürür.
- **Kompakt Araç Çubuğu:** Mobil cihazlarda araç çubuğu butonları taşma yapmaz, yatayda kaydırılabilir.
- **Kopya & Görev Kontrolleri:** Tek tıkla kod bloklarını kopyalayın, metin içi yapılacaklar listelerini etkileşimli check-box'lar ile tamamlayın.
- **Dışa Aktarma Seçenekleri:** Notlarınızı tek tıkla **PDF, HTML veya Markdown (.md)** formatında indirin.
- **Eklenti Desteği:** Her nota özel görsel, video, zip veya belge yükleyip yönetin.

### 📁 Proje & Dosya Yönetimi
- **Sürükle-Bırak Sıralama:** Projelerinizi ve dosyalarınızı sürükleyip bırakarak öncelik sırasına göre dizin.
- **Renk Kodlama:** Projelerinizi farklı renkler ile gruplayın.
- **ZIP Olarak İndir:** Proje içindeki tüm notları ve devlogları tek tıkla bir ZIP arşivi olarak indirin.
- **Takvim Görünümü:** Notlarınızı ve devloglarınızı takvim üzerinde tarihlere göre takip edin. Mobilde optimize edilmiş kompakt ikon gösterimi mevcuttur.

### 🤖 Yapay Zeka Asistanı (AI Assistant)
- **Devloglarıma Sor (Chat):** Projenizdeki tüm notları ve günlükleri analiz eden yapay zeka ile sohbet edin. *"Bugün ne yaptım?"*, *"Dünkü veri tabanı hatasını nasıl çözmüştüm?"* gibi sorular sorun.
- **Editör AI Komutları:** Seçtiğiniz metin veya tüm not üzerinde çalışabilen özel AI komutları:
  - 📝 Taslağı Devloga Dönüştür
  - 🐛 Hata Bul & Düzelt (Kodlar için)
  - 📊 Şema Üret (İçeriği Mermaid diyagramına çevirir)
  - ✍️ Yazıyı Devam Ettir
  - 🔍 Kısa Özet Çıkar

### 📱 %100 Mobil Uyumlu (Responsive)
- Dokunmatik ekranlarda sürükleme tutamaçları ve eylem butonları (silme, düzenleme, sabitleme) her zaman erişilebilirdir.
- AI Sohbet paneli mobilde ekranı kaplayan pürüzsüz bir çekmece (drawer) olarak açılır.
- Mobil cihazlarda AI Değişiklik Önizleme modali sekmeli (tabbed) yapıya geçerek okuma alanını maksimuma çıkarır.

---

## 🛠️ Teknoloji Yığını

- **Frontend:** React (v19), TypeScript, Tailwind CSS (v4), Zustand, Lucide React, Framer Motion, date-fns, react-md-editor
- **Backend:** Node.js, Express, TypeScript, Prisma ORM, Multer (Dosya yükleme)
- **Veritabanı:** PostgreSQL (v16)
- **Konteynerleştirme & Web Sunucu:** Docker, Docker Compose, Nginx (SPA Yönlendirmeli)

---

## 🚀 Hızlı Başlangıç

Projeyi ayağa kaldırmanın en kolay yolu **Docker Compose** kullanmaktır.

### Gereksinimler
- Bilgisayarınızda [Docker](https://www.docker.com/) ve Docker Compose kurulu olmalıdır.

### Docker Compose ile Çalıştırma

1. Proje kök dizininde aşağıdaki komutu çalıştırarak tüm container'ları derleyin ve ayağa kaldırın:
   ```bash
   docker compose up --build
   ```
2. Servisler başladığında uygulamanıza şu adreslerden erişebilirsiniz:
   - **Web Arayüzü (Frontend):** [http://localhost:8080](http://localhost:8080)
   - **API Servisi (Backend):** [http://localhost:8787](http://localhost:8787)
   - **PostgreSQL Veritabanı:** `localhost:5432` portundan dışarıya tünellenir.

---

## 💻 Yerel Geliştirme (Local Development)

Projeyi konteynerlar olmadan yerel makinenizde çalıştırmak isterseniz:

### 1. Bağımlılıkları Yükleme
Proje kök dizininde:
```bash
npm install
```

### 2. Veritabanı Kurulumu ve Göçler
Yerel PostgreSQL veritabanınızı oluşturduktan sonra `apps/api/.env` dosyasındaki `DATABASE_URL` bilgisini güncelleyin ve göçleri (migration) çalıştırın:
```bash
npm --prefix apps/api run prisma:migrate
```

### 3. Uygulamayı Başlatma
Frontend ve Backend servislerini aynı anda geliştirme modunda çalıştırmak için:
```bash
npm run dev
```

---

## 📂 Dosya Yapısı

```text
devlog-manager/
├── apps/
│   ├── api/             # Backend API (Express + Prisma)
│   │   ├── prisma/      # Prisma şemaları ve göç verileri
│   │   ├── src/         # API kaynak kodları
│   │   └── Dockerfile   # API Docker dosyası
│   └── web/             # Frontend Uygulaması (React + Vite)
│       ├── src/         # UI Bileşenleri (Sidebar, Editor, Calendar vb.)
│       ├── nginx.conf   # Web sunucu SPA konfigürasyonu
│       └── Dockerfile   # Web Docker dosyası
├── docker-compose.yml   # Çoklu konteyner orkestrasyonu
├── .dockerignore        # Docker paket dışı bırakma kuralları
├── .gitignore           # Git takip dışı bırakma kuralları
└── package.json         # Monorepo bağımlılık tanımları
```

---

## 🔒 Güvenlik Uyarıları

- Yerel veritabanı şifreleriniz, kişisel notlarınız ve yüklediğiniz özel dosyalar `.gitignore` kuralları ile korunmaktadır ve asla Git geçmişine/GitHub'a yüklenmez.
- Yapay zeka API anahtarlarınız sadece tarayıcınızın yerel hafızasında saklanır, sunucu tarafında depolanmaz.
