import { useState } from "react"
import { Train, PersonSimpleWalk, Target } from "@phosphor-icons/react"

type Transport = {
  method: string
  duration: string
  distance: string
}

type Spot = {
  id: string
  name: string
  time: string
  duration: string
  desc: string
  tag: string
  transport?: Transport
}

type DayData = {
  label: string
  spots: Spot[]
}

type Props = {
  data: {
    activeTab?: string
    days: Record<string, DayData>
    selectedActivity?: { spotId: string; activity: string }
  }
  onInteract: () => void
}

export default function Itinerary({ data }: Props) {
  const dayKeys = Object.keys(data.days)
  const [activeTab, setActiveTab] = useState(data.activeTab ?? dayKeys[0])
  const day = data.days[activeTab]

  if (!day) return null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-96 shrink-0">
      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1">
        {dayKeys.map((key) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {data.days[key].label}
          </button>
        ))}
      </div>

      {/* Spots */}
      <div className="relative">
        {day.spots.map((spot, i) => (
          <div key={spot.id}>
            {/* 交通连接线 */}
            {spot.transport && (
              <div className="flex items-center gap-3 py-2 pl-5">
                <div className="w-px h-8 bg-gray-200 ml-1" />
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  {spot.transport.method === "地铁" ? <Train size={13} /> : <PersonSimpleWalk size={13} />}
                  {spot.transport.method} {spot.transport.duration}
                </span>
              </div>
            )}

            {/* 景点卡片 */}
            <div
              className={`relative flex gap-4 p-3 rounded-xl transition-all hover:bg-gray-50 ${
                data.selectedActivity?.spotId === spot.id ? "ring-2 ring-indigo-200 bg-indigo-50" : ""
              }`}
            >
              {/* 时间轴圆点 */}
              <div className="flex flex-col items-center shrink-0 pt-1">
                <div className={`w-3 h-3 rounded-full ${i === 0 ? "bg-indigo-500" : "bg-gray-300"}`} />
                {i < day.spots.length - 1 && !day.spots[i + 1]?.transport && (
                  <div className="w-px flex-1 bg-gray-200 mt-1" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-400 font-mono">{spot.time}</span>
                  <span className="text-sm font-medium text-gray-900">{spot.name}</span>
                  <span className="px-1.5 py-0.5 text-xs rounded-md bg-gray-100 text-gray-500">
                    {spot.tag}
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{spot.desc}</p>
                <span className="text-xs text-gray-400">{spot.duration}</span>

                {/* 选中的玩法 */}
                {data.selectedActivity?.spotId === spot.id && (
                  <div className="mt-2 px-2 py-1 bg-indigo-100 rounded-lg text-xs text-indigo-700 flex items-center gap-1">
                    <Target size={13} weight="fill" /> {data.selectedActivity.activity}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
