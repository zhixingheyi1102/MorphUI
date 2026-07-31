// 合并组件 data：默认浅合并，但对 days（行程按天）做深合并——
// 1) 天与天之间按 key 合并（只更新 day2 不覆盖 day1）
// 2) 同一天内部：day 级字段浅合并（label 等不丢），spots 按 id 合并——
//    patch 里同 id 条目覆盖旧条目，新 id 追加，patch 未提到的旧条目保留。
//    避免模型只回传增量 spot 时把该天其它景点整体覆盖丢失。
export type CompData = Record<string, unknown>

type DayData = Record<string, unknown> & { spots?: Array<Record<string, unknown>> }

function mergeSpots(
  prevSpots: Array<Record<string, unknown>>,
  patchSpots: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  const patchById = new Map(
    patchSpots.filter((s) => s.id != null).map((s) => [s.id as string, s])
  )
  // 旧条目保序：同 id 用 patch 版覆盖，其余保留
  const merged = prevSpots.map((s) =>
    s.id != null && patchById.has(s.id as string) ? patchById.get(s.id as string)! : s
  )
  const prevIds = new Set(prevSpots.map((s) => s.id))
  // patch 里的新条目（含无 id 条目）按 patch 顺序追加
  for (const s of patchSpots) {
    if (s.id == null || !prevIds.has(s.id)) merged.push(s)
  }
  return merged
}

function mergeDay(prevDay: unknown, patchDay: unknown): unknown {
  if (!prevDay || typeof prevDay !== "object" || !patchDay || typeof patchDay !== "object") {
    return patchDay
  }
  const p = prevDay as DayData
  const q = patchDay as DayData
  const merged: DayData = { ...p, ...q }
  if (Array.isArray(p.spots) && Array.isArray(q.spots)) {
    merged.spots = mergeSpots(p.spots, q.spots)
  }
  return merged
}

export function mergeData(prev: CompData, patch: CompData): CompData {
  const merged: CompData = { ...prev, ...patch }
  if (
    patch.days && typeof patch.days === "object" &&
    prev.days && typeof prev.days === "object"
  ) {
    const prevDays = prev.days as Record<string, unknown>
    const patchDays = patch.days as Record<string, unknown>
    const days: Record<string, unknown> = { ...prevDays }
    for (const key of Object.keys(patchDays)) {
      days[key] = mergeDay(prevDays[key], patchDays[key])
    }
    merged.days = days
  }
  return merged
}
