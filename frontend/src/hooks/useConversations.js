import { useCallback, useEffect, useState } from 'react'
import { api } from '../utils/api.js'

/** Server-backed conversation state.
 *
 * Shape kept in memory:
 *   conversations: [{ id, title, model, system_prompt, temperature,
 *                     created_at, updated_at, message_count }]   (summary list)
 *   detail:        full ConversationDetail of the currently selected one,
 *                  including `messages: [{role, content, streaming?}]`
 */
export function useConversations({ enabled }) {
  const [conversations, setConversations] = useState([])
  const [currentId, setCurrentId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Load list whenever auth becomes available.
  useEffect(() => {
    if (!enabled) {
      setConversations([])
      setCurrentId(null)
      setDetail(null)
      return
    }
    let cancelled = false
    setLoadingList(true)
    ;(async () => {
      try {
        const list = await api('/api/conversations')
        if (cancelled) return
        setConversations(list || [])
        if (list && list.length > 0) {
          setCurrentId((id) => id || list[0].id)
        } else {
          // First login on a fresh account → create a starter conversation.
          const fresh = await api('/api/conversations', {
            method: 'POST',
            body: { title: 'Nouvelle conversation' },
          })
          if (!cancelled) {
            setConversations([summaryFromDetail(fresh)])
            setCurrentId(fresh.id)
            setDetail({ ...fresh, messages: fresh.messages || [] })
          }
        }
      } catch (e) {
        console.error('Failed to load conversations', e)
      } finally {
        if (!cancelled) setLoadingList(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled])

  // Load detail when currentId changes.
  useEffect(() => {
    if (!enabled || !currentId) {
      setDetail(null)
      return
    }
    let cancelled = false
    setLoadingDetail(true)
    ;(async () => {
      try {
        const d = await api(`/api/conversations/${currentId}`)
        if (!cancelled) setDetail({ ...d, messages: d.messages || [] })
      } catch (e) {
        console.error('Failed to load conversation', e)
      } finally {
        if (!cancelled) setLoadingDetail(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled, currentId])

  // ---------- mutations ----------
  const newConversation = useCallback(async () => {
    const fresh = await api('/api/conversations', {
      method: 'POST',
      body: { title: 'Nouvelle conversation' },
    })
    setConversations((list) => [summaryFromDetail(fresh), ...list])
    setCurrentId(fresh.id)
    setDetail({ ...fresh, messages: fresh.messages || [] })
    return fresh
  }, [])

  const deleteConversation = useCallback(
    async (id) => {
      await api(`/api/conversations/${id}`, { method: 'DELETE' })
      setConversations((list) => list.filter((c) => c.id !== id))
      if (id === currentId) {
        setCurrentId(null)
        setDetail(null)
      }
    },
    [currentId],
  )

  const renameConversation = useCallback(async (id, title) => {
    const updated = await api(`/api/conversations/${id}`, {
      method: 'PATCH',
      body: { title },
    })
    setConversations((list) =>
      list.map((c) => (c.id === id ? { ...c, ...updated } : c)),
    )
    setDetail((d) => (d && d.id === id ? { ...d, ...updated } : d))
  }, [])

  const updateCurrent = useCallback(
    async (patch) => {
      if (!currentId) return
      // Optimistic local update — nicer UX while the request flies.
      setDetail((d) => (d ? { ...d, ...patch } : d))
      try {
        const updated = await api(`/api/conversations/${currentId}`, {
          method: 'PATCH',
          body: patch,
        })
        setConversations((list) =>
          list.map((c) => (c.id === currentId ? { ...c, ...updated } : c)),
        )
        setDetail((d) =>
          d && d.id === currentId ? { ...d, ...updated } : d,
        )
      } catch (e) {
        console.error('Failed to update conversation', e)
      }
    },
    [currentId],
  )

  // ---------- in-flight chat helpers (no API calls — purely local UI) ----------
  /** Append the user message + an empty streaming assistant placeholder. */
  const appendUserAndPlaceholder = useCallback((content) => {
    setDetail((d) => {
      if (!d) return d
      const messages = [
        ...d.messages,
        { role: 'user', content },
        { role: 'assistant', content: '', streaming: true },
      ]
      return { ...d, messages }
    })
  }, [])

  /** Update the last assistant message during streaming. */
  const setAssistantStreaming = useCallback((text) => {
    setDetail((d) => {
      if (!d) return d
      const messages = [...d.messages]
      const last = messages[messages.length - 1]
      if (last && last.role === 'assistant' && last.streaming) {
        messages[messages.length - 1] = { ...last, content: text }
      } else {
        messages.push({ role: 'assistant', content: text, streaming: true })
      }
      return { ...d, messages }
    })
  }, [])

  const finalizeAssistant = useCallback(() => {
    setDetail((d) => {
      if (!d) return d
      const messages = d.messages.map((m) =>
        m.streaming ? { ...m, streaming: false } : m,
      )
      return { ...d, messages }
    })
    // Bump the conversation in the sidebar list.
    setConversations((list) => {
      if (!currentId) return list
      const idx = list.findIndex((c) => c.id === currentId)
      if (idx === -1) return list
      const updated = {
        ...list[idx],
        updated_at: new Date().toISOString(),
        message_count: (list[idx].message_count || 0) + 2,
      }
      return [updated, ...list.filter((_, i) => i !== idx)]
    })
  }, [currentId])

  /** Patch the local title (used after auto-titling on first user turn). */
  const setLocalTitle = useCallback((title) => {
    setDetail((d) => (d ? { ...d, title } : d))
    setConversations((list) =>
      list.map((c) => (c.id === currentId ? { ...c, title } : c)),
    )
  }, [currentId])

  return {
    conversations,
    currentId,
    setCurrentId,
    detail,
    loadingList,
    loadingDetail,
    newConversation,
    deleteConversation,
    renameConversation,
    updateCurrent,
    appendUserAndPlaceholder,
    setAssistantStreaming,
    finalizeAssistant,
    setLocalTitle,
  }
}

function summaryFromDetail(d) {
  return {
    id: d.id,
    title: d.title,
    model: d.model,
    system_prompt: d.system_prompt,
    temperature: d.temperature,
    created_at: d.created_at,
    updated_at: d.updated_at,
    message_count: (d.messages || []).length,
  }
}
