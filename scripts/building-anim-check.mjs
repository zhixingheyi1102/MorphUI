import { chromium } from "playwright"
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
await page.goto("http://localhost:5173/?preview=1", { waitUntil: "networkidle", timeout: 30000 })
await page.waitForTimeout(4000)

// 找一个在地图可视区域内、未被遮挡的建筑 marker，用鼠标坐标 hover
const target = await page.evaluate(() => {
  const els = [...document.querySelectorAll(".building-marker")]
  for (const el of els) {
    const r = el.getBoundingClientRect()
    if (r.width === 0) continue
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2
    const top = document.elementFromPoint(cx, cy)
    if (el.contains(top)) return { cx, cy, name: el.title }
  }
  return null
})
console.log("hover target:", JSON.stringify(target))
if (target) {
  await page.mouse.move(target.cx, target.cy)
  await page.waitForTimeout(400)
  const h = await page.evaluate(({ cx, cy }) => {
    const el = document.elementFromPoint(cx, cy)?.closest(".building-marker")
    const hv = el?.querySelector(".building-hover")
    return hv ? { transform: getComputedStyle(hv).transform, filter: getComputedStyle(hv).filter } : null
  }, target)
  console.log("hover state:", JSON.stringify(h))
}
await page.screenshot({ path: "/tmp/building-anim.png" })
await browser.close()
