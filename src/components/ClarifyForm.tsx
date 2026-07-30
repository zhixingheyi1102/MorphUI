import { useState } from "react"

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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-80 shrink-0">
      <h3 className="text-lg font-semibold text-gray-900 mb-5">{data.title}</h3>

      <div className="space-y-5">
        {allQuestions.map((q, qi) => (
          <div
            key={q.id}
            className="animate-fadeIn"
            style={{ animationDelay: `${qi * 80}ms` }}
          >
            <p className="text-sm font-medium text-gray-700 mb-2">{q.label}</p>
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleSelect(q.id, opt)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    answers[q.id] === opt
                      ? "bg-indigo-500 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onInteract}
        disabled={!allAnswered}
        className={`mt-6 w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
          allAnswered
            ? "bg-indigo-500 text-white hover:bg-indigo-600 shadow-sm"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        确认，开始规划 ✨
      </button>
    </div>
  )
}
