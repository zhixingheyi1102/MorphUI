import { useCallback } from "react"
import { useChat } from "./engine/useChat"
import scenario from "./scenario/cityWalk"
import previewSeed from "./scenario/previewSeed"
import ChatPanel from "./chat/ChatPanel"
import Workspace from "./workspace/Workspace"

// 样式预览模式：?preview=1 直接铺满全部组件（固定假数据），用于逐个调样式
const isPreview = new URLSearchParams(window.location.search).has("preview")

export default function App() {
  const {
    chatMessages, components, isTyping, isThinking, suggestions, quotedSpot, clearQuote,
    sendMessage, handleComponentInteract, addComponent, closeComponent, organizeWorkspace, handleHintClick,
  } = useChat(scenario, isPreview ? previewSeed : [])

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
          isThinking={isThinking}
          suggestions={suggestions}
          quotedSpot={quotedSpot}
          onClearQuote={clearQuote}
          onSend={handleSend}
          onHintClick={handleHintClick}
        />
      </div>
      <Workspace
        components={components}
        onInteract={handleInteract}
        onClose={closeComponent}
        onOrganize={organizeWorkspace}
        onPaste={addComponent}
      />
    </div>
  )
}
