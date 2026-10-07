import { useEffect, useState } from 'react'
import { api, auth, setOnSignedOut } from './api.js'
import BankImport from './BankImport.jsx'
import Login from './Login.jsx'
import Users from './Users.jsx'
import Account from './Account.jsx'
import logoDark from './assets/brand/dark-mode-horizontal-header.webp'
import logoLight from './assets/brand/light-mode-horizontal-header.webp'
import iconDark from './assets/brand/dark-mode-app-icon.webp'

const zar = (n) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n)

function AddTransaction({ lookups, onSaved }) {
  const [form, setForm] = useState({
    kind: 'INCOME',
    txnDate: new Date().toISOString().slice(0, 10),
    amount: '',
    accountId: '',
    fundId: '',
    categoryId: '',
    counterparty: '',
    reference: '',
  })
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const cats = lookups.categories.filter((c) => c.kind === form.kind)

  async function submit(e) {
    e.preventDefault()
    setError('')
    try {
      await api.addTransaction({
        ...form,
        amount: form.amount,
        accountId: Number(form.accountId),
        fundId: Number(form.fundId),
        categoryId: form.categoryId ? Number(form.categoryId) : null,
      })
      setForm({ ...form, amount: '', counterparty: '', reference: '' })
      onSaved()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form className="card entry-card" onSubmit={submit}>
      <div className="section-heading">
        <div><span className="eyebrow">LEDGER</span><h2>New entry</h2></div>
        <span className="heading-icon" aria-hidden="true">+</span>
      </div>
      <div className="seg transaction-types">
        {[['INCOME', 'Money in'], ['EXPENSE', 'Money out'], ['LOAN_IN', 'Loan in'], ['LOAN_OUT', 'Loan repaid']].map(([k, label]) => (
          <button type="button" key={k} className={form.kind === k ? 'on' : ''}
            onClick={() => setForm({ ...form, kind: k, categoryId: '' })}>
            {label}
          </button>
        ))}
      </div>
      <input type="date" value={form.txnDate} onChange={set('txnDate')} required />
      <input inputMode="decimal" placeholder="Amount (R)" value={form.amount} onChange={set('amount')} required />
      <select value={form.accountId} onChange={set('accountId')} required>
        <option value="">Account…</option>
        {lookups.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <select value={form.fundId} onChange={set('fundId')} required>
        <option value="">Fund…</option>
        {lookups.funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
      {!form.kind.startsWith('LOAN_') && (
      <select value={form.categoryId} onChange={set('categoryId')} required>
        <option value="">Category…</option>
        {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      )}
      <input placeholder={form.kind.startsWith('LOAN_') ? "Lender's name" : form.kind === 'INCOME' ? 'Received from' : 'Paid to'} value={form.counterparty} onChange={set('counterparty')} required={form.kind.startsWith('LOAN_')} />
      <input placeholder="Reference" value={form.reference} onChange={set('reference')} />
      {error && <p className="error">{error}</p>}
      <button type="submit">Save</button>
    </form>
  )
}

function Ledger({ rows, onReverse, canWrite }) {
  const income = rows.filter((r) => r.kind === 'INCOME' && !r.reversalOfId).reduce((s, r) => s + Number(r.amount), 0)
  const expense = rows.filter((r) => r.kind === 'EXPENSE' && !r.reversalOfId).reduce((s, r) => s + Number(r.amount), 0)
  return (
    <section className="ledger-panel">
      <div className="section-heading">
        <div><span className="eyebrow">ACTIVITY</span><h2>Recent transactions</h2></div>
        <span className="period-label">Last 90 days</span>
      </div>
      <div className="totals">
        <div className="total-card income-total"><span className="muted">Money in</span><b>{zar(income)}</b></div>
        <div className="total-card expense-total"><span className="muted">Money out</span><b>{zar(expense)}</b></div>
      </div>
      <p className="muted ledger-note">Totals exclude reversals; reversed entries remain listed for your records.</p>
      {rows.length === 0 ? (
        <div className="empty-state"><span aria-hidden="true">✦</span><b>No transactions yet</b><p>Your latest activity will appear here.</p></div>
      ) : (
        <div className="transaction-list">
          {rows.map((r) => (
            <div className="row transaction-row" key={r.id}>
              <div className="transaction-description">
                <span className={`transaction-icon ${r.kind === 'INCOME' || r.kind === 'LOAN_IN' ? 'positive' : 'negative'}`} aria-hidden="true">
                  {r.kind === 'INCOME' || r.kind === 'LOAN_IN' ? '↓' : '↑'}
                </span>
                <div>
                  <b>{r.counterparty || r.reference || r.kind}</b>
                  <div className="muted">{r.txnDate}{r.kind.startsWith('LOAN_') ? ' · loan' : ''}{r.reversalOfId ? ' · reversal' : ''}</div>
                </div>
              </div>
              <div className={r.kind === 'INCOME' || r.kind === 'LOAN_IN' ? 'in' : 'out'}>
                <b>{r.kind === 'INCOME' || r.kind === 'LOAN_IN' ? '+' : '−'}{zar(r.amount)}</b>
                {canWrite && !r.reversalOfId && <button className="link" onClick={() => onReverse(r.id)}>reverse</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function Shell({ session, onSignOut }) {
  const user = session.user
  const canWrite = user.role === 'ADMIN' || user.role === 'TREASURER'
  const [lookups, setLookups] = useState(null)
  const [rows, setRows] = useState([])
  const [tab, setTab] = useState('ledger')
  const [error, setError] = useState('')

  async function load() {
    try {
      const [l, t] = await Promise.all([api.lookups(), api.transactions()])
      setLookups(l)
      setRows(t)
    } catch (e) { setError(e.message) }
  }
  useEffect(() => { load() }, [])

  async function reverse(id) {
    if (!confirm('Reverse this entry? A matching correction entry will be added.')) return
    try { await api.reverse(id); load() } catch (e) { setError(e.message) }
  }

  const tabs = [['ledger', 'Ledger']]
  if (canWrite) tabs.push(['bank', 'Bank import'])
  if (user.role === 'ADMIN') tabs.push(['users', 'People'])
  tabs.push(['account', 'Account'])

  if (!lookups) return <main className="app-shell"><p>{error || 'Loading…'}</p></main>

  return (
    <main className="app-shell">
      <header className="topbar">
        <picture className="brand-logo">
          <source media="(prefers-color-scheme: dark)" srcSet={logoDark} />
          <img src={logoLight} width="900" height="225" alt="Rock Ledger — Faithful stewardship. Greater impact." />
        </picture>
        <div className="profile-chip">
          <span className="avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
          <span><b>{user.name}</b><small>{user.role.toLowerCase()}</small></span>
        </div>
      </header>
      <section className="welcome-banner">
        <div><span className="eyebrow">ROCK MISSION MINISTRIES</span><h1>Your finances, in good hands.</h1><p>Clear records. Confident decisions. A faithful view of every rand.</p></div>
        <img className="welcome-icon" src={iconDark} width="256" height="256" alt="" />
      </section>
      {error && <p className="error">{error}</p>}
      <div className="seg tabs">
        {tabs.map(([k, label]) => (
          <button type="button" key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      {tab === 'ledger' && (
        <div className={`ledger-layout ${canWrite ? '' : 'read-only-layout'}`}>
          {canWrite && <AddTransaction lookups={lookups} onSaved={load} />}
          <Ledger rows={rows} onReverse={reverse} canWrite={canWrite} />
        </div>
      )}
      {tab === 'bank' && canWrite && <BankImport lookups={lookups} onPosted={load} />}
      {tab === 'users' && user.role === 'ADMIN' && <Users me={user} />}
      {tab === 'account' && <Account user={user} onSignOut={onSignOut} />}
    </main>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    setOnSignedOut(() => setSession(null))
    auth.refresh().then((s) => { if (s) setSession(s) }).finally(() => setBooting(false))
  }, [])

  async function signOut() {
    await auth.logout()
    setSession(null)
  }

  if (booting) return <main><p className="muted">Loading…</p></main>
  if (!session) return <main className="auth-shell"><Login onSession={setSession} /></main>
  return <Shell session={session} onSignOut={signOut} />
}
