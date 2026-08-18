// Bu import her zaman EN ÜSTTE kalmalı: .env dosyasını process.env'e yükler,
// böylece aşağıdaki diğer modüller (lib/supabase.js gibi) import edildiklerinde
// ortam değişkenleri zaten hazır olur. Railway/Render gibi platformlarda .env
// dosyası yoksa (ortam değişkenleri panelden enjekte edilir) sessizce hiçbir şey yapmaz.
import "dotenv/config";
import express from "express";
import cors from "cors";
import analyzeRouter from "./routes/analyze.js";
import batchScoreRouter from "./routes/batchScore.js";
import authRouter from "./routes/auth.js";
import aciklamaRouter from "./routes/aciklama.js";

const app = express();

// Chrome eklentisinin service worker'ından yapılan fetch istekleri manifest'teki
// host_permissions sayesinde zaten CORS'a takılmaz, ama geliştirme sırasında
// düz bir web sayfasından test edebilmek için izinli bırakıyoruz.
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => res.json({ durum: "ayakta" }));
app.get("/saglik", (_req, res) => res.json({ durum: "ayakta" }));

app.use(analyzeRouter);
app.use(batchScoreRouter);
app.use(authRouter);
app.use(aciklamaRouter);

app.use((req, res) => res.status(404).json({ hata: "bulunamadi" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Emlak Analiz backend ${PORT} portunda çalışıyor`));
