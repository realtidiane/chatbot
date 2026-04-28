// Tiny localStorage helpers — keep one source of truth for keys/shape.

const KEY_CONVOS = 'chatbot.conversations.v1'
const KEY_SETTINGS = 'chatbot.settings.v1'

export function uid() {
  return (
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36).slice(-4)
  )
}

export function loadConversations() {
  try {
    const raw = localStorage.getItem(KEY_CONVOS)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveConversations(list) {
  try {
    localStorage.setItem(KEY_CONVOS, JSON.stringify(list))
  } catch {
    // quota exceeded — fail silently, the conversation still lives in memory
  }
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY_SETTINGS)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings))
  } catch {
    /* noop */
  }
}
