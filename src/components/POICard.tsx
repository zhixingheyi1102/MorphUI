import { motion, AnimatePresence } from "framer-motion"
import { MapPin, ForkKnife, Buildings, Bank, Target, Timer } from "@phosphor-icons/react"

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

const TYPE_META: Record<string, { Icon: typeof MapPin; label: string }> = {
  spot: { Icon: MapPin, label: "景点" },
  restaurant: { Icon: ForkKnife, label: "餐厅" },
  hotel: { Icon: Buildings, label: "酒店" },
}

const IMAGE_GRADIENTS: Record<string, string> = {
  spot: "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 50%, #a5b4fc 100%)",
  restaurant: "linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fbbf24 100%)",
  hotel: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 50%, #6ee7b7 100%)",
}

// POI 卡按类型取纸张色：景点 cream / 餐厅 sage / 酒店 blue
const POI_PAPER: Record<string, string> = {
  spot: "var(--paper-cream)",
  restaurant: "var(--paper-sage)",
  hotel: "var(--paper-blue)",
}

export default function POICard({ data, onInteract }: Props) {
  const hasDeepContent =
    data.activitiesLoaded ||
    (data.reviews && data.reviews.length > 0) ||
    (data.highlights && data.highlights.length > 0)

  return (
    <div
      className="w-80 shrink-0 overflow-hidden"
      style={{
        background: POI_PAPER[data.type] ?? POI_PAPER.spot,
        border: "1px solid var(--ink-line)",
        borderRadius: "var(--r-sticker)",
        boxShadow: "var(--z1)",
        fontFamily: "var(--font-cn)",
        color: "var(--ink)",
      }}
    >
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
            className="w-full h-full flex items-center justify-center"
            style={{ background: IMAGE_GRADIENTS[data.type] ?? IMAGE_GRADIENTS.spot, color: "var(--ink-soft)" }}
          >
            {data.type === "spot" ? <Bank size={40} weight="duotone" /> : data.type === "restaurant" ? <ForkKnife size={40} weight="duotone" /> : <Buildings size={40} weight="duotone" />}
          </div>
        )}
        {/* 类型标签 */}
        <span
          className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 font-medium rounded-full"
          style={{ fontSize: "var(--fs-caption)", background: "rgba(255,255,255,0.9)", color: "var(--ink-soft)", boxShadow: "var(--z1)" }}
        >
          {(() => {
            const { Icon, label } = TYPE_META[data.type] ?? TYPE_META.spot
            return <><Icon size={13} weight="fill" /> {label}</>
          })()}
        </span>
      </div>

      <div className="p-4">
        {/* 头部：名称 + 评分 */}
        <div className="flex items-start justify-between mb-1.5">
          <h3 className="font-semibold leading-snug" style={{ fontSize: "var(--fs-sub)", color: "var(--ink)" }}>{data.name}</h3>
          {data.rating != null && (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded shrink-0 ml-2"
              style={{ background: "rgba(255,255,255,0.5)", border: "1px solid var(--ink-line)" }}
            >
              <span style={{ fontSize: "var(--fs-caption)", color: "var(--metal-brass)" }}>★</span>
              <span className="font-medium" style={{ fontSize: "var(--fs-caption)", color: "var(--ink)" }}>{data.rating}</span>
            </div>
          )}
        </div>

        {/* 简介 */}
        {data.desc && (
          <p className="leading-relaxed mb-3" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>{data.desc}</p>
        )}

        {/* 标签 */}
        {data.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {data.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full"
                style={{ fontSize: "var(--fs-caption)", background: "rgba(255,255,255,0.45)", color: "var(--ink-soft)", border: "1px solid var(--ink-line)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 价格 + 距离（餐厅/酒店） */}
        {(data.priceRange || data.distance) && (
          <div className="flex items-center gap-3 mb-3" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>
            {data.priceRange && <span>{data.priceRange}</span>}
            {data.priceRange && data.distance && <span style={{ color: "var(--ink-line)" }}>|</span>}
            {data.distance && <span className="inline-flex items-center gap-1"><MapPin size={13} /> {data.distance}</span>}
          </div>
        )}

        {/* 酒店亮点 */}
        {data.type === "hotel" && data.highlights && (
          <div className="mb-3">
            <p className="font-medium mb-2" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>亮点</p>
            <div className="space-y-1">
              {data.highlights.map((h) => (
                <div key={h} className="flex items-center gap-2" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>
                  <span style={{ color: "var(--ink-blue)" }}>✓</span>
                  {h}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 餐厅评价 */}
        {data.type === "restaurant" && data.reviews && (
          <div className="mb-3">
            <p className="font-medium mb-2" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>用户评价</p>
            <div className="space-y-2">
              {data.reviews.map((r) => (
                <div key={r.user} className="p-2 rounded" style={{ background: "rgba(255,255,255,0.45)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium" style={{ fontSize: "var(--fs-caption)", color: "var(--ink)" }}>@{r.user}</span>
                    <span style={{ fontSize: "var(--fs-caption)", color: "var(--metal-brass)" }}>{"★".repeat(r.score)}</span>
                  </div>
                  <p style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>{r.text}</p>
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
              <div className="pt-2" style={{ borderTop: "1px solid var(--ink-line)" }}>
                <p className="flex items-center gap-1 font-medium mb-2" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}><Target size={13} weight="fill" /> 玩法推荐 · 选一个加入行程</p>
                <div className="space-y-2">
                  {data.activities.map((act) => (
                    <button
                      key={act.id}
                      onClick={() => onInteract(act.id)}
                      className="w-full text-left p-3 transition-all hover:brightness-105"
                      style={{ borderRadius: "var(--r-paper)", border: "1px solid var(--ink-line)", background: "rgba(255,255,255,0.4)" }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium" style={{ fontSize: "var(--fs-data)", color: "var(--ink)" }}>
                          {act.title}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: "10px", background: "var(--paper-oat)", color: "var(--ink-soft)" }}>
                          {act.tag}
                        </span>
                      </div>
                      <p className="mb-1.5" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>{act.desc}</p>
                      <div className="flex items-center gap-3" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>
                        <span className="inline-flex items-center gap-1"><Timer size={13} /> {act.duration}</span>
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
            className="w-full mt-2 py-2 font-medium transition-colors flex items-center justify-center gap-1 hover:brightness-105"
            style={{ fontSize: "var(--fs-data)", color: "var(--paper-cream)", background: "var(--stamp-red)", borderRadius: "var(--r-paper)" }}
          >
            {data.type === "spot" ? "探索玩法" : data.type === "restaurant" ? "查看评价" : "查看详情"}
            <span style={{ fontSize: "var(--fs-caption)" }}>→</span>
          </button>
        )}
      </div>
    </div>
  )
}
