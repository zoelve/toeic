# TOEIC — objectif 800

Fiches de révision et base de vocabulaire TOEIC connectée à Supabase, avec quiz quotidien.

## Structure

- `fiche/` — fiches de révision grammaire (Markdown).
- `data/vocabulaire.json` — vocabulaire extrait des fiches, à seed dans Supabase.
- `supabase/schema.sql` — schéma SQL à exécuter une fois dans l'éditeur SQL Supabase.
- `scripts/` — scripts Node pour peupler et interroger la base.

## Mise en place

1. Dans le [dashboard Supabase](https://supabase.com/dashboard/project/cbtjqpoglcudgppulxjm/sql/new), exécuter le contenu de `supabase/schema.sql` pour créer la table `vocabulaire`.
2. Copier `.env.example` en `.env` (les valeurs par défaut pointent déjà vers le projet).
3. `npm install`
4. `npm run seed` — insère le vocabulaire de `data/vocabulaire.json` dans Supabase.

## Scripts disponibles

- `npm run seed` — peuple/actualise la base à partir de `data/vocabulaire.json`.
- `npm run ajouter-mot -- "expression" "traduction" ["exemple"] ["categorie"]` — ajoute un mot depuis une nouvelle fiche.
- `npm run tirer-mots -- 8` — tire les mots les moins révisés (pour le quiz quotidien).
- `npm run marquer-revision -- "expression" correct|incorrect` — enregistre le résultat d'une révision.

## Quiz quotidien

Une routine automatique interroge chaque jour sur des mots de la table `vocabulaire`
(les moins révisés en priorité), directement dans la conversation.
