import { supabaseAdmin } from "./supabase.js";

// Günlük ücretsiz analiz hakları — dilediğiniz gibi değiştirin.
export const GUNLUK_HAK = {
  misafir: 3, // hesap açmamış, sadece cihaz kimliğiyle tanınan kullanıcı
  ucretsiz: 10, // hesap açmış ama premium olmayan kullanıcı
  premium: 200, // pratikte sınırsız sayılabilecek yüksek bir değer
};

function bugununTarihi() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

/**
 * Verilen kimlik ("user:<uuid>" ya da "device:<uuid>") için bugünkü kullanım
 * sayısını okur, hakkı doldurmadıysa sayacı bir artırır.
 * Dönen: { izinVerildi, kullanilan, hak }
 */
export async function kotaKontrolVeArtir(kimlik, hak) {
  const tarih = bugununTarihi();

  const { data: mevcut, error: okumaHatasi } = await supabaseAdmin
    .from("kullanim")
    .select("sayi")
    .eq("kimlik", kimlik)
    .eq("tarih", tarih)
    .maybeSingle();

  if (okumaHatasi) throw okumaHatasi;

  const kullanilan = mevcut?.sayi ?? 0;
  if (kullanilan >= hak) return { izinVerildi: false, kullanilan, hak };

  const { error: yazmaHatasi } = await supabaseAdmin
    .from("kullanim")
    .upsert({ kimlik, tarih, sayi: kullanilan + 1 }, { onConflict: "kimlik,tarih" });

  if (yazmaHatasi) throw yazmaHatasi;

  return { izinVerildi: true, kullanilan: kullanilan + 1, hak };
}

export async function bugunkuKullanim(kimlik) {
  const { data } = await supabaseAdmin
    .from("kullanim")
    .select("sayi")
    .eq("kimlik", kimlik)
    .eq("tarih", bugununTarihi())
    .maybeSingle();
  return data?.sayi ?? 0;
}
