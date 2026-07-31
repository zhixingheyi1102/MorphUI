import { chromium } from "playwright"
const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: 2600, height: 1200 }, deviceScaleFactor: 2 })
await page.goto("http://localhost:5199/?preview=1")
await page.waitForTimeout(4500)

// 找预算卡（CASH RECEIPT）和方案（展开方案标签所在卡）
const rec = page.locator("text=CASH RECEIPT").first()
const recCard = rec.locator("xpath=ancestor::div[contains(@class,'group')][1]").first()
const recBox = await recCard.boundingBox()
const tab = page.locator("text=展开方案").first()
const folderCard = tab.locator("xpath=ancestor::div[contains(@class,'group')][1]").first()
const folderBox = await folderCard.boundingBox()
console.log("rec:", JSON.stringify(recBox), "folder:", JSON.stringify(folderBox))

// hover 卡片让拖拽手柄出现，然后从手柄位置拖到文件夹中心
const hx = recBox.x + recBox.width / 2
const hy = recBox.y + 16
await page.mouse.move(hx, hy)
await page.waitForTimeout(400)
await page.mouse.down()
const tx = folderBox.x + folderBox.width / 2
const ty = folderBox.y + folderBox.height / 2
// 分步移动模拟拖拽
for (let i = 1; i <= 12; i++) {
  await page.mouse.move(hx + ((tx - hx) * i) / 12, hy + ((ty - hy) * i) / 12)
  await page.waitForTimeout(40)
}
// 中途截一张：拖拽提示描边
await page.screenshot({ path: "/tmp/drag-over.png", clip: { x: folderBox.x - 60, y: Math.max(0, folderBox.y - 60), width: folderBox.width + 400, height: folderBox.height + 120 } })
await page.mouse.up()
await page.waitForTimeout(1500)

const header = page.locator("text=随行资料").first()
console.log("after drop, spread visible:", await header.count())
if (await header.count()) console.log("header:", await header.textContent())
const sc = header.locator("xpath=ancestor::div[contains(@class,'group')][1]").first()
if (await header.count()) await sc.screenshot({ path: "/tmp/drag-docked.png" })
await b.close()
