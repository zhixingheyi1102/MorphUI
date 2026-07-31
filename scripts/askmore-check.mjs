// POI 卡「更多」自查：hover 卡片验证徽标位置不压邮票照片；点卡后对话里出现用户提问
import { chromium } from "playwright"
const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: 2000, height: 1100 }, deviceScaleFactor: 2 })
await page.goto("http://localhost:5173/")
await page.waitForTimeout(1500)
const chip = async (t) => { const c = page.locator(`button:has-text("${t}")`).first(); await c.waitFor({ timeout: 15000 }); await c.click() }
const waitIdle = () => page.waitForTimeout(3500)

await chip("帮我规划一个上海周末两日游的方案"); await waitIdle()
for (const opt of ["和朋友", "2人", "500 - 1500", "文艺小众"]) {
  const o = page.locator(`button:has-text("${opt}")`).first()
  if (await o.count()) { await o.click(); await page.waitForTimeout(400) }
}
await page.locator("button:has-text('SUBMIT')").first().click(); await waitIdle(); await page.waitForTimeout(2000)

// hover 武康大楼卡片 → 「更多」徽标出现
const card = page.locator("h4:has-text('武康大楼')").first()
await card.waitFor({ timeout: 15000 })
await card.hover()
await page.waitForTimeout(600)
const badge = page.locator("span:has-text('更多')").locator("visible=true").first()
const badgeVisible = await badge.count()
console.log("badge:", badgeVisible > 0 ? "OK 「更多」可见" : "FAIL 徽标未出现")
if (badgeVisible) {
  const bb = await badge.boundingBox()
  // 邮票照片区（92 宽）在卡片右缘内 16px padding；徽标右缘应 ≤ 照片左缘
  const cardBox = await card.locator("xpath=ancestor::div[contains(@class,'flex-1')][1]").boundingBox()
  console.log("badge box:", JSON.stringify(bb), "card box:", JSON.stringify(cardBox))
}
await page.screenshot({ path: "/tmp/askmore-1-hover.png" })

// 点卡片 → 对话区出现用户消息「多介绍一下「武康大楼」」
await card.click()
await page.waitForTimeout(1500)
const asked = await page.locator("text=多介绍一下「武康大楼」").count()
console.log("ask message:", asked > 0 ? "OK 对话已发出提问" : "FAIL 未见提问消息")
await page.screenshot({ path: "/tmp/askmore-2-clicked.png" })
await b.close()
