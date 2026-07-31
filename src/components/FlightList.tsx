import { AirplaneTilt } from "@phosphor-icons/react"

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
    // 已选航班：选中票盖章，其余票淡出且不可再点
    selectedId?: string
  }
  onInteract: (flightId: string) => void
}

// 深色票面双墨交替：海军蓝 / 酒红
const TICKET_INKS = ["#32476B", "#8E3B46"]
const CREAM = "#F4EEDF"

// 机场三字码（子串匹配，匹配不到则不显示码）
const AIRPORT_CODES: [string, string][] = [
  ["虹桥", "SHA"], ["浦东", "PVG"], ["宝安", "SZX"], ["白云", "CAN"],
  ["大兴", "PKX"], ["首都", "PEK"], ["萧山", "HGH"], ["禄口", "NKG"],
  ["天府", "TFU"], ["双流", "CTU"], ["江北", "CKG"], ["咸阳", "XIY"],
  ["高崎", "XMN"], ["长乐", "FOC"], ["黄花", "CSX"], ["天河", "WUH"],
]
function airportCode(name: string): string | null {
  for (const [k, code] of AIRPORT_CODES) if (name.includes(k)) return code
  return null
}

export default function FlightList({ data, onInteract }: Props) {
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

          {seg.flights.map((flight, i) => (
            <div key={flight.id}>
              <TicketCard
                flight={flight}
                ink={TICKET_INKS[i % TICKET_INKS.length]}
                onInteract={onInteract}
                selected={data.selectedId === flight.id}
                dimmed={!!data.selectedId && data.selectedId !== flight.id}
              />
              {i < seg.flights.length - 1 && (() => {
                const interval = getInterval(flight.departTime, seg.flights[i + 1].departTime)
                return (
                  <div className="flex items-center justify-center gap-2 py-2" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-line)" }}>
                    <span>✦ 备选对比</span>
                    {interval && <span>间隔约{interval}</span>}
                  </div>
                )
              })()}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function TicketCard({
  flight,
  ink,
  onInteract,
  selected,
  dimmed,
}: {
  flight: Flight
  ink: string
  onInteract: (id: string) => void
  selected?: boolean
  dimmed?: boolean
}) {
  const fromCode = airportCode(flight.from)
  const toCode = airportCode(flight.to)
  const recommended = flight.tags.some((t) => t.includes("推荐"))
  const locked = selected || dimmed // 已做出选择后整组票不可再点

  return (
    <button
      onClick={() => !locked && onInteract(flight.id)}
      disabled={locked}
      className="w-full text-left group block transition-opacity duration-500"
      style={{
        opacity: dimmed ? 0.32 : 1,
        filter: dimmed ? "saturate(0.4)" : undefined,
        cursor: locked ? "default" : "pointer",
      }}
    >
      <div
        className={`relative flex overflow-hidden transition-transform ${locked ? "" : "group-hover:-translate-y-0.5"}`}
        style={{ background: ink, borderRadius: "var(--r-sticker)", boxShadow: "var(--z1)", color: CREAM }}
      >
        {/* 撕票孔：上下两个半圆缺口（用外层纸色抠洞） */}
        <span className="absolute w-4 h-4 rounded-full z-10" style={{ background: "var(--paper-receipt)", right: 76, top: -8 }} />
        <span className="absolute w-4 h-4 rounded-full z-10" style={{ background: "var(--paper-receipt)", right: 76, bottom: -8 }} />

        {/* 主票面 */}
        <div className="flex-1 px-4 pt-3 pb-3.5 min-w-0" style={{ borderRight: `1px dashed ${CREAM}66` }}>
          {/* 票头 */}
          <div className="flex items-baseline justify-between mb-2.5">
            <span style={{ fontFamily: "var(--font-en)", fontSize: 9, letterSpacing: "0.28em", color: `${CREAM}99` }}>
              BOARDING PASS
            </span>
            {flight.airline && (
              <span style={{ fontSize: "var(--fs-caption)", color: `${CREAM}CC` }}>{flight.airline}</span>
            )}
          </div>

          {/* 航线：码 + 时间 + 航径 */}
          <div className="flex items-center gap-2 mb-2.5">
            <div className="shrink-0">
              <div className="font-bold leading-none" style={{ fontFamily: "var(--font-en)", fontSize: 24 }}>
                {fromCode ?? flight.departTime}
              </div>
              <div className="mt-1" style={{ fontSize: "var(--fs-caption)", color: `${CREAM}CC` }}>
                {flight.from}{fromCode ? ` ${flight.departTime}` : ""}
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center min-w-0 px-1">
              <AirplaneTilt size={14} weight="fill" style={{ color: `${CREAM}DD` }} />
              <div className="w-full my-0.5" style={{ borderTop: `1px dashed ${CREAM}77` }} />
              <span style={{ fontFamily: "var(--font-en)", fontSize: 9, letterSpacing: "0.1em", color: `${CREAM}99` }}>
                {flight.duration}
              </span>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-bold leading-none" style={{ fontFamily: "var(--font-en)", fontSize: 24 }}>
                {toCode ?? flight.arriveTime}
              </div>
              <div className="mt-1" style={{ fontSize: "var(--fs-caption)", color: `${CREAM}CC` }}>
                {flight.to}{toCode ? ` ${flight.arriveTime}` : ""}
              </div>
            </div>
          </div>

          {/* 标签 */}
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {flight.tags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-px"
                style={{ fontSize: 10, borderRadius: "var(--r-paper)", border: `1px solid ${CREAM}88`, color: `${CREAM}DD` }}
              >
                {tag}
              </span>
            ))}
          </div>

          <p className="leading-relaxed" style={{ fontSize: "var(--fs-caption)", color: `${CREAM}B3` }}>{flight.desc}</p>
        </div>

        {/* 票根 */}
        <div className="relative shrink-0 flex items-center gap-1.5 pl-2 pr-1.5" style={{ width: 84 }}>
          <div className="flex-1 text-center">
            <div style={{ fontFamily: "var(--font-en)", fontSize: 8, letterSpacing: "0.2em", color: `${CREAM}88` }}>FARE</div>
            <div className="font-bold leading-tight" style={{ fontFamily: "var(--font-en)", fontSize: 16 }}>
              ¥{flight.price ?? "--"}
            </div>
            <div className="mt-0.5" style={{ fontFamily: "var(--font-en)", fontSize: 9, color: `${CREAM}99` }}>
              {flight.departTime}
            </div>
          </div>
          {/* 条码：双层条纹叠出粗细变化 */}
          <div
            className="h-[72%] w-2.5 shrink-0"
            style={{
              backgroundImage: `repeating-linear-gradient(180deg, ${CREAM}EE 0 1px, transparent 1px 3px), repeating-linear-gradient(180deg, ${CREAM}EE 0 2px, transparent 2px 7px)`,
            }}
          />
        </div>

        {/* 推荐章 */}
        {recommended && !selected && (
          <span
            className="absolute px-2 py-0.5 rounded-full"
            style={{
              bottom: 7, right: 96,
              border: `1.5px solid ${CREAM}CC`,
              color: CREAM,
              fontFamily: "var(--font-en)",
              fontSize: 8.5,
              letterSpacing: "0.18em",
              transform: "rotate(-8deg)",
              opacity: 0.92,
            }}
          >
            ✦ PICK
          </span>
        )}

        {/* 已选章：盖在票面右侧，像检票员的橡皮章 */}
        {selected && (
          <span
            className="absolute flex items-center justify-center rounded-full stamp-in"
            style={{
              width: 52,
              height: 52,
              right: 88,
              top: "50%",
              marginTop: -26,
              border: `2px double ${CREAM}`,
              color: CREAM,
              fontFamily: "var(--font-cn)",
              fontSize: "var(--fs-caption)",
              letterSpacing: "0.15em",
              transform: "rotate(-14deg)",
              background: `${ink}CC`,
              boxShadow: `0 0 0 3px ${ink}`,
            }}
          >
            已选 ✓
          </span>
        )}
      </div>
    </button>
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
