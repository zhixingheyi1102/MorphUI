import { useState, useCallback } from "react"

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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 w-80 shrink-0">
      <h3 className="text-sm font-medium text-gray-700 mb-3">📋 {data.title}</h3>

      {/* 天气提示 */}
      {data.weather && (
        <div className="mb-4 p-3 bg-blue-50 rounded-xl text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-blue-700">
              🌤 {data.weather.city} · {data.weather.date}
            </span>
            <span className="text-blue-600">{data.weather.temp}</span>
          </div>
          <p className="text-blue-600">{data.weather.condition}</p>
          <p className="text-blue-500 mt-1">💡 {data.weather.tips}</p>
        </div>
      )}

      {/* 进度 */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-400 rounded-full transition-all duration-300"
            style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 shrink-0">
          {doneCount}/{items.length}
        </span>
      </div>

      {/* 清单列表 */}
      <div className="space-y-1.5 mb-3">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex items-start gap-2.5 py-1 px-1 rounded-lg hover:bg-gray-50 cursor-pointer group transition-colors"
          >
            <div className="mt-0.5 shrink-0">
              <div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                  item.checked
                    ? "bg-indigo-500 border-indigo-500"
                    : "border-gray-300 group-hover:border-indigo-300"
                }`}
                onClick={(e) => {
                  e.preventDefault()
                  toggleItem(item.id)
                }}
              >
                {item.checked && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span
              className={`text-sm leading-snug transition-all ${
                item.checked ? "text-gray-400 line-through" : "text-gray-700"
              }`}
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
          className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200 transition-colors"
        />
        <button
          onClick={addItem}
          disabled={!inputValue.trim()}
          className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          添加
        </button>
      </div>
    </div>
  )
}
