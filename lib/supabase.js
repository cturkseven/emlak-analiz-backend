import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[uyarı] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tanımlı değil — " +
      "hesap/kota işlemleri çalışmayacak. .env dosyanızı kontrol edin."
  );
}

// service_role anahtarı RLS'i (satır seviyesi güvenlik) atlar — bu yüzden
// SADECE backend'de, SADECE ortam değişkeni olarak saklanmalı. İstemciye
// (eklentiye) asla gömülmemeli.
//
// Ortam değişkenleri eksikse createClient() geçersiz bir URL ile anında
// çökeceğine (sunucu hiç ayağa kalkmayacağına), geçerli görünümlü bir
// placeholder ile başlatıyoruz — bu sayede sunucu açılır, /saglik gibi
// endpoint'ler çalışır, sadece gerçek Supabase çağrıları (kota/profil)
// hata verir ve bu hatalar zaten ilgili route'larda try/catch ile yakalanıp
// kullanıcıya düzgün bir hata mesajı olarak dönüyor.
export const supabaseAdmin = createClient(
  SUPABASE_URL || "https://yapilandirilmamis.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY || "yapilandirilmamis",
  { auth: { persistSession: false } }
);
