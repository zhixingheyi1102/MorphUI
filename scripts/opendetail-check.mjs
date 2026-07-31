// 入口打通自查：方案 POI 条卡点击 → 地图卡飞到该点并抽出二级 POST CARD 便签（玩法门控未探索时不出现）
import { chromium } from "playwright"
const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: 2000, height: 1100 }, deviceScaleFactor: 2 })
await page.goto("http://localhost:5173/")
await page.waitForTimeout(1500)
const chip = async (t) => { const c = page.locator(`button:has-text("${t}")`).first(); await c.waitFor({ timeout: 15000 }); await c.click() }
const waitIdle = () => page.waitForTimeout(3500)

await chip("帮我规划一个上海周末两日游的方案"); await waitIdle()
for (const opt of ["和朋友", "2人", "500 - 1500", "文艺小众"]) {
  const o = page.locator(`button:has-text("${opt}")`).first()
  if (await o.count()) { await o.click(); await page.waitForTimeout(400) }
}
await page.locator("button:has-text('SUBMIT')").first().click(); await waitIdle()
await chip("加个地图看看路线吧"); await waitIdle(); await page.waitForTimeout(2500)

// 点方案笔记本里的第一张 POI 条卡（武康大楼）
const spotCard = page.locator("div.cursor-pointer:has-text('武康大楼')").first()
await spotCard.waitFor({ timeout: 10000 })
await spotCard.click()
await page.waitForTimeout(1500)

// 断言：二级便签抽出（探索玩法 chip 出现），且玩法门控生效（玩法推荐未出现）
const exploreBtn = await page.locator("text=探索玩法").count()
const playRec = await page.locator("text=玩法推荐").count()
console.log("panel open:", exploreBtn > 0 ? "OK 探索玩法可见" : "FAIL 未见二级便签")
console.log("gating:", playRec === 0 ? "OK 玩法未提前出现" : "FAIL 玩法提前出现")
const mapBox = await page.evaluate(() => {
  const el = [...document.querySelectorAll("div.absolute.group")].find(e => (e.textContent||"").includes("路线地图"))
  const r = el.getBoundingClientRect(); return { x: Math.max(0,r.x-10), y: Math.max(0,r.y-10), width: r.width+380, height: r.height+120 }
})
await page.screenshot({ path: "/tmp/opendetail-1-panel.png", clip: mapBox })
await b.close()
