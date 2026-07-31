import { useState, useEffect } from "react"
import SpotCard from "./plan/SpotCard"
import TransportCard from "./plan/TransportCard"

type Transport = {
  method: string
  duration: string
  distance: string
}

type Activity = {
  id: string
  title: string
  duration?: string
  price?: number
  tag?: string
}

type Spot = {
  id: string
  name: string
  time: string
  duration: string
  desc: string
  tag: string
  imageUrl?: string
  transport?: Transport
  selectedActivities?: Activity[]
}

type DayData = {
  label: string
  spots: Spot[]
}

type Props = {
  data: {
    activeTab?: string
    days: Record<string, DayData>
    // 由 scenario 更新注入，PlanNotebook 内部合并到对应 spot
    selectedActivity?: { spotId: string; activity: Activity }
  }
  onInteract: () => void
}

export default function PlanNotebook({ data }: Props) {
  const dayKeys = Object.keys(data.days)
  const [activeTab, setActiveTab] = useState(data.activeTab ?? dayKeys[0])

  // 当外部 activeTab 变化时同步
  useEffect(() => {
    if (data.activeTab && data.activeTab !== activeTab) {
      setActiveTab(data.activeTab)
    }
  }, [data.activeTab])

  // 将 selectedActivity 合并到对应 spot 的 selectedActivities 数组
  const days = { ...data.days }
  if (data.selectedActivity) {
    const { spotId, activity } = data.selectedActivity
    for (const key of dayKeys) {
      const day = days[key]
      const spotIndex = day.spots.findIndex((s) => s.id === spotId)
      if (spotIndex >= 0) {
        const spot = day.spots[spotIndex]
        const existing = spot.selectedActivities ?? []
        // 避免重复添加
        if (!existing.some((a) => a.id === activity.id)) {
          days[key] = {
            ...day,
            spots: day.spots.map((s, i) =>
              i === spotIndex
                ? { ...s, selectedActivities: [...existing, activity] }
                : s
            ),
          }
        }
        break
      }
    }
  }

  const day = days[activeTab]
  if (!day) return null

  // 生成装订孔
  const rings = Array.from({ length: 6 }, (_, i) => i)

  return (
    <div className="relative w-[480px] shrink-0">
      {/* Day 标签页 — 笔记本分隔标签风格 */}
      <div className="flex ml-10 -mb-px relative z-10">
        {dayKeys.map((key, i) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`relative px-5 py-2 text-sm rounded-t-xl border border-b-0 transition-all ${
              activeTab === key
                ? "bg-[#fefcf7] text-gray-900 font-semibold border-gray-200 z-10"
                : "bg-gray-50 text-gray-400 border-gray-100 hover:text-gray-600 -ml-1"
            }`}
            style={{
              fontFamily: "'Georgia', serif",
              letterSpacing: "0.02em",
              transform: activeTab === key ? "none" : `rotate(${i % 2 === 0 ? -1 : 1}deg)`,
            }}
          >
            {data.days[key].label}
          </button>
        ))}
      </div>

      {/* 笔记本主体 */}
      <div className="relative bg-[#fefcf7] rounded-2xl rounded-tl-none shadow-lg border border-gray-200 overflow-hidden">
        {/* 装订孔 */}
        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col items-center justify-evenly pointer-events-none z-10">
          {/* 装订线 */}
          <div className="absolute left-[14px] top-4 bottom-4 w-[2px] bg-[#d4cec2] rounded-full" />
          {/* 装订环 */}
          {rings.map((i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full border-2 border-[#b8ad9a] bg-[#fefcf7] relative z-10"
            />
          ))}
        </div>

        {/* 内容区 — 全部平铺展开 */}
        <div className="pl-10 pr-5 py-5 notebook-lines">
          {day.spots.map((spot, i) => (
            <div key={spot.id}>
              {/* 交通连接（第一个景点上方不显示） */}
              {spot.transport && (
                <TransportCard transport={spot.transport} />
              )}

              {/* 景点卡片 */}
              <SpotCard spot={spot} isFirst={i === 0} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
