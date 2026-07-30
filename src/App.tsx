import { useCallback } from "react"
import { useScenario } from "./engine/useScenario"
import scenario from "./scenario/cityWalk"
import ChatPanel from "./chat/ChatPanel"
import Workspace from "./workspace/Workspace"

export default function App() {
  const { chatMessages, components, isTyping, pendingUserMessage, advance } =
    useScenario(scenario)

  const handleSend = useCallback(() => {
    advance({ type: "user_send" })
  }, [advance])

  const handleComponentInteract = useCallback(
    (componentId: string, value?: string) => {
      advance({ type: "component_interact", componentId, value })
    },
    [advance]
  )

  return (
    <div className="h-screen flex bg-gray-100">
      {/* 左侧聊天面板 */}
      <div className="w-96 shrink-0 border-r border-gray-200">
        <ChatPanel
          messages={chatMessages}
          isTyping={isTyping}
          pendingUserMessage={pendingUserMessage}
          onSend={handleSend}
        />
      </div>

      {/* 右侧工作区 */}
      <Workspace components={components} onInteract={handleComponentInteract} />
    </div>
  )
}
