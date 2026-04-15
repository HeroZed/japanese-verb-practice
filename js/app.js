// app.js — Application Logic

// ── State ────────────────────────────────────────────────────
const STATE = {
  view: 'home',          // home | practice-settings | practice | results | vocab
  settings: {
    quizMode: 'groupid',            // 'conjugation' | 'groupid'
    direction: 'plain-to-polite',  // plain-to-polite | polite-to-plain
    groups: [1, 2, 3],
    tenses: ['pres_pos'],          // default: 現在肯定 only
    count: 5,
    hideGroup: false,              // true = 隱藏動詞類別提示
  },
  quiz: {
    questions: [],
    current: 0,
    answers: [],
  },
  vocab: {
    showForm: 'plain',   // plain | polite
    filterGroup: 0,      // 0 = all
    searchText: '',
    expanded: new Set(),
  },
  fontSize: 'medium',    // small | medium | large
  theme: 'dark',         // dark | light
  homeWords: [],         // random words shown on home
};

// ── Utility ──────────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRandom(arr, n) {
  return shuffle([...arr]).slice(0, n);
}

function setView(v) {
  STATE.view = v;
  render();
}

function applyTheme() {
  document.body.classList.toggle('theme-dark',  STATE.theme === 'dark');
  document.body.classList.toggle('theme-light', STATE.theme === 'light');
}

function applyFontSize() {
  document.body.classList.remove('fs-small','fs-medium','fs-large');
  document.body.classList.add('fs-' + STATE.fontSize);
}

function refreshHomeWords() {
  STATE.homeWords = pickRandom(VERB_LIST, 5);
}

// ── Quiz Generation ──────────────────────────────────────────
function buildTenseKey(dir, tense) {
  // dir: 'plain-to-polite' → question is plain form, answer is polite form
  const qPrefix = dir === 'plain-to-polite' ? 'plain_' : 'polite_';
  const aPrefix = dir === 'plain-to-polite' ? 'polite_' : 'plain_';
  return { qKey: qPrefix + tense, aKey: aPrefix + tense };
}

function generateQuestions() {
  const { direction, groups, tenses, count } = STATE.settings;
  const pool = VERB_LIST.filter(v => groups.includes(v.group));

  const allCombos = [];
  pool.forEach(verb => {
    const conj = getConjugations(verb);
    tenses.forEach(tense => {
      const { qKey, aKey } = buildTenseKey(direction, tense);
      allCombos.push({ verb, conj, qKey, aKey });
    });
  });

  if (allCombos.length === 0) return [];

  const selected = pickRandom(allCombos, Math.min(count, allCombos.length));

  return selected.map(({ verb, conj, qKey, aKey }) => ({
    verb,
    qKey,
    aKey,
    question: conj[qKey],
    answer:   conj[aKey],
    userAnswer: '',
  }));
}

function generateGroupQuestions() {
  const { groups, count } = STATE.settings;
  const pool = VERB_LIST.filter(v => groups.includes(v.group));
  return pickRandom(pool, Math.min(count, pool.length)).map(verb => ({
    verb,
    answer: String(verb.group),
    userAnswer: '',
    isGroupMode: true,
  }));
}

// ── Render ────────────────────────────────────────────────────
function render() {
  applyTheme();
  applyFontSize();
  const app = document.getElementById('app');
  app.innerHTML = '';

  switch (STATE.view) {
    case 'home':            app.appendChild(renderHome());            break;
    case 'practice-settings': app.appendChild(renderSettings());     break;
    case 'practice':        app.appendChild(renderPractice());        app.querySelector('.fill-input')?.focus(); break;
    case 'results':         app.appendChild(renderResults());         break;
    case 'vocab':           app.appendChild(renderVocab());           break;
  }
}

// ── Home ─────────────────────────────────────────────────────
function renderHome() {
  const wordCards = STATE.homeWords.map(verb => {
    const conj = getConjugations(verb);
    return `
      <div class="word-card">
        <span class="wc-kanji">${verb.kanji}</span>
        <span class="wc-kana">${verb.kana}</span>
        <span class="wc-meaning">${verb.meaning}</span>
        <span class="wc-polite">${conj.polite_pres_pos.kanji}</span>
        <span class="wc-group">第${['一','二','三'][verb.group-1]}類</span>
        <span class="jlpt-badge jlpt-${verb.jlpt}">${verb.jlpt}</span>
      </div>`;
  }).join('');

  const el = make('div', 'view-home');
  el.innerHTML = `
    <div class="home-topbar">
      <button class="theme-toggle" id="btn-theme" title="切換主題">
        ${STATE.theme === 'dark' ? '☀️' : '🌙'}
      </button>
      <div class="font-size-bar">
        <span class="fs-label">字體：</span>
        <button class="fs-btn ${STATE.fontSize==='small'?'active':''}" data-size="small">小</button>
        <button class="fs-btn ${STATE.fontSize==='medium'?'active':''}" data-size="medium">中</button>
        <button class="fs-btn ${STATE.fontSize==='large'?'active':''}" data-size="large">大</button>
      </div>
    </div>

    <div class="home-hero">
      <div class="home-logo">動</div>
      <h1 class="home-title">日本語動詞練習</h1>
      <p class="home-subtitle">普通體 ⇄ 禮貌體</p>
      <p class="home-desc">收錄 ${VERB_LIST.length} 個常用動詞 · 三類動詞 · 八種活用形</p>
    </div>

    <div class="home-cards">
      <button class="home-card card-practice" id="btn-start">
        <span class="card-icon">✏️</span>
        <span class="card-label">開始練習</span>
        <span class="card-sub">填空練習</span>
      </button>
      <button class="home-card card-vocab" id="btn-vocab">
        <span class="card-icon">📖</span>
        <span class="card-label">單字查看</span>
        <span class="card-sub">瀏覽所有動詞</span>
      </button>
    </div>

    <div class="home-words-section">
      <div class="home-words-header">
        <span class="home-words-title">今日單字</span>
        <button class="btn-refresh" id="btn-refresh-words">↺ 換一批</button>
      </div>
      <div class="home-words-grid" id="home-words-grid">${wordCards}</div>
    </div>
  `;

  el.querySelector('#btn-start').onclick = () => setView('practice-settings');
  el.querySelector('#btn-vocab').onclick  = () => setView('vocab');
  el.querySelector('#btn-theme').onclick  = () => {
    STATE.theme = STATE.theme === 'dark' ? 'light' : 'dark';
    render();
  };
  el.querySelector('#btn-refresh-words').onclick = () => {
    refreshHomeWords();
    render();
  };
  el.querySelectorAll('.fs-btn').forEach(b => {
    b.onclick = () => { STATE.fontSize = b.dataset.size; render(); };
  });
  return el;
}

// ── Practice Settings ─────────────────────────────────────────
function renderSettings() {
  const s = STATE.settings;
  const el = make('div', 'view-settings');

  const tenseOpts = [
    { key:'pres_pos', label:'現在肯定' },
    { key:'pres_neg', label:'現在否定' },
    { key:'past_pos', label:'過去肯定' },
    { key:'past_neg', label:'過去否定' },
  ];

  const isGroupId = s.quizMode === 'groupid';

  el.innerHTML = `
    <div class="page-header">
      <button class="btn-back" id="back-btn">← 返回</button>
      <h2>練習設定</h2>
    </div>

    <div class="settings-card">
      <div class="setting-row">
        <label class="setting-label">練習模式</label>
        <div class="radio-group">
          <label class="radio-opt ${!isGroupId?'active':''}">
            <input type="radio" name="quizMode" value="conjugation" ${!isGroupId?'checked':''}>
            <span>活用形填空</span>
          </label>
          <label class="radio-opt ${isGroupId?'active':''}">
            <input type="radio" name="quizMode" value="groupid" ${isGroupId?'checked':''}>
            <span>辨別動詞類別</span>
          </label>
        </div>
      </div>

      <div class="setting-row ${isGroupId?'hidden':''}" id="row-direction">
        <label class="setting-label">方向</label>
        <div class="radio-group">
          <label class="radio-opt ${s.direction==='plain-to-polite'?'active':''}">
            <input type="radio" name="direction" value="plain-to-polite" ${s.direction==='plain-to-polite'?'checked':''}>
            <span>普通體→禮貌體</span>
          </label>
          <label class="radio-opt ${s.direction==='polite-to-plain'?'active':''}">
            <input type="radio" name="direction" value="polite-to-plain" ${s.direction==='polite-to-plain'?'checked':''}>
            <span>禮貌體→普通體</span>
          </label>
        </div>
      </div>

      <div class="setting-row">
        <label class="setting-label">動詞類別${isGroupId?' <span class="setting-note">（至少選2類）</span>':''}</label>
        <div class="check-group">
          ${[1,2,3].map(g => `
            <label class="check-opt ${s.groups.includes(g)?'active':''}">
              <input type="checkbox" name="group" value="${g}" ${s.groups.includes(g)?'checked':''}>
              <span>第${['一','二','三'][g-1]}類</span>
            </label>
          `).join('')}
        </div>
      </div>

      <div class="setting-row ${isGroupId?'hidden':''}" id="row-tense">
        <label class="setting-label">時態</label>
        <div class="check-group">
          ${tenseOpts.map(t => `
            <label class="check-opt ${s.tenses.includes(t.key)?'active':''}">
              <input type="checkbox" name="tense" value="${t.key}" ${s.tenses.includes(t.key)?'checked':''}>
              <span>${t.label}</span>
            </label>
          `).join('')}
        </div>
      </div>

      <div class="setting-row ${isGroupId?'hidden':''}" id="row-hidegroup">
        <label class="setting-label">進階</label>
        <div class="check-group">
          <label class="check-opt ${s.hideGroup?'active':''}">
            <input type="checkbox" name="hideGroup" ${s.hideGroup?'checked':''}>
            <span>隱藏動詞類別提示（加強難度）</span>
          </label>
        </div>
      </div>

      <div class="setting-row" id="count-row">
        <label class="setting-label">題目數量</label>
        <div class="count-ctrl">
          <button class="count-btn" id="count-dec">−</button>
          <span class="count-val" id="count-val">${s.count}</span>
          <button class="count-btn" id="count-inc">+</button>
        </div>
      </div>
    </div>

    <button class="btn-primary btn-start-quiz" id="start-quiz-btn">開始練習</button>
  `;

  el.querySelector('#back-btn').onclick = () => setView('home');

  // QuizMode radio — re-render to show/hide rows
  el.querySelectorAll('input[name="quizMode"]').forEach(r => {
    r.onchange = () => { s.quizMode = r.value; render(); };
  });

  // Direction radio
  el.querySelectorAll('input[name="direction"]').forEach(r => {
    r.onchange = () => {
      s.direction = r.value;
      el.querySelectorAll('label.radio-opt').forEach(l => {
        if (l.querySelector('input[name="direction"]')) l.classList.remove('active');
      });
      r.closest('label').classList.add('active');
    };
  });

  // Group checkboxes
  el.querySelectorAll('input[name="group"]').forEach(cb => {
    cb.onchange = () => {
      const val = parseInt(cb.value);
      if (cb.checked) { if (!s.groups.includes(val)) s.groups.push(val); }
      else s.groups = s.groups.filter(g => g !== val);
      cb.closest('label').classList.toggle('active', cb.checked);
    };
  });

  // Tense checkboxes
  el.querySelectorAll('input[name="tense"]').forEach(cb => {
    cb.onchange = () => {
      if (cb.checked) { if (!s.tenses.includes(cb.value)) s.tenses.push(cb.value); }
      else s.tenses = s.tenses.filter(t => t !== cb.value);
      cb.closest('label').classList.toggle('active', cb.checked);
    };
  });

  // hideGroup checkbox
  el.querySelector('input[name="hideGroup"]').onchange = (e) => {
    s.hideGroup = e.target.checked;
    e.target.closest('label').classList.toggle('active', s.hideGroup);
  };

  // Count control
  el.querySelector('#count-dec').onclick = () => {
    if (s.count > 1) { s.count--; el.querySelector('#count-val').textContent = s.count; }
  };
  el.querySelector('#count-inc').onclick = () => {
    if (s.count < 100) { s.count++; el.querySelector('#count-val').textContent = s.count; }
  };

  el.querySelector('#start-quiz-btn').onclick = () => {
    if (s.quizMode === 'groupid') {
      if (s.groups.length < 2) { alert('辨別動詞類別模式必須至少選擇 2 種類別'); return; }
      STATE.quiz.questions = generateGroupQuestions();
    } else {
      if (s.groups.length === 0) { alert('請至少選擇一種動詞類別'); return; }
      if (s.tenses.length === 0) { alert('請至少選擇一種時態'); return; }
      STATE.quiz.questions = generateQuestions();
    }
    STATE.quiz.current = 0;
    if (STATE.quiz.questions.length === 0) { alert('符合條件的題目不足，請調整設定'); return; }
    setView('practice');
  };

  return el;
}

// ── Practice ──────────────────────────────────────────────────
function renderPractice() {
  const { questions, current } = STATE.quiz;
  const q = questions[current];
  const total = questions.length;
  const progress = Math.round((current / total) * 100);
  const isGroupId = !!q.isGroupMode;

  const titleLabel = isGroupId
    ? '辨別動詞類別'
    : (STATE.settings.direction === 'plain-to-polite' ? '普通體 → 禮貌體' : '禮貌體 → 普通體');

  const cardBody = isGroupId ? renderGroupIdCard(q) : renderConjCard(q);

  const el = make('div', 'view-practice');
  el.innerHTML = `
    <div class="page-header">
      <button class="btn-back" id="back-btn">← 返回</button>
      <h2>${titleLabel}</h2>
    </div>
    <div class="progress-wrap">
      <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
      <span class="progress-text">${current + 1} / ${total}</span>
    </div>
    <div class="question-card">${cardBody}</div>
    <div class="practice-nav">
      ${current > 0 ? '<button class="btn-secondary" id="btn-prev">← 上一題</button>' : '<span></span>'}
      <button class="btn-primary" id="btn-next">${current === total - 1 ? '提交批改' : '下一題 →'}</button>
    </div>
  `;

  el.querySelector('#back-btn').onclick = () => {
    if (confirm('確定要放棄練習嗎？')) setView('home');
  };

  if (current > 0) {
    el.querySelector('#btn-prev').onclick = () => { STATE.quiz.current--; render(); };
  }

  el.querySelector('#btn-next').onclick = () => {
    if (isGroupId) {
      const sel = el.querySelector('.gid-btn.selected');
      q.userAnswer = sel ? sel.dataset.group : '';
    } else {
      const inp = el.querySelector('.fill-input');
      q.userAnswer = inp ? inp.value.trim() : '';
    }
    if (current === total - 1) setView('results');
    else { STATE.quiz.current++; render(); }
  };

  // Restore saved answer
  if (q.userAnswer) {
    if (isGroupId) {
      const btn = el.querySelector(`.gid-btn[data-group="${q.userAnswer}"]`);
      if (btn) btn.classList.add('selected');
    } else {
      const inp = el.querySelector('.fill-input');
      if (inp) inp.value = q.userAnswer;
    }
  }

  // Group-id buttons — click to select
  el.querySelectorAll('.gid-btn').forEach(btn => {
    btn.onclick = () => {
      el.querySelectorAll('.gid-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    };
  });

  // Enter to advance (fill mode only)
  if (!isGroupId) {
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') el.querySelector('#btn-next').click();
    });
  }

  return el;
}

function renderConjCard(q) {
  return `
    <div class="q-meta">
      ${STATE.settings.hideGroup ? '' : `<span class="q-group">${GROUP_NAMES[q.verb.group]}</span>`}
      <span class="q-form-label">${FORM_LABELS[q.qKey].zh}</span>
      <span class="jlpt-badge jlpt-${q.verb.jlpt}">${q.verb.jlpt}</span>
    </div>
    <div class="q-verb-kanji">${q.question.kanji}</div>
    <div class="q-verb-kana">${q.question.kana}</div>
    <div class="q-meaning">${q.verb.meaning}</div>
    <div class="q-arrow">↓</div>
    <div class="q-ask">「${FORM_LABELS[q.aKey].zh}」は？</div>
    <div class="q-answer-area">${renderFillIn()}</div>
  `;
}

function renderGroupIdCard(q) {
  const groups = STATE.settings.groups;
  const labels = { 1:'第一類', 2:'第二類', 3:'第三類' };
  const btns = groups.map(g =>
    `<button class="gid-btn" data-group="${g}">${labels[g]}<small>（${['五段動詞','一段動詞','不規則動詞'][g-1]}）</small></button>`
  ).join('');
  return `
    <div class="q-meta"><span class="q-form-label">辨別第幾類動詞</span><span class="jlpt-badge jlpt-${q.verb.jlpt}">${q.verb.jlpt}</span></div>
    <div class="q-verb-kanji">${q.verb.kanji}</div>
    <div class="q-verb-kana">${q.verb.kana}</div>
    <div class="q-meaning">${q.verb.meaning}</div>
    <div class="q-ask" style="margin-top:12px">這個動詞屬於第幾類？</div>
    <div class="gid-btns">${btns}</div>
  `;
}

function renderFillIn() {
  return `<div class="fill-area">
    <input type="text" class="fill-input" placeholder="輸入平假名或漢字" autocomplete="off" autocorrect="off" spellcheck="false">
  </div>`;
}

// ── Results ───────────────────────────────────────────────────
function renderResults() {
  const { questions } = STATE.quiz;
  const total = questions.length;

  const isGroupId = questions[0]?.isGroupMode;
  const GROUP_LABEL = { '1':'第一類', '2':'第二類', '3':'第三類' };

  let correct = 0;
  const rows = questions.map((q, i) => {
    let expected, got, isOk, verbCell, dirCell, resultCell;

    if (isGroupId) {
      expected = String(q.answer);
      got = q.userAnswer;
      isOk = got === expected;
      if (isOk) correct++;
      verbCell  = `${q.verb.kanji}<br><small>${q.verb.kana}</small><br><small style="color:var(--ink-soft)">${q.verb.meaning}</small><br><span class="jlpt-badge jlpt-${q.verb.jlpt}">${q.verb.jlpt}</span>`;
      dirCell   = `<small>辨別類別</small>`;
      resultCell = isOk ? '✔' : `<span class="correct-ans">${GROUP_LABEL[expected]}</span>`;
    } else {
      expected = q.answer.kanji;
      got = q.userAnswer.trim();
      isOk = got === expected || got === q.answer.kana;
      if (isOk) correct++;
      verbCell  = `${q.question.kanji}<br><small>${q.question.kana}</small><br><small style="color:var(--ink-soft)">${q.verb.meaning}</small><br><span class="jlpt-badge jlpt-${q.verb.jlpt}">${q.verb.jlpt}</span>`;
      dirCell   = `<small>${FORM_LABELS[q.qKey].zh}→${FORM_LABELS[q.aKey].zh}</small>`;
      resultCell = isOk ? '✔' : `<span class="correct-ans">${expected}</span><br><small>${q.answer.kana}</small>`;
    }

    return `<tr class="${isOk ? 'row-ok' : 'row-err'}">
      <td>${i + 1}</td>
      <td>${verbCell}</td>
      <td>${dirCell}</td>
      <td>${(isGroupId ? GROUP_LABEL[got] : got) || '<em>（未作答）</em>'}</td>
      <td>${resultCell}</td>
    </tr>`;
  });

  const pct = Math.round((correct / total) * 100);
  let grade = '', gradeClass = '';
  if (pct >= 90) { grade = '優秀！'; gradeClass = 'grade-a'; }
  else if (pct >= 70) { grade = '不錯！'; gradeClass = 'grade-b'; }
  else if (pct >= 50) { grade = '繼續加油！'; gradeClass = 'grade-c'; }
  else { grade = '多加練習！'; gradeClass = 'grade-d'; }

  const el = make('div', 'view-results');
  el.innerHTML = `
    <div class="page-header">
      <h2>練習結果</h2>
    </div>
    <div class="score-card">
      <div class="score-circle ${gradeClass}">
        <span class="score-num">${correct}/${total}</span>
        <span class="score-pct">${pct}%</span>
      </div>
      <div class="score-grade ${gradeClass}">${grade}</div>
    </div>
    <div class="results-table-wrap">
      <table class="results-table">
        <thead>
          <tr><th>#</th><th>題目</th><th>方向</th><th>你的答案</th><th>結果</th></tr>
        </thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>
    <div class="results-actions">
      <button class="btn-secondary" id="btn-retry">再練一次</button>
      <button class="btn-primary" id="btn-home">回首頁</button>
    </div>
  `;

  el.querySelector('#btn-retry').onclick = () => {
    STATE.quiz.questions = STATE.settings.quizMode === 'groupid'
      ? generateGroupQuestions()
      : generateQuestions();
    STATE.quiz.current = 0;
    setView('practice');
  };
  el.querySelector('#btn-home').onclick = () => setView('home');
  return el;
}

// ── Vocabulary ────────────────────────────────────────────────
function renderVocab() {
  const v = STATE.vocab;
  const el = make('div', 'view-vocab');

  const filtered = VERB_LIST.filter(verb => {
    if (v.filterGroup && verb.group !== v.filterGroup) return false;
    if (v.searchText) {
      const s = v.searchText.toLowerCase();
      return verb.kanji.includes(s) || verb.kana.includes(s) || verb.meaning.includes(s);
    }
    return true;
  });

  const listItems = filtered.map(verb => {
    const conj = getConjugations(verb);
    const expanded = v.expanded.has(verb.kana + verb.kanji);

    // What to show as primary (based on showForm)
    const primaryForms  = v.showForm === 'plain'  ? PLAIN_FORMS  : POLITE_FORMS;
    const secondaryForms = v.showForm === 'plain' ? POLITE_FORMS : PLAIN_FORMS;
    const primaryLabel  = v.showForm === 'plain'  ? '普通體' : '禮貌體';
    const secondLabel   = v.showForm === 'plain'  ? '禮貌體' : '普通體';

    const primaryDisplay = conj[primaryForms[0]].kanji; // dictionary or ます form

    const expandContent = expanded ? `
      <div class="vocab-expand">
        <div class="expand-section">
          <div class="expand-title">${primaryLabel}</div>
          ${primaryForms.map(f => `
            <div class="conj-row">
              <span class="conj-label">${FORM_LABELS[f].zh}</span>
              <span class="conj-form">${conj[f].kanji}</span>
              <span class="conj-kana">${conj[f].kana}</span>
            </div>
          `).join('')}
        </div>
        <div class="expand-section">
          <div class="expand-title">${secondLabel}</div>
          ${secondaryForms.map(f => `
            <div class="conj-row">
              <span class="conj-label">${FORM_LABELS[f].zh}</span>
              <span class="conj-form">${conj[f].kanji}</span>
              <span class="conj-kana">${conj[f].kana}</span>
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    return `
      <div class="vocab-item ${expanded ? 'expanded' : ''}" data-id="${verb.kana + verb.kanji}">
        <div class="vocab-main">
          <div class="vocab-left">
            <span class="vocab-kanji">${primaryDisplay}</span>
            <span class="vocab-kana">${conj[primaryForms[0]].kana}</span>
          </div>
          <div class="vocab-center">
            <span class="vocab-base">${verb.kanji}（${verb.kana}）</span>
            <span class="vocab-meaning">${verb.meaning}</span>
          </div>
          <div class="vocab-right">
            <span class="vocab-group">第${['一','二','三'][verb.group-1]}類</span>
            <span class="jlpt-badge jlpt-${verb.jlpt}">${verb.jlpt}</span>
            <span class="vocab-expand-btn">${expanded ? '▲' : '▼'}</span>
          </div>
        </div>
        ${expandContent}
      </div>
    `;
  }).join('');

  el.innerHTML = `
    <div class="page-header">
      <button class="btn-back" id="back-btn">← 返回</button>
      <h2>單字查看</h2>
    </div>

    <div class="vocab-controls">
      <div class="vocab-toggle-wrap">
        <button class="toggle-btn ${v.showForm==='plain'?'active':''}" id="toggle-plain">普通體</button>
        <button class="toggle-btn ${v.showForm==='polite'?'active':''}" id="toggle-polite">禮貌體</button>
      </div>
      <div class="vocab-filter-wrap">
        <select class="vocab-group-sel" id="group-sel">
          <option value="0" ${v.filterGroup===0?'selected':''}>全部類別</option>
          <option value="1" ${v.filterGroup===1?'selected':''}>第一類</option>
          <option value="2" ${v.filterGroup===2?'selected':''}>第二類</option>
          <option value="3" ${v.filterGroup===3?'selected':''}>第三類</option>
        </select>
        <input type="text" class="vocab-search" id="vocab-search" placeholder="搜尋單字..." value="${v.searchText}">
      </div>
      <div class="vocab-count">${filtered.length} 個動詞</div>
    </div>

    <div class="vocab-list" id="vocab-list">${listItems}</div>
  `;

  el.querySelector('#back-btn').onclick = () => setView('home');

  el.querySelector('#toggle-plain').onclick = () => {
    v.showForm = 'plain'; render();
  };
  el.querySelector('#toggle-polite').onclick = () => {
    v.showForm = 'polite'; render();
  };

  el.querySelector('#group-sel').onchange = (e) => {
    v.filterGroup = parseInt(e.target.value); render();
  };

  el.querySelector('#vocab-search').oninput = (e) => {
    v.searchText = e.target.value; render();
  };

  el.querySelectorAll('.vocab-item').forEach(item => {
    item.querySelector('.vocab-main').onclick = () => {
      const id = item.dataset.id;
      if (v.expanded.has(id)) v.expanded.delete(id);
      else v.expanded.add(id);
      render();
    };
  });

  return el;
}

// ── Helper ────────────────────────────────────────────────────
function make(tag, cls) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  return el;
}

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  refreshHomeWords();
  render();
});
