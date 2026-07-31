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
    method: string
    duration: string
    distance?: string
  }
}

export default function TransportCard({ transport }: Props) {
  const Icon = TRANSPORT_ICONS[transport.method] ?? Car

  return (
    <div className="relative flex items-stretch pl-4" style={{ fontFamily: "var(--font-cn)" }}>
      {/* 竖线连接 */}
      <div className="flex flex-col items-center w-4 shrink-0">
        <div className="w-px flex-1" style={{ background: "var(--ink-line)" }} />
      </div>

      {/* 交通信息 */}
      <div className="flex items-center gap-2 py-2 pl-3">
        <Icon size={15} style={{ color: "var(--ink-soft)" }} />
        <span style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>
          {transport.method} {transport.duration}
          {transport.distance && ` · ${transport.distance}`}
        </span>
      </div>
    </div>
  )
}
