# 🎓 ÖABT Özel Eğitim Uygulaması

Bu proje, ÖABT (Öğretmenlik Alan Bilgisi Testi) ve benzeri sınavlar için geliştirilmiş, Full-Stack bir sınav simülasyon uygulamasıdır. Kullanıcıların kendilerini test edebilecekleri, süre kısıtlamalı ve anlık geri bildirimli bir platform sunar.

## 🚀 Teknolojiler

Bu proje güncel ve modern teknolojiler kullanılarak geliştirilmiştir:

*   **Backend:** ![Go](https://img.shields.io/badge/Go-00ADD8?style=flat&logo=go&logoColor=white) (Golang)
*   **Frontend:** ![React Native](https://img.shields.io/badge/React_Native-20232A?style=flat&logo=react&logoColor=61DAFB) (Expo & TypeScript)
*   **Veritabanı:** ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)
*   **Altyapı:** ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)

## ✨ Özellikler

*   ⏱️ **Süreli Sınav Modu:** Gerçek sınav deneyimi için zamanlayıcı.
*   📝 **Dinamik Soru Havuzu:** Veritabanından rastgele çekilen sorular.
*   🔄 **Anlık Geri Bildirim:** Doğru/Yanlış cevapların anında gösterimi.
*   📊 **Sonuç Ekranı:** Sınav sonunda detaylı doğru, yanlış ve boş sayısı analizi.
*   📱 **Responsive Tasarım:** Mobil uyumlu modern arayüz.

## 🛠️ Kurulum ve Çalıştırma

Projeyi yerel ortamınızda çalıştırmak için aşağıdaki adımları takip edebilirsiniz.

### Ön Hazırlıklar

Bilgisayarınızda şunların kurulu olması gerekmektedir:
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Backend ve Veritabanı için)
*   [Node.js](https://nodejs.org/) (Frontend paketleri için)
*   [Expo Go](https://expo.dev/client) (Mobil cihazda test etmek için - Opsiyonel)

### 1. Projeyi Klonlayın

```bash
git clone https://github.com/kullaniciadi/oabt_project.git
cd oabt_project
```

### 2. Uygulamayı Başlatın (Backend Deploy Edildiyse)

Eğer Backend sunucusu Render üzerinde zaten çalışıyorsa (canlıdaysa), yerel bilgisayarınızda ayrıca bir Backend çalıştırmanıza **gerek yoktur**.

Doğrudan Frontend klasörüne gidip uygulamayı başlatabilirsiniz:

```bash
cd frontend
```

Gerekli paketleri yükleyin:

```bash
pnpm install
```

Uygulamayı başlatın:

```bash
npx expo start
```

### 4. Uygulamayı Test Etme

Expo komutunu çalıştırdıktan sonra karşınıza bir QR kod çıkacaktır:

*   **Android Emülatör:** Klavyeden `a` tuşuna basarak Android emülatörde açabilirsiniz.
*   **iOS Simülatör (Mac):** Klavyeden `i` tuşuna basarak iOS simülatörde açabilirsiniz.
*   **Gerçek Cihaz:** Telefonunuza **Expo Go** uygulamasını indirin ve terminaldeki QR kodu taratın.

> **Not:** Android Emülatör kullanıyorsanız uygulama otomatik olarak `10.0.2.2` adresini kullanarak localhost'a erişecektir.

## 📂 Proje Yapısı

```
oabt_project/
├── backend/            # Go Backend kodları
│   ├── main.go        # Ana sunucu dosyası
│   ├── Dockerfile     # Backend için Docker yapılandırması
│   └── questions.json # Örnek soru verileri
├── frontend/           # React Native kodları
│   ├── App.tsx        # Ana uygulama bileşeni
│   └── package.json   # Frontend bağımlılıkları
├── docker-compose.yml  # Servis orkestrasyonu
└── README.md           # Proje dokümantasyonu
```

## 🤝 Katkıda Bulunma

1. Bu projeyi forklayın.
2. Yeni bir özellik dalı (branch) oluşturun (`git checkout -b ozellik/YeniOzellik`).
3. Değişikliklerinizi commit yapın (`git commit -m 'Yeni özellik eklendi'`).
4. Dalınızı push yapın (`git push origin ozellik/YeniOzellik`).
5. Bir Pull Request oluşturun.

---
İyi çalışmalar! 🚀