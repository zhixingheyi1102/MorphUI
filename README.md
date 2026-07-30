# MorphUI

组件化 AI 交互 Demo —— 通过对话驱动动态组件，收敛出个人方案。

## 运行

```bash
npm install
npm run dev
```

## 项目结构

```
src/
├── engine/          # 剧本引擎（useScenario hook + 类型定义）
├── scenario/        # 剧本数据（换场景加文件即可）
├── chat/            # 聊天面板
├── workspace/       # 工作区容器
└── components/      # 业务组件（ClarifyForm / Itinerary / MapView / ...）
```

## 演示流程

1. 用户发起请求 → ClarifyForm（偏好澄清，含动态追问）
2. 提交偏好 → Itinerary（Day1/Day2 行程）+ BudgetTracker
3. 请求地图 → MapView（路线 + 景点标记）
4. 点击景点 → ActivityCards（玩法选择）
5. 选择玩法 → 更新行程
6. 问餐厅 → 地图加餐厅 Marker → 点击弹 POICard
7. 问酒店 → 酒店推荐 → 切换偏好后整批更新
