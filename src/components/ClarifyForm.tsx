import { useState, useEffect } from "react"

type Question = {
  id: string
  label: string
  options: string[]
}

type FollowUp = {
  id: string
  label: string
  options: string[]
}

type Props = {
  data: {
    title: string
    questions: Question[]
    followUps?: Record<string, Record<string, FollowUp>>
  }
  onInteract: () => void
}

export default function ClarifyForm({ data, onInteract }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [dynamicQuestions, setDynamicQuestions] = useState<Question[]>([])
  const [confirmed, setConfirmed] = useState(false)

  // 表单被更新（新增/替换问题）时，解锁按钮让用户能重新提交
  const questionSig = data.questions.map((q) => q.id).join(",")
  useEffect(() => {
    setConfirmed(false)
  }, [questionSig])

  const handleConfirm = () => {
    if (confirmed) return
    setConfirmed(true)
    onInteract()
  }

  const handleSelect = (questionId: string, option: string) => {
    if (confirmed) return
    setAnswers((prev) => ({ ...prev, [questionId]: option }))

    // 检查是否有动态追问
    const followUps = data.followUps?.[questionId]
    if (followUps?.[option]) {
      const fq = followUps[option]
      // 避免重复添加
      setDynamicQuestions((prev) => {
        if (prev.some((q) => q.id === fq.id)) return prev
        return [...prev, fq]
      })
    }
  }

  const allQuestions = [...data.questions, ...dynamicQuestions]
  const allAnswered = allQuestions.every((q) => answers[q.id])

  const today = new Date()
  const dateStr = `${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}.${today.getFullYear()}`

  return (
    <div className="w-80 shrink-0 relative" style={{ filter: "drop-shadow(0 2px 3px rgba(24,20,14,0.25)) drop-shadow(0 8px 16px rgba(24,20,14,0.16))" }}>
      {/* 金属夹：压在卡片顶部中间，探出上缘 */}
      <img
        src="/decors/clip-silver.png"
        alt=""
        className="absolute pointer-events-none select-none z-10"
        style={{ width: 92, left: "50%", top: -50, transform: "translateX(-50%) rotate(-1.5deg)" }}
      />

      <div
        className="intake-paper overflow-hidden"
        style={{
          border: "1.5px solid color-mix(in srgb, var(--ink-blue) 55%, transparent)",
          borderRadius: "var(--r-paper)",
          color: "var(--ink)",
        }}
      >
        {/* 票头：印刷表头 */}
        <div
          className="px-5 pt-5 pb-3 text-center"
          style={{ borderBottom: "1.5px solid color-mix(in srgb, var(--ink-blue) 55%, transparent)" }}
        >
          <div style={{ fontFamily: "var(--font-en)", fontSize: 10, letterSpacing: "0.28em", color: "var(--ink-blue)" }}>
            TRAVELER INTAKE FORM
          </div>
          <div style={{ fontFamily: "var(--font-cn)", fontSize: "var(--fs-sub)", fontWeight: 800, marginTop: 2 }}>
            {data.title}
          </div>
          <div className="flex justify-between mt-2" style={{ fontFamily: "var(--font-en)", fontSize: 9, color: "var(--postmark)", letterSpacing: "0.1em" }}>
            <span>FILE NO. 0042</span>
            <span>DATE {dateStr}</span>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {allQuestions.map((q, qi) => (
            <div key={q.id} className="animate-fadeIn" style={{ animationDelay: `${qi * 80}ms` }}>
              {/* 字段名：印刷体 + 编号 */}
              <div className="flex items-baseline gap-2 mb-1.5">
                <span style={{ fontFamily: "var(--font-en)", fontSize: 10, color: "var(--ink-blue)", fontWeight: 700 }}>
                  {String(qi + 1).padStart(2, "0")}.
                </span>
                <span style={{ fontFamily: "var(--font-cn)", fontSize: "var(--fs-data)", fontWeight: 700, color: "var(--ink)" }}>
                  {q.label}
                </span>
              </div>
              {/* 勾选框选项：两列表格式 */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 pl-5">
                {q.options.map((opt) => {
                  const selected = answers[q.id] === opt
                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelect(q.id, opt)}
                      className="flex items-center gap-1.5 text-left py-0.5"
                      style={{ cursor: confirmed ? "default" : "pointer", background: "none", border: "none" }}
                    >
                      {/* 勾选框 */}
                      <span
                        className="shrink-0 flex items-center justify-center"
                        style={{
                          width: 14, height: 14,
                          border: `1.5px solid ${selected ? "var(--ink-blue)" : "color-mix(in srgb, var(--ink) 40%, transparent)"}`,
                          background: "transparent",
                        }}
                      >
                        {selected && (
                          <svg viewBox="0 0 14 14" width="16" height="16" style={{ overflow: "visible", marginTop: -3 }}>
                            <path className="intake-check" d="M2.5 7.5 L5.5 10.5 L12 2" />
                          </svg>
                        )}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-cn)",
                          fontSize: "var(--fs-data)",
                          color: selected ? "var(--ink-blue)" : "var(--ink-soft)",
                          fontWeight: selected ? 700 : 400,
                        }}
                      >
                        {opt}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* 确认区：订货单式提交条 */}
          <div className="pt-1">
            {confirmed ? (
              /* 已提交：一行归档记录，带手写勾 */
              <div
                className="flex items-center justify-center gap-2 py-2"
                style={{
                  borderTop: "1.5px solid color-mix(in srgb, var(--ink-blue) 45%, transparent)",
                }}
              >
                <svg viewBox="0 0 14 14" width="16" height="16" style={{ overflow: "visible" }}>
                  <path className="intake-check" d="M2.5 7.5 L5.5 10.5 L12 2" />
                </svg>
                <span style={{ fontFamily: "var(--font-cn)", fontSize: "var(--fs-data)", fontWeight: 700, color: "var(--ink-blue)" }}>
                  已提交
                </span>
                <span style={{ fontFamily: "var(--font-en)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-blue)" }}>
                  FILED
                </span>
              </div>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={!allAnswered}
                className="w-full py-2 transition-all"
                style={{
                  fontFamily: "var(--font-cn)",
                  fontSize: "var(--fs-data)",
                  fontWeight: 700,
                  letterSpacing: "0.3em",
                  color: allAnswered ? "var(--paper-cream)" : "var(--postmark)",
                  background: allAnswered ? "var(--ink-blue)" : "transparent",
                  border: allAnswered
                    ? "1.5px solid var(--ink-blue)"
                    : "1.5px dashed var(--ink-line)",
                  borderRadius: 2,
                  cursor: allAnswered ? "pointer" : "default",
                  boxShadow: allAnswered ? "0 2px 0 color-mix(in srgb, var(--ink-blue) 45%, transparent)" : "none",
                }}
              >
                确认提交
                <span style={{ fontFamily: "var(--font-en)", fontSize: 10, letterSpacing: "0.22em", marginLeft: 10 }}>
                  SUBMIT
                </span>
              </button>
            )}
          </div>
        </div>

        {/* 底部 metadata */}
        <div
          className="px-5 py-2 flex justify-between"
          style={{
            borderTop: "1px dashed color-mix(in srgb, var(--ink-blue) 40%, transparent)",
            fontFamily: "var(--font-en)", fontSize: 8.5, color: "var(--postmark)", letterSpacing: "0.14em",
          }}
        >
          <span>MORPH TRAVEL CO.</span>
          <span>FORM-08 / ARCHIVE</span>
        </div>
      </div>
    </div>
  )
}
