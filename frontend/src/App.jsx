import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

import Sidebar from './components/Sidebar.jsx'
import Header from './components/Header.jsx'
import ChatArea from './components/ChatArea.jsx'
import InputArea from './components/InputArea.jsx'
import SettingsDialog from './components/SettingsDialog.jsx'
import AuthScreen from './components/AuthScreen.jsx'

import { useTheme } from './hooks/useTheme.js'
import { useAuth } from './hooks/useAuth.js'
import { useConversations } from './hooks/useConversations.js'
import { streamChat } from './utils/streaming.js'
import { api } from './utils/api.js'
import { loadSettings, saveSettings } from './utils/storage.js'
import {
  hasLegacyConversations,
  migrateLegacyConversations,
  migrationDoneFor,
} from './utils/migrate.js'

const DEFAULT_MODEL = 'openai/gpt-4o-mini'

const FALLBACK_MODELS = [
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o mini' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku' },
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (free)' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B Instruct' },
  { id: 'mistralai/mistral-large', name: 'Mistral Large' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat' },
]

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme()
  const { user, loading: authLoading, registrationEnabled, login, register, logout } =
    useAuth()

  if (authLoading) {
    return (
      <div className="bg-mesh flex h-full w-full items-center justify-center">
        <div className="relative z-10 flex items-center gap-2 text-slate-400">
          <Loader2 size={16} className="animate-spin" />
          Chargement…
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <AuthScreen
        onLogin={login}
        onRegister={register}
        registrationEnabled={registrationEnabled}
      />
    )
  }

  return (
    <Authenticated
      user={user}
      onLogout={logout}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  )
}

function Authenticated({ user, onLogout, theme, onToggleTheme }) {
  const initialModel = useMemo(() => {
    const s = loadSettings()
    return s.model || DEFAULT_MODEL
  }, [])
  const [selectedModel, setSelectedModel] = useState(initialModel)

  useEffect(() => {
    const s = loadSettings()
    saveSettings({ ...s, model: selectedModel })
  }, [selectedModel])

  const {
    conversations,
    currentId,
    setCurrentId,
    detail,
    newConversation,
    deleteConversation,
    renameConversation,
    updateCurrent,
    appendUserAndPlaceholder,
    setAssistantStreaming,
    finalizeAssistant,
  } = useConversations({ enabled: true })

  const [models, setModels] = useState(FALLBACK_MODELS)
  const [modelsLoading, setModelsLoading] = useState(true)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [migrationToast, setMigrationToast] = useState(null)
  const abortRef = useRef(null)

  // ----- Models list -----
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await api('/api/models')
        if (!cancelled && Array.isArray(data?.models) && data.models.length > 0) {
          setModels(data.models)
        }
      } catch {
        /* keep fallback */
      } finally {
        if (!cancelled) setModelsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // ----- One-shot migration of localStorage conversations -----
  useEffect(() => {
    if (!user) return
    if (migrationDoneFor(user.id)) return
    if (!hasLegacyConversations()) return
    let cancelled = false
    ;(async () => {
      try {
        const r = await migrateLegacyConversations(user.id)
        if (!cancelled && r.imported > 0) {
          setMigrationToast(
            `${r.imported} conversation${r.imported > 1 ? 's' : ''} importée${
              r.imported > 1 ? 's' : ''
            } depuis ce navigateur.`,
          )
          setTimeout(() => !cancelled && setMigrationToast(null), 5000)
          // Refresh the conversation list.
          try {
            const list = await api('/api/conversations')
            // We can't replace the hook's internal state from the outside,
            // so trigger a soft remount via location.reload — but only
            // once. Cleaner: tell the user to reload.
            // Instead we just reload, which is acceptable because this
            // happens at most once per account+device.
            if (!cancelled && list?.length) {
              window.location.reload()
            }
          } catch {
            /* ignore */
          }
        }
      } catch (e) {
        console.error('Migration failed', e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  // ----- Send a message -----
  const handleSend = useCallback(
    async (text) => {
      if (!detail) return
      setError(null)
      appendUserAndPlaceholder(text)

      const controller = new AbortController()
      abortRef.current = controller
      setStreaming(true)

      let acc = ''
      try {
        for await (const delta of streamChat({
          conversationId: detail.id,
          content: text,
          model: detail.model || selectedModel,
          systemPrompt: detail.system_prompt,
          temperature: detail.temperature ?? 0.7,
          signal: controller.signal,
        })) {
          acc += delta
          setAssistantStreaming(acc)
        }
      } catch (e) {
        if (e.name === 'AbortError') {
          // Keep partial content as final.
        } else {
          console.error(e)
          setError(
            e.message ||
              'Une erreur est survenue. Vérifiez la clé API et le backend.',
          )
        }
      } finally {
        finalizeAssistant()
        setStreaming(false)
        abortRef.current = null
      }
    },
    [
      detail,
      selectedModel,
      appendUserAndPlaceholder,
      setAssistantStreaming,
      finalizeAssistant,
    ],
  )

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const handleExport = useCallback(() => {
    if (!detail) return
    const md = exportToMarkdown(detail)
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug(detail.title)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [detail])

  const onSelectModel = useCallback(
    (id) => {
      setSelectedModel(id)
      if (detail) updateCurrent({ model: id })
    },
    [detail, updateCurrent],
  )

  const onChangeSystemPrompt = useCallback(
    (p) => updateCurrent({ system_prompt: p }),
    [updateCurrent],
  )
  const onChangeTemperature = useCallback(
    (t) => updateCurrent({ temperature: t }),
    [updateCurrent],
  )

  return (
    <div className="bg-mesh flex h-full w-full">
      <Sidebar
        conversations={conversations}
        currentId={currentId}
        onSelect={setCurrentId}
        onNew={newConversation}
        onDelete={deleteConversation}
        onRename={renameConversation}
        user={user}
        onLogout={onLogout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Header
          title={detail?.title}
          onOpenSidebar={() => setSidebarOpen(true)}
          models={models}
          modelsLoading={modelsLoading}
          selectedModel={detail?.model || selectedModel}
          onSelectModel={onSelectModel}
          theme={theme}
          onToggleTheme={onToggleTheme}
          onExport={handleExport}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <ChatArea
          messages={detail?.messages || []}
          streaming={streaming}
          error={error}
          onSuggest={handleSend}
        />

        <InputArea
          onSend={handleSend}
          onStop={handleStop}
          streaming={streaming}
          disabled={!detail}
        />
      </main>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        systemPrompt={detail?.system_prompt || ''}
        onChangeSystemPrompt={onChangeSystemPrompt}
        temperature={detail?.temperature ?? 0.7}
        onChangeTemperature={onChangeTemperature}
      />

      {migrationToast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="glass pointer-events-auto rounded-xl px-4 py-2.5 text-sm text-slate-100 shadow-glow animate-slide-up">
            {migrationToast}
          </div>
        </div>
      )}
    </div>
  )
}

function slug(s) {
  return (
    (s || 'conversation')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'conversation'
  )
}

function exportToMarkdown(c) {
  const lines = [
    `# ${c.title}`,
    '',
    `*Modèle : ${c.model || 'inconnu'}*  `,
    `*Exporté le ${new Date().toLocaleString()}*`,
    '',
  ]
  if (c.system_prompt) {
    lines.push('## System prompt', '', '```', c.system_prompt, '```', '')
  }
  for (const m of c.messages || []) {
    if (m.role === 'user') lines.push('### 👤 Vous', '', m.content, '')
    else if (m.role === 'assistant') lines.push('### 🤖 Assistant', '', m.content, '')
  }
  return lines.join('\n')
}
