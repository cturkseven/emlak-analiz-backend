import Anthropic from "@anthropic-ai/sdk";

const { ANTHROPIC_API_KEY } = process.env;
const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

const MIN_KARSILASTIRMA = 3;

/** Hedef ilanın m² fiyatının, benzer ilanların m² fiyatlarına göre konumunu hesaplar. */
export function fiyatIstatistiginiHesapla(ilan, benzerM2Fiyatlari) {
  const kendiM2 = ilan.m2Brut ?? ilan.m2Net;
  if (!kendiM2 || !ilan.fiyat?.tutar) return null;
  const temizListe = (benzerM2Fiyatlari ?? []).filter((x) => Number.isFinite(x) && x > 0);
  if (temizListe.length < MIN_KARSILASTIRMA) return null;

  const kendiM2Fiyati = ilan.fiyat.tutar / kendiM2;
  const sirali = [...temizListe].sort((a, b) => a - b);
  const altinda = sirali.filter((x) => x < kendiM2Fiyati).length;
  const yuzdelik = Math.round((altinda / sirali.length) * 100);
  const medyanM2Fiyati = Math.round(sirali[Math.floor(sirali.length / 2)]);

  return { kendiM2Fiyati: Math.round(kendiM2Fiyati), medyanM2Fiyati, yuzdelik, n: sirali.length };
}

function durumEtiketiUret(skor) {
  if (skor >= 7.5) return "Fiyat Avantajlı";
  if (skor >= 5) return "Piyasa Seviyesinde";
  return "Pahalı";
}

/** LLM olmadan (veya LLM başarısız olduğunda) çalışan basit, kural tabanlı analiz. */
export function kuralTabanliAnaliz(ilan, fiyatIstatistik) {
  let skor = 6.5;
  const bayraklar = [];
  const avantajlar = [];
  const dezavantajlar = [];
  const chipler = [ilan.ilanTipi === "kiralik" ? "Kiralık" : "Satılık"];

  if (fiyatIstatistik) {
    if (fiyatIstatistik.yuzdelik <= 30) { skor += 1.5; avantajlar.push("Benzer ilanlara göre m² fiyatı düşük."); }
    else if (fiyatIstatistik.yuzdelik >= 70) { skor -= 1.5; dezavantajlar.push("Benzer ilanlara göre m² fiyatı yüksek."); bayraklar.push({ tip: "sari", metin: "Bölgedeki benzer ilanlara göre m² fiyatı piyasa ortalamasının üzerinde." }); }
  }

  const binaYasiSayi = ilan.binaYasi ? parseInt(String(ilan.binaYasi).replace(/[^\d]/g, ""), 10) : null;
  if (binaYasiSayi != null && !Number.isNaN(binaYasiSayi)) {
    chipler.push(`${binaYasiSayi} yaşında`);
    if (binaYasiSayi >= 25) { skor -= 0.5; bayraklar.push({ tip: "sari", metin: "Bina yaşı yüksek — tesisat/deprem yönetmeliği açısından ek inceleme önerilir." }); }
    else if (binaYasiSayi <= 5) avantajlar.push("Bina yeni sayılır.");
  }

  if (ilan.bulunduguKat && /bodrum|zemin|bahçe/i.test(ilan.bulunduguKat)) {
    bayraklar.push({ tip: "sari", metin: `"${ilan.bulunduguKat}" kat bilgisi nem/rutubet riski açısından yerinde kontrol edilmeli.` });
  }

  if (ilan.odaSayisi) chipler.push(ilan.odaSayisi);
  if (ilan.m2Brut) chipler.push(`${ilan.m2Brut} m²`);

  skor = Math.max(0, Math.min(10, skor));

  return {
    skor,
    durumEtiketi: durumEtiketiUret(skor),
    chipler,
    bayraklar,
    avantajlar,
    dezavantajlar,
    ozet:
      "Bu değerlendirme, karşılaştırılabilir ilanların m² fiyatına ve birkaç basit kurala dayanan " +
      "otomatik bir tahmindir (LLM analizi devre dışı — backend'de ANTHROPIC_API_KEY tanımlayın).",
  };
}

const JSON_SEMASI_ACIKLAMASI = `
Yalnızca şu alanları içeren GEÇERLİ bir JSON nesnesi döndür, başka hiçbir metin ekleme:
{
  "skor": 0-10 arası ondalıklı sayı (10 = çok uygun fiyatlı/iyi ilan, 0 = kaçınılmalı),
  "durumEtiketi": kısa Türkçe durum ifadesi (ör. "Fiyat Avantajlı", "Piyasa Seviyesinde", "Pahalı"),
  "chipler": kısa etiketlerden oluşan bir dizi (ör. "3+1", "120 m²", "10 yaşında"),
  "bayraklar": [{ "tip": "sari" | "kirmizi", "metin": "..." }] biçiminde dikkat edilmesi gereken noktalar,
  "avantajlar": kısa madde metinlerinden oluşan bir dizi,
  "dezavantajlar": kısa madde metinlerinden oluşan bir dizi,
  "ozet": 2-3 cümlelik genel değerlendirme metni (Türkçe)
}
`.trim();

async function llmIleAnalizEt(ilan, fiyatIstatistik) {
  const girdi = { ilan, fiyatIstatistik };
  const mesaj = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system:
      "Sen Türkiye'de ikinci el emlak ilanlarını değerlendiren tarafsız bir emlak danışmanısın. " +
      "Sana bir ilanın verileri ve benzer ilanlara göre m² fiyat konumu verilecek. " +
      "Sadece verilen verilere dayan, uydurma bilgi/istatistik ekleme. " +
      JSON_SEMASI_ACIKLAMASI,
    messages: [{ role: "user", content: JSON.stringify(girdi) }],
  });

  const metin = mesaj.content?.find((b) => b.type === "text")?.text ?? "{}";
  const jsonMetin = metin.slice(metin.indexOf("{"), metin.lastIndexOf("}") + 1);
  const veri = JSON.parse(jsonMetin);

  if (typeof veri.skor !== "number") throw new Error("gecersiz-llm-cevabi");
  veri.skor = Math.max(0, Math.min(10, veri.skor));
  return veri;
}

/**
 * Ana giriş noktası: fiyat istatistiğini hesaplar, mümkünse LLM ile,
 * değilse (API anahtarı yoksa veya LLM hata verirse) kural tabanlı analiz üretir.
 */
export async function emlakAnaliziUret({ ilan, benzerM2Fiyatlari }) {
  const fiyatIstatistik = fiyatIstatistiginiHesapla(ilan, benzerM2Fiyatlari);

  let sonuc;
  if (anthropic) {
    try {
      sonuc = await llmIleAnalizEt(ilan, fiyatIstatistik);
    } catch (hata) {
      console.error("[llm hatası, kural tabanlı analize düşülüyor]", hata);
      sonuc = kuralTabanliAnaliz(ilan, fiyatIstatistik);
    }
  } else {
    sonuc = kuralTabanliAnaliz(ilan, fiyatIstatistik);
  }

  return { ...sonuc, fiyatIstatistik };
}
