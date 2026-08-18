import { Router } from "express";
import { kullaniciDogrula, bearerAyikla } from "../lib/auth.js";
import { kotaKontrolVeArtir, GUNLUK_HAK } from "../lib/quota.js";
import { hesapProfiliGetir } from "../lib/profil.js";
import { aciklamaUret } from "../lib/aciklama.js";

const router = Router();

// Bu özellik yalnızca hesap açmış kullanıcılara açık (misafir/cihaz kimliğiyle
// kullanılamaz) — analiz kotasından bağımsız, ayrı bir günlük hak sayacı
// üzerinden takip edilir (aynı kullanim tablosu, farklı "kimlik" öneki).
router.post("/api/aciklama-uret", async (req, res) => {
  try {
    const kullanici = await kullaniciDogrula(bearerAyikla(req));
    if (!kullanici) {
      return res.status(401).json({ hata: "giris-gerekli" });
    }

    const profil = await hesapProfiliGetir(kullanici);
    const hak = profil.plan === "premium" ? GUNLUK_HAK.premium : GUNLUK_HAK.ucretsiz;
    const kimlik = `user:${kullanici.id}:aciklama`;

    const kota = await kotaKontrolVeArtir(kimlik, hak);
    if (!kota.izinVerildi) {
      return res.status(429).json({
        hata: "limit",
        yukseltme: { girisli: true, odemeLinki: profil.plan === "premium" ? null : profil.odemeLinki },
      });
    }

    const { emlakTipi, odaSayisi, m2Brut, m2Net, binaYasi, bulunduguKat, katSayisi, isitma, konum, fiyat, ozellikler } =
      req.body ?? {};

    const sonuc = await aciklamaUret({
      emlakTipi, odaSayisi, m2Brut, m2Net, binaYasi, bulunduguKat, katSayisi, isitma, konum, fiyat, ozellikler,
    });
    res.json(sonuc);
  } catch (hata) {
    if (hata?.kod === "gecersiz-istek") return res.status(400).json({ hata: "gecersiz-istek" });
    console.error("[aciklama-uret hata]", hata);
    res.status(500).json({ hata: "ai" });
  }
});

export default router;
