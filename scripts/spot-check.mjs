import { chromium } from "playwright"
const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 })
await page.goto("http://localhost:5173/?preview=1")
await page.waitForTimeout(4500)
const el = page.locator("div.group\\/spot").first()
if (await el.count()) {
  await el.scrollIntoViewIfNeeded()
  await page.waitForTimeout(800)
  await el.screenshot({ path: "/tmp/spot-card.png" })
  console.log("spot card captured")
} else {
  await page.screenshot({ path: "/tmp/spot-card.png", fullPage: false })
  console.log("fallback full page")
}
await b.close()
