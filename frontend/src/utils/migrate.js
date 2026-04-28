// One-shot migration: push old localStorage conversations into the
// authenticated user's account, then clear the local copy.
//
// We mark the migration as "done" per user so we never re-import twice
// for the same account on the same device.

import { api } from './api.js'

const LEGACY_KEY = 'chatbot.conversations.v1'
const FLAG_KEY = (userId) => `chatbot.migrated.v1.${userId}`

export function hasLegacyConversations() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return false
    const list = JSON.parse(raw)
    return Array.isArray(list) && list.length > 0
  } catch {
    return false
  }
}

export function migrationDoneFor(userId) {
  try {
    return localStorage.getItem(FLAG_KEY(userId)) === '1'
  } catch {
    return true
  }
}

export async function migrateLegacyConversations(userId) {
  let raw
  try {
    raw = localStorage.getItem(LEGACY_KEY)
  } catch {
    return { imported: 0, skipped: true }
  }
  if (!raw) return { imported: 0, skipped: true }

  let list
  try {
    list = JSON.parse(raw)
  } catch {
    return { imported: 0, skipped: true }
  }
  if (!Array.isArray(list) || list.length === 0) return { imported: 0, skipped: true }

  // Map old localStorage shape -> import API shape.
  const conversations = list.map((c) => ({
    title: c.title || 'Conversation importée',
    model: c.model || 'openai/gpt-4o-mini',
    system_prompt: c.systemPrompt || c.system_prompt || null,
    temperature: c.temperature ?? 0.7,
    messages: (c.messages || [])
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant' || m.role === 'system'))
      .map((m) => ({ role: m.role, content: m.content || '' }))
      .filter((m) => m.content),
  }))

  const result = await api('/api/conversations/import', {
    method: 'POST',
    body: { conversations },
  })

  // Clean up: keep the flag, drop the legacy key.
  try {
    localStorage.removeItem(LEGACY_KEY)
    localStorage.setItem(FLAG_KEY(userId), '1')
  } catch {
    /* ignore */
  }
  return { imported: result?.imported ?? conversations.length, skipped: false }
}
