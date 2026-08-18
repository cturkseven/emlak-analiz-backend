const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

/**
 * Bir Supabase erişim token'ını doğrular ve kullanıcıyı döndürür.
 * Token yoksa veya geçersizse null döner (istek "misafir" olarak devam eder).
 */
export async function kullaniciDogrula(bearerToken) {
  if (!bearerToken || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    const cevap = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, authorization: `Bearer ${bearerToken}` },
    });
    if (!cevap.ok) return null;
    const veri = await cevap.json();
    return veri?.id ? { id: veri.id, eposta: veri.email } : null;
  } catch {
    return null;
  }
}

export function bearerAyikla(req) {
  const baslik = req.headers.authorization ?? "";
  return baslik.startsWith("Bearer ") ? baslik.slice(7) : null;
}
