// 临时排查脚本：打开 preview 页，收集 console/网络错误，截图地图组件
import { chromium } from "playwright"

const url = process.env.URL ?? "http://localhost:5173/?preview=1"
const out = process.env.OUT ?? "/tmp/map-debug.png"

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })

const logs = []
page.on("console", (m) => {
  if (["error", "warning"].includes(m.type())) logs.push(`[console.${m.type()}] ${m.text()}`)
})
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`))
page.on("requestfailed", (r) => logs.push(`[requestfailed] ${r.url()} :: ${r.failure()?.errorText}`))

await page.goto(url, { waitUntil: "networkidle", timeout: 30000 }).catch((e) => logs.push(`[goto] ${e.message}`))
await page.waitForTimeout(4000)

// 地图组件状态
const info = await page.evaluate(() => {
  const map = window.__map
  const canvas = document.querySelector(".maplibregl-canvas")
  const container = document.querySelector(".maplibregl-map")
  return {
    hasMapObj: !!map,
    zoom: map?.getZoom?.(),
    center: map?.getCenter?.(),
    styleLoaded: map?.isStyleLoaded?.(),
    canvas: canvas ? { w: canvas.width, h: canvas.height, cssW: canvas.style.width, cssH: canvas.style.height } : null,
    containerRect: container ? container.getBoundingClientRect().toJSON() : null,
    markerCount: document.querySelectorAll(".maplibregl-marker").length,
    webgl: (() => {
      try {
        const c = document.createElement("canvas")
        return !!(c.getContext("webgl2") || c.getContext("webgl"))
      } catch { return false }
    })(),
  }
})

// 截整页 + 地图区域
await page.screenshot({ path: out, fullPage: false })
const mapEl = await page.$(".maplibregl-map")
if (mapEl) await mapEl.screenshot({ path: out.replace(".png", "-map.png") }).catch(() => {})

console.log("=== INFO ===")
console.log(JSON.stringify(info, null, 2))
console.log("=== LOGS ===")
console.log(logs.slice(0, 40).join("\n") || "(no errors)")

await browser.close()
