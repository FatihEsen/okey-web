# 101 Okey - Stratejik Taş Oyunu

Bu uygulama, popüler Türk masa oyunu **101 Okey**'in tam fonksiyonel bir web versiyonudur. Oyuncular yapay zekaya karşı yarışabilir, ellerini dizebilir ve stratejik hamleler yaparak en düşük ceza puanıyla oyunu bitirmeye çalışabilirler.

## 🚀 Özellikler

- **İki Oyun Modu:**
    - **Standart (Katlamasız):** Sabit 101 puan barajı.
    - **Katlamalı:** Her oyuncu elini açtığında, bir sonraki oyuncu için gereken minimum açma puanı yükselir.
- **Akıllı Puan Takibi:**
    - Elinizi açmadan önce **PER TOPLAMI**'nı görerek barajı geçip geçmediğinizi takip edin.
    - Elinizi açtıktan sonra **KALAN PUAN**'ınızı görerek elinizdeki fazlalık taşların değerini takip edin.
- **Atılan Taşlar Geçmişi:**
    - "ATILAN TAŞLAR" bölümü sayesinde diğer oyuncuların hangi taşları attığını renklerine göre gruplanmış şekilde görün. Bu sayede ihtiyacınız olan taşın çıkıp çıkmadığını kolayca kontrol edebilirsiniz.
- **Gelişmiş Oyun Mekanikleri:**
    - **Otomatik Dizme:** "SERİ DİZ" ve "ÇİFT DİZ" butonları ile elinizi anında optimize edin.
    - **Sürükle-Bırak:** Taşlarınızı dilediğiniz gibi manuel olarak sıralayın.
    - **Taş İşleme:** Diğer oyuncuların açtığı perlere veya çiftlere uygun taşlarınızı işleyin.
    - **Okey Değiştirme:** Yerdeki perlerde bulunan Okey taşını, elinizdeki uygun taşla değiştirip Okey'i elinize alın.
- **Gerçekçi Puanlama Sistemi:**
    - Oyunu bitiren oyuncu **-101** puan alır.
    - **Okey veya Çift ile Bitirme:** Kazanan **-202** puan alır ve diğer tüm oyuncuların ceza puanları **ikiye katlanır**.
    - Elini açmayan oyuncular **202** (veya 404) ceza puanı alır.
    - Elini açan oyuncular, ellerinde kalan taşların toplamı kadar ceza puanı alır.
- **Modern Arayüz:**
    - Karanlık ve Aydınlık mod desteği.
    - Akıcı animasyonlar ve kullanıcı dostu tasarım.

## 🛠️ Teknolojiler

- **React 18**
- **TypeScript**
- **Tailwind CSS** (Styling)
- **Framer Motion** (Animations)
- **dnd-kit** (Drag and Drop)
- **Lucide React** (Icons)

## 📖 Nasıl Oynanır?

1.  **Taş Çekme:** Sıranız geldiğinde desteden veya bir önceki oyuncunun attığı taştan çekin. (Yerden taş alırsanız elinizi açmak zorundasınız).
2.  **El Açma:** Elinizdeki perlerin toplamı 101 puanı (veya katlamalı modda güncel barajı) geçiyorsa "SERİ AÇ" butonuna basarak elinizi açabilirsiniz. Alternatif olarak 5 çift ile "ÇİFT AÇ" yapabilirsiniz.
3.  **Taş İşleme:** Elinizi açtıktan sonra, masadaki perlere uygun taşlarınızı tıklayıp ardından ilgili pere tıklayarak işleyebilirsiniz.
4.  **Bitirme:** Elinizdeki tüm taşları per yaparak veya işleyerek bitirdiğinizde, son kalan taşınızı "TAŞ AT" butonuyla atarak oyunu kazanın.

---
*İyi oyunlar!*
