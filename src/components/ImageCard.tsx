import { useState, useEffect } from "react"

type Props = {
  data: { src: string; caption?: string }
  onInteract: (value?: string) => void
}

// 图片卡：画布上粘贴/拖入的图片（存为 dataURL），标题可编辑
export default function ImageCard({ data, onInteract }: Props) {
  const [editing, setEditing] = useState(false)
  const [caption, setCaption] = useState(data.caption ?? "")

  useEffect(() => {
    setCaption(data.caption ?? "")
  }, [data.caption])

  const commit = () => {
    setEditing(false)
    if (caption !== (data.caption ?? "")) onInteract(`edit:${JSON.stringify({ caption })}`)
  }

  return (
    <div
      className="w-64 shrink-0 overflow-hidden"
      style={{
        background: "var(--paper-cream)",
        border: "1px solid var(--ink-line)",
        borderRadius: "var(--r-sticker)",
        boxShadow: "var(--z1)",
        fontFamily: "var(--font-cn)",
        color: "var(--ink)",
      }}
    >
      <img src={data.src} alt={caption} className="w-full block" style={{ maxHeight: 320, objectFit: "cover" }} />
      <div className="px-3 py-2">
        {editing ? (
          <input
            autoFocus
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") commit() }}
            placeholder="添加说明…"
            className="w-full px-1 py-0.5 focus:outline-none"
            style={{ fontSize: "var(--fs-caption)", background: "transparent", color: "var(--ink)" }}
          />
        ) : (
          <p
            onDoubleClick={() => setEditing(true)}
            className="cursor-text leading-snug"
            style={{ fontSize: "var(--fs-caption)", color: caption ? "var(--ink-soft)" : "var(--ink-line)" }}
          >
            {caption || "双击添加说明…"}
          </p>
        )}
      </div>
    </div>
  )
}
