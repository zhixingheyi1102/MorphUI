import { chromium } from "playwright"
const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: 2600, height: 1200 }, deviceScaleFactor: 2 })
await page.goto("http://localhost:5199/?preview=1")
await page.waitForTimeout(4500)

// 1) 合拢态
const tab = page.locator("text=展开方案").first()
if (await tab.count()) {
  const card = tab.locator("xpath=ancestor::div[contains(@class,'group')][1]").first()
  await card.screenshot({ path: "/tmp/folder-closed.png" })
  console.log("closed captured")
  // 2) 点标签展开（空右页）
  await tab.click({ force: true })
  await page.waitForTimeout(1200)
  const spread = page.locator("text=随行资料").first()
  if (await spread.count()) {
    const sc = spread.locator("xpath=ancestor::div[contains(@class,'group')][1]").first()
    await sc.screenshot({ path: "/tmp/folder-open-empty.png" })
    console.log("open-empty captured")
  } else console.log("open-empty NOT found")
} else console.log("closed tab NOT found")

// 3) 一键整理 → 收纳
const org = page.getByRole("button", { name: "一键整理" }).first()
if (await org.count()) {
  await org.click()
  await page.waitForTimeout(2500)
  const spread = page.locator("text=随行资料").first()
  if (await spread.count()) {
    const sc = spread.locator("xpath=ancestor::div[contains(@class,'group')][1]").first()
    await sc.screenshot({ path: "/tmp/folder-organized.png" })
    console.log("organized captured")
    // 4) 点击一个收纳件 → 提前放大
    const mask = page.locator("[title='点击放大']").first()
    if (await mask.count()) {
      await mask.click()
      await page.waitForTimeout(900)
      await sc.screenshot({ path: "/tmp/folder-expanded.png" })
      console.log("expanded captured")
    } else console.log("expand mask NOT found")
  } else console.log("organized spread NOT found")
} else console.log("organize button NOT found")

await b.close()
