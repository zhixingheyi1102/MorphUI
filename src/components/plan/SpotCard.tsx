import { AnimatePresence, motion } from "framer-motion"
import { ChatCircleText, MapPin, Target, Timer } from "@phosphor-icons/react"

type Activity = {
  id: string
  title: string
  desc?: string
  duration?: string
  price?: number
  tag?: string
}

type SpotData = {
  id: string
  name: string
  time?: string
  duration?: string
  desc: string
  tag?: string
  imageUrl?: string
  selectedActivities?: Activity[]
}

type Props = {
  spot: SpotData
  isFirst: boolean
  // 点整卡「更多」→ 当作用户发问，agent 在对话里介绍该景点（不联动地图）
  onAskMore?: (spotName: string) => void
}

// 由开始时间 + 时长推算结束时间："09:30"+"1.5h" → "11:00"；解析不了返回 null
function endTimeOf(time: string, duration?: string): string | null {
  const t = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!t || !duration) return null
  const h = /([\d.]+)\s*h/.exec(duration)
  const m = /(\d+)\s*m(?:in)?$/.exec(duration)
  const mins = (h ? parseFloat(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0)
  if (!mins) return null
  const total = parseInt(t[1]) * 60 + parseInt(t[2]) + Math.round(mins)
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}

export default function SpotCard({ spot, isFirst, onAskMore }: Props) {
  return (
    <div className="relative flex gap-4 group/spot" style={{ fontFamily: "var(--font-cn)" }}>
      {/* 时间轴圆点 */}
      <div className="flex flex-col items-center shrink-0 pt-4 w-4">
        <div
          className="w-3 h-3 rounded-full"
          style={{
            background: isFirst ? "var(--stamp-red)" : "var(--paper-cream)",
            border: `2px solid ${isFirst ? "var(--stamp-red)" : "var(--ink-line)"}`,
          }}
        />
        <div className="w-px flex-1 mt-1" style={{ background: "var(--ink-line)" }} />
      </div>

      {/* 景点卡片 */}
      <div
        onClick={onAskMore ? () => onAskMore(spot.name) : undefined}
        className={`flex-1 min-w-0 p-4 mb-1 transition-shadow relative ${onAskMore ? "cursor-pointer hover:brightness-[0.98]" : ""}`}
        style={{
          background: "var(--paper-cream)",
          border: "1px solid var(--ink-line)",
          borderRadius: "var(--r-paper)",
          boxShadow: "var(--z1)",
          color: "var(--ink)",
        }}
      >
        <div className="flex gap-3">
          {/* 左侧：时间 + 名称 + 介绍（flyer 式排版） */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* 左上角时间行：09:30 — 11:00（结束时间由时长推算） */}
            {spot.time && (
              <p
                className="mb-0.5 flex items-center gap-1.5"
                style={{ fontFamily: "var(--font-en)", fontSize: 11, letterSpacing: "0.08em", color: "var(--ink-soft)" }}
              >
                {spot.time}
                {(() => {
                  const end = endTimeOf(spot.time, spot.duration)
                  if (end) return <><span style={{ display: "inline-block", width: 14, height: 1, background: "var(--ink-line)" }} />{end}</>
                  if (spot.duration) return <><span style={{ display: "inline-block", width: 14, height: 1, background: "var(--ink-line)" }} /><span style={{ fontSize: 10 }}>{spot.duration}</span></>
                  return null
                })()}
              </p>
            )}
            <h4 className="leading-snug mb-1" style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--ink)" }}>{spot.name}</h4>
            {spot.tag && (
              <span
                className="self-start px-1.5 py-0.5 mb-1.5"
                style={{ fontSize: "var(--fs-caption)", borderRadius: "var(--r-paper)", border: "1px dashed var(--ink-soft)", color: "var(--ink-soft)", background: "rgba(255,255,255,0.4)" }}
              >
                {spot.tag}
              </span>
            )}
            <p className="leading-relaxed line-clamp-3 mt-auto" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>{spot.desc}</p>
          </div>

          {/* 右侧：邮票齿孔框大图（飘窗） */}
          <div className="relative shrink-0" style={{ width: 92, height: 116 }}>
            {/* 照片：内缩到邮票内框里 */}
            <div className="absolute overflow-hidden" style={{ inset: "8.5%", background: "var(--paper-oat)" }}>
              {spot.imageUrl ? (
                <img
                  src={spot.imageUrl}
                  alt={spot.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MapPin size={20} style={{ color: "var(--ink-line)" }} />
                </div>
              )}
            </div>
            <img
              src="/decors/frame-stamp-perf.png"
              alt=""
              className="absolute inset-0 w-full h-full pointer-events-none select-none"
              style={{ objectFit: "fill" }}
            />
          </div>
        </div>

        {/* 已选玩法（蓝墨=用户选择） */}
        <AnimatePresence>
          {spot.selectedActivities && spot.selectedActivities.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3"
              style={{ borderTop: "1px solid var(--ink-line)" }}
            >
              <p className="mb-1.5" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-blue)" }}>已加入玩法</p>
              <div className="space-y-1.5">
                {spot.selectedActivities.map((act) => (
                  <div
                    key={act.id}
                    className="px-2.5 py-2"
                    style={{
                      background: "var(--paper-blue)",
                      borderRadius: "var(--r-paper)",
                      border: "1px solid var(--ink-blue)",
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Target size={13} weight="fill" style={{ color: "var(--ink-blue)" }} />
                      <span style={{ fontSize: "var(--fs-caption)", color: "var(--ink-blue)" }}>{act.title}</span>
                      {act.tag && (
                        <span
                          className="px-1 py-0.5"
                          style={{ fontSize: "9px", borderRadius: "var(--r-paper)", background: "rgba(255,255,255,0.6)", color: "var(--ink-blue)" }}
                        >
                          {act.tag}
                        </span>
                      )}
                    </div>
                    {act.desc && (
                      <p className="leading-relaxed mb-1" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-blue)", opacity: 0.85 }}>{act.desc}</p>
                    )}
                    <div className="flex items-center gap-2" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-blue)", opacity: 0.7 }}>
                      {act.duration && <span className="inline-flex items-center gap-1"><Timer size={12} /> {act.duration}</span>}
                      {act.price != null && (
                        <span>{act.price === 0 ? "免费" : `¥${act.price}`}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 「更多」提示（hover 显形）——卡片右下角脚注，占常驻文档流，不与邮票/玩法区重叠 */}
        {onAskMore && (
          <div className="flex justify-end mt-1.5 -mb-1">
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full opacity-0 group-hover/spot:opacity-100 transition-opacity pointer-events-none"
              style={{ fontSize: "10px", background: "var(--paper-blue)", color: "var(--ink-blue)", border: "1px solid var(--ink-blue)" }}
            >
              <ChatCircleText size={11} weight="fill" /> 更多
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
