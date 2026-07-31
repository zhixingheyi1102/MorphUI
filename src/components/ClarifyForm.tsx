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

  return (
    <div
      className="w-80 shrink-0 overflow-hidden"
      style={{
        background: "var(--paper-cream)",
        border: "1px solid var(--ink-line)",
        borderRadius: "var(--r-sticker)",
        boxShadow: "var(--z1)",
        fontFamily: "var(--font-cn)",
        color: "var(--ink)",
      }}
    >
      {/* kraft 头部 */}
      <div
        className="px-6 py-4"
        style={{
          background: "var(--paper-kraft)",
          borderBottom: "1px solid var(--ink-line)",
        }}
      >
        <h3 className="font-semibold" style={{ fontSize: "var(--fs-sub)", color: "var(--ink)" }}>
          {data.title}
        </h3>
      </div>

      <div className="p-6 space-y-5">
        {allQuestions.map((q, qi) => (
          <div
            key={q.id}
            className="animate-fadeIn"
            style={{ animationDelay: `${qi * 80}ms` }}
          >
            <p className="mb-2 font-medium" style={{ fontSize: "var(--fs-data)", color: "var(--ink-soft)" }}>
              {q.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt) => {
                const selected = answers[q.id] === opt
                return (
                  <button
                    key={opt}
                    onClick={() => handleSelect(q.id, opt)}
                    className="px-3 py-1.5 transition-all"
                    style={{
                      fontSize: "var(--fs-data)",
                      borderRadius: "var(--r-sticker)",
                      border: `1px solid ${selected ? "var(--ink-blue)" : "var(--ink-line)"}`,
                      background: selected ? "var(--paper-blue)" : "transparent",
                      color: selected ? "var(--ink-blue)" : "var(--ink-soft)",
                      fontWeight: selected ? 600 : 400,
                    }}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <button
          onClick={handleConfirm}
          disabled={!allAnswered || confirmed}
          className="w-full py-2.5 font-medium transition-all"
          style={{
            fontSize: "var(--fs-data)",
            borderRadius: "var(--r-sticker)",
            background: confirmed
              ? "transparent"
              : allAnswered
                ? "var(--stamp-red)"
                : "transparent",
            color: confirmed
              ? "var(--postmark)"
              : allAnswered
                ? "var(--paper-cream)"
                : "var(--ink-line)",
            border: `1px solid ${
              confirmed ? "var(--ink-line)" : allAnswered ? "var(--stamp-red)" : "var(--ink-line)"
            }`,
            cursor: !allAnswered || confirmed ? "default" : "pointer",
          }}
        >
          {confirmed ? "已确认 ✓" : "确认，开始规划"}
        </button>
      </div>
    </div>
  )
}
