import type { ComponentInstance } from "../engine/types"

// 样式预览模式：URL 带 ?preview=1 时，把所有待调组件用固定假数据直接铺上桌面，
// 不用走对话流程，专门用于逐个打磨组件样式。
const previewSeed: ComponentInstance[] = [
  {
    id: "clarify",
    type: "clarify_form",
    data: {
      title: "了解你的需求",
      questions: [
        { id: "companion", label: "和谁一起？", options: ["独自出行", "和朋友", "情侣出行", "家庭出游"] },
        { id: "budget", label: "两天预算大概多少？", options: ["500 以内", "500 - 1500", "1500 - 3000", "不限"] },
        { id: "preference", label: "偏好什么类型？", options: ["文艺小众", "网红打卡", "历史人文", "美食探店"] },
      ],
      followUps: {
        companion: {
          "和朋友": { id: "group_size", label: "几个人一起？", options: ["2人", "3-5人", "5人以上"] },
        },
      },
    },
  },
  {
    id: "itinerary",
    type: "plan_notebook",
    data: {
      activeTab: "day1",
      days: {
        day1: {
          label: "Day 1 · 法租界漫步",
          spots: [
            { id: "wukang", name: "武康路", time: "09:30", duration: "1.5h", desc: "从武康大楼出发，沿途看老洋房和巴金故居", tag: "历史建筑", imageUrl: "https://images.unsplash.com/photo-1471623320832-752e8bbf8413?w=640&q=80" },
            { id: "anfu", name: "安福路", time: "11:00", duration: "1h", desc: "独立设计师店和话剧中心", tag: "文艺街区", imageUrl: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=640&q=80", transport: { method: "步行", duration: "10min", distance: "0.8km" } },
            { id: "lunch1", name: "衡山路午餐", time: "12:00", duration: "1h", desc: "推荐衡山小馆或 Alimentari", tag: "美食", transport: { method: "步行", duration: "8min", distance: "0.6km" } },
            { id: "tianzifang", name: "田子坊", time: "15:30", duration: "2h", desc: "石库门弄堂里的艺术区", tag: "文创园区", imageUrl: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=640&q=80", transport: { method: "地铁", duration: "15min", distance: "3km" } },
          ],
        },
        day2: {
          label: "Day 2 · 滨江文化线",
          spots: [
            { id: "power", name: "上海当代艺术博物馆", time: "09:30", duration: "2h", desc: "PSA，免费开放的当代艺术殿堂", tag: "艺术展览" },
            { id: "bund", name: "外滩", time: "14:00", duration: "1.5h", desc: "经典外滩建筑群和江景", tag: "地标", transport: { method: "地铁", duration: "10min", distance: "2km" } },
          ],
        },
      },
    },
  },
  {
    id: "map",
    type: "map_view",
    data: {
      center: [31.222, 121.465],
      zoom: 12,
      activeDay: "day1",
      markers: [
        {
          id: "wukang", name: "武康路", lat: 31.2152, lng: 121.4368, type: "spot", day: "day1",
          desc: "从武康大楼出发，沿途老洋房和巴金故居",
          imageUrl: "https://images.unsplash.com/photo-1471623320832-752e8bbf8413?w=640&q=80",
          tags: ["历史建筑", "法租界"],
          deepContent: {
            activities: [
              { id: "arch", title: "老洋房漫步", desc: "跟着建筑地图走，看 10 栋经典洋房", duration: "1.5h", price: 0, tag: "免费" },
              { id: "photo", title: "旅拍体验", desc: "在武康大楼前拍一组文艺照", duration: "2h", price: 299, tag: "热门" },
            ],
            suggestions: ["这附近有好吃的吗？"],
          },
        },
        {
          id: "anfu", name: "安福路", lat: 31.2173, lng: 121.4405, type: "spot", day: "day1",
          desc: "独立设计师店和话剧艺术中心聚集的文艺街区",
          tags: ["文艺街区"],
        },
        {
          id: "tianzifang", name: "田子坊", lat: 31.2104, lng: 121.4737, type: "spot", day: "day1",
          desc: "石库门弄堂里的艺术区",
          tags: ["文创园区"],
        },
        {
          id: "bund", name: "外滩", lat: 31.2397, lng: 121.4903, type: "spot", day: "day2",
          desc: "经典外滩建筑群和陆家嘴江景",
          tags: ["地标", "夜景"],
        },
        {
          id: "rest1", name: "衡山小馆", lat: 31.2135, lng: 121.4390, type: "restaurant",
          rating: 4.7, desc: "地道上海本帮菜", tags: ["本帮菜"],
        },
        {
          id: "hotel1", name: "花间堂·愉园", lat: 31.2140, lng: 121.4425, type: "hotel",
          desc: "老洋房改造的精品酒店", tags: ["法租界"],
        },
      ],
    },
  },
  {
    id: "budget",
    type: "budget_tracker",
    data: {
      total: 1500,
      items: [
        { label: "交通", amount: 120 },
        { label: "餐饮", amount: 400 },
        { label: "门票", amount: 180 },
        { label: "住宿", amount: 500 },
      ],
    },
  },
  {
    id: "flights",
    type: "flight_list",
    data: {
      title: "周日晚 · 上海→深圳航班",
      flights: [
        { id: "f1", departTime: "17:30", arriveTime: "19:55", from: "上海虹桥", to: "深圳宝安", duration: "2h25m", tags: ["傍晚", "虹桥出发"], desc: "下午出发，晚上到深圳可以早点休息", price: 850, airline: "东方航空" },
        { id: "f2", departTime: "18:45", arriveTime: "21:10", from: "上海虹桥", to: "深圳宝安", duration: "2h25m", tags: ["推荐", "时间宽裕"], desc: "留出充足游玩时间，到深圳不算太晚", price: 720, airline: "南方航空" },
        { id: "f3", departTime: "20:00", arriveTime: "22:25", from: "上海浦东", to: "深圳宝安", duration: "2h25m", tags: ["晚班", "浦东出发"], desc: "白天行程不受影响，但到达较晚", price: 680, airline: "深圳航空" },
      ],
    },
  },
  {
    id: "packing",
    type: "checklist",
    data: {
      title: "深圳出差准备清单",
      weather: {
        city: "深圳", date: "下周一至周五", temp: "28-34°C",
        condition: "多云，周三有雷阵雨", tips: "带伞，室内空调冷建议备薄外套",
      },
      items: [
        { id: "p1", text: "身份证", checked: true },
        { id: "p2", text: "笔记本电脑 + 充电器", checked: false },
        { id: "p3", text: "短袖 × 3（28-34°C）", checked: false },
        { id: "p4", text: "折叠伞（周三雷阵雨）", checked: false },
        { id: "p5", text: "洗漱用品", checked: false },
      ],
    },
  },
]

export default previewSeed
