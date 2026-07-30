type Review = {
  user: string
  text: string
  score: number
}

type Props = {
  data: {
    type: "restaurant" | "hotel"
    name: string
    rating: number
    priceRange: string
    tags: string[]
    distance: string
    walkTime?: string
    reviews?: Review[]
    highlights?: string[]
    images?: string[]
  }
  onInteract: () => void
}

const PLACEHOLDER_COLORS = ["#f0e6d3", "#d3e8f0", "#d3f0d8", "#f0d3e8"]

export default function POICard({ data }: Props) {
  const isHotel = data.type === "hotel"

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 w-72 shrink-0">
      {/* 头部 */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-xs text-gray-400 uppercase">{isHotel ? "🏨 酒店" : "🍜 餐厅"}</span>
          <h3 className="text-base font-semibold text-gray-900 mt-0.5">{data.name}</h3>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg">
          <span className="text-amber-500 text-sm">★</span>
          <span className="text-sm font-medium text-amber-700">{data.rating}</span>
        </div>
      </div>

      {/* 价格和距离 */}
      <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
        <span>{data.priceRange}</span>
        <span className="text-gray-300">|</span>
        <span>📍 {data.distance}</span>
      </div>

      {/* 标签 */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {data.tags.map((tag) => (
          <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
            {tag}
          </span>
        ))}
      </div>

      {/* 酒店：亮点 */}
      {isHotel && data.highlights && (
        <div className="mb-4">
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

      {/* 酒店：图片占位 */}
      {isHotel && data.images && (
        <div className="grid grid-cols-4 gap-1.5 mb-4">
          {data.images.map((img, i) => (
            <div
              key={img}
              className="aspect-square rounded-lg"
              style={{ backgroundColor: PLACEHOLDER_COLORS[i % PLACEHOLDER_COLORS.length] }}
            />
          ))}
        </div>
      )}

      {/* 餐厅：评价 */}
      {!isHotel && data.reviews && (
        <div>
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
    </div>
  )
}
