import { AnimatePresence, motion } from "framer-motion"

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
}

export default function SpotCard({ spot, isFirst }: Props) {
  return (
    <div className="relative flex gap-4 group/spot">
      {/* 时间轴圆点 */}
      <div className="flex flex-col items-center shrink-0 pt-4 w-4">
        <div
          className={`w-3 h-3 rounded-full border-2 ${
            isFirst ? "bg-indigo-500 border-indigo-500" : "bg-white border-gray-300"
          }`}
        />
        <div className="w-px flex-1 bg-gray-200 mt-1" />
      </div>

      {/* 景点卡片 */}
      <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-1 hover:shadow-md transition-shadow">
        <div className="flex gap-3">
          {/* 左侧：文字信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-400 font-mono">{spot.time}</span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-400">{spot.duration}</span>
            </div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">{spot.name}</h4>
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{spot.desc}</p>
            <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-md bg-gray-100 text-gray-500">
              {spot.tag}
            </span>
          </div>

          {/* 右侧：图片区域 */}
          <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-gray-100">
            {spot.imageUrl ? (
              <img
                src={spot.imageUrl}
                alt={spot.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <span className="text-gray-300 text-lg">📍</span>
              </div>
            )}
          </div>
        </div>

        {/* 已选玩法 */}
        <AnimatePresence>
          {spot.selectedActivities && spot.selectedActivities.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-gray-100"
            >
              <p className="text-[10px] font-medium text-indigo-400 mb-1.5">已加入玩法</p>
              <div className="space-y-1.5">
                {spot.selectedActivities.map((act) => (
                  <div
                    key={act.id}
                    className="px-2.5 py-2 bg-indigo-50 rounded-lg border border-indigo-100"
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span>🎯</span>
                      <span className="text-xs font-medium text-indigo-700">{act.title}</span>
                      {act.tag && (
                        <span className="px-1 py-0.5 text-[9px] rounded-full bg-white/70 text-indigo-500">
                          {act.tag}
                        </span>
                      )}
                    </div>
                    {act.desc && (
                      <p className="text-[10px] text-indigo-500/80 leading-relaxed mb-1">{act.desc}</p>
                    )}
                    <div className="flex items-center gap-2 text-[10px] text-indigo-400">
                      {act.duration && <span>⏱ {act.duration}</span>}
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
