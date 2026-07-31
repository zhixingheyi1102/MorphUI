import { chromium } from "playwright"
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1800, height: 1100 }, deviceScaleFactor: 2 })
await page.goto("http://localhost:5173/?preview=1", { waitUntil: "networkidle" }).catch(()=>{})
await page.waitForTimeout(3500)
const r = await page.evaluate(() => {
  // 找 CheckList：w-80 且包含 PACKING LIST 文本
  const els = [...document.querySelectorAll(".w-80")]
  const t = els.find((e) => e.textContent?.includes("PACKING"))
  if (t) { t.scrollIntoView({ block: "center" }); return "found" }
  return null
})
console.log(r)
await page.waitForTimeout(600)
const box = await page.evaluate(() => {
  const els = [...document.querySelectorAll(".w-80")]
  const t = els.find((e) => e.textContent?.includes("PACKING"))
  return t ? t.getBoundingClientRect().toJSON() : null
})
console.log(JSON.stringify(box))
if (box) await page.screenshot({ path: "/tmp/cl-now.png", clip: { x: box.x - 15, y: Math.max(0, box.y - 15), width: box.width + 30, height: Math.min(box.height + 30, 1100) } })
await browser.close()
