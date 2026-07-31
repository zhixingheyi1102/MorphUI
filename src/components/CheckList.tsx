import { useState, useCallback } from "react"
import { ClipboardText, CloudSun, Lightbulb } from "@phosphor-icons/react"

type TodoItem = {
  id: string
  text: string
  checked: boolean
}

type WeatherInfo = {
  city: string
  date: string
  temp: string
  condition: string
  tips: string
}

type Props = {
  data: {
    title: string
    weather?: WeatherInfo
    items: TodoItem[]
  }
  onInteract: () => void
}

let itemCounter = 100

export default function CheckList({ data }: Props) {
  const [items, setItems] = useState<TodoItem[]>(data.items)
  const [inputValue, setInputValue] = useState("")

  const toggleItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    )
  }, [])

  const addItem = useCallback(() => {
    const text = inputValue.trim()
    if (!text) return
    setItems((prev) => [
      ...prev,
      { id: `custom-${++itemCounter}`, text, checked: false },
    ])
    setInputValue("")
  }, [inputValue])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        addItem()
      }
    },
    [addItem],
  )

  const doneCount = items.filter((i) => i.checked).length

  return (
    <div
      className="p-5 w-80 shrink-0"
      style={{
        background: "var(--paper-manila)",
        border: "1px solid var(--ink-line)",
        borderRadius: "var(--r-sticker)",
        boxShadow: "var(--z1)",
        fontFamily: "var(--font-cn)",
        color: "var(--ink)",
      }}
    >
      <h3 className="flex items-center gap-1.5 mb-3" style={{ fontSize: "var(--fs-data)", color: "var(--ink)" }}><ClipboardText size={16} weight="fill" /> {data.title}</h3>

      {/* 天气提示（蓝纸） */}
      {data.weather && (
        <div
          className="mb-4 p-3"
          style={{ background: "var(--paper-blue)", borderRadius: "var(--r-paper)", border: "1px solid var(--ink-line)", fontSize: "var(--fs-caption)", color: "var(--ink-blue)" }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="inline-flex items-center gap-1.5">
              <CloudSun size={15} weight="fill" /> {data.weather.city} · {data.weather.date}
            </span>
            <span>{data.weather.temp}</span>
          </div>
          <p>{data.weather.condition}</p>
          <p className="mt-1 flex items-center gap-1.5"><Lightbulb size={14} weight="fill" /> {data.weather.tips}</p>
        </div>
      )}

      {/* 进度 */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.08)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%`, background: "var(--ink)" }}
          />
        </div>
        <span className="shrink-0" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)", fontFamily: "var(--font-en)" }}>
          {doneCount}/{items.length}
        </span>
      </div>

      {/* 清单列表 */}
      <div className="space-y-1.5 mb-3">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex items-start gap-2.5 py-1 px-1 cursor-pointer group transition-colors hover:brightness-95"
            style={{ borderRadius: "var(--r-paper)" }}
          >
            <div className="mt-0.5 shrink-0">
              <div
                className="w-4 h-4 flex items-center justify-center transition-all"
                style={{
                  borderRadius: "var(--r-paper)",
                  border: `2px solid ${item.checked ? "var(--ink-blue)" : "var(--ink-line)"}`,
                  background: item.checked ? "var(--ink-blue)" : "transparent",
                }}
                onClick={(e) => {
                  e.preventDefault()
                  toggleItem(item.id)
                }}
              >
                {item.checked && (
                  <svg className="w-2.5 h-2.5" style={{ color: "var(--paper-cream)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span
              className="leading-snug transition-all"
              style={{
                fontSize: "var(--fs-data)",
                color: item.checked ? "var(--postmark)" : "var(--ink)",
                textDecoration: item.checked ? "line-through" : "none",
              }}
            >
              {item.text}
            </span>
          </label>
        ))}
      </div>

      {/* 添加新项 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="添加新项目…"
          className="flex-1 px-3 py-1.5 focus:outline-none transition-colors"
          style={{
            fontSize: "var(--fs-data)",
            borderRadius: "var(--r-paper)",
            border: "1px solid var(--ink-line)",
            background: "rgba(255,255,255,0.4)",
            color: "var(--ink)",
          }}
        />
        <button
          onClick={addItem}
          disabled={!inputValue.trim()}
          className="px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-105"
          style={{
            fontSize: "var(--fs-data)",
            borderRadius: "var(--r-paper)",
            background: "var(--paper-kraft)",
            border: "1px solid var(--ink)",
            color: "var(--ink)",
          }}
        >
          添加
        </button>
      </div>
    </div>
  )
}
