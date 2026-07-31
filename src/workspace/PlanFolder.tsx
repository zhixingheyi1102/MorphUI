import { useState, useEffect, useRef, useLayoutEffect } from "react"
import type { ComponentInstance } from "../engine/types"
import registry from "../components/registry"
import PlanNotebook from "../components/PlanNotebook"

// ─── 尺寸常量 ───
const NOTEBOOK_W = 480          // PlanNotebook 自身宽度
const CLOSED_W = 516            // 合拢态总宽（含右缘纸边 + 标签留白）
const SPINE_W = 56              // 展开态书脊宽
const RIGHT_W = 464             // 展开态右页宽
const RIGHT_PAD = 16            // 右页内边距
const COL_GAP = 12              // 右页双列间距
const CELL_W = (RIGHT_W - RIGHT_PAD * 2 - COL_GAP) / 2  // ≈210 每格宽

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
  organized: boolean
  onInteract: (componentId: string, value?: string) => void
}

export default function PlanFolder({ planId, data, dockedComponents, organized, onInteract }: Props) {
  const [unfolded, setUnfolded] = useState(false)

  // 整理态触发自动展开
  useEffect(() => {
    if (organized) setUnfolded(true)
  }, [organized])

  // 有组件被收纳时自动展开（拖入/AI 写 dockedIds）
  useEffect(() => {
    if (dockedComponents.length > 0) setUnfolded(true)
  }, [dockedComponents.length])

  // 方案组件自身的交互（Day 切换、景点引用）透传
  const onPlanInteract = (value?: string) => onInteract(planId, value)

  if (!unfolded) {
    return (
      <ClosedFolder
        data={data}
        dockedCount={dockedComponents.length}
        onPlanInteract={onPlanInteract}
        onUnfold={() => setUnfolded(true)}
      />
    )
  }

  return (
    <div className="relative flex items-stretch" style={{ width: NOTEBOOK_W + SPINE_W + RIGHT_W, fontFamily: "var(--font-cn)" }}>
      {/* 左页：行程笔记本 */}
      <div className="shrink-0" style={{ width: NOTEBOOK_W }}>
        <PlanNotebook data={data} onInteract={onPlanInteract} />
      </div>

      {/* 书脊：渐变凹槽 + 装订环 */}
      <div
        className="relative shrink-0 flex flex-col items-center justify-evenly py-10"
        style={{
          width: SPINE_W,
          background:
            "linear-gradient(90deg, rgba(24,20,14,0.10) 0%, rgba(24,20,14,0.03) 30%, rgba(24,20,14,0.03) 70%, rgba(24,20,14,0.12) 100%)",
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
                    <DockedItem key={comp.id} comp={comp} planId={planId} onInteract={onInteract} />
                  ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══ 合拢态：牛皮纸封套包着行程页，右缘露纸边 + 竖标签 ═══
function ClosedFolder({
  data,
  dockedCount,
  onPlanInteract,
  onUnfold,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
  dockedCount: number
  onPlanInteract: (value?: string) => void
  onUnfold: () => void
}) {
  return (
    <div className="relative" style={{ width: CLOSED_W, fontFamily: "var(--font-cn)" }}>
      {/* 右缘露出的内页纸边（多层错位，暗示"里面还有一页"） */}
      <div
        className="absolute top-12 bottom-2 rounded-r-md"
        style={{ right: 14, width: 20, background: "var(--paper-oat)", border: "1px solid var(--ink-line)", transform: "rotate(0.4deg)" }}
      />
      <div
        className="absolute top-14 bottom-3 rounded-r-md"
        style={{ right: 8, width: 18, background: "var(--paper-kraft)", border: "1px solid var(--ink-line)", transform: "rotate(-0.3deg)" }}
      />

      {/* 行程页本体 */}
      <div className="relative" style={{ zIndex: 1 }}>
        <PlanNotebook data={data} onInteract={onPlanInteract} />
      </div>

      {/* 右缘竖标签：点击展开 */}
      <button
        onClick={onUnfold}
        className="absolute flex flex-col items-center gap-1 px-1 py-3 transition-transform hover:translate-x-0.5"
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
        }}
      >
        <span>展开方案</span>
        <span style={{ writingMode: "horizontal-tb", fontFamily: "var(--font-en)" }}>⟩</span>
        {dockedCount > 0 && (
          <span
            className="rounded-full px-1"
            style={{
              writingMode: "horizontal-tb",
              fontSize: 10,
              fontFamily: "var(--font-en)",
              background: "var(--stamp-red)",
              color: "var(--paper-cream)",
            }}
          >
            {dockedCount}
          </span>
        )}
      </button>
    </div>
  )
}

// ═══ 右页收纳件：缩放渲染 + 取出按钮 ═══
function DockedItem({
  comp,
  planId,
  onInteract,
}: {
  comp: ComponentInstance
  planId: string
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

  return (
    <div
      className="relative group/dock"
      style={{
        width: CELL_W,
        height: baseH ? baseH * scale : undefined,
        transform: `rotate(${rot}deg)`,
        filter: "drop-shadow(0 1px 3px rgba(24,20,14,0.18))",
      }}
    >
      {/* 缩小内容：禁用内部交互（P2 做点击提前放大） */}
      <div
        ref={innerRef}
        style={{ width: baseW, transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: "none" }}
      >
        <Component data={comp.data} onInteract={() => {}} />
      </div>

      {/* 透明遮罩（占位，P2 接管点击放大） */}
      <div className="absolute inset-0" />

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
    </div>
  )
}
