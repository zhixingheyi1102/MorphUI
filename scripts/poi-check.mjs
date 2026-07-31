import { chromium } from "playwright"
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 3 })
await page.goto("http://localhost:5173/?preview=1", { waitUntil: "networkidle", timeout: 30000 })
await page.waitForTimeout(4000)
for (const mk of await page.$$(".maplibregl-marker")) {
  const ok = await mk.evaluate((el) => !el.querySelector("img"))
  if (ok) { await mk.click({ force: true }); break }
}
await page.waitForTimeout(3500)
const panel = await page.$("div.w-\\[340px\\]")
await panel.screenshot({ path: "/tmp/poi-panel-hd.png" })
await browser.close()
console.log("done")
