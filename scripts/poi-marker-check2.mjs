// 细查：restaurant/hotel/spot 圆章相对地图可视区的位置（是否被裁剪在外）
import { chromium } from "playwright"
const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: 2000, height: 1100 } })
await page.goto("http://localhost:5173/")
await page.waitForTimeout(1500)
const chip = async (t) => { const c = page.locator(`button:has-text("${t}")`).first(); await c.waitFor({ timeout: 15000 }); await c.click() }
const waitIdle = () => page.waitForTimeout(3500)

const audit = (label) => page.evaluate((label) => {
  const mapCard = [...document.querySelectorAll("div.absolute.group")].find(e => (e.textContent||"").includes("路线地图"))
  const mapCanvas = mapCard.querySelector(".maplibregl-map")
  const mr = mapCanvas.getBoundingClientRect()
  const rows = []
  for (const m of document.querySelectorAll(".maplibregl-marker")) {
    const cs = getComputedStyle(m)
    const bg = cs.backgroundColor
    if (bg === "rgba(0, 0, 0, 0)") continue // 建筑插画，跳过
    const r = m.getBoundingClientRect()
    const inMap = r.left >= mr.left && r.right <= mr.right && r.top >= mr.top && r.bottom <= mr.bottom
    rows.push({ bg, x: Math.round(r.x - mr.x), y: Math.round(r.y - mr.y), inMap })
  }
  return { label, mapWH: `${Math.round(mr.width)}x${Math.round(mr.height)}`, pins: rows }
}, label)

await chip("帮我规划一个上海周末两日游的方案"); await waitIdle()
for (const opt of ["和朋友", "2人", "500 - 1500", "文艺小众"]) {
  const o = page.locator(`button:has-text("${opt}")`).first()
  if (await o.count()) { await o.click(); await page.waitForTimeout(400) }
}
await page.locator("button:has-text('SUBMIT')").first().click(); await waitIdle()
await chip("加个地图看看路线吧"); await waitIdle(); await page.waitForTimeout(2500)
console.log(JSON.stringify(await audit("① 地图"), null, 1))
await chip("附近有什么好吃的餐厅吗？"); await waitIdle(); await page.waitForTimeout(2000)
console.log(JSON.stringify(await audit("② 餐厅后"), null, 1))
await chip("晚上住哪里比较好？"); await waitIdle()
await chip("我更看重舒适度"); await waitIdle(); await page.waitForTimeout(2000)
console.log(JSON.stringify(await audit("③ 酒店后"), null, 1))
await b.close()
