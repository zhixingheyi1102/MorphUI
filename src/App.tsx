import { useCallback } from "react"
import { useChat } from "./engine/useChat"
import ChatPanel from "./chat/ChatPanel"
import Workspace from "./workspace/Workspace"

export default function App() {
  const { chatMessages, components, isTyping, sendMessage, handleComponentInteract } =
    useChat()

  const handleSend = useCallback(
    (text: string) => {
      sendMessage(text)
    },
    [sendMessage]
  )

  const handleInteract = useCallback(
    (componentId: string, value?: string) => {
      handleComponentInteract(componentId, value)
    },
    [handleComponentInteract]
  )

  return (
    <div className="h-screen flex bg-gray-100">
      {/* 左侧聊天面板 */}
      <div className="w-96 shrink-0 border-r border-gray-200">
        <ChatPanel
          messages={chatMessages}
          isTyping={isTyping}
          onSend={handleSend}
        />
      </div>

      {/* 右侧工作区 */}
      <Workspace components={components} onInteract={handleInteract} />
    </div>
  )
}
