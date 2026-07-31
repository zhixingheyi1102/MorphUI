// 自动跟进自查：先点一键整理，再走机票流程，断言后创建的 packing 自动进文件夹
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
await page.locator("button:has-text('SUBMIT')").first().click(); await waitIdle()
await chip("查看预算明细"); await page.waitForTimeout(1500)
await chip("加个地图看看路线吧"); await waitIdle(); await page.waitForTimeout(2500)
await chip("附近有什么好吃的餐厅吗？"); await waitIdle()
await chip("晚上住哪里比较好？"); await waitIdle()
await chip("我更看重舒适度"); await waitIdle()

// ── 提前整理：此时还没有机票和 packing ──
await page.locator("button:has-text('一键整理')").first().click()
await page.waitForTimeout(7000)
const before = await page.locator("text=随行资料").first().textContent().catch(() => "")
console.log("整理后（机票流程前）:", before?.trim())

// ── 继续走机票流程 ──
await chip("对了，我临时周日晚上要被调去深圳出差，需要坐飞机过去，行程得调一下"); await waitIdle()
await page.locator("text=南方航空").first().click(); await waitIdle()
await chip("好，收进方案里吧"); await waitIdle(); await page.waitForTimeout(2000)

const after = await page.locator("text=随行资料").first().textContent().catch(() => "")
const hasPacking = await page.locator("text=深圳出差准备清单").count()
console.log("机票确认后:", after?.trim())
console.log("packing 自动跟进:", hasPacking > 0 ? "OK 在文件夹" : "FAIL 不见了")
await page.screenshot({ path: "/tmp/autodock.png", fullPage: false })
await b.close()
