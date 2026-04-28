import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark'
  return (
    <button
      onClick={onToggle}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      className="ring-focus inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
