import { useRef, useState } from 'react'
import { Bot, Copy, Check, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

function CodeBlock({ children, className }) {
  const [copied, setCopied] = useState(false)
  const preRef = useRef(null)

  const langMatch = (className || '').match(/language-(\S+)/)
  const lang = langMatch ? langMatch[1] : 'code'

  const copy = async () => {
    const text = preRef.current?.querySelector('code')?.textContent || ''
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="code-block my-3 overflow-hidden rounded-xl border border-white/7">
      <div className="flex items-center justify-between border-b border-white/7 bg-white/[0.04] px-4 py-1.5">
        <span className="font-mono text-[11px] font-medium tracking-wider text-slate-400">
          {lang}
        </span>
        <button
          onClick={copy}
          aria-label={copied ? 'Code copié' : 'Copier le code'}
          className="flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copié !' : 'Copier'}
        </button>
      </div>
      <pre ref={preRef} className="!m-0 !rounded-none !border-0">
        {children}
      </pre>
    </div>
  )
}

export default function MessageBubble({ message }) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <div
      className={`group flex gap-3 px-4 py-4 animate-slide-up md:px-8 ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {!isUser && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 shadow-glow">
          <Bot size={16} className="text-white" />
        </div>
      )}

      <div
        className={`relative max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-soft md:max-w-[75%] ${
          isUser
            ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white'
            : 'glass text-slate-100'
        }`}
      >
        <div className="prose-chat">
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                pre: ({ children, ...props }) => {
                  const codeChild = Array.isArray(children) ? children[0] : children
                  const className = codeChild?.props?.className || ''
                  return <CodeBlock className={className}>{children}</CodeBlock>
                },
                a: ({ node, ...props }) => (
                  <a {...props} target="_blank" rel="noreferrer" />
                ),
              }}
            >
              {message.content || ''}
            </ReactMarkdown>
          )}
          {message.streaming && (
            <span className="ml-1 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-accent-violet" />
          )}
        </div>

        {message.content && (
          <button
            onClick={onCopy}
            aria-label={copied ? 'Message copié' : 'Copier le message'}
            title="Copier le message"
            className={`absolute -top-2 ${
              isUser ? '-left-2' : '-right-2'
            } flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-ink-800 text-slate-300 opacity-0 shadow-soft transition group-hover:opacity-100 hover:text-white`}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        )}
      </div>

      {isUser && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-slate-200">
          <User size={16} />
        </div>
      )}
    </div>
  )
}
