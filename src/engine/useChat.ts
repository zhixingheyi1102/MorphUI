import { useState, useCallback, useRef } from "react"
import type { ChatMessage, ComponentInstance, Step, WorkspaceAction } from "./types"
import { streamChat, SYSTEM_PROMPT } from "./api"

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

  // 当前剧本步骤的建议（仅 user_send 类型的才显示 sug）
  const currentStep = scenario?.[scriptIndex]
  const suggestions: string[] = []
  if (currentStep?.trigger.type === "user_send" && currentStep.userMessage) {
    suggestions.push(currentStep.userMessage)
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
      } else if (tc.name === "remove_component") {
        applyActions([{ action: "remove", componentId: args.component_id }])
      }
    } catch (e) {
      console.error("Tool call parse error:", e, tc)
    }
  }, [applyActions])

  // 逐字打出文字
  const typeText = useCallback(
    (text: string, onDone: () => void) => {
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
          onDone()
        }
      }
      setTimeout(tick, 300)
    },
    []
  )

  // ─── 剧本模式：走预设的 Step ───
  const advanceScript = useCallback(
    (trigger: { type: "user_send" } | { type: "component_interact"; componentId: string }) => {
      const step = scenario?.[scriptIndex]
      if (!step || isTyping) return false

      // 检查 trigger 匹配
      if (step.trigger.type !== trigger.type) return false
      if (
        step.trigger.type === "component_interact" &&
        trigger.type === "component_interact" &&
        step.trigger.componentId !== trigger.componentId
      ) return false

      // 加用户消息
      if (step.userMessage) {
        setChatMessages((prev) => [...prev, { id: nextId(), role: "user", text: step.userMessage! }])
        historyRef.current.push({ role: "user", content: step.userMessage })
      }

      // 逐字打出 AI 消息 → 执行工作区动作 → 推进 index
      typeText(step.aiMessage, () => {
        if (step.workspaceActions) applyActions(step.workspaceActions)
        historyRef.current.push({ role: "assistant", content: step.aiMessage })
        setScriptIndex((i) => i + 1)
      })

      return true
    },
    [scenario, scriptIndex, isTyping, typeText, applyActions]
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
          // 调试：模型没调工具但似乎应该调
          if (collectedToolCalls.length === 0 && aiText) {
            const shouldHaveCalled = /餐厅|酒店|景点|行程|路线|地图|推荐/.test(aiText)
            if (shouldHaveCalled) {
              console.warn("[MorphUI] 模型回复了信息但没调用工具，可能需要重试", aiText)
            }
          }
          if (aiText) {
            historyRef.current.push({ role: "assistant", content: aiText })
          }
          if (collectedToolCalls.length > 0 && !aiText) {
            historyRef.current.push({
              role: "assistant",
              content: `[已执行组件操作: ${collectedToolCalls.map((t) => t.name).join(", ")}]`,
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
      const stepped = advanceScript({ type: "component_interact", componentId })
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

  return {
    chatMessages,
    components,
    isTyping,
    suggestions,
    sendMessage,
    handleComponentInteract,
  }
}
