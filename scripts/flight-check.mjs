import { chromium } from "playwright"

const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: 2400, height: 1200 }, deviceScaleFactor: 2 })
await page.goto("http://localhost:5173/")
await page.waitForTimeout(1500)

// 点一个 sug 并等 AI 打字结束（sug 消失→重新出现）
async function clickSug(text) {
  const sug = page.getByRole("button", { name: text })
  await sug.waitFor({ timeout: 30000 })
  await sug.click()
  await page.waitForTimeout(500)
}
async function waitTypingDone() {
  // 打字期间 sug 隐藏；粗暴等待：轮询 3s 内文本不再变化
  let prev = ""
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(600)
    const cur = await page.locator("body").innerText()
    if (cur === prev) return
    prev = cur
  }
}

// Step 1: 发起规划
await clickSug("帮我规划一个上海周末两日游的方案")
await waitTypingDone()

// Step 2: 填 clarify 表单（每题点第一个选项）+ SUBMIT
const form = page.locator(".intake-paper")
await form.waitFor({ timeout: 15000 })
// 逐题点第一个选项，直到 SUBMIT 可用（动态追问会新增题目）
for (let round = 0; round < 6; round++) {
  const groups = form.locator("div.animate-fadeIn")
  const n = await groups.count()
  for (let i = 0; i < n; i++) {
    const opt = groups.nth(i).locator("button").first()
    if (await opt.count()) await opt.click().catch(() => {})
  }
  const submit = form.getByRole("button", { name: "SUBMIT" })
  if (await submit.isEnabled().catch(() => false)) {
    await submit.click()
    break
  }
  await page.waitForTimeout(400)
}
await waitTypingDone()

// 点 hint 创建预算卡（否则 Step 10 的预算更新无处落地）
const hint = page.getByRole("button", { name: /查看预算明细/ })
if (await hint.count()) {
  await hint.click()
  await page.waitForTimeout(800)
  console.log("budget hint clicked")
}

// Steps 3-8: 依次点 sug 走完剧本
for (const s of [
  "加个地图看看路线吧",
  "附近有什么好吃的餐厅吗？",
  "晚上住哪里比较好？",
  "我更看重舒适度",
  "对了，我临时周日晚上要被调去深圳出差，需要坐飞机过去，行程得调一下",
]) {
  await clickSug(s)
  await waitTypingDone()
}

// 机票列表出现
await page.locator("text=BOARDING PASS").first().waitFor({ timeout: 15000 })
await page.screenshot({ path: "/tmp/flight-1-list.png" })
console.log("flight list shown")

// 点深圳航空（f3，20:00 浦东）那张票 → 验证即时盖章
await page.locator("button", { has: page.locator("text=深圳航空") }).first().click()
await page.waitForTimeout(600)
const stamp = page.locator("text=已选 ✓")
console.log("stamp visible:", (await stamp.count()) > 0)
await page.screenshot({ path: "/tmp/flight-2-stamped.png" })

// 等 AI 确认语打完 + 动作落地 + autoDock
await waitTypingDone()
await page.waitForTimeout(2500)

const body = await page.locator("body").innerText()
console.log("msg has 深圳航空 20:00:", body.includes("深圳航空 20:00"))
console.log("msg has 收进方案:", body.includes("收进方案"))
console.log("msg has 16:45:", body.includes("16:45"))
console.log("msg has 浦东机场:", body.includes("浦东机场"))
console.log("budget has 680:", body.includes("680"))
console.log("budget total 3610:", (await page.locator("text=/3,?610/").count()) > 0)
// 预算卡完整文本
const budCard = page.locator("text=CASH RECEIPT").first()
if (await budCard.count()) {
  const card = budCard.locator("xpath=ancestor::div[3]")
  console.log("budget card text:", (await card.innerText()).replace(/\n/g, " | "))
} else {
  console.log("budget card (CASH RECEIPT) not found in DOM")
}
await page.screenshot({ path: "/tmp/flight-3-after.png" })

await b.close()
