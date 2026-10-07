import { useEffect, useState } from 'react'
import { api, auth, setOnSignedOut } from './api.js'
import BankImport from './BankImport.jsx'
import Login from './Login.jsx'
import Users from './Users.jsx'
import Account from './Account.jsx'

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
    <form className="card" onSubmit={submit}>
      <h2>New entry</h2>
      <div className="seg">
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
    <section>
      <div className="totals">
        <div><span className="muted">In</span><b>{zar(income)}</b></div>
        <div><span className="muted">Out</span><b>{zar(expense)}</b></div>
      </div>
      <p className="muted">Last 90 days. Totals exclude reversals; reversed entries are still listed.</p>
      {rows.map((r) => (
        <div className="row" key={r.id}>
          <div>
            <b>{r.counterparty || r.reference || r.kind}</b>
            <div className="muted">{r.txnDate}{r.kind.startsWith('LOAN_') ? ' · loan' : ''}{r.reversalOfId ? ' · reversal' : ''}</div>
          </div>
          <div className={r.kind === 'INCOME' || r.kind === 'LOAN_IN' ? 'in' : 'out'}>
            {r.kind === 'INCOME' || r.kind === 'LOAN_IN' ? '+' : '−'}{zar(r.amount)}
            {canWrite && !r.reversalOfId && <button className="link" onClick={() => onReverse(r.id)}>reverse</button>}
          </div>
        </div>
      ))}
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

  if (!lookups) return <main><p>{error || 'Loading…'}</p></main>

  return (
    <main>
      <header>
        <h1>Rock Ledger</h1>
        <span className="muted">{user.name}</span>
      </header>
      {error && <p className="error">{error}</p>}
      <div className="seg tabs">
        {tabs.map(([k, label]) => (
          <button type="button" key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      {tab === 'ledger' && (
        <>
          {canWrite && <AddTransaction lookups={lookups} onSaved={load} />}
          <Ledger rows={rows} onReverse={reverse} canWrite={canWrite} />
        </>
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
  if (!session) return <main><Login onSession={setSession} /></main>
  return <Shell session={session} onSignOut={signOut} />
}
