import { Router } from "express";

const router = Router();

// Liste sayfasındaki rozetler için hafif, hızlı bir skor — LLM çağırmaz,
// sadece aynı toplu istekteki (aynı arama sonucu) ilanların kendi arasında
// m² fiyatı karşılaştırması yapar. Kotaya dahil edilmez.
router.post("/api/batch-score", async (req, res) => {
  try {
    const { satirlar } = req.body ?? {};
    if (!Array.isArray(satirlar) || satirlar.length === 0) {
      return res.status(400).json({ hata: "gecersiz-istek" });
    }

    const m2Fiyatlari = satirlar
      .map((s) => (s.m2Brut && s.fiyat?.tutar ? s.fiyat.tutar / s.m2Brut : null))
      .filter((x) => Number.isFinite(x) && x > 0)
      .sort((a, b) => a - b);

    const sonuclar = satirlar.map((s) => {
      if (!s.m2Brut || !s.fiyat?.tutar || m2Fiyatlari.length < 3) {
        return { ilanId: s.ilanId, skor: 6, etiketler: [], tekCumle: "Yeterli karşılaştırma verisi yok." };
      }
      const kendiM2Fiyati = s.fiyat.tutar / s.m2Brut;
      const altinda = m2Fiyatlari.filter((x) => x < kendiM2Fiyati).length;
      const yuzdelik = Math.round((altinda / m2Fiyatlari.length) * 100);
      const skor = yuzdelik <= 30 ? 8 : yuzdelik >= 70 ? 3.5 : 6.5;
      const tekCumle =
        yuzdelik <= 30
          ? "Sayfadaki benzer ilanlara göre m² fiyatı düşük."
          : yuzdelik >= 70
            ? "Sayfadaki benzer ilanlara göre m² fiyatı yüksek."
            : "m² fiyatı piyasa seviyesinde.";
      return {
        ilanId: s.ilanId,
        skor,
        etiketler: [s.odaSayisi, `${s.m2Brut} m²`].filter(Boolean),
        tekCumle,
      };
    });

    res.json({ sonuclar });
  } catch (hata) {
    console.error("[batch-score hata]", hata);
    res.status(500).json({ hata: "ai" });
  }
});

export default router;
