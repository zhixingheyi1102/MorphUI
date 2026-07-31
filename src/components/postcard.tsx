import type { CSSProperties } from "react"

// ═══════════════════════════════════════════════
//  明信片共享件：齿孔边框 + 邮戳（PoiPanel / POICard 共用）
// ═══════════════════════════════════════════════

// 邮票齿孔边框：四边打孔，孔色 = 所在纸面颜色（视觉上像撕下来的邮票）
// r = 孔半径；padding 需 ≥ r*2 + 3 才不会切到内容
export function perfStyle(holeColor: string, r: number): CSSProperties {
  const tile = r * 4 // 孔间距
  const strip = r * 2 // 边缘条带厚度
  const g = (cx: number, cy: number) =>
    `radial-gradient(circle at ${cx}px ${cy}px, ${holeColor} ${r}px, transparent ${r + 0.5}px)`
  return {
    backgroundColor: "#FCFAF2",
    backgroundImage: [g(tile / 2, 0), g(tile / 2, strip), g(0, tile / 2), g(strip, tile / 2)].join(", "),
    backgroundSize: `${tile}px ${strip}px, ${tile}px ${strip}px, ${strip}px ${tile}px, ${strip}px ${tile}px`,
    backgroundPosition: "0 0, 0 100%, 0 0, 100% 0",
    backgroundRepeat: "repeat-x, repeat-x, repeat-y, repeat-y",
  }
}

// 圆形邮戳 + 波浪取消线（墨色 = 复古海军蓝）
export function Postmark() {
  const ink = "var(--ink-blue)"
  return (
    <svg width="98" height="56" viewBox="0 0 98 56" fill="none">
      <g stroke={ink} opacity="0.5" fill="none">
        <circle cx="70" cy="28" r="25" strokeWidth="1.4" />
        <circle cx="70" cy="28" r="19" strokeWidth="0.9" />
        <path d="M2 14 c5 -4 10 4 15 0 s10 4 15 0 s10 4 14 0" strokeWidth="1.1" />
        <path d="M2 28 c5 -4 10 4 15 0 s10 4 15 0 s10 4 14 0" strokeWidth="1.1" />
        <path d="M2 42 c5 -4 10 4 15 0 s10 4 15 0 s10 4 14 0" strokeWidth="1.1" />
      </g>
      <text x="70" y="25" textAnchor="middle" fontSize="6.5" letterSpacing="1.2" fill={ink} opacity="0.62" fontFamily="var(--font-en)">SHANGHAI</text>
      <line x1="58" y1="29.5" x2="82" y2="29.5" stroke={ink} strokeWidth="0.6" opacity="0.5" />
      <text x="70" y="38" textAnchor="middle" fontSize="6" letterSpacing="0.8" fill={ink} opacity="0.62" fontFamily="var(--font-en)">CITY WALK</text>
    </svg>
  )
}
