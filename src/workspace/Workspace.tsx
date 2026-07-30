import type { ComponentInstance } from "../engine/types"
import registry from "../components/registry"

type Props = {
  components: ComponentInstance[]
  onInteract: (componentId: string, value?: string) => void
}

export default function Workspace({ components, onInteract }: Props) {
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
        {components.map((comp) => {
          const Component = registry[comp.type]
          if (!Component) {
            return (
              <div key={comp.id} className="p-4 bg-red-50 rounded-xl text-red-500 text-sm shrink-0">
                未知组件: {comp.type}
              </div>
            )
          }
          return (
            <div key={comp.id} className="animate-slideIn">
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
