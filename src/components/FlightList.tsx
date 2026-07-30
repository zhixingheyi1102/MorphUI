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

type Props = {
  data: {
    title: string
    flights: Flight[]
  }
  onInteract: (flightId: string) => void
}

export default function FlightList({ data, onInteract }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 w-96 shrink-0">
      <h3 className="text-center text-sm font-medium text-gray-700 mb-5 pb-3 border-b border-gray-100">
        {data.title}
      </h3>

      <div className="relative">
        {data.flights.map((flight, i) => (
          <div key={flight.id}>
            {/* 航班卡片 */}
            <button
              onClick={() => onInteract(flight.id)}
              className="w-full text-left group"
            >
              <div className="flex gap-3">
                {/* 左侧时间轴 */}
                <div className="flex flex-col items-center pt-1.5 shrink-0">
                  <div className="w-3 h-3 rounded-full border-2 border-indigo-400 bg-white group-hover:bg-indigo-400 transition-colors" />
                  {i < data.flights.length - 1 && (
                    <div className="w-px flex-1 bg-gray-200 mt-1" />
                  )}
                </div>

                {/* 内容 */}
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-semibold text-gray-900">{flight.departTime}</span>
                    <span className="text-sm font-medium text-gray-700">
                      {flight.from} → {flight.to}
                    </span>
                  </div>

                  {/* 标签 */}
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {flight.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs rounded-md bg-indigo-50 text-indigo-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed mb-1">{flight.desc}</p>

                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>⏱ 约{flight.duration}</span>
                    {flight.airline && <span>✈ {flight.airline}</span>}
                    {flight.price && (
                      <span className="text-indigo-600 font-medium">¥{flight.price}</span>
                    )}
                  </div>
                </div>
              </div>
            </button>

            {/* 间隔提示 */}
            {i < data.flights.length - 1 && (
              <div className="flex items-center gap-2 pl-5 pb-3">
                <span className="text-xs text-gray-300">✦ 备选对比</span>
                <span className="text-xs text-gray-300">
                  间隔约{getInterval(flight.departTime, data.flights[i + 1].departTime)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// 简单计算两个时间之间的间隔
function getInterval(time1: string, time2: string): string {
  const [h1, m1] = time1.split(":").map(Number)
  const [h2, m2] = time2.split(":").map(Number)
  const diff = (h2 * 60 + m2) - (h1 * 60 + m1)
  const hours = Math.floor(diff / 60)
  const mins = diff % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h${mins}m`
}
