import { chromium } from "playwright"
import { mkdirSync, readdirSync, renameSync } from "fs"

const dir = "/tmp/org-video"
mkdirSync(dir, { recursive: true })
const b = await chromium.launch()
const ctx = await b.newContext({
  viewport: { width: 1720, height: 1000 },
  recordVideo: { dir, size: { width: 1720, height: 1000 } },
})
const page = await ctx.newPage()
await page.goto("http://localhost:5199/?preview=1")
await page.waitForTimeout(4500)

// 模拟用户缩小看全景（测相机缓动）
await page.keyboard.down("Meta")
await page.mouse.move(860, 500)
for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(60) }
await page.keyboard.up("Meta")
await page.waitForTimeout(500)

await page.getByRole("button", { name: "一键整理" }).first().click()
await page.waitForTimeout(4800)
const header = page.locator("text=随行资料").first()
console.log("docked header:", await header.textContent().catch(() => "NOT FOUND"))
await ctx.close()
await b.close()
const f = readdirSync(dir).find((n) => n.endsWith(".webm"))
renameSync(`${dir}/${f}`, `${dir}/organize.webm`)
console.log("video saved:", `${dir}/organize.webm`)
