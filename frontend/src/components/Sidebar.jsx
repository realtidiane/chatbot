import { useMemo, useState } from 'react'
import {
  MessageSquarePlus,
  Trash2,
  Pencil,
  Check,
  X,
  Bot,
  LogOut,
  Search,
  User as UserIcon,
} from 'lucide-react'

function timeLabel(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  const today = new Date()
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' })
}

export default function Sidebar({
  conversations,
  currentId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  user,
  onLogout,
  open,
  onClose,
}) {
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q
      ? conversations.filter((c) => c.title.toLowerCase().includes(q))
      : conversations
  }, [conversations, search])

  return (
    <>
      {/* Backdrop on mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`glass fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/5 transition-transform md:static md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-2 px-4 pb-3 pt-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 shadow-glow">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gradient">Chatbot</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">
              Powered by OpenRouter
            </div>
          </div>
        </div>

        {/* New conversation */}
        <div className="px-3">
          <button
            onClick={() => {
              onNew()
              onClose?.()
            }}
            className="ring-focus group flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:border-violet-400/40 hover:bg-violet-500/10"
          >
            <MessageSquarePlus
              size={16}
              className="text-accent-violet transition group-hover:scale-110"
            />
            Nouvelle conversation
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pt-2">
          <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.04] px-2.5 py-1.5">
            <Search size={13} className="flex-shrink-0 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="w-full bg-transparent text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Effacer la recherche"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center text-slate-500 hover:text-slate-300"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="mt-2 flex-1 overflow-y-auto px-2 pb-2">
          <div className="px-2 pb-2 text-[10px] uppercase tracking-wider text-slate-500">
            {search ? `${filtered.length} résultat${filtered.length !== 1 ? 's' : ''}` : 'Historique'}
          </div>
          <div className="flex flex-col gap-0.5">
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-sm text-slate-500">
                {search ? 'Aucun résultat.' : 'Aucune conversation.'}
              </div>
            )}
            {filtered.map((c) => {
              const active = c.id === currentId
              const isEditing = editingId === c.id
              return (
                <div
                  key={c.id}
                  className={`group relative flex items-center rounded-lg px-2 py-2 text-sm transition ${
                    active
                      ? 'bg-gradient-to-r from-violet-500/15 to-cyan-500/10 text-slate-100'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {isEditing ? (
                    <div className="flex w-full items-center gap-1">
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            onRename(c.id, editValue.trim() || c.title)
                            setEditingId(null)
                          } else if (e.key === 'Escape') {
                            setEditingId(null)
                          }
                        }}
                        className="ring-focus min-w-0 flex-1 rounded bg-white/10 px-2 py-1 text-sm text-slate-100"
                      />
                      <button
                        onClick={() => {
                          onRename(c.id, editValue.trim() || c.title)
                          setEditingId(null)
                        }}
                        aria-label="Confirmer le renommage"
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-emerald-400 hover:bg-white/5"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        aria-label="Annuler le renommage"
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-slate-400 hover:bg-white/5"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          onSelect(c.id)
                          onClose?.()
                        }}
                        className="min-w-0 flex-1 truncate text-left"
                      >
                        <div className="truncate">{c.title}</div>
                        <div className="truncate text-[10px] text-slate-500">
                          {timeLabel(c.updated_at || c.updatedAt)} ·{' '}
                          {c.message_count ?? c.messages?.length ?? 0} msg
                        </div>
                      </button>
                      <div className="ml-1 hidden gap-0.5 group-hover:flex">
                        <button
                          onClick={() => {
                            setEditingId(c.id)
                            setEditValue(c.title)
                          }}
                          aria-label="Renommer la conversation"
                          title="Renommer"
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-slate-100"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Supprimer cette conversation ?')) {
                              onDelete(c.id)
                            }
                          }}
                          aria-label="Supprimer la conversation"
                          title="Supprimer"
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-slate-400 hover:bg-red-500/20 hover:text-red-300"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer — user pill + logout */}
        {user && (
          <div className="border-t border-white/5 px-3 py-3">
            <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-2 text-sm">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-white">
                <UserIcon size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-slate-200">
                  {user.name || user.email.split('@')[0]}
                </div>
                <div className="truncate text-[10px] text-slate-500">
                  {user.email}
                </div>
              </div>
              <button
                onClick={onLogout}
                aria-label="Se déconnecter"
                title="Se déconnecter"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-slate-400 hover:bg-red-500/20 hover:text-red-300"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
