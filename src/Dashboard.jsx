import { useEffect, useState } from 'react'
import { api } from './api.js'
import PeriodPicker, { describePeriod } from './PeriodPicker.jsx'

const zar = (n) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(n) || 0)
const zarShort = (n) => {
  const v = Math.abs(Number(n) || 0)
  if (v >= 1_000_000) return `R${(n / 1_000_000).toFixed(1)}m`
  if (v >= 1_000) return `R${(n / 1_000).toFixed(v >= 10_000 ? 0 : 1)}k`
  return `R${Math.round(n)}`
}
const monthName = (ym) => new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-ZA', { month: 'short' })
const monthLong = (ym) => new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })

/** Every month in the period (so quiet months show as gaps), unless the period is very long. */
function monthsInPeriod(from, to, data) {
  const byMonth = Object.fromEntries(data.map((m) => [m.month, m]))
  const start = new Date(`${from.slice(0, 7)}-01T00:00:00`)
  const end = new Date(`${to.slice(0, 7)}-01T00:00:00`)
  const span = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth()
  if (span > 24) return data
  const out = []
  for (let d = start; d <= end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    out.push(byMonth[key] || { month: key, income: 0, expense: 0 })
  }
  return out
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function MonthlyChart({ months }) {
  const max = Math.max(1, ...months.map((m) => Math.max(Number(m.income), Number(m.expense))))
  if (months.length === 0) return <p className="muted">Nothing recorded in this period.</p>
  return (
    <div className="bar-chart" role="img" aria-label="Income and expenses by month">
      {months.map((m) => (
        <div className="bar-group" key={m.month} title={`${monthLong(m.month)}\nIncome ${zar(m.income)}\nExpenses ${zar(m.expense)}`}>
          <div className="bars">
            <span className="bar income" style={{ height: `${(Math.max(0, m.income) / max) * 100}%` }} />
            <span className="bar expense" style={{ height: `${(Math.max(0, m.expense) / max) * 100}%` }} />
          </div>
          <span className="bar-label">{monthName(m.month)}</span>
        </div>
      ))}
    </div>
  )
}

function Breakdown({ title, rows, tone }) {
  const total = rows.reduce((s, r) => s + Number(r.total), 0)
  const max = Math.max(1, ...rows.map((r) => Number(r.total)))
  return (
    <div className="breakdown">
      <div className="breakdown-head"><b>{title}</b><span className="muted">{zar(total)}</span></div>
      {rows.length === 0 ? <p className="muted">None in this period.</p> : rows.map((r) => (
        <div className="breakdown-row" key={r.category}>
          <div className="breakdown-label">
            <span>{r.category}</span>
            <span className="muted">{zar(r.total)} · {total ? Math.round((Number(r.total) / total) * 100) : 0}%</span>
          </div>
          <div className="meter"><span className={tone} style={{ width: `${(Math.max(0, r.total) / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard({ period, onPeriod, financialYears }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    let live = true
    setError('')
    api.reportSummary(period.from, period.to)
      .then((d) => { if (live) setData(d) })
      .catch((e) => { if (live) setError(e.message) })
    return () => { live = false }
  }, [period.from, period.to])

  async function download(kind, name) {
    setBusy(kind)
    setError('')
    try {
      saveBlob(await api.downloadReport(kind, period.from, period.to), `rock-ledger-${name}-${period.from}-to-${period.to}.${kind.split('.').pop()}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  const t = data?.totals
  const owed = data ? data.loans.reduce((s, l) => s + Number(l.owed), 0) : 0
  const cash = data ? data.balances.reduce((s, b) => s + Number(b.balance), 0) : 0
  const months = data ? monthsInPeriod(data.from, data.to, data.monthly) : []

  return (
    <div className="dashboard">
      <section className="card dashboard-toolbar">
        <div className="section-heading">
          <div><span className="eyebrow">DASHBOARD</span><h2>Financial overview</h2></div>
          <span className="period-label">{describePeriod(period)}</span>
        </div>
        <div className="toolbar-row">
          <PeriodPicker value={period} onChange={onPeriod} financialYears={financialYears} />
          <div className="export-buttons">
            <button type="button" className="secondary" disabled={!!busy} onClick={() => download('report.pdf', 'report')}>
              {busy === 'report.pdf' ? 'Preparing…' : 'PDF report'}
            </button>
            <button type="button" className="secondary" disabled={!!busy} onClick={() => download('summary.csv', 'summary')}>
              {busy === 'summary.csv' ? 'Preparing…' : 'Summary CSV'}
            </button>
            <button type="button" className="secondary" disabled={!!busy} onClick={() => download('transactions.csv', 'transactions')}>
              {busy === 'transactions.csv' ? 'Preparing…' : 'Transactions CSV'}
            </button>
          </div>
        </div>
        {error && <p className="error">{error}</p>}
      </section>

      {!data ? <p className="muted">{error ? '' : 'Loading…'}</p> : (
        <>
          <div className="kpis">
            <div className="kpi"><span className="muted">Income</span><b className="in">{zar(t.income)}</b></div>
            <div className="kpi"><span className="muted">Expenses</span><b className="out">{zar(t.expense)}</b></div>
            <div className="kpi"><span className="muted">Surplus / (deficit)</span><b className={Number(t.net) >= 0 ? 'in' : 'out'}>{zar(t.net)}</b></div>
            <div className="kpi"><span className="muted">Cash across accounts</span><b>{zar(cash)}</b><small className="muted">at {describePeriod(period).split(' – ')[1]}</small></div>
            <div className="kpi"><span className="muted">Loans owed</span><b>{zar(owed)}</b><small className="muted">{t.entries} entries in period</small></div>
          </div>

          <section className="card">
            <div className="section-heading">
              <div><span className="eyebrow">TREND</span><h2>Income and expenses by month</h2></div>
              <div className="legend"><span><i className="dot income" />Income</span><span><i className="dot expense" />Expenses</span></div>
            </div>
            <div className="chart-wrap">
              <div className="chart-axis" aria-hidden="true">
                <span>{zarShort(Math.max(1, ...months.map((m) => Math.max(Number(m.income), Number(m.expense)))))}</span>
                <span>R0</span>
              </div>
              <MonthlyChart months={months} />
            </div>
          </section>

          <div className="dashboard-grid">
            <section className="card">
              <div><span className="eyebrow">WHERE IT CAME FROM AND WENT</span><h2>By category</h2></div>
              <Breakdown title="Income" tone="income" rows={data.byCategory.filter((c) => c.kind === 'INCOME')} />
              <Breakdown title="Expenses" tone="expense" rows={data.byCategory.filter((c) => c.kind === 'EXPENSE')} />
            </section>

            <div className="stack">
              <section className="card">
                <div><span className="eyebrow">FUNDS</span><h2>By fund</h2></div>
                {data.byFund.length === 0 ? <p className="muted">Nothing recorded in this period.</p> : (
                  <table className="mini-table">
                    <thead><tr><th>Fund</th><th>In</th><th>Out</th><th>Net</th></tr></thead>
                    <tbody>
                      {data.byFund.map((f) => {
                        const net = Number(f.income) - Number(f.expense)
                        return (
                          <tr key={f.fund}>
                            <td>{f.fund}{f.restricted && <small className="muted"> · restricted</small>}</td>
                            <td>{zar(f.income)}</td><td>{zar(f.expense)}</td>
                            <td className={net >= 0 ? 'in' : 'out'}>{zar(net)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </section>

              <section className="card">
                <div><span className="eyebrow">ACCOUNTS</span><h2>Balances at period end</h2></div>
                <table className="mini-table">
                  <tbody>
                    {data.balances.map((b) => (
                      <tr key={b.id}><td>{b.name}<small className="muted"> · {String(b.type).toLowerCase()}</small></td><td>{zar(b.balance)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </section>

              {data.loans.length > 0 && (
                <section className="card">
                  <div><span className="eyebrow">DIRECTOR LOANS</span><h2>Owed at period end</h2></div>
                  <table className="mini-table">
                    <tbody>
                      {data.loans.map((l) => <tr key={l.lender ?? '—'}><td>{l.lender || 'Unnamed lender'}</td><td>{zar(l.owed)}</td></tr>)}
                    </tbody>
                  </table>
                </section>
              )}
            </div>
          </div>
          <p className="muted ledger-note">Figures are net of reversals. Loans and transfers are not counted as income or expenses.</p>
        </>
      )}
    </div>
  )
}
