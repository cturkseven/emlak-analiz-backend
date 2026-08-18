import { Router } from "express";
import { kullaniciDogrula, bearerAyikla } from "../lib/auth.js";
import { hesapProfiliGetir } from "../lib/profil.js";

const router = Router();

router.get("/auth/ben", async (req, res) => {
  const kullanici = await kullaniciDogrula(bearerAyikla(req));
  if (!kullanici) return res.status(401).json({ hata: "hesap-dogrulanamadi" });

  try {
    const hesap = await hesapProfiliGetir(kullanici);
    res.json({ hesap });
  } catch (hata) {
    console.error("[auth/ben hata]", hata);
    res.status(500).json({ hata: "ag" });
  }
});

export default router;
