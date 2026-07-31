// 一键整理自查：跑完整剧本（含选票→确认收纳），点一键整理后
// 断言文件夹右页 4 件齐全（预算/清单/地图/机票），并截图供人工核对地图非白屏
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
// 点预算 hint 创建 budget 组件（真实用户路径）
await chip("查看预算明细"); await page.waitForTimeout(1500)
await chip("加个地图看看路线吧"); await waitIdle(); await page.waitForTimeout(2500)
await chip("附近有什么好吃的餐厅吗？"); await waitIdle()
await chip("晚上住哪里比较好？"); await waitIdle()
await chip("我更看重舒适度"); await waitIdle()
await chip("对了，我临时周日晚上要被调去深圳出差，需要坐飞机过去，行程得调一下"); await waitIdle()

// 选南航那张票（点票面）
const ticket = page.locator("div").filter({ hasText: /^.*南方航空.*$/ }).locator("visible=true").last()
await page.locator("text=南方航空").first().click()
await waitIdle()
await chip("好，收进方案里吧"); await waitIdle(); await page.waitForTimeout(1500)

// 一键整理，等三幕动画走完（T0=1000 + 3张×520 + 400 + 500 + 余量）
await page.locator("button:has-text('一键整理')").first().click()
await page.waitForTimeout(7000)

// 断言：随行资料 4 件，且机票/地图内容在文件夹里可见
const countText = await page.locator("text=随行资料").first().textContent().catch(() => "")
// 右页容器内的收纳件文本，定位缺了哪张
const dockedTexts = await page.evaluate(() => {
  const header = [...document.querySelectorAll("span")].find(e => (e.textContent || "").includes("随行资料"))
  const rightPage = header?.closest("div.relative.shrink-0")
  if (!rightPage) return ["<右页未找到>"]
  const cols = rightPage.querySelectorAll(".flex.gap-3 > div")
  return [...cols].flatMap(col => [...col.children].map(c => (c.textContent || "").slice(0, 40)))
})
console.log("docked items:", JSON.stringify(dockedTexts, null, 0))
const hasFlight = await page.locator("text=南方航空").count()
const hasBudget = await page.locator("text=预算").count()
const hasPacking = await page.locator("text=深圳出差准备清单").count()
const mapCanvas = await page.locator(".maplibregl-canvas").count()
console.log("随行资料 header:", countText?.trim())
console.log("docked count:", countText?.includes("4 件") ? "OK 4 件" : `FAIL（${countText?.trim()}）`)
console.log("flight:", hasFlight > 0 ? "OK 机票可见" : "FAIL 机票不在")
console.log("budget:", hasBudget > 0 ? "OK" : "FAIL")
console.log("packing:", hasPacking > 0 ? "OK" : "FAIL")
console.log("map canvas:", mapCanvas > 0 ? `OK canvas×${mapCanvas}` : "FAIL 无地图 canvas")

await page.screenshot({ path: "/tmp/organize-1-folder.png", fullPage: false })
await b.close()
