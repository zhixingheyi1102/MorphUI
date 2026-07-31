import { chromium } from "playwright"
const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: 2000, height: 1100 } })
await page.goto("http://localhost:5173/")
await page.waitForTimeout(1500)
const chip = async (t) => { const c = page.locator(`button:has-text("${t}")`).first(); await c.waitFor({ timeout: 15000 }); await c.click() }
const waitIdle = () => page.waitForTimeout(3500)

const audit = () => page.evaluate(() => {
  const out = []
  for (const m of document.querySelectorAll(".maplibregl-marker")) {
    const cs = getComputedStyle(m)
    const inner = m.firstElementChild ? getComputedStyle(m.firstElementChild) : null
    const r = m.getBoundingClientRect()
    out.push({
      bg: cs.backgroundColor,
      size: Math.round(r.width),
      rootOp: cs.opacity, innerOp: inner ? inner.opacity : "-",
      svg: m.querySelector("svg") ? (m.querySelector("svg").innerHTML.length) : 0,
      onScreen: r.width > 0 && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight,
    })
  }
  return out
})
const summarize = (list) => {
  const g = {}
  for (const m of list) {
    const vis = m.rootOp !== "0" && m.innerOp !== "0" && m.onScreen
    const key = `${m.bg}|${vis ? "可见" : "不可见"}`
    g[key] = (g[key] || 0) + 1
  }
  return g
}

await chip("帮我规划一个上海周末两日游的方案"); await waitIdle()
for (const opt of ["和朋友", "2人", "500 - 1500", "文艺小众"]) {
  const o = page.locator(`button:has-text("${opt}")`).first()
  if (await o.count()) { await o.click(); await page.waitForTimeout(400) }
}
await page.locator("button:has-text('SUBMIT')").first().click(); await waitIdle()

await chip("加个地图看看路线吧"); await waitIdle(); await page.waitForTimeout(2500)
console.log("① 地图刚出现:", JSON.stringify(summarize(await audit()), null, 1))
const mapBox = await page.evaluate(() => {
  const el = [...document.querySelectorAll("div.absolute.group")].find(e => (e.textContent||"").includes("路线地图"))
  const r = el.getBoundingClientRect(); return { x: r.x-10, y: r.y-10, width: r.width+20, height: r.height+20 }
})
await page.screenshot({ path: "/tmp/poi-1-map.png", clip: mapBox })

await chip("附近有什么好吃的餐厅吗？"); await waitIdle(); await page.waitForTimeout(2000)
console.log("② 问完餐厅:", JSON.stringify(summarize(await audit()), null, 1))
const mb2 = await page.evaluate(() => {
  const el = [...document.querySelectorAll("div.absolute.group")].find(e => (e.textContent||"").includes("路线地图"))
  const r = el.getBoundingClientRect(); return { x: Math.max(0,r.x-10), y: Math.max(0,r.y-10), width: r.width+20, height: r.height+20 }
})
await page.screenshot({ path: "/tmp/poi-2-restaurants.png", clip: mb2 })

await chip("晚上住哪里比较好？"); await waitIdle()
await chip("我更看重舒适度"); await waitIdle(); await page.waitForTimeout(2000)
console.log("③ 选完酒店:", JSON.stringify(summarize(await audit()), null, 1))
const mb3 = await page.evaluate(() => {
  const el = [...document.querySelectorAll("div.absolute.group")].find(e => (e.textContent||"").includes("路线地图"))
  const r = el.getBoundingClientRect(); return { x: Math.max(0,r.x-10), y: Math.max(0,r.y-10), width: r.width+20, height: r.height+20 }
})
await page.screenshot({ path: "/tmp/poi-3-hotel.png", clip: mb3 })
await b.close()
