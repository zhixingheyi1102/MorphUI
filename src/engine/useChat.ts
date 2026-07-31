import { useState, useCallback, useRef } from "react"
import type { ChatMessage, ComponentInstance, Step, WorkspaceAction } from "./types"
import { streamChat, SYSTEM_PROMPT } from "./api"
import { COMPONENT_CATEGORIES } from "../components/registry"

let msgCounter = 0
function nextId() {
  return `msg-${++msgCounter}`
}

export function useChat(scenario?: Step[]) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [components, setComponents] = useState<ComponentInstance[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [scriptIndex, setScriptIndex] = useState(0)
  const historyRef = useRef<Array<{ role: string; content: string }>>([
    { role: "system", content: SYSTEM_PROMPT },
  ])
  // hint ID → 对应的 workspaceActions
  const hintActionsRef = useRef<Map<string, WorkspaceAction[]>>(new Map())

  // 当前剧本步骤的建议
  const currentStep = scenario?.[scriptIndex]
  const suggestions: string[] = []
  if (currentStep?.trigger.type === "user_send") {
    if (currentStep.suggestions) {
      suggestions.push(...currentStep.suggestions)
    } else if (currentStep.userMessage) {
      suggestions.push(currentStep.userMessage)
    }
  }

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
            c.id === a.componentId ? { ...c, data: { ...c.data, ...a.data } } : c
          )
        } else if (a.action === "remove") {
          next = next.filter((c) => c.id !== a.componentId)
        }
      }
      return next
    })
  }, [])

  // 处理模型的 tool call
  const handleToolCall = useCallback((tc: { name: string; arguments: string }) => {
    try {
      const args = JSON.parse(tc.arguments)
      if (tc.name === "create_component") {
        applyActions([{ action: "create", componentId: args.component_id, componentType: args.component_type, data: args.data }])
      } else if (tc.name === "update_component") {
        applyActions([{ action: "update", componentId: args.component_id, data: args.data }])
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

      // 加用户消息
      if (step.userMessage) {
        setChatMessages((prev) => [...prev, { id: nextId(), role: "user", text: step.userMessage! }])
        historyRef.current.push({ role: "user", content: step.userMessage })
      }

      // 逐字打出 AI 消息 → 执行工作区动作 → 添加 hints → 推进 index
      typeText(step.aiMessage, (msgId) => {
        if (step.workspaceActions) applyActions(step.workspaceActions)
        historyRef.current.push({ role: "assistant", content: step.aiMessage })

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
    [scenario, scriptIndex, isTyping, typeText, applyActions]
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

      let aiText = ""
      const collectedToolCalls: Array<{ name: string; arguments: string }> = []

      streamChat(
        history,
        (chunk) => {
          aiText += chunk
          // 流式显示时先原样展示，完成后再清理
          setChatMessages((prev) =>
            prev.map((m) => (m.id === aiMsgId ? { ...m, text: aiText } : m))
          )
        },
        (tc) => {
          collectedToolCalls.push(tc)
          handleToolCall(tc)
        },
        () => {
          setIsTyping(false)

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
          for (const tc of collectedToolCalls) {
            historyRef.current.push({
              role: "tool",
              content: JSON.stringify({ success: true, action: tc.name }),
              // @ts-expect-error OpenAI format needs tool_call_id
              tool_call_id: assistantEntry.tool_calls?.find(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (t: any) => t.function.name === tc.name
              )?.id,
            })
          }
        }
      )
    },
    [handleToolCall]
  )

  // ─── 发送消息（点 sug → 走剧本；自己打字 → 走 AI）───
  const sendMessage = useCallback(
    (text: string, scripted = false) => {
      if (isTyping || !text.trim()) return

      if (scripted) {
        advanceScript({ type: "user_send" })
      } else {
        setChatMessages((prev) => [...prev, { id: nextId(), role: "user", text }])
        historyRef.current.push({ role: "user", content: text })
        callAI(historyRef.current)
      }
    },
    [isTyping, advanceScript, callAI]
  )

  // ─── 组件交互 ───
  const handleComponentInteract = useCallback(
    (componentId: string, value?: string) => {
      if (isTyping) return

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
    [isTyping, advanceScript, components, callAI]
  )

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

  // ─── 一键整理：移除过程态组件，保留方案和辅助组件 ───
  const organizeWorkspace = useCallback(() => {
    setComponents((prev) =>
      prev.filter((c) => {
        const cat = COMPONENT_CATEGORIES[c.type]
        return cat === "plan" || cat === "auxiliary"
      })
    )
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

  return {
    chatMessages,
    components,
    isTyping,
    suggestions,
    sendMessage,
    handleComponentInteract,
    closeComponent,
    organizeWorkspace,
    handleHintClick,
    reorderComponents,
  }
}
