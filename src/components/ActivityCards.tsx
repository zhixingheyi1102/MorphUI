import { Target, Timer } from "@phosphor-icons/react"

type Activity = {
  id: string
  title: string
  desc: string
  duration: string
  price: number
  tag: string
}

type Props = {
  data: {
    spotName: string
    activities: Activity[]
  }
  onInteract: (activityId: string) => void
}

export default function ActivityCards({ data, onInteract }: Props) {
  return (
    <div
      className="p-5 w-80 shrink-0"
      style={{
        background: "var(--paper-cream)",
        border: "1px solid var(--ink-line)",
        borderRadius: "var(--r-sticker)",
        boxShadow: "var(--z1)",
        fontFamily: "var(--font-cn)",
        color: "var(--ink)",
      }}
    >
      <h3 className="flex items-center gap-1.5 mb-1" style={{ fontSize: "var(--fs-data)", color: "var(--ink)" }}><Target size={16} weight="fill" /> {data.spotName} · 玩法推荐</h3>
      <p className="mb-4" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>选一个加入行程</p>

      <div className="space-y-3">
        {data.activities.map((act) => (
          <button
            key={act.id}
            onClick={() => onInteract(act.id)}
            className="w-full text-left p-3 transition-all hover:brightness-105"
            style={{ borderRadius: "var(--r-paper)", border: "1px solid var(--ink-line)", background: "rgba(255,255,255,0.4)" }}
          >
            <div className="flex items-center justify-between mb-1">
              <span style={{ fontSize: "var(--fs-data)", color: "var(--ink)" }}>
                {act.title}
              </span>
              <span className="px-2 py-0.5 rounded-full" style={{ fontSize: "var(--fs-caption)", background: "var(--paper-oat)", color: "var(--ink-soft)" }}>
                {act.tag}
              </span>
            </div>
            <p className="mb-2" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>{act.desc}</p>
            <div className="flex items-center gap-3" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>
              <span className="inline-flex items-center gap-1"><Timer size={13} /> {act.duration}</span>
              <span>{act.price === 0 ? "免费" : `¥${act.price}`}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
