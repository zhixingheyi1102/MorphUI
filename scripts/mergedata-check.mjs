// mergeData 回归测试：复现"收玩法进 Day1 后 Day1 其它景点全丢"的 bug
// 运行：node scripts/mergedata-check.mjs
import { mergeData } from "../src/engine/mergeData.ts"
import assert from "node:assert"

let failed = 0
function check(name, fn) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failed++
    console.log(`  ✗ ${name}\n    ${e.message}`)
  }
}

const prev = {
  activeTab: "day1",
  days: {
    day1: {
      label: "Day 1 · 法租界梧桐街区",
      spots: [
        { id: "s1", name: "武康大楼", desc: "打卡" },
        { id: "s2", name: "安福路", desc: "小店" },
        { id: "s3", name: "上海图书馆", desc: "歇脚" },
      ],
    },
    day2: {
      label: "Day 2 · 滨江文化线",
      spots: [{ id: "s4", name: "西岸美术馆", desc: "看展" }],
    },
  },
}

// ── Bug 复现：AI 收玩法时只回传了 day1 里被更新的那一条 spot ──
const patch = {
  days: {
    day1: {
      spots: [
        {
          id: "s1",
          name: "武康路梧桐街区慢逛",
          desc: "从武康大楼出发，沿武康路向复兴西路延伸",
          selectedActivities: [{ id: "a1", title: "梧桐街区慢逛" }],
        },
      ],
    },
  },
}
const out = mergeData(prev, patch)

check("day1 原有的其它景点必须保留（s2/s3 不丢）", () => {
  const ids = out.days.day1.spots.map((s) => s.id)
  assert.ok(ids.includes("s2") && ids.includes("s3"), `day1 spots 只剩 ${JSON.stringify(ids)}`)
})
check("patch 中同 id 条目覆盖旧条目（s1 更新为慢逛版）", () => {
  const s1 = out.days.day1.spots.find((s) => s.id === "s1")
  assert.equal(s1.name, "武康路梧桐街区慢逛")
  assert.ok(Array.isArray(s1.selectedActivities))
})
check("s1 原有顺序位保持在首位", () => {
  assert.equal(out.days.day1.spots[0].id, "s1")
})
check("未触碰的 day2 原样保留", () => {
  assert.deepEqual(out.days.day2, prev.days.day2)
})
check("day 级其它字段（label）不丢", () => {
  assert.equal(out.days.day1.label, "Day 1 · 法租界梧桐街区")
})

// ── 原有行为回归：只更新 day2 不影响 day1 ──
const out2 = mergeData(prev, { days: { day2: { label: "Day 2 · 新滨江", spots: prev.days.day2.spots } } })
check("只更新 day2 时 day1 完整保留", () => {
  assert.deepEqual(out2.days.day1, prev.days.day1)
  assert.equal(out2.days.day2.label, "Day 2 · 新滨江")
})

// ── 新增全新条目（patch 带旧 id + 新 id） ──
const out3 = mergeData(prev, {
  days: { day1: { spots: [{ id: "s9", name: "新增点", desc: "x" }] } },
})
check("patch 带全新 id 时追加，旧条目保留", () => {
  const ids = out3.days.day1.spots.map((s) => s.id)
  assert.deepEqual(ids, ["s1", "s2", "s3", "s9"])
})

// ── 非 days 字段浅合并不受影响 ──
check("顶层浅合并行为不变", () => {
  const o = mergeData({ a: 1, b: 2 }, { b: 3 })
  assert.deepEqual(o, { a: 1, b: 3 })
})

console.log(failed ? `\n${failed} failed` : "\nall passed")
process.exit(failed ? 1 : 0)
