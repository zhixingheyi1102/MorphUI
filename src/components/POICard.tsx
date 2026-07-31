import { motion, AnimatePresence } from "framer-motion"
import { MapPin, ForkKnife, Buildings, Bank, Target, Timer } from "@phosphor-icons/react"
import { perfStyle, Postmark } from "./postcard"

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

  const { Icon: TypeIcon, label: typeLabel } = TYPE_META[data.type] ?? TYPE_META.spot
  const paper = POI_PAPER[data.type] ?? POI_PAPER.spot
  const gradient = IMAGE_GRADIENTS[data.type] ?? IMAGE_GRADIENTS.spot

  return (
    <div
      className="w-80 shrink-0 overflow-hidden"
      style={{
        background: paper,
        border: "1px solid var(--ink-line)",
        borderRadius: "var(--r-sticker)",
        boxShadow: "var(--z1)",
        fontFamily: "var(--font-cn)",
        color: "var(--ink)",
      }}
    >
      {/* 明信片抬头：POST CARD + 邮资票 + 邮戳 */}
      <div className="relative flex items-start gap-2 px-4 pt-3 mb-1">
        <div className="flex-1 min-w-0 pt-0.5">
          <p style={{ fontFamily: "var(--font-en)", fontSize: 10, letterSpacing: "0.32em", color: "var(--ink-soft)" }}>POST CARD</p>
          <div className="mt-1.5" style={{ width: "72%", borderTop: "1px solid var(--ink-line)" }} />
          <p className="mt-1.5" style={{ fontFamily: "var(--font-en)", fontSize: 9, letterSpacing: "0.14em", color: "var(--ink-soft)", opacity: 0.75 }}>
            PAR AVION
          </p>
        </div>
        {/* 邮资票：类型作图案，评分作面值 */}
        <div
          className="shrink-0"
          style={{ ...perfStyle(paper, 2), padding: 5, transform: "rotate(2.5deg)", boxShadow: "0 1px 3px rgba(43,43,43,0.2)" }}
        >
          <div
            className="relative flex flex-col items-center justify-center"
            style={{ width: 40, height: 46, background: gradient, border: "1px solid rgba(43,43,43,0.1)" }}
          >
            <TypeIcon size={16} weight="duotone" color="var(--ink-soft)" />
            <span style={{ fontSize: 9, color: "var(--ink-soft)", marginTop: 2 }}>{typeLabel}</span>
            {data.rating != null && (
              <span style={{ position: "absolute", top: 1, right: 3, fontFamily: "var(--font-en)", fontSize: 8, color: "var(--ink-soft)" }}>{data.rating}</span>
            )}
          </div>
        </div>
        {/* 邮戳压在邮资票左下 */}
        <div className="absolute pointer-events-none" style={{ right: 62, top: 24, transform: "rotate(-8deg)", opacity: 0.85 }}>
          <Postmark />
        </div>
      </div>

      {/* 齿孔照片框 */}
      <div className="px-4 mb-3">
        <div style={{ transform: "rotate(-1.3deg)" }}>
          <div style={{ ...perfStyle(paper, 3), padding: 9, boxShadow: "0 2px 6px rgba(43,43,43,0.18)" }}>
            <div
              className="relative h-36 overflow-hidden flex items-center justify-center"
              style={{ background: gradient, color: "var(--ink-soft)" }}
            >
              {data.imageUrl ? (
                <img
                  src={data.imageUrl}
                  alt={data.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = "none" }}
                />
              ) : (
                data.type === "spot" ? <Bank size={32} weight="duotone" /> : data.type === "restaurant" ? <ForkKnife size={32} weight="duotone" /> : <Buildings size={32} weight="duotone" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        {/* 头部：名称 + 评分 */}
        <div className="flex items-baseline justify-between mb-1">
          <h3 className="leading-snug" style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--ink)" }}>{data.name}</h3>
          {data.rating != null && (
            <span className="shrink-0 ml-2" style={{ fontFamily: "var(--font-en)", fontSize: "var(--fs-caption)", color: "var(--metal-brass)" }}>★ {data.rating}</span>
          )}
        </div>

        {/* 简介：明信片书写线 */}
        {data.desc && (
          <p
            className="mb-2.5"
            style={{
              fontSize: "var(--fs-caption)", color: "var(--ink-soft)", lineHeight: "20px",
              backgroundImage: "repeating-linear-gradient(transparent 0 19px, color-mix(in srgb, var(--ink-line) 55%, transparent) 19px 20px)",
            }}
          >
            {data.desc}
          </p>
        )}

        {/* 标签 */}
        {data.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {data.tags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5"
                style={{ fontSize: "var(--fs-caption)", background: "rgba(255,255,255,0.45)", color: "var(--ink-soft)", border: "1px dashed var(--ink-soft)", borderRadius: "var(--r-paper)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 价格 + 距离（餐厅/酒店） */}
        {(data.priceRange || data.distance) && (
          <div className="flex items-center gap-3 mb-2.5" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>
            {data.priceRange && <span style={{ color: "var(--ink)" }}>{data.priceRange}</span>}
            {data.priceRange && data.distance && <span style={{ color: "var(--ink-line)" }}>|</span>}
            {data.distance && <span className="inline-flex items-center gap-1"><MapPin size={13} /> {data.distance}</span>}
          </div>
        )}

        {/* 酒店亮点 */}
        {data.type === "hotel" && data.highlights && (
          <div className="mb-3 pt-2" style={{ borderTop: "1px dashed var(--ink-line)" }}>
            <p className="mb-2" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>亮点</p>
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
          <div className="mb-3 pt-2" style={{ borderTop: "1px dashed var(--ink-line)" }}>
            <p className="mb-2" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>用户评价</p>
            <div className="space-y-2">
              {data.reviews.map((r) => (
                <div key={r.user} className="p-2" style={{ background: "rgba(255,255,255,0.45)", borderRadius: "var(--r-paper)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ fontSize: "var(--fs-caption)", color: "var(--ink)" }}>@{r.user}</span>
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
              <div className="pt-2" style={{ borderTop: "1px dashed var(--ink-line)" }}>
                <p className="flex items-center gap-1 mb-2" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}><Target size={13} weight="fill" /> 玩法推荐 · 选一个加入行程</p>
                <div className="space-y-2">
                  {data.activities.map((act) => (
                    <button
                      key={act.id}
                      onClick={() => onInteract(act.id)}
                      className="w-full text-left p-3 transition-all hover:brightness-105"
                      style={{ borderRadius: "var(--r-paper)", border: "1px dashed var(--ink-soft)", background: "rgba(255,255,255,0.4)" }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span style={{ fontSize: "var(--fs-data)", color: "var(--ink)" }}>
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
            className="w-full mt-2 py-2 transition-colors flex items-center justify-center gap-1 hover:brightness-105"
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
