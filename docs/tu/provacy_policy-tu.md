# Zingo A Zcash Application

Sıfır bilgi şifrelemesini kullanarak işlem yapın ve işlem geçmişinizi özel ve dikkatli bir şekilde yönetin.

Finansal geçmişinizin tam ve benzersiz kontrolünü elde edin. Para harcama alışkanlıklarınızı içgörüleyerek nasıl para harcadığınızı düşünün. Bilgilerinizi kendi koşullarınızda paylaşın. Çeşitli ekonomik topluluklarla sağlıklı ilişkiler kurun.

Sadece siz bilgilerinizi paylaşma gücüne sahipsiniz! Sizin bakış açınız önemlidir. Siz önemlisiniz.

Zcash gönderdiğinizde istediğiniz herhangi bir şeyi içeren bir not yazabilirsiniz. Zcash aldığınızda, Gönderen'in yazdığı notu da alırsınız. Çoğu kripto para biriminde olduğu gibi, cüzdanlar genellikle işlemdeki "değişiklik" i kurtarmak için kendilerine işlem gönderirler. Bu durumda, uygulama Hem Gönderen Hem de Alıcı olduğunda, Zingo, Kullanıcı için oluşturduğu işlemler hakkında notlar yazmak için memo sistemini kullanır.

Zingo, bu verileri sadece size özel içgörüler sağlamak için çıkarır. İlk sürümümüzde, bu içgörü mekanizmasını kullanarak daha önce Zcash gönderdiğiniz tam Birleşik Adresleri "hatırlamak" için zaten kullanıyoruz. Başka bir deyişle, Zingo, geçmişte Zcash gönderdiğiniz kişilerin "Gönderilen Kişiler" "Adres Defteri"ni tamamen özel ve tohum cümlesini doğru şekilde koruduğunuz sürece cihazınızı kaybetmeniz durumunda bile tamamen kurtarır.

Şu anda bu on-chain memo kullanımlarının başka bir kullanımını uyguluyoruz, bu da size daha önce fon almak için ürettiğiniz adresleri (cihazınızı kaybetmeniz durumunda bile) takip etmenizi sağlayacak. Yani, insanlara Zcash göndermeleri için kullandığınız tüm adreslerin tam bir listesine her zaman sahip olacaksınız.

Bu iki içgörü mekanizması bir araya geldiğinde, size hangi kişilere fon gönderdiğiniz ve hangi kişilerden fon talep ettiğiniz konusunda içgörü sağlar. Bu sadece başlangıç! İnsanların anonim ve ekonomik olarak sürdürülebilir bir şekilde içgörülerini paylaşmalarına izin verecek mekanizmaları uygulamayı amaçlıyoruz, böylece ilginç içgörülerin pazar yerlerinde topluluklar oluşturmasına izin vereceğiz!

On-chain işlem ayrıntılarınız hiçbir üçüncü tarafa açıklanmaz. Kendi ekonomik davranışlarınıza özel içgörü sağlayarak herkesin daha sağlıklı finansal kararlar almasını sağlıyoruz. Farklı içgörüler etrafında oluşan çeşitli toplulukların ortak değerler üzerinde işbirliği yapmasını bekliyoruz.

UA Önbellekleme Teknik Detayı:

Zcash, protokolün daha yeni sürümlere yükselmesini, önceki sürümlerle geriye dönük uyumluluğu bozmadan sağlayan çok protokollü Birleşik Adresi destekler. Bu Birleşik Adres sistemi, istemciler tarafından off-chain olarak uygulanır. İstemciler birbirleriyle Birleşik Adresler paylaşırlar, Birleşik Adresler, istemcinin açabileceği ve işlem oluştururken blok zincirine yayınlayabileceği Protokol Sürümüne Özgü Adresler içerir. Bu, bir işleme ilişkin on-chain adresin, Gönderen İstemci'nin Recipient İstemci'den off-chain olarak aldığı "Birleşik Adres" olarak tüm bilgileri içermediği anlamına gelir. Gönderen İstemci, UA'yı sadece off-chain olarak kaydederse, SeedPhrase'den Müşteriyi Yeniden Oluşturma durumunda bu ilişki verilerini kurtarmanın bir yolu olmazdı. Zingo, bu sorunu, işlemdeki değişiklikten gelen memo alanına orijinal alıcı tarafından sağlanan UA'yı kaydederek çözer.

