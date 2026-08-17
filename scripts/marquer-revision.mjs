import { supabase } from './lib/supabase.mjs';

const [expression, resultat] = process.argv.slice(2);

if (!expression || !['correct', 'incorrect'].includes(resultat)) {
  console.error(
    'Usage : npm run marquer-revision -- "expression" correct|incorrect'
  );
  process.exit(1);
}

const { data: mot, error: erreurLecture } = await supabase
  .from('vocabulaire')
  .select('fois_revu, fois_correct')
  .eq('expression', expression)
  .single();

if (erreurLecture) {
  console.error('Erreur :', erreurLecture.message);
  process.exit(1);
}

const { error } = await supabase
  .from('vocabulaire')
  .update({
    fois_revu: mot.fois_revu + 1,
    fois_correct: mot.fois_correct + (resultat === 'correct' ? 1 : 0),
    derniere_revision: new Date().toISOString(),
  })
  .eq('expression', expression);

if (error) {
  console.error('Erreur :', error.message);
  process.exit(1);
}

console.log(`"${expression}" marqué comme ${resultat}.`);
