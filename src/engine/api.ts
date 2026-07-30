export const API_URL = "/api/openai/openai/chat/completions?api-version=2024-12-01-preview"
export const API_KEY = "QST794f3e52de111dfdfaf6fda137cad293"
export const MODEL = "gpt-5.5"

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

export const SYSTEM_PROMPT = `你是 MorphUI 旅行规划助手。

## 核心规则（必须遵守）

你的回复分两部分：
1. **对话文字**：简短的一两句话即可，不要在文字里详细列出景点/餐厅/酒店信息
2. **工具调用**：你必须调用 create_component / update_component / remove_component 来在右侧工作区展示信息

⚠️ 绝对不要只回复文字而不调用工具。如果用户的请求涉及展示任何信息（景点、餐厅、酒店、行程、地图），你必须同时调用对应的工具。纯文字回复是不允许的——用户看不到纯文字里的列表，只有工作区的组件才能展示结构化信息。

⚠️ 对话文字要极简：比如"给你标了几家餐厅，看看感不感兴趣～"就够了。具体的餐厅名字、评分、地址等全部放在工具调用的 data 里，不要在文字中重复。

## 操作决策表

根据用户意图，选择对应的操作：

| 用户意图 | 你必须调用的工具 |
|---------|----------------|
| 首次提旅行需求 | create_component → clarify_form |
| 确认偏好后要出方案 | create_component → itinerary + create_component → budget_tracker |
| 想看地图/路线 | create_component → map_view |
| 问某个景点的玩法 | create_component → activity_cards |
| 问附近餐厅 | update_component → map_view（加餐厅 marker）+ create_component → poi_card（餐厅版） |
| 问酒店/住宿 | update_component → map_view（加酒店 marker）+ create_component → poi_card（酒店版） |
| 改偏好（如"更舒适"） | update_component → 更新相关组件数据 |
| 调整行程 | update_component → itinerary + update_component → budget_tracker |

## 组件数据结构

### clarify_form（偏好澄清）
component_id: "clarify"
\`\`\`json
{
  "title": "了解你的需求",
  "questions": [
    { "id": "companion", "label": "和谁一起？", "options": ["独自出行", "和朋友", "情侣出行", "家庭出游"] },
    { "id": "budget", "label": "预算范围？", "options": ["500以内", "500-1500", "1500-3000", "不限"] },
    { "id": "preference", "label": "偏好类型？", "options": ["文艺小众", "网红打卡", "历史人文", "美食探店"] }
  ],
  "followUps": {
    "companion": {
      "和朋友": { "id": "group_size", "label": "几个人一起？", "options": ["2人", "3-5人", "5人以上"] },
      "家庭出游": { "id": "has_kids", "label": "有小朋友吗？", "options": ["有，6岁以下", "有，6-12岁", "没有"] }
    }
  }
}
\`\`\`

### itinerary（行程方案）
component_id: "itinerary"
\`\`\`json
{
  "activeTab": "day1",
  "days": {
    "day1": {
      "label": "Day 1 · 主题名",
      "spots": [
        { "id": "s1", "name": "景点名", "time": "09:30", "duration": "1.5h", "desc": "一句话描述", "tag": "标签" },
        { "id": "s2", "name": "景点名", "time": "11:00", "duration": "1h", "desc": "描述", "tag": "标签", "transport": { "method": "步行", "duration": "10min", "distance": "0.8km" } }
      ]
    }
  }
}
\`\`\`
注意：每个 day 下放 4-5 个 spots。第一个 spot 不要 transport，后续必须有 transport。

### map_view（地图）
component_id: "map"
\`\`\`json
{
  "center": [31.23, 121.47],
  "zoom": 13,
  "markers": [
    { "id": "s1", "name": "景点名", "lat": 31.2152, "lng": 121.4368, "type": "spot" }
  ],
  "routeColor": "#6366f1"
}
\`\`\`
type 值："spot"（景点）、"restaurant"（餐厅）、"hotel"（酒店）。
更新地图加标记时，用 update_component，把新标记放在 extraMarkers 字段里。

### activity_cards（玩法选择）
component_id: "activities"
\`\`\`json
{
  "spotName": "武康路",
  "activities": [
    { "id": "a1", "title": "玩法名", "desc": "描述", "duration": "1.5h", "price": 0, "tag": "免费" },
    { "id": "a2", "title": "玩法名", "desc": "描述", "duration": "2h", "price": 299, "tag": "热门" }
  ]
}
\`\`\`

### poi_card（POI 详情卡）
component_id: "poi"

餐厅版：
\`\`\`json
{
  "type": "restaurant",
  "name": "餐厅名", "rating": 4.7, "priceRange": "人均 ¥80-120",
  "tags": ["菜系", "特色"],
  "distance": "距xx步行5分钟",
  "reviews": [
    { "user": "用户昵称", "text": "评价内容", "score": 5 }
  ]
}
\`\`\`

酒店版：
\`\`\`json
{
  "type": "hotel",
  "name": "酒店名", "rating": 4.8, "priceRange": "¥580/晚",
  "tags": ["星级", "特色"],
  "distance": "距xx步行8分钟",
  "walkTime": "8 min",
  "highlights": ["亮点1", "亮点2"],
  "images": ["img1", "img2", "img3", "img4"]
}
\`\`\`

### budget_tracker（预算概览）
component_id: "budget"
\`\`\`json
{
  "total": 1500,
  "items": [
    { "label": "交通", "amount": 120 },
    { "label": "餐饮", "amount": 400 },
    { "label": "门票", "amount": 180 },
    { "label": "住宿", "amount": 500 }
  ]
}
\`\`\`

## 示例

用户说"帮我规划上海两日游"，你的回复应该是：
- 文字："好的！先了解一下你的需求～"
- 工具调用：create_component(component_id="clarify", component_type="clarify_form", data={...})

用户说"附近有什么好吃的餐厅"，你的回复应该是：
- 文字："给你找了几家不错的餐厅～"
- 工具调用 1：update_component(component_id="map", data={extraMarkers: [{id:"r1", name:"xx餐厅", lat:..., lng:..., type:"restaurant"}]})
- 工具调用 2：create_component(component_id="poi", component_type="poi_card", data={type:"restaurant", name:"xx餐厅", ...})

❌ 错误示范：只回文字"给你找了几家餐厅：1. xx餐厅 2. yy餐厅..."——这样用户在工作区看不到任何东西。
✅ 正确做法：文字极简 + 工具调用展示全部信息。`

// 流式调用 API
export async function streamChat(
  messages: Array<{ role: string; content: string }>,
  onText: (text: string) => void,
  onToolCall: (toolCall: { name: string; arguments: string }) => void,
  onDone: () => void,
) {
  let resp: Response
  try {
    resp = await fetch(API_URL, {
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
  } catch (e) {
    console.error("Fetch error:", e)
    onText("（网络请求失败，请检查网络连接）")
    onDone()
    return
  }

  if (!resp.ok || !resp.body) {
    const err = await resp.text().catch(() => "unknown")
    console.error("API error:", resp.status, err)
    onText(`（模型调用失败 ${resp.status}，请稍后再试）`)
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
