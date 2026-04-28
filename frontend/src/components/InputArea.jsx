import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Square } from 'lucide-react'

const MAX_HEIGHT = 220

export default function InputArea({
  onSend,
  onStop,
  streaming,
  disabled,
  placeholder = 'Envoyer un message…',
}) {
  const [value, setValue] = useState('')
  const taRef = useRef(null)

  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, MAX_HEIGHT) + 'px'
  }, [value])

  const submit = () => {
    const text = value.trim()
    if (!text || disabled || streaming) return
    onSend(text)
    setValue('')
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  const canSend = value.trim().length > 0 && !disabled

  return (
    <div className="relative z-10 px-3 pb-4 pt-2 md:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="glass flex items-end gap-2 rounded-2xl px-2 py-2 shadow-soft transition-all duration-200 focus-within:border-violet-400/35 focus-within:shadow-glow">
          <textarea
            ref={taRef}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2 text-[15px] text-slate-100 placeholder:text-slate-500 focus:outline-none disabled:opacity-40"
          />

          {streaming ? (
            <button
              onClick={onStop}
              aria-label="Arrêter la génération"
              title="Arrêter la génération"
              className="mb-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/15 text-red-300 transition hover:bg-red-500/25 hover:text-red-200"
            >
              <Square size={15} />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!canSend}
              aria-label="Envoyer le message"
              title="Envoyer (Entrée)"
              className={`btn-gradient mb-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-white transition-all duration-200 ${
                canSend ? 'opacity-100' : 'opacity-30 cursor-not-allowed'
              }`}
            >
              <ArrowUp size={17} strokeWidth={2.5} />
            </button>
          )}
        </div>

        <p className="mt-1.5 text-center text-[11px] text-slate-600">
          <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-[10px]">↵</kbd>
          {' '}envoyer ·{' '}
          <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-[10px]">⇧↵</kbd>
          {' '}nouvelle ligne
        </p>
      </div>
    </div>
  )
}
