// 错层便签验证：点开景点后，详情卡应上下露头 + 回形针 + 投影
import { chromium } from "playwright"
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 })
await page.goto("http://localhost:5173/?preview=1", { waitUntil: "networkidle", timeout: 30000 })
await page.waitForTimeout(4000)

// 找建筑 marker（含 img）点击打开 POI 面板
let clicked = false
for (const mk of await page.$$(".maplibregl-marker")) {
  const hasImg = await mk.evaluate((el) => !!el.querySelector("img") && el.style.pointerEvents !== "none")
  if (hasImg) {
    const box = await mk.boundingBox()
    if (!box) continue
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    clicked = true
    break
  }
}
console.log("clicked building:", clicked)
await page.waitForTimeout(2500)

// 找便签（POI 面板 motion.div：paperclip svg 的父级）
const info = await page.evaluate(() => {
  const scroll = document.querySelector('div.w-\\[340px\\].overflow-y-auto')
  if (!scroll) return { found: false }
  const note = scroll.parentElement.parentElement // clipWrap -> motion.div
  const root = note.parentElement // 卡片根
  const nb = note.getBoundingClientRect()
  const rb = root.getBoundingClientRect()
  return {
    found: true,
    topProtrude: (rb.top - nb.top).toFixed(1),
    bottomProtrude: (nb.bottom - rb.bottom).toFixed(1),
    rootOverflow: getComputedStyle(root).overflow,
    hasClip: !!note.querySelector("svg path"),
    noteShadow: getComputedStyle(note).boxShadow.slice(0, 60),
  }
})
console.log(JSON.stringify(info, null, 2))

// 截图整卡区域（含露头）
const card = await page.$('div.w-\\[340px\\].overflow-y-auto')
if (card) {
  const noteBox = await page.evaluate(() => {
    const s = document.querySelector('div.w-\\[340px\\].overflow-y-auto')
    const root = s.parentElement.parentElement.parentElement
    const r = root.getBoundingClientRect()
    return { x: r.x - 30, y: r.y - 30, width: r.width + 60, height: r.height + 60 }
  })
  await page.screenshot({ path: "/tmp/note-card.png", clip: noteBox })
}
await browser.close()
console.log("done")
