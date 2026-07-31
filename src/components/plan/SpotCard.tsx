import { AnimatePresence, motion } from "framer-motion"
import { ChatCircle, MapPin, Target, Timer } from "@phosphor-icons/react"

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
  time: string
  duration: string
  desc: string
  tag: string
  imageUrl?: string
  selectedActivities?: Activity[]
}

type Props = {
  spot: SpotData
  isFirst: boolean
  onQuote?: (spotName: string) => void
}

export default function SpotCard({ spot, isFirst, onQuote }: Props) {
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
        onClick={onQuote ? () => onQuote(spot.name) : undefined}
        className={`flex-1 min-w-0 p-4 mb-1 transition-shadow relative ${onQuote ? "cursor-pointer hover:brightness-[0.98]" : ""}`}
        style={{
          background: "var(--paper-cream)",
          border: "1px solid var(--ink-line)",
          borderRadius: "var(--r-paper)",
          boxShadow: "var(--z1)",
          color: "var(--ink)",
        }}
      >
        {/* 引用提示（hover 出现） */}
        {onQuote && (
          <span
            className="absolute top-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full opacity-0 group-hover/spot:opacity-100 transition-opacity pointer-events-none"
            style={{ fontSize: "10px", background: "var(--paper-blue)", color: "var(--ink-blue)", border: "1px solid var(--ink-blue)" }}
          >
            <ChatCircle size={11} weight="fill" /> 追问
          </span>
        )}
        <div className="flex gap-3">
          {/* 左侧：文字信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1" style={{ color: "var(--ink-soft)" }}>
              <span style={{ fontSize: "var(--fs-caption)", fontFamily: "var(--font-en)" }}>{spot.time}</span>
              <span style={{ fontSize: "var(--fs-caption)" }}>·</span>
              <span style={{ fontSize: "var(--fs-caption)" }}>{spot.duration}</span>
            </div>
            <h4 className="font-semibold mb-1" style={{ fontSize: "var(--fs-body)", color: "var(--ink)" }}>{spot.name}</h4>
            <p className="leading-relaxed line-clamp-2" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>{spot.desc}</p>
            <span
              className="inline-block mt-2 px-2 py-0.5"
              style={{
                fontSize: "var(--fs-caption)",
                borderRadius: "var(--r-paper)",
                background: "var(--paper-oat)",
                color: "var(--ink-soft)",
              }}
            >
              {spot.tag}
            </span>
          </div>

          {/* 右侧：图片区域（邮票边框） */}
          <div
            className="w-20 h-20 shrink-0 overflow-hidden"
            style={{
              borderRadius: "var(--r-paper)",
              border: "2px solid var(--paper-oat)",
              background: "var(--paper-oat)",
              boxShadow: "var(--z1)",
            }}
          >
            {spot.imageUrl ? (
              <img
                src={spot.imageUrl}
                alt={spot.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--paper-oat)" }}>
                <MapPin size={20} style={{ color: "var(--ink-line)" }} />
              </div>
            )}
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
              <p className="mb-1.5 font-medium" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-blue)" }}>已加入玩法</p>
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
                      <span className="font-medium" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-blue)" }}>{act.title}</span>
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
      </div>
    </div>
  )
}
