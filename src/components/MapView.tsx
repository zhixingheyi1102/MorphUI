import { useEffect, useRef, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// ─── 类型 ───
type Marker = {
  id: string
  name: string
  lat: number
  lng: number
  type: "spot" | "restaurant" | "hotel"
  rating?: number
  stars?: number
  desc?: string
  imageUrl?: string
  tags?: string[]
}

type Activity = {
  id: string
  title: string
  desc: string
  duration: string
  price: number
  tag: string
}

type Review = {
  user: string
  text: string
  score: number
}

type PoiDeepContent = {
  activities?: Activity[]
  activitiesLoaded?: boolean
  reviews?: Review[]
  priceRange?: string
  distance?: string
}

type Props = {
  data: {
    center: [number, number]
    zoom: number
    markers: Marker[]
    extraMarkers?: Marker[]
    routeColor?: string
    highlightSpot?: string
    poiDeepContent?: PoiDeepContent
  }
  onInteract: (value: string) => void
}

// ─── 常量 ───
const MARKER_COLORS: Record<string, string> = {
  spot: "#6366f1",
  restaurant: "#f59e0b",
  hotel: "#10b981",
}

const MARKER_ICONS: Record<string, string> = {
  spot: "📍",
  restaurant: "🍜",
  hotel: "🏨",
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

function createIcon(type: string, highlight = false, selected = false) {
  const color = MARKER_COLORS[type] ?? "#6366f1"
  const emoji = MARKER_ICONS[type] ?? "📍"
  const size = highlight || selected ? 36 : 28
  const ring = selected ? `border: 3px solid white; box-shadow: 0 0 0 2px ${color}, 0 4px 12px ${color}88;` : ""
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width:${size}px; height:${size}px;
      display:flex; align-items:center; justify-content:center;
      background:${color}; border-radius:50%;
      color:white; font-size:${size * 0.5}px;
      box-shadow: 0 2px 8px ${color}66;
      ${ring}
      ${highlight && !selected ? "animation: pulse 1.5s infinite;" : ""}
      transition: all 0.2s ease;
    ">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// ═══════════════════════════════════════════════
//  POI 面板（内嵌在地图右侧）
// ═══════════════════════════════════════════════
function PoiPanel({
  marker,
  deepContent,
  onExplore,
  onActivityClick,
  onClose,
}: {
  marker: Marker
  deepContent?: PoiDeepContent
  onExplore: () => void
  onActivityClick: (actId: string) => void
  onClose: () => void
}) {
  const hasDeep =
    deepContent?.activitiesLoaded ||
    (deepContent?.reviews && deepContent.reviews.length > 0)

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 280, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 340 }}
      className="shrink-0 overflow-hidden border-l border-gray-100"
    >
      <div className="w-[280px] h-full overflow-y-auto">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white/80 hover:bg-red-400 hover:text-white text-gray-400 text-xs flex items-center justify-center shadow-sm transition-colors"
        >
          ✕
        </button>

        {/* 概览图 */}
        <div className="relative h-32 overflow-hidden">
          {marker.imageUrl ? (
            <img
              src={marker.imageUrl}
              alt={marker.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none"
                const p = e.currentTarget.parentElement
                if (p) p.style.background = IMAGE_GRADIENTS[marker.type] ?? IMAGE_GRADIENTS.spot
              }}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-3xl"
              style={{ background: IMAGE_GRADIENTS[marker.type] ?? IMAGE_GRADIENTS.spot }}
            >
              {marker.type === "spot" ? "🏛" : marker.type === "restaurant" ? "🍽" : "🏨"}
            </div>
          )}
          <span className="absolute bottom-2 left-2 px-2 py-0.5 text-[10px] font-medium bg-white/90 backdrop-blur-sm rounded-full text-gray-600 shadow-sm">
            {TYPE_LABELS[marker.type] ?? TYPE_LABELS.spot}
          </span>
        </div>

        {/* 内容区 */}
        <div className="p-3">
          {/* 名称 + 评分 */}
          <div className="flex items-start justify-between mb-1">
            <h4 className="text-sm font-semibold text-gray-900 leading-snug">{marker.name}</h4>
            {marker.rating != null && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 rounded shrink-0 ml-2">
                <span className="text-amber-500 text-[10px]">★</span>
                <span className="text-[10px] font-medium text-amber-700">{marker.rating}</span>
              </div>
            )}
          </div>

          {/* 简介 */}
          {marker.desc && (
            <p className="text-xs text-gray-500 leading-relaxed mb-2">{marker.desc}</p>
          )}

          {/* 标签 */}
          {marker.tags && marker.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {marker.tags.map((tag) => (
                <span key={tag} className="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-500">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* 深度内容 - 价格 + 距离 */}
          {(deepContent?.priceRange || deepContent?.distance) && (
            <div className="flex items-center gap-2 mb-2 text-[10px] text-gray-500">
              {deepContent.priceRange && <span>{deepContent.priceRange}</span>}
              {deepContent.priceRange && deepContent.distance && <span className="text-gray-300">|</span>}
              {deepContent.distance && <span>📍 {deepContent.distance}</span>}
            </div>
          )}

          {/* 深度内容 - 评价 */}
          <AnimatePresence>
            {deepContent?.reviews && deepContent.reviews.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-2 border-t border-gray-100 mb-2">
                  <p className="text-[10px] font-medium text-gray-600 mb-1.5">用户评价</p>
                  <div className="space-y-1.5">
                    {deepContent.reviews.map((r) => (
                      <div key={r.user} className="p-1.5 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-medium text-gray-700">@{r.user}</span>
                          <span className="text-[10px] text-amber-500">{"★".repeat(r.score)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">{r.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 深度内容 - 玩法列表 */}
          <AnimatePresence>
            {deepContent?.activities && deepContent.activities.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-[10px] font-medium text-gray-600 mb-1.5">🎯 玩法推荐 · 选一个加入行程</p>
                  <div className="space-y-1.5">
                    {deepContent.activities.map((act) => (
                      <button
                        key={act.id}
                        onClick={() => onActivityClick(act.id)}
                        className="w-full text-left p-2 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group"
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium text-gray-800 group-hover:text-indigo-700">
                            {act.title}
                          </span>
                          <span className="px-1 py-0.5 text-[9px] rounded-full bg-indigo-50 text-indigo-600">
                            {act.tag}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 mb-1">{act.desc}</p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
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

          {/* 探索按钮 */}
          {!hasDeep && (
            <button
              onClick={onExplore}
              className="w-full mt-2 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1"
            >
              {marker.type === "spot" ? "探索玩法" : marker.type === "restaurant" ? "查看评价" : "查看详情"}
              <span className="text-[10px]">→</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════
//  主组件：地图 + 内嵌 POI 面板
// ═══════════════════════════════════════════════
export default function MapView({ data, onInteract }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersLayer = useRef<L.LayerGroup | null>(null)
  const routeLayer = useRef<L.Polyline | null>(null)
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null)
  // 记录 deep content 对应的 marker id，切换标记时忽略旧内容
  const deepContentForRef = useRef<string | null>(null)

  const allMarkers = [...(data.markers ?? []), ...(data.extraMarkers ?? [])]
  const selectedMarker = selectedMarkerId ? allMarkers.find((m) => m.id === selectedMarkerId) : null

  // 当 poiDeepContent 更新时，记录它属于哪个标记
  useEffect(() => {
    if (data.poiDeepContent) {
      deepContentForRef.current = selectedMarkerId
    }
  }, [data.poiDeepContent])

  // 只有 deep content 的 marker 与当前选中的匹配时才显示
  const activeDeepContent =
    selectedMarkerId && deepContentForRef.current === selectedMarkerId
      ? data.poiDeepContent
      : undefined

  const handleMarkerClick = useCallback((markerId: string) => {
    setSelectedMarkerId((prev) => (prev === markerId ? null : markerId))
  }, [])

  // 初始化地图
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return
    const map = L.map(mapRef.current, {
      center: data.center,
      zoom: data.zoom,
      zoomControl: false,
    })
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: "",
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map)
    L.control.zoom({ position: "bottomright" }).addTo(map)
    mapInstance.current = map
    markersLayer.current = L.layerGroup().addTo(map)

    map.on("moveend", () => map.invalidateSize())
    map.on("zoomend", () => map.invalidateSize())
    setTimeout(() => map.invalidateSize(), 300)

    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(mapRef.current)

    return () => {
      observer.disconnect()
      map.remove()
      mapInstance.current = null
    }
  }, [])

  // 更新标记和路线
  useEffect(() => {
    const map = mapInstance.current
    const layer = markersLayer.current
    if (!map || !layer) return

    layer.clearLayers()
    if (routeLayer.current) {
      routeLayer.current.remove()
      routeLayer.current = null
    }

    allMarkers.forEach((m) => {
      const isHighlight = data.highlightSpot === m.id
      const isSelected = selectedMarkerId === m.id
      const icon = createIcon(m.type, isHighlight, isSelected)
      const marker = L.marker([m.lat, m.lng], { icon })
        .addTo(layer)
        .bindTooltip(m.name, { direction: "top", offset: [0, -16] })

      marker.on("click", () => handleMarkerClick(m.id))
    })

    // 画路线
    const spotMarkers = (data.markers ?? []).filter((m) => m.type === "spot")
    if (spotMarkers.length > 1) {
      const latlngs = spotMarkers.map((m) => [m.lat, m.lng] as [number, number])
      routeLayer.current = L.polyline(latlngs, {
        color: data.routeColor ?? "#6366f1",
        weight: 3,
        opacity: 0.6,
        dashArray: "8 8",
      }).addTo(map)
    }

    setTimeout(() => map.invalidateSize(), 100)
  }, [data, selectedMarkerId, handleMarkerClick])

  const stopDragPropagation = (e: React.DragEvent) => {
    e.stopPropagation()
    e.preventDefault()
  }

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 shrink-0 flex overflow-hidden relative"
      style={{ isolation: "isolate" }}
      onDragStart={stopDragPropagation}
      draggable={false}
    >
      {/* 地图区域 */}
      <div className="w-96 shrink-0 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-700">📍 路线地图</h3>
          <div className="flex gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" /> 景点</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 餐厅</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> 酒店</span>
          </div>
        </div>
        <div
          ref={mapRef}
          className="flex-1 min-h-[320px]"
          onDragStart={stopDragPropagation}
          draggable={false}
        />
      </div>

      {/* POI 面板 */}
      <AnimatePresence>
        {selectedMarker && (
          <PoiPanel
            key={selectedMarker.id}
            marker={selectedMarker}
            deepContent={activeDeepContent}
            onExplore={() => onInteract("explore")}
            onActivityClick={(actId) => onInteract(actId)}
            onClose={() => setSelectedMarkerId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
