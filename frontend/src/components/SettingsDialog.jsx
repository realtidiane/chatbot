import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export default function SettingsDialog({
  open,
  onClose,
  systemPrompt,
  onChangeSystemPrompt,
  temperature,
  onChangeTemperature,
}) {
  const [draft, setDraft] = useState(systemPrompt || '')
  const [temp, setTemp] = useState(temperature ?? 0.7)

  useEffect(() => {
    if (open) {
      setDraft(systemPrompt || '')
      setTemp(temperature ?? 0.7)
    }
  }, [open, systemPrompt, temperature])

  if (!open) return null

  const save = () => {
    onChangeSystemPrompt(draft)
    onChangeTemperature(temp)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="glass-card relative z-10 w-full max-w-lg overflow-hidden rounded-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-100">
            Paramètres de la conversation
          </h2>
          <button
            onClick={onClose}
            className="ring-focus inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-5 px-5 py-5">
          <div>
            <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-300">
              <span>System prompt</span>
              <span className="text-[10px] text-slate-500">
                Optionnel — guide le ton et le rôle
              </span>
            </label>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Tu es un assistant utile, précis et concis…"
              className="input-premium h-28 w-full resize-none px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-300">
              <span>Température</span>
              <span className="font-mono text-slate-400">{temp.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={temp}
              onChange={(e) => setTemp(parseFloat(e.target.value))}
              className="w-full accent-violet-500"
            />
            <div className="mt-1 flex justify-between text-[10px] text-slate-500">
              <span>Précis</span>
              <span>Créatif</span>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-white/5 px-5 py-3">
          <button
            onClick={onClose}
            className="ring-focus rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/10"
          >
            Annuler
          </button>
          <button
            onClick={save}
            className="btn-gradient ring-focus rounded-lg px-4 py-1.5 text-sm font-medium text-white"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}
