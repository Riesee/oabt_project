import React from 'react';
import { ScrollView, Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
    primary: '#FF6B6B',
    secondary: '#4ECDC4',
    text: '#2C3E50',
    background: '#F7F9FC',
    white: '#FFFFFF',
};

export default function LegalScreen({ navigation, route }: any) {
    const { type } = route.params || { type: 'privacy' };

    const content = type === 'privacy' ? {
        title: 'Gizlilik Politikası',
        text: `
Son Güncelleme: 16 Şubat 2026

ÖABT Özel Eğitim ("biz", "tarafımızca" veya "uygulama"), kullanıcılarımızın gizliliğini korumayı taahhüt eder. Bu hizmet Riese ("Hizmet Sağlayıcı") tarafından sunulmaktadır.

1. Bilgi Toplama ve Kullanım
Uygulamamızı kullandığınızda aşağıdaki bilgiler otomatik olarak veya sizin rızanızla toplanabilir:
• Cihazınızın İnternet Protokolü (IP) adresi.
• Uygulama içinde ziyaret edilen sayfalar, ziyaret tarih ve saati, bu sayfalarda geçirilen süre.
• Mobil cihazınızın işletim sistemi ve cihaz kimlikleri (IDFA/AAID).
• Kişisel Bilgiler: Google veya Apple ile giriş yaptığınızda sağladığınız ad, soyad, e-posta adresi ve kullanıcı ID'si.

2. Bilgilerin Kullanım Amacı
Toplanan veriler aşağıdaki amaçlarla kullanılır:
• Kişisel profilinizi oluşturmak ve sınav ilerlemenizi kaydetmek.
• Liderlik tablosu üzerinden başarı sıralamanızı yönetmek.
• AdMob aracılığıyla ilgi alanlarınıza yönelik reklam sunmak.
• Uygulama performansını analiz etmek ve teknik hataları gidermek.
• Önemli bildirimler, yasal uyarılar ve pazarlama duyuruları için sizinle iletişim kurmak.

3. Yapay Zeka (AI) Kullanımı
Uygulama, kullanıcı deneyimini iyileştirmek ve kişiselleştirilmiş rehberlik sunmak için Yapay Zeka (AI) teknolojilerini kullanabilir. AI bileşenleri, size özel öneriler veya otomatik fonksiyonlar sunmak amacıyla anonimleştirilmiş verilerinizi işleyebilir.

4. Üçüncü Taraf Hizmetleri
Uygulamamız, veri toplayabilecek aşağıdaki üçüncü taraf servis sağlayıcılarını kullanmaktadır:
• Google Play Hizmetleri
• AdMob (Google Reklamları)
• Google Analytics for Firebase
• Firebase Crashlytics
• Expo

5. Bilgi Paylaşımı ve İfşa
Hizmet Sağlayıcı, verilerinizi aşağıdaki durumlarda üçüncü şahıslarla paylaşabilir:
• Yasaların gerektirdiği durumlarda (mahkeme celbi veya benzeri yasal süreçler).
• Haklarımızı korumak, güvenliğinizi sağlamak veya dolandırıcılığı araştırmak amacıyla iyi niyetle gerekli görüldüğünde.
• Bizim adımıza çalışan ve bilgileri bağımsız olarak kullanma hakkı olmayan güvenilir hizmet sağlayıcılarla.

6. Veri Silme ve Saklama (KVKK/GDPR)
Verileriniz siz uygulamayı kullandığınız sürece ve sonrasında makul bir süre saklanır. Verilerinizin silinmesini isterseniz iletisim@oabtozelegitim.com adresinden bize ulaşabilirsiniz.

7. Çocukların Gizliliği
Hizmet Sağlayıcı, 13 yaşın altındaki çocuklardan bilerek veri toplamaz. 13 yaşından küçük bir çocuğun veri paylaştığı fark edilirse, bu bilgiler derhal sunucularımızdan silinir.

8. Güvenlik
Verilerinizin gizliliğini korumak için fiziksel, elektronik ve prosedürel güvenlik önlemleri uygulanmaktadır.

9. İletişim
Gizlilik politikası hakkında sorularınız için: iletisim@oabtozelegitim.com
        `
    } : {
        title: 'Kullanım Koşulları',
        text: `
Son Güncelleme: 16 Şubat 2026

Bu kullanım koşulları, Riese ("Hizmet Sağlayıcı") tarafından bir "Ücretsiz" hizmet olarak oluşturulan mobil cihazlara yönelik ÖABT Özel Eğitim uygulaması ("Uygulama") için geçerlidir.

Uygulamayı indirerek veya kullanarak aşağıdaki şartları otomatik olarak kabul etmiş sayılırsınız. Bu nedenle, Uygulamayı kullanmadan önce bu şartları dikkatlice okumanız ve anlamanız önemle tavsiye edilir.

1. Fikri Mülkiyet Hakları ve Kısıtlamalar
• Uygulamanın herhangi bir bölümünü, tamamını veya ticari markalarımızı yetkisiz olarak kopyalamanız veya değiştirmeniz kesinlikle yasaktır.
• Uygulamanın kaynak kodunu çıkarmaya çalışmak, Uygulamayı başka dillere çevirmek veya türev sürümler oluşturmak yasaktır.
• Uygulamaya ilişkin tüm ticari markalar, telif hakları, veritabanı hakları ve diğer fikri mülkiyet hakları Hizmet Sağlayıcı'ya aittir.

2. Hizmet Değişiklikleri ve Ücretlendirme
Hizmet Sağlayıcı, Uygulamayı dilediği zaman ve herhangi bir nedenle güncelleme veya hizmetler için ücret talep etme hakkını saklı tutar. Uygulama veya hizmetleri için herhangi bir ücret alınacaksa, bu durum size açıkça bildirilecektir.

3. Veri Güvenliği ve Cihaz Sorumluluğu
• Hizmetin sunulabilmesi için sağladığınız kişisel veriler Uygulama tarafından saklanır ve işlenir. Telefonunuzun ve Uygulamaya erişimin güvenliğini sağlamak sizin sorumluluğunuzdadır.
• Cihazınıza "jailbreak" veya "root" işlemi yapmamanız (işletim sistemi kısıtlamalarını kaldırmamanız) önemle tavsiye edilir. Bu tür işlemler cihazınızı kötü amaçlı yazılımlara açık hale getirebilir, güvenlik özelliklerini tehlikeye atabilir ve Uygulamanın düzgün çalışmamasına neden olabilir.

4. Üçüncü Taraf Şartları ve İnternet Erişimi
• Uygulama, kendi şart ve koşullara sahip üçüncü taraf servislerini (Google Play Hizmetleri, AdMob vb.) kullanmaktadır.
• Uygulamanın bazı fonksiyonları aktif bir internet bağlantısı gerektirir. Wi-Fi erişiminizin olmaması veya veri kotanızın dolması nedeniyle Uygulamanın tam kapasiteyle çalışmamasından Hizmet Sağlayıcı sorumlu tutulamaz.
• Wi-Fi dışındaki kullanımlarda, mobil operatörünüzün veri kullanım ücretleri ve roaming (dolaşım) masrafları sizin sorumluluğunuzdadır.

5. Sorumluluğun Sınırlandırılması
• Hizmet Sağlayıcı, Uygulamanın her zaman güncel ve doğru olması için çaba gösterse de, bilgilerin doğruluğu için üçüncü şahıslara güvenmektedir. Uygulamadaki bilgilere tam güven duymanız nedeniyle yaşayabileceğiniz doğrudan veya dolaylı maddi/manevi zararlardan Hizmet Sağlayıcı sorumlu tutulamaz.
• Cihazınızın şarjının bitmesi sonucu hizmete erişememeniz durumunda sorumluluk kullanıcıya aittir.

6. Yapay Zeka (AI) Kullanımı
Uygulama, belirli özellikler veya hizmetler sunmak için Yapay Zeka (AI) teknolojilerini barındırmaktadır. Uygulamayı kullanarak, verilerin AI tarafından işlenmesini ve bu fonksiyonların sunulmasını kabul etmiş sayılırsınız.

7. Güncellemeler ve Hizmetin Feshi
• Uygulamanın çalışması için gerekli sistem gereksinimleri değişebilir. Kullanıma devam etmek için güncellemeleri indirmeniz gerekebilir.
• Uygulamanın her zaman cihazınızdaki işletim sistemi sürümüyle uyumlu kalacağı garanti edilmez. Ancak, sunulan güncellemeleri her zaman kabul etmeyi onaylamış sayılırsınız.
• Hizmet Sağlayıcı, dilediği zaman bildirimde bulunmaksızın Uygulamayı durdurabilir veya hizmeti feshedebilir. Fesih durumunda size verilen lisans hakları sona erer ve Uygulamayı kullanmayı bırakıp cihazınızdan silmeniz gerekir.

8. İletişim
Kullanım şartları hakkında sorularınız için: iletisim@oabtozelegitim.com
        `
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{content.title}</Text>
            </View>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.legalText}>{content.text}</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F2F5',
    },
    backButton: {
        marginRight: 15,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    scrollContent: {
        padding: 20,
    },
    legalText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#555',
        textAlign: 'justify',
    },
});
