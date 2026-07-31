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

  const dashed = { borderTop: "1.5px dashed color-mix(in srgb, var(--ink) 45%, transparent)" }

  return (
    <div
      className="w-64 shrink-0"
      style={{
        filter: "drop-shadow(0 2px 3px rgba(24,20,14,0.28)) drop-shadow(0 8px 14px rgba(24,20,14,0.18))",
        transform: "rotate(0.6deg)",
      }}
    >
      {/* 上锯齿撕边 */}
      <div className="receipt-zigzag-top" />

      <div
        className="receipt-paper relative px-5 pt-4 pb-5 overflow-hidden"
        style={{ color: "var(--ink)", fontFamily: "var(--font-en)" }}
      >
        {/* 做旧账单撕纸肌理（透明 PNG 叠加） */}
        <img
          src="/textures/receipt-distress.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          style={{ mixBlendMode: "multiply", opacity: 0.28 }}
        />

        {/* 订书钉 */}
        <span
          className="absolute pointer-events-none"
          style={{
            top: 8, left: "50%", width: 26, height: 7,
            transform: "translateX(-50%) rotate(-3deg)",
            border: "2px solid #9A937F",
            borderRadius: 2,
            boxShadow: "0 1px 1px rgba(24,20,14,0.35)",
            background: "linear-gradient(180deg, #D8D2C0, #B7B09B)",
          }}
        />

        {/* 票头：品牌小字 → CASH RECEIPT 大字 → 地址行 */}
        <div className="text-center pt-3">
          <div style={{ fontSize: 9, letterSpacing: "0.3em", color: "var(--ink-soft)" }}>
            MORPH TRAVEL CO.
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "0.24em", marginTop: 3 }}>
            CASH RECEIPT
          </div>
          <div style={{ fontFamily: "var(--font-cn)", fontSize: "var(--fs-caption)", fontWeight: 400, color: "var(--ink-soft)", marginTop: 3, letterSpacing: "0.2em" }}>
            旅 行 预 算 清 单
          </div>
        </div>

        <div className="mt-3" style={dashed} />

        {/* Date / No. 行 */}
        <div className="flex justify-between pt-2" style={{ fontSize: 10, color: "var(--ink-soft)", letterSpacing: "0.08em" }}>
          <span>DATE: {dateStr}</span>
          <span>NO. 0042</span>
        </div>

        <div className="mt-2" style={dashed} />

        {/* 明细：label 左对齐，金额右对齐（无点线引导） */}
        <div className="space-y-2 pt-3 pb-1" style={{ fontSize: "var(--fs-data)" }}>
          {data.items.map((item) => (
            <div key={item.label} className="flex items-baseline justify-between">
              <span style={{ fontFamily: "var(--font-cn)", fontWeight: 400, color: "var(--ink)" }}>{item.label}</span>
              <span style={{ letterSpacing: "0.04em" }}>{item.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="mt-2" style={dashed} />

        {/* Total 大字 */}
        <div className="flex items-baseline justify-between pt-2.5 pb-2">
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.16em" }}>TOTAL</span>
          <span style={{ fontSize: 21, fontWeight: 700, letterSpacing: "0.02em" }}>
            ¥{animatedSpent.toLocaleString()}
          </span>
        </div>

        {/* Budget / Balance 小字行 */}
        <div className="space-y-1 pb-1" style={{ fontSize: 10, color: "var(--ink-soft)", letterSpacing: "0.08em" }}>
          <div className="flex justify-between">
            <span>BUDGET</span>
            <span>¥{data.total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>BALANCE</span>
            <span style={{ color: remaining >= 0 ? "var(--ink-soft)" : "var(--stamp-red)" }}>
              {remaining >= 0 ? `¥${remaining.toLocaleString()}` : `-¥${Math.abs(remaining).toLocaleString()}`}
            </span>
          </div>
        </div>

        <div className="mt-2" style={dashed} />

        {/* 底部：致谢 + 条码 */}
        <div className="mt-3">
          <div className="text-center mb-2.5" style={{ fontSize: 10, letterSpacing: "0.32em", color: "var(--ink)" }}>
            THANK YOU
          </div>
          <div className="receipt-barcode mx-6" />
          <div className="text-center mt-1.5" style={{ fontSize: 8, color: "var(--postmark)", letterSpacing: "0.24em" }}>
            BON VOYAGE
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
            bottom: 52,
            opacity: 0.38,
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
