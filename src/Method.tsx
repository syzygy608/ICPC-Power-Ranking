import type { Dataset } from "../shared/types";
import { defaults } from "../shared/types";
export default function Method({
  data,
  onChange,
}: {
  data: Dataset;
  onChange: (d: Dataset) => void;
}) {
  const { cleanWeight, stabilityWeight } = data.settings;
  const difficultyWeight = 100 - cleanWeight - stabilityWeight;
  return (
    <>
      <section className="panel method">
        <span className="eyebrow">
          CLEAN · CONSISTENT · CHALLENGING / MODEL v1.1
        </span>
        <h2>乾淨解題，跨站迎戰。</h2>
        <p>
          隊伍戰力為 0–100 分，綜合低 dirty
          表現、跨站穩定度與站點難度。三項權重合計
          100%；各站內先平均各場，再讓各站等權。
        </p>
        <div className="formula">
          戰力 = 100 × [{cleanWeight}% × Clean
          <br />+ {stabilityWeight}% × Stable
          <br />+ {difficultyWeight}% × Difficulty]
        </div>
        <h3>競爭水準與低 dirty 表現</h3>
        <p>
          依全場 ICPC 解題數與罰時排序，取得百分位 P（第一名 1、最後一名
          0，同分同罰時用平均位置），以 Q = P² 代表相對競爭水準。零解時 Q =
          0，單隊比賽 P = 0.5。外國隊伍也參與全場比較。
        </p>
        <p>
          D = 曾答錯才 AC 的題數 / AC 題數；單場低 dirty 表現為 Q × (1 −
          D)。解得乾淨也要有競爭力，僅解少數簡單題不會自動排前面。缺少嘗試次數時，D
          顯示未知，計分暫用 0.5。表格 Dirty 總覽依已知 AC
          題數加權；評分先逐場再逐站平均。
        </p>
        <h3>跨站穩定表現</h3>
        <p>
          先將同站各場 Q 取平均，穩定度為 max(0, 各站 Q 平均 − 各站 Q
          的母體標準差)。持續在前段才有高分；只有一站時穩定分為
          0，顯示「待驗證」。兩站時穩定度就是較弱一站的 Q。
        </p>
        <p>
          賽站以「賽站」欄位識別，同站跨屆請使用相同名稱。同站重複參賽不增加站數或該站票數；未參賽不當成敗場。
        </p>
        <h3>站點難度</h3>
        <p>
          每場可設定 0.5–2 的難度係數 d：0.5 較易、1 中性、2 較難。同樣的 Q 與
          dirty，在較難的站會獲得較高的難度分。難度表現為 Q × d /
          2，避免只參加難站卻成績差也拿滿難度分。
        </p>
        <p>
          難度係數由人工校準，並非由參賽人數自動推算。未填時暫用中性值
          1.0，標示「未校準」。同一站不同屆可有不同難度，仍先站內平均。原始榜單無法單獨證明跨站題目難度，請依題目與共同參賽隊伍等資料校準。
        </p>
        <div className="formula">
          Clean = mean_站(mean_場[Q × (1 − D)])
          <br />
          Stable = 多站時 max(0, mean(Q_s) − std(Q_s))
          <br />
          Difficulty = mean_站(mean_場[Q × d / 2])
        </div>
        <h3>亞太決賽晉級看好名單</h3>
        <p>
          依完整台灣榜選出前 10 隊，每校最多 2
          隊，超額往下遞補，搜尋與篩選不改變名單。「高機率晉級亞太決賽」代表模型看好的隊伍，並非經校準的晉級機率或官方資格判定。缺學校者待確認後才納入。
        </p>
        <h3>學校戰力指數</h3>
        <p>
          取各校最強六隊，以平均戰力 70% + 最高戰力 20% + 最低戰力 10%
          計算學校指數，兼顧整體深度、頂尖隊伍與主力下限。列出計分隊伍、平均與極值、全校隊伍數和主力參賽站數。不足六隊時採用已有隊伍並標示資料未滿，不以零分補齊。隊伍、難度與權重更新時，學校榜同步重算。
        </p>
        <p>
          資料量條是跨站與 dirty
          資料覆蓋指標，不是晉級機率。隊名、學校與成員變更仍需人工確認。
        </p>
      </section>
      <section className="panel settings">
        <h2>三項核心權重</h2>
        <label>
          低 dirty 表現
          <div className="range-input">
            <input
              aria-label="低 dirty 表現權重"
              type="range"
              min="0"
              max={100 - stabilityWeight}
              step="5"
              value={cleanWeight}
              onChange={(e) =>
                onChange({
                  ...data,
                  settings: {
                    ...data.settings,
                    cleanWeight: Number(e.target.value),
                  },
                })
              }
            />
            <output>{cleanWeight}%</output>
          </div>
        </label>
        <label>
          跨站穩定表現
          <div className="range-input">
            <input
              aria-label="跨站穩定權重"
              type="range"
              min="0"
              max={100 - cleanWeight}
              step="5"
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
            <output>{stabilityWeight}%</output>
          </div>
        </label>
        <div className="weight-summary">
          <span>站點難度</span>
          <strong>{difficultyWeight}%</strong>
        </div>
        <p className="muted">
          難度權重為剩餘比例，三項合計 100%。各場難度係數可到「比賽記分板 →
          編輯參數」調整。
        </p>
        <button
          onClick={() => onChange({ ...data, settings: { ...defaults } })}
        >
          還原 35% / 40% / 25%
        </button>
      </section>
    </>
  );
}
