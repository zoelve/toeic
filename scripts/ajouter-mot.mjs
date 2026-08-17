import { supabase } from './lib/supabase.mjs';

const [expression, traduction, exemple = null, categorie = 'divers'] = process.argv.slice(2);

if (!expression || !traduction) {
  console.error(
    'Usage : npm run ajouter-mot -- "expression" "traduction" ["exemple"] ["categorie"]'
  );
  process.exit(1);
}

const { error } = await supabase
  .from('vocabulaire')
  .upsert(
    [{ expression, traduction, exemple, categorie }],
    { onConflict: 'expression' }
  );

if (error) {
  console.error('Erreur :', error.message);
  process.exit(1);
}

console.log(`Mot ajouté : "${expression}" → "${traduction}"`);
