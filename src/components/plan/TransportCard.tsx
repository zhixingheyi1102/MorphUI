const TRANSPORT_ICONS: Record<string, string> = {
  "地铁": "🚇",
  "步行": "🚶",
  "打车": "🚗",
  "公交": "🚌",
  "骑行": "🚲",
}

type Props = {
  transport: {
    method: string
    duration: string
    distance?: string
  }
}

export default function TransportCard({ transport }: Props) {
  const icon = TRANSPORT_ICONS[transport.method] ?? "🚗"

  return (
    <div className="relative flex items-stretch pl-4">
      {/* 竖线连接 */}
      <div className="flex flex-col items-center w-4 shrink-0">
        <div className="w-px flex-1 bg-gray-200" />
      </div>

      {/* 交通信息 */}
      <div className="flex items-center gap-2 py-2 pl-3">
        <span className="text-sm">{icon}</span>
        <span className="text-xs text-gray-400">
          {transport.method} {transport.duration}
          {transport.distance && ` · ${transport.distance}`}
        </span>
      </div>
    </div>
  )
}
