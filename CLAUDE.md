# japanese-verb-practice — CLAUDE.md

## 專案概覽
純前端日語動詞練習網站，部署於 GitHub Pages。
Repo: https://github.com/HeroZed/japanese-verb-practice
Live: https://herozed.github.io/japanese-verb-practice/

## 技術棧
- 純 HTML + CSS + 原生 JS（無框架、無建置工具）
- 後端：Supabase（anon key 已直接寫在 `gamification.js`，這是刻意設計，無需隱藏）
- 部署：GitHub Actions → GitHub Pages（`.github/workflows/static.yml`）

## 檔案結構
```
index.html          — 進入點，載入四支 JS
css/styles.css      — 所有樣式（含主題、RWD）
js/verbs.js         — 動詞資料庫 (VERB_LIST / VERBS)
js/conjugation.js   — 活用形計算邏輯 (getConjugations, PLAIN_FORMS, POLITE_FORMS, FORM_LABELS)
js/gamification.js  — XP/等級/連擊/成就/Supabase 讀寫
js/app.js           — UI 渲染、STATE、所有 View
```

## 核心資料結構

### 動詞（verbs.js）
```js
{ kanji, kana, meaning, group, jlpt, options? }
// group: 1=五段, 2=一段, 3=不規則
// options.irregular_ta: true → 行く類（た形用った）
```

### STATE（app.js）
```js
STATE = {
  view: 'home' | 'practice-settings' | 'practice' | 'results' | 'vocab',
  settings: { quizMode, direction, groups, tenses, count, hideGroup },
  quiz:  { questions, current, answers },
  vocab: { showForm, filterGroup, searchText, expanded: Set },
  fontSize, theme, homeWords
}
```

### 活用形 keys
```
PLAIN_FORMS  = ['plain_pres_pos', 'plain_pres_neg', 'plain_past_pos', 'plain_past_neg']
POLITE_FORMS = ['polite_pres_pos','polite_pres_neg','polite_past_pos','polite_past_neg']
```

## Supabase 資料表
| 資料表 | 用途 | 主要欄位 |
|--------|------|----------|
| `verb_stats` | 每位使用者的 XP / 連擊 / 成就 | name (PK), xp, quizzes_completed, total_correct, streak_current/longest/last_date, achievements (jsonb) |
| `verb_errors` | 全使用者的答錯統計 | kanji (PK), kana, meaning, jlpt, error_count |

- 使用者以名稱（localStorage `jpVerb_user`）識別，無帳號系統
- 所有 DB 操作 fire-and-forget，網路失敗不影響 UI

## UI 架構
- 單頁 SPA，`render()` 根據 `STATE.view` 切換整個 `#app`
- `make(tag, cls)` 是建立 DOM 元素的 utility
- Home 頁非同步載入排行榜（`loadRankingInto`）和常錯單字（`loadTopErrorsInto`）
- 單字卡展開：`STATE.vocab.expanded`（Set）控制，`refreshVocabList()` 局部重繪
- 常錯單字展開：`topErrorsExpanded`（module-level Set）控制，`renderTopErrorRows()` 重繪

## 展開卡片統一結構
展開式卡片都使用相同的 CSS class：
```html
<div class="vocab-item [expanded]" data-id="...">
  <div class="vocab-main">  <!-- 點擊區域 -->
    ...內容...
    <span class="vocab-expand-btn">▼/▲</span>
  </div>
  <div class="vocab-expand">  <!-- 展開內容，含普通體/禮貌體兩欄 -->
    <div class="expand-section">...</div>
    <div class="expand-section">...</div>
  </div>
</div>
```

## 主題與字體
- 主題：`STATE.theme` = `dark` | `light`，body 加 `theme-dark` / `theme-light`
- 字體大小：`STATE.fontSize` = `small` | `medium` | `large`，body 加 `fs-*`
- CSS 用 `var(--變數)` 管理顏色，主題切換只換 class

## 自動部署
每次修改完畢 Claude 停止後，hook 會自動執行：
```
git add -A && git commit -m "auto: update" && git push origin main
```
設定於 `.claude/settings.json`（Stop hook）。

## 注意事項
- 沒有 `node_modules`，不需要 `npm install`
- 不要加 TypeScript / bundler / 框架，維持純 JS
- Supabase anon key 公開是刻意的，不需要移到 .env
- 新增 View 需同時更新 `STATE.view` 型別註解、`render()` 的 switch、以及對應的 `renderXxx()` 函式
