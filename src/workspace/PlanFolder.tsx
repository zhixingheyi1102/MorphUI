import { useState, useEffect, useRef, useLayoutEffect } from "react"
import type { CSSProperties } from "react"
import { motion } from "framer-motion"
import type { ComponentInstance } from "../engine/types"
import registry from "../components/registry"
import PlanNotebook from "../components/PlanNotebook"

// ─── 尺寸常量 ───
const NOTEBOOK_W = 480          // PlanNotebook 自身宽度
const CLOSED_W = 516            // 合拢态总宽（含右缘纸边 + 标签留白）
const SPINE_W = 56              // 展开态书脊宽
const RIGHT_W = 560             // 展开态右页宽
const RIGHT_PAD = 16            // 右页内边距
const COL_GAP = 12              // 右页双列间距
const CELL_W = (RIGHT_W - RIGHT_PAD * 2 - COL_GAP) / 2  // ≈258 每格宽

// 各组件未缩放的基准宽度（与组件自身 w-64/w-80/w-96 对应）
const BASE_WIDTHS: Record<string, number> = {
  budget_tracker: 256,
  checklist: 320,
  map_view: 384,
  flight_list: 384,
}

// 稳定微旋转：hash(id) % 5 - 2 → -2° ~ +2°
function hashId(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

type Props = {
  planId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
  dockedComponents: ComponentInstance[]
  dockableCount: number
  dropHint: "none" | "ready" | "over"
  organized: boolean
  onInteract: (componentId: string, value?: string) => void
}

export default function PlanFolder({ planId, data, dockedComponents, dockableCount, dropHint, organized, onInteract }: Props) {
  const [unfolded, setUnfolded] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const leftRef = useRef<HTMLDivElement | null>(null)
  const [tabH, setTabH] = useState(37)

  // 量出左页 Day 标签行高度，书脊/右页下移这段距离对齐纸面
  useLayoutEffect(() => {
    if (!unfolded) return
    const tabsRow = leftRef.current?.firstElementChild?.firstElementChild as HTMLElement | null
    if (tabsRow) setTabH(tabsRow.offsetHeight - 1) // -1 对应标签行 -mb-px
  }, [unfolded])

  // 整理态触发自动展开
  useEffect(() => {
    if (organized) setUnfolded(true)
  }, [organized])

  // 有组件被收纳时自动展开（拖入/AI 写 dockedIds）
  useEffect(() => {
    if (dockedComponents.length > 0) setUnfolded(true)
  }, [dockedComponents.length])

  // 合上时收起放大件
  useEffect(() => {
    if (!unfolded) setExpandedId(null)
  }, [unfolded])

  // 方案组件自身的交互（Day 切换、景点引用）透传
  const onPlanInteract = (value?: string) => onInteract(planId, value)

  // 拖拽投放提示描边：ready 虚线牛皮色，over 加亮加粗
  const hintOutline: CSSProperties =
    dropHint === "none"
      ? {}
      : {
          outline: dropHint === "over" ? "3px dashed var(--stamp-red)" : "2px dashed var(--paper-kraft)",
          outlineOffset: 8,
          borderRadius: "var(--r-sticker)",
        }

  if (!unfolded) {
    return (
      <ClosedFolder
        data={data}
        dockableCount={dockableCount}
        hintOutline={hintOutline}
        onPlanInteract={onPlanInteract}
        onUnfold={() => setUnfolded(true)}
      />
    )
  }

  return (
    <div
      className="relative flex items-stretch"
      style={{ width: NOTEBOOK_W + SPINE_W + RIGHT_W, fontFamily: "var(--font-cn)", ...hintOutline }}
    >
      {/* 左页：行程笔记本（embedded：贴书脊一侧直角） */}
      <div ref={leftRef} className="shrink-0" style={{ width: NOTEBOOK_W }}>
        <PlanNotebook data={data} onInteract={onPlanInteract} embedded />
      </div>

      {/* 书脊 + 右页：整体 rotateY 翻页展开 */}
      <motion.div
        className="flex items-stretch shrink-0"
        style={{
          marginTop: tabH,
          transformOrigin: "left center",
          transformPerspective: 1600,
        }}
        initial={{ rotateY: -70, opacity: 0.4 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 110, damping: 17 }}
      >
        {/* 书脊：渐变凹槽 + 装订环 */}
        <div
          className="relative shrink-0 flex flex-col items-center justify-evenly py-10"
          style={{
            width: SPINE_W,
            backgroundColor: "var(--paper-cream)",
            backgroundImage:
              "linear-gradient(90deg, rgba(24,20,14,0.10) 0%, rgba(24,20,14,0.03) 30%, rgba(24,20,14,0.03) 70%, rgba(24,20,14,0.12) 100%)",
            borderTop: "1px solid var(--ink-line)",
            borderBottom: "1px solid var(--ink-line)",
          }}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="w-5 h-5 rounded-full"
              style={{ border: "2.5px solid var(--metal-silver)", background: "transparent", boxShadow: "var(--z1)" }}
            />
          ))}
        </div>

        {/* 右页：收纳拼贴 */}
        <div
          className="relative shrink-0 flex flex-col"
          style={{
            width: RIGHT_W,
            background: "var(--paper-oat)",
            border: "1px solid var(--ink-line)",
            borderRadius: "var(--r-sticker)",
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
            boxShadow: "var(--z2)",
            minHeight: 420,
            padding: RIGHT_PAD,
          }}
        >
          {/* 右页头 */}
          <div className="flex items-center justify-between mb-3 pb-2" style={{ borderBottom: "1px dashed var(--ink-line)" }}>
            <span style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)", letterSpacing: "0.1em" }}>
              ✦ 随行资料 {dockedComponents.length > 0 ? `· ${dockedComponents.length} 件` : ""}
            </span>
            <button
              onClick={() => setUnfolded(false)}
              className="px-2 py-0.5 transition-colors hover:bg-black/5"
              style={{
                fontSize: "var(--fs-caption)",
                color: "var(--ink-soft)",
                border: "1px solid var(--ink-line)",
                borderRadius: "var(--r-paper)",
              }}
            >
              合上 ⟨
            </button>
          </div>

          {/* 拼贴区 */}
          {dockedComponents.length === 0 ? (
            <div
              className="flex-1 flex flex-col items-center justify-center gap-2 m-1"
              style={{
                border: "1.5px dashed var(--ink-line)",
                borderRadius: "var(--r-sticker)",
                color: "var(--ink-soft)",
                fontSize: "var(--fs-caption)",
                opacity: 0.8,
              }}
            >
              <span className="text-2xl opacity-50">⿻</span>
              <span>把预算、清单、地图拖进来</span>
              <span>或点「一键整理」自动收纳</span>
            </div>
          ) : (
            <div className="flex gap-3 items-start">
              {/* 双列瀑布：按序交替入列 */}
              {[0, 1].map((col) => (
                <div key={col} className="flex-1 flex flex-col gap-3">
                  {dockedComponents
                    .filter((_, i) => i % 2 === col)
                    .map((comp) => (
                      <DockedItem
                        key={comp.id}
                        comp={comp}
                        col={col}
                        planId={planId}
                        expanded={expandedId === comp.id}
                        onToggle={() => setExpandedId((cur) => (cur === comp.id ? null : comp.id))}
                        onInteract={onInteract}
                      />
                    ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ═══ 合拢态：牛皮纸封套包着行程页，右缘露纸边 + 竖标签 ═══
function ClosedFolder({
  data,
  dockableCount,
  hintOutline,
  onPlanInteract,
  onUnfold,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
  dockableCount: number
  hintOutline: CSSProperties
  onPlanInteract: (value?: string) => void
  onUnfold: () => void
}) {
  const [peek, setPeek] = useState(false)

  return (
    <div className="relative" style={{ width: CLOSED_W, fontFamily: "var(--font-cn)", ...hintOutline }}>
      {/* 右缘露出的内页纸边（多层错位，暗示"里面还有一页"） */}
      <div
        className="absolute top-12 bottom-2 rounded-r-md transition-transform duration-300"
        style={{
          right: 14,
          width: 20,
          background: "var(--paper-oat)",
          border: "1px solid var(--ink-line)",
          transform: peek ? "rotate(0.4deg) translateX(3px)" : "rotate(0.4deg)",
        }}
      />
      <div
        className="absolute top-14 bottom-3 rounded-r-md transition-transform duration-300"
        style={{
          right: 8,
          width: 18,
          background: "var(--paper-kraft)",
          border: "1px solid var(--ink-line)",
          transform: peek ? "rotate(-0.3deg) translateX(5px)" : "rotate(-0.3deg)",
        }}
      />

      {/* 行程页本体：hover 标签时轻微掀角预览 */}
      <div
        className="relative"
        style={{
          zIndex: 1,
          transform: peek ? "perspective(1400px) rotateY(-5deg)" : "none",
          transformOrigin: "left center",
          transition: "transform 0.35s ease",
        }}
      >
        <PlanNotebook data={data} onInteract={onPlanInteract} />
      </div>

      {/* 右缘竖标签：点击展开；画布有可收纳组件时呼吸脉冲 + "+n" 角标 */}
      <motion.button
        onClick={onUnfold}
        onMouseEnter={() => setPeek(true)}
        onMouseLeave={() => setPeek(false)}
        className="absolute flex flex-col items-center gap-1 px-1 py-3"
        animate={dockableCount > 0 ? { scale: [1, 1.05, 1] } : { scale: 1 }}
        transition={dockableCount > 0 ? { repeat: Infinity, duration: 2.2, ease: "easeInOut" } : undefined}
        whileHover={{ x: 2, scale: 1.05 }}
        style={{
          right: 0,
          top: 96,
          zIndex: 2,
          background: "var(--paper-kraft)",
          border: "1px solid var(--ink)",
          borderLeft: "none",
          borderTopRightRadius: "var(--r-paper)",
          borderBottomRightRadius: "var(--r-paper)",
          boxShadow: "var(--z1)",
          color: "var(--ink)",
          writingMode: "vertical-rl",
          fontSize: "var(--fs-caption)",
          letterSpacing: "0.15em",
          transformOrigin: "left center",
        }}
      >
        <span>展开方案</span>
        <span style={{ writingMode: "horizontal-tb", fontFamily: "var(--font-en)" }}>⟩</span>
      </motion.button>
    </div>
  )
}

// ═══ 右页收纳件：缩放渲染 + 点击提前放大 + 取出按钮 ═══
function DockedItem({
  comp,
  col,
  planId,
  expanded,
  onToggle,
  onInteract,
}: {
  comp: ComponentInstance
  col: number
  planId: string
  expanded: boolean
  onToggle: () => void
  onInteract: (componentId: string, value?: string) => void
}) {
  const Component = registry[comp.type]
  const innerRef = useRef<HTMLDivElement | null>(null)
  const [baseH, setBaseH] = useState(0)

  // 测量未缩放高度，撑出缩放后的占位（transform 不影响布局）
  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return
    setBaseH(el.offsetHeight)
    const observer = new ResizeObserver(() => setBaseH(el.offsetHeight))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (!Component) return null

  const baseW = BASE_WIDTHS[comp.type] ?? 384
  const scale = CELL_W / baseW
  const rot = (hashId(comp.id) % 5) - 2
  // 放大态：右列内容向左挪，保证不超出右页
  const dx = expanded && col === 1 ? CELL_W - baseW : 0

  return (
    <motion.div
      className="relative group/dock"
      animate={{ rotate: expanded ? 0 : rot }}
      style={{
        width: CELL_W,
        height: baseH ? baseH * scale : undefined,
        zIndex: expanded ? 30 : undefined,
        filter: expanded
          ? "drop-shadow(0 8px 24px rgba(24,20,14,0.35))"
          : "drop-shadow(0 1px 3px rgba(24,20,14,0.18))",
      }}
    >
      {/* 同一 DOM 节点 spring 放大（不走 portal，避免 maplibre 重挂载） */}
      <motion.div
        ref={innerRef}
        animate={{ scale: expanded ? 1 : scale, x: dx }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        style={{
          width: baseW,
          transformOrigin: "top left",
          pointerEvents: expanded ? "auto" : "none",
        }}
      >
        <Component data={comp.data} onInteract={(...args: unknown[]) => onInteract(comp.id, args[0] as string | undefined)} />
      </motion.div>

      {/* 缩小态点击遮罩：点击提前放大 */}
      {!expanded && (
        <div className="absolute inset-0 cursor-zoom-in" onClick={onToggle} title="点击放大" />
      )}

      {/* 放大态：收回按钮 */}
      {expanded && (
        <button
          onClick={onToggle}
          className="absolute z-10 px-2 py-0.5 text-xs transition-colors hover:bg-black/5"
          style={{
            top: -10,
            left: dx - 2,
            background: "var(--paper-manila)",
            color: "var(--ink-soft)",
            border: "1px solid var(--ink-line)",
            borderRadius: "var(--r-paper)",
            boxShadow: "var(--z1)",
          }}
        >
          ⤡ 收回
        </button>
      )}

      {/* 取出按钮 */}
      <button
        onClick={() => onInteract(planId, `undock:${comp.id}`)}
        className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full text-xs flex items-center justify-center opacity-0 group-hover/dock:opacity-100 transition-opacity"
        style={{
          background: "var(--paper-manila)",
          color: "var(--ink-soft)",
          border: "1px solid var(--ink-line)",
          boxShadow: "var(--z1)",
        }}
        title="取出回画布"
      >
        ↗
      </button>
    </motion.div>
  )
}
