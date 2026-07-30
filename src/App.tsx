import { useCallback } from "react"
import { useChat } from "./engine/useChat"
import scenario from "./scenario/cityWalk"
import ChatPanel from "./chat/ChatPanel"
import Workspace from "./workspace/Workspace"

export default function App() {
  const {
    chatMessages, components, isTyping, suggestions,
    sendMessage, handleComponentInteract, closeComponent,
  } = useChat(scenario)

  const handleSend = useCallback(
    (text: string, scripted = false) => sendMessage(text, scripted),
    [sendMessage]
  )

  const handleInteract = useCallback(
    (componentId: string, value?: string) => handleComponentInteract(componentId, value),
    [handleComponentInteract]
  )

  return (
    <div className="h-screen flex bg-gray-100">
      <div className="w-96 shrink-0 border-r border-gray-200">
        <ChatPanel
          messages={chatMessages}
          isTyping={isTyping}
          suggestions={suggestions}
          onSend={handleSend}
        />
      </div>
      <Workspace
        components={components}
        onInteract={handleInteract}
        onClose={closeComponent}
      />
    </div>
  )
}
