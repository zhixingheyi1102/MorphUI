import { Train, PersonSimpleWalk, Car, Bus, Bicycle } from "@phosphor-icons/react"

const TRANSPORT_ICONS: Record<string, typeof Car> = {
  "地铁": Train,
  "步行": PersonSimpleWalk,
  "打车": Car,
  "公交": Bus,
  "骑行": Bicycle,
}

type Props = {
  transport: {
    // 通用连接件：任意两个条目之间的"过渡说明"。
    // 旅行场景填 method（步行/地铁…）会带交通图标；
    // 其它场景（如备餐流程）填 label（"间隔 1h"）纯文字显示。
    label?: string
    method?: string
    duration?: string
    distance?: string
  }
}

export default function TransportCard({ transport }: Props) {
  const { label, method, duration, distance } = transport
  // 只认得词表里的交通方式才配图标，认不出就不显示图标（不再 fallback 成汽车）
  const Icon = method ? TRANSPORT_ICONS[method] : undefined

  // 显示文字：优先用通用 label；否则拼交通信息
  const text = label
    ? label
    : [method, duration].filter(Boolean).join(" ") + (distance ? ` · ${distance}` : "")

  if (!text.trim()) return null

  return (
    <div className="relative flex items-stretch pl-4" style={{ fontFamily: "var(--font-cn)" }}>
      {/* 竖线连接 */}
      <div className="flex flex-col items-center w-4 shrink-0">
        <div className="w-px flex-1" style={{ background: "var(--ink-line)" }} />
      </div>

      {/* 连接件信息 */}
      <div className="flex items-center gap-2 py-2 pl-3">
        {Icon && <Icon size={15} style={{ color: "var(--ink-soft)" }} />}
        <span style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>{text}</span>
      </div>
    </div>
  )
}
