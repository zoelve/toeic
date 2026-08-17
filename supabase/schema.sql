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
  created_at timestamptz not null default now()
);

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
