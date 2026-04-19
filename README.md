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
    - **Serbest Taş Düzenleme:** Sıra sizde değilken bile (yapay zeka hamlesini yaparken veya sıra beklerken) ıstakanızdaki taşların yerlerini sürükle-bırak yöntemiyle değiştirebilir, sonraki hamleleriniz için hazırlık yapabilirsiniz.
    - **Otomatik Dizme:** "SERİ DİZ" ve "ÇİFT DİZ" butonları ile elinizi anında optimize edin. Akıllı sıralama algoritması, per olmayan taşları otomatik olarak ıstakanın sağ alt köşesinde toplar.
    - **Taş İşleme:** Diğer oyuncuların açtığı perlere veya çiftlere uygun taşlarınızı işleyin.
    - **Okey Değiştirme:** Yerdeki perlerde bulunan Okey taşını, elinizdeki uygun taşla değiştirip Okey'i elinize alın.
- **Doğru Kurallar ve Gerçekçi Puanlama:**
    - **Katı 101 Kuralları:** Klasik Okey'in aksine 12-13-1 şeklinde bir seri yapılamaz.
    - 1 numaralı taşın değeri per içerisindeyken her zaman 1 puan olarak doğru şekilde hesaplanır.
    - Oyunu bitiren oyuncu **-101** puan alır.
    - **Elden Bitirme:** Hiç per açmadan doğrudan elden bitildiğinde kazanılan puan **-202** olur, cezalar ikiye katlanır.
    - **Okey ile Bitirme:** Son taş olarak Okey atıldığında kazanan **-202** (Elden Okey ise **-404**) puan alır ve cezalar katlanır.
    - Elini açmayan oyuncular **202** ceza puanı alır.
    - Elini açan oyuncular, ellerinde kalan taşların toplamı kadar ceza puanı alır.
- **Modern Arayüz ve Optimizasyon:**
    - Tam ekran (Full-screen) modu için optimize edilmiş ızgara (grid) tabanlı yerleşim. Oyun masası, ıstaka, kontroller ve oyun geçmişi (log) ekranı verimli şekilde organize edilmiştir.
    - Akıcı animasyonlar, karanlık mod esintili renk paleti ve kullanıcı dostu tasarım.

## 🛠️ Teknolojiler

- **React 18**
- **TypeScript**
- **Tailwind CSS** (Styling)
- **Framer Motion** (Animations)
- **Lucide React** (Icons)

## 📖 Nasıl Oynanır?

1.  **Taş Çekme:** Sıranız geldiğinde desteden veya bir önceki oyuncunun attığı taştan çekin. (Yerden taş alırsanız elinizi açmak zorundasınız).
2.  **El Açma:** Elinizdeki perlerin toplamı 101 puanı (veya katlamalı modda güncel barajı) geçiyorsa "SERİ AÇ" butonuna basarak elinizi açabilirsiniz. Alternatif olarak 5 çift ile "ÇİFT AÇ" yapabilirsiniz.
3.  **Taş İşleme:** Elinizi açtıktan sonra, masadaki perlere uygun taşlarınızı seçip ardından yerdeki ilgili pere tıklayarak işleyebilirsiniz.
4.  **Sıra Bekleme:** Sıra rakiplerinizdeyken ıstakanızdaki taşları düzenleyerek bir sonraki hamlenize hazırlanabilirsiniz.
5.  **Bitirme:** Elinizdeki tüm taşları per yaparak veya işleyerek bitirdiğinizde, son kalan fazlalık taşınızı "TAŞ AT" butonuyla atarak oyunu kazanın.

---
*İyi oyunlar!*
