# 概念題庫規格

把國小各科的學習概念整理成一份共用題庫，融入學習挑戰群島。孩子在不同島碰到同一個概念，熟悉度會一起累計。取代原本獨立的「學科島」。

> 版本：2026-11-10 初版。決策紀錄在第 9 節。
>
> **進度**：第 1、2 階段完成，第 5 階段進行中（逐年級補題）。
> - 二年級五科 50 個概念（國語 10、英語 9、自然 8、社會 8 個各 12 題；數學 15 個，其中 13 個程式出題、2 個各 12 題）。
> - 三年級五科 54 個概念（國語 10、英語 9、自然 8、社會 8 個各 12 題；數學 19 個，其中 17 個程式出題、2 個各 12 題）。
> - 四年級五科 53 個概念（國語 10、英語 9、自然 8、社會 8 個各 12 題；數學 18 個，其中 17 個程式出題、1 個 12 題）。
> - 五年級五科 53 個概念（國語 10、英語 9、自然 8、社會 8 個各 12 題；數學 18 個，其中 17 個程式出題、1 個 12 題）。
> - 六年級仍是示範份量，待補。家長可在「題庫預覽」分頁審題。

---

## 1. 目標與範圍

- **年級**：二到六年級。先補齊**二年級**（孩子目前的年級），再往三年級以上擴充。
- **科目**：國語、數學、英語、自然、社會。
  - 108 課綱一、二年級沒有自然和社會，相關內容在「生活」課。二年級的「自然」「社會」概念取自生活課的對應主題，三年級起接正式的自然科、社會科。
  - 英語在課綱是三年級開始，但許多縣市一年級就有英語。二年級先放字母、自然發音和基本單字。
- **題目來源**：開發時由 Claude 撰寫原創題目，家長在預覽頁瀏覽、標記不好的題目後修正。App 執行時不呼叫 AI。數學以程式即時出題為主。
- **不做**：課本課次對應、家長自訂生字本（決策 D4）。不收錄任何教科書、習作、評量的原文。

## 2. 概念的組織

```
科目 → 年級 → 概念
```

概念 id 格式：`<subject>.g<grade>.<slug>`，例如：

| id | 名稱 |
|---|---|
| `chinese.g2.radical` | 認識部首 |
| `math.g2.multiplication-table` | 九九乘法 |
| `science.g2.plant-growth` | 植物怎麼長大（生活） |
| `social.g2.community` | 我的社區（生活） |
| `english.g2.phonics-short-vowel` | 短母音發音 |

每個概念的欄位：

```ts
interface Concept {
  id: string;                 // math.g2.multiplication-table
  subject: 'chinese' | 'math' | 'english' | 'science' | 'social';
  grade: 2 | 3 | 4 | 5 | 6;
  title: string;              // 九九乘法
  summary: string;            // 一兩句話說明這個概念，練習前顯示
  curriculumCodes?: string[]; // 108 課綱學習表現代碼，例如 n-I-4
  prerequisites?: string[];   // 先備概念 id，用來畫群島上的「概念連線」
  source: { kind: 'static' } | { kind: 'generator'; generatorId: string };
  questions?: Question[];     // source 是 static 時才有
}
```

## 3. 題目格式

延續學科島原本的欄位命名，原本的 200 題可以直接搬入。

```ts
type Question =
  | { type: 'choice'; q: string; a: string; w: string[]; h?: string[]; e?: string } // 選擇：a 正解、w 誘答
  | { type: 'input';  q: string; a: string | string[]; h?: string[]; e?: string }  // 填答：a 可以有多個可接受答案
  | { type: 'order';  q: string; a: string[]; h?: string[]; e?: string }           // 排序：a 是正確順序
  | { type: 'tf';     q: string; a: boolean; h?: string[]; e?: string };           // 是非
// h：提示（由淺到深），e：解析（答完後顯示）
```

- 每題都要有解析 `e`。提示 `h` 至少一則。
- 選擇題固定 1 個正解、3 個誘答，誘答要是孩子真的會犯的錯，不要湊數。
- 題目文字用臺灣用語、正體字，數學單位用課本慣用寫法（公分、公尺、元）。

## 4. 數學程式出題

`src/features/learning/engines/questionGenerators/` 已有分數、因倍數、周長、面積、體積、一元一次方程式、多項式。做法：

- 新增轉接層，把產生器的輸出轉成第 3 節的 `Question`。
- 二年級需要新寫的產生器：千以內的數、二位數加減（含進退位）、九九乘法、長度（公分／公尺）、時刻與時間、錢幣。
- 每個產生器都要有單元測試（沿用現有 `*.test.ts` 的寫法）。

## 5. 檔案配置

```
src/features/concepts/
  types.ts                 // Concept、Question
  content/
    <科目>/g<年級>.json     // 每科每年級一個檔，例如 chinese/g2.json
  generators/
    index.ts               // 轉接層：舊產生器 → Question
    shared.ts              // 各年級共用：組選擇題、隨機數、一位小數
    grade2.ts              // 二年級：千以內的數、加減、九九、長度、時間、錢幣
    grade3.ts              // 三年級：萬以內的數、四位數加減、乘除、分數、小數、單位換算、時間、應用題
    grade4.ts              // 四年級：大數、概數、多位數乘除、四則運算、帶分數、二位小數、角度、面積單位、時間
    grade5.ts              // 五年級：因倍數、約分通分、異分母加減、分數乘法、小數乘除、多邊形面積、體積容積、百分率
  loadConcepts.ts          // 依「科目＋年級」動態 import，用到才下載
  useConceptProgress.ts    // 讀寫進度
  pickReview.ts            // 每日複習挑題
  ConceptQuiz.tsx          // 共用作答元件（概念站、每日複習、守門怪、冒險都用它）
  ConceptStation.tsx       // 島上的概念站
  ConceptPreview.tsx       // 家長的題庫預覽與標記
```

題庫 JSON 用 `import.meta.glob` 動態載入，每科每年級各自打包，孩子只下載正在看的年級（二年級一科約 3～9 KB gzip）。題目存在前端，資料庫只記熟悉度，題目變多不影響資料庫大小。

## 6. 進度資料（Supabase）

新增資料表 `concept_progress`，作法比照英文書港的 `word_progress`：

```sql
CREATE TABLE IF NOT EXISTS concept_progress (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL,
  level SMALLINT NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 4), -- 0 新 1 學習中 2 複習中 3 熟悉 4 精熟
  due_on DATE NOT NULL DEFAULT CURRENT_DATE,                        -- 下次該複習的日期（台北日期）
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  recent_wrong JSONB NOT NULL DEFAULT '[]',                          -- 最近答錯的題目（最多 10 題），複習時優先出
  last_seen_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, concept_id)
);
```

- RLS 與 `word_progress` 相同：同家庭可讀，本人或同家庭家長可寫。
- **升降級規則**：一輪（約 5 題）正確率 ≥ 80% 升一級；< 50% 降一級。下次複習間隔依等級：當天、1 天、3 天、7 天、21 天。
- 所有出題位置都寫入同一張表，所以熟悉度跨島累計。
- 家長在 Supabase SQL Editor 執行一次 `supabase/add_concept_progress.sql`。

## 7. 概念出現在群島的位置

| 位置 | 玩法 | 出題範圍 |
|---|---|---|
| **各科島的概念站** | 島上一棟「概念站」，依年級列出概念與熟悉度星星，選一個練一輪 | 該科全部概念 |
| **每日任務廣場：今日複習** | 每天 5 題，跨科混合，完成得星幣 | `due_on` 已到期的概念優先，不足時補「學習中」的概念 |
| **怪獸塔守門怪** | 挑戰清單新增「答題挑戰」，和打怪獸、記憶配對、時機點擊輪流出現；答對 3 題打倒守門怪 | 孩子年級的已學概念 |
| **世界島冒險** | 派出的角色途中遇到題目，答對帶回較多資源 | 同上 |

**島嶼調整**：

- 新增「自然實驗森林」與「社會時光港」兩座島，與英文書港、成語古城、數學各島並列。
- 原本的「學科島」移除，它的 200 題搬入題庫。
- 概念的先備關係（`prerequisites`）跨島時，畫成群島上的連線，取代目前 `model.ts` 手寫的 `FLOWS`。

**孩子的年級**：守門怪、冒險、每日複習需要知道孩子幾年級。`profiles.grade` 欄位由家長在「管理孩子」頁設定。因為 `profiles` 只允許改自己的資料、小孩沒有自己的登入帳號，設定是透過 `set_child_grade` 函式（檢查呼叫者是同家庭的家長）。孩子可以在概念站往前、往後年級練習；沒設定年級時，概念站預設顯示最低一個有題目的年級。

## 8. 階段

| 階段 | 內容 | 完成標準 |
|---|---|---|
| **1 基礎** | 型別與題庫載入、`concept_progress` 資料表與 hook、共用作答元件、各島概念站（含兩座新島）、搬入學科島 200 題、數學產生器轉接、孩子年級欄位 | 孩子在任一島的概念站練習，換裝置後熟悉度還在 |
| **2 二年級題目** | 二年級五科概念與題目、新的二年級數學產生器、家長預覽頁 | 二年級每科至少 8 個概念，每個 12 題以上 |
| **3 每日複習＋守門怪** | 任務廣場「今日複習」、怪獸塔答題挑戰 | 每天有 5 題；守門怪會出題 |
| **4 世界島冒險** | 冒險途中答題 | 派遣冒險時會遇到題目 |
| **5 擴充年級** | 三年級→六年級逐年補題、家長的概念熟悉度報表 | 每個年級達到第 2 階段的份量 |

## 9. 決策紀錄

| # | 決策 | 日期 |
|---|---|---|
| D1 | 不做獨立學科島；概念融入群島各島與玩法 | 2026-11-10 |
| D2 | 出現位置：概念站、每日複習、怪獸塔守門怪、世界島冒險，全部要做 | 2026-11-10 |
| D3 | 自然、社會各新增一座島 | 2026-11-10 |
| D4 | 不做「我的生字本」；國語只做共通概念 | 2026-11-10 |
| D5 | 先補齊二年級；二年級的自然、社會取自生活課主題 | 2026-11-10 |
| D6 | 題目由 Claude 開發時撰寫、家長預覽標記；App 不在執行時呼叫 AI | 2026-11-10 |
| D7 | 進度依概念記錄，存在 Supabase `concept_progress` | 2026-11-10 |
| D8 | 題庫改成每科每年級一個檔，擴充題目不增加孩子的下載量 | 2026-11-10 |
| D9 | 家長預覽頁的標記存在瀏覽器，用「複製標記清單」回報，不另建資料表 | 2026-11-10 |
