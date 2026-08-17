import { readFile } from 'node:fs/promises';
import { supabase } from './lib/supabase.mjs';

const mots = JSON.parse(
  await readFile(new URL('../data/vocabulaire.json', import.meta.url))
);

const { data, error } = await supabase
  .from('vocabulaire')
  .upsert(mots, { onConflict: 'expression', ignoreDuplicates: false })
  .select('expression');

if (error) {
  console.error('Erreur lors du seed :', error.message);
  process.exit(1);
}

console.log(`${data.length} mots insérés/mis à jour dans la table "vocabulaire".`);
