// Async generator that yields content deltas from /api/chat (SSE).
// The backend persists both the user and the assistant messages,
// so the client only needs to display the deltas as they arrive.

import { getToken } from './api.js'

export async function* streamChat({
  conversationId,
  content,
  model,
  systemPrompt,
  temperature,
  signal,
}) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify({
      conversation_id: conversationId,
      content,
      model: model || null,
      system_prompt: systemPrompt ?? null,
      temperature: temperature ?? null,
    }),
  })

  if (!res.ok) {
    let detail = ''
    try {
      const j = await res.json()
      detail = j.detail || JSON.stringify(j)
    } catch {
      try {
        detail = await res.text()
      } catch {
        /* ignore */
      }
    }
    throw new Error(
      `API ${res.status}${detail ? ` — ${String(detail).slice(0, 300)}` : ''}`,
    )
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let sepIndex
    while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, sepIndex)
      buffer = buffer.slice(sepIndex + 2)
      const event = parseEvent(rawEvent)
      if (!event) continue
      if (event.type === 'error') throw new Error(event.data || 'Streaming error')
      if (event.data === '[DONE]') return
      try {
        const json = JSON.parse(event.data)
        const delta = json?.choices?.[0]?.delta?.content
        if (delta) yield delta
      } catch {
        /* keep-alive or non-JSON line */
      }
    }
  }
}

function parseEvent(raw) {
  let type = 'message'
  const dataLines = []
  for (const line of raw.split('\n')) {
    if (!line || line.startsWith(':')) continue
    if (line.startsWith('event:')) type = line.slice(6).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
  }
  if (!dataLines.length) return null
  return { type, data: dataLines.join('\n') }
}
