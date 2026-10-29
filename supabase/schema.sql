-- Carnet d'hiver : table des notes, à coller dans Supabase > SQL Editor > Run.
-- Chaque personne connectée ne voit et ne modifie que ses propres notes (RLS).

create table if not exists public.carnet (
  user_id  uuid        not null default auth.uid() references auth.users on delete cascade,
  pays_id  text        not null,
  note     text        not null default '',
  links    jsonb       not null default '[]'::jsonb,
  wish     boolean     not null default false,
  maj      timestamptz not null default now(),
  primary key (user_id, pays_id)
);

-- Accès via l'API uniquement pour les personnes connectées (rien pour les visiteurs anonymes).
grant select, insert, update, delete on public.carnet to authenticated;

alter table public.carnet enable row level security;

drop policy if exists "carnet : chacun ses notes" on public.carnet;
create policy "carnet : chacun ses notes" on public.carnet
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
