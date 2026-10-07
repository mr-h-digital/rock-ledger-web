import { useEffect, useState } from 'react'
import { api } from './api.js'

const zar = (n) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n)

function PostForm({ line, lookups, onDone }) {
  const inbound = Number(line.amount) > 0
  const kinds = inbound
    ? [['INCOME', 'Income'], ['LOAN_IN', 'Loan in'], ['TRANSFER', 'Transfer in']]
    : [['EXPENSE', 'Expense'], ['LOAN_OUT', 'Loan repaid'], ['TRANSFER', 'Transfer out']]
  const [f, setF] = useState({ kind: kinds[0][0], fundId: '', categoryId: '', counterparty: '', otherAccountId: '' })
  const [error, setError] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const cats = lookups.categories.filter((c) => c.kind === f.kind)
  const others = lookups.accounts.filter((a) => a.type !== 'BANK')

  async function submit(e) {
    e.preventDefault()
    setError('')
    try {
      await api.postBankLine(line.id, {
        kind: f.kind,
        fundId: Number(f.fundId),
        categoryId: f.categoryId ? Number(f.categoryId) : null,
        counterparty: f.counterparty || null,
        otherAccountId: f.otherAccountId ? Number(f.otherAccountId) : null,
      })
      onDone()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form className="postform" onSubmit={submit}>
      <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value, categoryId: '' })}>
        {kinds.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      <select value={f.fundId} onChange={set('fundId')} required>
        <option value="">Fund…</option>
        {lookups.funds.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
      </select>
      {(f.kind === 'INCOME' || f.kind === 'EXPENSE') && (
        <select value={f.categoryId} onChange={set('categoryId')} required>
          <option value="">Category…</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
      {f.kind === 'TRANSFER' && (
        <select value={f.otherAccountId} onChange={set('otherAccountId')} required>
          <option value="">Other account…</option>
          {others.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      )}
      <input
        placeholder={f.kind.startsWith('LOAN_') ? "Lender's name" : 'Who (optional)'}
        value={f.counterparty} onChange={set('counterparty')} required={f.kind.startsWith('LOAN_')}
      />
      {error && <p className="error">{error}</p>}
      <button type="submit">Post to ledger</button>
    </form>
  )
}

export default function BankImport({ lookups, onPosted }) {
  const [lines, setLines] = useState([])
  const [results, setResults] = useState([])
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = async () => setLines(await api.bankLines('unposted'))
  useEffect(() => { load() }, [])

  async function upload(e) {
    setError('')
    setBusy(true)
    const out = []
    for (const file of [...e.target.files].sort((a, b) => a.name.localeCompare(b.name))) {
      try {
        out.push({ name: file.name, ...(await api.uploadStatement(file)) })
      } catch (err) {
        out.push({ name: file.name, error: err.message })
      }
    }
    e.target.value = ''
    setResults(out)
    setBusy(false)
    load()
  }

  async function postFees() {
    const r = await api.postBankFees()
    setResults([{ name: 'Bank fees', note: `${r.posted} fee lines posted as Bank charges` }])
    load()
    onPosted?.()
  }

  return (
    <section>
      <div className="card">
        <h2>Import bank statements</h2>
        <p className="muted">Upload the Capitec PDF statements. Lines go to a review list; nothing is counted until you post it.</p>
        <input type="file" accept="application/pdf" multiple onChange={upload} disabled={busy} />
        {busy && <p className="muted">Reading statements…</p>}
        {error && <p className="error">{error}</p>}
        {results.map((r) => (
          <div key={r.name} className="muted">
            <b>{r.name}</b>{' '}
            {r.error ? <span className="error">{r.error}</span>
              : r.note ? r.note
              : `${r.newLines} new lines (${r.duplicates} already there), ${r.opening} → ${r.closing}`}
            {(r.warnings || []).map((w) => <div key={w} className="error">{w}</div>)}
          </div>
        ))}
      </div>

      <div className="card">
        <h2>To review ({lines.length})</h2>
        <button type="button" onClick={postFees}>Post all bank fee lines</button>
        {lines.map((l) => (
          <div className="row col" key={l.id}>
            <div className="rowtop" onClick={() => setOpen(open === l.id ? null : l.id)}>
              <div>
                <b>{l.description}</b>
                <div className="muted">{l.txn_date}{Number(l.fee) !== 0 ? ` · fee ${zar(-l.fee)}` : ''}</div>
              </div>
              <div className={Number(l.amount) > 0 ? 'in' : 'out'}>{zar(l.amount)}</div>
            </div>
            {open === l.id && (
              <PostForm line={l} lookups={lookups} onDone={() => { setOpen(null); load(); onPosted?.() }} />
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
