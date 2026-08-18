import Anthropic from "@anthropic-ai/sdk";

const { ANTHROPIC_API_KEY } = process.env;
const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

function alanlariMetneCevir(g) {
  const satirlar = [];
  if (g.emlakTipi) satirlar.push(`İlan türü: ${g.emlakTipi === "kiralik" ? "Kiralık" : "Satılık"}`);
  if (g.odaSayisi) satirlar.push(`Oda sayısı: ${g.odaSayisi}`);
  if (g.m2Brut) satirlar.push(`m² (brüt): ${g.m2Brut}`);
  if (g.m2Net) satirlar.push(`m² (net): ${g.m2Net}`);
  if (g.binaYasi) satirlar.push(`Bina yaşı: ${g.binaYasi}`);
  if (g.bulunduguKat) satirlar.push(`Bulunduğu kat: ${g.bulunduguKat}`);
  if (g.katSayisi) satirlar.push(`Toplam kat sayısı: ${g.katSayisi}`);
  if (g.isitma) satirlar.push(`Isıtma: ${g.isitma}`);
  if (g.konum) satirlar.push(`Konum: ${g.konum}`);
  if (g.fiyat) satirlar.push(`Fiyat: ${g.fiyat}`);
  if (g.ozellikler) satirlar.push(`Öne çıkan özellikler / notlar: ${g.ozellikler}`);
  return satirlar.join("\n");
}

const SISTEM_TALIMATI =
  "Sen Türkiye'de sahibinden.com tarzı ikinci el emlak ilanları için satış/kiralama açıklaması yazan " +
  "deneyimli bir emlak danışmanısın. Sana bir ilanın özellikleri verilecek. Bu bilgilere dayanarak, " +
  "ilanı çekici ama ABARTISIZ ve GERÇEKÇİ şekilde tanıtan, akıcı Türkçe bir ilan açıklaması metni yaz. " +
  "KURALLAR: " +
  "(1) Sana verilmeyen hiçbir özelliği (ör. deniz manzarası, otopark, asansör) UYDURMA — sadece verilen " +
  "bilgileri kullan, verilmeyen alanlar hakkında hiçbir şey yazma. " +
  "(2) Emlak mevzuatına aykırı ayrımcı ifadeler (ör. belirli bir gruba \"uygun değildir\" gibi) kullanma. " +
  "(3) Kesin yasal/finansal vaatlerde bulunma (ör. \"kesin değer kazanır\", \"yatırım garantisi\"). " +
  "(4) Aşırı büyük harf kullanımı veya çok saxıda ünlem işareti gibi spam görünümlü üsluptan kaçın. " +
  "(5) Metin 3-5 kısa paragraf olsun, sonunda kısa bir kapanış/iletişime geçme çağrısı olabilir. " +
  "(6) Yalnızca ilan açıklaması metnini döndür, başlık, açıklama dışı yorum veya JSON ekleme.";

export async function aciklamaUret(girdi) {
  if (!anthropic) {
    const hata = new Error("llm-yapilandirilmadi");
    hata.kod = "llm-yapilandirilmadi";
    throw hata;
  }

  const girdiMetni = alanlariMetneCevir(girdi);
  if (!girdiMetni.trim()) {
    const hata = new Error("gecersiz-istek");
    hata.kod = "gecersiz-istek";
    throw hata;
  }

  const mesaj = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 700,
    system: SISTEM_TALIMATI,
    messages: [{ role: "user", content: girdiMetni }],
  });

  const metin = mesaj.content?.find((b) => b.type === "text")?.text?.trim();
  if (!metin) throw new Error("gecersiz-llm-cevabi");
  return { aciklama: metin };
}
