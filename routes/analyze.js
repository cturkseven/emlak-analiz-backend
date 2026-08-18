import { Router } from "express";
import { kullaniciDogrula, bearerAyikla } from "../lib/auth.js";
import { kotaKontrolVeArtir, GUNLUK_HAK } from "../lib/quota.js";
import { hesapProfiliGetir } from "../lib/profil.js";
import { emlakAnaliziUret } from "../lib/llm.js";

const router = Router();

router.post("/api/analyze", async (req, res) => {
  try {
    const { ilan, benzerFiyatlar, benzerM2Fiyatlari } = req.body ?? {};
    if (!ilan?.ilanId || !ilan?.fiyat?.tutar) {
      return res.status(400).json({ hata: "gecersiz-istek" });
    }

    const kullanici = await kullaniciDogrula(bearerAyikla(req));

    let kimlik, hak, girisli = false, odemeLinki = null, plan = "misafir";
    if (kullanici) {
      girisli = true;
      const profil = await hesapProfiliGetir(kullanici);
      kimlik = `user:${kullanici.id}`;
      hak = profil.gunlukHak;
      plan = profil.plan;
      odemeLinki = profil.odemeLinki;
    } else {
      const cihazId = req.header("x-device-id");
      if (!cihazId) return res.status(400).json({ hata: "cihaz-kimligi-eksik" });
      kimlik = `device:${cihazId}`;
      hak = GUNLUK_HAK.misafir;
    }

    const kota = await kotaKontrolVeArtir(kimlik, hak);
    if (!kota.izinVerildi) {
      return res.status(429).json({
        hata: "limit",
        yukseltme: { girisli, odemeLinki: plan === "premium" ? null : odemeLinki },
      });
    }

    const sonuc = await emlakAnaliziUret({ ilan, benzerFiyatlar, benzerM2Fiyatlari });
    res.json(sonuc);
  } catch (hata) {
    console.error("[analyze hata]", hata);
    res.status(500).json({ hata: "ai" });
  }
});

export default router;
