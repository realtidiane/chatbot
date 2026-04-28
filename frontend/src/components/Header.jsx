import { Menu, Download, Settings, Zap } from 'lucide-react'
import ModelSelector from './ModelSelector.jsx'
import ThemeToggle from './ThemeToggle.jsx'

export default function Header({
  title,
  onOpenSidebar,
  models,
  modelsLoading,
  selectedModel,
  onSelectModel,
  theme,
  onToggleTheme,
  onExport,
  onOpenSettings,
}) {
  return (
    <header className="glass relative z-20 flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2.5 md:px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          onClick={onOpenSidebar}
          aria-label="Ouvrir le menu"
          className="ring-focus inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-slate-200 md:hidden"
        >
          <Menu size={15} />
        </button>

        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-100">
            {title || 'Nouvelle conversation'}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <Zap size={10} className="text-accent-violet" />
            OpenRouter · streaming
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <ModelSelector
          value={selectedModel}
          onChange={onSelectModel}
          models={models}
          loading={modelsLoading}
        />

        <button
          onClick={onExport}
          aria-label="Exporter en Markdown"
          title="Exporter en Markdown"
          className="ring-focus inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
        >
          <Download size={15} />
        </button>

        <button
          onClick={onOpenSettings}
          aria-label="Paramètres"
          title="Paramètres"
          className="ring-focus inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
        >
          <Settings size={15} />
        </button>

        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  )
}
