import type { Step } from "../engine/types"

const scenario: Step[] = [
  // ──────────────────────────────────────────────
  // Step 1: 用户发起请求 → 出现 ClarifyForm
  // ──────────────────────────────────────────────
  {
    trigger: { type: "user_send" },
    userMessage: "帮我规划一个上海周末两日游的方案",
    aiMessage: "好的！在开始之前，先了解一下你的需求，我好给你量身定制方案～ 请在右边填一下 👉",
    workspaceActions: [
      {
        action: "create",
        componentId: "clarify",
        componentType: "clarify_form",
        data: {
          title: "了解你的需求",
          questions: [
            {
              id: "companion",
              label: "和谁一起？",
              options: ["独自出行", "和朋友", "情侣出行", "家庭出游"],
            },
            {
              id: "budget",
              label: "两天预算大概多少？",
              options: ["500 以内", "500 - 1500", "1500 - 3000", "不限"],
            },
            {
              id: "preference",
              label: "偏好什么类型？",
              options: ["文艺小众", "网红打卡", "历史人文", "美食探店"],
            },
          ],
          followUps: {
            companion: {
              "和朋友": { id: "group_size", label: "几个人一起？", options: ["2人", "3-5人", "5人以上"] },
              "家庭出游": { id: "has_kids", label: "有小朋友吗？", options: ["有，6岁以下", "有，6-12岁", "没有小朋友"] },
            },
          },
        },
      },
    ],
  },

  // ──────────────────────────────────────────────
  // Step 2: 动态追问（ClarifyForm 内部处理）
  // ──────────────────────────────────────────────

  // ──────────────────────────────────────────────
  // Step 3: 用户提交 ClarifyForm → 出方案（预算作为 hint）
  // ──────────────────────────────────────────────
  {
    trigger: { type: "component_interact", componentId: "clarify" },
    aiMessage:
      "明白了！和朋友的文艺两日游，给你安排好了 ✨ 两天行程在右边，你看看节奏合不合适～",
    workspaceActions: [
      {
        action: "create",
        componentId: "itinerary",
        componentType: "plan_notebook",
        data: {
          activeTab: "day1",
          days: {
            day1: {
              label: "Day 1 · 法租界漫步",
              spots: [
                { id: "wukang", name: "武康路", time: "09:30", duration: "1.5h", desc: "从武康大楼出发，沿途看老洋房和巴金故居", tag: "历史建筑", imageUrl: "https://images.unsplash.com/photo-1567610464789-af95f753af41?w=640&q=80" },
                { id: "anfu", name: "安福路", time: "11:00", duration: "1h", desc: "独立设计师店和话剧中心", tag: "文艺街区", imageUrl: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=640&q=80", transport: { method: "步行", duration: "10min", distance: "0.8km" } },
                { id: "lunch1", name: "衡山路午餐", time: "12:00", duration: "1h", desc: "推荐衡山小馆或 Alimentari", tag: "美食", transport: { method: "步行", duration: "8min", distance: "0.6km" } },
                { id: "fuxing", name: "复兴西路", time: "13:30", duration: "1.5h", desc: "国际礼拜堂、衡山电影院一带", tag: "历史建筑", imageUrl: "https://images.unsplash.com/photo-1548919973-5cef591cdbc9?w=640&q=80", transport: { method: "步行", duration: "5min", distance: "0.4km" } },
                { id: "tianzifang", name: "田子坊", time: "15:30", duration: "2h", desc: "石库门弄堂里的艺术区", tag: "文创园区", imageUrl: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=640&q=80", transport: { method: "地铁", duration: "15min", distance: "3km" } },
              ],
            },
            day2: {
              label: "Day 2 · 滨江文化线",
              spots: [
                { id: "power", name: "上海当代艺术博物馆", time: "09:30", duration: "2h", desc: "PSA，免费开放的当代艺术殿堂", tag: "艺术展览" },
                { id: "cool_docks", name: "老码头", time: "11:30", duration: "1h", desc: "外滩背后的创意园区", tag: "文创园区", transport: { method: "步行", duration: "12min", distance: "1km" } },
                { id: "lunch2", name: "豫园午餐", time: "12:30", duration: "1h", desc: "南翔小笼和城隍庙小吃", tag: "美食", transport: { method: "步行", duration: "15min", distance: "1.2km" } },
                { id: "bund", name: "外滩", time: "14:00", duration: "1.5h", desc: "经典外滩建筑群和江景", tag: "地标", transport: { method: "地铁", duration: "10min", distance: "2km" } },
                { id: "nanjing", name: "南京路步行街", time: "16:00", duration: "2h", desc: "逛街购物，晚餐收尾", tag: "购物", transport: { method: "步行", duration: "5min", distance: "0.5km" } },
              ],
            },
          },
        },
      },
    ],
    hints: [
      {
        label: "📊 查看预算明细",
        actions: [
          {
            action: "create",
            componentId: "budget",
            componentType: "budget_tracker",
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
        ],
      },
    ],
  },

  // ──────────────────────────────────────────────
  // Step 4: 用户要地图 → MapView（标记携带丰富信息）
  // ──────────────────────────────────────────────
  {
    trigger: { type: "user_send" },
    userMessage: "加个地图看看路线吧",
    aiMessage: "路线地图给你安排上了！点击标记可以查看景点详情，感兴趣的话还能探索更多玩法～",
    suggestions: [
      "加个地图看看路线吧",
      "这些地方之间远吗？",
      "有没有特别推荐的景点？",
    ],
    workspaceActions: [
      {
        action: "create",
        componentId: "map",
        componentType: "map_view",
        data: {
          center: [31.222, 121.465] as unknown as Record<string, unknown>,
          zoom: 12,
          activeDay: "day1",
          markers: [
            {
              id: "wukang", name: "武康路", lat: 31.2152, lng: 121.4368, type: "spot", day: "day1",
              desc: "从武康大楼出发，沿途老洋房和巴金故居，法租界最经典的一条路",
              imageUrl: "https://images.unsplash.com/photo-1567610464789-af95f753af41?w=640&q=80",
              tags: ["历史建筑", "法租界", "网红打卡"],
              deepContent: {
                activities: [
                  { id: "arch", title: "老洋房漫步", desc: "跟着建筑地图走，看 10 栋经典洋房，了解每栋背后的故事", duration: "1.5h", price: 0, tag: "免费" },
                  { id: "photo", title: "旅拍体验", desc: "在武康大楼、密丹公寓等标志建筑前拍一组文艺照", duration: "2h", price: 299, tag: "热门" },
                  { id: "cafe", title: "咖啡巡礼", desc: "武康路沿线 5 家精品咖啡馆，一路喝过去", duration: "2h", price: 150, tag: "美食" },
                ],
                suggestions: ["这附近有好吃的吗？", "怎么去下一个景点？"],
              },
            },
            {
              id: "anfu", name: "安福路", lat: 31.2173, lng: 121.4405, type: "spot", day: "day1",
              desc: "独立设计师店和话剧艺术中心聚集的文艺街区",
              imageUrl: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=640&q=80",
              tags: ["文艺街区", "设计师店", "话剧"],
              deepContent: {
                activities: [
                  { id: "theater", title: "话剧体验", desc: "安福路话剧艺术中心，看一场先锋话剧", duration: "2h", price: 280, tag: "文艺" },
                  { id: "vintage", title: "中古店淘宝", desc: "沿街 vintage 店铺，淘复古服饰和饰品", duration: "1.5h", price: 0, tag: "免费" },
                  { id: "brunch", title: "法式 Brunch", desc: "安福路 brunch 圣地，推荐 RAC 和 Egg", duration: "1h", price: 120, tag: "美食" },
                ],
                suggestions: ["有推荐的话剧吗？", "附近有咖啡馆吗？"],
              },
            },
            {
              id: "lunch1", name: "衡山路午餐", lat: 31.2091, lng: 121.4456, type: "spot", day: "day1",
              desc: "推荐衡山小馆或 Alimentari，地道本帮菜与意式简餐",
              tags: ["美食", "本帮菜"],
              deepContent: {
                activities: [
                  { id: "local", title: "本帮菜体验", desc: "尝地道上海菜：红烧肉、腌笃鲜、葱油拌面", duration: "1h", price: 100, tag: "美食" },
                  { id: "italian", title: "意式简餐", desc: "Alimentari 的手工面和提拉米苏", duration: "1h", price: 150, tag: "西餐" },
                ],
                suggestions: ["人均大概多少？", "需要提前订位吗？"],
              },
            },
            {
              id: "fuxing", name: "复兴西路", lat: 31.2108, lng: 121.4352, type: "spot", day: "day1",
              desc: "国际礼拜堂、衡山电影院一带，感受老上海的文化底蕴",
              imageUrl: "https://images.unsplash.com/photo-1548919973-5cef591cdbc9?w=640&q=80",
              tags: ["历史建筑", "教堂", "老上海"],
              deepContent: {
                activities: [
                  { id: "church", title: "教堂巡礼", desc: "国际礼拜堂 + 诸圣堂，哥特与罗马风格交汇", duration: "1h", price: 0, tag: "免费" },
                  { id: "cinema", title: "衡山电影院", desc: "1951 年开业的老影院，看一场经典电影", duration: "2h", price: 50, tag: "文化" },
                ],
                suggestions: ["教堂可以进去参观吗？", "这一带还有什么好逛的？"],
              },
            },
            {
              id: "tianzifang", name: "田子坊", lat: 31.2104, lng: 121.4737, type: "spot", day: "day1",
              desc: "石库门弄堂里的艺术区，手工艺品和创意小店",
              imageUrl: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=640&q=80",
              tags: ["文创园区", "弄堂", "手工艺"],
              deepContent: {
                activities: [
                  { id: "craft", title: "手作体验", desc: "陶艺、皮具、版画工作坊，带走一件手作纪念品", duration: "1.5h", price: 180, tag: "体验" },
                  { id: "gallery", title: "画廊巡游", desc: "10+ 家独立画廊和摄影展，免费参观", duration: "1h", price: 0, tag: "免费" },
                  { id: "snack", title: "弄堂小吃", desc: "臭豆腐、葱油饼、鸡爪，一路吃过去", duration: "1h", price: 50, tag: "美食" },
                ],
                suggestions: ["晚上住哪里比较好？", "第二天去哪玩？"],
              },
            },
            // ── Day 2 · 滨江文化线 ──
            {
              id: "power", name: "上海当代艺术博物馆", lat: 31.2116, lng: 121.4862, type: "spot", day: "day2",
              desc: "PSA，免费开放的当代艺术殿堂，原南市发电厂改建",
              tags: ["艺术展览", "免费", "工业风"],
              deepContent: {
                activities: [
                  { id: "psa_exhibit", title: "看当期特展", desc: "免费常设 + 当期特展，工业厂房改造空间很出片", duration: "2h", price: 0, tag: "免费" },
                ],
                suggestions: ["当期有什么展？", "附近哪里吃午饭？"],
              },
            },
            {
              id: "cool_docks", name: "老码头", lat: 31.2003, lng: 121.4977, type: "spot", day: "day2",
              desc: "外滩背后的创意园区，老仓库改造的餐饮酒吧聚集地",
              tags: ["文创园区", "江边", "酒吧"],
              deepContent: {
                activities: [
                  { id: "dock_walk", title: "江边漫步", desc: "沿黄浦江散步，看老仓库改造的创意店铺", duration: "45min", price: 0, tag: "免费" },
                ],
                suggestions: ["这里有江景餐厅吗？", "去外滩怎么走？"],
              },
            },
            {
              id: "yuyuan", name: "豫园", lat: 31.2270, lng: 121.4920, type: "spot", day: "day2",
              desc: "南翔小笼和城隍庙小吃，老上海园林与市井烟火",
              imageUrl: "https://images.unsplash.com/photo-1548919973-5cef591cdbc9?w=640&q=80",
              tags: ["园林", "美食", "地标"],
              deepContent: {
                activities: [
                  { id: "xlb", title: "南翔小笼", desc: "百年老字号，蟹粉小笼一定要趁热吃", duration: "1h", price: 80, tag: "美食" },
                  { id: "garden", title: "豫园游园", desc: "明代江南古典园林，亭台楼阁移步换景", duration: "1h", price: 40, tag: "文化" },
                ],
                suggestions: ["门票多少钱？", "小吃街怎么走？"],
              },
            },
            {
              id: "bund", name: "外滩", lat: 31.2397, lng: 121.4903, type: "spot", day: "day2",
              desc: "经典外滩建筑群和陆家嘴江景，上海最出名的地标",
              imageUrl: "https://images.unsplash.com/photo-1474181487882-5abf3f0ba6c2?w=640&q=80",
              tags: ["地标", "江景", "夜景"],
              deepContent: {
                activities: [
                  { id: "bund_walk", title: "万国建筑巡礼", desc: "沿江看 52 幢历史建筑，对岸就是陆家嘴", duration: "1h", price: 0, tag: "免费" },
                  { id: "cruise", title: "浦江游船", desc: "坐船夜游黄浦江，两岸灯光尽收眼底", duration: "1h", price: 120, tag: "热门" },
                ],
                suggestions: ["夜景几点最好看？", "有推荐的观景台吗？"],
              },
            },
            {
              id: "nanjing", name: "南京路步行街", lat: 31.2354, lng: 121.4800, type: "spot", day: "day2",
              desc: "百年商业街，逛街购物、晚餐收尾的好去处",
              tags: ["购物", "步行街", "美食"],
              deepContent: {
                activities: [
                  { id: "shopping", title: "逛街购物", desc: "老字号 + 潮牌云集，走到人民广场", duration: "2h", price: 0, tag: "免费" },
                ],
                suggestions: ["有什么老字号推荐？", "晚上吃什么好？"],
              },
            },
          ],
          routeColor: "#6366f1",
        },
      },
    ],
  },

  // ──────────────────────────────────────────────
  // 点击地图标记 → 地图内部处理（不消耗剧本步骤）
  // 点击"探索玩法"/"查看评价" → 地图内部展开 deepContent（本地处理）
  // 选玩法 → useChat 动态读取被点标记的 deepContent 加入行程（不消耗剧本步骤）
  // ──────────────────────────────────────────────

  // ──────────────────────────────────────────────
  // Step 5: 用户问餐厅 → 地图加餐厅 Marker（带 deepContent）
  // ──────────────────────────────────────────────
  {
    trigger: { type: "user_send" },
    userMessage: "附近有什么好吃的餐厅吗？",
    aiMessage: "在地图上标了几家评价不错的餐厅 🍜 点击标记查看详情，还能看用户评价～",
    suggestions: [
      "附近有什么好吃的餐厅吗？",
      "有没有本地特色小吃？",
      "推荐下午茶的地方",
    ],
    workspaceActions: [
      {
        action: "update",
        componentId: "map",
        data: {
          highlightSpot: "wukang",
          extraMarkers: [
            {
              id: "rest1", name: "衡山小馆", lat: 31.2135, lng: 121.4390, type: "restaurant",
              rating: 4.7,
              desc: "地道上海本帮菜，红烧肉和葱油拌面是招牌，性价比高",
              tags: ["本帮菜", "老字号", "性价比高"],
              deepContent: {
                priceRange: "人均 ¥80-120",
                distance: "距武康路步行 5 分钟",
                reviews: [
                  { user: "小红薯er", text: "红烧肉入口即化，葱油拌面也好吃！", score: 5 },
                  { user: "食在上海", text: "排队人多但翻台快，推荐午市来", score: 4 },
                ],
              },
            },
            {
              id: "rest2", name: "Alimentari", lat: 31.2128, lng: 121.4415, type: "restaurant",
              rating: 4.5,
              desc: "意式简餐，手工面和薄饼披萨口碑很好",
              tags: ["意大利菜", "轻食", "氛围好"],
              deepContent: {
                priceRange: "人均 ¥120-180",
                distance: "距武康路步行 8 分钟",
                reviews: [
                  { user: "pasta_lover", text: "手工意面很惊艳，配合白葡萄酒绝了", score: 5 },
                  { user: "吃遍法租界", text: "环境很好适合约会，提拉米苏一定要点", score: 4 },
                ],
              },
            },
            {
              id: "rest3", name: "RAC Bar", lat: 31.2160, lng: 121.4380, type: "restaurant",
              rating: 4.6,
              desc: "法租界人气餐吧，brunch 和鸡尾酒都不错",
              tags: ["西餐", "Brunch", "鸡尾酒"],
              deepContent: {
                priceRange: "人均 ¥150-200",
                distance: "距武康路步行 3 分钟",
                reviews: [
                  { user: "周末达人", text: "brunch 永远排队但值得等，班尼迪克蛋神作", score: 5 },
                  { user: "鸡尾酒笔记", text: "晚上的鸡尾酒很专业，氛围也一流", score: 5 },
                ],
              },
            },
          ],
        },
      },
    ],
  },

  // ──────────────────────────────────────────────
  // Step 7: 用户问酒店 → 地图加酒店 Marker（带 deepContent）
  // ──────────────────────────────────────────────
  {
    trigger: { type: "user_send" },
    userMessage: "晚上住哪里比较好？",
    aiMessage: "给你推荐了几家离景点近的酒店，点击查看详情。优先按距离排的～",
    suggestions: [
      "晚上住哪里比较好？",
      "有没有有特色的民宿？",
      "离景点近的酒店有哪些？",
    ],
    workspaceActions: [
      {
        action: "update",
        componentId: "map",
        data: {
          extraMarkers: [
            {
              id: "hotel1", name: "花间堂·愉园", lat: 31.2140, lng: 121.4425, type: "hotel",
              desc: "老洋房改造的精品酒店，步行即可回到景点",
              tags: ["法租界", "步行可达"],
              deepContent: {
                priceRange: "¥680/晚",
                distance: "距武康路步行 5 分钟",
                nearby: [
                  { label: "距武康路", value: "步行 5 分钟" },
                  { label: "距安福路", value: "步行 8 分钟" },
                  { label: "距衡山路地铁", value: "步行 6 分钟" },
                ],
                access: "衡山路站（1/10 号线）步行 6 分钟，打车去外滩约 15 分钟",
                view: "临街房俯瞰法租界梧桐，庭院房正对花园",
              },
            },
            {
              id: "hotel2", name: "衡山路十二号", lat: 31.2100, lng: 121.4460, type: "hotel",
              desc: "衡山路核心位置，出门就是地铁",
              tags: ["核心地段", "地铁旁"],
              deepContent: {
                priceRange: "¥520/晚",
                distance: "距衡山路地铁站步行 3 分钟",
                nearby: [
                  { label: "距衡山路地铁", value: "步行 3 分钟" },
                  { label: "距复兴西路", value: "步行 10 分钟" },
                  { label: "距田子坊", value: "地铁 15 分钟" },
                ],
                access: "衡山路站（1/10 号线）步行 3 分钟，直达人民广场换乘方便",
                view: "高层房可看衡山路林荫道，夜里安静",
              },
            },
            {
              id: "hotel3", name: "上海国际饭店", lat: 31.2330, lng: 121.4710, type: "hotel",
              desc: "南京路旁的经典老牌，交通极其便利",
              tags: ["南京路", "地铁旁"],
              deepContent: {
                priceRange: "¥450/晚",
                distance: "距南京路步行街步行 1 分钟",
                nearby: [
                  { label: "距南京路步行街", value: "步行 1 分钟" },
                  { label: "距人民广场地铁", value: "步行 4 分钟" },
                  { label: "距外滩", value: "步行 15 分钟" },
                ],
                access: "人民广场站（1/2/8 号线）步行 4 分钟，去机场地铁直达",
                view: "高区房正对南京路与人民公园，繁华夜景",
              },
            },
          ],
        },
      },
    ],
  },

  // ──────────────────────────────────────────────
  // Step 8: 用户切偏好 → 换酒店 + 更新预算
  // ──────────────────────────────────────────────
  {
    trigger: { type: "user_send" },
    userMessage: "我更看重舒适度",
    aiMessage: "换了一批更舒适的酒店推荐！五星级为主，预算也同步更新了～",
    suggestions: [
      "我更看重舒适度",
      "有没有外滩江景的酒店？",
      "预算能控制在 500 以内吗？",
    ],
    workspaceActions: [
      {
        action: "update",
        componentId: "map",
        data: {
          extraMarkers: [
            {
              id: "hotel1", name: "上海柏悦酒店", lat: 31.2345, lng: 121.5060, type: "hotel",
              stars: 5, rating: 4.9,
              imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=640&q=80",
              desc: "87 层无边际泳池，外滩全景，米其林餐厅",
              tags: ["五星级", "外滩江景", "顶级服务"],
              deepContent: {
                priceRange: "¥2800/晚",
                images: [
                  "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=480&q=80",
                  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=480&q=80",
                  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=480&q=80",
                  "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=480&q=80",
                ],
                reviews: [
                  { user: "奢旅达人", text: "87 楼泳池无敌江景，服务堪称完美", score: 5 },
                  { user: "生日旅行", text: "升级了套房，管家服务太贴心了", score: 5 },
                ],
              },
            },
            {
              id: "hotel2", name: "上海半岛酒店", lat: 31.2390, lng: 121.4900, type: "hotel",
              stars: 5, rating: 4.8,
              imageUrl: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=640&q=80",
              desc: "外滩百年建筑，劳斯莱斯接送，管家服务",
              tags: ["五星级", "百年建筑", "管家服务"],
              deepContent: {
                priceRange: "¥3200/晚",
                images: [
                  "https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=480&q=80",
                  "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=480&q=80",
                  "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=480&q=80",
                  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=480&q=80",
                ],
                reviews: [
                  { user: "半岛粉", text: "劳斯莱斯接机太有仪式感，大堂下午茶必体验", score: 5 },
                  { user: "周年纪念", text: "套房能直接看到陆家嘴全景，一生推", score: 5 },
                ],
              },
            },
            {
              id: "hotel3", name: "上海华尔道夫", lat: 31.2380, lng: 121.4880, type: "hotel",
              stars: 5, rating: 4.7,
              imageUrl: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=640&q=80",
              desc: "外滩历史建筑群中的奢华酒店，长廊酒吧",
              tags: ["五星级", "历史建筑", "长廊酒吧"],
              deepContent: {
                priceRange: "¥2500/晚",
                images: [
                  "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=480&q=80",
                  "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=480&q=80",
                  "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=480&q=80",
                  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=480&q=80",
                ],
                reviews: [
                  { user: "酒店控", text: "长廊酒吧氛围绝了，调酒师很专业", score: 5 },
                  { user: "历史爱好者", text: "百年老建筑改的，每个角落都有故事", score: 4 },
                ],
              },
            },
          ],
        },
      },
      {
        action: "update",
        componentId: "budget",
        data: {
          total: 3500,
          items: [
            { label: "交通", amount: 120 },
            { label: "餐饮", amount: 400 },
            { label: "门票", amount: 180 },
            { label: "住宿", amount: 2200 },
          ],
        },
      },
    ],
  },

  // ──────────────────────────────────────────────
  // Step 9: 用户说临时要去深圳出差 → 弹航班列表
  // ──────────────────────────────────────────────
  {
    trigger: { type: "user_send" },
    userMessage: "对了，我临时周日晚上要被调去深圳出差，需要坐飞机过去，行程得调一下",
    aiMessage: "收到！先帮你查了周日晚上上海飞深圳的航班，选一个时间合适的～",
    workspaceActions: [
      {
        action: "create",
        componentId: "flights",
        componentType: "flight_list",
        data: {
          title: "周日晚 · 上海→深圳航班",
          flights: [
            { id: "f1", departTime: "17:30", arriveTime: "19:55", from: "上海虹桥", to: "深圳宝安", duration: "2h25m", tags: ["傍晚", "虹桥出发"], desc: "下午出发，晚上到深圳可以早点休息", price: 850, airline: "东方航空" },
            { id: "f2", departTime: "18:45", arriveTime: "21:10", from: "上海虹桥", to: "深圳宝安", duration: "2h25m", tags: ["推荐", "时间宽裕"], desc: "留出充足游玩时间，到深圳不算太晚", price: 720, airline: "南方航空" },
            { id: "f3", departTime: "20:00", arriveTime: "22:25", from: "上海浦东", to: "深圳宝安", duration: "2h25m", tags: ["晚班", "浦东出发"], desc: "白天行程不受影响，但到达较晚", price: 680, airline: "深圳航空" },
            { id: "f4", departTime: "21:15", arriveTime: "23:35", from: "上海虹桥", to: "深圳宝安", duration: "2h20m", tags: ["末班", "最便宜"], desc: "最晚班次，价格最低但到达接近午夜", price: 620, airline: "春秋航空" },
          ],
        },
      },
    ],
  },

  // ──────────────────────────────────────────────
  // Step 10: 用户选了航班 → 调整 Day2 行程 + 更新预算 + 出差清单
  // ──────────────────────────────────────────────
  {
    trigger: { type: "component_interact", componentId: "flights" },
    aiMessage:
      "18:45 的航班选好了 ✈️ Day 2 行程帮你调了，下午 15:30 出发去机场。另外查了下周深圳的天气，给你准备了一份出差清单，照着准备就行～",
    workspaceActions: [
      {
        action: "update",
        componentId: "itinerary",
        data: {
          activeTab: "day2",
          days: {
            day1: {
              label: "Day 1 · 法租界漫步",
              spots: [
                { id: "wukang", name: "武康路", time: "09:30", duration: "1.5h", desc: "从武康大楼出发，沿途看老洋房和巴金故居", tag: "历史建筑", imageUrl: "https://images.unsplash.com/photo-1567610464789-af95f753af41?w=640&q=80" },
                { id: "anfu", name: "安福路", time: "11:00", duration: "1h", desc: "独立设计师店和话剧中心", tag: "文艺街区", imageUrl: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=640&q=80", transport: { method: "步行", duration: "10min", distance: "0.8km" } },
                { id: "lunch1", name: "衡山路午餐", time: "12:00", duration: "1h", desc: "推荐衡山小馆或 Alimentari", tag: "美食", transport: { method: "步行", duration: "8min", distance: "0.6km" } },
                { id: "fuxing", name: "复兴西路", time: "13:30", duration: "1.5h", desc: "国际礼拜堂、衡山电影院一带", tag: "历史建筑", imageUrl: "https://images.unsplash.com/photo-1548919973-5cef591cdbc9?w=640&q=80", transport: { method: "步行", duration: "5min", distance: "0.4km" } },
                { id: "tianzifang", name: "田子坊", time: "15:30", duration: "2h", desc: "石库门弄堂里的艺术区", tag: "文创园区", imageUrl: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=640&q=80", transport: { method: "地铁", duration: "15min", distance: "3km" } },
              ],
            },
            day2: {
              label: "Day 2 · 滨江文化线",
              spots: [
                { id: "power", name: "上海当代艺术博物馆", time: "09:00", duration: "1.5h", desc: "PSA，提前半小时出发多看一会儿", tag: "艺术展览" },
                { id: "cool_docks", name: "老码头", time: "10:30", duration: "45min", desc: "外滩背后的创意园区，快速逛一圈", tag: "文创园区", transport: { method: "步行", duration: "12min", distance: "1km" } },
                { id: "lunch2", name: "豫园午餐", time: "11:30", duration: "1h", desc: "南翔小笼和城隍庙小吃", tag: "美食", transport: { method: "步行", duration: "15min", distance: "1.2km" } },
                { id: "bund", name: "外滩", time: "13:00", duration: "1.5h", desc: "经典外滩建筑群和江景", tag: "地标", transport: { method: "地铁", duration: "10min", distance: "2km" } },
                { id: "airport", name: "出发去虹桥机场", time: "15:30", duration: "—", desc: "地铁 2 号线直达虹桥，预留充足值机时间", tag: "✈️ 18:45 起飞", transport: { method: "打车", duration: "15min", distance: "3km" } },
              ],
            },
          },
        },
      },
      {
        action: "update",
        componentId: "budget",
        data: {
          total: 4220,
          items: [
            { label: "交通", amount: 150 },
            { label: "餐饮", amount: 400 },
            { label: "门票", amount: 180 },
            { label: "住宿", amount: 2200 },
            { label: "机票", amount: 720 },
          ],
        },
      },
      {
        action: "create",
        componentId: "packing",
        componentType: "checklist",
        data: {
          title: "深圳出差准备清单",
          weather: {
            city: "深圳",
            date: "下周一至周五",
            temp: "28-34°C",
            condition: "多云，周三有雷阵雨",
            tips: "带伞，室内空调冷建议备薄外套",
          },
          items: [
            { id: "p1", text: "身份证", checked: false },
            { id: "p2", text: "笔记本电脑 + 充电器", checked: false },
            { id: "p3", text: "手机充电线 / 充电宝", checked: false },
            { id: "p4", text: "短袖 × 3（28-34°C）", checked: false },
            { id: "p5", text: "薄外套（室内空调冷）", checked: false },
            { id: "p6", text: "折叠伞（周三雷阵雨）", checked: false },
            { id: "p7", text: "公司文件 / 名片", checked: false },
            { id: "p8", text: "洗漱用品", checked: false },
          ],
        },
      },
    ],
  },
]

export default scenario
