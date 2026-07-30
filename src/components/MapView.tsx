import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

type Marker = {
  id: string
  name: string
  lat: number
  lng: number
  type: "spot" | "restaurant" | "hotel"
  rating?: number
  stars?: number
}

type Props = {
  data: {
    center: [number, number]
    zoom: number
    markers: Marker[]
    extraMarkers?: Marker[]
    routeColor?: string
    highlightSpot?: string
  }
  onInteract: (markerId: string) => void
}

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

function createIcon(type: string, highlight = false) {
  const color = MARKER_COLORS[type] ?? "#6366f1"
  const emoji = MARKER_ICONS[type] ?? "📍"
  const size = highlight ? 36 : 28
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width:${size}px; height:${size}px;
      display:flex; align-items:center; justify-content:center;
      background:${color}; border-radius:50%;
      color:white; font-size:${size * 0.5}px;
      box-shadow: 0 2px 8px ${color}66;
      ${highlight ? "animation: pulse 1.5s infinite;" : ""}
    ">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export default function MapView({ data, onInteract }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersLayer = useRef<L.LayerGroup | null>(null)
  const routeLayer = useRef<L.Polyline | null>(null)

  // 初始化地图
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return
    const map = L.map(mapRef.current, {
      center: data.center,
      zoom: data.zoom,
      zoomControl: false,
    })
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "",
      maxZoom: 19,
    }).addTo(map)
    L.control.zoom({ position: "bottomright" }).addTo(map)
    mapInstance.current = map
    markersLayer.current = L.layerGroup().addTo(map)

    // 延迟 invalidateSize 确保瓦片加载完整
    setTimeout(() => map.invalidateSize(), 200)

    // 监听容器尺寸变化，自动刷新瓦片
    const observer = new ResizeObserver(() => {
      map.invalidateSize()
    })
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

    const allMarkers = [...(data.markers ?? []), ...(data.extraMarkers ?? [])]

    allMarkers.forEach((m) => {
      const isHighlight = data.highlightSpot === m.id
      const icon = createIcon(m.type, isHighlight)
      const marker = L.marker([m.lat, m.lng], { icon })
        .addTo(layer)
        .bindTooltip(m.name, { direction: "top", offset: [0, -16] })

      marker.on("click", () => onInteract(m.id))
    })

    // 画路线（只连 spot 类型的标记）
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

    // 数据更新后刷新一下瓦片
    setTimeout(() => map.invalidateSize(), 100)
  }, [data, onInteract])

  // 阻止地图区域的 drag 事件冒泡到父级（防止拖拽组件时把地图也拖走）
  const stopDragPropagation = (e: React.DragEvent) => {
    e.stopPropagation()
    e.preventDefault()
  }

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-96 shrink-0"
      onDragStart={stopDragPropagation}
      draggable={false}
    >
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
        className="h-80"
        onDragStart={stopDragPropagation}
        draggable={false}
      />
    </div>
  )
}
