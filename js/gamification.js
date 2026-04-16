// gamification.js — XP, Levels, Streak, Achievements + Supabase backend

const SUPABASE_URL = 'https://fjafwejmjwqwpgjuqrjl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqYWZ3ZWptandxd3BnanVxcmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNTM2MTQsImV4cCI6MjA5MTgyOTYxNH0.lnAwiYo0iYbsumsgOaiWRoPmQ8M8be0cSwT4dvbrA5c';
const DB_HEADERS  = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

// ── Levels ────────────────────────────────────────────────────
const LEVELS = [
  { level:1,  name:'初學者',   xp:0    },
  { level:2,  name:'入門者',   xp:100  },
  { level:3,  name:'學習中',   xp:250  },
  { level:4,  name:'努力者',   xp:500  },
  { level:5,  name:'中級者',   xp:900  },
  { level:6,  name:'語言達人', xp:1500 },
  { level:7,  name:'語言中級', xp:2400 },
  { level:8,  name:'上級者',   xp:3600 },
  { level:9,  name:'準大師',   xp:5200 },
  { level:10, name:'動詞傳說', xp:7200 },
];

// ── Achievements ──────────────────────────────────────────────
const ACHIEVEMENTS = [
  { id:'first_quiz',     name:'踏出第一步', icon:'🌱', desc:'完成第一次練習' },
  { id:'perfect_score',  name:'完美主義者', icon:'💯', desc:'一次全數答對' },
  { id:'streak_3',       name:'習慣養成',   icon:'🔥', desc:'連續練習 3 天' },
  { id:'streak_7',       name:'週挑戰達人', icon:'⚡', desc:'連續練習 7 天' },
  { id:'streak_30',      name:'月之意志',   icon:'🌙', desc:'連續練習 30 天' },
  { id:'correct_50',     name:'五十題達人', icon:'🎯', desc:'累積答對 50 題' },
  { id:'correct_100',    name:'百題達人',   icon:'💪', desc:'累積答對 100 題' },
  { id:'correct_500',    name:'五百題傳說', icon:'👑', desc:'累積答對 500 題' },
  { id:'level_5',        name:'中級畢業',   icon:'🎓', desc:'達到 Lv.5 中級者' },
  { id:'level_10',       name:'動詞傳說',   icon:'🏆', desc:'達到 Lv.10 動詞傳說' },
  { id:'groupid_perfect',name:'辨別達人',   icon:'🧠', desc:'辨別模式全數答對' },
  { id:'hard_mode',      name:'鐵人挑戰',   icon:'🛡️', desc:'隱藏類別提示下正確率 ≥ 90%' },
  { id:'all_groups',     name:'全類制霸',   icon:'⚔️', desc:'三類動詞全選完成一次練習' },
  { id:'random_dir',     name:'隨機勇者',   icon:'🎲', desc:'使用隨機方向模式完成練習' },
  { id:'quizzes_10',     name:'勤奮練習',   icon:'📚', desc:'完成 10 回合練習' },
];

// ── Current user ──────────────────────────────────────────────
const USER_KEY = 'jpVerb_user';

function getCurrentUser() {
  return localStorage.getItem(USER_KEY) || null;
}

function setCurrentUser(name) {
  localStorage.setItem(USER_KEY, name.trim());
}

function clearCurrentUser() {
  localStorage.removeItem(USER_KEY);
}

// ── Stats cache (keeps UI synchronous) ───────────────────────
let _statsCache = null;

function defaultStats() {
  return {
    xp: 0,
    quizzesCompleted: 0,
    totalCorrect: 0,
    totalAnswered: 0,
    streak: { current: 0, longest: 0, lastDate: null },
    achievements: [],
  };
}

function loadStats() {
  return _statsCache || defaultStats();
}

// ── Supabase DB helpers ───────────────────────────────────────
async function fetchStatsFromDB(name) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/verb_stats?name=eq.${encodeURIComponent(name)}&select=*`,
      { headers: DB_HEADERS }
    );
    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0) {
      const r = rows[0];
      return {
        xp:              r.xp,
        quizzesCompleted: r.quizzes_completed,
        totalCorrect:    r.total_correct,
        totalAnswered:   r.total_answered,
        streak: {
          current:  r.streak_current,
          longest:  r.streak_longest,
          lastDate: r.streak_last_date,
        },
        achievements: r.achievements || [],
      };
    }
  } catch (e) { console.warn('fetchStatsFromDB:', e); }
  return defaultStats();
}

function saveStats(stats) {
  _statsCache = stats;
  const user = getCurrentUser();
  if (!user) return;
  // Fire-and-forget upsert
  fetch(`${SUPABASE_URL}/rest/v1/verb_stats`, {
    method: 'POST',
    headers: { ...DB_HEADERS, 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({
      name:              user,
      xp:                stats.xp,
      quizzes_completed: stats.quizzesCompleted,
      total_correct:     stats.totalCorrect,
      total_answered:    stats.totalAnswered,
      streak_current:    stats.streak.current,
      streak_longest:    stats.streak.longest,
      streak_last_date:  stats.streak.lastDate,
      achievements:      stats.achievements,
      updated_at:        new Date().toISOString(),
    }),
  }).catch(e => console.warn('saveStats:', e));
}

// Call on boot after user is known
async function initUser(name) {
  _statsCache = await fetchStatsFromDB(name);
}

// Fetch ranking list (top 20 by XP)
async function fetchRanking() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/verb_stats?select=name,xp,streak_current,achievements&order=xp.desc&limit=20`,
      { headers: DB_HEADERS }
    );
    return await res.json();
  } catch (e) { return []; }
}

// ── Level helpers ─────────────────────────────────────────────
function getLevelInfo(xp) {
  let lv = LEVELS[0];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp) { lv = LEVELS[i]; break; }
  }
  const isMax  = lv.level === LEVELS[LEVELS.length - 1].level;
  const nextLv = isMax ? null : LEVELS[lv.level];
  const currentXP = xp - lv.xp;
  const neededXP  = isMax ? 0 : nextLv.xp - lv.xp;
  const progress  = isMax ? 100 : Math.round((currentXP / neededXP) * 100);
  return { level: lv.level, name: lv.name, currentXP, neededXP, progress, isMax };
}

// ── XP Computation ────────────────────────────────────────────
function computeXP(correct, total, streakDays) {
  let base = correct * 10;
  if (correct === total && total > 0) base += 20;
  const multiplier = streakDays >= 3 ? 1.5 : 1;
  return Math.round(base * multiplier);
}

// ── Streak update ─────────────────────────────────────────────
function updateStreak(streak) {
  const today     = new Date().toISOString().slice(0, 10);
  if (streak.lastDate === today) return streak;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newCurrent = streak.lastDate === yesterday ? streak.current + 1 : 1;
  return {
    current:  newCurrent,
    longest:  Math.max(streak.longest, newCurrent),
    lastDate: today,
  };
}

// ── Achievement check ─────────────────────────────────────────
function checkAchievements(stats, settings) {
  const unlocked = new Set(stats.achievements);
  const newOnes  = [];

  function check(id, condition) {
    if (!unlocked.has(id) && condition) { unlocked.add(id); newOnes.push(id); }
  }

  check('first_quiz',     stats.quizzesCompleted >= 1);
  check('quizzes_10',     stats.quizzesCompleted >= 10);
  check('correct_50',     stats.totalCorrect >= 50);
  check('correct_100',    stats.totalCorrect >= 100);
  check('correct_500',    stats.totalCorrect >= 500);
  check('streak_3',       stats.streak.current >= 3);
  check('streak_7',       stats.streak.current >= 7);
  check('streak_30',      stats.streak.current >= 30);

  const lvInfo = getLevelInfo(stats.xp);
  check('level_5',  lvInfo.level >= 5);
  check('level_10', lvInfo.level >= 10);

  if (settings) {
    const isPerfect = settings._correct === settings._total && settings._total > 0;
    check('perfect_score',   isPerfect);
    check('groupid_perfect', isPerfect && settings.quizMode === 'groupid');
    check('hard_mode',       settings.hideGroup && settings._pct >= 90);
    check('all_groups',      settings.groups && settings.groups.length === 3);
    check('random_dir',      settings.direction === 'random');
  }

  return { newAchievements: newOnes, allAchievements: [...unlocked] };
}

// ── Verb Error Tracking ───────────────────────────────────────
// wrongVerbs: array of { kanji, kana, meaning, jlpt }
// Read current counts first, then upsert with count+1 to avoid race-loss
async function trackVerbErrors(wrongVerbs) {
  if (!wrongVerbs || wrongVerbs.length === 0) return;
  const seen = new Set();
  const unique = wrongVerbs.filter(v => { if (seen.has(v.kanji)) return false; seen.add(v.kanji); return true; });

  // Fetch existing counts for these verbs
  const kanjis = unique.map(v => `kanji=eq.${encodeURIComponent(v.kanji)}`).join(',');
  let existing = {};
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/verb_errors?or=(${kanjis})&select=kanji,error_count`,
      { headers: DB_HEADERS }
    );
    const rows = await res.json();
    if (Array.isArray(rows)) rows.forEach(r => { existing[r.kanji] = r.error_count; });
  } catch (e) { console.warn('trackVerbErrors fetch:', e); }

  // Upsert with incremented counts
  const payload = unique.map(v => ({
    kanji:       v.kanji,
    kana:        v.kana,
    meaning:     v.meaning,
    jlpt:        v.jlpt || 'N?',
    error_count: (existing[v.kanji] || 0) + 1,
  }));

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/verb_errors`, {
      method: 'POST',
      headers: { ...DB_HEADERS, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify(payload),
    });
  } catch (e) { console.warn('trackVerbErrors upsert:', e); }
}

async function fetchTopErrors(limit = 5) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/verb_errors?select=kanji,kana,meaning,jlpt,error_count&order=error_count.desc&limit=${limit}`,
      { headers: DB_HEADERS }
    );
    return await res.json();
  } catch (e) { return []; }
}

// ── Main apply function ───────────────────────────────────────
function applyQuizResult(correct, total, settings) {
  const stats = loadStats();

  stats.streak = updateStreak(stats.streak);

  const xpGained    = computeXP(correct, total, stats.streak.current);
  const levelBefore = getLevelInfo(stats.xp).level;
  stats.xp += xpGained;
  const levelAfter  = getLevelInfo(stats.xp).level;

  stats.quizzesCompleted += 1;
  stats.totalCorrect     += correct;
  stats.totalAnswered    += total;

  const enriched = settings
    ? { ...settings, _correct: correct, _total: total, _pct: Math.round((correct / total) * 100) }
    : null;
  const { newAchievements, allAchievements } = checkAchievements(stats, enriched);
  stats.achievements = allAchievements;

  saveStats(stats);
  return { xpGained, levelBefore, levelAfter, newAchievements };
}
