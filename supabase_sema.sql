-- Emlak Analiz — Supabase şeması
-- Supabase projenizde SQL Editor'e yapıştırıp çalıştırın.

-- 1) Kullanıcı profilleri: plan, abonelik, ödeme linki
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  eposta text,
  plan text not null default 'ucretsiz', -- 'ucretsiz' | 'premium'
  abonelik_bitis timestamptz,
  odeme_linki text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Kullanıcı sadece kendi satırını okuyabilir (backend zaten service_role ile
-- RLS'i atlıyor, bu politika istemcinin doğrudan Supabase'e bağlanma ihtimaline
-- karşı ek bir güvenlik katmanıdır).
create policy "kendi profilini gorebilir"
  on public.profiles for select
  using (auth.uid() = id);

-- 2) Yeni kullanıcı kaydolduğunda otomatik profil satırı oluştur
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, eposta) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3) Günlük kullanım / kota sayacı
-- kimlik: "user:<uuid>" (hesaplı) ya da "device:<uuid>" (misafir/cihaz bazlı)
create table if not exists public.kullanim (
  kimlik text not null,
  tarih date not null default current_date,
  sayi int not null default 0,
  primary key (kimlik, tarih)
);

alter table public.kullanim enable row level security;
-- Bu tabloya sadece backend (service_role) yazıp okuyor, istemciden erişim
-- gerekmiyor; bu yüzden herhangi bir "kendi satırını görebilir" politikası
-- eklemiyoruz (RLS açık + politika yoksa hiçbir anon/authenticated erişimi olmaz).

-- 4) (İsteğe bağlı) Stripe webhook'unuzdan abonelik güncellemesi yapacaksanız
-- örnek bir güncelleme sorgusu:
-- update public.profiles set plan = 'premium', abonelik_bitis = '2027-01-01'
-- where id = '<kullanicinin-uuid-si>';
