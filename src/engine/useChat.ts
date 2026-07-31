import { useState, useCallback, useRef, useEffect } from "react"
import type { ChatMessage, ComponentInstance, Step, WorkspaceAction } from "./types"
import { streamChat, SYSTEM_PROMPT } from "./api"
import { COMPONENT_CATEGORIES } from "../components/registry"

let msgCounter = 0
function nextId() {
  return `msg-${++msgCounter}`
}

// ─── 行程重排的时间/交通重算辅助 ───
function parseTimeToMin(t?: string): number | null {
  if (!t) return null
  const m = /^(\d{1,2}):(\d{2})/.exec(t.trim())
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}
function formatMin(min: number): string {
  const h = Math.floor(min / 60) % 24
  const mm = min % 60
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
}
function parseDurationMin(d?: string): number {
  if (!d) return 0
  let total = 0
  const h = /(\d+(?:\.\d+)?)\s*h/.exec(d)
  if (h) total += parseFloat(h[1]) * 60
  const m = /(\d+)\s*min/.exec(d)
  if (m) total += Number(m[1])
  return total
}
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const la1 = (a.lat * Math.PI) / 180
  const la2 = (b.lat * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}
// 按两点直线距离估算交通方式/耗时（demo 用启发式，非真实路由）
function estimateTransport(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dist = haversineKm(a, b)
  let method: string
  let mins: number
  if (dist < 0.8) {
    method = "步行"
    mins = (dist / 5) * 60
  } else if (dist < 4) {
    method = "地铁"
    mins = (dist / 18) * 60 + 8
  } else {
    method = "打车"
    mins = (dist / 30) * 60 + 3
  }
  const duration = Math.max(5, Math.round(mins / 5) * 5)
  return { method, duration: `${duration}min`, distance: `${dist.toFixed(1)}km` }
}

// 按给定顺序重算一天的时间与交通衔接：
// - 起点时间沿用第一条自身的 time；逐条累加"游玩时长 + 交通时长"
// - 相邻两点都能取到经纬度时才重算交通（第一条无交通）；取不到坐标则保留原 transport
function recomputeDaySpots(
  spots: Array<Record<string, unknown>>,
  coordOf: (id: string) => { lat: number; lng: number } | null,
): Array<Record<string, unknown>> {
  let cursor = parseTimeToMin(spots[0]?.time as string | undefined)
  return spots.map((s, i) => {
    const next: Record<string, unknown> = { ...s }
    if (i === 0) {
      // 第一条上方没有交通连接
      delete next.transport
    } else {
      // 交通连接件永远存在于两点之间：能取到坐标就重算方式/耗时，
      // 取不到坐标则沿用该条原有 transport；两者都没有时补一个通用连接件，
      // 保证拖拽/重排后连接件绝不消失（只是数值可能待下次有坐标时再准）
      const prev = coordOf(spots[i - 1].id as string)
      const cur = coordOf(s.id as string)
      let t: { method?: string; duration?: string; distance?: string } | undefined
      if (prev && cur) {
        t = estimateTransport(prev, cur)
      } else if (next.transport) {
        t = next.transport as { method?: string; duration?: string; distance?: string }
      } else {
        t = { method: "步行", duration: "10min" }
      }
      next.transport = t
      if (cursor != null) cursor += parseDurationMin(t.duration)
    }
    if (cursor != null) {
      next.time = formatMin(cursor)
      cursor += parseDurationMin(s.duration as string | undefined)
    }
    return next
  })
}

// 把一笔花费加到预算清单对应类目上；类目不存在则新增一行。返回新的 items（不改原数组）
type BudgetItem = { label: string; amount: number }
function addToBudget(items: BudgetItem[], label: string, amount: number): BudgetItem[] {
  if (!amount) return items
  const idx = items.findIndex((it) => it.label === label)
  if (idx >= 0) {
    return items.map((it, i) => (i === idx ? { ...it, amount: it.amount + amount } : it))
  }
  return [...items, { label, amount }]
}
// 按地图标记类型归类到预算类目
function budgetCategory(type?: string): string {
  if (type === "restaurant") return "餐饮"
  if (type === "hotel") return "住宿"
  return "门票"
}
// 从"人均 ¥120-180" / "¥680/晚" / "¥2800/晚" 这类文案里估个金额（取区间中值）
function parsePriceRange(text?: string): number {
  if (!text) return 0
  const nums = text.match(/\d+/g)?.map(Number) ?? []
  if (nums.length === 0) return 0
  if (nums.length === 1) return nums[0]
  return Math.round((nums[0] + nums[1]) / 2)
}

// 合并组件 data：默认浅合并，但对 days（行程按天）做逐天合并，
// 避免只更新 day2 时把 day1 整个覆盖丢失
type CompData = Record<string, unknown>
function mergeData(prev: CompData, patch: CompData): CompData {
  const merged: CompData = { ...prev, ...patch }
  if (
    patch.days && typeof patch.days === "object" &&
    prev.days && typeof prev.days === "object"
  ) {
    merged.days = {
      ...(prev.days as Record<string, unknown>),
      ...(patch.days as Record<string, unknown>),
    }
  }
  return merged
}

export function useChat(scenario?: Step[], initialComponents: ComponentInstance[] = []) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [components, setComponents] = useState<ComponentInstance[]>(initialComponents)
  const [isTyping, setIsTyping] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [scriptIndex, setScriptIndex] = useState(0)
  // AI 模式下由 suggest_followups 工具产生的动态建议
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const historyRef = useRef<Array<{ role: string; content: string }>>([
    { role: "system", content: SYSTEM_PROMPT },
  ])
  // hint ID → 对应的 workspaceActions
  const hintActionsRef = useRef<Map<string, WorkspaceAction[]>>(new Map())

  // 当前剧本步骤的建议
  const currentStep = scenario?.[scriptIndex]
  const scriptSuggestions: string[] = []
  if (currentStep?.trigger.type === "user_send") {
    if (currentStep.suggestions) {
      scriptSuggestions.push(...currentStep.suggestions)
    } else if (currentStep.userMessage) {
      scriptSuggestions.push(currentStep.userMessage)
    }
  }
  // 剧本建议优先（驱动 demo 流程）；剧本走完后用 AI 动态建议
  const suggestions = scriptSuggestions.length > 0 ? scriptSuggestions : aiSuggestions

  // 被引用到输入框的景点名（点方案里的景点卡触发）
  const [quotedSpot, setQuotedSpot] = useState<string | null>(null)
  const clearQuote = useCallback(() => setQuotedSpot(null), [])

  // 组件操作（create / update / remove）
  const applyActions = useCallback((actions: WorkspaceAction[]) => {
    setComponents((prev) => {
      let next = [...prev]
      for (const a of actions) {
        if (a.action === "create" && a.componentType) {
          next = next.filter((c) => c.id !== a.componentId)
          next.push({ id: a.componentId, type: a.componentType, data: a.data ?? {} })
        } else if (a.action === "update") {
          next = next.map((c) =>
            c.id === a.componentId ? { ...c, data: mergeData(c.data, a.data ?? {}) } : c
          )
        } else if (a.action === "remove") {
          next = next.filter((c) => c.id !== a.componentId)
        }
      }
      return next
    })
  }, [])

  // 从流式（可能不完整）的 tool call 参数里尽早抠出 component_id / component_type，
  // 以便在完整数据到达前先放一个"生成中"占位卡
  const placeholderIdsRef = useRef<Set<string>>(new Set())
  const handleToolCallDelta = useCallback(
    (tc: { name: string; arguments: string }) => {
      if (tc.name !== "create_component") return
      const idMatch = tc.arguments.match(/"component_id"\s*:\s*"([^"]+)"/)
      const typeMatch = tc.arguments.match(/"component_type"\s*:\s*"([^"]+)"/)
      if (!idMatch || !typeMatch) return
      const componentId = idMatch[1]
      if (placeholderIdsRef.current.has(componentId)) return
      placeholderIdsRef.current.add(componentId)
      applyActions([
        {
          action: "create",
          componentId,
          componentType: typeMatch[1],
          data: { __generating: true },
        },
      ])
    },
    [applyActions]
  )

  // 处理模型的 tool call
  const handleToolCall = useCallback((tc: { name: string; arguments: string }) => {
    try {
      const args = JSON.parse(tc.arguments)
      if (tc.name === "create_component") {
        applyActions([{ action: "create", componentId: args.component_id, componentType: args.component_type, data: args.data }])
      } else if (tc.name === "update_component") {
        applyActions([{ action: "update", componentId: args.component_id, data: args.data }])
      } else if (tc.name === "suggest_followups") {
        if (Array.isArray(args.suggestions)) setAiSuggestions(args.suggestions.slice(0, 3))
      }
    } catch (e) {
      console.error("Tool call parse error:", e, tc)
    }
  }, [applyActions])

  // 逐字打出文字，返回消息 ID
  const typeText = useCallback(
    (text: string, onDone: (msgId: string) => void) => {
      const id = nextId()
      setChatMessages((prev) => [...prev, { id, role: "ai", text: "" }])
      setIsTyping(true)
      let i = 0
      const tick = () => {
        i++
        setChatMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, text: text.slice(0, i) } : m))
        )
        if (i < text.length) {
          setTimeout(tick, 15 + Math.random() * 25)
        } else {
          setIsTyping(false)
          onDone(id)
        }
      }
      setTimeout(tick, 300)
    },
    []
  )

  // ─── 收纳 / 取出：dockedIds 存在方案组件 data 上（AI 也可经 update_component 操作）───
  const dockComponent = useCallback((componentId: string) => {
    setComponents((prev) => {
      const plan = prev.find((c) => COMPONENT_CATEGORIES[c.type] === "plan")
      if (!plan || plan.id === componentId) return prev
      const docked = (plan.data.dockedIds as string[] | undefined) ?? []
      if (docked.includes(componentId)) return prev
      return prev.map((c) =>
        c.id === plan.id ? { ...c, data: { ...c.data, dockedIds: [...docked, componentId] } } : c
      )
    })
  }, [])

  const undockComponent = useCallback((componentId: string) => {
    setComponents((prev) => {
      const plan = prev.find((c) => COMPONENT_CATEGORIES[c.type] === "plan")
      if (!plan) return prev
      const docked = (plan.data.dockedIds as string[] | undefined) ?? []
      if (!docked.includes(componentId)) return prev
      return prev.map((c) =>
        c.id === plan.id
          ? { ...c, data: { ...c.data, dockedIds: docked.filter((id) => id !== componentId) } }
          : c
      )
    })
  }, [])

  // ─── 剧本模式：走预设的 Step ───
  const advanceScript = useCallback(
    (trigger: { type: "user_send" } | { type: "component_interact"; componentId: string; value?: string }) => {
      const step = scenario?.[scriptIndex]
      if (!step || isTyping) return false

      // 检查 trigger 匹配
      if (step.trigger.type !== trigger.type) return false
      if (
        step.trigger.type === "component_interact" &&
        trigger.type === "component_interact"
      ) {
        if (step.trigger.componentId !== trigger.componentId) return false
        // 如果剧本 trigger 指定了 value，则必须精确匹配
        if (step.trigger.value !== undefined && step.trigger.value !== trigger.value) return false
      }

      // 交互值（如选了哪张机票），供动态文案/动作使用
      const interactValue = trigger.type === "component_interact" ? trigger.value : undefined
      const aiMessage = step.aiMessageFn?.(interactValue) ?? step.aiMessage
      const workspaceActions = step.workspaceActionsFn?.(interactValue) ?? step.workspaceActions

      // 点击瞬间立刻执行的动作（如给所选票盖章），不等 AI 消息打完
      if (step.immediateActionsFn) applyActions(step.immediateActionsFn(interactValue))

      // 加用户消息
      if (step.userMessage) {
        setChatMessages((prev) => [...prev, { id: nextId(), role: "user", text: step.userMessage! }])
        historyRef.current.push({ role: "user", content: step.userMessage })
      }

      // 逐字打出 AI 消息 → 执行工作区动作 → 添加 hints → 推进 index
      typeText(aiMessage, (msgId) => {
        if (workspaceActions) applyActions(workspaceActions)
        historyRef.current.push({ role: "assistant", content: aiMessage })

        // 动作落地后停一拍，把组件自动收进方案文件夹（"已收进方案"心智）
        if (step.autoDock) {
          const dockId = step.autoDock
          setTimeout(() => dockComponent(dockId), 900)
        }

        // 如果 step 有 hints，写入消息并注册动作
        if (step.hints && step.hints.length > 0) {
          const hintItems = step.hints.map((h, i) => {
            const hintId = `hint-${msgId}-${i}`
            hintActionsRef.current.set(hintId, h.actions)
            return { id: hintId, label: h.label }
          })
          setChatMessages((prev) =>
            prev.map((m) => (m.id === msgId ? { ...m, hints: hintItems } : m))
          )
        }

        setScriptIndex((i) => i + 1)
      })

      return true
    },
    [scenario, scriptIndex, isTyping, typeText, applyActions, dockComponent]
  )

  // ─── 解析模型把 tool call 当文本输出的情况 ───
  const parseInlineToolCalls = useCallback(
    (text: string): { cleanText: string; toolCalls: Array<{ name: string; arguments: string }> } => {
      const toolCalls: Array<{ name: string; arguments: string }> = []
      let cleanText = text

      // 格式 1: <multi_tool_use.parallel>...</multi_tool_use.parallel>
      const multiMatch = text.match(/<multi_tool_use\.parallel\s*>([\s\S]*?)<\/multi_tool_use\.parallel>/)
      if (multiMatch) {
        try {
          const parsed = JSON.parse(multiMatch[1].trim())
          if (parsed.tool_uses) {
            for (const tu of parsed.tool_uses) {
              const fnName = tu.recipient_name?.replace("functions.", "") ?? ""
              if (fnName) {
                toolCalls.push({ name: fnName, arguments: JSON.stringify(tu.parameters) })
              }
            }
          }
        } catch (e) {
          console.warn("Failed to parse multi_tool_use:", e)
        }
        cleanText = text.replace(/<multi_tool_use\.parallel\s*>[\s\S]*?<\/multi_tool_use\.parallel>\s*/g, "").trim()
        if (toolCalls.length > 0) return { cleanText, toolCalls }
      }

      // 格式 2: <functions.XXX call_id JSON_BODY</functions.XXX>
      const functionsRegex = /<functions\.([\w]+)\s+[\w-]+\s*([\s\S]*?)\s*<\/functions\.\1>/g
      let functionsMatch
      while ((functionsMatch = functionsRegex.exec(text)) !== null) {
        const fnName = functionsMatch[1]
        const body = functionsMatch[2].trim()
        // 提取 JSON（可能夹杂在其他文本中）
        const jsonMatch = body.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            const args = JSON.parse(jsonMatch[0])
            toolCalls.push({ name: fnName, arguments: JSON.stringify(args) })
          } catch { /* ignore malformed JSON */ }
        }
      }
      if (toolCalls.length > 0) {
        cleanText = text.replace(/<functions\.[\w]+\s+[\w-]+\s*[\s\S]*?<\/functions\.[\w]+>\s*/g, "").trim()
        return { cleanText, toolCalls }
      }

      // 格式 3: 单个 JSON tool call 对象
      const singleMatch = text.match(/\{"(?:name|recipient_name)"[\s\S]*?"(?:arguments|parameters)"[\s\S]*?\}(?=\s|$)/)
      if (singleMatch) {
        try {
          const parsed = JSON.parse(singleMatch[0])
          const fnName = (parsed.name ?? parsed.recipient_name ?? "").replace("functions.", "")
          const args = parsed.arguments ?? parsed.parameters
          if (fnName) {
            toolCalls.push({ name: fnName, arguments: typeof args === "string" ? args : JSON.stringify(args) })
          }
        } catch { /* ignore */ }
        cleanText = text.replace(singleMatch[0], "").trim()
        return { cleanText, toolCalls }
      }

      return { cleanText: text, toolCalls: [] }
    },
    []
  )

  // ─── AI 模式：调真实 API ───
  const callAI = useCallback(
    (history: Array<{ role: string; content: string }>) => {
      const aiMsgId = nextId()
      setChatMessages((prev) => [...prev, { id: aiMsgId, role: "ai", text: "" }])
      setIsTyping(true)
      setIsThinking(true) // 等首个 token 到达前显示思考态
      placeholderIdsRef.current = new Set() // 本轮的"生成中"占位追踪

      let aiText = ""
      const collectedToolCalls: Array<{ name: string; arguments: string }> = []

      streamChat(
        history,
        (chunk) => {
          setIsThinking(false) // 有文字了，退出思考态
          aiText += chunk
          // 流式显示时先原样展示，完成后再清理
          setChatMessages((prev) =>
            prev.map((m) => (m.id === aiMsgId ? { ...m, text: aiText } : m))
          )
        },
        (tc) => {
          setIsThinking(false)
          collectedToolCalls.push(tc)
          handleToolCall(tc)
        },
        () => {
          setIsTyping(false)
          setIsThinking(false)

          // 检查文本里有没有内联的 tool call（GPT-5.5 的 multi_tool_use 格式）
          const { cleanText, toolCalls: inlineToolCalls } = parseInlineToolCalls(aiText)
          if (inlineToolCalls.length > 0) {
            for (const tc of inlineToolCalls) {
              collectedToolCalls.push(tc)
              handleToolCall(tc)
            }
            aiText = cleanText
            // 更新聊天消息，去掉原始 JSON
            setChatMessages((prev) =>
              prev.map((m) => (m.id === aiMsgId ? { ...m, text: cleanText } : m))
            )
          }

          // 如果清理后文字为空，显示一个默认消息
          if (!aiText && collectedToolCalls.length > 0) {
            aiText = "已为你更新工作区 ✨"
            setChatMessages((prev) =>
              prev.map((m) => (m.id === aiMsgId ? { ...m, text: aiText } : m))
            )
          }

          // 清理没有拿到完整数据的"生成中"占位（如工具调用 JSON 解析失败）
          setComponents((prev) => prev.filter((c) => !(c.data as CompData)?.__generating))
          placeholderIdsRef.current = new Set()

          // 把 assistant 回复完整记录到历史
          const assistantEntry: Record<string, unknown> = {
            role: "assistant",
            content: aiText || null,
          }
          if (collectedToolCalls.length > 0) {
            assistantEntry.tool_calls = collectedToolCalls.map((tc, i) => ({
              id: `call_${Date.now()}_${i}`,
              type: "function",
              function: { name: tc.name, arguments: tc.arguments },
            }))
          }
          historyRef.current.push(assistantEntry as { role: string; content: string })

          // 给每个 tool call 补一条 tool result
          // 必须按索引一一对应（同名调用不能用 name 匹配，否则 id 重复/缺失 → API 400）
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const toolCallEntries = (assistantEntry.tool_calls as any[]) ?? []
          collectedToolCalls.forEach((tc, i) => {
            historyRef.current.push({
              role: "tool",
              content: JSON.stringify({ success: true, action: tc.name }),
              // @ts-expect-error OpenAI format needs tool_call_id
              tool_call_id: toolCallEntries[i]?.id,
            })
          })
        },
        handleToolCallDelta,
      )
    },
    [handleToolCall, handleToolCallDelta]
  )

  // ─── 发送消息（点 sug → 走剧本；自己打字 → 走 AI）───
  const sendMessage = useCallback(
    (text: string, scripted = false) => {
      if (isTyping || !text.trim()) return

      if (scripted) {
        advanceScript({ type: "user_send" })
      } else {
        setAiSuggestions([]) // 清掉上一轮的动态建议，等本轮 AI 重新给
        setChatMessages((prev) => [...prev, { id: nextId(), role: "user", text }])
        historyRef.current.push({ role: "user", content: text })
        callAI(historyRef.current)
      }
    },
    [isTyping, advanceScript, callAI]
  )

  // ─── 组件交互 ───
  // 打字期间的点击缓存一枚（保留最后一次），打字结束后自动执行，不再静默丢弃
  const pendingInteractRef = useRef<{ componentId: string; value?: string } | null>(null)

  const handleComponentInteract = useCallback(
    (componentId: string, value?: string) => {
      // 文件夹收纳 / 取出（纯状态操作，不触发对话，也不受打字中缓存影响——
      // 整理动画会连续逐张 dock，若走缓存只会留下最后一张）
      if (value && value.startsWith("dock:")) {
        dockComponent(value.slice(5))
        return
      }
      if (value && value.startsWith("undock:")) {
        undockComponent(value.slice(7))
        return
      }

      // 组件内联编辑：直接写回该组件的 data，不触发对话
      if (value && value.startsWith("edit:")) {
        try {
          const patch = JSON.parse(value.slice(5))
          applyActions([{ action: "update", componentId, data: patch }])
        } catch (e) {
          console.error("Inline edit parse error:", e)
        }
        return
      }

      // 行程景点拖拽重排 → 就地重算时间/交通，并同步地图标记顺序（路线随之重画）
      // 纯确定性计算，不走 AI，保证拖完即时生效
      if (componentId === "itinerary" && value && value.startsWith("reorder:")) {
        const rest = value.slice("reorder:".length)
        const sep = rest.indexOf(":")
        const dayKey = rest.slice(0, sep)
        const orderIds = rest.slice(sep + 1).split(",").filter(Boolean)

        const itinComp = components.find((c) => c.id === "itinerary")
        const daysData = itinComp?.data.days as
          | Record<string, { label: string; spots: Array<Record<string, unknown>> }>
          | undefined
        const oldSpots = daysData?.[dayKey]?.spots
        if (!daysData || !oldSpots) return

        // 地图标记按 id 建索引，供取经纬度（含 extraMarkers：加进来的餐厅/酒店也能算交通）
        const mapComp = components.find((c) => c.id === "map")
        const mapMarkers = (mapComp?.data.markers as Array<Record<string, unknown>>) ?? []
        const extraMarkers = (mapComp?.data.extraMarkers as Array<Record<string, unknown>>) ?? []
        const markerById = new Map([...mapMarkers, ...extraMarkers].map((m) => [m.id as string, m]))
        const coordOf = (id: string) => {
          const mk = markerById.get(id)
          const s = oldSpots.find((x) => x.id === id)
          const lat = (mk?.lat as number) ?? (s?.lat as number)
          const lng = (mk?.lng as number) ?? (s?.lng as number)
          return lat != null && lng != null ? { lat, lng } : null
        }

        // 按新顺序取出 spot
        const reordered = orderIds
          .map((id) => oldSpots.find((s) => s.id === id))
          .filter((s): s is Record<string, unknown> => s != null)
        if (reordered.length !== oldSpots.length) return

        // 起点时间沿用原第一条；逐条重算时间与交通衔接
        const newSpots = recomputeDaySpots(reordered, coordOf)

        // 地图标记：把本天景点按新顺序排列，其它标记（别天/餐厅/酒店、非标记景点如午餐）保持原位
        // 只重排"既是本天景点又在地图上"的标记；顺序取自 newSpots 中在地图有对应点的子序列
        const markerOrderIds = newSpots
          .map((s) => s.id as string)
          .filter((id) => markerById.has(id))
        const reorderSet = new Set(markerOrderIds)
        let ptr = 0
        const newMarkers = mapMarkers.map((m) =>
          reorderSet.has(m.id as string) ? markerById.get(markerOrderIds[ptr++])! : m
        )

        applyActions([
          {
            action: "update",
            componentId: "itinerary",
            data: { days: { [dayKey]: { ...daysData[dayKey], spots: newSpots } } },
          },
          ...(mapComp ? [{ action: "update" as const, componentId: "map", data: { markers: newMarkers } }] : []),
        ])
        return
      }

      // POI 面板"从行程中去掉" → 就地把该点从所在天移除并重算，同时把地图标记标为 offRoute
      // （保留图钉可再点/再加回，路线不再经过它）。纯确定性，不走 AI。
      if (componentId === "map" && value && value.startsWith("removespot:")) {
        const markerId = value.slice("removespot:".length)
        const itinComp = components.find((c) => c.id === "itinerary")
        const daysData = itinComp?.data.days as
          | Record<string, { label: string; spots: Array<Record<string, unknown>> }>
          | undefined
        if (!daysData) return

        // 找到包含该点的那一天
        const dayKey = Object.keys(daysData).find((k) =>
          daysData[k].spots.some((s) => s.id === markerId)
        )

        const mapComp = components.find((c) => c.id === "map")
        const mapMarkers = (mapComp?.data.markers as Array<Record<string, unknown>>) ?? []
        const coordOf = (id: string) => {
          const mk = mapMarkers.find((m) => m.id === id)
          const lat = mk?.lat as number | undefined
          const lng = mk?.lng as number | undefined
          return lat != null && lng != null ? { lat, lng } : null
        }

        const actions: WorkspaceAction[] = []
        if (dayKey) {
          const remaining = daysData[dayKey].spots.filter((s) => s.id !== markerId)
          const newSpots = recomputeDaySpots(remaining, coordOf)
          actions.push({
            action: "update",
            componentId: "itinerary",
            data: { days: { [dayKey]: { ...daysData[dayKey], spots: newSpots } } },
          })
        }
        // 地图：该标记标记为 offRoute（路线跳过它，图钉保留）
        if (mapComp) {
          const newMarkers = mapMarkers.map((m) =>
            m.id === markerId ? { ...m, offRoute: true } : m
          )
          actions.push({ action: "update", componentId: "map", data: { markers: newMarkers } })
        }
        if (actions.length > 0) applyActions(actions)
        return
      }

      // 点方案里的 POI 条卡 → 打开二级 POST CARD：地图卡飞到该点并抽出详情便签。
      // 纯 UI 联动，不走 AI；用时间戳保证重复点击同一景点也能重新触发。
      if (value && value.startsWith("opendetail:")) {
        const markerId = value.slice("opendetail:".length)
        const mapComp = components.find((c) => c.id === "map")
        if (mapComp) {
          applyActions([
            { action: "update", componentId: "map", data: { focusMarker: { id: markerId, ts: Date.now() } } },
          ])
        }
        return
      }

      // 打字期间的会话型交互缓存一枚，打字结束后自动执行，不再静默丢弃
      if (isTyping) {
        pendingInteractRef.current = { componentId, value }
        return
      }

      // 点方案里的景点卡 → 引用到输入框，不发消息
      if (value && value.startsWith("quote:")) {
        setQuotedSpot(value.slice(6))
        return
      }

      // POI 面板的引导词 → 当作用户发问，走正常发送流程
      if (value && value.startsWith("ask:")) {
        sendMessage(value.slice(4), false)
        return
      }

      // POI 面板"加入行程" → 查出该标记信息，交给模型决定放到哪一天并重排
      if (componentId === "map" && value && value.startsWith("addspot:")) {
        const markerId = value.slice(8)
        const mapComp = components.find((c) => c.id === "map")
        const markers = mapComp
          ? [
              ...((mapComp.data.markers as Array<Record<string, unknown>>) ?? []),
              ...((mapComp.data.extraMarkers as Array<Record<string, unknown>>) ?? []),
            ]
          : []
        const mk = markers.find((m) => m.id === markerId)
        const name = (mk?.name as string) ?? markerId
        const type = (mk?.type as string) ?? "spot"
        const desc = (mk?.desc as string) ?? ""
        // 加入行程时的即时副作用（清 offRoute + 计入预算），合并成一批更新
        const sideActions: WorkspaceAction[] = []
        // 若该点之前被移出路线（offRoute），重新加入时清掉该标记
        if (mapComp) {
          const baseMarkers = (mapComp.data.markers as Array<Record<string, unknown>>) ?? []
          if (baseMarkers.some((m) => m.id === markerId && m.offRoute)) {
            sideActions.push({
              action: "update",
              componentId: "map",
              data: { markers: baseMarkers.map((m) => (m.id === markerId ? { ...m, offRoute: false } : m)) },
            })
          }
        }
        // 预算：从标记的 priceRange 估个金额，按类型归类计入（餐厅→餐饮/酒店→住宿/其它→门票）
        const budgetComp = components.find((c) => c.id === "budget")
        if (budgetComp) {
          const priceRange = (mk?.deepContent as { priceRange?: string } | undefined)?.priceRange
          const amount = parsePriceRange(priceRange)
          if (amount > 0) {
            const items = (budgetComp.data.items as BudgetItem[]) ?? []
            sideActions.push({
              action: "update",
              componentId: "budget",
              data: { items: addToBudget(items, budgetCategory(type), amount) },
            })
          }
        }
        if (sideActions.length > 0) applyActions(sideActions)
        setAiSuggestions([])
        setChatMessages((prev) => [...prev, { id: nextId(), role: "user", text: `把「${name}」加入行程` }])
        historyRef.current.push({
          role: "user",
          content: `请把地图上的这个点位加入行程：id=${markerId}，名称=${name}，类型=${type}${desc ? `，简介=${desc}` : ""}。你来判断它最适合安排在哪一天、哪个时段，用 update_component 更新 itinerary（在对应 day 的 spots 里新增该条目，字段含 id/name/desc，酌情加 time/tag/transport），并同步重排该天后续条目的时间与交通衔接。`,
        })
        callAI(historyRef.current)
        return
      }

      // 行程笔记本切换 Day → 联动地图高亮/置灰对应天路线
      if (componentId === "itinerary" && value && value.startsWith("day:")) {
        const day = value.slice(4)
        applyActions([
          { action: "update", componentId: "itinerary", data: { activeTab: day } },
          { action: "update", componentId: "map", data: { activeDay: day } },
        ])
        return
      }

      // 地图玩法选择 → 从被点标记的 deepContent 里查出真正的玩法，动态加入行程
      // （不消耗剧本步骤，点哪个加哪个）
      if (componentId === "map" && value) {
        const mapComp = components.find((c) => c.id === "map")
        if (mapComp) {
          const markers = [
            ...((mapComp.data.markers as Array<Record<string, unknown>>) ?? []),
            ...((mapComp.data.extraMarkers as Array<Record<string, unknown>>) ?? []),
          ]
          for (const m of markers) {
            const acts = (m.deepContent as { activities?: Array<Record<string, unknown>> } | undefined)?.activities
            const act = acts?.find((a) => a.id === value)
            if (act) {
              const price = act.price as number
              const priceText = price === 0 ? "免费的，预算没变化 👍" : `预计 ¥${price}，已计入预算～`
              typeText(`「${act.title}」已加入「${m.name}」的行程！${priceText}`, () => {
                const actions: WorkspaceAction[] = [
                  {
                    action: "update",
                    componentId: "itinerary",
                    data: {
                      selectedActivity: {
                        spotId: m.id,
                        activity: { id: act.id, title: act.title, desc: act.desc, duration: act.duration, price: act.price, tag: act.tag },
                      },
                    },
                  },
                ]
                // 有价格 → 计入预算（玩法/门票类归到"门票"，餐饮玩法归"餐饮"）
                const budgetComp = components.find((c) => c.id === "budget")
                if (price > 0 && budgetComp) {
                  const items = (budgetComp.data.items as BudgetItem[]) ?? []
                  const cat = act.tag === "美食" || act.tag === "西餐" ? "餐饮" : "门票"
                  actions.push({
                    action: "update",
                    componentId: "budget",
                    data: { items: addToBudget(items, cat, price) },
                  })
                }
                applyActions(actions)
              })
              return
            }
          }
        }
      }

      // 先尝试走剧本
      const stepped = advanceScript({ type: "component_interact", componentId, value })
      if (stepped) return

      // 剧本没匹配上 → 走 AI
      const comp = components.find((c) => c.id === componentId)
      const compName = comp?.type ?? componentId
      const message = value
        ? `[用户在「${compName}」组件上选择了: ${value}]`
        : `[用户在「${compName}」组件上点击了确认]`

      historyRef.current.push({ role: "user", content: message })
      callAI(historyRef.current)
    },
    [isTyping, advanceScript, components, callAI, typeText, applyActions, sendMessage, dockComponent, undockComponent]
  )

  // 打字结束 → 执行缓存的那次点击
  useEffect(() => {
    if (isTyping || !pendingInteractRef.current) return
    const p = pendingInteractRef.current
    pendingInteractRef.current = null
    handleComponentInteract(p.componentId, p.value)
  }, [isTyping, handleComponentInteract])

  // ─── 用户直接在画布上添加组件（粘贴图片 / 链接 / 文本）───
  const addComponent = useCallback((type: string, data: Record<string, unknown>): string => {
    const id = `paste-${++msgCounter}`
    applyActions([{ action: "create", componentId: id, componentType: type, data }])
    return id
  }, [applyActions])

  // ─── 手动关闭组件 ───
  const closeComponent = useCallback((componentId: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== componentId))
  }, [])

  // ─── Hint 点击 ───
  const handleHintClick = useCallback((hintId: string) => {
    const actions = hintActionsRef.current.get(hintId)
    if (actions) {
      applyActions(actions)
      hintActionsRef.current.delete(hintId)
    }
    // 从消息中移除该 hint
    setChatMessages((prev) =>
      prev.map((m) =>
        m.hints ? { ...m, hints: m.hints.filter((h) => h.id !== hintId) } : m
      )
    )
  }, [applyActions])

  // ─── 一键整理：移除过程态组件，辅助组件收进方案文件夹（写 dockedIds）───
  const organizeWorkspace = useCallback(() => {
    setComponents((prev) => {
      // 已收进文件夹的组件（dockedIds）一律豁免清场——机票等 process 组件收纳后不能被删
      const planPrev = prev.find((c) => COMPONENT_CATEGORIES[c.type] === "plan")
      const dockedSet = new Set((planPrev?.data.dockedIds as string[] | undefined) ?? [])
      const kept = prev.filter((c) => {
        if (dockedSet.has(c.id)) return true
        const cat = COMPONENT_CATEGORIES[c.type]
        return cat === "plan" || cat === "auxiliary"
      })
      const plan = kept.find((c) => COMPONENT_CATEGORIES[c.type] === "plan")
      if (!plan) return kept
      const existing = (plan.data.dockedIds as string[] | undefined) ?? []
      const auxIds = kept
        .filter((c) => COMPONENT_CATEGORIES[c.type] === "auxiliary" && !existing.includes(c.id))
        .map((c) => c.id)
      if (auxIds.length === 0) return kept
      return kept.map((c) =>
        c.id === plan.id ? { ...c, data: { ...c.data, dockedIds: [...existing, ...auxIds] } } : c
      )
    })
  }, [])

  // ─── 拖拽排序 ───
  const reorderComponents = useCallback((fromIndex: number, toIndex: number) => {
    setComponents((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }, [])

  // 把"当前真实在行程里的点位 id"注入地图 data，供 POI 卡按钮判断加入/移出状态
  // （直接由行程内容派生，无需额外 state，避免写回循环）
  const itinComp = components.find((c) => c.id === "itinerary")
  const itineraryDays = itinComp?.data.days as
    | Record<string, { spots?: Array<{ id?: string }> }>
    | undefined
  const itinerarySpotIds = itineraryDays
    ? Object.values(itineraryDays).flatMap((d) => (d.spots ?? []).map((s) => s.id).filter(Boolean))
    : []
  const decoratedComponents = components.map((c) =>
    c.id === "map" ? { ...c, data: { ...c.data, itinerarySpotIds } } : c
  )

  return {
    chatMessages,
    components: decoratedComponents,
    isTyping,
    isThinking,
    suggestions,
    quotedSpot,
    clearQuote,
    sendMessage,
    handleComponentInteract,
    addComponent,
    closeComponent,
    organizeWorkspace,
    dockComponent,
    undockComponent,
    handleHintClick,
    reorderComponents,
  }
}
