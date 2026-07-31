// 机票选择闭环自查：走真实剧本流 → 选票 → 其余票塌缩消失 + AI 询问 → 确认 → 收进方案
import { chromium } from "playwright"
const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: 2000, height: 1100 }, deviceScaleFactor: 2 })
await page.goto("http://localhost:5199/")
await page.waitForTimeout(1500)

const chip = async (text) => {
  const c = page.locator(`button:has-text("${text}")`).first()
  await c.waitFor({ timeout: 15000 })
  await c.click()
}
const waitIdle = async () => {
  // 等 AI 打字结束：建议 chips 重新出现或稳定 2s
  await page.waitForTimeout(3500)
}

// Step 1
await chip("帮我规划一个上海周末两日游的方案")
await waitIdle()
// Step 3: 填 ClarifyForm（选项各点第一项，处理追问后点 SUBMIT）
for (const opt of ["和朋友", "2人", "500 - 1500", "文艺小众"]) {
  const o = page.locator(`button:has-text("${opt}")`).first()
  if (await o.count()) { await o.click(); await page.waitForTimeout(400) }
}
await page.locator("button:has-text('SUBMIT')").first().click()
await waitIdle()
// 中间 user_send 步骤
for (const t of ["加个地图看看路线吧", "附近有什么好吃的餐厅吗？", "晚上住哪里比较好？", "我更看重舒适度", "对了，我临时周日晚上要被调去深圳出差"]) {
  await chip(t)
  await waitIdle()
}

// Step 9 落地：航班列表出现
await page.locator("text=BOARDING PASS").first().waitFor({ timeout: 10000 })
const before = await page.locator("text=BOARDING PASS").count()
console.log("tickets before:", before)
await page.screenshot({ path: "/tmp/flight-1-list.png", fullPage: false })

// Step 10：点第二张票（南方航空 f2）
await page.locator("text=南方航空").first().click()
await page.waitForTimeout(1200)
const after = await page.locator("text=BOARDING PASS").count()
console.log("tickets after select:", after, after === 1 ? "OK 其余票已消失" : "FAIL 其余票仍在")
await page.screenshot({ path: "/tmp/flight-2-selected.png" })
await waitIdle()
const askMsg = await page.locator("text=要不要我把这张机票收进方案里").count()
console.log("AI ask before dock:", askMsg > 0 ? "OK" : "FAIL")
await page.screenshot({ path: "/tmp/flight-3-ask.png" })

// Step 11：点确认气泡
await chip("好，收进方案里吧")
await waitIdle()
await page.waitForTimeout(2000)
const listOnCanvas = await page.locator("text=BOARDING PASS").count()
const packing = await page.locator("text=深圳出差准备清单").count()
console.log("after confirm → packing list:", packing > 0 ? "OK" : "FAIL", "| boarding pass nodes:", listOnCanvas)
await page.screenshot({ path: "/tmp/flight-4-docked.png" })

await b.close()
