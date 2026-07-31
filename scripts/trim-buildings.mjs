// 建筑 PNG alpha 裁剪：沿非透明像素包围盒（留 2px 余量）裁掉透明边
// 用 Playwright 浏览器 canvas 做，避免引入 sharp 等新依赖
import { chromium } from "playwright"
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const dir = "public/buildings"
const files = readdirSync(dir).filter((f) => f.endsWith(".png"))
const browser = await chromium.launch()
const page = await browser.newPage()

for (const f of files) {
  const buf = readFileSync(join(dir, f))
  const result = await page.evaluate(async (b64) => {
    const img = new Image()
    img.src = `data:image/png;base64,${b64}`
    await img.decode()
    const { width: w, height: h } = img
    const c = document.createElement("canvas")
    c.width = w; c.height = h
    const ctx = c.getContext("2d")
    ctx.drawImage(img, 0, 0)
    const d = ctx.getImageData(0, 0, w, h).data
    let minX = w, minY = h, maxX = -1, maxY = -1
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > 8) { // alpha 阈值，忽略近全透明杂点
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    if (maxX < 0) return { skip: true, w, h }
    const pad = 2
    const sx = Math.max(0, minX - pad), sy = Math.max(0, minY - pad)
    const sw = Math.min(w, maxX + pad + 1) - sx, sh = Math.min(h, maxY + pad + 1) - sy
    if (sx === 0 && sy === 0 && sw === w && sh === h) return { skip: true, w, h }
    const out = document.createElement("canvas")
    out.width = sw; out.height = sh
    out.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
    return { b64: out.toDataURL("image/png").split(",")[1], from: `${w}x${h}`, to: `${sw}x${sh}` }
  }, buf.toString("base64"))
  if (result.skip) { console.log(`skip\t${f}\t${result.w}x${result.h}（无透明边）`); continue }
  writeFileSync(join(dir, f), Buffer.from(result.b64, "base64"))
  console.log(`trim\t${f}\t${result.from} → ${result.to}`)
}
await browser.close()
