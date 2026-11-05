# ICPC Power Ranking

以隊名為 key，彙整多場 DOMjudge 成績，建立持續更新的競程隊伍戰力榜。

React + TypeScript + Vite，純靜態部署。沒有 API server、Elysia、資料庫、環境變數或第三方帳號依賴；Vercel 使用一般 Vite 專案設定即可。

## 開發

建議 Node.js 22+；使用 Bun 執行測試和選用的匯入腳本。

```sh
npm ci
npm run dev
```

```sh
bun test
npm run build
npm run preview
```

依賴使用 `package-lock.json` 鎖定。也可用 `bun install` 和 `bun run dev` 開發；請避免同時維護互相衝突的 lockfile。

## 已收錄比賽

| 比賽                                                                                                 | 日期       | 隊數 | 題數 | 狀態 |
| ---------------------------------------------------------------------------------------------------- | ---------- | ---- | ---- | ---- |
| [NCPC 2026 決賽](https://ncpc.ntnu.edu.tw/ncpc2026php/NCPC_scorboard/ncpc2026_scoreboard_final.html) | 2026-10-19 | 114  | 14   | 最終 |
| [TOPC 2026](https://web.archive.org/web/20260919040206/https://judge.icpc.tw/public)                 | 2026-09-19 | 178  | 12   | 最終 |

TOPC 採用指定的 Wayback 快照；雖然來源頁面仍顯示 preliminary，依專案擁有者指定視為最終成績。保留完整 178 隊、逐題 AC / 嘗試次數 / 時間，AC 總數為 635；每題 AC 數和所有隊伍的 20 分鐘罰時均已核對。學校英譯統一為中文，不自行合併標點或拼法不同的隊名。

## 匯入與持續更新

1. 開啟網站的「匯入記分板」，選擇完整 DOMjudge HTML、單場 Contest JSON，或完整 `rankings.json`。
2. 在預覽確認隊名、國別、比賽 ID、日期與賽站名稱。
3. 相同 ID 會取代該場比賽，避免重複計分。不同賽站或不同屆比賽請使用不同 ID。
4. 匯出 `rankings.json`，取代 `src/data/rankings.json`，提交並推送到 Git。
5. Vercel 重新部署後，所有訪客就會看到新的正式資料。

匯入、國別、別名與參數修改只會存成目前瀏覽器的 localStorage 草稿，不會自動寫回 Git 或發布。草稿頁面會顯示提示；正式資料改版時，也會提醒本機草稿來自舊版。清除瀏覽器資料前，務必匯出備份。「回到正式資料」可清除草稿。多人後台或雲端自動發布需要另加儲存與認證，這版刻意保持靜態架構。

瀏覽器無法繞過來源網站 CORS，因此使用下載後的 HTML 或貼上完整原始碼，不提供不可靠的跨域 URL 抓取。上傳的 HTML 只經 parse5 解析，永不插入 DOM 或執行其中腳本。不同 DOMjudge 版本如果解析不完整，會報錯，請改用標準 JSON。

可選的 CLI 匯入方式：

```sh
bun run import-scoreboard ./topc.html \
  --id topc-2026 --name 'TOPC 2026' \
  --date 2026-09-19 --site '台灣 · TOPC' \
  --status final \
  --source 'https://web.archive.org/web/20260919040206/https://judge.icpc.tw/public'
```

腳本在驗證成功後才以原子方式取代 JSON。可用 `--output` 指向另一份既有資料。網址只作為來源註記，不會透過網路抓取。

## 部署到 Vercel

將此目錄推送至自己的 Git repository，在 Vercel Import Project 選擇該 repository：

| 設定                  | 值              |
| --------------------- | --------------- |
| Framework             | Vite            |
| Install command       | `npm ci`        |
| Build command         | `npm run build` |
| Output directory      | `dist`          |
| Environment variables | 不需要          |

`vercel.json` 已設定 framework、build 與輸出目錄。此版沒有伺服器端功能，不依賴本機可寫磁碟。本次只完成本機專案與部署設定，未建立 Vercel deployment。

## 評分模型 v1.2：賽場表現優先

隊伍戰力為 0–100 分，預設 **65% 賽場表現 + 20% 跨站穩定度 + 15% 站點難度**。介面可調整前兩項，難度取剩餘比例。Dirty 不再是獨立得分項，只用於同題數隊伍的微調。

### 1. 賽場表現與 Dirty

依每場解題數降序、罰時升序比較全部隊伍（包含外國隊），同分同罰時採平均位置。位置從 0 開始。

```text
P₀ = 1 - ICPC 平均位置 / (N - 1)
D = 曾答錯才 AC 的題數 / AC 題數
H = 解題數更多的隊數
M = 同解題數隊數
P_D = 1 - [H + (M - 1) × D] / (N - 1)
P = 0.9 × P₀ + 0.1 × P_D
Q = P²
```

P₀ 與 P_D 都位於相同題數群組的名次區間，故 **同場多解題必定有更高 Q**；dirty 僅在同題數時占微調比例 10%，罰時名次仍占 90%。同題數只有一隊時直接採 P₀，不受 dirty 影響。單隊比賽 P = 0.5，零解 Q = 0。

D 只計 AC 題的嘗試次數，未解題的錯誤不計。零解或 AC 嘗試次數缺漏時顯示未知，微調暫用 D = 0.5；不視為零失誤。表格 Dirty 總覽仍按已知 AC 題數加權。

### 2. 多站穩定度

同站先平均各場 Q，再讓各站等權；同站重複參賽不增加站數或該站票數。賽站名稱依 NFKC、空白與英文大小寫正規化，同站跨屆請用相同名稱。

```text
Q_s = mean(同站各場 Q)
Performance = mean_s(Q_s)
Stable = 多站時 max(0, mean_s(Q_s) - population_std_s(Q_s))，單站時為 0
```

只有一站時顯示「待驗證」。兩站時 Stable 等於較弱一站的 Q_s。未參賽的站不視為敗場。

### 3. 站點難度

每場 `difficulty` 可設 0.5–2，中性為 1；留空 `null` 為未校準，計分暫用 1。係數需依題目、共同參賽隊伍等資料人工校準，不由參賽規模猜測難度。

```text
Difficulty = mean_站(mean_場[Q × difficulty / 2])
```

同樣表現在難站取得較高難度分；零解不因參加難站而得分。匯入、編輯與 CLI 的 `--difficulty` 皆支援此欄位。

### 4. 綜合戰力

```text
α = settings.performanceWeight / 100，預設 0.65
β = settings.stabilityWeight / 100，預設 0.20
γ = 1 - α - β，預設 0.15
戰力 = 100 × [α × Performance + β × Stable + γ × Difficulty]
```

隊伍明細顯示各項貢獻、原始名次百分位、微調後百分位與逐場資料。資料條仍為 `min(站數 / 3, 1) × dirty 資料完整場次 / 總場次`，是資料覆蓋指標，不是機率。

日期僅用於紀錄及最新隊伍資訊判定，不做時間衰減。

### 亞太決賽晉級看好名單

依完整台灣戰力榜由高至低選出 **10 隊，每校最多 2 隊**，超過校額就遞補下一隊。不足時顯示實際隊數，不重複湊額；無學校資料者待確認後才納入。搜尋與國別／學校篩選不改變這份名單，所有隊伍仍保留原排行。

標記「高機率晉級亞太決賽」代表此模型看好的隊伍，不是經歷史資料校準的機率，也不是官方資格判定。

### 學校戰力指數排名

僅收錄有學校資料的台灣隊伍，按學校分組，取每校最強六隊，依 **70% 平均戰力 + 20% 最高戰力 + 10% 最低戰力** 計算學校指數，兼顧整體深度、頂尖表現與主力下限。不足六隊時按現有隊伍計算並標示資料未滿，不以零分補齊。學校名稱做 NFKC、空白、台／臺與英文大小寫正規化，不猜測縮寫是否同校。

學校榜主表列出指數、平均／最高／最低戰力、全校隊伍數與主力參賽站數；最多六支計分隊伍預設收合，點選「查看 N 隊」才展開。第七隊以後不參與指數；更新比賽、別名、國別、難度或權重後，隊伍榜與學校榜同步重算。可搜尋學校、清除篩選，或點選主力隊伍開啟明細。

### 舊備份與草稿

正式資料為 `version: 4`，`settings` 包含 `performanceWeight` 與 `stabilityWeight`。讀入 v1 / v2 / v3 備份與舊草稿時保留比賽成績、別名、國別與站點難度，套用新的 65% / 20% / 15% 權重。移除舊評分參數與已停用的名單欄位；匯出使用 v4 格式。

## 隊伍身分

隊名經 NFKC、首尾空白及連續空白正規化，保留大小寫與標點。相同 key 跨場累積。別名僅在確認相同隊伍時手動設定；會拒絕循環及同場兩個隊伍被合併的情況。

跨年同名、成員變更不會自動辨識。必要時為不同隊伍使用不同名稱，或未來加上 season / roster。TOPC 和 NCPC 中像空白與底線不同的隊名，未經確認不自動合併。

## 資料格式

正式資料為 `Dataset`（`version: 4`、`contests`、`aliases`、`countries`、`settings`）。單場匯入可直接使用 `Contest`：

```json
{
  "id": "example-2026",
  "name": "Example Contest",
  "date": "2026-11-05",
  "site": "Taiwan",
  "difficulty": null,
  "problemCount": 1,
  "source": "https://example.com/scoreboard",
  "status": "final",
  "results": [
    {
      "team": "ExampleTeam",
      "affiliation": "國立成功大學",
      "country": "TW",
      "rank": 1,
      "solved": 1,
      "penalty": 40,
      "problems": [{ "label": "A", "solved": true, "attempts": 2, "time": 20 }]
    }
  ]
}
```

`country` 可為 `TW` / `OTHER` / `UNKNOWN`。`attempts` 為含 AC 那次的嘗試總次數；不知道時用 `null`。`time` 是 AC 的比賽經過分鐘，未知或未解時 `null`。可用空的 `problems` 陣列表示只有總成績；dirty 會顯示未知。其餘情況逐題數須等於 `problemCount` 且與總解題數吻合。

## 專案結構

### 檔案

- `src/App.tsx`：排行、逐題記分板、設定與隊伍明細。
- `src/ImportDialog.tsx`：上傳、解析預覽與同場取代。
- `src/store.ts`：正式資料、本機草稿、備份匯出。
- `src/data/rankings.json`：正式比賽資料，後續更新此檔即可。
- `shared/parser.ts`：DOMjudge HTML 解析，兼容 `scoretn/scorenc/scorett` 與舊版 class。
- `shared/ranking.ts`：賽場表現、多站穩定度、站點難度與隊伍戰力。
- `shared/schools.ts`：各校最強六隊、平均與極值加權及學校排名。
- `src/Schools.tsx`：學校戰力榜、搜尋與主力隊伍明細入口。
- `shared/highlights.ts`：台灣 10 隊、每校最多 2 隊的晉級看好名單。
- `shared/validation.ts`：資料、重複隊名、別名循環與參數驗證。
- `scripts/import-scoreboard.ts`：選用的本機 CLI。
- `tests/`：解析、評分、重複匯入及正式資料一致性測試。

裝飾獎盃由影像生成工具建立，位於 `public/trophy.png`；不承載評分或資料資訊。
