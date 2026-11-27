import * as stylex from "@stylexjs/stylex";
import { ui } from "./styles/ui";
import { panels } from "./styles/panels";
import type { Dataset } from "../shared/types";
import { defaults } from "../shared/types";
export default function Method({
  data,
  onChange,
}: {
  data: Dataset;
  onChange: (d: Dataset) => void;
}) {
  const { performanceWeight, stabilityWeight } = data.settings;
  const difficultyWeight = 100 - performanceWeight - stabilityWeight;
  return (
    <>
      <section {...stylex.props(ui.panel, ui.paddedPanel, panels.method)}>
        <h2 {...stylex.props(ui.heading)}>戰力計算方式</h2>
        <p {...stylex.props(ui.paragraph, panels.copy)}>
          隊伍戰力為 0–100 分，預設以 80% 賽場表現、5% 跨站穩定度與 15%
          站點難度計分。 穩定度獨立顯示且最多只占
          5%；單站也能充分反映實力。各站內先平均各場，再讓各站等權。
        </p>
        <div {...stylex.props(panels.formula)}>
          戰力 = 100 × [{performanceWeight}% × Performance
          <br />+ {stabilityWeight}% × Stable
          <br />+ {difficultyWeight}% × Difficulty]
        </div>
        <p {...stylex.props(ui.paragraph, ui.muted, panels.copy)}>
          若啟用穩定度權重（最多
          5%），只有單站時會把該權重移回賽場表現，避免因缺少跨站紀錄而扣分。
          同樣水準且難度相同時，單站與多站穩定表現的戰力相等。
        </p>
        <h3 {...stylex.props(ui.subheading, panels.sectionTitle)}>
          賽場表現與同題數比較
        </h3>
        <p {...stylex.props(ui.paragraph, panels.copy)}>
          先依全場 ICPC 解題數與罰時取得名次百分位 P₀（第一名 1、最後一名
          0，同分同罰時取平均位置）。 同解題數有多隊時，僅在這組的名次區間內，以
          90% 罰時名次與 10% 解題乾淨程度微調成 P，再以 Q = P² 計分。
          同場多解一題必定有更高的 Q，dirty
          不會跨越題數差距。外國隊伍也參與全場比較。
        </p>
        <p {...stylex.props(ui.paragraph, panels.copy)}>
          D = 曾答錯才 AC 的題數 / AC 題數。若全場 N 隊、有 H
          隊解得更多、同題數共 M 隊， 乾淨程度對應百分位 P_D = 1 − [H + (M − 1)
          × D] / (N − 1)， P = 0.9 × P₀ + 0.1 ×
          P_D。同題數只有一隊時不調整；單隊比賽 P = 0.5；零解 Q = 0。
          缺少嘗試次數時 D 顯示未知，同題數微調暫用 0.5。Dirty 總覽仍依已知 AC
          題數加權。
        </p>
        <h3 {...stylex.props(ui.subheading, panels.sectionTitle)}>
          跨站穩定表現
        </h3>
        <p {...stylex.props(ui.paragraph, panels.copy)}>
          先將同站各場 Q 取平均，穩定度為 max(0, 各站 Q 平均 − 各站 Q
          的母體標準差)。持續在前段才有高分；只有一站時穩定分為
          0，顯示「待驗證」，不代表實力為零。兩站時穩定度就是較弱一站的
          Q；只以小權重影響戰力。
        </p>
        <p {...stylex.props(ui.paragraph, panels.copy)}>
          賽站以「賽站」欄位識別，同站跨屆請使用相同名稱。同站重複參賽不增加站數或該站票數；未參賽不當成敗場。
        </p>
        <h3 {...stylex.props(ui.subheading, panels.sectionTitle)}>站點難度</h3>
        <p {...stylex.props(ui.paragraph, panels.copy)}>
          每場可設定 0.5–2 的難度係數 d：0.5 較易、1 中性、2 較難。同樣的 Q 與
          dirty，在較難的站會獲得較高的難度分。難度表現為 Q × d /
          2，避免只參加難站卻成績差也拿滿難度分。
        </p>
        <p {...stylex.props(ui.paragraph, panels.copy)}>
          難度係數由人工校準，並非由參賽人數自動推算。未填時暫用中性值
          1.0，標示「未校準」。同一站不同屆可有不同難度，仍先站內平均。原始榜單無法單獨證明跨站題目難度，請依題目與共同參賽隊伍等資料校準。
        </p>
        <div {...stylex.props(panels.formula)}>
          Performance = mean_站(mean_場[Q])
          <br />
          Stable = 多站時 max(0, mean(Q_s) − std(Q_s))
          <br />
          Difficulty = mean_站(mean_場[Q × d / 2])
        </div>
        <h3 {...stylex.props(ui.subheading, panels.sectionTitle)}>
          亞太決賽晉級看好名單
        </h3>
        <p {...stylex.props(ui.paragraph, panels.copy)}>
          依完整台灣榜選出前 10 隊，每校最多 2
          隊，超額往下遞補，搜尋與篩選不改變名單。「高機率晉級亞太決賽」代表模型看好的隊伍，並非經校準的晉級機率或官方資格判定。缺學校者待確認後才納入。
        </p>
        <h3 {...stylex.props(ui.subheading, panels.sectionTitle)}>
          學校戰力指數
        </h3>
        <p {...stylex.props(ui.paragraph, panels.copy)}>
          取各校最強六隊，以平均戰力 70% + 最高戰力 20% + 最低戰力 10%
          計算學校指數，兼顧整體深度、頂尖隊伍與主力下限。列出計分隊伍、平均與極值、全校隊伍數和主力參賽站數。不足六隊時採用已有隊伍並標示資料未滿，不以零分補齊。隊伍、難度與權重更新時，學校榜同步重算。
        </p>
        <p {...stylex.props(ui.paragraph, panels.copy)}>
          資料量條是跨站與 dirty
          資料覆蓋指標，不是晉級機率。隊名、學校與成員變更仍需人工確認。
        </p>
      </section>
      <section {...stylex.props(ui.panel, ui.paddedPanel)}>
        <h2 {...stylex.props(ui.heading)}>戰力與輔助指標權重</h2>
        <label {...stylex.props(ui.label, panels.weightField)}>
          賽場表現
          <div {...stylex.props(panels.range)}>
            <input
              {...stylex.props(panels.rangeInput)}
              aria-label="賽場表現權重"
              type="range"
              min="0"
              max={100 - stabilityWeight}
              step="5"
              value={performanceWeight}
              onChange={(e) =>
                onChange({
                  ...data,
                  settings: {
                    ...data.settings,
                    performanceWeight: Number(e.target.value),
                  },
                })
              }
            />
            <output {...stylex.props(panels.rangeOutput)}>
              {performanceWeight}%
            </output>
          </div>
        </label>
        <label {...stylex.props(ui.label, panels.weightField)}>
          跨站穩定度（最多 5%）
          <div {...stylex.props(panels.range)}>
            <input
              {...stylex.props(panels.rangeInput)}
              aria-label="跨站穩定權重"
              type="range"
              min="0"
              max={Math.min(5, 100 - performanceWeight)}
              step="1"
              value={stabilityWeight}
              onChange={(e) =>
                onChange({
                  ...data,
                  settings: {
                    ...data.settings,
                    stabilityWeight: Number(e.target.value),
                  },
                })
              }
            />
            <output {...stylex.props(panels.rangeOutput)}>
              {stabilityWeight}%
            </output>
          </div>
        </label>
        <div {...stylex.props(panels.weightSummary)}>
          <span>站點難度</span>
          <strong>{difficultyWeight}%</strong>
        </div>
        <p {...stylex.props(ui.paragraph, ui.muted, panels.copy)}>
          難度權重為剩餘比例，三項合計 100%。各場難度係數可到「比賽記分板 →
          編輯參數」調整。
        </p>
        <button
          {...stylex.props(ui.button, panels.settingsButton)}
          onClick={() => onChange({ ...data, settings: { ...defaults } })}
        >
          還原 80% / 5% / 15%
        </button>
      </section>
    </>
  );
}
