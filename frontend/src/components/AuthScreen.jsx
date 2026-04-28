import { useState } from 'react'
import { Bot, Loader2, LogIn, UserPlus, Mail, Lock, User as UserIcon } from 'lucide-react'

function InputField({ id, icon: Icon, label, type = 'text', value, onChange, placeholder, autoComplete, minLength, required }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium tracking-wide text-slate-400 uppercase">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
          />
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
          className={`input-premium w-full py-2.5 pr-3 text-sm ${Icon ? 'pl-10' : 'pl-3.5'}`}
        />
      </div>
    </div>
  )
}

export default function AuthScreen({ onLogin, onRegister, registrationEnabled = true }) {
  const [mode, setMode]       = useState('login')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]       = useState('')
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState(null)

  const switchMode = (m) => { setMode(m); setError(null) }

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'login') {
        await onLogin({ email, password })
      } else {
        await onRegister({ email, password, name: name || null })
      }
    } catch (err) {
      setError(err.message || 'Échec de la connexion')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-mesh relative flex h-full w-full items-center justify-center px-4">
      <div className="relative z-10 w-full max-w-sm animate-scale-in">

        {/* Brand */}
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="logo-glow mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-500">
            <Bot size={26} className="text-white drop-shadow" />
          </div>
          <h1 className="text-[1.6rem] font-bold tracking-tight text-gradient">
            {mode === 'login' ? 'Bon retour 👋' : 'Créer un compte'}
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Vos conversations sont sauvegardées sur votre compte.
          </p>
        </div>

        {/* Tab switcher */}
        {registrationEnabled && (
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-white/5 bg-white/[0.04] p-1 text-sm">
            {[
              { key: 'login',    label: 'Se connecter', Icon: LogIn },
              { key: 'register', label: "S'inscrire",   Icon: UserPlus },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => switchMode(key)}
                className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg py-2 font-medium transition-all duration-200 ${
                  mode === key
                    ? 'bg-gradient-to-r from-violet-600/80 to-indigo-600/80 text-white shadow-glow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Form card */}
        <form onSubmit={submit} className="glass-card space-y-4 rounded-2xl p-6">
          {mode === 'register' && (
            <InputField
              id="auth-name"
              icon={UserIcon}
              label="Nom (optionnel)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Votre prénom"
              autoComplete="name"
            />
          )}

          <InputField
            id="auth-email"
            icon={Mail}
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@example.com"
            autoComplete="email"
            required
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="auth-password" className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Mot de passe
            </label>
            <div className="relative">
              <Lock
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="input-premium w-full py-2.5 pl-10 pr-3 text-sm"
              />
            </div>
            {mode === 'register' && (
              <p className="text-[11px] text-slate-500">6 caractères minimum.</p>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">
              <span className="mt-0.5 text-red-400">⚠</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-gradient ring-focus mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white"
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : mode === 'login' ? (
              <LogIn size={16} />
            ) : (
              <UserPlus size={16} />
            )}
            {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] text-slate-500">
          Instance privée · Aucune donnée partagée avec des tiers
        </p>
      </div>
    </div>
  )
}
