// 剧本步骤的触发方式
export type StepTrigger =
  | { type: "user_send" }
  | { type: "component_interact"; componentId: string; value?: string }

// 工作区动作
export type WorkspaceAction = {
  action: "create" | "update" | "remove"
  componentId: string
  componentType?: string
  data?: Record<string, unknown>
}

// 一步剧本
export type Step = {
  trigger: StepTrigger
  userMessage?: string
  aiMessage: string
  workspaceActions?: WorkspaceAction[]
  hints?: Array<{ label: string; actions: WorkspaceAction[] }>
  suggestions?: string[]
}

// 聊天消息
export type ChatMessage = {
  id: string
  role: "user" | "ai"
  text: string
  hints?: Array<{ id: string; label: string }>
}

// 工作区里的一个组件实例
export type ComponentInstance = {
  id: string
  type: string
  data: Record<string, unknown>
}
