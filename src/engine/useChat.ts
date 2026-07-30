import { useState, useCallback, useRef } from "react"
import type { ChatMessage, ComponentInstance } from "./types"
import { streamChat, SYSTEM_PROMPT } from "./api"

let msgCounter = 0
function nextId() {
  return `msg-${++msgCounter}`
}

export function useChat() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [components, setComponents] = useState<ComponentInstance[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const historyRef = useRef<Array<{ role: string; content: string }>>([
    { role: "system", content: SYSTEM_PROMPT },
  ])

  // 处理组件操作
  const handleToolCall = useCallback((tc: { name: string; arguments: string }) => {
    try {
      const args = JSON.parse(tc.arguments)

      if (tc.name === "create_component") {
        setComponents((prev) => {
          const next = prev.filter((c) => c.id !== args.component_id)
          next.push({
            id: args.component_id,
            type: args.component_type,
            data: args.data ?? {},
          })
          return next
        })
      } else if (tc.name === "update_component") {
        setComponents((prev) =>
          prev.map((c) =>
            c.id === args.component_id ? { ...c, data: { ...c.data, ...args.data } } : c
          )
        )
      } else if (tc.name === "remove_component") {
        setComponents((prev) => prev.filter((c) => c.id !== args.component_id))
      }
    } catch (e) {
      console.error("Tool call parse error:", e, tc)
    }
  }, [])

  // 发送消息
  const sendMessage = useCallback(
    (text: string) => {
      if (isTyping || !text.trim()) return

      // 加用户消息
      const userMsg: ChatMessage = { id: nextId(), role: "user", text }
      setChatMessages((prev) => [...prev, userMsg])
      historyRef.current.push({ role: "user", content: text })

      // 准备 AI 消息
      const aiMsgId = nextId()
      setChatMessages((prev) => [...prev, { id: aiMsgId, role: "ai", text: "" }])
      setIsTyping(true)

      let aiText = ""
      const collectedToolCalls: Array<{ name: string; arguments: string }> = []

      streamChat(
        historyRef.current,
        // onText
        (chunk) => {
          aiText += chunk
          setChatMessages((prev) =>
            prev.map((m) => (m.id === aiMsgId ? { ...m, text: aiText } : m))
          )
        },
        // onToolCall
        (tc) => {
          collectedToolCalls.push(tc)
          handleToolCall(tc)
        },
        // onDone
        () => {
          setIsTyping(false)
          // 记录到历史
          if (aiText) {
            historyRef.current.push({ role: "assistant", content: aiText })
          }
          // 如果有 tool calls，也记录到历史（简化处理）
          if (collectedToolCalls.length > 0 && !aiText) {
            historyRef.current.push({
              role: "assistant",
              content: `[已执行组件操作: ${collectedToolCalls.map((tc) => tc.name).join(", ")}]`,
            })
          }
        }
      )
    },
    [isTyping, handleToolCall]
  )

  // 组件交互 → 作为用户消息发给模型
  const handleComponentInteract = useCallback(
    (componentId: string, value?: string) => {
      const comp = components.find((c) => c.id === componentId)
      const compName = comp?.type ?? componentId

      let message: string
      if (value) {
        message = `[用户在「${compName}」组件上选择了: ${value}]`
      } else {
        message = `[用户在「${compName}」组件上点击了确认]`
      }

      // 以系统消息形式发送，不在聊天面板显示
      historyRef.current.push({ role: "user", content: message })

      const aiMsgId = nextId()
      setChatMessages((prev) => [...prev, { id: aiMsgId, role: "ai", text: "" }])
      setIsTyping(true)

      let aiText = ""
      const collectedToolCalls: Array<{ name: string; arguments: string }> = []

      streamChat(
        historyRef.current,
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
          if (aiText) {
            historyRef.current.push({ role: "assistant", content: aiText })
          }
          if (collectedToolCalls.length > 0 && !aiText) {
            historyRef.current.push({
              role: "assistant",
              content: `[已执行组件操作: ${collectedToolCalls.map((tc) => tc.name).join(", ")}]`,
            })
          }
        }
      )
    },
    [isTyping, components, handleToolCall]
  )

  return {
    chatMessages,
    components,
    isTyping,
    sendMessage,
    handleComponentInteract,
  }
}
