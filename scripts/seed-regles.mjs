import { readFile } from 'node:fs/promises';
import { supabase } from './lib/supabase.mjs';

const regles = JSON.parse(
  await readFile(new URL('../data/regles.json', import.meta.url))
);

const { data, error } = await supabase
  .from('regles')
  .upsert(regles, { onConflict: 'regle', ignoreDuplicates: false })
  .select('regle');

if (error) {
  console.error('Erreur lors du seed :', error.message);
  process.exit(1);
}

console.log(`${data.length} règles insérées/mises à jour dans la table "regles".`);
