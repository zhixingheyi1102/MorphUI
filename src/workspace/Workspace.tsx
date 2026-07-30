import { useState, useRef, useCallback } from "react"
import type { ComponentInstance } from "../engine/types"
import registry from "../components/registry"

type Props = {
  components: ComponentInstance[]
  onInteract: (componentId: string, value?: string) => void
  onClose: (componentId: string) => void
  onReorder: (fromIndex: number, toIndex: number) => void
}

export default function Workspace({ components, onInteract, onClose, onReorder }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const dragCounter = useRef(0)

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = "move"
    // 让拖拽时有个半透明的预览
    const el = e.currentTarget as HTMLElement
    el.style.opacity = "0.5"
  }, [])

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement
    el.style.opacity = "1"
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      onReorder(dragIndex, overIndex)
    }
    setDragIndex(null)
    setOverIndex(null)
    dragCounter.current = 0
  }, [dragIndex, overIndex, onReorder])

  const handleDragEnter = useCallback((index: number) => {
    dragCounter.current++
    setOverIndex(index)
  }, [])

  const handleDragLeave = useCallback(() => {
    dragCounter.current--
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }, [])

  if (components.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-300">
        <div className="text-center">
          <div className="text-5xl mb-4">✨</div>
          <p className="text-lg font-light">在左侧对话中开始你的规划</p>
          <p className="text-sm mt-1">组件将在这里动态生成</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-x-auto">
      <div className="flex gap-4 p-6 h-full items-start">
        {components.map((comp, index) => {
          const Component = registry[comp.type]
          if (!Component) {
            return (
              <div key={comp.id} className="p-4 bg-red-50 rounded-xl text-red-500 text-sm shrink-0">
                未知组件: {comp.type}
              </div>
            )
          }

          const isDragging = dragIndex === index
          const isOver = overIndex === index && dragIndex !== index

          return (
            <div
              key={comp.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragEnter={() => handleDragEnter(index)}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              className={`
                animate-slideIn relative group transition-transform duration-200 ease-out
                ${isDragging ? "scale-95" : ""}
                ${isOver ? "translate-x-4" : ""}
              `}
            >
              {/* 吸附指示线 */}
              {isOver && (
                <div className="absolute -left-3 top-0 bottom-0 w-1 bg-indigo-400 rounded-full z-10" />
              )}

              {/* 关闭按钮 */}
              <button
                onClick={() => onClose(comp.id)}
                className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-gray-200 hover:bg-red-400 hover:text-white text-gray-500 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              >
                ✕
              </button>

              {/* 拖拽手柄提示 */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 rounded-full bg-gray-300" />
                  <div className="w-1 h-1 rounded-full bg-gray-300" />
                  <div className="w-1 h-1 rounded-full bg-gray-300" />
                </div>
              </div>

              <Component
                data={comp.data}
                onInteract={(...args: unknown[]) =>
                  onInteract(comp.id, args[0] as string | undefined)
                }
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
