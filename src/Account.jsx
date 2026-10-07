import { useState } from 'react'
import { auth } from './api.js'

export default function Account({ user, onSignOut }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  async function change(e) {
    e.preventDefault()
    setError(''); setMsg('')
    try {
      await auth.changePassword(current, next)
      setCurrent(''); setNext('')
      setMsg('Password changed. Other devices will need to sign in again.')
    } catch (err) { setError(err.message) }
  }

  return (
    <section>
      <div className="card">
        <h2>{user.name}</h2>
        <p className="muted">{user.email} · {user.role.toLowerCase()}</p>
        <button type="button" onClick={onSignOut}>Sign out</button>
      </div>
      <form className="card" onSubmit={change}>
        <h2>Change password</h2>
        <input type="password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
        <input type="password" placeholder="New password (12+ characters)" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" minLength={12} required />
        {error && <p className="error">{error}</p>}
        {msg && <p className="muted">{msg}</p>}
        <button type="submit">Change password</button>
      </form>
    </section>
  )
}
