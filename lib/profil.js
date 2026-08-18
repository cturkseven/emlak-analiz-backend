import { supabaseAdmin } from "./supabase.js";
import { GUNLUK_HAK, bugunkuKullanim } from "./quota.js";

/**
 * Kullanıcının profiles satırını getirir; yoksa (ör. Supabase trigger'ı henüz
 * çalışmadıysa) oluşturur. Popup'ın "hesabım" ekranında gösterilecek tüm
 * bilgiyi (plan, kota, ödeme linki) tek seferde toplar.
 */
export async function hesapProfiliGetir(kullanici) {
  let { data: profil, error } = await supabaseAdmin
    .from("profiles")
    .select("plan, abonelik_bitis, odeme_linki")
    .eq("id", kullanici.id)
    .maybeSingle();

  if (error) throw error;

  if (!profil) {
    const { data: yeniProfil, error: eklemeHatasi } = await supabaseAdmin
      .from("profiles")
      .insert({ id: kullanici.id, eposta: kullanici.eposta, plan: "ucretsiz" })
      .select("plan, abonelik_bitis, odeme_linki")
      .single();
    if (eklemeHatasi) throw eklemeHatasi;
    profil = yeniProfil;
  }

  const kimlik = `user:${kullanici.id}`;
  const hak = profil.plan === "premium" ? GUNLUK_HAK.premium : GUNLUK_HAK.ucretsiz;
  const kullanilan = await bugunkuKullanim(kimlik);

  return {
    eposta: kullanici.eposta,
    plan: profil.plan,
    abonelikBitis: profil.abonelik_bitis,
    odemeLinki: profil.odeme_linki ?? process.env.STRIPE_ODEME_LINKI ?? null,
    gunlukHak: hak,
    bugunKullanilan: kullanilan,
  };
}
