import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search, Sparkles } from 'lucide-react'

const POPULAR_PREFIXES = [
  'openai/',
  'anthropic/',
  'google/',
  'meta-llama/',
  'mistralai/',
  'deepseek/',
  'x-ai/',
]

export default function ModelSelector({ value, onChange, models = [], loading }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    let items = models
    if (q) {
      items = items.filter(
        (m) =>
          (m.id && m.id.toLowerCase().includes(q)) ||
          (m.name && m.name.toLowerCase().includes(q)),
      )
    }
    // Sort: popular providers first, then alpha by name.
    return [...items].sort((a, b) => {
      const ap = POPULAR_PREFIXES.findIndex((p) => a.id?.startsWith(p))
      const bp = POPULAR_PREFIXES.findIndex((p) => b.id?.startsWith(p))
      const aRank = ap === -1 ? 999 : ap
      const bRank = bp === -1 ? 999 : bp
      if (aRank !== bRank) return aRank - bRank
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [models, query])

  const selected = models.find((m) => m.id === value)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="ring-focus inline-flex max-w-[260px] items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-white/10"
      >
        <Sparkles size={14} className="text-accent-violet" />
        <span className="truncate">
          {selected?.name || value || 'Choisir un modèle'}
        </span>
        <ChevronDown
          size={14}
          className={`transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="surface absolute right-0 z-30 mt-2 w-[320px] overflow-hidden rounded-xl shadow-soft animate-fade-in">
          <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
            <Search size={14} className="text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un modèle…"
              className="ring-focus w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-500"
            />
          </div>
          <div className="max-h-[320px] overflow-y-auto py-1">
            {loading && (
              <div className="px-3 py-4 text-sm text-slate-400">
                Chargement des modèles…
              </div>
            )}
            {!loading && list.length === 0 && (
              <div className="px-3 py-4 text-sm text-slate-400">
                Aucun modèle trouvé.
              </div>
            )}
            {list.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  onChange(m.id)
                  setOpen(false)
                  setQuery('')
                }}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition hover:bg-white/5"
              >
                <Check
                  size={14}
                  className={`mt-1 flex-shrink-0 ${
                    m.id === value ? 'text-accent-violet' : 'opacity-0'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-slate-100">{m.name || m.id}</div>
                  <div className="truncate text-xs text-slate-500">{m.id}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
