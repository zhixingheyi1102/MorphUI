import { useState, useEffect, useRef } from "react"
import { NoteBlank } from "@phosphor-icons/react"

type Props = {
  data: { text?: string }
  onInteract: (value?: string) => void
}

// 便签：用户在画布上粘贴/输入的纯文本，可随时双击编辑
export default function NoteCard({ data, onInteract }: Props) {
  const [editing, setEditing] = useState(!data.text)
  const [text, setText] = useState(data.text ?? "")
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setText(data.text ?? "")
  }, [data.text])

  useEffect(() => {
    if (editing) ref.current?.focus()
  }, [editing])

  const commit = () => {
    setEditing(false)
    if (text !== (data.text ?? "")) onInteract(`edit:${JSON.stringify({ text })}`)
  }

  return (
    <div
      className="p-4 w-64 shrink-0"
      style={{
        background: "var(--paper-manila)",
        border: "1px solid var(--ink-line)",
        borderRadius: "var(--r-sticker)",
        boxShadow: "var(--z1)",
        fontFamily: "var(--font-cn)",
        color: "var(--ink)",
      }}
    >
      <div className="flex items-center gap-1.5 mb-2" style={{ color: "var(--ink-soft)", fontSize: "var(--fs-caption)" }}>
        <NoteBlank size={14} weight="fill" /> 便签
      </div>
      {editing ? (
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit()
          }}
          rows={4}
          placeholder="写点什么…（⌘/Ctrl+Enter 保存）"
          className="w-full resize-none focus:outline-none leading-relaxed"
          style={{
            fontSize: "var(--fs-data)",
            background: "transparent",
            color: "var(--ink)",
          }}
        />
      ) : (
        <p
          onDoubleClick={() => setEditing(true)}
          className="whitespace-pre-line leading-relaxed cursor-text min-h-[1.5em]"
          style={{ fontSize: "var(--fs-data)", color: "var(--ink)" }}
        >
          {text || <span style={{ color: "var(--ink-soft)" }}>双击编辑…</span>}
        </p>
      )}
    </div>
  )
}
