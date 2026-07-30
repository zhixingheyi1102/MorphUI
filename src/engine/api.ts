export const API_URL = "https://maas.devops.xiaohongshu.com/openai/openai/moonshot/v1/chat/completions"
export const API_KEY = "QST794f3e52de111dfdfaf6fda137cad293"
export const MODEL = "kimi-k3"

export const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "create_component",
      description: "在右侧工作区创建一个新组件。同一个 component_id 如果已存在会被替换。",
      parameters: {
        type: "object",
        properties: {
          component_id: { type: "string", description: "组件实例的唯一 ID，如 'clarify'、'map'、'itinerary'" },
          component_type: {
            type: "string",
            enum: ["clarify_form", "itinerary", "map_view", "activity_cards", "poi_card", "budget_tracker"],
            description: "组件类型，必须从 enum 中选择",
          },
          data: { type: "object", description: "组件数据，结构取决于 component_type，参考 system prompt 中的说明" },
        },
        required: ["component_id", "component_type", "data"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_component",
      description: "更新已有组件的数据（浅合并）。用于修改组件内容，如地图加新标记、预算更新等。",
      parameters: {
        type: "object",
        properties: {
          component_id: { type: "string", description: "要更新的组件实例 ID" },
          data: { type: "object", description: "要合并的新数据" },
        },
        required: ["component_id", "data"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "remove_component",
      description: "从工作区移除一个组件",
      parameters: {
        type: "object",
        properties: {
          component_id: { type: "string", description: "要移除的组件实例 ID" },
        },
        required: ["component_id"],
      },
    },
  },
]

export const SYSTEM_PROMPT = `你是 MorphUI 旅行规划助手。你通过对话理解用户需求，并在右侧工作区动态生成组件来帮用户制定方案。

## 你的能力

你可以调用工具在工作区创建、更新、移除组件。可用的组件类型和数据结构如下：

### 1. clarify_form（偏好澄清表单）
用于在开始前了解用户需求。
\`\`\`json
{
  "title": "了解你的需求",
  "questions": [
    { "id": "companion", "label": "和谁一起？", "options": ["独自出行", "和朋友", "情侣出行", "家庭出游"] }
  ],
  "followUps": {
    "companion": {
      "和朋友": { "id": "group_size", "label": "几个人？", "options": ["2人", "3-5人", "5人以上"] }
    }
  }
}
\`\`\`

### 2. itinerary（行程方案）
结构化的多日行程，含景点、时间、交通方式。
\`\`\`json
{
  "activeTab": "day1",
  "days": {
    "day1": {
      "label": "Day 1 · 主题",
      "spots": [
        {
          "id": "spot1", "name": "景点名", "time": "09:30", "duration": "1.5h",
          "desc": "描述", "tag": "类型标签",
          "transport": { "method": "步行", "duration": "10min", "distance": "0.8km" }
        }
      ]
    }
  }
}
\`\`\`
第一个景点不需要 transport 字段，后续景点需要标明从上一站怎么过来。

### 3. map_view（地图）
在地图上标注景点、餐厅、酒店等。
\`\`\`json
{
  "center": [31.215, 121.44],
  "zoom": 13,
  "markers": [
    { "id": "spot1", "name": "名称", "lat": 31.21, "lng": 121.43, "type": "spot" }
  ],
  "extraMarkers": [],
  "routeColor": "#6366f1",
  "highlightSpot": "spot1"
}
\`\`\`
type 可选值: "spot"（景点）、"restaurant"（餐厅）、"hotel"（酒店）。

### 4. activity_cards（玩法选择）
展示某个景点的不同玩法供用户选择。
\`\`\`json
{
  "spotName": "景点名",
  "activities": [
    { "id": "act1", "title": "玩法名", "desc": "描述", "duration": "1.5h", "price": 0, "tag": "免费" }
  ]
}
\`\`\`

### 5. poi_card（POI 详情卡）
展示餐厅或酒店的详情。
\`\`\`json
{
  "type": "restaurant",
  "name": "店名", "rating": 4.7, "priceRange": "人均 ¥80",
  "tags": ["本帮菜", "老字号"],
  "distance": "距武康路步行 5 分钟",
  "reviews": [{ "user": "用户名", "text": "评价内容", "score": 5 }]
}
\`\`\`
酒店版将 type 设为 "hotel"，reviews 换成 highlights（string[]）和 images（string[]）。

### 6. budget_tracker（预算概览）
展示当前方案的预算分布。
\`\`\`json
{
  "total": 1500,
  "items": [
    { "label": "交通", "amount": 120 },
    { "label": "餐饮", "amount": 400 }
  ]
}
\`\`\`

## 交互规则

1. 用户首次提需求时，先用 clarify_form 了解偏好，不要直接出方案。
2. 用户确认偏好后，生成 itinerary + budget_tracker。
3. 用户需要地图时，创建 map_view。
4. 根据用户意图灵活使用组件：
   - 用户问餐厅 → 更新 map_view 加餐厅标记 + 创建 poi_card
   - 用户问酒店 → 类似处理
   - 用户改偏好 → 更新相关组件数据
5. 每次回复都要有对话文字，同时按需调用工具操作组件。
6. 用中文回复，语气自然友好。
7. 数据要合理真实（景点坐标、价格、评分等）。`

// 流式调用 API
export async function streamChat(
  messages: Array<{ role: string; content: string }>,
  onText: (text: string) => void,
  onToolCall: (toolCall: { name: string; arguments: string }) => void,
  onDone: () => void,
) {
  const resp = await fetch(API_URL, {
    method: "POST",
    headers: {
      "api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: TOOLS,
      stream: true,
    }),
  })

  if (!resp.ok || !resp.body) {
    const err = await resp.text()
    console.error("API error:", err)
    onText("（模型调用失败，请稍后再试）")
    onDone()
    return
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  // 累积 tool call 的 partial arguments
  const toolCalls: Record<number, { name: string; arguments: string }> = {}

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith("data: ")) continue
      const payload = trimmed.slice(6)
      if (payload === "[DONE]") {
        // 发出所有累积的 tool calls
        for (const tc of Object.values(toolCalls)) {
          onToolCall(tc)
        }
        onDone()
        return
      }

      try {
        const json = JSON.parse(payload)
        const delta = json.choices?.[0]?.delta
        if (!delta) continue

        // 文字内容
        if (delta.content) {
          onText(delta.content)
        }

        // tool call 增量
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0
            if (!toolCalls[idx]) {
              toolCalls[idx] = { name: "", arguments: "" }
            }
            if (tc.function?.name) {
              toolCalls[idx].name = tc.function.name
            }
            if (tc.function?.arguments) {
              toolCalls[idx].arguments += tc.function.arguments
            }
          }
        }
      } catch {
        // 忽略解析错误
      }
    }
  }

  // 流结束但没收到 [DONE]
  for (const tc of Object.values(toolCalls)) {
    onToolCall(tc)
  }
  onDone()
}
