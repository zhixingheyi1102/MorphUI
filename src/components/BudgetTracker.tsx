import { useEffect, useState } from "react"

type BudgetItem = {
  label: string
  amount: number
}

type Props = {
  data: {
    total: number
    items: BudgetItem[]
  }
  onInteract: () => void
}

export default function BudgetTracker({ data }: Props) {
  const spent = data.items.reduce((sum, item) => sum + item.amount, 0)
  const [animatedSpent, setAnimatedSpent] = useState(0)

  useEffect(() => {
    const start = animatedSpent
    const diff = spent - start
    const duration = 600
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedSpent(Math.round(start + diff * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [spent])

  const remaining = data.total - spent
  const today = new Date()
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`

  return (
    <div className="w-64 shrink-0" style={{ filter: "drop-shadow(0 2px 3px rgba(24,20,14,0.28)) drop-shadow(0 8px 14px rgba(24,20,14,0.18))" }}>
      {/* 上锯齿撕边 */}
      <div className="receipt-zigzag-top" />

      <div
        className="receipt-paper relative px-5 pt-4 pb-5"
        style={{ color: "var(--ink)", fontFamily: "var(--font-en)" }}
      >
        {/* 票头 */}
        <div className="text-center">
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.18em" }}>
            * RECEIPT *
          </div>
          <div style={{ fontFamily: "var(--font-cn)", fontSize: "var(--fs-data)", color: "var(--ink-soft)", marginTop: 2 }}>
            旅行预算清单
          </div>
          <div style={{ fontSize: 10, color: "var(--postmark)", letterSpacing: "0.08em", marginTop: 4 }}>
            NO.0042 · {dateStr} · MORPH TRAVEL CO.
          </div>
        </div>

        {/* 双虚线分隔 */}
        <div className="my-3" style={{ borderTop: "1px dashed var(--ink-soft)", borderBottom: "1px dashed var(--ink-soft)", height: 4, opacity: 0.6 }} />

        {/* 明细：label ..... amount */}
        <div className="space-y-2" style={{ fontSize: "var(--fs-data)" }}>
          {data.items.map((item) => (
            <div key={item.label} className="flex items-end">
              <span style={{ fontFamily: "var(--font-cn)", color: "var(--ink)" }}>{item.label}</span>
              <span className="receipt-leader" />
              <span style={{ fontWeight: 700 }}>¥{item.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* 合计：双线 */}
        <div className="mt-3 pt-2" style={{ borderTop: "3px double var(--ink-soft)" }}>
          <div className="flex items-end" style={{ fontSize: "var(--fs-body)" }}>
            <span style={{ fontWeight: 700, letterSpacing: "0.1em" }}>TOTAL</span>
            <span className="receipt-leader" />
            <span style={{ fontWeight: 900, fontSize: "var(--fs-sub)" }}>¥{animatedSpent.toLocaleString()}</span>
          </div>
          <div className="flex items-end mt-1" style={{ fontSize: 10, color: "var(--postmark)" }}>
            <span style={{ letterSpacing: "0.08em" }}>BUDGET ¥{data.total.toLocaleString()}</span>
            <span className="receipt-leader" style={{ borderBottomColor: "transparent" }} />
            <span style={{ color: remaining >= 0 ? "var(--postmark)" : "var(--stamp-red)" }}>
              {remaining >= 0 ? `余 ¥${remaining.toLocaleString()}` : `超 ¥${Math.abs(remaining).toLocaleString()}`}
            </span>
          </div>
        </div>

        {/* 底部：条码 + 致谢 */}
        <div className="mt-4">
          <div className="receipt-barcode" />
          <div className="text-center mt-2" style={{ fontSize: 9, color: "var(--postmark)", letterSpacing: "0.3em" }}>
            THANK YOU · BON VOYAGE
          </div>
        </div>

        {/* 蓝圆章：斜盖在合计区，低透明度不抢戏 */}
        <img
          src="/decors/stamp-round-blue.png"
          alt=""
          className="absolute pointer-events-none select-none"
          style={{
            width: 84,
            right: -6,
            bottom: 44,
            opacity: 0.5,
            transform: "rotate(-12deg)",
            mixBlendMode: "multiply",
          }}
        />
      </div>

      {/* 下锯齿撕边 */}
      <div className="receipt-zigzag-bottom" />
    </div>
  )
}
