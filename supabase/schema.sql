-- Schéma Supabase pour le vocabulaire TOEIC
-- À exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor > New query)

create extension if not exists pgcrypto;

create table if not exists vocabulaire (
  id uuid primary key default gen_random_uuid(),
  expression text not null unique,
  traduction text not null,
  exemple text,
  categorie text not null,
  source text default 'fiche-grammaire-toeic',
  fois_revu integer not null default 0,
  fois_correct integer not null default 0,
  derniere_revision timestamptz,
  created_at timestamptz not null default now(),
  date_ajout timestamptz
);

comment on column vocabulaire.date_ajout is 'Horodatage du lot d''ajout ("mots du jour") : les mots ajoutés ensemble partagent la même valeur ; NULL pour les mots plus anciens non concernés par cette fonctionnalité.';

comment on table vocabulaire is 'Vocabulaire TOEIC extrait des fiches de révision, révisé quotidiennement.';

-- Active la Row Level Security
alter table vocabulaire enable row level security;

-- ⚠️ Ce projet est un outil de révision personnel, sans authentification.
-- La clé "publishable"/anon donnée à l'app a donc besoin d'un accès direct en
-- lecture/écriture sur cette table. Ne réutilise pas cette clé sur un projet
-- public : n'importe qui la possédant pourrait lire/modifier ces lignes.
create policy "lecture publique vocabulaire"
  on vocabulaire for select
  to anon
  using (true);

create policy "insertion publique vocabulaire"
  on vocabulaire for insert
  to anon
  with check (true);

create policy "mise a jour publique vocabulaire"
  on vocabulaire for update
  to anon
  using (true)
  with check (true);

-- Table des règles de grammaire/collocations TOEIC (onglet "Règles")
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
