// 把 dist 产物合成单文件 HTML：内联 JS/CSS，public 资源（图片/字体）替换为 base64 data URI
// 用法：先 `VITE_API_BASE=... npx vite build`，再 `node scripts/build-singlefile.mjs`
// 中文字体使用 /tmp/chs-{Regular,Bold,ExBold}.woff2 的子集版本（由 fontTools 预生成）
import { readFileSync, writeFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

const dist = "dist"
let html = readFileSync(join(dist, "index.html"), "utf-8")
const jsFile = readdirSync(join(dist, "assets")).find((f) => f.endsWith(".js"))
const cssFile = readdirSync(join(dist, "assets")).find((f) => f.endsWith(".css"))
let js = readFileSync(join(dist, "assets", jsFile), "utf-8")
let css = readFileSync(join(dist, "assets", cssFile), "utf-8")

const b64 = (p, mime) => `data:${mime};base64,${readFileSync(p).toString("base64")}`

// 1) 图片：JS 里的 /buildings/*.png、/decors/*.png
for (const dir of ["buildings", "decors"]) {
  for (const f of readdirSync(join(dist, dir))) {
    js = js.replaceAll(`/${dir}/${f}`, b64(join(dist, dir, f), "image/png"))
  }
}

// 2) 字体：CSS 里的 /fonts/*.woff2（中文用子集版，英文用全量）
const fontSrc = {
  "ChillHuoSong-Regular.woff2": "/tmp/chs-Regular.woff2",
  "ChillHuoSong-Bold.woff2": "/tmp/chs-Bold.woff2",
  "ChillHuoSong-ExBold.woff2": "/tmp/chs-ExBold.woff2",
}
for (const f of readdirSync(join(dist, "fonts"))) {
  const src = fontSrc[f] ?? join(dist, "fonts", f)
  css = css.replaceAll(`/fonts/${f}`, b64(src, "font/woff2"))
}

// 3) favicon
html = html.replace('href="/favicon.svg"', `href="${b64(join(dist, "favicon.svg"), "image/svg+xml")}"`)

// 4) 内联 JS/CSS（转义闭合标签，防止 JS 字符串里的 </script> 截断文档）
js = js.replaceAll("</script>", "<\\/script>")
// 注意：replace 第二参必须用函数，否则内容里的 $& $' 等会被当作特殊替换模式
html = html
  .replace(/<script type="module"[^>]*><\/script>/, "")
  .replace(/<link rel="stylesheet"[^>]*>/, () => `<style>${css}</style>`)
  .replace("</body>", () => `<script type="module">${js}</script></body>`)

writeFileSync("dist/morphui-standalone.html", html)
console.log("dist/morphui-standalone.html", (html.length / 1024 / 1024).toFixed(1) + "MB")
