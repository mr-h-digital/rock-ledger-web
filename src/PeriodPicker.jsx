const iso = (d) => d.toLocaleDateString('en-CA') // YYYY-MM-DD in local time

export const today = () => iso(new Date())

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/** Preset periods, plus one per financial year (newest first). */
export function periodOptions(financialYears = []) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const options = [
    { key: 'last90', label: 'Last 90 days', from: iso(addDays(now, -90)), to: iso(now) },
    { key: 'month', label: 'This month', from: iso(new Date(y, m, 1)), to: iso(now) },
    { key: 'lastMonth', label: 'Last month', from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) },
    { key: 'ytd', label: 'This calendar year', from: iso(new Date(y, 0, 1)), to: iso(now) },
  ]
  const t = iso(now)
  const current = financialYears.find((f) => f.start_date <= t && t <= f.end_date)
  if (current) options.push({ key: `fy:${current.id}`, label: `This financial year (${current.label})`, from: current.start_date, to: t })
  for (const f of financialYears) {
    if (f.start_date > t) continue
    options.push({ key: `fyfull:${f.id}`, label: `${f.label} (${f.start_date.slice(0, 7)} to ${f.end_date.slice(0, 7)})${f.status === 'CLOSED' ? ' · closed' : ''}`, from: f.start_date, to: f.end_date })
  }
  return options
}

export const defaultPeriod = () => periodOptions()[0]

export function describePeriod(p) {
  const fmt = (s) => new Date(`${s}T00:00:00`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${fmt(p.from)} – ${fmt(p.to)}`
}

export default function PeriodPicker({ value, onChange, financialYears, compact = false }) {
  const options = periodOptions(financialYears)
  const known = options.some((o) => o.key === value.key)

  function pick(key) {
    if (key === 'custom') onChange({ key: 'custom', label: 'Custom', from: value.from, to: value.to })
    else onChange(options.find((o) => o.key === key))
  }

  function setDate(field, v) {
    if (!v) return
    const next = { ...value, key: 'custom', label: 'Custom', [field]: v }
    if (next.from > next.to) next[field === 'from' ? 'to' : 'from'] = v
    onChange(next)
  }

  return (
    <div className={`period-picker ${compact ? 'compact' : ''}`}>
      <select aria-label="Period" value={known ? value.key : 'custom'} onChange={(e) => pick(e.target.value)}>
        {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        <option value="custom">Custom dates…</option>
      </select>
      {(value.key === 'custom' || !known) && (
        <div className="period-dates">
          <input type="date" aria-label="From" value={value.from} max={value.to} onChange={(e) => setDate('from', e.target.value)} />
          <span className="muted">to</span>
          <input type="date" aria-label="To" value={value.to} min={value.from} onChange={(e) => setDate('to', e.target.value)} />
        </div>
      )}
    </div>
  )
}
