# iOS Uygulama Takibi (ATT) İzni Ekleme Rehberi

Apple, iOS 14.5 ve sonrasında reklam kimliğine (IDFA) erişmek için kullanıcıdan açık izin alınmasını zorunlu tutmaktadır. Bu izin alınmazsa AdMob reklamları iOS cihazlarda kısıtlanır veya uygulama App Store tarafından reddedilebilir.

Aşağıdaki adımları takip ederek bu izni projenize ekleyebilirsiniz:

## 1. Paket Kurulumu
Öncelikle Expo'nun takip izni paketini kurun. Terminale şu komutu yazın:

```bash
npx expo install expo-tracking-transparency
```

## 2. app.json Güncellemesi
`app.json` dosyasındaki `ios` yapılandırmasına izin açıklamasını ekleyin. Kullanıcıya bu izni neden istediğinizi açıklayan bir metin yazmalısınız.

`app.json` dosyasını açın ve `ios` kısmına şu satırı ekleyin:

```json
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.riesee.oabtozelegitim",
  "buildNumber": "1",
  "icon": "./assets/logo.png",
  "infoPlist": {
    "NSUserTrackingUsageDescription": "Size daha ilgili ve kişiselleştirilmiş reklamlar sunabilmek için izninize ihtiyacımız var."
  }
}
```

## 3. Kod İçinde İzin İsteme
Uygulama açıldığında (Splash Screen sonrası) bu izni sormalıyız. `App.tsx` dosyasında şu değişiklikleri yapın:

### Import Ekleyin
```tsx
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
```

### useEffect İçinde Çağırın
`App` bileşenindeki `useEffect` bloğuna şu kontrolü ekleyin:

```tsx
useEffect(() => {
  const initATT = async () => {
    const { status } = await requestTrackingPermissionsAsync();
    if (status === 'granted') {
      // İzin verildi, AdMob reklamları daha verimli çalışacaktır.
    }
  };

  initATT();
  checkAuth();
}, []);
```

## 4. Önemli Notlar
*   **Test Etme:** Bu izin penceresi sadece gerçek bir iOS cihazda veya `expo-dev-client` ile oluşturulmuş bir simülatörde görünecektir. Standart Expo Go üzerinde görünmeyebilir.
*   **App Store İncelemesi:** Uygulamayı App Store'a yüklerken, "App Privacy" bölümünde bu izni kullandığınızı ve verilerin reklam amaçlı takip edildiğini belirtmeniz gerekmektedir.

Bu adımları tamamladığınızda Apple'ın en kritik gizlilik kurallarından birini yerine getirmiş olacaksınız.
