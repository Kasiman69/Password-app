-- Run once in the SQL Editor of the NEW Supabase project for Hearth.
-- No existing tables are modified. The only stored vault contents are ciphertext.
begin;

create table public.hearth_vaults (
  user_id uuid primary key references auth.users(id) on delete cascade,
  salt text not null check (length(salt) = 24),
  iv text not null check (length(iv) = 16),
  ciphertext text not null check (length(ciphertext) between 24 and 1400000),
  kdf_iterations integer not null default 600000 check (kdf_iterations = 600000),
  format_version integer not null default 1 check (format_version = 1),
  revision integer not null default 1 check (revision >= 1),
  updated_at timestamptz not null default now()
);

alter table public.hearth_vaults enable row level security;
alter table public.hearth_vaults force row level security;
revoke all on public.hearth_vaults from anon;
revoke all on public.hearth_vaults from authenticated;
grant select, insert, update, delete on public.hearth_vaults to authenticated;

create policy "Read own vault" on public.hearth_vaults for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Create own vault" on public.hearth_vaults for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Update own vault" on public.hearth_vaults for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own vault" on public.hearth_vaults for delete to authenticated
  using ((select auth.uid()) = user_id);

commit;
