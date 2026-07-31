import { useState, useRef, useCallback, useMemo, useEffect, useLayoutEffect } from "react"
import { useDrag } from "@use-gesture/react"
import { motion, AnimatePresence } from "framer-motion"
import type { ComponentInstance } from "../engine/types"
import registry, { COMPONENT_CATEGORIES } from "../components/registry"

// ─── 常量 ───
const MIN_SCALE = 0.3
const MAX_SCALE = 1.5
const SNAP_THRESHOLD = 6          // 对齐吸附阈值（画布像素）
const COLLISION_GAP = 8           // 碰撞后组件之间的最小间距
const AUTO_PLACE_GAP = 8          // 自动放置组件间距
const AUTO_PLACE_ORIGIN = { x: 40, y: 40 }

// ─── 类型 ───
type Position = { x: number; y: number }
type Camera = { x: number; y: number; scale: number }
type Size = { w: number; h: number }
type SizeCache = Map<string, Size>

type Guide = {
  axis: "x" | "y"
  pos: number
  from: number
  to: number
}

type DragInfo = {
  componentId: string
  startPos: Position
  currentPos: Position
  guides: Guide[]
}

type Props = {
  components: ComponentInstance[]
  onInteract: (componentId: string, value?: string) => void
  onClose: (componentId: string) => void
  onOrganize?: () => void
}

// ─── 碰撞检测：两个矩形是否重叠（含间距） ───
function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
  gap: number,
): boolean {
  return (
    ax < bx + bw + gap &&
    ax + aw + gap > bx &&
    ay < by + bh + gap &&
    ay + ah + gap > by
  )
}

// ─── 碰撞解决：推开重叠的组件 ───
// fixedIds 中的组件不会被推动；其余组件会被推到最近的不重叠位置
function resolveCollisions(
  allPositions: Map<string, Position>,
  fixedIds: Set<string>,
  sizes: SizeCache,
): Map<string, Position> {
  const result = new Map(allPositions)
  const ids = [...result.keys()]
  const MAX_ITER = 20

  for (let iter = 0; iter < MAX_ITER; iter++) {
    let anyPushed = false

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const idA = ids[i], idB = ids[j]
        const pA = result.get(idA)!, pB = result.get(idB)!
        const sA = sizes.get(idA) ?? { w: 384, h: 300 }
        const sB = sizes.get(idB) ?? { w: 384, h: 300 }

        if (!rectsOverlap(pA.x, pA.y, sA.w, sA.h, pB.x, pB.y, sB.w, sB.h, COLLISION_GAP)) {
          continue
        }

        // 决定推谁：fixed 的不动；都 fixed 或都不 fixed 时推后者
        let moveId: string, stayId: string
        if (fixedIds.has(idA) && !fixedIds.has(idB)) {
          moveId = idB; stayId = idA
        } else if (fixedIds.has(idB) && !fixedIds.has(idA)) {
          moveId = idA; stayId = idB
        } else {
          moveId = idB; stayId = idA
        }

        const mPos = result.get(moveId)!
        const sPos = result.get(stayId)!
        const mSz = sizes.get(moveId) ?? { w: 384, h: 300 }
        const sSz = sizes.get(stayId) ?? { w: 384, h: 300 }

        // 四个方向推开的目标位置及距离
        const options = [
          { x: sPos.x + sSz.w + COLLISION_GAP, y: mPos.y, d: Math.abs(sPos.x + sSz.w + COLLISION_GAP - mPos.x) },  // → 右
          { x: sPos.x - mSz.w - COLLISION_GAP, y: mPos.y, d: Math.abs(sPos.x - mSz.w - COLLISION_GAP - mPos.x) },  // ← 左
          { x: mPos.x, y: sPos.y + sSz.h + COLLISION_GAP, d: Math.abs(sPos.y + sSz.h + COLLISION_GAP - mPos.y) },  // ↓ 下
          { x: mPos.x, y: sPos.y - mSz.h - COLLISION_GAP, d: Math.abs(sPos.y - mSz.h - COLLISION_GAP - mPos.y) },  // ↑ 上
        ]
        options.sort((a, b) => a.d - b.d)

        result.set(moveId, { x: options[0].x, y: options[0].y })
        anyPushed = true
      }
    }

    if (!anyPushed) break
  }

  return result
}

// ─── 对齐检测 & 吸附 ───
function findGuidesAndSnap(
  dragId: string,
  rawPos: Position,
  positions: Map<string, Position>,
  sizes: SizeCache,
): { snappedPos: Position; guides: Guide[] } {
  const dragSize = sizes.get(dragId) ?? { w: 384, h: 300 }
  const guides: Guide[] = []
  let snapX: number | null = null
  let snapY: number | null = null

  const dragEdges = {
    left: rawPos.x,
    right: rawPos.x + dragSize.w,
    centerX: rawPos.x + dragSize.w / 2,
    top: rawPos.y,
    bottom: rawPos.y + dragSize.h,
    centerY: rawPos.y + dragSize.h / 2,
  }

  for (const [id, pos] of positions.entries()) {
    if (id === dragId) continue
    const sz = sizes.get(id) ?? { w: 384, h: 300 }
    const edges = {
      left: pos.x,
      right: pos.x + sz.w,
      centerX: pos.x + sz.w / 2,
      top: pos.y,
      bottom: pos.y + sz.h,
      centerY: pos.y + sz.h / 2,
    }

    const xPairs: [number, number][] = [
      [dragEdges.left, edges.left],
      [dragEdges.left, edges.right],
      [dragEdges.right, edges.left],
      [dragEdges.right, edges.right],
      [dragEdges.centerX, edges.centerX],
    ]
    for (const [dv, ev] of xPairs) {
      if (Math.abs(dv - ev) < SNAP_THRESHOLD) {
        if (snapX === null) snapX = ev - (dv - rawPos.x)
        const yMin = Math.min(rawPos.y, pos.y)
        const yMax = Math.max(rawPos.y + dragSize.h, pos.y + sz.h)
        guides.push({ axis: "x", pos: ev, from: yMin, to: yMax })
      }
    }

    const yPairs: [number, number][] = [
      [dragEdges.top, edges.top],
      [dragEdges.top, edges.bottom],
      [dragEdges.bottom, edges.top],
      [dragEdges.bottom, edges.bottom],
      [dragEdges.centerY, edges.centerY],
    ]
    for (const [dv, ev] of yPairs) {
      if (Math.abs(dv - ev) < SNAP_THRESHOLD) {
        if (snapY === null) snapY = ev - (dv - rawPos.y)
        const xMin = Math.min(rawPos.x, pos.x)
        const xMax = Math.max(rawPos.x + dragSize.w, pos.x + sz.w)
        guides.push({ axis: "y", pos: ev, from: xMin, to: xMax })
      }
    }
  }

  return {
    snappedPos: { x: snapX ?? rawPos.x, y: snapY ?? rawPos.y },
    guides,
  }
}

// ═══════════════════════════════════════════════════
//  可拖拽组件卡片
// ═══════════════════════════════════════════════════
function CanvasCard({
  comp,
  pos,
  camera,
  isDragging,
  dragCurrentPos,
  onClose,
  onInteract,
  onDragStart,
  onDragMove,
  onDragEnd,
  onMeasure,
}: {
  comp: ComponentInstance
  pos: Position
  camera: Camera
  isDragging: boolean
  dragCurrentPos: Position | null
  onClose: (id: string) => void
  onInteract: (id: string, value?: string) => void
  onDragStart: (id: string) => void
  onDragMove: (dx: number, dy: number) => void
  onDragEnd: () => void
  onMeasure: (id: string, el: HTMLDivElement | null) => void
}) {
  const Component = registry[comp.type]
  const cardRef = useRef<HTMLDivElement | null>(null)

  // 监听组件尺寸变化（如地图内嵌 POI 面板展开/收起），实时重新测量以触发碰撞重算
  useLayoutEffect(() => {
    const el = cardRef.current
    if (!el) return
    onMeasure(comp.id, el)
    const observer = new ResizeObserver(() => onMeasure(comp.id, el))
    observer.observe(el)
    return () => observer.disconnect()
  }, [comp.id, onMeasure])

  const bindDrag = useDrag(
    ({ movement: [mx, my], first, last, event }) => {
      event?.stopPropagation()
      if (first) onDragStart(comp.id)
      onDragMove(mx / camera.scale, my / camera.scale)
      if (last) onDragEnd()
    },
    { pointer: { touch: true } },
  )

  const displayPos = isDragging && dragCurrentPos ? dragCurrentPos : pos

  if (!Component) {
    return (
      <div
        ref={cardRef}
        className="absolute p-4 bg-red-50 rounded-xl text-red-500 text-sm"
        style={{ left: displayPos.x, top: displayPos.y }}
      >
        未知组件: {comp.type}
      </div>
    )
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{
        opacity: isDragging ? 0.88 : 1,
        scale: 1,
        left: displayPos.x,
        top: displayPos.y,
      }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={
        isDragging
          ? { left: { duration: 0 }, top: { duration: 0 }, opacity: { duration: 0.15 } }
          : { type: "spring", damping: 28, stiffness: 340 }
      }
      className="absolute group"
      style={{
        zIndex: isDragging ? 100 : 1,
        boxShadow: isDragging ? "0 20px 40px rgba(0,0,0,0.18)" : undefined,
      }}
    >
      {/* 关闭按钮 */}
      <button
        onClick={() => onClose(comp.id)}
        className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-gray-200 hover:bg-red-400 hover:text-white text-gray-500 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
      >
        ✕
      </button>

      {/* 拖拽手柄 */}
      <div
        {...bindDrag()}
        className="absolute top-2 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing px-4 py-1.5"
        style={{ touchAction: "none" }}
      >
        <div className="flex gap-0.5">
          <div className="w-1 h-1 rounded-full bg-gray-300" />
          <div className="w-1 h-1 rounded-full bg-gray-300" />
          <div className="w-1 h-1 rounded-full bg-gray-300" />
        </div>
      </div>

      <Component
        data={comp.data}
        onInteract={(...args: unknown[]) =>
          onInteract(comp.id, args[0] as string | undefined)
        }
      />
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════
//  主组件：自由画布工作区
// ═══════════════════════════════════════════════════
export default function Workspace({ components, onInteract, onClose, onOrganize }: Props) {
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: 1 })
  // 只存用户手动拖拽过的位置；未拖拽的组件位置在渲染时动态计算
  const [draggedPositions, setDraggedPositions] = useState<Map<string, Position>>(new Map())
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null)
  const [measureVersion, setMeasureVersion] = useState(0)
  const viewportRef = useRef<HTMLDivElement>(null)
  const sizesRef = useRef<SizeCache>(new Map())
  const isDraggingRef = useRef(false)
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef<{ mx: number; my: number; camX: number; camY: number } | null>(null)

  // 组件渲染后测量尺寸
  const handleMeasure = useCallback((id: string, el: HTMLDivElement | null) => {
    if (!el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    const prev = sizesRef.current.get(id)
    if (prev && prev.w === w && prev.h === h) return
    sizesRef.current.set(id, { w, h })
    setMeasureVersion((v) => v + 1)
  }, [])

  // 清理已删除组件的缓存
  useEffect(() => {
    const currentIds = new Set(components.map((c) => c.id))
    for (const id of sizesRef.current.keys()) {
      if (!currentIds.has(id)) sizesRef.current.delete(id)
    }
    setDraggedPositions((prev) => {
      let changed = false
      for (const id of prev.keys()) {
        if (!currentIds.has(id)) { changed = true; break }
      }
      if (!changed) return prev
      const next = new Map(prev)
      for (const id of next.keys()) {
        if (!currentIds.has(id)) next.delete(id)
      }
      return next
    })
  }, [components])

  // ─── 计算所有组件位置：按创建顺序从左到右排列，新组件在最右 ───
  const positions = useMemo(() => {
    const result = new Map<string, Position>()

    // 按数组顺序（= 创建顺序）从左往右水平排列
    // 已手动拖拽的组件保持手动位置，但仍占据其原本的水平槽位以便后续组件接续
    let cursorX = AUTO_PLACE_ORIGIN.x
    for (const comp of components) {
      const sz = sizesRef.current.get(comp.id) ?? { w: 384, h: 300 }
      const dragged = draggedPositions.get(comp.id)
      if (dragged) {
        result.set(comp.id, dragged)
      } else {
        result.set(comp.id, { x: cursorX, y: AUTO_PLACE_ORIGIN.y })
      }
      cursorX += sz.w + AUTO_PLACE_GAP + 24
    }

    // 碰撞解决
    const fixedIds = new Set(draggedPositions.keys())
    return resolveCollisions(result, fixedIds, sizesRef.current)
  }, [components, draggedPositions, measureVersion])

  // ─── 画布缩放 & 平移 ───
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (isDraggingRef.current) return

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      setCamera((cam) => {
        const rect = viewportRef.current?.getBoundingClientRect()
        if (!rect) return cam
        const px = e.clientX - rect.left
        const py = e.clientY - rect.top
        const delta = -e.deltaY * 0.002
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, cam.scale + delta))
        const ratio = newScale / cam.scale
        return {
          x: px - (px - cam.x) * ratio,
          y: py - (py - cam.y) * ratio,
          scale: newScale,
        }
      })
    } else {
      setCamera((cam) => ({
        ...cam,
        x: cam.x - e.deltaX,
        y: cam.y - e.deltaY,
      }))
    }
  }, [])

  // ─── 鼠标拖拽平移画布（在空白处按下） ───
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    // 只响应画布空白区域的左键；组件卡片会 stopPropagation
    if (e.button !== 0) return
    if (isDraggingRef.current) return
    panStartRef.current = {
      mx: e.clientX,
      my: e.clientY,
      camX: camera.x,
      camY: camera.y,
    }
    setIsPanning(true)
  }, [camera.x, camera.y])

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    const start = panStartRef.current
    if (!start) return
    setCamera((cam) => ({
      ...cam,
      x: start.camX + (e.clientX - start.mx),
      y: start.camY + (e.clientY - start.my),
    }))
  }, [])

  const handlePanEnd = useCallback(() => {
    panStartRef.current = null
    setIsPanning(false)
  }, [])

  // ─── 拖拽回调 ───
  const handleDragStart = useCallback(
    (componentId: string) => {
      isDraggingRef.current = true
      const startPos = positions.get(componentId)
      if (!startPos) return
      setDragInfo({
        componentId,
        startPos,
        currentPos: startPos,
        guides: [],
      })
    },
    [positions],
  )

  const handleDragMove = useCallback(
    (dx: number, dy: number) => {
      setDragInfo((prev) => {
        if (!prev) return null
        const rawPos = {
          x: prev.startPos.x + dx,
          y: prev.startPos.y + dy,
        }
        const { snappedPos, guides } = findGuidesAndSnap(
          prev.componentId,
          rawPos,
          positions,
          sizesRef.current,
        )
        return { ...prev, currentPos: snappedPos, guides }
      })
    },
    [positions],
  )

  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false
    if (dragInfo) {
      const droppedId = dragInfo.componentId
      const droppedPos = dragInfo.currentPos

      // 计算落点后的完整位置表，然后解决碰撞
      const allPos = new Map(positions)
      allPos.set(droppedId, droppedPos)
      const fixedIds = new Set([droppedId]) // 刚放下的组件不动
      const resolved = resolveCollisions(allPos, fixedIds, sizesRef.current)

      // 把被推开的组件也记录为手动位置
      setDraggedPositions((prev) => {
        const next = new Map(prev)
        next.set(droppedId, droppedPos)
        for (const [id, newPos] of resolved) {
          const oldPos = allPos.get(id)
          if (oldPos && (newPos.x !== oldPos.x || newPos.y !== oldPos.y)) {
            next.set(id, newPos)
          }
        }
        return next
      })
    }
    setDragInfo(null)
  }, [dragInfo, positions])

  // ─── 缩放控件 ───
  const zoomTo = useCallback((newScale: number) => {
    setCamera((cam) => {
      const rect = viewportRef.current?.getBoundingClientRect()
      if (!rect) return { ...cam, scale: newScale }
      const cx = rect.width / 2
      const cy = rect.height / 2
      const ratio = newScale / cam.scale
      return {
        x: cx - (cx - cam.x) * ratio,
        y: cy - (cy - cam.y) * ratio,
        scale: newScale,
      }
    })
  }, [])

  const resetView = useCallback(() => {
    setCamera({ x: 0, y: 0, scale: 1 })
  }, [])

  // ─── 一键整理：移除过程组件 + 重置辅助组件位置 ───
  const handleOrganize = useCallback(() => {
    onOrganize?.()
    // 重置辅助组件的手动拖拽位置，让它们回归自动排列
    setDraggedPositions((prev) => {
      const next = new Map<string, Position>()
      for (const [id, pos] of prev) {
        const comp = components.find((c) => c.id === id)
        if (comp && COMPONENT_CATEGORIES[comp.type] === "plan") {
          next.set(id, pos) // 保留 PlanNotebook 的手动位置
        }
      }
      return next
    })
  }, [onOrganize, components])

  // 是否有过程态组件（决定是否显示整理按钮）
  const hasProcessComponents = components.some((c) => {
    const cat = COMPONENT_CATEGORIES[c.type]
    return cat !== "plan" && cat !== "auxiliary"
  })

  // ─── 空态 ───
  if (components.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-300 canvas-grid">
        <div className="text-center">
          <div className="text-5xl mb-4">✨</div>
          <p className="text-lg font-light">在左侧对话中开始你的规划</p>
          <p className="text-sm mt-1">组件将在这里动态生成</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={viewportRef}
      className="flex-1 relative overflow-hidden canvas-grid select-none"
      style={{ cursor: isPanning ? "grabbing" : "grab" }}
      onWheel={handleWheel}
      onMouseDown={handlePanStart}
      onMouseMove={handlePanMove}
      onMouseUp={handlePanEnd}
      onMouseLeave={handlePanEnd}
    >
      {/* 画布层 */}
      <div
        className="absolute top-0 left-0 origin-top-left w-[10000px] h-[10000px]"
        style={{
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
          willChange: "transform",
        }}
      >
        {/* 对齐辅助线 */}
        {dragInfo?.guides.map((g, i) =>
          g.axis === "x" ? (
            <div
              key={`g${i}`}
              className="absolute w-px pointer-events-none"
              style={{
                left: g.pos,
                top: g.from - 20,
                height: g.to - g.from + 40,
                background: "linear-gradient(to bottom, transparent, #818cf8, transparent)",
              }}
            />
          ) : (
            <div
              key={`g${i}`}
              className="absolute h-px pointer-events-none"
              style={{
                top: g.pos,
                left: g.from - 20,
                width: g.to - g.from + 40,
                background: "linear-gradient(to right, transparent, #818cf8, transparent)",
              }}
            />
          ),
        )}

        {/* 组件 */}
        <AnimatePresence>
          {components.map((comp) => {
            const pos = positions.get(comp.id)
            if (!pos) return null
            const isDragging = dragInfo?.componentId === comp.id
            return (
              <CanvasCard
                key={comp.id}
                comp={comp}
                pos={pos}
                camera={camera}
                isDragging={isDragging}
                dragCurrentPos={isDragging ? dragInfo.currentPos : null}
                onClose={onClose}
                onInteract={onInteract}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                onMeasure={handleMeasure}
              />
            )
          })}
        </AnimatePresence>
      </div>

      {/* 缩放控件 */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 px-2 py-1.5 z-50">
        <button
          onClick={() => zoomTo(Math.max(MIN_SCALE, camera.scale - 0.15))}
          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors text-sm"
        >
          −
        </button>
        <button
          onClick={resetView}
          className="px-2 h-7 flex items-center justify-center text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors min-w-[3rem]"
        >
          {Math.round(camera.scale * 100)}%
        </button>
        <button
          onClick={() => zoomTo(Math.min(MAX_SCALE, camera.scale + 0.15))}
          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors text-sm"
        >
          +
        </button>
      </div>

      {/* 一键整理按钮 */}
      {hasProcessComponents && onOrganize && (
        <button
          onClick={handleOrganize}
          className="absolute bottom-4 left-4 flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 text-sm text-gray-600 hover:text-indigo-600 hover:border-indigo-300 hover:shadow-md transition-all z-50"
        >
          <span>✨</span>
          一键整理
        </button>
      )}
    </div>
  )
}
