import { useRef, useEffect, useState } from "react"
import { HandWaving, Lightbulb, ChatCircle } from "@phosphor-icons/react"
import type { ChatMessage } from "../engine/types"

type Props = {
  messages: ChatMessage[]
  isTyping: boolean
  isThinking: boolean
  suggestions: string[]
  quotedSpot: string | null
  onClearQuote: () => void
  onSend: (text: string, scripted?: boolean) => void
  onHintClick: (hintId: string) => void
}

export default function ChatPanel({ messages, isTyping, isThinking, suggestions, quotedSpot, onClearQuote, onSend, onHintClick }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [input, setInput] = useState("")

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping, isThinking])

  // 引用景点时聚焦输入框，方便用户直接打字追问
  useEffect(() => {
    if (quotedSpot) inputRef.current?.focus()
  }, [quotedSpot])

  const handleSubmit = () => {
    const text = input.trim()
    if (!text || isTyping) return
    // 带上被引用的景点作为上下文
    const finalText = quotedSpot ? `关于「${quotedSpot}」：${text}` : text
    setInput("")
    onClearQuote()
    onSend(finalText, false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--paper-oat)", fontFamily: "var(--font-cn)", color: "var(--ink)" }}>
      {/* 头部 */}
      <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--ink-line)", background: "var(--paper-kraft)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "var(--ink)", color: "var(--paper-cream)", fontSize: "var(--fs-data)", fontFamily: "var(--font-display)" }}
          >
            M
          </div>
          <div>
            <h2 style={{ fontSize: "var(--fs-data)", color: "var(--ink)" }}>MorphUI 助手</h2>
            <p style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>随时帮你规划</p>
          </div>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center mt-20" style={{ color: "var(--ink-soft)" }}>
            <p className="flex items-center justify-center gap-1.5 mb-1" style={{ fontSize: "var(--fs-sub)" }}><HandWaving size={20} weight="fill" /> 你好！</p>
            <p style={{ fontSize: "var(--fs-data)" }}>说说你想做什么——规划、整理、对比都行，我在右侧生成给你</p>
          </div>
        )}
        {messages.map((msg) => {
          const isUser = msg.role === "user"
          return (
            <div key={msg.id}>
              <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[85%] px-4 py-2.5 leading-relaxed"
                  style={{
                    fontSize: "var(--fs-data)",
                    borderRadius: "var(--r-sticker)",
                    background: isUser ? "var(--ink-blue)" : "var(--paper-cream)",
                    color: isUser ? "var(--paper-cream)" : "var(--ink)",
                    border: isUser ? "none" : "1px solid var(--ink-line)",
                    boxShadow: "var(--z1)",
                  }}
                >
                  {/* 思考态：空气泡里显示跳动的点 */}
                  {msg.role === "ai" && isThinking && !msg.text && msg.id === messages[messages.length - 1]?.id ? (
                    <span className="flex items-center gap-1 py-0.5">
                      <span className="text-xs mr-1" style={{ color: "var(--ink-soft)" }}>思考中</span>
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full animate-bounce"
                          style={{ background: "var(--ink-soft)", animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </span>
                  ) : (
                    <>
                      {msg.text}
                      {msg.role === "ai" && isTyping && msg.id === messages[messages.length - 1]?.id && (
                        <span className="inline-block w-0.5 h-4 ml-0.5 animate-pulse align-middle" style={{ background: "var(--ink-soft)" }} />
                      )}
                    </>
                  )}
                </div>
              </div>
              {/* Hints — 紧贴 AI 消息下方 */}
              {msg.role === "ai" && msg.hints && msg.hints.length > 0 && !isTyping && (
                <div className="flex flex-wrap gap-1.5 mt-1.5 ml-1">
                  {msg.hints.map((hint) => (
                    <button
                      key={hint.id}
                      onClick={() => onHintClick(hint.id)}
                      className="px-3 py-1 rounded-full transition-colors hover:brightness-105"
                      style={{ fontSize: "var(--fs-caption)", border: "1px solid var(--ink-line)", color: "var(--ink-soft)", background: "var(--paper-cream)" }}
                    >
                      {hint.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 建议 + 输入区 */}
      <div style={{ borderTop: "1px solid var(--ink-line)", background: "var(--paper-kraft)" }}>
        {/* Suggestions（蓝墨=可交互追问） */}
        {suggestions.length > 0 && !isTyping && (
          <div className="px-4 pt-3 flex flex-wrap gap-2">
            {suggestions.map((sug) => (
              <button
                key={sug}
                onClick={() => onSend(sug, true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors hover:brightness-105"
                style={{ fontSize: "var(--fs-caption)", border: "1px solid var(--ink-blue)", color: "var(--ink-blue)", background: "var(--paper-cream)" }}
              >
                <Lightbulb size={13} weight="fill" /> {sug}
              </button>
            ))}
          </div>
        )}

        {/* 引用景点标签 */}
        {quotedSpot && (
          <div className="px-4 pt-3">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ fontSize: "var(--fs-caption)", background: "var(--paper-blue)", color: "var(--ink-blue)", border: "1px solid var(--ink-blue)" }}
            >
              <ChatCircle size={13} weight="fill" /> 追问：{quotedSpot}
              <button onClick={onClearQuote} className="ml-0.5 leading-none hover:brightness-110" style={{ fontSize: "13px" }}>✕</button>
            </span>
          </div>
        )}

        {/* 输入框 */}
        <div className="px-4 py-3 flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isTyping ? "AI 正在回复..." : quotedSpot ? `就「${quotedSpot}」问点什么…` : "输入你的想法，或点击上方建议"}
            disabled={isTyping}
            className="flex-1 px-4 py-2.5 outline-none disabled:opacity-50"
            style={{
              fontSize: "var(--fs-data)",
              borderRadius: "var(--r-paper)",
              background: "var(--paper-cream)",
              border: "1px solid var(--ink-line)",
              color: "var(--ink-blue)",
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={isTyping || !input.trim()}
            className="px-4 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors hover:brightness-105"
            style={{
              fontSize: "var(--fs-data)",
              borderRadius: "var(--r-paper)",
              background: "var(--stamp-red)",
              color: "var(--paper-cream)",
            }}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  )
}
