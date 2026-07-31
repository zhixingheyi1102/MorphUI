import { useState, useRef, useCallback, useMemo, useEffect, useLayoutEffect } from "react"
import { useDrag } from "@use-gesture/react"
import { motion, AnimatePresence } from "framer-motion"
import type { ComponentInstance } from "../engine/types"
import registry, { COMPONENT_CATEGORIES } from "../components/registry"
import PlanFolder from "./PlanFolder"

// ─── 常量 ───
const MIN_SCALE = 0.3
const MAX_SCALE = 1.5
const SNAP_THRESHOLD = 6          // 对齐吸附阈值（画布像素）
const COLLISION_GAP = 8           // 碰撞后组件之间的最小间距
const AUTO_PLACE_GAP = 8          // 自动放置组件间距
const AUTO_PLACE_ORIGIN = { x: 40, y: 40 }
const BINDER_GRID_GAP = 24        // 整理模式右侧组件网格间距
const TIDY_COL_GAP = 40           // 方案与右侧网格之间的间距
const MIN_RESIZE = 0.4            // 组件缩放下限
const MAX_RESIZE = 3              // 组件缩放上限

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

// 组件生成中占位卡的类型标签
const GENERATING_LABELS: Record<string, string> = {
  clarify_form: "偏好表单",
  itinerary: "行程方案",
  plan_notebook: "行程方案",
  map_view: "路线地图",
  budget_tracker: "预算概览",
  flight_list: "航班列表",
  checklist: "待办清单",
}

// ─── 类型 ───
type Position = { x: number; y: number }
type Camera = { x: number; y: number; scale: number }
type Size = { w: number; h: number }
type SizeCache = Map<string, Size>
// 组件横纵缩放比例（CSS transform scale）
type Scale = { sx: number; sy: number }
// 缩放把手方向：4 边（单轴）+ 4 角（对角线）
type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw"
type ResizeInfo = {
  componentId: string
  dir: ResizeDir
  startScale: Scale
  startPos: Position
  base: Size            // 组件未缩放时的原始测量尺寸
  currentScale: Scale
  currentPos: Position
}

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

// ─── 整理布局：方案放左侧，其余组件在右侧自适应网格聚拢铺开 ───
function computeTidyLayout(
  planId: string | null,
  rightIds: string[],
  sizes: SizeCache,
): Map<string, Position> {
  const positions = new Map<string, Position>()
  const sizeOf = (id: string) => sizes.get(id) ?? { w: 384, h: 300 }

  const ox = AUTO_PLACE_ORIGIN.x
  const oy = AUTO_PLACE_ORIGIN.y

  // 左侧：方案本
  const planSize = planId ? sizeOf(planId) : { w: 0, h: 0 }
  if (planId) positions.set(planId, { x: ox, y: oy })
  const leftW = planId ? planSize.w : 360

  // 右侧：自适应网格（列宽取右侧组件最大宽；1 个组件单列，否则双列）
  const gridStartX = ox + leftW + TIDY_COL_GAP
  const gridStartY = oy

  const colW = rightIds.length > 0
    ? Math.max(...rightIds.map((id) => sizeOf(id).w))
    : 320
  const ncols = rightIds.length <= 1 ? 1 : 2

  // 瀑布流：每次放入当前最矮的列
  const colBottoms = Array.from({ length: ncols }, () => gridStartY)
  for (const id of rightIds) {
    let col = 0
    for (let c = 1; c < ncols; c++) {
      if (colBottoms[c] < colBottoms[col]) col = c
    }
    const x = gridStartX + col * (colW + BINDER_GRID_GAP)
    const y = colBottoms[col]
    positions.set(id, { x, y })
    colBottoms[col] = y + sizeOf(id).h + BINDER_GRID_GAP
  }

  return positions
}

// ─── 视觉尺寸 = 原始尺寸 × 缩放比；供碰撞/对齐/活页本布局使用 ───
function buildVisualSizes(base: SizeCache, scales: Map<string, Scale>): SizeCache {
  const out = new Map<string, Size>()
  for (const [id, sz] of base) {
    const sc = scales.get(id)
    out.set(id, sc ? { w: sz.w * sc.sx, h: sz.h * sc.sy } : sz)
  }
  return out
}

// ─── 8 个缩放把手：hit 为透明命中区（贴边/贴角），nub 为鼠标靠近该区时才浮现的小把手 ───
const RESIZE_HANDLES: Array<{ dir: ResizeDir; hit: string; nub: string; cursor: string }> = [
  { dir: "n", hit: "top-0 left-0 right-0 h-3 -translate-y-1/2", nub: "w-8 h-1.5", cursor: "ns-resize" },
  { dir: "s", hit: "bottom-0 left-0 right-0 h-3 translate-y-1/2", nub: "w-8 h-1.5", cursor: "ns-resize" },
  { dir: "e", hit: "right-0 top-0 bottom-0 w-3 translate-x-1/2", nub: "w-1.5 h-8", cursor: "ew-resize" },
  { dir: "w", hit: "left-0 top-0 bottom-0 w-3 -translate-x-1/2", nub: "w-1.5 h-8", cursor: "ew-resize" },
  { dir: "nw", hit: "top-0 left-0 w-5 h-5 -translate-x-1/2 -translate-y-1/2", nub: "w-3 h-3", cursor: "nwse-resize" },
  { dir: "ne", hit: "top-0 right-0 w-5 h-5 translate-x-1/2 -translate-y-1/2", nub: "w-3 h-3", cursor: "nesw-resize" },
  { dir: "sw", hit: "bottom-0 left-0 w-5 h-5 -translate-x-1/2 translate-y-1/2", nub: "w-3 h-3", cursor: "nesw-resize" },
  { dir: "se", hit: "bottom-0 right-0 w-5 h-5 translate-x-1/2 translate-y-1/2", nub: "w-3 h-3", cursor: "nwse-resize" },
]

// 单个缩放把手（内部用 useDrag；抽成组件以免在 map 里调用 Hook）
function ResizeHandle({
  dir, hit, nub, cursor, cameraScale, onResizeStart, onResizeMove, onResizeEnd,
}: {
  dir: ResizeDir
  hit: string
  nub: string
  cursor: string
  cameraScale: number
  onResizeStart: (dir: ResizeDir) => void
  onResizeMove: (dir: ResizeDir, dx: number, dy: number) => void
  onResizeEnd: () => void
}) {
  const bind = useDrag(
    ({ movement: [mx, my], first, last, event }) => {
      event?.stopPropagation()
      if (first) onResizeStart(dir)
      onResizeMove(dir, mx / cameraScale, my / cameraScale)
      if (last) onResizeEnd()
    },
    { pointer: { touch: true } },
  )
  return (
    <div
      {...bind()}
      className={`absolute z-20 flex items-center justify-center group/rz ${hit}`}
      style={{ cursor, touchAction: "none" }}
    >
      <div
        className={`rounded-sm opacity-0 group-hover/rz:opacity-100 transition-opacity ${nub}`}
        style={{
          background: "var(--paper-cream)",
          border: "1px solid var(--ink-blue)",
          boxShadow: "var(--z1)",
        }}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════
//  可拖拽 + 可缩放组件卡片
// ═══════════════════════════════════════════════════
function CanvasCard({
  comp,
  pos,
  camera,
  scale,
  baseSize,
  isDragging,
  dragCurrentPos,
  organized,
  dockedComponents,
  dockableCount,
  onClose,
  onInteract,
  onDragStart,
  onDragMove,
  onDragEnd,
  onMeasure,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
}: {
  comp: ComponentInstance
  pos: Position
  camera: Camera
  scale: Scale
  baseSize: Size | undefined
  isDragging: boolean
  dragCurrentPos: Position | null
  organized: boolean
  dockedComponents: ComponentInstance[]
  dockableCount: number
  onClose: (id: string) => void
  onInteract: (id: string, value?: string) => void
  onDragStart: (id: string) => void
  onDragMove: (dx: number, dy: number) => void
  onDragEnd: () => void
  onMeasure: (id: string, el: HTMLDivElement | null) => void
  onResizeStart: (id: string, dir: ResizeDir) => void
  onResizeMove: (dir: ResizeDir, dx: number, dy: number) => void
  onResizeEnd: () => void
}) {
  const Component = registry[comp.type]
  const cardRef = useRef<HTMLDivElement | null>(null)
  const innerRef = useRef<HTMLDivElement | null>(null)

  // 测量“未缩放”的内容原始尺寸（transform 不影响 offsetWidth/Height）
  // 用它 + scale 推导出视觉尺寸，供碰撞/对齐/活页本布局使用
  useLayoutEffect(() => {
    const el = innerRef.current
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

  // 视觉尺寸 = 原始尺寸 × 缩放比；未测量前用 auto，避免首帧闪动
  const boxW = baseSize ? baseSize.w * scale.sx : undefined
  const boxH = baseSize ? baseSize.h * scale.sy : undefined
  const scaled = scale.sx !== 1 || scale.sy !== 1

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

  // 生成中占位：完整数据到达前先呈现骨架卡，避免"等生成完才蹦出来"
  if (comp.data?.__generating) {
    return (
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1, left: displayPos.x, top: displayPos.y }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ type: "spring", damping: 28, stiffness: 340 }}
        className="absolute"
        style={{ zIndex: 2, filter: "drop-shadow(0 1px 2px rgba(24,20,14,0.20))" }}
      >
        <div
          className="w-80 p-4 overflow-hidden"
          style={{
            background: "var(--paper-cream)",
            border: "1px solid var(--ink-line)",
            borderRadius: "var(--r-sticker)",
          }}
        >
          <div className="flex items-center gap-2 mb-3" style={{ color: "var(--ink-soft)" }}>
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ background: "var(--ink-soft)", animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
            <span style={{ fontSize: "var(--fs-caption)", fontFamily: "var(--font-cn)" }}>
              正在生成{GENERATING_LABELS[comp.type] ?? "组件"}…
            </span>
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-3 mb-2 rounded shimmer"
              style={{ width: `${[90, 70, 82, 55][i]}%` }}
            />
          ))}
        </div>
      </motion.div>
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
        zIndex: isDragging ? 100 : 2,
        filter: isDragging
          ? "drop-shadow(0 14px 30px rgba(24,20,14,0.30))"
          : "drop-shadow(0 1px 2px rgba(24,20,14,0.20))",
        rotate: isDragging ? "1.1deg" : "0deg",
      }}
    >
      {/* 尺寸盒：显式宽高 = 视觉尺寸，让把手贴合缩放后的边缘 */}
      <div className="relative" style={{ width: boxW, height: boxH }}>
        {/* 关闭按钮 */}
        <button
          onClick={() => onClose(comp.id)}
          className="absolute -top-2 -right-2 z-30 w-6 h-6 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background: "var(--paper-manila)",
            color: "var(--ink-soft)",
            boxShadow: "var(--z1)",
            border: "1px solid var(--ink-line)",
          }}
        >
          ✕
        </button>

        {/* 拖拽手柄 */}
        <div
          {...bindDrag()}
          className="absolute top-2 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing px-4 py-1.5"
          style={{ touchAction: "none" }}
        >
          <div className="flex gap-0.5">
            <div className="w-1 h-1 rounded-full" style={{ background: "var(--ink-line)" }} />
            <div className="w-1 h-1 rounded-full" style={{ background: "var(--ink-line)" }} />
            <div className="w-1 h-1 rounded-full" style={{ background: "var(--ink-line)" }} />
          </div>
        </div>

        {/* 缩放把手：4 边单轴 + 4 角对角线 */}
        {RESIZE_HANDLES.map((h) => (
          <ResizeHandle
            key={h.dir}
            dir={h.dir}
            hit={h.hit}
            nub={h.nub}
            cursor={h.cursor}
            cameraScale={camera.scale}
            onResizeStart={(dir) => onResizeStart(comp.id, dir)}
            onResizeMove={onResizeMove}
            onResizeEnd={onResizeEnd}
          />
        ))}

        {/* 内容层：以左上角为基准做 scaleX/scaleY 视觉缩放 */}
        <div
          ref={innerRef}
          style={{
            width: "max-content",
            transform: scaled ? `scale(${scale.sx}, ${scale.sy})` : undefined,
            transformOrigin: "top left",
          }}
        >
          {COMPONENT_CATEGORIES[comp.type] === "plan" ? (
            /* 方案组件 → 文件夹形态（合拢封套 / 展开两页），收纳组件渲染进右页 */
            <PlanFolder
              planId={comp.id}
              data={comp.data}
              dockedComponents={dockedComponents}
              dockableCount={dockableCount}
              organized={organized}
              onInteract={onInteract}
            />
          ) : (
            <Component
              data={comp.data}
              onInteract={(...args: unknown[]) =>
                onInteract(comp.id, args[0] as string | undefined)
              }
            />
          )}
        </div>
      </div>
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
  const [organized, setOrganized] = useState(false)
  const panStartRef = useRef<{ mx: number; my: number; camX: number; camY: number } | null>(null)
  // 每个组件的横纵缩放比例（用户拖拽边缘缩放后写入）
  const [scales, setScales] = useState<Map<string, Scale>>(new Map())
  const resizeRef = useRef<ResizeInfo | null>(null)

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
    setScales((prev) => {
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

  // ─── 文件夹收纳：dockedIds 存在方案组件 data 上；被收纳的组件不在画布上单独渲染 ───
  const { visibleComponents, dockedComponents } = useMemo(() => {
    const plan = components.find((c) => COMPONENT_CATEGORIES[c.type] === "plan")
    const docked = new Set(
      (((plan?.data.dockedIds as string[] | undefined) ?? [])).filter((id) => id !== plan?.id)
    )
    return {
      visibleComponents: components.filter((c) => !docked.has(c.id)),
      dockedComponents: components.filter((c) => docked.has(c.id)),
    }
  }, [components])

  // 画布上还能被收纳的组件数（auxiliary/process），驱动合拢态标签的 "+n" 引导
  const dockableCount = useMemo(
    () =>
      visibleComponents.filter((c) => {
        const cat = COMPONENT_CATEGORIES[c.type]
        return cat === "auxiliary" || cat === "process"
      }).length,
    [visibleComponents]
  )

  // ─── 计算所有组件位置 ───
  // 自由模式：按创建顺序从左到右排列；整理模式：方案在左，其余在右侧网格聚拢
  const positions = useMemo(() => {
    // 布局使用视觉尺寸（原始尺寸 × 缩放比），缩放后的组件占用正确空间
    const visualSizes = buildVisualSizes(sizesRef.current, scales)

    // ── 整理模式：聚拢排布 ──
    if (organized) {
      const planComp = visibleComponents.find((c) => COMPONENT_CATEGORIES[c.type] === "plan")
      const rightIds = visibleComponents
        .filter((c) => COMPONENT_CATEGORIES[c.type] !== "plan")
        .map((c) => c.id)
      const base = computeTidyLayout(planComp?.id ?? null, rightIds, visualSizes)
      // 用户拖拽过的组件保留手动位置（仍可自由拖动）
      const result = new Map(base)
      for (const [id, pos] of draggedPositions) {
        if (result.has(id)) result.set(id, pos)
      }
      return result
    }

    // ── 自由模式 ──
    const result = new Map<string, Position>()
    let cursorX = AUTO_PLACE_ORIGIN.x
    for (const comp of visibleComponents) {
      const sz = visualSizes.get(comp.id) ?? { w: 384, h: 300 }
      const dragged = draggedPositions.get(comp.id)
      if (dragged) {
        result.set(comp.id, dragged)
      } else {
        result.set(comp.id, { x: cursorX, y: AUTO_PLACE_ORIGIN.y })
      }
      cursorX += sz.w + AUTO_PLACE_GAP + 24
    }
    const fixedIds = new Set(draggedPositions.keys())
    return resolveCollisions(result, fixedIds, visualSizes)
  }, [visibleComponents, draggedPositions, measureVersion, organized, scales])

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
          buildVisualSizes(sizesRef.current, scales),
        )
        return { ...prev, currentPos: snappedPos, guides }
      })
    },
    [positions, scales],
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
      const resolved = resolveCollisions(allPos, fixedIds, buildVisualSizes(sizesRef.current, scales))

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
  }, [dragInfo, positions, scales])

  // ─── 组件缩放回调（拖拽边缘/角） ───
  const handleResizeStart = useCallback(
    (componentId: string, dir: ResizeDir) => {
      isDraggingRef.current = true
      const base = sizesRef.current.get(componentId)
      const startPos = positions.get(componentId)
      if (!base || !startPos) return
      resizeRef.current = {
        componentId,
        dir,
        startScale: scales.get(componentId) ?? { sx: 1, sy: 1 },
        startPos,
        base,
        currentScale: scales.get(componentId) ?? { sx: 1, sy: 1 },
        currentPos: startPos,
      }
    },
    [positions, scales],
  )

  const handleResizeMove = useCallback((dir: ResizeDir, dx: number, dy: number) => {
    const info = resizeRef.current
    if (!info) return
    const { base, startScale, startPos } = info

    let sx = startScale.sx
    let sy = startScale.sy
    let px = startPos.x
    let py = startPos.y

    // 水平：e 向右扩，w 向左扩（右边缘锚定）
    if (dir === "e" || dir === "ne" || dir === "se") {
      sx = clamp((base.w * startScale.sx + dx) / base.w, MIN_RESIZE, MAX_RESIZE)
    } else if (dir === "w" || dir === "nw" || dir === "sw") {
      sx = clamp((base.w * startScale.sx - dx) / base.w, MIN_RESIZE, MAX_RESIZE)
      const rightEdge = startPos.x + base.w * startScale.sx
      px = rightEdge - base.w * sx
    }

    // 垂直：s 向下扩，n 向上扩（下边缘锚定）
    if (dir === "s" || dir === "se" || dir === "sw") {
      sy = clamp((base.h * startScale.sy + dy) / base.h, MIN_RESIZE, MAX_RESIZE)
    } else if (dir === "n" || dir === "ne" || dir === "nw") {
      sy = clamp((base.h * startScale.sy - dy) / base.h, MIN_RESIZE, MAX_RESIZE)
      const bottomEdge = startPos.y + base.h * startScale.sy
      py = bottomEdge - base.h * sy
    }

    info.currentScale = { sx, sy }
    info.currentPos = { x: px, y: py }

    setScales((prev) => {
      const next = new Map(prev)
      next.set(info.componentId, { sx, sy })
      return next
    })
    // 左/上把手改变位置时，同步写入手动位置以锚定对边
    if (px !== startPos.x || py !== startPos.y) {
      setDraggedPositions((prev) => {
        const next = new Map(prev)
        next.set(info.componentId, { x: px, y: py })
        return next
      })
    }
  }, [])

  const handleResizeEnd = useCallback(() => {
    isDraggingRef.current = false
    resizeRef.current = null
  }, [])

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

  // ─── 一键整理：移除过程组件，把方案+辅助组件收进活页本 ───
  const handleOrganize = useCallback(() => {
    onOrganize?.() // 移除过程态组件（clarify_form / flight_list 等）
    setDraggedPositions(new Map()) // 清空手动位置，全部回归活页本布局
    setOrganized(true)
    setCamera({ x: 0, y: 0, scale: 1 })
  }, [onOrganize])

  // ─── 退出整理：回到自由画布 ───
  const handleUnorganize = useCallback(() => {
    setOrganized(false)
    setDraggedPositions(new Map())
  }, [])

  // 是否有过程态组件（自由模式下用于提示可整理）
  const hasProcessComponents = components.some((c) => {
    const cat = COMPONENT_CATEGORIES[c.type]
    return cat !== "plan" && cat !== "auxiliary"
  })

  // 是否有方案组件（活页本至少需要一张方案作为左页）
  const hasPlanComponent = components.some((c) => COMPONENT_CATEGORIES[c.type] === "plan")

  // 组件被清空时自动退出整理模式
  useEffect(() => {
    if (organized && components.length === 0) setOrganized(false)
  }, [organized, components.length])

  // ─── 空态 ───
  if (components.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center desk-bg" style={{ fontFamily: "var(--font-cn)" }}>
        <div className="text-center" style={{ color: "var(--paper-sage)" }}>
          <div className="text-5xl mb-4 opacity-60">✦</div>
          <p className="text-lg font-light">在左侧对话中开始你的规划</p>
          <p className="text-sm mt-1 opacity-70">组件将在这里动态生成</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={viewportRef}
      className="flex-1 relative overflow-hidden desk-bg select-none"
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
                background: "linear-gradient(to bottom, transparent, var(--ink-blue), transparent)",
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
                background: "linear-gradient(to right, transparent, var(--ink-blue), transparent)",
              }}
            />
          ),
        )}

        {/* 组件 */}
        <AnimatePresence>
          {visibleComponents.map((comp) => {
            const pos = positions.get(comp.id)
            if (!pos) return null
            const isDragging = dragInfo?.componentId === comp.id
            return (
              <CanvasCard
                key={comp.id}
                comp={comp}
                pos={pos}
                camera={camera}
                scale={scales.get(comp.id) ?? { sx: 1, sy: 1 }}
                baseSize={sizesRef.current.get(comp.id)}
                isDragging={isDragging}
                dragCurrentPos={isDragging ? dragInfo.currentPos : null}
                organized={organized}
                dockedComponents={dockedComponents}
                dockableCount={dockableCount}
                onClose={onClose}
                onInteract={onInteract}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                onMeasure={handleMeasure}
                onResizeStart={handleResizeStart}
                onResizeMove={handleResizeMove}
                onResizeEnd={handleResizeEnd}
              />
            )
          })}
        </AnimatePresence>
      </div>

      {/* 缩放控件 */}
      <div
        className="absolute bottom-4 right-4 flex items-center gap-1 px-2 py-1.5 z-50"
        style={{
          background: "var(--paper-cream)",
          border: "1px solid var(--ink-line)",
          borderRadius: "var(--r-sticker)",
          boxShadow: "var(--z2)",
          color: "var(--ink-soft)",
          fontFamily: "var(--font-en)",
        }}
      >
        <button
          onClick={() => zoomTo(Math.max(MIN_SCALE, camera.scale - 0.15))}
          className="w-7 h-7 flex items-center justify-center rounded transition-colors text-sm hover:bg-black/5"
        >
          −
        </button>
        <button
          onClick={resetView}
          className="px-2 h-7 flex items-center justify-center text-xs rounded transition-colors min-w-[3rem] hover:bg-black/5"
        >
          {Math.round(camera.scale * 100)}%
        </button>
        <button
          onClick={() => zoomTo(Math.min(MAX_SCALE, camera.scale + 0.15))}
          className="w-7 h-7 flex items-center justify-center rounded transition-colors text-sm hover:bg-black/5"
        >
          +
        </button>
      </div>

      {/* 一键整理 / 退出整理按钮 */}
      {onOrganize && !organized && (hasProcessComponents || hasPlanComponent) && (
        <button
          onClick={handleOrganize}
          className="absolute bottom-4 left-4 flex items-center gap-2 px-4 py-2 text-sm transition-all z-50 hover:brightness-105"
          style={{
            background: "var(--paper-kraft)",
            border: "1px solid var(--ink)",
            borderRadius: "var(--r-sticker)",
            boxShadow: "var(--z2)",
            color: "var(--ink)",
            fontFamily: "var(--font-cn)",
          }}
        >
          <span>✦</span>
          一键整理
        </button>
      )}
      {organized && (
        <button
          onClick={handleUnorganize}
          className="absolute bottom-4 left-4 flex items-center gap-2 px-4 py-2 text-sm transition-all z-50 hover:brightness-105"
          style={{
            background: "var(--paper-cream)",
            border: "1px solid var(--ink-line)",
            borderRadius: "var(--r-sticker)",
            boxShadow: "var(--z2)",
            color: "var(--ink-soft)",
            fontFamily: "var(--font-cn)",
          }}
        >
          <span>↺</span>
          退出整理
        </button>
      )}
    </div>
  )
}
