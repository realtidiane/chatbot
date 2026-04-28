// Tiny fetch wrapper that automatically attaches the bearer token and
// surfaces error responses as thrown Errors.

const TOKEN_KEY = 'chatbot.token.v1'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || null
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* noop */
  }
}

export function clearToken() {
  setToken(null)
}

class HttpError extends Error {
  constructor(message, status, body) {
    super(message)
    this.status = status
    this.body = body
  }
}

// ── Demo mode (visual preview without backend) ──────────────────────────────
const DEMO_CONVERSATIONS = [
  { id: 'demo1', title: 'Comment fonctionne React ?', model: 'openai/gpt-4o-mini', message_count: 2, temperature: 0.7, system_prompt: null, updated_at: new Date().toISOString(), created_at: new Date().toISOString() },
  { id: 'demo2', title: 'Explique-moi la blockchain', model: 'anthropic/claude-3.5-sonnet', message_count: 6, temperature: 0.7, system_prompt: null, updated_at: new Date(Date.now()-3600000).toISOString(), created_at: new Date(Date.now()-3600000).toISOString() },
  { id: 'demo3', title: 'Idées de projets Python', model: 'google/gemini-2.0-flash-exp:free', message_count: 8, temperature: 0.9, system_prompt: null, updated_at: new Date(Date.now()-86400000).toISOString(), created_at: new Date(Date.now()-86400000).toISOString() },
]
const DEMO_DETAIL = {
  ...DEMO_CONVERSATIONS[0],
  messages: [
    { id: 1, role: 'user',      content: 'Comment fonctionne React ?' },
    { id: 2, role: 'assistant', content: 'React est une bibliothèque JavaScript pour construire des interfaces utilisateur.\n\n## Concepts clés\n\n- **Composants** : blocs réutilisables qui encapsulent UI + logique\n- **JSX** : syntaxe proche du HTML compilée en JS\n- **State** : données locales réactives d\'un composant\n- **Props** : données passées du parent vers l\'enfant\n\n```jsx\nfunction Greeting({ name }) {\n  const [count, setCount] = useState(0);\n  return (\n    <div>\n      <h1>Bonjour {name} !</h1>\n      <button onClick={() => setCount(c => c + 1)}>\n        Clics : {count}\n      </button>\n    </div>\n  );\n}\n```\n\nLe principe fondamental est la **réactivité** : quand le state change, l\'UI se met à jour automatiquement et efficacement grâce au Virtual DOM.' },
  ],
}

function _demoResponse(path, method) {
  if (path.includes('/api/auth/config'))  return { registration_enabled: true }
  if (path.includes('/api/auth/me'))      return { id: 1, email: 'demo@example.com', name: 'Demo User' }
  if (path.includes('/api/models'))       return { models: [{ id: 'openai/gpt-4o-mini', name: 'GPT-4o mini', context_length: 128000 }, { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', context_length: 200000 }, { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (free)', context_length: 1000000 }] }
  if (path.match(/\/api\/conversations\/demo\d+$/) && method === 'GET') return { ...DEMO_DETAIL, id: path.split('/').pop() }
  if (path.includes('/api/conversations') && method === 'GET') return DEMO_CONVERSATIONS
  if (path.includes('/api/conversations') && method === 'POST') return { ...DEMO_DETAIL, id: 'demo-new', title: 'Nouvelle conversation', messages: [] }
  return null
}

export async function api(path, { method = 'GET', body, signal, raw } = {}) {
  if (localStorage.getItem('__DEMO_MODE__') === '1') {
    const mock = _demoResponse(path, method)
    if (mock !== null) return mock
  }
  const headers = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(path, {
    method,
    headers,
    signal,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (raw) return res

  if (!res.ok) {
    let detail = res.statusText
    try {
      const data = await res.json()
      detail = data.detail || JSON.stringify(data)
    } catch {
      try {
        detail = await res.text()
      } catch {
        /* ignore */
      }
    }
    throw new HttpError(detail || `HTTP ${res.status}`, res.status, detail)
  }

  if (res.status === 204) return null
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return res.json()
  return res.text()
}

api.HttpError = HttpError
