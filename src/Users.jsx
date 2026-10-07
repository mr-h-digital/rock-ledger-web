import { useEffect, useState } from 'react'
import { api } from './api.js'

export default function Users({ me }) {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ email: '', fullName: '', role: 'TREASURER' })
  const [temp, setTemp] = useState(null)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const load = async () => setUsers(await api.users())
  useEffect(() => { load() }, [])

  async function create(e) {
    e.preventDefault()
    setError('')
    try {
      const r = await api.createUser(form)
      setTemp({ who: r.user.email, password: r.temporaryPassword })
      setForm({ email: '', fullName: '', role: 'TREASURER' })
      load()
    } catch (err) { setError(err.message) }
  }
  async function reset(u) {
    if (!confirm(`Reset ${u.fullName}? They get a new temporary password and must set up the authenticator again.`)) return
    const r = await api.resetUser(u.id)
    setTemp({ who: r.user.email, password: r.temporaryPassword })
    load()
  }
  async function toggle(u) {
    setError('')
    try { await api.setUserActive(u.id, !u.active); load() } catch (err) { setError(err.message) }
  }

  return (
    <section>
      {temp && (
        <div className="card">
          <h2>Temporary password</h2>
          <p className="muted">For {temp.who}. It is shown once. Give it to them privately; they must change it at first sign-in.</p>
          <p className="secretkey">{temp.password}</p>
          <button type="button" onClick={() => setTemp(null)}>Done</button>
        </div>
      )}
      <form className="card" onSubmit={create}>
        <h2>Add a person</h2>
        <input type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
        <input placeholder="Full name" value={form.fullName} onChange={set('fullName')} required />
        <select value={form.role} onChange={set('role')}>
          <option value="ADMIN">Admin (everything, manages people)</option>
          <option value="TREASURER">Treasurer (capture, import, post)</option>
          <option value="VIEWER">Viewer (read-only)</option>
        </select>
        {error && <p className="error">{error}</p>}
        <button type="submit">Create account</button>
      </form>
      <div className="card">
        <h2>People</h2>
        {users.map((u) => (
          <div className="row col" key={u.id}>
            <div className="rowtop">
              <div>
                <b>{u.fullName}</b>{u.email === me.email ? ' (you)' : ''}
                <div className="muted">{u.email} · {u.role.toLowerCase()} · {u.twoFactor ? '2FA on' : '2FA not set up'}{u.active ? '' : ' · deactivated'}</div>
              </div>
            </div>
            {u.email !== me.email && (
              <div className="actions">
                <button type="button" className="link" onClick={() => reset(u)}>Reset password and 2FA</button>
                <button type="button" className="link" onClick={() => toggle(u)}>{u.active ? 'Deactivate' : 'Reactivate'}</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
