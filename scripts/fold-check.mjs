import { chromium } from "playwright"
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 })
await page.goto("http://localhost:5173/?preview=1", { waitUntil: "networkidle", timeout: 30000 })
await page.waitForTimeout(4000)

// 地图组件容器 = 地图区(w-96)的父级
const mapBox = await page.$("div.w-96.shrink-0.flex.flex-col")
const container = await mapBox.evaluateHandle((el) => el.parentElement)

// 1) 闭合态：折叠中缝
await container.asElement().screenshot({ path: "/tmp/map-folded.png" })

// 2) 点建筑 marker 打开 POI（建筑=景点标识），抓展开中帧
let opened = false
for (const mk of await page.$$(".maplibregl-marker")) {
  const box = await mk.boundingBox()
  if (!box || box.x < 0 || box.y < 0 || box.x > 1580 || box.y > 980) continue
  await mk.click({ force: true }).catch(() => {})
  await page.waitForTimeout(120)
  if (await page.$("div.w-\\[340px\\]")) { opened = true; break }
}
console.log("panel opened:", opened)
await page.waitForTimeout(80)
await container.asElement().screenshot({ path: "/tmp/map-unfolding.png" })

// 3) 展开完成：余痕
await page.waitForTimeout(1800)
await container.asElement().screenshot({ path: "/tmp/map-unfolded.png" })

await browser.close()
console.log("fold check done")
