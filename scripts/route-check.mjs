// 地图按天手绘路线自查：跑到地图出现，截图核对 Day1 墨线连线 + Day2 切换后变灰/换色
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
await chip("加个地图看看路线吧"); await waitIdle(); await page.waitForTimeout(3000)

console.log("map canvas:", await page.locator(".maplibregl-canvas").count())
await page.screenshot({ path: "/tmp/route-1-day1.png" })

// 若地图卡上有 Day 切换（Day 2 标签），点一下看置灰联动
const day2 = page.locator("button:has-text('Day 2')").first()
if (await day2.count()) {
  await day2.click()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: "/tmp/route-2-day2.png" })
  console.log("day2 switch: done")
} else {
  console.log("day2 switch: 无 Day2 标签，跳过")
}
await b.close()
