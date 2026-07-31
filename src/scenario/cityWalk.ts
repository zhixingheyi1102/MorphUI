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
              label: "Day 1 · 梧桐区地标线",
              spots: [
                { id: "wukang", name: "武康大楼", time: "09:30", duration: "1.5h", desc: "诺曼底公寓，法租界最出片的地标建筑", tag: "历史建筑", imageUrl: "https://images.unsplash.com/photo-1471623320832-752e8bbf8413?w=640&q=80" },
                { id: "jingan", name: "静安寺", time: "11:00", duration: "1h", desc: "闹市中的金顶古刹，香火与摩天楼同框", tag: "古刹地标", imageUrl: "https://images.unsplash.com/photo-1545048702-79362596cdc9?w=640&q=80", transport: { method: "地铁", duration: "10min", distance: "2.2km" } },
                { id: "shikumen", name: "石库门·张园", time: "13:00", duration: "1.5h", desc: "修旧如旧的石库门里弄，午餐＋逛街", tag: "石库门", imageUrl: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=640&q=80", transport: { method: "步行", duration: "20min", distance: "1.6km" } },
                { id: "xintiandi", name: "新天地", time: "14:30", duration: "1.5h", desc: "石库门改造的时尚街区，咖啡与酒吧", tag: "时尚街区", imageUrl: "https://images.unsplash.com/photo-1548919973-5cef591cdbc9?w=640&q=80", transport: { method: "步行", duration: "18min", distance: "1.7km" } },
                { id: "tianzifang", name: "田子坊", time: "16:00", duration: "2h", desc: "石库门弄堂里的艺术区，手作与小店", tag: "文创园区", imageUrl: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=640&q=80", transport: { method: "步行", duration: "18min", distance: "1.4km" } },
              ],
            },
            day2: {
              label: "Day 2 · 老城厢滨江线",
              spots: [
                { id: "yuyuan", name: "豫园九曲桥", time: "09:30", duration: "1.5h", desc: "明代园林与九曲桥，老上海的园林起点", tag: "古典园林", imageUrl: "https://images.unsplash.com/photo-1548919973-5cef591cdbc9?w=640&q=80" },
                { id: "chenghuang", name: "城隍庙", time: "11:00", duration: "1.5h", desc: "南翔小笼和城隍庙小吃，逛庙＋午餐", tag: "美食地标", imageUrl: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=640&q=80", transport: { method: "步行", duration: "2min", distance: "0.1km" } },
                { id: "bund", name: "外滩·海关大楼", time: "13:30", duration: "1.5h", desc: "万国建筑群，海关大楼与对岸陆家嘴", tag: "地标", imageUrl: "https://images.unsplash.com/photo-1474181487882-5abf3f0ba6c2?w=640&q=80", transport: { method: "步行", duration: "15min", distance: "1.2km" } },
                { id: "waibaidu", name: "外白渡桥", time: "15:00", duration: "45min", desc: "百年钢桥，苏州河汇入黄浦江的经典机位", tag: "历史地标", imageUrl: "https://images.unsplash.com/photo-1545893835-abaa50cbe628?w=640&q=80", transport: { method: "步行", duration: "10min", distance: "0.75km" } },
                { id: "postmuseum", name: "邮政博物馆", time: "16:00", duration: "1h", desc: "巴洛克式老邮政大楼，顶楼可俯瞰苏州河", tag: "历史建筑", imageUrl: "https://images.unsplash.com/photo-1527838832700-5059252407fa?w=640&q=80", transport: { method: "步行", duration: "6min", distance: "0.5km" } },
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
              id: "wukang", name: "武康大楼", lat: 31.20626, lng: 121.43373, type: "spot", day: "day1",
              desc: "诺曼底公寓，法租界最出片的地标建筑，六条马路交汇的船形转角",
              imageUrl: "https://images.unsplash.com/photo-1471623320832-752e8bbf8413?w=640&q=80",
              tags: ["历史建筑", "法租界", "网红打卡"],
              deepContent: {
                activities: [
                  { id: "arch", title: "老洋房漫步", desc: "以武康大楼为起点，沿武康路看 10 栋经典洋房", duration: "1.5h", price: 0, tag: "免费" },
                  { id: "photo", title: "旅拍体验", desc: "在武康大楼、密丹公寓等标志建筑前拍一组文艺照", duration: "2h", price: 299, tag: "热门" },
                  { id: "cafe", title: "咖啡巡礼", desc: "武康路沿线 5 家精品咖啡馆，一路喝过去", duration: "2h", price: 150, tag: "美食" },
                ],
                qa: [
                  { id: "q_best_time", q: "什么时候来最好？", a: "工作日上午人少，出片最佳。傍晚梧桐光影也很美，但周末下午武康大楼一带会非常拥挤。" },
                  { id: "q_highlight", q: "必看的是什么？", a: "武康大楼（诺曼底公寓）是标志，站在对角人行道能拍到经典船头造型；周边巴金故居、密丹公寓也值得一看。" },
                ],
              },
            },
            {
              id: "jingan", name: "静安寺", lat: 31.22522, lng: 121.44079, type: "spot", day: "day1",
              desc: "闹市中的金顶古刹，香火与摩天楼同框的经典画面",
              imageUrl: "https://images.unsplash.com/photo-1545048702-79362596cdc9?w=640&q=80",
              tags: ["古刹地标", "金顶", "闹市禅意"],
              deepContent: {
                activities: [
                  { id: "temple", title: "古刹参观", desc: "金顶大殿与静安寺塔，感受闹市中的禅意", duration: "1h", price: 50, tag: "文化" },
                  { id: "jingan_walk", title: "周边逛街", desc: "久光、嘉里中心一带咖啡与商场，逛累了歇脚", duration: "1h", price: 0, tag: "免费" },
                ],
                qa: [
                  { id: "q_ticket", q: "门票多少钱？", a: "静安寺门票约 ¥50，含香。大年初一等节庆日人流很大，平日上午最清静。" },
                  { id: "q_photo", q: "怎么拍金顶好看？", a: "站在寺前广场或对面商场高层，能把金顶大殿和背后的摩天楼一起框进画面，反差感很强。" },
                ],
              },
            },
            {
              id: "shikumen", name: "石库门·张园", lat: 31.23037, lng: 121.45605, type: "spot", day: "day1",
              desc: "修旧如旧的石库门里弄，海派老建筑里逛街午餐",
              imageUrl: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=640&q=80",
              tags: ["石库门", "海派建筑", "逛街"],
              deepContent: {
                activities: [
                  { id: "lane_walk", title: "石库门漫步", desc: "走进百年张园里弄，看清水红砖与老虎窗", duration: "1h", price: 0, tag: "免费" },
                  { id: "lunch_zy", title: "里弄午餐", desc: "张园内本帮小馆与咖啡，边逛边吃", duration: "1h", price: 120, tag: "美食" },
                ],
                qa: [
                  { id: "q_open", q: "需要预约吗？", a: "张园西区免费开放，节假日客流大时可能限流，工作日基本可直接进。" },
                  { id: "q_around", q: "这一带还有什么？", a: "紧邻南京西路商圈，逛完张园可步行去恒隆、兴业太古汇一带继续逛。" },
                ],
              },
            },
            {
              id: "xintiandi", name: "新天地", lat: 31.22193, lng: 121.47044, type: "spot", day: "day1",
              desc: "石库门改造的时尚街区，咖啡、买手店与酒吧",
              imageUrl: "https://images.unsplash.com/photo-1548919973-5cef591cdbc9?w=640&q=80",
              tags: ["时尚街区", "石库门", "咖啡酒吧"],
              deepContent: {
                activities: [
                  { id: "cafe_xt", title: "下午茶咖啡", desc: "石库门老房子里的精品咖啡与甜品", duration: "1h", price: 80, tag: "美食" },
                  { id: "shop_xt", title: "买手店逛街", desc: "南里北里的设计买手店与快闪展", duration: "1.5h", price: 0, tag: "免费" },
                ],
                qa: [
                  { id: "q_night", q: "晚上热闹吗？", a: "新天地是上海夜生活地标，入夜后酒吧和露台餐厅很热闹，适合作为一天的收尾。" },
                  { id: "q_museum", q: "有什么必看？", a: "一大会址纪念馆就在旁边，免费参观；新天地本身的石库门外立面也很出片。" },
                ],
              },
            },
            {
              id: "tianzifang", name: "田子坊", lat: 31.21034, lng: 121.4641, type: "spot", day: "day1",
              desc: "石库门弄堂里的艺术区，手工艺品和创意小店",
              imageUrl: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=640&q=80",
              tags: ["文创园区", "弄堂", "手工艺"],
              deepContent: {
                activities: [
                  { id: "craft", title: "手作体验", desc: "陶艺、皮具、版画工作坊，带走一件手作纪念品", duration: "1.5h", price: 180, tag: "体验" },
                  { id: "gallery", title: "画廊巡游", desc: "10+ 家独立画廊和摄影展，免费参观", duration: "1h", price: 0, tag: "免费" },
                  { id: "snack", title: "弄堂小吃", desc: "臭豆腐、葱油饼、鸡爪，一路吃过去", duration: "1h", price: 50, tag: "美食" },
                ],
                qa: [
                  { id: "q_ticket", q: "需要门票吗？", a: "田子坊本身免费开放，弄堂里的画廊多数可免费参观；手作工作坊按项目单独收费。" },
                  { id: "q_snack", q: "有什么好吃的？", a: "弄堂小吃很集中：臭豆腐、葱油饼、鸡爪一路吃过去，人均 ¥50 左右就能吃得很满足。" },
                ],
              },
            },
            // ── Day 2 · 老城厢滨江线 ──
            {
              id: "yuyuan", name: "豫园九曲桥", lat: 31.22866, lng: 121.48742, type: "spot", day: "day2",
              desc: "明代江南古典园林与九曲桥，老上海的园林起点",
              imageUrl: "https://images.unsplash.com/photo-1548919973-5cef591cdbc9?w=640&q=80",
              tags: ["古典园林", "九曲桥", "地标"],
              deepContent: {
                activities: [
                  { id: "garden", title: "豫园游园", desc: "明代江南古典园林，亭台楼阁移步换景", duration: "1h", price: 40, tag: "文化" },
                  { id: "bridge", title: "九曲桥拍照", desc: "湖心亭与九曲桥，老上海最经典的园林机位", duration: "30min", price: 0, tag: "免费" },
                ],
                qa: [
                  { id: "q_ticket", q: "门票多少钱？", a: "豫园园林门票约 ¥40；九曲桥、湖心亭一带免费开放，进园游览才需买票。" },
                  { id: "q_time", q: "逛多久合适？", a: "园林本身 1 小时够，加上九曲桥拍照和周边商圈可留 1.5 小时。" },
                ],
              },
            },
            {
              id: "chenghuang", name: "城隍庙", lat: 31.22788, lng: 121.48819, type: "spot", day: "day2",
              desc: "南翔小笼和城隍庙小吃，逛庙加午餐的市井烟火",
              imageUrl: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=640&q=80",
              tags: ["美食地标", "老字号", "市井"],
              deepContent: {
                activities: [
                  { id: "xlb", title: "南翔小笼", desc: "百年老字号，蟹粉小笼一定要趁热吃", duration: "1h", price: 80, tag: "美食" },
                  { id: "temple_ch", title: "城隍庙参观", desc: "明代道观，感受老城厢的香火与市井", duration: "45min", price: 10, tag: "文化" },
                ],
                qa: [
                  { id: "q_xlb", q: "小笼哪家好？", a: "南翔馒头店是百年老字号，蟹粉小笼要趁热吃。高峰期排队较长，建议错峰或线上取号。" },
                  { id: "q_snack", q: "还有什么小吃？", a: "梨膏糖、五香豆、蟹壳黄、鸽蛋圆子都是城隍庙经典，边逛边吃很过瘾。" },
                ],
              },
            },
            {
              id: "bund", name: "外滩·海关大楼", lat: 31.23864, lng: 121.48564, type: "spot", day: "day2",
              desc: "万国建筑群，海关大楼与对岸陆家嘴江景",
              imageUrl: "https://images.unsplash.com/photo-1474181487882-5abf3f0ba6c2?w=640&q=80",
              tags: ["地标", "江景", "万国建筑"],
              deepContent: {
                activities: [
                  { id: "bund_walk", title: "万国建筑巡礼", desc: "沿江看 52 幢历史建筑，对岸就是陆家嘴", duration: "1h", price: 0, tag: "免费" },
                  { id: "cruise", title: "浦江游船", desc: "坐船夜游黄浦江，两岸灯光尽收眼底", duration: "1h", price: 120, tag: "热门" },
                ],
                qa: [
                  { id: "q_night", q: "夜景几点最好看？", a: "日落后 18:30–20:00 灯光全开最佳，对岸陆家嘴天际线最亮。周末人多，想拍空镜可再晚一些。" },
                  { id: "q_cruise", q: "值得坐游船吗？", a: "浦江夜游约 1 小时、人均 ¥120，两岸灯光尽收眼底，第一次来很推荐；赶时间的话沿江步行也够看。" },
                ],
              },
            },
            {
              id: "waibaidu", name: "外白渡桥", lat: 31.24531, lng: 121.48574, type: "spot", day: "day2",
              desc: "百年钢桥，苏州河汇入黄浦江的经典机位",
              imageUrl: "https://images.unsplash.com/photo-1545893835-abaa50cbe628?w=640&q=80",
              tags: ["历史地标", "钢桥", "苏州河"],
              deepContent: {
                activities: [
                  { id: "bridge_walk", title: "桥上散步", desc: "走过百年钢桥，看苏州河与黄浦江交汇", duration: "30min", price: 0, tag: "免费" },
                  { id: "photo_wb", title: "机位拍照", desc: "以外白渡桥＋陆家嘴天际线为背景取景", duration: "30min", price: 0, tag: "免费" },
                ],
                qa: [
                  { id: "q_history", q: "这座桥有什么来头？", a: "外白渡桥是中国第一座全钢结构铆接桥，1907 年建成，是上海开埠史的活化石。" },
                  { id: "q_view", q: "最佳拍照点在哪？", a: "从北岸黄浦公园一侧回望，能把钢桥和背后的陆家嘴天际线一起收进画面。" },
                ],
              },
            },
            {
              id: "postmuseum", name: "邮政博物馆", lat: 31.24641, lng: 121.48075, type: "spot", day: "day2",
              desc: "巴洛克式老邮政大楼，顶楼花园可俯瞰苏州河",
              imageUrl: "https://images.unsplash.com/photo-1527838832700-5059252407fa?w=640&q=80",
              tags: ["历史建筑", "博物馆", "免费"],
              deepContent: {
                activities: [
                  { id: "museum_pm", title: "邮政博物馆参观", desc: "看邮政史陈列与老邮车，建筑本身就是展品", duration: "1h", price: 0, tag: "免费" },
                  { id: "rooftop", title: "顶楼花园", desc: "登上钟楼花园，俯瞰苏州河与外白渡桥", duration: "30min", price: 0, tag: "免费" },
                ],
                qa: [
                  { id: "q_free", q: "参观要钱吗？", a: "邮政博物馆免费开放，凭证件入内；周一、周二闭馆，建议周末下午来。" },
                  { id: "q_rooftop", q: "顶楼花园开放吗？", a: "钟楼顶层花园会视情况开放，能俯瞰苏州河与外白渡桥，是隐藏的观景机位。" },
                ],
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
              label: "Day 1 · 梧桐区地标线",
              spots: [
                { id: "wukang", name: "武康大楼", time: "09:30", duration: "1.5h", desc: "诺曼底公寓，法租界最出片的地标建筑", tag: "历史建筑", imageUrl: "https://images.unsplash.com/photo-1471623320832-752e8bbf8413?w=640&q=80" },
                { id: "jingan", name: "静安寺", time: "11:00", duration: "1h", desc: "闹市中的金顶古刹，香火与摩天楼同框", tag: "古刹地标", imageUrl: "https://images.unsplash.com/photo-1545048702-79362596cdc9?w=640&q=80", transport: { method: "地铁", duration: "10min", distance: "2.2km" } },
                { id: "shikumen", name: "石库门·张园", time: "13:00", duration: "1.5h", desc: "修旧如旧的石库门里弄，午餐＋逛街", tag: "石库门", imageUrl: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=640&q=80", transport: { method: "步行", duration: "20min", distance: "1.6km" } },
                { id: "xintiandi", name: "新天地", time: "14:30", duration: "1.5h", desc: "石库门改造的时尚街区，咖啡与酒吧", tag: "时尚街区", imageUrl: "https://images.unsplash.com/photo-1548919973-5cef591cdbc9?w=640&q=80", transport: { method: "步行", duration: "18min", distance: "1.7km" } },
                { id: "tianzifang", name: "田子坊", time: "16:00", duration: "2h", desc: "石库门弄堂里的艺术区，手作与小店", tag: "文创园区", imageUrl: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=640&q=80", transport: { method: "步行", duration: "18min", distance: "1.4km" } },
              ],
            },
            day2: {
              label: "Day 2 · 老城厢滨江线",
              spots: [
                { id: "yuyuan", name: "豫园九曲桥", time: "09:00", duration: "1.5h", desc: "明代园林与九曲桥，提前半小时出发", tag: "古典园林", imageUrl: "https://images.unsplash.com/photo-1548919973-5cef591cdbc9?w=640&q=80" },
                { id: "chenghuang", name: "城隍庙", time: "10:30", duration: "1h", desc: "南翔小笼和城隍庙小吃，快速逛庙＋午餐", tag: "美食地标", imageUrl: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=640&q=80", transport: { method: "步行", duration: "2min", distance: "0.1km" } },
                { id: "bund", name: "外滩·海关大楼", time: "12:00", duration: "1.5h", desc: "万国建筑群，海关大楼与对岸陆家嘴", tag: "地标", imageUrl: "https://images.unsplash.com/photo-1474181487882-5abf3f0ba6c2?w=640&q=80", transport: { method: "步行", duration: "15min", distance: "1.2km" } },
                { id: "airport", name: "出发去虹桥机场", time: "15:30", duration: "—", desc: "地铁 2 号线直达虹桥，预留充足值机时间", tag: "✈️ 18:45 起飞", transport: { method: "打车", duration: "40min", distance: "13km" } },
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
