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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 w-80 shrink-0">
      <h3 className="text-sm font-medium text-gray-700 mb-1">🎯 {data.spotName} · 玩法推荐</h3>
      <p className="text-xs text-gray-400 mb-4">选一个加入行程</p>

      <div className="space-y-3">
        {data.activities.map((act) => (
          <button
            key={act.id}
            onClick={() => onInteract(act.id)}
            className="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-900 group-hover:text-indigo-700">
                {act.title}
              </span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600">
                {act.tag}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-2">{act.desc}</p>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span>⏱ {act.duration}</span>
              <span>{act.price === 0 ? "免费" : `¥${act.price}`}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
