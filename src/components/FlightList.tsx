import { Timer, AirplaneTilt } from "@phosphor-icons/react"

type Flight = {
  id: string
  departTime: string
  arriveTime: string
  from: string
  to: string
  duration: string
  tags: string[]
  desc: string
  price?: number
  airline?: string
}

type Segment = {
  direction: string
  label?: string
  flights: Flight[]
}

type Props = {
  data: {
    title: string
    // 往返：segments（去程/回程各一段）；单程：直接 flights
    segments?: Segment[]
    flights?: Flight[]
  }
  onInteract: (flightId: string) => void
}

export default function FlightList({ data, onInteract }: Props) {
  // 归一化：无论往返还是单程，都转成 segments 统一渲染
  const segments: Segment[] = data.segments?.length
    ? data.segments
    : [{ direction: "", flights: data.flights ?? [] }]

  return (
    <div
      className="p-5 w-96 shrink-0"
      style={{
        background: "var(--paper-receipt)",
        border: "1px solid var(--ink-line)",
        borderRadius: "var(--r-sticker)",
        boxShadow: "var(--z1)",
        fontFamily: "var(--font-cn)",
        color: "var(--ink)",
      }}
    >
      <h3
        className="text-center mb-5 pb-3"
        style={{ fontSize: "var(--fs-data)", color: "var(--ink)", borderBottom: "1px dashed var(--ink-line)" }}
      >
        {data.title}
      </h3>

      {segments.map((seg, si) => (
        <div key={si} className={si > 0 ? "mt-5 pt-5" : ""} style={si > 0 ? { borderTop: "1px dashed var(--ink-line)" } : undefined}>
          {/* 段落头（去程/回程） */}
          {seg.direction && (
            <div className="flex items-center gap-2 mb-3">
              <span
                className="px-2 py-0.5"
                style={{ fontSize: "var(--fs-caption)", borderRadius: "var(--r-paper)", background: "var(--metal-brass)", color: "var(--paper-receipt)" }}
              >
                {seg.direction}
              </span>
              {seg.label && (
                <span style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>{seg.label}</span>
              )}
            </div>
          )}

          <SegmentFlights flights={seg.flights} onInteract={onInteract} />
        </div>
      ))}
    </div>
  )
}

function SegmentFlights({ flights, onInteract }: { flights: Flight[]; onInteract: (id: string) => void }) {
  return (
    <div className="relative">
      {flights.map((flight, i) => (
        <div key={flight.id}>
          {/* 航班卡片 */}
          <button onClick={() => onInteract(flight.id)} className="w-full text-left group">
            <div className="flex gap-3">
              {/* 左侧时间轴 */}
              <div className="flex flex-col items-center pt-1.5 shrink-0">
                <div
                  className="w-3 h-3 rounded-full transition-colors"
                  style={{ border: "2px solid var(--metal-brass)", background: "var(--paper-receipt)" }}
                />
                {i < flights.length - 1 && (
                  <div className="w-px flex-1 mt-1" style={{ background: "var(--ink-line)" }} />
                )}
              </div>

              {/* 内容 */}
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold" style={{ fontSize: "var(--fs-sub)", color: "var(--ink)", fontFamily: "var(--font-en)" }}>{flight.departTime}</span>
                  <span style={{ fontSize: "var(--fs-data)", color: "var(--ink)" }}>
                    {flight.from} → {flight.to}
                  </span>
                </div>

                {/* 标签 */}
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {flight.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5"
                      style={{ fontSize: "var(--fs-caption)", borderRadius: "var(--r-paper)", background: "var(--paper-oat)", color: "var(--ink-soft)" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <p className="leading-relaxed mb-1" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>{flight.desc}</p>

                <div className="flex items-center gap-3" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>
                  <span className="inline-flex items-center gap-1"><Timer size={13} /> 约{flight.duration}</span>
                  {flight.airline && <span className="inline-flex items-center gap-1"><AirplaneTilt size={13} /> {flight.airline}</span>}
                  {flight.price && (
                    <span className="font-medium" style={{ color: "var(--stamp-red)", fontFamily: "var(--font-en)" }}>¥{flight.price}</span>
                  )}
                </div>
              </div>
            </div>
          </button>

          {/* 间隔提示（同一方向的备选之间才显示） */}
          {i < flights.length - 1 && (() => {
            const interval = getInterval(flight.departTime, flights[i + 1].departTime)
            if (!interval) return null
            return (
              <div className="flex items-center gap-2 pl-5 pb-3">
                <span style={{ fontSize: "var(--fs-caption)", color: "var(--ink-line)" }}>✦ 备选对比</span>
                <span style={{ fontSize: "var(--fs-caption)", color: "var(--ink-line)" }}>间隔约{interval}</span>
              </div>
            )
          })()}
        </div>
      ))}
    </div>
  )
}

// 计算两个时间之间的间隔；顺序异常（负数）时返回空，不显示
function getInterval(time1: string, time2: string): string {
  const [h1, m1] = time1.split(":").map(Number)
  const [h2, m2] = time2.split(":").map(Number)
  const diff = (h2 * 60 + m2) - (h1 * 60 + m1)
  if (diff <= 0) return ""
  const hours = Math.floor(diff / 60)
  const mins = diff % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h${mins}m`
}
