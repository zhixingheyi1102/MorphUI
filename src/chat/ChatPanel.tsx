import { useRef, useEffect } from "react"
import type { ChatMessage } from "../engine/types"

type Props = {
  messages: ChatMessage[]
  isTyping: boolean
  pendingUserMessage: string | null
  onSend: () => void
}

export default function ChatPanel({ messages, isTyping, pendingUserMessage, onSend }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  const canSend = pendingUserMessage !== null && !isTyping

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 头部 */}
      <div className="px-5 py-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm">
            M
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">MorphUI 助手</h2>
            <p className="text-xs text-gray-400">随时帮你规划</p>
          </div>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-indigo-500 text-white rounded-br-md"
                  : "bg-white text-gray-700 shadow-sm border border-gray-100 rounded-bl-md"
              }`}
            >
              {msg.text}
              {msg.role === "ai" && isTyping && msg.id === messages[messages.length - 1]?.id && (
                <span className="inline-block w-0.5 h-4 bg-gray-400 ml-0.5 animate-pulse align-middle" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 输入区 */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white">
        {canSend ? (
          <button
            onClick={onSend}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all group"
          >
            <span className="text-sm text-gray-600">{pendingUserMessage}</span>
            <span className="text-xs text-gray-400 group-hover:text-indigo-500 transition-colors">
              点击发送 →
            </span>
          </button>
        ) : (
          <div className="px-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-400">
            {isTyping ? "AI 正在回复..." : "在右边组件上操作以继续..."}
          </div>
        )}
      </div>
    </div>
  )
}
