import { useEffect, useState } from 'react'
import { auth } from './api.js'
import logoDark from './assets/brand/dark-mode-horizontal-header.webp'
import logoLight from './assets/brand/light-mode-horizontal-header.webp'

function Field(props) {
  return <input {...props} />
}

/** password -> (new password) -> (set up authenticator) -> 6-digit code */
export default function Login({ onSession, isDark }) {
  const [step, setStep] = useState('creds')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [code, setCode] = useState('')
  const [enrol, setEnrol] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (step !== 'enrol' || enrol) return
    auth.enrolStart().then(setEnrol).catch((e) => setError(e.message))
  }, [step, enrol])

  async function run(fn) {
    setError('')
    setBusy(true)
    try { await fn() } catch (e) {
      if (e.expired) { setStep('creds'); setEnrol(null); setCode('') }
      setError(e.message)
    } finally { setBusy(false) }
  }

  const route = (r) => {
    if (r.accessToken) return onSession(r)
    setCode('')
    setStep({ CHANGE_PASSWORD: 'password', ENROL: 'enrol', TOTP: 'totp' }[r.status])
  }

  if (step === 'creds') {
    return (
      <form className="card auth-card" onSubmit={(e) => { e.preventDefault(); run(async () => route(await auth.login(email, password))) }}>
        <div className="auth-brand brand-logo">
          <img src={isDark ? logoDark : logoLight} width="900" height="225" alt="Rock Ledger — Faithful stewardship. Greater impact." />
        </div>
        <span className="eyebrow">ROCK MISSION MINISTRIES</span>
        <h1>Welcome back.</h1>
        <p className="muted">Sign in securely to continue to your ledger.</p>
        <Field type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        <Field type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>Sign in</button>
      </form>
    )
  }

  if (step === 'password') {
    return (
      <form className="card auth-card" onSubmit={(e) => { e.preventDefault(); run(async () => route(await auth.setPassword(newPassword))) }}>
        <h2>Choose your own password</h2>
        <p className="muted">Replace the temporary password. Use at least 12 characters. A few random words works well.</p>
        <Field type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" minLength={12} required />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>Save password</button>
      </form>
    )
  }

  if (step === 'enrol') {
    const grouped = enrol?.secret?.match(/.{1,4}/g)?.join(' ')
    return (
      <form className="card auth-card" onSubmit={(e) => { e.preventDefault(); run(async () => route(await auth.enrolConfirm(code))) }}>
        <h2>Set up your authenticator app</h2>
        <p className="muted">Install Google Authenticator or Microsoft Authenticator. Add an account, choose "enter a setup key" and type this key:</p>
        {enrol ? <p className="secretkey">{grouped}</p> : <p className="muted">Preparing…</p>}
        {enrol && <p className="muted">On this phone you can also <a href={enrol.otpauthUri}>open it in your authenticator app</a>.</p>}
        <Field inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code from the app" value={code} onChange={(e) => setCode(e.target.value)} maxLength={7} required />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy || !enrol}>Confirm and sign in</button>
      </form>
    )
  }

  return (
    <form className="card auth-card" onSubmit={(e) => { e.preventDefault(); run(async () => route(await auth.verify(code))) }}>
      <h2>Enter your code</h2>
      <p className="muted">Open your authenticator app and type the 6-digit code for Rock Ledger.</p>
      <Field inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={7} autoFocus required />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={busy}>Verify</button>
    </form>
  )
}
