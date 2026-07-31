import { useState, useCallback } from "react"
import { CloudSun, Lightbulb } from "@phosphor-icons/react"

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

const RULE = "color-mix(in srgb, var(--ink) 16%, transparent)"

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
      className="w-80 shrink-0 overflow-hidden"
      style={{
        border: "1px solid var(--ink-line)",
        borderRadius: "var(--r-sticker)",
        boxShadow: "var(--z1)",
        fontFamily: "var(--font-cn)",
        color: "var(--ink)",
      }}
    >
      {/* 牛皮纸表头带 */}
      <div
        className="px-4 pt-3 pb-2.5"
        style={{ background: "var(--paper-kraft)", borderBottom: "1.5px solid var(--ink)" }}
      >
        <div className="flex items-start justify-between">
          <span
            className="px-2 py-0.5"
            style={{
              border: "1.5px solid var(--ink)",
              fontSize: "var(--fs-data)",
              fontWeight: 400,
              background: "color-mix(in srgb, #fff 22%, transparent)",
            }}
          >
            {data.title}
          </span>
          <div className="text-right" style={{ fontFamily: "var(--font-en)", fontSize: 9, letterSpacing: "0.14em", color: "var(--ink)" }}>
            <div>NO.00090</div>
            <div className="mt-0.5" style={{ color: "color-mix(in srgb, var(--ink) 72%, transparent)" }}>
              {doneCount}/{items.length} PACKED
            </div>
          </div>
        </div>
        <div className="mt-1.5" style={{ fontFamily: "var(--font-en)", fontSize: 8, letterSpacing: "0.3em", color: "color-mix(in srgb, var(--ink) 65%, transparent)" }}>
          PACKING LIST · MORPH TRAVEL CO.
        </div>
      </div>

      {/* 便签本主体：奶油纸 + 真实纸纹 */}
      <div
        className="relative"
        style={{
          background: "linear-gradient(rgba(246,241,223,0.9), rgba(246,241,223,0.9)), url('/textures/paper-crumpled.jpg') center/420px auto",
        }}
      >
        {/* 右侧 check 细竖纹栏 */}
        <div
          className="absolute inset-y-0 right-0 pointer-events-none"
          style={{
            width: 44,
            borderLeft: `1px solid ${RULE}`,
            backgroundImage: "repeating-linear-gradient(90deg, color-mix(in srgb, var(--ink) 7%, transparent) 0 1px, transparent 1px 5px)",
          }}
        />

        {/* 天气：蓝墨手记行 */}
        {data.weather && (
          <div
            className="px-4 py-2.5"
            style={{ borderBottom: `1px dashed ${RULE}`, fontSize: "var(--fs-caption)", color: "var(--ink-blue)" }}
          >
            <div className="flex items-center justify-between" style={{ paddingRight: 44 }}>
              <span className="inline-flex items-center gap-1.5">
                <CloudSun size={14} weight="fill" /> {data.weather.city} · {data.weather.date}
              </span>
              <span className="inline-flex items-baseline" style={{ fontFamily: "var(--font-en)", letterSpacing: "0.02em" }}>
                {data.weather.temp.replace(/\s*°?C$/i, "").replace(/-/g, "–")}
                <span style={{ fontSize: "0.78em", marginLeft: 1 }}>°C</span>
              </span>
            </div>
            <p className="mt-0.5" style={{ paddingRight: 44, paddingLeft: 20 }}>{data.weather.condition}</p>
            <p className="mt-0.5 flex items-center gap-1.5" style={{ paddingRight: 44 }}>
              <Lightbulb size={13} weight="fill" /> {data.weather.tips}
            </p>
          </div>
        )}

        {/* 栏头：ITEM / CHECK */}
        <div className="flex items-center" style={{ borderBottom: `1px solid ${RULE}` }}>
          <span className="flex-1 px-4 py-1" style={{ fontFamily: "var(--font-en)", fontSize: 8, letterSpacing: "0.24em", color: "var(--postmark)" }}>
            ITEM
          </span>
          <span className="text-center" style={{ width: 44, fontFamily: "var(--font-en)", fontSize: 8, letterSpacing: "0.14em", color: "var(--postmark)" }}>
            CHECK
          </span>
        </div>

        {/* 横线清单 */}
        {items.map((item) => (
          <label
            key={item.id}
            className="flex items-center cursor-pointer group"
            style={{ borderBottom: `1px solid ${RULE}`, minHeight: 32 }}
          >
            <span
              className="flex-1 px-4 leading-snug transition-all"
              style={{
                fontSize: "var(--fs-data)",
                fontWeight: 400,
                color: item.checked ? "var(--postmark)" : "var(--ink)",
                textDecoration: item.checked ? "line-through" : "none",
              }}
            >
              {item.text}
            </span>
            <span className="flex items-center justify-center shrink-0" style={{ width: 44 }}>
              <span
                className="w-[15px] h-[15px] flex items-center justify-center transition-all"
                style={{
                  border: `1.5px solid ${item.checked ? "var(--ink-blue)" : "color-mix(in srgb, var(--ink) 45%, transparent)"}`,
                  background: "transparent",
                }}
                onClick={(e) => {
                  e.preventDefault()
                  toggleItem(item.id)
                }}
              >
                {item.checked && (
                  <svg viewBox="0 0 14 14" width="17" height="17" style={{ overflow: "visible", marginTop: -3 }}>
                    <path
                      d="M2.5 7.5 L5.5 10.5 L12 2"
                      fill="none"
                      stroke="var(--ink-blue)"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
            </span>
          </label>
        ))}

        {/* 添加新项：留白横线上直接手写 */}
        <div className="flex items-center" style={{ minHeight: 32 }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="添加新项目…"
            className="flex-1 px-4 bg-transparent focus:outline-none"
            style={{ fontSize: "var(--fs-data)", fontWeight: 400, color: "var(--ink)" }}
          />
          <button
            onClick={addItem}
            disabled={!inputValue.trim()}
            className="flex items-center justify-center shrink-0 disabled:opacity-35 transition-opacity"
            style={{ width: 44, height: 32, color: "var(--ink-blue)", fontFamily: "var(--font-en)", fontSize: 15 }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
