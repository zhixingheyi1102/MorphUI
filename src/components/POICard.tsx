import { motion, AnimatePresence } from "framer-motion"

type Review = {
  user: string
  text: string
  score: number
}

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
    type: "spot" | "restaurant" | "hotel"
    name: string
    desc?: string
    imageUrl?: string
    rating?: number
    priceRange?: string
    tags?: string[]
    distance?: string
    walkTime?: string
    reviews?: Review[]
    highlights?: string[]
    images?: string[]
    activities?: Activity[]
    activitiesLoaded?: boolean
  }
  onInteract: (action?: string) => void
}

const TYPE_LABELS: Record<string, string> = {
  spot: "📍 景点",
  restaurant: "🍜 餐厅",
  hotel: "🏨 酒店",
}

const IMAGE_GRADIENTS: Record<string, string> = {
  spot: "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 50%, #a5b4fc 100%)",
  restaurant: "linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fbbf24 100%)",
  hotel: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 50%, #6ee7b7 100%)",
}

export default function POICard({ data, onInteract }: Props) {
  const hasDeepContent =
    data.activitiesLoaded ||
    (data.reviews && data.reviews.length > 0) ||
    (data.highlights && data.highlights.length > 0)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-80 shrink-0 overflow-hidden">
      {/* 概览图 */}
      <div className="relative h-36 overflow-hidden">
        {data.imageUrl ? (
          <img
            src={data.imageUrl}
            alt={data.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // 图片加载失败时显示渐变占位
              const div = e.currentTarget.parentElement
              if (div) {
                e.currentTarget.style.display = "none"
                div.style.background = IMAGE_GRADIENTS[data.type] ?? IMAGE_GRADIENTS.spot
              }
            }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-4xl"
            style={{ background: IMAGE_GRADIENTS[data.type] ?? IMAGE_GRADIENTS.spot }}
          >
            {data.type === "spot" ? "🏛" : data.type === "restaurant" ? "🍽" : "🏨"}
          </div>
        )}
        {/* 类型标签 */}
        <span className="absolute top-3 left-3 px-2 py-0.5 text-xs font-medium bg-white/90 backdrop-blur-sm rounded-full text-gray-600 shadow-sm">
          {TYPE_LABELS[data.type] ?? TYPE_LABELS.spot}
        </span>
      </div>

      <div className="p-4">
        {/* 头部：名称 + 评分 */}
        <div className="flex items-start justify-between mb-1.5">
          <h3 className="text-base font-semibold text-gray-900 leading-snug">{data.name}</h3>
          {data.rating != null && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 rounded-lg shrink-0 ml-2">
              <span className="text-amber-500 text-xs">★</span>
              <span className="text-xs font-medium text-amber-700">{data.rating}</span>
            </div>
          )}
        </div>

        {/* 简介 */}
        {data.desc && (
          <p className="text-xs text-gray-500 leading-relaxed mb-3">{data.desc}</p>
        )}

        {/* 标签 */}
        {data.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {data.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 价格 + 距离（餐厅/酒店） */}
        {(data.priceRange || data.distance) && (
          <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
            {data.priceRange && <span>{data.priceRange}</span>}
            {data.priceRange && data.distance && <span className="text-gray-300">|</span>}
            {data.distance && <span>📍 {data.distance}</span>}
          </div>
        )}

        {/* 酒店亮点 */}
        {data.type === "hotel" && data.highlights && (
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-600 mb-2">亮点</p>
            <div className="space-y-1">
              {data.highlights.map((h) => (
                <div key={h} className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="text-emerald-500">✓</span>
                  {h}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 餐厅评价 */}
        {data.type === "restaurant" && data.reviews && (
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-600 mb-2">用户评价</p>
            <div className="space-y-2">
              {data.reviews.map((r) => (
                <div key={r.user} className="p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-700">@{r.user}</span>
                    <span className="text-xs text-amber-500">{"★".repeat(r.score)}</span>
                  </div>
                  <p className="text-xs text-gray-500">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 玩法列表（动画展开） */}
        <AnimatePresence>
          {data.activities && data.activities.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-600 mb-2">🎯 玩法推荐 · 选一个加入行程</p>
                <div className="space-y-2">
                  {data.activities.map((act) => (
                    <button
                      key={act.id}
                      onClick={() => onInteract(act.id)}
                      className="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800 group-hover:text-indigo-700">
                          {act.title}
                        </span>
                        <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-indigo-50 text-indigo-600">
                          {act.tag}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-1.5">{act.desc}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>⏱ {act.duration}</span>
                        <span>{act.price === 0 ? "免费" : `¥${act.price}`}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 探索按钮（深度内容未加载时显示） */}
        {!hasDeepContent && (
          <button
            onClick={() => onInteract("explore")}
            className="w-full mt-2 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1"
          >
            {data.type === "spot" ? "探索玩法" : data.type === "restaurant" ? "查看评价" : "查看详情"}
            <span className="text-xs">→</span>
          </button>
        )}
      </div>
    </div>
  )
}
