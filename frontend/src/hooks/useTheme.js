import { useEffect, useState } from 'react'
import { loadSettings, saveSettings } from '../utils/storage.js'

const ROOT = () => document.documentElement

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const s = loadSettings()
    return s.theme === 'light' ? 'light' : 'dark'
  })

  useEffect(() => {
    const root = ROOT()
    if (theme === 'light') {
      root.classList.add('light')
      root.classList.remove('dark')
    } else {
      root.classList.add('dark')
      root.classList.remove('light')
    }
    const s = loadSettings()
    saveSettings({ ...s, theme })
  }, [theme])

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  return { theme, toggle }
}
