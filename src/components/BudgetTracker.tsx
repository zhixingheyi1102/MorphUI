import { useEffect, useState } from "react"
import { Wallet } from "@phosphor-icons/react"

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

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#f43f5e"]

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

  return (
    <div
      className="p-5 w-64 shrink-0"
      style={{
        background: "var(--paper-receipt)",
        border: "1px solid var(--ink-line)",
        borderRadius: "var(--r-sticker)",
        boxShadow: "var(--z1)",
        fontFamily: "var(--font-cn)",
        color: "var(--ink)",
      }}
    >
      <h3 className="flex items-center gap-1.5 font-medium mb-1" style={{ fontSize: "var(--fs-data)", color: "var(--ink)" }}><Wallet size={16} weight="fill" /> 预算概览</h3>

      {/* 总额 */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="font-bold" style={{ fontSize: "var(--fs-display)", color: "var(--ink)", fontFamily: "var(--font-en)" }}>¥{animatedSpent.toLocaleString()}</span>
        <span style={{ fontSize: "var(--fs-data)", color: "var(--ink-soft)", fontFamily: "var(--font-en)" }}>/ ¥{data.total.toLocaleString()}</span>
      </div>

      {/* 进度条 */}
      <div className="h-2 rounded-full mb-4 overflow-hidden flex" style={{ background: "rgba(0,0,0,0.06)" }}>
        {data.items.map((item, i) => {
          const pct = (item.amount / data.total) * 100
          return (
            <div
              key={item.label}
              className="h-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                backgroundColor: COLORS[i % COLORS.length],
              }}
            />
          )
        })}
      </div>

      {/* 明细 */}
      <div className="space-y-2">
        {data.items.map((item, i) => (
          <div key={item.label} className="flex items-center justify-between" style={{ fontSize: "var(--fs-data)" }}>
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span style={{ color: "var(--ink-soft)" }}>{item.label}</span>
            </div>
            <span className="font-medium" style={{ color: "var(--ink)", fontFamily: "var(--font-en)" }}>¥{item.amount}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
