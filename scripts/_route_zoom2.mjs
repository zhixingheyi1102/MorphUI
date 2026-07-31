import { chromium } from "playwright"
const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: 2000, height: 1100 }, deviceScaleFactor: 2 })
await page.goto("http://localhost:5173/")
await page.waitForTimeout(1500)
const chip = async (t) => { const c = page.locator(`button:has-text("${t}")`).first(); await c.waitFor({ timeout: 15000 }); await c.click() }
await chip("帮我规划一个上海周末两日游的方案"); await page.waitForTimeout(3500)
for (const opt of ["和朋友", "2人", "500 - 1500", "文艺小众"]) {
  const o = page.locator(`button:has-text("${opt}")`).first()
  if (await o.count()) { await o.click(); await page.waitForTimeout(400) }
}
await page.locator("button:has-text('SUBMIT')").first().click(); await page.waitForTimeout(3500)
await chip("加个地图看看路线吧"); await page.waitForTimeout(6000)
const day2 = page.locator("button:has-text('Day 2')").first()
if (await day2.count()) { await day2.click(); await page.waitForTimeout(2500) }
const box = await page.locator(".maplibregl-canvas").first().boundingBox()
await page.screenshot({ path: "/tmp/route-day2-zoom.png", clip: box })
await b.close()
