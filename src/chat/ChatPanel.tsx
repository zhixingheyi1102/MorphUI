import { useRef, useEffect, useState } from "react"
import type { ChatMessage } from "../engine/types"

type Props = {
  messages: ChatMessage[]
  isTyping: boolean
  onSend: (text: string) => void
}

export default function ChatPanel({ messages, isTyping, onSend }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState("")

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  const handleSubmit = () => {
    const text = input.trim()
    if (!text || isTyping) return
    setInput("")
    onSend(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

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
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-lg mb-1">👋 你好！</p>
            <p className="text-sm">告诉我你想去哪里旅行，我来帮你规划</p>
          </div>
        )}
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
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isTyping ? "AI 正在回复..." : "输入你的想法..."}
            disabled={isTyping}
            className="flex-1 px-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={isTyping || !input.trim()}
            className="px-4 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  )
}
