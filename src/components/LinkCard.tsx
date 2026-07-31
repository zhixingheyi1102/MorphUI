import { useState, useEffect, useRef } from "react"
import { LinkSimple, PencilSimple } from "@phosphor-icons/react"

type Props = {
  data: {
    url: string
    title?: string
    note?: string
    description?: string
    image?: string
    // 已尝试抓取元数据（无论成败），避免重复请求
    fetched?: boolean
  }
  onInteract: (value?: string) => void
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

// 链接卡：粘贴/输入链接后生成。挂载时抓取网页元数据（首图 + 描述），
// 纯前端用 microlink 公共 API 绕过 CORS；抓不到则回退 favicon + 域名。
export default function LinkCard({ data, onInteract }: Props) {
  const host = hostOf(data.url)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(data.title ?? "")
  const [note, setNote] = useState(data.note ?? "")
  const [loading, setLoading] = useState(!data.fetched)
  const [imgError, setImgError] = useState(false)
  const requestedRef = useRef(false)

  // onInteract 每次渲染都是新引用；放进 ref 避免它触发抓取 effect 重跑
  const onInteractRef = useRef(onInteract)
  onInteractRef.current = onInteract

  useEffect(() => {
    setTitle(data.title ?? "")
    setNote(data.note ?? "")
  }, [data.title, data.note])

  // 抓取元数据：仅当尚未抓过时执行一次（依赖收窄，避免被父级重渲染打断）
  useEffect(() => {
    if (data.fetched || requestedRef.current) return
    requestedRef.current = true

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000) // 8s 兜底，避免永久转圈

    ;(async () => {
      const patch: Record<string, unknown> = { fetched: true }
      try {
        const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(data.url)}`, { signal: ctrl.signal })
        const json = await res.json()
        if (json.status === "success") {
          const d = json.data ?? {}
          if (d.title) patch.title = d.title
          if (d.description) patch.description = d.description
          if (d.image?.url) patch.image = d.image.url
        }
      } catch {
        /* 离线 / 超时 / 被拦 → 回退样式 */
      } finally {
        clearTimeout(timer)
        setLoading(false)
        onInteractRef.current(`edit:${JSON.stringify(patch)}`)
      }
    })()
  }, [data.url, data.fetched])

  const commit = () => {
    setEditing(false)
    onInteract(`edit:${JSON.stringify({ title, note })}`)
  }

  const displayTitle = data.title || title || host
  const showImage = data.image && !imgError

  return (
    <div
      className="w-72 shrink-0 overflow-hidden"
      style={{
        background: "var(--paper-cream)",
        border: "1px solid var(--ink-line)",
        borderRadius: "var(--r-sticker)",
        boxShadow: "var(--z1)",
        fontFamily: "var(--font-cn)",
        color: "var(--ink)",
      }}
    >
      {/* 首图 */}
      {showImage && (
        <a href={data.url} target="_blank" rel="noreferrer" className="block">
          <img
            src={data.image}
            alt={displayTitle}
            className="w-full block"
            style={{ height: 132, objectFit: "cover", borderBottom: "1px solid var(--ink-line)" }}
            onError={() => setImgError(true)}
          />
        </a>
      )}
      {/* 抓取中的图片骨架 */}
      {loading && !showImage && (
        <div className="w-full shimmer" style={{ height: 132, borderBottom: "1px solid var(--ink-line)" }} />
      )}

      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <img
            src={`https://www.google.com/s2/favicons?domain=${host}&sz=32`}
            alt=""
            className="w-4 h-4 shrink-0"
            style={{ borderRadius: 3 }}
            onError={(e) => { (e.currentTarget.style.display = "none") }}
          />
          <span style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)", fontFamily: "var(--font-en)" }}>{host}</span>
          <button
            onClick={() => (editing ? commit() : setEditing(true))}
            className="ml-auto opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: "var(--ink-soft)" }}
            title={editing ? "保存" : "编辑"}
          >
            <PencilSimple size={14} weight="fill" />
          </button>
        </div>

        {editing ? (
          <div className="space-y-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="标题"
              className="w-full px-2 py-1 focus:outline-none"
              style={{ fontSize: "var(--fs-data)", borderRadius: "var(--r-paper)", border: "1px solid var(--ink-line)", background: "rgba(255,255,255,0.5)", color: "var(--ink)" }}
            />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="备注…"
              rows={2}
              className="w-full px-2 py-1 resize-none focus:outline-none"
              style={{ fontSize: "var(--fs-caption)", borderRadius: "var(--r-paper)", border: "1px solid var(--ink-line)", background: "rgba(255,255,255,0.5)", color: "var(--ink-soft)" }}
            />
            <button
              onClick={commit}
              className="w-full py-1.5 transition-colors hover:brightness-105"
              style={{ fontSize: "var(--fs-caption)", borderRadius: "var(--r-paper)", background: "var(--paper-kraft)", border: "1px solid var(--ink)", color: "var(--ink)" }}
            >
              保存
            </button>
          </div>
        ) : (
          <>
            <h4 className="font-semibold mb-1 leading-snug line-clamp-2" style={{ fontSize: "var(--fs-data)", color: "var(--ink)" }}>{displayTitle}</h4>
            {/* 用户备注优先，否则显示抓到的描述（前两行） */}
            {data.note ? (
              <p className="leading-relaxed mb-1.5 line-clamp-2" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>{data.note}</p>
            ) : data.description ? (
              <p className="leading-relaxed mb-1.5 line-clamp-2" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>{data.description}</p>
            ) : loading ? (
              <p className="mb-1.5" style={{ fontSize: "var(--fs-caption)", color: "var(--ink-soft)" }}>读取链接信息…</p>
            ) : null}
            <a
              href={data.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
              style={{ fontSize: "var(--fs-caption)", color: "var(--ink-blue)" }}
            >
              <LinkSimple size={13} weight="bold" /> 打开链接
            </a>
          </>
        )}
      </div>
    </div>
  )
}
