// Client Supabase vendorisé localement (web/vendor/supabase.js) pour ne
// dépendre d'aucun CDN externe à l'exécution.
const { createClient } = window.supabase;

// Mêmes valeurs que .env.example — clé "publishable"/anon, faite pour être
// exposée côté client (voir la mise en garde dans supabase/schema.sql).
const SUPABASE_URL = 'https://cbtjqpoglcudgppulxjm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_oUEKbEsybqM62xnMfRmwXQ_PJHaCFoj';

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const MASTERY_THRESHOLD = 3; // fois_correct >= 3 => mot "maîtrisé"

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

const state = {
  words: [],
  categories: [],           // [{ slug, label, words, masteredCount, pct }]
  selectedCats: new Set(['__all__']),
  session: null,            // { queue, index, results:[{id,correct}], missedWords:[] }
  badgesBeforeSession: new Set(),
  lastMissedWords: [],
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function prettyCategory(slug) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function isMastered(word) {
  return (word.fois_correct || 0) >= MASTERY_THRESHOLD;
}

function isStarted(word) {
  return (word.fois_revu || 0) > 0;
}

function dateKey(d) {
  return d.toISOString().slice(0, 10);
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ------------------------------------------------------------------ */
/* Data loading                                                        */
/* ------------------------------------------------------------------ */

async function loadWords() {
  const { data, error } = await supabaseClient
    .from('vocabulaire')
    .select('id, expression, traduction, exemple, categorie, fois_revu, fois_correct, derniere_revision')
    .order('categorie', { ascending: true });

  if (error) {
    showToast("Impossible de charger le carnet — vérifie ta connexion.");
    console.error(error);
    return [];
  }
  return data;
}

function buildCategories(words) {
  const map = new Map();
  for (const w of words) {
    if (!map.has(w.categorie)) map.set(w.categorie, []);
    map.get(w.categorie).push(w);
  }
  return [...map.entries()]
    .map(([slug, list]) => {
      const mastered = list.filter(isMastered).length;
      return {
        slug,
        label: prettyCategory(slug),
        words: list,
        masteredCount: mastered,
        pct: list.length ? Math.round((mastered / list.length) * 100) : 0,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

/* ------------------------------------------------------------------ */
/* Stats                                                                */
/* ------------------------------------------------------------------ */

function computeStats(words) {
  const total = words.length;
  const mastered = words.filter(isMastered).length;
  const started = words.filter(isStarted).length;
  const inProgress = started - mastered;
  const untouched = total - started;
  const masteryPct = total ? Math.round((mastered / total) * 100) : 0;
  const totalRevisions = words.reduce((s, w) => s + (w.fois_revu || 0), 0);

  const days = new Set(
    words.filter((w) => w.derniere_revision).map((w) => dateKey(new Date(w.derniere_revision)))
  );

  const streak = computeStreak(days);
  const categoriesTouched = new Set(
    words.filter(isStarted).map((w) => w.categorie)
  ).size;
  const totalCategories = new Set(words.map((w) => w.categorie)).size;

  return {
    total, mastered, started, inProgress, untouched, masteryPct,
    totalRevisions, days, streak, categoriesTouched, totalCategories,
  };
}

function computeStreak(daySet) {
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // Si rien n'a été fait aujourd'hui, la série "en cours" part d'hier.
  if (!daySet.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (daySet.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/* ------------------------------------------------------------------ */
/* Badges                                                               */
/* ------------------------------------------------------------------ */

const BADGES = [
  { id: 'premier-pas', emoji: '🌱', name: 'Premier pas', cond: (s) => s.started >= 1 },
  { id: 'dix-mots', emoji: '📗', name: '10 maîtrisés', cond: (s) => s.mastered >= 10 },
  { id: 'cinquante-mots', emoji: '📚', name: '50 maîtrisés', cond: (s) => s.mastered >= 50 },
  { id: 'cent-mots', emoji: '🏛️', name: '100 maîtrisés', cond: (s) => s.mastered >= 100 },
  { id: 'deux-cent-cinquante', emoji: '🏆', name: '250 maîtrisés', cond: (s) => s.mastered >= 250 },
  { id: 'toutes-maitrisees', emoji: '👑', name: 'Carnet complet', cond: (s) => s.total > 0 && s.mastered === s.total },
  { id: 'serie-3', emoji: '🔥', name: '3 jours de suite', cond: (s) => s.streak >= 3 },
  { id: 'serie-7', emoji: '🔥🔥', name: '7 jours de suite', cond: (s) => s.streak >= 7 },
  { id: 'serie-30', emoji: '🔥🔥🔥', name: '30 jours de suite', cond: (s) => s.streak >= 30 },
  { id: 'toutes-categories', emoji: '🗂️', name: 'Toutes catégories touchées', cond: (s) => s.totalCategories > 0 && s.categoriesTouched === s.totalCategories },
  { id: 'cent-revisions', emoji: '💯', name: '100 révisions', cond: (s) => s.totalRevisions >= 100 },
  { id: 'cinq-cent-revisions', emoji: '⭐', name: '500 révisions', cond: (s) => s.totalRevisions >= 500 },
];

function unlockedBadgeIds(stats) {
  return new Set(BADGES.filter((b) => b.cond(stats)).map((b) => b.id));
}

/* ------------------------------------------------------------------ */
/* Rendering — Dashboard                                                */
/* ------------------------------------------------------------------ */

function setRing(circleEl, valueEl, pct) {
  const r = circleEl.r.baseVal.value;
  const circumference = 2 * Math.PI * r;
  circleEl.style.strokeDasharray = `${circumference}`;
  const offset = circumference * (1 - pct / 100);
  requestAnimationFrame(() => {
    circleEl.style.strokeDashoffset = `${offset}`;
  });
  if (valueEl) valueEl.textContent = `${pct}%`;
}

function renderHero(stats) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour.' : hour < 18 ? 'Bon après-midi.' : 'Bonsoir.';
  document.getElementById('hero-greeting').textContent = greeting;

  let sub;
  if (stats.streak > 0) {
    sub = `Série en cours : ${stats.streak} jour${stats.streak > 1 ? 's' : ''}. ${stats.untouched} mots n'ont encore jamais été vus.`;
  } else if (stats.started === 0) {
    sub = `${stats.total} mots t'attendent dans le carnet. Prêt pour la première série ?`;
  } else {
    sub = `Aucune série en cours — une petite séance aujourd'hui pour repartir ?`;
  }
  document.getElementById('hero-sub').textContent = sub;
}

function renderStatGrid(stats) {
  document.getElementById('stat-total').textContent = stats.total;
  document.getElementById('stat-mastered').textContent = stats.mastered;
  document.getElementById('stat-progress').textContent = stats.inProgress;
  document.getElementById('stat-new').textContent = stats.untouched;
}

function renderHeatmap(stats) {
  const el = document.getElementById('heatmap');
  el.innerHTML = '';
  const weeks = 10;
  const totalDays = weeks * 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(start.getDate() - (totalDays - 1));
  // aligner sur un lundi
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);

  const cursor = new Date(start);
  while (cursor <= today) {
    const key = dateKey(cursor);
    const cell = document.createElement('div');
    cell.className = 'cell';
    if (cursor > today) {
      cell.style.visibility = 'hidden';
    } else {
      const level = stats.days.has(key) ? 3 : 0;
      cell.classList.add(`lvl${level}`);
      cell.title = `${key}${stats.days.has(key) ? ' — révisé' : ''}`;
    }
    el.appendChild(cell);
    cursor.setDate(cursor.getDate() + 1);
  }
}

function renderBadges(stats, containerId = 'badges-grid', captionId = 'badges-caption') {
  const unlocked = unlockedBadgeIds(stats);
  const grid = document.getElementById(containerId);
  grid.innerHTML = '';
  for (const b of BADGES) {
    const on = unlocked.has(b.id);
    const div = document.createElement('div');
    div.className = `badge ${on ? '' : 'is-locked'}`;
    div.innerHTML = `<span class="badge-emoji">${b.emoji}</span><span class="badge-name">${b.name}</span>`;
    grid.appendChild(div);
  }
  const caption = document.getElementById(captionId);
  if (caption) caption.textContent = `${unlocked.size} / ${BADGES.length} débloquées`;
  return unlocked;
}

function renderCategoryBars() {
  const wrap = document.getElementById('category-bars');
  wrap.innerHTML = '';
  for (const cat of state.categories) {
    const row = document.createElement('div');
    row.className = 'category-row';
    row.innerHTML = `
      <span class="category-name">${cat.label}</span>
      <span class="category-track"><span class="category-fill" style="width:${cat.pct}%"></span></span>
      <span class="category-pct">${cat.pct}%</span>
    `;
    row.addEventListener('click', () => {
      state.selectedCats = new Set([cat.slug]);
      switchView('categories');
      renderCategoriesView();
    });
    wrap.appendChild(row);
  }
}

function renderDashboard() {
  const stats = computeStats(state.words);
  renderHero(stats);
  renderStatGrid(stats);
  setRing(document.getElementById('ring-mastery'), document.getElementById('ring-mastery-value'), stats.masteryPct);
  renderHeatmap(stats);
  renderBadges(stats);
  renderCategoryBars();
  document.getElementById('streak-count').textContent = stats.streak;
}

/* ------------------------------------------------------------------ */
/* Rendering — Categories / setup view                                  */
/* ------------------------------------------------------------------ */

function renderCategoriesView() {
  const grid = document.getElementById('category-chips');
  grid.innerHTML = '';
  for (const cat of state.categories) {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.dataset.cat = cat.slug;
    chip.textContent = `${cat.label} (${cat.words.length})`;
    if (state.selectedCats.has(cat.slug)) chip.classList.add('is-selected');
    chip.addEventListener('click', () => toggleCategoryChip(cat.slug));
    grid.appendChild(chip);
  }
  syncSpecialChips();
}

function syncSpecialChips() {
  document.getElementById('chip-all').classList.toggle('is-selected', state.selectedCats.has('__all__'));
  document.getElementById('chip-priority').classList.toggle('is-selected', state.selectedCats.has('__priority__'));
}

function toggleCategoryChip(slug) {
  state.selectedCats.delete('__all__');
  state.selectedCats.delete('__priority__');
  if (state.selectedCats.has(slug)) {
    state.selectedCats.delete(slug);
  } else {
    state.selectedCats.add(slug);
  }
  if (state.selectedCats.size === 0) state.selectedCats.add('__all__');
  renderCategoriesView();
}

function selectSpecial(mode) {
  state.selectedCats = new Set([mode]);
  renderCategoriesView();
}

function wordsForSelection() {
  if (state.selectedCats.has('__all__')) return state.words;
  if (state.selectedCats.has('__priority__')) {
    return [...state.words]
      .sort((a, b) => {
        const av = a.fois_revu || 0, bv = b.fois_revu || 0;
        if (av !== bv) return av - bv;
        const ad = a.derniere_revision ? new Date(a.derniere_revision).getTime() : 0;
        const bd = b.derniere_revision ? new Date(b.derniere_revision).getTime() : 0;
        return ad - bd;
      })
      .slice(0, 60);
  }
  return state.words.filter((w) => state.selectedCats.has(w.categorie));
}

/* ------------------------------------------------------------------ */
/* Quiz                                                                 */
/* ------------------------------------------------------------------ */

function startQuiz() {
  const pool = wordsForSelection();
  if (pool.length === 0) {
    showToast('Aucun mot dans cette sélection.');
    return;
  }
  const lengthSel = document.getElementById('session-length').value;
  const n = lengthSel === '0' ? pool.length : Math.min(Number(lengthSel), pool.length);
  startSession(shuffle(pool).slice(0, n));
}

function startSessionWithMissedWords() {
  if (state.lastMissedWords.length === 0) return;
  startSession(shuffle(state.lastMissedWords));
}

function startSession(queue) {
  state.badgesBeforeSession = unlockedBadgeIds(computeStats(state.words));
  state.session = { queue, index: 0, results: [], missedWords: [] };

  switchView('quiz');
  renderCurrentCard();
}

function renderCurrentCard() {
  const { queue, index } = state.session;
  const word = queue[index];
  const flashcard = document.getElementById('flashcard');

  // Désactive la transition le temps de repasser en recto et de changer le
  // texte, sinon la traduction déjà mise à jour est visible une fraction de
  // seconde pendant l'animation de "déflip" de l'ancienne carte.
  flashcard.style.transition = 'none';
  flashcard.classList.remove('is-flipped');
  void flashcard.offsetWidth; // force reflow

  document.getElementById('card-category').textContent = prettyCategory(word.categorie);
  document.getElementById('card-front-text').textContent = word.expression;
  document.getElementById('card-back-text').textContent = word.traduction;
  document.getElementById('card-back-example').textContent = word.exemple || '';

  document.getElementById('quiz-count').textContent = `${index + 1} / ${queue.length}`;
  document.getElementById('quiz-progress-fill').style.width = `${(index / queue.length) * 100}%`;

  requestAnimationFrame(() => {
    flashcard.style.transition = '';
  });
}

function flipCard() {
  document.getElementById('flashcard').classList.toggle('is-flipped');
}

async function answerCard(correct) {
  const { queue, index } = state.session;
  const word = queue[index];

  state.session.results.push({ id: word.id, correct });
  if (!correct) state.session.missedWords.push(word);

  // mise à jour optimiste locale + persistance Supabase (comme scripts/marquer-revision.mjs)
  word.fois_revu = (word.fois_revu || 0) + 1;
  word.fois_correct = (word.fois_correct || 0) + (correct ? 1 : 0);
  word.derniere_revision = new Date().toISOString();

  supabaseClient
    .from('vocabulaire')
    .update({
      fois_revu: word.fois_revu,
      fois_correct: word.fois_correct,
      derniere_revision: word.derniere_revision,
    })
    .eq('id', word.id)
    .then(({ error }) => { if (error) console.error(error); });

  if (state.session.index + 1 >= queue.length) {
    finishSession();
  } else {
    state.session.index += 1;
    renderCurrentCard();
  }
}

function quitQuiz() {
  state.session = null;
  switchView('dashboard');
  refreshDashboard();
}

function finishSession() {
  const { results } = state.session;
  const yes = results.filter((r) => r.correct).length;
  const no = results.length - yes;
  const pct = results.length ? Math.round((yes / results.length) * 100) : 0;

  document.getElementById('quiz-progress-fill').style.width = '100%';

  const emoji = pct >= 90 ? '🏆' : pct >= 70 ? '🎉' : pct >= 40 ? '💪' : '🌱';
  const title = pct >= 90 ? 'Sans faute ou presque !' : pct >= 70 ? 'Belle série !' : pct >= 40 ? 'Ça progresse.' : 'On garde le cap.';
  const sub = no === 0
    ? 'Tous les mots connus, direction la suite.'
    : `${no} mot${no > 1 ? 's' : ''} à revoir bientôt — ils reviendront en priorité.`;

  document.getElementById('results-emoji').textContent = emoji;
  document.getElementById('results-title').textContent = title;
  document.getElementById('results-sub').textContent = sub;
  document.getElementById('results-yes').textContent = yes;
  document.getElementById('results-no').textContent = no;
  setRing(document.getElementById('results-ring'), document.getElementById('results-score'), pct);

  state.lastMissedWords = state.session.missedWords.slice();
  const replayBtn = document.getElementById('results-replay-missed');
  replayBtn.hidden = state.lastMissedWords.length === 0;
  replayBtn.textContent = `🔁 Rejouer les ${state.lastMissedWords.length} mot${state.lastMissedWords.length > 1 ? 's' : ''} raté${state.lastMissedWords.length > 1 ? 's' : ''}`;

  const newStats = computeStats(state.words);
  const nowUnlocked = renderBadges(newStats, 'badges-grid', 'badges-caption');
  const freshlyUnlocked = [...nowUnlocked].filter((id) => !state.badgesBeforeSession.has(id));

  const wrap = document.getElementById('results-new-badges');
  wrap.innerHTML = '';
  if (freshlyUnlocked.length) {
    const label = document.createElement('p');
    label.style.cssText = 'width:100%;font-size:12px;color:var(--ink-soft);margin:0 0 4px;';
    label.textContent = 'Nouvelle récompense débloquée';
    wrap.appendChild(label);
    for (const id of freshlyUnlocked) {
      const b = BADGES.find((x) => x.id === id);
      const div = document.createElement('div');
      div.className = 'badge';
      div.innerHTML = `<span class="badge-emoji">${b.emoji}</span><span class="badge-name">${b.name}</span>`;
      wrap.appendChild(div);
    }
  }

  switchView('results');
}

/* ------------------------------------------------------------------ */
/* View switching                                                       */
/* ------------------------------------------------------------------ */

function switchView(name) {
  for (const el of document.querySelectorAll('.view')) el.classList.remove('is-active');
  document.getElementById(`view-${name}`).classList.add('is-active');
  for (const tab of document.querySelectorAll('.tab')) {
    const active = tab.dataset.view === name || (name === 'quiz' && tab.dataset.view === 'categories') || (name === 'results' && tab.dataset.view === 'categories');
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function refreshDashboard() {
  state.words = await loadWords();
  state.categories = buildCategories(state.words);
  renderDashboard();
}

/* ------------------------------------------------------------------ */
/* Init                                                                  */
/* ------------------------------------------------------------------ */

function bindEvents() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const view = tab.dataset.view;
      switchView(view);
      if (view === 'categories') renderCategoriesView();
    });
  });

  document.getElementById('cta-revise').addEventListener('click', () => {
    switchView('categories');
    renderCategoriesView();
  });

  document.getElementById('chip-all').addEventListener('click', () => selectSpecial('__all__'));
  document.getElementById('chip-priority').addEventListener('click', () => selectSpecial('__priority__'));
  document.getElementById('start-quiz').addEventListener('click', startQuiz);

  document.getElementById('flashcard').addEventListener('click', flipCard);
  document.getElementById('btn-know').addEventListener('click', () => answerCard(true));
  document.getElementById('btn-dont-know').addEventListener('click', () => answerCard(false));
  document.getElementById('quiz-quit').addEventListener('click', quitQuiz);

  document.getElementById('results-replay-missed').addEventListener('click', startSessionWithMissedWords);
  document.getElementById('results-again').addEventListener('click', () => {
    switchView('categories');
    renderCategoriesView();
  });
  document.getElementById('results-dashboard').addEventListener('click', () => {
    switchView('dashboard');
    refreshDashboard();
  });

  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('view-quiz').classList.contains('is-active')) return;
    if (e.code === 'Space') { e.preventDefault(); flipCard(); }
    if (e.key === 'ArrowRight') answerCard(true);
    if (e.key === 'ArrowLeft') answerCard(false);
  });
}

async function init() {
  bindEvents();
  await refreshDashboard();
}

init();
