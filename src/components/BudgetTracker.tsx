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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 w-64 shrink-0">
      <h3 className="text-sm font-medium text-gray-700 mb-1">💰 预算概览</h3>

      {/* 总额 */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-2xl font-bold text-gray-900">¥{animatedSpent.toLocaleString()}</span>
        <span className="text-sm text-gray-400">/ ¥{data.total.toLocaleString()}</span>
      </div>

      {/* 进度条 */}
      <div className="h-2 bg-gray-100 rounded-full mb-4 overflow-hidden flex">
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
          <div key={item.label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="text-gray-600">{item.label}</span>
            </div>
            <span className="text-gray-900 font-medium">¥{item.amount}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
