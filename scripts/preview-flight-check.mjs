// 预览模式机票交互自查：?preview=1 点票 → 盖章塌缩 → AI 询问 → 气泡确认 → 收纳
import { chromium } from "playwright"
const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: 2400, height: 1200 }, deviceScaleFactor: 2 })
await page.goto("http://localhost:5199/?preview=1")
await page.waitForTimeout(4000)

const before = await page.locator("text=BOARDING PASS").count()
await page.locator("text=南方航空").first().click()
await page.waitForTimeout(1200)
const after = await page.locator("text=BOARDING PASS").count()
console.log(`tickets ${before} → ${after}`, after === 1 ? "OK 塌缩" : "FAIL")
await page.screenshot({ path: "/tmp/pv-1-selected.png" })

await page.waitForTimeout(4000)
const ask = await page.locator("text=要不要我把这张机票收进方案里").count()
console.log("AI ask:", ask > 0 ? "OK" : "FAIL")

const chip = page.locator("button:has-text('好，收进方案里吧')").first()
await chip.waitFor({ timeout: 10000 })
await chip.click()
await page.waitForTimeout(6000)
const airport = await page.locator("text=出发去虹桥机场").count()
console.log("Day2 机场节点:", airport > 0 ? "OK" : "FAIL")
await page.screenshot({ path: "/tmp/pv-2-docked.png" })
await b.close()
