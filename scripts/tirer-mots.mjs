import { supabase } from './lib/supabase.mjs';

const nombre = Number(process.argv[2]) || 8;

const { data, error } = await supabase
  .from('vocabulaire')
  .select('id, expression, traduction, exemple, categorie, fois_revu, derniere_revision, created_at')
  .order('fois_revu', { ascending: true })
  .order('derniere_revision', { ascending: true, nullsFirst: true })
  .limit(nombre);

if (error) {
  console.error('Erreur :', error.message);
  process.exit(1);
}

console.log(JSON.stringify(data, null, 2));
