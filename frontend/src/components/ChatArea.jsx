import { useEffect, useRef } from 'react'
import { Sparkles, Code2, BookOpen, Lightbulb, Coffee } from 'lucide-react'
import MessageBubble from './MessageBubble.jsx'

const SUGGESTIONS = [
  { icon: Code2,     text: 'Explique la différence entre let, var et const en JS' },
  { icon: BookOpen,  text: 'Résume ce concept en termes simples : la blockchain' },
  { icon: Lightbulb, text: 'Donne-moi 5 idées de projets pour apprendre React' },
  { icon: Coffee,    text: 'Écris un poème court sur l\'intelligence artificielle' },
]

export default function ChatArea({ messages, streaming, error, onSuggest }) {
  const scrollRef    = useRef(null)
  const lastLenRef   = useRef(0)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const last   = messages[messages.length - 1]
    const length = (last?.content || '').length
    if (length !== lastLenRef.current) {
      lastLenRef.current = length
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, streaming])

  const empty = messages.length === 0

  return (
    <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto">
      {empty ? (
        <div className="flex h-full flex-col items-center justify-center px-6 text-center animate-fade-in">
          <div className="logo-glow mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-500">
            <Sparkles size={28} className="text-white" />
          </div>

          <h1 className="mb-2 text-2xl font-bold tracking-tight text-gradient md:text-3xl">
            Comment puis-je vous aider ?
          </h1>
          <p className="mb-8 max-w-sm text-sm leading-relaxed text-slate-400">
            Posez n'importe quelle question. Vos conversations sont
            sauvegardées sur votre compte.
          </p>

          <div className="grid w-full max-w-2xl grid-cols-1 gap-2.5 md:grid-cols-2">
            {SUGGESTIONS.map(({ icon: Icon, text }) => (
              <button
                key={text}
                onClick={() => onSuggest?.(text)}
                className="group flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-left text-sm text-slate-300 transition-all duration-200 hover:border-violet-400/30 hover:bg-violet-500/8 hover:text-white hover:shadow-glow"
              >
                <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 text-accent-violet transition group-hover:from-violet-500/30 group-hover:to-cyan-500/30">
                  <Icon size={14} />
                </div>
                <span className="leading-snug">{text}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-3xl py-2">
          {messages.map((m, i) => (
            <MessageBubble key={m.id || i} message={m} />
          ))}

          {streaming && !messages.some((m) => m.streaming && m.role === 'assistant') && (
            <div className="flex items-center gap-3 px-4 py-4 md:px-8 animate-fade-in">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 shadow-glow">
                <Sparkles size={14} className="text-white" />
              </div>
              <div className="dot-pulse">
                <span /><span /><span />
              </div>
            </div>
          )}

          {error && (
            <div className="mx-4 my-3 flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-sm text-red-300 md:mx-8">
              <span className="mt-0.5 text-red-400">⚠</span>
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
