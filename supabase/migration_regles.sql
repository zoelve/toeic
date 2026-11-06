-- Migration : table des règles de grammaire TOEIC (onglet "Règles")
-- À exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor > New query)

create table if not exists regles (
  id uuid primary key default gen_random_uuid(),
  regle text not null unique,
  explication text not null,
  exemple text,
  categorie text not null default 'general',
  created_at timestamptz not null default now(),
  date_ajout timestamptz
);

comment on table regles is 'Règles de grammaire/collocations TOEIC (ex: "should + verbe de base", "whose + nom") affichées dans l''onglet Règles du carnet.';
comment on column regles.date_ajout is 'Horodatage du lot d''ajout, même logique que vocabulaire.date_ajout.';

alter table regles enable row level security;

create policy "lecture publique regles"
  on regles for select
  to anon
  using (true);

create policy "insertion publique regles"
  on regles for insert
  to anon
  with check (true);

create policy "mise a jour publique regles"
  on regles for update
  to anon
  using (true)
  with check (true);
