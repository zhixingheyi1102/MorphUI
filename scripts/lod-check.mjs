import { chromium } from "playwright"
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
await page.goto("http://localhost:5173/?preview=1", { waitUntil: "networkidle" })
await page.waitForTimeout(3000)
for (const [zoom, name] of [[12, "cluster"], [14, "split"], [15.5, "close"]]) {
  await page.evaluate(([z]) => window.__map.jumpTo({ center: [121.4955, 31.239], zoom: z }), [zoom])
  await page.waitForTimeout(1200)
  const el = await page.$(".maplibregl-map")
  await el.screenshot({ path: `/tmp/lod-${name}.png` })
}
await browser.close()
console.log("done")
