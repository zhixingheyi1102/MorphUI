import { useState, useCallback, useRef } from "react"
import type { Step, ChatMessage, ComponentInstance, StepTrigger } from "./types"

let messageCounter = 0
function nextId() {
  return `msg-${++messageCounter}`
}

export function useScenario(steps: Step[]) {
  const [stepIndex, setStepIndex] = useState(0)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [components, setComponents] = useState<ComponentInstance[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentStep = steps[stepIndex] as Step | undefined
  const pendingUserMessage =
    currentStep?.trigger.type === "user_send" ? (currentStep.userMessage ?? "") : null

  const typeAiMessage = useCallback((text: string, onDone: () => void) => {
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
        typingRef.current = setTimeout(tick, 15 + Math.random() * 25)
      } else {
        setIsTyping(false)
        onDone()
      }
    }
    typingRef.current = setTimeout(tick, 300)
  }, [])

  const applyActions = useCallback((actions: Step["workspaceActions"]) => {
    if (!actions) return
    setComponents((prev) => {
      let next = [...prev]
      for (const a of actions) {
        if (a.action === "create" && a.componentType) {
          // 如果已存在同 id 的组件，先移除
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

  const advance = useCallback(
    (trigger: StepTrigger) => {
      const step = steps[stepIndex]
      if (!step || isTyping) return false

      // 检查 trigger 是否匹配
      if (step.trigger.type !== trigger.type) return false
      if (
        step.trigger.type === "component_interact" &&
        trigger.type === "component_interact" &&
        step.trigger.componentId !== trigger.componentId
      ) {
        return false
      }

      // 添加用户消息
      if (step.userMessage) {
        setChatMessages((prev) => [
          ...prev,
          { id: nextId(), role: "user", text: step.userMessage! },
        ])
      }

      // 打出 AI 消息，完成后执行工作区动作
      typeAiMessage(step.aiMessage, () => {
        applyActions(step.workspaceActions)
        setStepIndex((i) => i + 1)
      })

      return true
    },
    [stepIndex, steps, isTyping, typeAiMessage, applyActions]
  )

  return {
    chatMessages,
    components,
    isTyping,
    isFinished: stepIndex >= steps.length,
    pendingUserMessage,
    advance,
  }
}
