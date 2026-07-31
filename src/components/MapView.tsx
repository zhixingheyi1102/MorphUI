import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { renderToStaticMarkup } from "react-dom/server"
import { MapPin, ForkKnife, Buildings, Bank, Target, Timer, Train, City, Lightbulb, Plus, Minus } from "@phosphor-icons/react"
import * as maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"

// ─── 类型 ───
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

type NearbyItem = {
  label: string
  value: string
}

type DeepContent = {
  activities?: Activity[]
  reviews?: Review[]
  priceRange?: string
  distance?: string
  // 距离导向内容
  nearby?: NearbyItem[]
  access?: string
  view?: string
  // 舒适度导向内容
  images?: string[]
  // 针对该点位本身的自问自答，点击后在卡片内展开答案
  qa?: { id: string; q: string; a: string }[]
}

type Marker = {
  id: string
  name: string
  lat: number
  lng: number
  type: "spot" | "restaurant" | "hotel"
  day?: string
  // 已从行程中移出：图钉保留（可再点/再加回），但路线不再经过它
  offRoute?: boolean
  rating?: number
  stars?: number
  desc?: string
  imageUrl?: string
  tags?: string[]
  deepContent?: DeepContent
}

type Props = {
  data: {
    center: [number, number]
    zoom: number
    markers: Marker[]
    extraMarkers?: Marker[]
    routeColor?: string
    highlightSpot?: string
    activeDay?: string
    // 当前真实在行程里的点位 id（由 useChat 根据行程内容注入），用于 POI 卡按钮状态
    itinerarySpotIds?: string[]
  }
  onInteract: (value: string) => void
}

// ─── 常量 ───
const MARKER_COLORS: Record<string, string> = {
  spot: "#6366f1",
  restaurant: "#f59e0b",
  hotel: "#10b981",
}

// 每天一个颜色，用于区分不同天的景点与路线
const DAY_COLORS: Record<string, string> = {
  day1: "#6366f1", // 靛蓝
  day2: "#ec4899", // 玫红
  day3: "#0ea5e9", // 天蓝
  day4: "#f97316", // 橙
}
const DIM_COLOR = "#c7cbd1" // 非当前天置灰色

const DAY_LABELS: Record<string, string> = {
  day1: "Day 1", day2: "Day 2", day3: "Day 3", day4: "Day 4",
}

function dayColor(day?: string) {
  return (day && DAY_COLORS[day]) || DAY_COLORS.day1
}

const MARKER_ICONS: Record<string, typeof MapPin> = {
  spot: MapPin,
  restaurant: ForkKnife,
  hotel: Buildings,
}

const TYPE_META: Record<string, { Icon: typeof MapPin; label: string }> = {
  spot: { Icon: MapPin, label: "景点" },
  restaurant: { Icon: ForkKnife, label: "餐厅" },
  hotel: { Icon: Buildings, label: "酒店" },
}

// POI 面板按类型取纸张色：景点 cream / 餐厅 sage / 酒店 blue
const POI_PAPER: Record<string, string> = {
  spot: "var(--paper-cream)",
  restaurant: "var(--paper-sage)",
  hotel: "var(--paper-blue)",
}

const IMAGE_GRADIENTS: Record<string, string> = {
  spot: "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 50%, #a5b4fc 100%)",
  restaurant: "linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fbbf24 100%)",
  hotel: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 50%, #6ee7b7 100%)",
}

// ─── LANDUSE 海报风配色（取自地图交互案例.html） ───
const C = {
  park: "#69A83F", garden: "#8FC97A", greenery: "#CFE7BA", wood: "#52805F",
  water: "#4295CC", wetland: "#6BA893", residential: "#EAE2DC", commercial: "#F8CBD3",
  industrial: "#E5D3EE", farmland: "#B3A82C", infra: "#EDEBE8", public: "#E75FA0",
  religious: "#F09CB0", recreation: "#9BCB86", special: "#C9D0CF", building: "#F3AEBE",
  buildingLine: "#E890A6", road: "#FFFFFF", roadCasing: "#E6DDD6", rail: "#D9CFC9",
  label: "#6B5E63", paper: "#F7F4F1",
}

// ─── MapLibre 自定义矢量样式：LANDUSE 土地利用配色 ───
const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    openmaptiles: { type: "vector", url: "https://tiles.openfreemap.org/planet" },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": C.paper } },
    { id: "residential", type: "fill", source: "openmaptiles", "source-layer": "landuse",
      filter: ["match", ["get", "class"], ["residential", "suburb", "neighbourhood"], true, false],
      paint: { "fill-color": C.residential } },
    { id: "farmland", type: "fill", source: "openmaptiles", "source-layer": "landcover",
      filter: ["match", ["get", "class"], ["farmland"], true, false],
      paint: { "fill-color": C.farmland, "fill-opacity": 0.55 } },
    { id: "commercial", type: "fill", source: "openmaptiles", "source-layer": "landuse",
      filter: ["match", ["get", "class"], ["commercial", "retail"], true, false],
      paint: { "fill-color": C.commercial, "fill-opacity": 0.9 } },
    { id: "industrial", type: "fill", source: "openmaptiles", "source-layer": "landuse",
      filter: ["match", ["get", "class"], ["industrial", "garages", "quarry"], true, false],
      paint: { "fill-color": C.industrial, "fill-opacity": 0.85 } },
    { id: "infra", type: "fill", source: "openmaptiles", "source-layer": "landuse",
      filter: ["match", ["get", "class"], ["railway"], true, false],
      paint: { "fill-color": C.infra } },
    { id: "special", type: "fill", source: "openmaptiles", "source-layer": "landuse",
      filter: ["match", ["get", "class"], ["military"], true, false],
      paint: { "fill-color": C.special, "fill-opacity": 0.8 } },
    { id: "public", type: "fill", source: "openmaptiles", "source-layer": "landuse",
      filter: ["match", ["get", "class"], ["hospital"], true, false],
      paint: { "fill-color": C.public, "fill-opacity": 0.65 } },
    { id: "religious-edu", type: "fill", source: "openmaptiles", "source-layer": "landuse",
      filter: ["match", ["get", "class"], ["school", "college", "university", "kindergarten"], true, false],
      paint: { "fill-color": C.religious, "fill-opacity": 0.55 } },
    { id: "recreation", type: "fill", source: "openmaptiles", "source-layer": "landuse",
      filter: ["match", ["get", "class"], ["stadium", "pitch", "track", "playground", "theme_park", "zoo"], true, false],
      paint: { "fill-color": C.recreation, "fill-opacity": 0.85 } },
    { id: "cemetery", type: "fill", source: "openmaptiles", "source-layer": "landuse",
      filter: ["match", ["get", "class"], ["cemetery"], true, false],
      paint: { "fill-color": C.garden, "fill-opacity": 0.7 } },
    { id: "greenery", type: "fill", source: "openmaptiles", "source-layer": "landcover",
      filter: ["match", ["get", "class"], ["grass"], true, false],
      paint: { "fill-color": C.greenery, "fill-opacity": 0.85 } },
    { id: "wood", type: "fill", source: "openmaptiles", "source-layer": "landcover",
      filter: ["match", ["get", "class"], ["wood"], true, false],
      paint: { "fill-color": C.wood, "fill-opacity": 0.85 } },
    { id: "wetland", type: "fill", source: "openmaptiles", "source-layer": "landcover",
      filter: ["match", ["get", "class"], ["wetland"], true, false],
      paint: { "fill-color": C.wetland, "fill-opacity": 0.8 } },
    { id: "park", type: "fill", source: "openmaptiles", "source-layer": "park",
      paint: { "fill-color": C.park, "fill-opacity": 0.75 } },
    { id: "water", type: "fill", source: "openmaptiles", "source-layer": "water",
      paint: { "fill-color": C.water } },
    { id: "waterway", type: "line", source: "openmaptiles", "source-layer": "waterway",
      paint: { "line-color": C.water, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.8, 16, 3.5] } },
    { id: "building", type: "fill", source: "openmaptiles", "source-layer": "building", minzoom: 13,
      paint: { "fill-color": C.building, "fill-outline-color": C.buildingLine,
               "fill-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0.35, 15, 0.95] } },
    { id: "road-casing", type: "line", source: "openmaptiles", "source-layer": "transportation",
      filter: ["match", ["get", "class"], ["motorway", "trunk", "primary", "secondary"], true, false],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": C.roadCasing, "line-width": ["interpolate", ["exponential", 1.4], ["zoom"], 10, 2.4, 16, 14] } },
    { id: "road-minor", type: "line", source: "openmaptiles", "source-layer": "transportation",
      filter: ["match", ["get", "class"], ["tertiary", "minor", "service", "street", "residential"], true, false],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": C.road, "line-width": ["interpolate", ["exponential", 1.4], ["zoom"], 11, 0.6, 16, 5] } },
    { id: "road-major", type: "line", source: "openmaptiles", "source-layer": "transportation",
      filter: ["match", ["get", "class"], ["motorway", "trunk", "primary", "secondary"], true, false],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": C.road, "line-width": ["interpolate", ["exponential", 1.4], ["zoom"], 10, 1.6, 16, 11] } },
    { id: "rail", type: "line", source: "openmaptiles", "source-layer": "transportation",
      filter: ["match", ["get", "class"], ["rail", "transit"], true, false],
      paint: { "line-color": C.rail, "line-dasharray": [3, 2], "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.8, 16, 2.2] } },
    { id: "boundary", type: "line", source: "openmaptiles", "source-layer": "boundary",
      filter: ["<=", ["get", "admin_level"], 6],
      paint: { "line-color": "#CBB6BE", "line-dasharray": [4, 3], "line-width": 1 } },
    { id: "place-label", type: "symbol", source: "openmaptiles", "source-layer": "place",
      filter: ["match", ["get", "class"], ["city", "town", "suburb"], true, false],
      layout: {
        "text-field": ["coalesce", ["get", "name:zh"], ["get", "name"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 10, 11, 14, 14],
      },
      paint: { "text-color": C.label, "text-halo-color": "#FFFFFF", "text-halo-width": 1.4 } },
  ],
}

// ═══════════════════════════════════════════════
//  上海地标建筑素材（试点：外滩 + 陆家嘴）
//  LOD 规则：z < LOD_SPLIT 显示聚合态（建筑群合集图），z ≥ LOD_SPLIT 拆成单体
// ═══════════════════════════════════════════════
const LOD_SPLIT = 13

type BuildingPoi = {
  id: string
  name: string
  lngLat: [number, number] // [lng, lat]
  img: string
  baseH: number // zoom=14 时的显示高度 px
  minZoom: number
  maxZoom: number
}

const BUILDING_POIS: BuildingPoi[] = [
  // —— 聚合态（缩小看全城时）——真实 POI 质心
  { id: "b-lujiazui", name: "陆家嘴", lngLat: [121.5002, 31.2379], img: "/buildings/lujiazui-cluster.png", baseH: 200, minZoom: 0, maxZoom: LOD_SPLIT },
  { id: "b-bund-rep", name: "外滩", lngLat: [121.4856, 31.2386], img: "/buildings/customs-house.png", baseH: 120, minZoom: 0, maxZoom: LOD_SPLIT },
  // —— 单体态（放大看街区时）——坐标来自 OSM Nominatim 真实 POI
  { id: "b-pearl", name: "东方明珠", lngLat: [121.49526, 31.24195], img: "/buildings/oriental-pearl.png", baseH: 92, minZoom: LOD_SPLIT, maxZoom: 99 },
  { id: "b-shtower", name: "上海中心", lngLat: [121.50125, 31.23564], img: "/buildings/shanghai-tower.png", baseH: 100, minZoom: LOD_SPLIT, maxZoom: 99 },
  { id: "b-jinmao", name: "金茂大厦", lngLat: [121.50142, 31.23725], img: "/buildings/jinmao.png", baseH: 84, minZoom: LOD_SPLIT, maxZoom: 99 },
  { id: "b-swfc", name: "环球金融中心", lngLat: [121.50304, 31.23658], img: "/buildings/swfc.png", baseH: 88, minZoom: LOD_SPLIT, maxZoom: 99 },
  { id: "b-customs", name: "海关大楼", lngLat: [121.48564, 31.23864], img: "/buildings/customs-house.png", baseH: 62, minZoom: LOD_SPLIT, maxZoom: 99 },
  { id: "b-peace", name: "和平饭店", lngLat: [121.48461, 31.24113], img: "/buildings/peace-hotel.png", baseH: 66, minZoom: LOD_SPLIT, maxZoom: 99 },
  { id: "b-waibaidu", name: "外白渡桥", lngLat: [121.48574, 31.24531], img: "/buildings/waibaidu-bridge.png", baseH: 44, minZoom: LOD_SPLIT, maxZoom: 99 },
]

// 建筑随 zoom 等比例缩放（每级 zoom 尺寸 ×2，zoom=14 为 baseH）；
// 但锚定 POI 点大小作为下限：缩小到再远也保持和 POI 圆点（28~36px）同级的可见尺寸
const BUILDING_MIN_H = 40
function buildingHeight(baseH: number, zoom: number) {
  return Math.max(baseH * Math.pow(2, zoom - 14), BUILDING_MIN_H)
}

// 手绘路线：在锚点间插值 + 垂直方向确定性抖动，模拟钢笔运笔
function handDrawnPath(pts: [number, number][], segs = 10, amp = 0.00022): [number, number][] {
  const out: [number, number][] = []
  let seed = 7
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280) - 0.5
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    const dx = x2 - x1, dy = y2 - y1
    const len = Math.hypot(dx, dy) || 1
    for (let j = 0; j < segs; j++) {
      const t = j / segs
      const ease = Math.sin(Math.PI * t) // 两端钉死在锚点上
      const off = rnd() * 2 * amp * ease
      out.push([x1 + dx * t + (-dy / len) * off, y1 + dy * t + (dx / len) * off])
    }
  }
  out.push(pts[pts.length - 1])
  return out
}

// 试点路线：外滩一路走到陆家嘴三高楼
const BRUSH_ROUTE: [number, number][] = [
  [121.48564, 31.23864], // 海关大楼
  [121.48461, 31.24113], // 和平饭店
  [121.48574, 31.24531], // 外白渡桥
  [121.49526, 31.24195], // 东方明珠
  [121.50142, 31.23725], // 金茂
  [121.50304, 31.23658], // 环球金融
  [121.50125, 31.23564], // 上海中心
]
const BRUSH_INK = "#32476B" // 复古海军蓝墨

// ─── 标记 DOM 元素（MapLibre 用 HTMLElement 作为 marker） ───
function createMarkerEl(
  type: string,
  highlight = false,
  selected = false,
  colorOverride?: string,
  dimmed = false,
): HTMLElement {
  const color = colorOverride ?? MARKER_COLORS[type] ?? "#6366f1"
  const Icon = MARKER_ICONS[type] ?? MapPin
  const size = highlight || selected ? 36 : 28
  const ring = selected ? `border: 3px solid white; box-shadow: 0 0 0 2px ${color}, 0 4px 12px ${color}88;` : ""
  const el = document.createElement("div")
  el.style.cssText = `
    width:${size}px; height:${size}px;
    display:flex; align-items:center; justify-content:center;
    background:${color}; border-radius:50%;
    color:white;
    box-shadow: 0 2px 8px ${color}66;
    opacity:${dimmed ? 0.4 : 1};
    cursor:pointer;
    ${ring}
    ${highlight && !selected ? "animation: pulse 1.5s infinite;" : ""}
    transition: all 0.2s ease;
  `
  el.innerHTML = renderToStaticMarkup(<Icon size={size * 0.55} weight="fill" color="white" />)
  return el
}

// ═══════════════════════════════════════════════
//  POI 面板（内嵌在地图右侧）
// ═══════════════════════════════════════════════
function PoiPanel({
  marker,
  explored,
  inItinerary,
  onExplore,
  onActivityClick,
  onAddToItinerary,
  onRemoveFromItinerary,
  onClose,
}: {
  marker: Marker
  explored: boolean
  inItinerary: boolean
  onExplore: () => void
  onActivityClick: (actId: string) => void
  onAddToItinerary: () => void
  onRemoveFromItinerary: () => void
  onClose: () => void
}) {
  const deep = marker.deepContent
  // 卡片内展开的问答（点击某个问题在卡片里显示答案，不发到对话框）
  const [openQaId, setOpenQaId] = useState<string | null>(null)
  const showDeep = explored && deep
  // 玩法仍靠"探索"触发（驱动剧本）；评价/图片/周边信息默认展示
  const hasActivities = showDeep && deep.activities && deep.activities.length > 0
  const hasReviews = deep && deep.reviews && deep.reviews.length > 0
  const hasNearby = deep && deep.nearby && deep.nearby.length > 0
  const hasImages = deep && deep.images && deep.images.length > 0
  const hasActivitiesBtn = deep && deep.activities && deep.activities.length > 0
  const hasQa = deep && deep.qa && deep.qa.length > 0
  const openQa = hasQa ? deep!.qa!.find((x) => x.id === openQaId) : undefined

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 280, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 340 }}
      className="shrink-0 overflow-hidden"
      style={{ borderLeft: "1px solid var(--ink-line)", background: POI_PAPER[marker.type] ?? POI_PAPER.spot, fontFamily: "var(--font-cn)", color: "var(--ink)" }}
    >
      <div className="w-[280px] max-h-[640px] overflow-y-auto">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full text-xs flex items-center justify-center transition-colors"
          style={{ background: "rgba(255,255,255,0.8)", color: "var(--ink-soft)", border: "1px solid var(--ink-line)", boxShadow: "var(--z1)" }}
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
              className="w-full h-full flex items-center justify-center"
              style={{ background: IMAGE_GRADIENTS[marker.type] ?? IMAGE_GRADIENTS.spot, color: "var(--ink-soft)" }}
            >
              {marker.type === "spot" ? <Bank size={32} weight="duotone" /> : marker.type === "restaurant" ? <ForkKnife size={32} weight="duotone" /> : <Buildings size={32} weight="duotone" />}
            </div>
          )}
          <span
            className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 font-medium rounded-full"
            style={{ fontSize: "var(--fs-caption)", background: "rgba(255,255,255,0.9)", color: "var(--ink-soft)", boxShadow: "var(--z1)" }}
          >
            {(() => {
              const { Icon, label } = TYPE_META[marker.type] ?? TYPE_META.spot
              return <><Icon size={13} weight="fill" /> {label}</>
            })()}
          </span>
        </div>

        {/* 内容区 */}
        <div className="p-3">
          {/* 名称 + 评分 */}
          <div className="flex items-start justify-between mb-1">
            <div>
              <h4 className="font-semibold leading-snug" style={{ fontSize: "var(--fs-body)", color: "var(--ink)" }}>{marker.name}</h4>
              {marker.stars != null && (
                <div className="mt-0.5 tracking-wide" style={{ fontSize: "var(--fs-caption)", color: "var(--metal-brass)" }}>
                  {"★".repeat(marker.stars)}
                  <span style={{ color: "var(--ink-line)" }}>{"★".repeat(Math.max(0, 5 - marker.stars))}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {marker.rating != null && (
                <div
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(255,255,255,0.5)", border: "1px solid var(--ink-line)" }}
                >
                  <span style={{ fontSize: "var(--fs-caption)", color: "var(--metal-brass)" }}>★</span>
                  <span className="font-medium" style={{ fontSize: "var(--fs-caption)", color: "var(--ink)" }}>{marker.rating}</span>
                </div>
              )}
              {/* 加入 / 移出行程（纯图标切换；加入交给模型排期，移出就地把该点移出路线） */}
              <button
                onClick={inItinerary ? onRemoveFromItinerary : onAddToItinerary}
                className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:brightness-105"
                style={{
                  color: inItinerary ? "var(--ink-soft)" : "var(--paper-cream)",
                  background: inItinerary ? "rgba(255,255,255,0.6)" : "var(--stamp-red)",
                  border: inItinerary ? "1px solid var(--ink-line)" : "none",
                }}
                title={inItinerary ? "从行程中去掉" : "加入行程"}
                aria-label={inItinerary ? "从行程中去掉" : "加入行程"}
              >
                {inItinerary ? <Minus size={14} weight="bold" /> : <Plus size={14} weight="bold" />}
              </button>
            </div>
          </div>

          {/* 简介 */}
          {marker.desc && (
            <p className="leading-relaxed mb-2" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>{marker.desc}</p>
          )}

          {/* 标签 */}
          {marker.tags && marker.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {marker.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 rounded-full"
                  style={{ fontSize: "var(--fs-caption)", background: "rgba(255,255,255,0.45)", color: "var(--ink-soft)", border: "1px solid var(--ink-line)" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}


          {/* 价格 + 距离 */}
          {deep && (deep.priceRange || deep.distance) && (
            <div className="flex items-center gap-2 mb-2" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>
              {deep.priceRange && <span className="font-medium" style={{ color: "var(--ink)" }}>{deep.priceRange}</span>}
              {deep.priceRange && deep.distance && <span style={{ color: "var(--ink-line)" }}>|</span>}
              {deep.distance && <span className="inline-flex items-center gap-1"><MapPin size={13} /> {deep.distance}</span>}
            </div>
          )}

          {/* 距离导向内容 - 周边距离（无需探索即展示） */}
          {hasNearby && (
            <div className="mb-2 space-y-1">
              {deep!.nearby!.map((n) => (
                <div key={n.label} className="flex items-center justify-between" style={{ fontSize: "var(--fs-caption)" }}>
                  <span style={{ color: "var(--ink-soft)" }}>{n.label}</span>
                  <span className="font-medium" style={{ color: "var(--ink)" }}>{n.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* 距离导向内容 - 交通 / 景色 */}
          {deep?.access && (
            <div className="flex items-start gap-1.5 mb-1.5" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>
              <Train className="shrink-0 mt-0.5" size={14} />
              <span className="leading-relaxed">{deep.access}</span>
            </div>
          )}
          {deep?.view && (
            <div className="flex items-start gap-1.5 mb-2" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>
              <City className="shrink-0 mt-0.5" size={14} />
              <span className="leading-relaxed">{deep.view}</span>
            </div>
          )}

          {/* 舒适度导向内容 - 图片墙（探索后展开） */}
          <AnimatePresence>
            {hasImages && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-2 mb-2">
                  <div className="grid grid-cols-2 gap-1.5">
                    {deep!.images!.map((src, i) => (
                      <div
                        key={i}
                        className="aspect-[4/3] overflow-hidden"
                        style={{ borderRadius: "var(--r-paper)", background: "var(--paper-oat)" }}
                      >
                        <img
                          src={src}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none"
                            const p = e.currentTarget.parentElement
                            if (p) p.style.background = IMAGE_GRADIENTS.hotel
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 深度内容 - 评价 */}
          <AnimatePresence>
            {hasReviews && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-2 mb-2" style={{ borderTop: "1px solid var(--ink-line)" }}>
                  <p className="font-medium mb-1.5" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>用户评价</p>
                  <div className="space-y-1.5">
                    {deep!.reviews!.map((r) => (
                      <div key={r.user} className="p-1.5 rounded" style={{ background: "rgba(255,255,255,0.45)" }}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-medium" style={{ fontSize: "var(--fs-caption)", color: "var(--ink)" }}>@{r.user}</span>
                          <span style={{ fontSize: "var(--fs-caption)", color: "var(--metal-brass)" }}>{"★".repeat(r.score)}</span>
                        </div>
                        <p style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>{r.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 深度内容 - 玩法列表 */}
          <AnimatePresence>
            {hasActivities && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-2" style={{ borderTop: "1px solid var(--ink-line)" }}>
                  <p className="flex items-center gap-1 font-medium mb-1.5" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}><Target size={13} weight="fill" /> 玩法推荐 · 选一个加入行程</p>
                  <div className="space-y-1.5">
                    {deep!.activities!.map((act) => (
                      <button
                        key={act.id}
                        onClick={() => onActivityClick(act.id)}
                        className="w-full text-left p-2 transition-all hover:brightness-105"
                        style={{ borderRadius: "var(--r-paper)", border: "1px solid var(--ink-line)", background: "rgba(255,255,255,0.4)" }}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-medium" style={{ fontSize: "var(--fs-data)", color: "var(--ink)" }}>
                            {act.title}
                          </span>
                          <span className="px-1 py-0.5 rounded-full" style={{ fontSize: "9px", background: "var(--paper-oat)", color: "var(--ink-soft)" }}>
                            {act.tag}
                          </span>
                        </div>
                        <p className="mb-1" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>{act.desc}</p>
                        <div className="flex items-center gap-2" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>
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

          {/* 了解这里：探索玩法 + 关于本点位的问题，样式统一为同一排 chip */}
          {(hasActivitiesBtn || hasQa) && (
            <div className="mt-3 pt-2.5" style={{ borderTop: "1px solid var(--ink-line)" }}>
              <p className="mb-1.5" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>了解这里</p>
              <div className="flex flex-wrap gap-1.5">
                {/* 探索玩法（未展开时作为一枚 chip，与问题同一定位） */}
                {hasActivitiesBtn && !explored && (
                  <button
                    onClick={onExplore}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full transition-colors hover:brightness-105"
                    style={{ fontSize: "var(--fs-caption)", border: "1px solid var(--ink-blue)", color: "var(--ink-blue)", background: "rgba(255,255,255,0.4)" }}
                  >
                    <Lightbulb size={13} weight="fill" /> 探索玩法
                  </button>
                )}
                {/* 关于本点位的问题：点击在卡片内展开答案，不发到对话框 */}
                {hasQa && deep!.qa!.map((item) => {
                  const active = openQaId === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setOpenQaId(active ? null : item.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full transition-colors hover:brightness-105"
                      style={{
                        fontSize: "var(--fs-caption)",
                        border: "1px solid var(--ink-blue)",
                        color: active ? "var(--paper-cream)" : "var(--ink-blue)",
                        background: active ? "var(--ink-blue)" : "rgba(255,255,255,0.4)",
                      }}
                    >
                      <Lightbulb size={13} weight="fill" /> {item.q}
                    </button>
                  )
                })}
              </div>

              {/* 卡片内答案区（点问题后就地展开） */}
              <AnimatePresence>
                {openQa && (
                  <motion.div
                    key={openQa.id}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="mt-2 p-2.5 leading-relaxed"
                      style={{ fontSize: "var(--fs-caption)", color: "var(--ink)", background: "rgba(255,255,255,0.5)", border: "1px solid var(--ink-line)", borderRadius: "var(--r-paper)" }}
                    >
                      {openQa.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
  const mapInstance = useRef<maplibregl.Map | null>(null)
  const mapReady = useRef(false)
  const markerObjs = useRef<maplibregl.Marker[]>([])
  const buildingMarkers = useRef<{ poi: BuildingPoi; marker: maplibregl.Marker; img: HTMLImageElement }[]>([])
  const routeSourceIds = useRef<string[]>([])
  const prevMarkerIds = useRef<Set<string> | null>(null)
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null)
  const [exploredMarkerIds, setExploredMarkerIds] = useState<Set<string>>(new Set())
  const [addedMarkerIds, setAddedMarkerIds] = useState<Set<string>>(new Set())
  const [styleVersion, setStyleVersion] = useState(0)

  const allMarkers = [...(data.markers ?? []), ...(data.extraMarkers ?? [])]
  const selectedMarker = selectedMarkerId ? allMarkers.find((m) => m.id === selectedMarkerId) : null

  // 出现过的天（有序去重），用于顶部图例
  const dayLegend = Array.from(
    new Set((data.markers ?? []).filter((m) => m.type === "spot" && m.day).map((m) => m.day as string))
  )

  const handleMarkerClick = useCallback((markerId: string) => {
    setSelectedMarkerId((prev) => (prev === markerId ? null : markerId))
  }, [])

  const handleExplore = useCallback((markerId: string) => {
    setExploredMarkerIds((prev) => new Set(prev).add(markerId))
  }, [])

  // 真实"是否在行程中"：以行程内容注入的 id 为准；叠加本次会话乐观加入的 id
  const itinerarySet = useMemo(
    () => new Set([...(data.itinerarySpotIds ?? []), ...addedMarkerIds]),
    [data.itinerarySpotIds, addedMarkerIds]
  )

  // 点"加入行程"：乐观标记为已加入（按钮立即切换），并交给模型决定放到哪一天
  const handleAddToItinerary = useCallback((markerId: string) => {
    setAddedMarkerIds((prev) => new Set(prev).add(markerId))
    onInteract(`addspot:${markerId}`)
  }, [onInteract])

  // 点"从行程中去掉"：乐观移除，交给 useChat 就地把该点移出行程与路线并重算
  const handleRemoveFromItinerary = useCallback((markerId: string) => {
    setAddedMarkerIds((prev) => {
      if (!prev.has(markerId)) return prev
      const next = new Set(prev)
      next.delete(markerId)
      return next
    })
    onInteract(`removespot:${markerId}`)
  }, [onInteract])

  // 初始化地图
  // 关键：组件挂载时正处于 framer-motion 入场动画 + 画布 transform 中，容器尺寸可能为 0，
  // 此时创建 MapLibre 会读到 0×0 而永远不请求正确视口的瓦片（表现为全白）。
  // 因此先用 ResizeObserver 等到容器有真实尺寸再创建，之后再监听尺寸变化做 resize。
  useEffect(() => {
    const container = mapRef.current
    if (!container) return

    let map: maplibregl.Map | null = null
    let disposed = false

    const createMap = () => {
      if (map || disposed || !mapRef.current) return
      map = new maplibregl.Map({
        container: mapRef.current,
        style: MAP_STYLE,
        center: [data.center[1], data.center[0]], // scenario 用 [lat,lng]，MapLibre 用 [lng,lat]
        zoom: data.zoom,
        minZoom: 9,
        maxZoom: 17.5,
        attributionControl: false,
      })
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right")
      mapInstance.current = map

      map.on("load", () => {
        mapReady.current = true
        map!.resize()
        setStyleVersion((v) => v + 1) // 触发标记/路线渲染
      })
      map.on("error", (e) => {
        console.warn("[MapView] maplibre error:", e && e.error)
      })
    }

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      const w = rect?.width ?? container.clientWidth
      const h = rect?.height ?? container.clientHeight
      if (w > 0 && h > 0) {
        if (!map) createMap()
        else map.resize()
      }
    })
    observer.observe(container)

    // 若挂载时已经有尺寸（无入场动画的场景）立即创建
    if (container.clientWidth > 0 && container.clientHeight > 0) createMap()

    return () => {
      disposed = true
      observer.disconnect()
      if (map) map.remove()
      mapInstance.current = null
      mapReady.current = false
    }
  }, [])

  // ─── 建筑素材挂载 + 手绘路线（试点：外滩+陆家嘴）───
  useEffect(() => {
    const map = mapInstance.current
    if (!map || !mapReady.current) return

    // 手绘笔触路线：水彩晕染底 + 钢笔墨线两层
    const routeData: GeoJSON.Feature = {
      type: "Feature", properties: {},
      geometry: { type: "LineString", coordinates: handDrawnPath(BRUSH_ROUTE) },
    }
    if (!map.getSource("brush-route")) {
      map.addSource("brush-route", { type: "geojson", data: routeData })
      map.addLayer({
        id: "brush-route-halo", type: "line", source: "brush-route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": BRUSH_INK, "line-opacity": 0.13,
          "line-width": ["interpolate", ["linear"], ["zoom"], 11, 5, 16, 15],
        },
      })
      map.addLayer({
        id: "brush-route-ink", type: "line", source: "brush-route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": BRUSH_INK, "line-opacity": 0.72,
          "line-width": ["interpolate", ["linear"], ["zoom"], 11, 1.6, 16, 3.4],
        },
      })
    }

    // 建筑 marker：图片底部对齐坐标点，随 zoom 连续缩放 + LOD 显隐
    if (buildingMarkers.current.length === 0) {
      for (const poi of BUILDING_POIS) {
        const el = document.createElement("div")
        el.style.cssText = "pointer-events:none;"
        const img = document.createElement("img")
        img.src = poi.img
        img.alt = poi.name
        img.draggable = false
        img.style.cssText = `
          display:block;
          filter: drop-shadow(0 3px 4px rgba(43,43,43,0.22));
          transition: opacity .35s ease, transform .35s ease;
          transform-origin: bottom center;
        `
        el.appendChild(img)
        const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat(poi.lngLat)
          .addTo(map)
        buildingMarkers.current.push({ poi, marker, img })
      }
    }

    const applyLod = () => {
      const z = map.getZoom()
      for (const { poi, img } of buildingMarkers.current) {
        const visible = z >= poi.minZoom && z < poi.maxZoom
        img.style.height = `${Math.round(buildingHeight(poi.baseH, z))}px`
        img.style.width = "auto"
        img.style.opacity = visible ? "1" : "0"
        img.style.transform = visible ? "scale(1)" : "scale(0.82)"
      }
    }
    applyLod()
    map.on("zoom", applyLod)
    return () => { map.off("zoom", applyLod) }
  }, [styleVersion])

  // 更新标记和路线
  useEffect(() => {
    const map = mapInstance.current
    if (!map || !mapReady.current) return

    // 清除旧标记
    for (const mk of markerObjs.current) mk.remove()
    markerObjs.current = []
    // 清除旧路线图层与数据源
    for (const id of routeSourceIds.current) {
      if (map.getLayer(id)) map.removeLayer(id)
      if (map.getSource(id)) map.removeSource(id)
    }
    routeSourceIds.current = []

    // 是否有分天信息（任一 spot 带 day 字段才启用双色联动）
    const hasDays = (data.markers ?? []).some((m) => m.type === "spot" && m.day)
    const activeDay = data.activeDay

    // 画路线：按天分组，每天一条线；当前天用本天颜色高亮，其它天置灰
    // 先加路线（在标记 DOM 之下），再加标记
    // offRoute 的点位图钉保留但不参与连线（已从行程移出）
    const spotMarkers = (data.markers ?? []).filter((m) => m.type === "spot" && !m.offRoute)
    const addRoute = (id: string, coords: [number, number][], color: string, width: number, opacity: number) => {
      map.addSource(id, {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } },
      })
      map.addLayer({
        id, type: "line", source: id,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": color, "line-width": width, "line-opacity": opacity, "line-dasharray": [2, 2] },
      })
      routeSourceIds.current.push(id)
    }

    if (hasDays) {
      const byDay = new Map<string, Marker[]>()
      for (const m of spotMarkers) {
        const d = m.day ?? "day1"
        if (!byDay.has(d)) byDay.set(d, [])
        byDay.get(d)!.push(m)
      }
      // 先画非当前天（置灰），再画当前天，保证当前天路线在最上层
      const entries = [...byDay.entries()].sort(([a], [b]) => {
        const aActive = activeDay == null || a === activeDay
        const bActive = activeDay == null || b === activeDay
        return Number(aActive) - Number(bActive)
      })
      for (const [d, spots] of entries) {
        if (spots.length < 2) continue
        const isActive = activeDay == null || d === activeDay
        const coords = spots.map((m) => [m.lng, m.lat] as [number, number])
        // 当前天用本天颜色高亮，其它天统一置灰（切换 Day 时旧路线变灰）
        addRoute(
          `route-${d}`, coords,
          isActive ? dayColor(d) : DIM_COLOR,
          isActive ? 3.5 : 2,
          isActive ? 0.85 : 0.45,
        )
      }
    } else if (spotMarkers.length > 1) {
      const coords = spotMarkers.map((m) => [m.lng, m.lat] as [number, number])
      addRoute("route-all", coords, data.routeColor ?? "#6366f1", 3, 0.6)
    }

    // 标记
    allMarkers.forEach((m) => {
      const isHighlight = data.highlightSpot === m.id
      const isSelected = selectedMarkerId === m.id
      // 景点按天着色（非当前天保留本天颜色，仅略微淡化）。非景点（餐厅/酒店）保持原色
      let colorOverride: string | undefined
      let dimmed = false
      if (hasDays && m.type === "spot") {
        const isActiveDay = activeDay == null || m.day === activeDay
        // 当前天用本天颜色，其它天置灰并淡化，和路线保持一致
        colorOverride = isActiveDay ? dayColor(m.day) : DIM_COLOR
        dimmed = !isActiveDay
      }
      const el = createMarkerEl(m.type, isHighlight, isSelected, colorOverride, dimmed)
      el.title = m.name
      el.addEventListener("click", (ev) => {
        ev.stopPropagation()
        handleMarkerClick(m.id)
      })
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([m.lng, m.lat])
        .addTo(map)
      markerObjs.current.push(marker)
    })

    // 有新地点出现时，平移/缩放地图让所有地点（含新出现的）都进入视野
    const currentIds = new Set(allMarkers.map((m) => m.id))
    const prev = prevMarkerIds.current
    const hasNew = prev == null || [...currentIds].some((id) => !prev.has(id))
    prevMarkerIds.current = currentIds

    if (hasNew && allMarkers.length > 0) {
      if (allMarkers.length === 1) {
        map.easeTo({ center: [allMarkers[0].lng, allMarkers[0].lat], zoom: Math.max(map.getZoom(), 14), duration: 600 })
      } else {
        const bounds = new maplibregl.LngLatBounds()
        for (const m of allMarkers) bounds.extend([m.lng, m.lat])
        map.fitBounds(bounds, { padding: 40, maxZoom: 15, duration: 600 })
      }
    }
  }, [data, selectedMarkerId, handleMarkerClick, styleVersion])

  const stopDragPropagation = (e: React.DragEvent) => {
    e.stopPropagation()
    e.preventDefault()
  }

  // 阻止地图内的鼠标/指针按下冒泡到工作台，避免拖地图时画布也被平移
  const stopPointerPropagation = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation()
  }

  return (
    <div
      className="shrink-0 flex items-start overflow-hidden relative"
      style={{
        isolation: "isolate",
        background: "var(--paper-map)",
        border: "1px solid var(--ink-line)",
        borderRadius: "var(--r-sticker)",
        boxShadow: "var(--z1)",
        fontFamily: "var(--font-cn)",
      }}
      onDragStart={stopDragPropagation}
      draggable={false}
    >
      {/* 地图区域（固定高度，不随 POI 卡片长度变化） */}
      <div className="w-96 shrink-0 flex flex-col h-[420px]">
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--ink-line)" }}>
          <h3 className="flex items-center gap-1 font-medium" style={{ fontSize: "var(--fs-data)", color: "var(--ink)" }}><MapPin size={15} weight="fill" /> 路线地图</h3>
          <div className="flex gap-3" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>
            {dayLegend.length > 0 ? (
              dayLegend.map((d) => {
                const active = data.activeDay == null || data.activeDay === d
                return (
                  <span key={d} className={`flex items-center gap-1 ${active ? "" : "opacity-40"}`}>
                    <span className="w-2 h-2 rounded-full" style={{ background: dayColor(d) }} />
                    {DAY_LABELS[d] ?? d}
                  </span>
                )
              })
            ) : (
              <>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: MARKER_COLORS.spot }} /> 景点</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: MARKER_COLORS.restaurant }} /> 餐厅</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: MARKER_COLORS.hotel }} /> 酒店</span>
              </>
            )}
          </div>
        </div>
        <div className="flex-1 min-h-[320px] relative">
          <div
            ref={mapRef}
            style={{ position: "absolute", inset: 0 }}
            onDragStart={stopDragPropagation}
            onMouseDown={stopPointerPropagation}
            onPointerDown={stopPointerPropagation}
            draggable={false}
          />
          {/* 老地图边框：内双细线 + 四角墨线 + 纸质晕影，不挡交互 */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              zIndex: 5,
              boxShadow: "inset 0 0 0 1px rgba(50,71,107,0.28), inset 0 0 46px rgba(122,92,58,0.14)",
            }}
          >
            <div
              className="absolute"
              style={{ inset: 7, border: "1px solid rgba(50,71,107,0.22)" }}
            />
            {(["lt", "rt", "lb", "rb"] as const).map((c) => (
              <span
                key={c}
                className="absolute"
                style={{
                  width: 14, height: 14,
                  top: c[1] === "t" ? 4 : undefined,
                  bottom: c[1] === "b" ? 4 : undefined,
                  left: c[0] === "l" ? 4 : undefined,
                  right: c[0] === "r" ? 4 : undefined,
                  borderTop: c[1] === "t" ? `2px solid ${"#32476B"}` : undefined,
                  borderBottom: c[1] === "b" ? `2px solid ${"#32476B"}` : undefined,
                  borderLeft: c[0] === "l" ? `2px solid ${"#32476B"}` : undefined,
                  borderRight: c[0] === "r" ? `2px solid ${"#32476B"}` : undefined,
                  opacity: 0.55,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* POI 面板 */}
      <AnimatePresence>
        {selectedMarker && (
          <PoiPanel
            key={selectedMarker.id}
            marker={selectedMarker}
            explored={exploredMarkerIds.has(selectedMarker.id)}
            inItinerary={itinerarySet.has(selectedMarker.id)}
            onExplore={() => handleExplore(selectedMarker.id)}
            onActivityClick={(actId) => onInteract(actId)}
            onAddToItinerary={() => handleAddToItinerary(selectedMarker.id)}
            onRemoveFromItinerary={() => handleRemoveFromItinerary(selectedMarker.id)}
            onClose={() => setSelectedMarkerId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
