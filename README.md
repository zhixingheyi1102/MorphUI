# MorphUI

组件化 AI 交互 Demo —— 通过对话驱动动态 UI 组件，帮用户收敛出个性化方案。

黑客松项目，纯前端，无后端。整个演示是预编排的剧本，但组件和引擎完全解耦，换剧本/加组件不需要动引擎代码。

## 快速开始

```bash
npm install
npm run dev
```

---

## 产品概念

页面分两栏：

- **左侧**：对话面板，展示用户和 AI 的对话上下文
- **右侧**：工作区，随对话推进动态生长出各种组件（表单、行程卡片、地图、POI 详情……）

用户通过对话 + 组件交互（而非纯文本聊天）来逐步收敛出一份完整方案。

---

## 架构概览

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│   scenario/cityWalk.ts          ← 剧本数据（纯数据，定义    │
│   (Step[])                        每一步说什么、出什么组件） │
│         │                                                  │
│         ▼                                                  │
│   engine/useScenario.ts         ← 剧本引擎（状态机，驱动    │
│   (线性状态机)                     整个流程的推进）          │
│         │                                                  │
│    ┌────┴────┐                                             │
│    ▼         ▼                                             │
│  ChatPanel  Workspace           ← 两个容器，只做渲染和      │
│             │                     事件转发，不含业务逻辑     │
│             ▼                                              │
│        components/              ← 业务组件，每个独立，      │
│        registry.ts                 只关心自己的 data 和交互  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 核心原则：四层完全解耦

| 层 | 文件 | 职责 | 改动影响范围 |
|---|---|---|---|
| **剧本数据** | `scenario/cityWalk.ts` | 定义每步的对话内容和组件操作 | 只影响演示内容 |
| **剧本引擎** | `engine/useScenario.ts` | 线性状态机，驱动步骤推进 | 一般不需要改 |
| **容器** | `chat/ChatPanel.tsx`、`workspace/Workspace.tsx` | 渲染 + 事件转发 | 只影响布局 |
| **业务组件** | `components/*.tsx` | 各自的 UI 和交互 | 只影响单个组件 |

---

## 目录结构

```
src/
├── engine/
│   ├── types.ts              # 核心类型定义
│   └── useScenario.ts        # 剧本引擎 hook
│
├── scenario/
│   └── cityWalk.ts           # 演示剧本（10 步）
│
├── chat/
│   └── ChatPanel.tsx         # 左侧对话面板
│
├── workspace/
│   └── Workspace.tsx         # 右侧工作区容器
│
├── components/
│   ├── registry.ts           # 组件注册表（类型字符串 → React 组件）
│   ├── ClarifyForm.tsx       # 偏好澄清表单（含动态追问）
│   ├── Itinerary.tsx         # Day1/Day2 行程（Tab + 景点卡片 + 交通线）
│   ├── MapView.tsx           # Leaflet 地图（标记 + 路线 + 点击交互）
│   ├── ActivityCards.tsx     # 玩法选择卡片
│   ├── POICard.tsx           # 餐厅/酒店 POI 详情卡
│   └── BudgetTracker.tsx     # 预算概览（数字动画 + 进度条）
│
├── App.tsx                   # 入口，左右分栏布局
├── main.tsx                  # React 挂载
└── index.css                 # Tailwind + 动画
```

---

## 剧本引擎：它是怎么工作的

引擎是一个 **线性状态机**，核心就是一个指针 `stepIndex` 指向 `Step[]` 数组的当前位置。

### Step 的结构

```typescript
type Step = {
  trigger: StepTrigger              // 什么触发这一步
  userMessage?: string              // 聊天面板里显示的用户消息
  aiMessage: string                 // AI 的回复（逐字打出）
  workspaceActions?: WorkspaceAction[]  // AI 回复打完后，对工作区的操作
}
```

### 触发方式（StepTrigger）

只有两种：

```typescript
{ type: "user_send" }                                    // 用户点击发送
{ type: "component_interact", componentId: "map" }       // 用户在某个组件上交互
```

### 工作区操作（WorkspaceAction）

三种动作：

```typescript
{ action: "create", componentId: "map", componentType: "map_view", data: {...} }  // 新建组件
{ action: "update", componentId: "map", data: { extraMarkers: [...] } }           // 更新数据（浅合并）
{ action: "remove", componentId: "clarify" }                                       // 移除组件
```

### 推进流程（advance）

```
advance(trigger) 被调用
  │
  ├─ 检查 trigger 是否匹配当前 step → 不匹配则忽略
  │
  ├─ 如果 step 有 userMessage → 加到聊天记录
  │
  ├─ 逐字打出 aiMessage（~15-40ms/字）
  │
  └─ 打完后 → 执行 workspaceActions → stepIndex++
```

---

## 数据流：一次完整交互

```
用户点击发送 / 在组件上交互
    │
    ▼
ChatPanel.onSend() 或 Workspace.onInteract(componentId, value)
    │
    ▼
App 里调 advance({ type: "user_send" }) 或 advance({ type: "component_interact", componentId })
    │
    ▼
useScenario 引擎：
    1. 加用户消息到 chatMessages
    2. 逐字打出 AI 消息
    3. 打完后执行 workspaceActions（create/update/remove 组件）
    4. stepIndex++
    │
    ▼
React 重新渲染：
    - ChatPanel 显示新消息
    - Workspace 根据 components[] 查注册表，渲染对应组件
    - 如果下一步 trigger 是 user_send → ChatPanel 显示可点击的预设消息
    - 如果下一步 trigger 是 component_interact → ChatPanel 显示"在右边组件上操作以继续"
```

---

## 业务组件接口规范

每个组件统一接收两个 props：

```typescript
{
  data: { ... }                    // 来自剧本的数据，结构由各组件自定义
  onInteract: (...args) => void    // 调用后触发剧本推进
}
```

### 各组件的 data 结构

#### ClarifyForm（偏好澄清）
```typescript
data: {
  title: string
  questions: Array<{ id: string, label: string, options: string[] }>
  followUps?: {                    // 动态追问配置
    [questionId]: {
      [selectedOption]: { id: string, label: string, options: string[] }
    }
  }
}
// onInteract(): 用户点击"确认"时调用，无参数
```

#### Itinerary（行程方案）
```typescript
data: {
  activeTab?: string               // 默认选中的 tab key
  days: {
    [dayKey]: {
      label: string                // Tab 标题，如 "Day 1 · 法租界漫步"
      spots: Array<{
        id: string, name: string, time: string, duration: string,
        desc: string, tag: string,
        transport?: { method: string, duration: string, distance: string }
      }>
    }
  }
  selectedActivity?: { spotId: string, activity: string }  // 由 update 动作写入
}
// 展示型组件，不调用 onInteract
```

#### MapView（地图）
```typescript
data: {
  center: [number, number]
  zoom: number
  markers: Array<{ id: string, name: string, lat: number, lng: number, type: "spot"|"restaurant"|"hotel" }>
  extraMarkers?: Marker[]          // 后续 update 追加的标记（餐厅/酒店）
  routeColor?: string
  highlightSpot?: string           // 高亮某个标记（脉冲动画）
}
// onInteract(markerId: string): 用户点击地图标记时调用
```

#### ActivityCards（玩法选择）
```typescript
data: {
  spotName: string
  activities: Array<{ id: string, title: string, desc: string, duration: string, price: number, tag: string }>
}
// onInteract(activityId: string): 用户选择某个玩法时调用
```

#### POICard（POI 详情卡）
```typescript
data: {
  type: "restaurant" | "hotel"
  name: string, rating: number, priceRange: string,
  tags: string[], distance: string,
  reviews?: Array<{ user: string, text: string, score: number }>   // 餐厅版
  highlights?: string[]                                             // 酒店版
  images?: string[]                                                 // 酒店版（颜色占位）
}
// 展示型组件，不调用 onInteract
```

#### BudgetTracker（预算概览）
```typescript
data: {
  total: number
  items: Array<{ label: string, amount: number }>
}
// 展示型组件，不调用 onInteract。金额变化时有数字动画。
```

---

## 演示剧本（10 步）

| # | 触发 | 工作区变化 |
|---|---|---|
| 1 | 用户发送"帮我规划上海周末两日游" | 创建 ClarifyForm |
| 2 | ClarifyForm 内部：选"和朋友"后动态长出追问 | （组件内部处理，不走引擎） |
| 3 | ClarifyForm 点确认 | 移除 ClarifyForm → 创建 Itinerary + BudgetTracker |
| 4 | 用户发送"加个地图看路线" | 创建 MapView |
| 5 | 点击地图上"武康路"标记 | 创建 ActivityCards |
| 6 | 选择一个玩法 | 移除 ActivityCards → 更新 Itinerary |
| 7 | 用户发送"附近有什么好吃的" | 更新 MapView（加餐厅 Marker） |
| 8 | 点击餐厅 Marker | 创建 POICard（餐厅版） |
| 9 | 用户发送"晚上住哪里" | 更新 MapView（加酒店 Marker）+ 创建 POICard（酒店版） |
| 10 | 用户发送"我更看重舒适度" | 更新 MapView（换酒店）+ 更新 POICard + 更新 BudgetTracker |

---

## 常见操作指南

### 改组件样式/交互

直接改 `src/components/` 下对应文件。不需要碰引擎、容器、剧本。所有样式都是 Tailwind class。

### 改剧本内容

编辑 `src/scenario/cityWalk.ts`。改文案、改数据、调整步骤顺序、增减步骤，都只需要改这一个文件。

### 加一个新组件

1. 在 `src/components/` 下新建文件：

```tsx
type Props = {
  data: { /* 定义你的数据结构 */ }
  onInteract: (...args: any[]) => void
}

export default function YourComponent({ data, onInteract }: Props) {
  return <div>...</div>
}
```

2. 在 `src/components/registry.ts` 里注册：

```typescript
import YourComponent from "./YourComponent"

const registry = {
  // ...已有的...
  your_key: YourComponent,    // 加这一行
}
```

3. 在剧本里使用：

```typescript
{
  action: "create",
  componentId: "your_instance",
  componentType: "your_key",       // 对应 registry 里的 key
  data: { /* 你的数据 */ },
}
```

不需要改引擎、容器、App 的任何代码。

---

## 技术栈

| 用途 | 选型 |
|---|---|
| 框架 | React + TypeScript + Vite |
| 样式 | Tailwind CSS v4 |
| 地图 | Leaflet + OpenStreetMap |
| 动画 | CSS Keyframes + requestAnimationFrame |
