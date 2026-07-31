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
  // 按交互值动态生成（如机票选了哪一张）：提供时优先于静态字段
  aiMessageFn?: (value?: string) => string
  workspaceActionsFn?: (value?: string) => WorkspaceAction[]
  // 点击瞬间立刻执行的动作（如给所选票盖章），不等 AI 消息打完
  immediateActionsFn?: (value?: string) => WorkspaceAction[]
  // 动作执行后延迟一拍，把该组件自动收进方案文件夹（"已收进方案"心智）
  autoDock?: string
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
