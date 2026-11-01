import { Copy, Download } from 'lucide-react'

interface Props {
  markdown: string
  filename: string
  copied: boolean
  onCopy: () => void
  onDownload: () => void
}

export function MarkdownView({ markdown, filename, copied, onCopy, onDownload }: Props) {
  return (
    <section className="markdown-view" aria-label="MADR Markdown 预览">
      <header>
        <div>
          <p className="eyebrow">MADR 4.0 compatible</p>
          <h2>{filename}</h2>
        </div>
        <div className="button-pair">
          <button className="secondary-action" type="button" onClick={onCopy}>
            <Copy size={16} /> {copied ? '已复制' : '复制'}
          </button>
          <button className="primary-action" type="button" onClick={onDownload}>
            <Download size={16} /> 下载 .md
          </button>
        </div>
      </header>
      <pre tabIndex={0} role="group" aria-label="MADR Markdown 内容"><code>{markdown}</code></pre>
    </section>
  )
}
