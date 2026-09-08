-- Migration : ajoute la colonne date_ajout à la table vocabulaire existante.
-- À exécuter une seule fois dans l'éditeur SQL de Supabase
-- (Dashboard > SQL Editor > New query), si la table a été créée avant
-- l'introduction de la fonctionnalité "mots du jour".
--
-- Si tu recrées la table vocabulaire depuis zéro, schema.sql suffit :
-- cette migration n'est utile que pour une table déjà existante.

alter table vocabulaire
  add column if not exists date_ajout timestamptz;

comment on column vocabulaire.date_ajout is 'Horodatage du lot d''ajout ("mots du jour") : les mots ajoutés ensemble partagent la même valeur ; NULL pour les mots plus anciens non concernés par cette fonctionnalité.';
