import { useState, useEffect, useRef } from "react"
import { DotsSixVertical } from "@phosphor-icons/react"
import SpotCard from "./plan/SpotCard"
import TransportCard from "./plan/TransportCard"

type Transport = {
  // 通用连接件：label 为任意过渡说明（如"间隔 1h"）；method/duration/distance 为旅行交通信息
  label?: string
  method?: string
  duration?: string
  distance?: string
}

type Activity = {
  id: string
  title: string
  desc?: string
  duration?: string
  price?: number
  tag?: string
}

type Spot = {
  id: string
  name: string
  time?: string
  duration?: string
  desc: string
  tag?: string
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
  onInteract: (value?: string) => void
}

// 单个景点条目：整卡可点引用，仅左侧手柄可拖拽排序
// 用纯指针事件实现（不依赖 framer layout），避免在被 transform 的画布里产生位移漂移
function SpotItem({
  spot,
  isFirst,
  isDragging,
  onQuote,
  onDragStart,
  registerRef,
}: {
  spot: Spot
  isFirst: boolean
  isDragging: boolean
  onQuote: (name: string) => void
  onDragStart: (id: string, e: React.PointerEvent) => void
  registerRef: (id: string, el: HTMLDivElement | null) => void
}) {
  return (
    <div
      ref={(el) => registerRef(spot.id, el)}
      className="relative"
      style={{ opacity: isDragging ? 0.4 : 1, transition: "opacity 0.15s" }}
    >
      {/* 交通连接（第一个景点上方不显示） */}
      {spot.transport && <TransportCard transport={spot.transport} />}

      <div className="relative flex items-start">
        {/* 拖拽手柄 —— 阻止冒泡到画布，避免触发整块画布平移 */}
        <button
          onPointerDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onDragStart(spot.id, e)
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="shrink-0 mt-4 mr-1 cursor-grab active:cursor-grabbing touch-none opacity-40 hover:opacity-90 transition-opacity"
          style={{ color: "var(--ink-soft)" }}
          title="拖动调整顺序"
          aria-label="拖动调整顺序"
        >
          <DotsSixVertical size={18} weight="bold" />
        </button>
        <div className="flex-1 min-w-0">
          <SpotCard spot={spot} isFirst={isFirst} onQuote={onQuote} />
        </div>
      </div>
    </div>
  )
}

export default function PlanNotebook({ data, onInteract }: Props) {
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

  // 本地维护当前天的景点顺序，保证拖拽即时流畅；随外部数据变化同步
  const [orderedSpots, setOrderedSpots] = useState<Spot[]>(day?.spots ?? [])
  useEffect(() => {
    setOrderedSpots(days[activeTab]?.spots ?? [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, day?.spots])

  // ─── 纯指针事件拖拽重排（不依赖 framer layout，在缩放/平移的画布里稳定）───
  // 关键：ref 按 spot.id 存（不是渲染下标）。拖拽中 setOrderedSpots 会重渲染，
  // 同一 DOM 节点会落到新的下标；若用下标索引 ref，就会错位导致排列失效、丢条目。
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const itemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())
  // 拖拽会话内的活动状态（放 ref 避免异步闭包读到旧 state）
  const sessionRef = useRef<{ order: Spot[]; id: string } | null>(null)

  const registerRef = (id: string, el: HTMLDivElement | null) => {
    if (el) itemRefs.current.set(id, el)
    else itemRefs.current.delete(id)
  }

  const handleDragStart = (id: string) => {
    sessionRef.current = { order: [...orderedSpots], id }
    setDraggingId(id)

    const move = (ev: PointerEvent) => {
      const sess = sessionRef.current
      if (!sess) return
      // 指针落在哪个条目上：按 id 查元素比较 clientY 与中点（屏幕坐标，缩放下自洽）
      let target = sess.order.length - 1
      for (let i = 0; i < sess.order.length; i++) {
        const el = itemRefs.current.get(sess.order[i].id)
        if (!el) continue
        const r = el.getBoundingClientRect()
        if (ev.clientY < r.top + r.height / 2) { target = i; break }
      }
      const pos = sess.order.findIndex((s) => s.id === sess.id)
      if (pos < 0 || target === pos) return
      const next = [...sess.order]
      const [moved] = next.splice(pos, 1)
      next.splice(target, 0, moved)
      sess.order = next
      setOrderedSpots(next)
    }
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      const sess = sessionRef.current
      sessionRef.current = null
      setDraggingId(null)
      if (sess) {
        const ids = sess.order.map((s) => s.id).join(",")
        onInteract(`reorder:${activeTab}:${ids}`)
      }
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  if (!day) return null

  // 生成装订孔
  const rings = Array.from({ length: 6 }, (_, i) => i)

  return (
    <div className="relative w-[480px] shrink-0" style={{ fontFamily: "var(--font-cn)" }}>
      {/* Day 标签页 — 笔记本分隔标签风格 */}
      <div className="flex ml-10 -mb-px relative z-10">
        {dayKeys.map((key, i) => {
          const active = activeTab === key
          return (
            <button
              key={key}
              onClick={() => {
                setActiveTab(key)
                onInteract(`day:${key}`)
              }}
              className="relative px-5 py-2 transition-all"
              style={{
                fontSize: "var(--fs-data)",
                fontFamily: "var(--font-display)",
                letterSpacing: "0.02em",
                borderTopLeftRadius: "var(--r-sticker)",
                borderTopRightRadius: "var(--r-sticker)",
                border: `1px solid ${active ? "var(--ink-line)" : "var(--ink-line)"}`,
                borderBottom: "none",
                background: active ? "var(--paper-cream)" : "var(--paper-manila)",
                color: active ? "var(--ink)" : "var(--ink-soft)",
                fontWeight: active ? 600 : 400,
                zIndex: active ? 10 : 1,
                marginLeft: active || i === 0 ? 0 : -4,
                transform: active ? "none" : `rotate(${i % 2 === 0 ? -1 : 1}deg)`,
              }}
            >
              {data.days[key].label}
            </button>
          )
        })}
      </div>

      {/* 笔记本主体 */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "var(--paper-cream)",
          border: "1px solid var(--ink-line)",
          borderRadius: "var(--r-sticker)",
          borderTopLeftRadius: 0,
          boxShadow: "var(--z2)",
        }}
      >
        {/* 装订孔 */}
        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col items-center justify-evenly pointer-events-none z-10">
          {/* 装订线 */}
          <div className="absolute left-[14px] top-4 bottom-4 w-[2px] rounded-full" style={{ background: "var(--ink-line)" }} />
          {/* 装订环（金属银） */}
          {rings.map((i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full relative z-10"
              style={{ border: "2px solid var(--metal-silver)", background: "var(--paper-cream)" }}
            />
          ))}
        </div>

        {/* 内容区 — 全部平铺展开，景点卡可上下拖拽排序 */}
        <div className="pl-10 pr-5 py-5 notebook-lines">
          {orderedSpots.map((spot, i) => (
            <SpotItem
              key={spot.id}
              spot={spot}
              isFirst={i === 0}
              isDragging={draggingId === spot.id}
              onQuote={(name) => onInteract(`quote:${name}`)}
              onDragStart={handleDragStart}
              registerRef={registerRef}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
