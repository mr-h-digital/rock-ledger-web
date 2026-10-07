const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

// Tokens live in memory only. The long-lived refresh token is an HttpOnly cookie the page cannot read,
// so a reload signs back in silently without storing anything in localStorage.
let accessToken = null
let pendingToken = null
let onSignedOut = () => {}

export function setOnSignedOut(fn) { onSignedOut = fn }

function send(path, options = {}, token = accessToken) {
  const isForm = options.body instanceof FormData
  return fetch(BASE + path, {
    credentials: 'include',
    ...options,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      'X-Requested-With': 'ledger',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
}

async function parse(res) {
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try { const j = await res.json(); if (j.message) msg = j.message } catch { /* keep default */ }
    const err = new Error(msg)
    err.status = res.status
    throw err
  }
  return res.status === 204 ? null : res.json()
}

function takeSession(s) {
  accessToken = s.accessToken
  pendingToken = null
  return s
}

async function request(path, options = {}) {
  let res = await send(path, options)
  if (res.status === 401 && accessToken) {
    const s = await auth.refresh()
    if (s) res = await send(path, options)
    else { accessToken = null; onSignedOut() }
  }
  return parse(res)
}

// One request at a time may spend the single-use refresh cookie.
let refreshing = null
export const auth = {
  refresh() {
    if (!refreshing) {
      refreshing = send('/api/auth/refresh', { method: 'POST' }, null)
        .then((res) => (res.ok ? res.json().then(takeSession) : null))
        .catch(() => null)
        .finally(() => { refreshing = null })
    }
    return refreshing
  },
  async login(email, password) {
    const r = await parse(await send('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, null))
    pendingToken = r.pendingToken
    return r
  },
  async step(path, body) {
    const r = await parse(await send(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }, pendingToken))
    if (r.accessToken) return takeSession(r)
    if (r.pendingToken) pendingToken = r.pendingToken
    return r
  },
  setPassword: (newPassword) => auth.step('/api/auth/set-password', { newPassword }),
  enrolStart: () => auth.step('/api/auth/enrol/start'),
  enrolConfirm: (code) => auth.step('/api/auth/enrol/confirm', { code }),
  verify: (code) => auth.step('/api/auth/verify', { code }),
  async logout() {
    try { await send('/api/auth/logout', { method: 'POST' }, null) } finally { accessToken = null; pendingToken = null }
  },
  changePassword: (currentPassword, newPassword) =>
    request('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
}

export const api = {
  lookups: () => request('/api/lookups'),
  transactions: () => request('/api/transactions'),
  addTransaction: (body) => request('/api/transactions', { method: 'POST', body: JSON.stringify(body) }),
  uploadStatement: (file) => { const f = new FormData(); f.append('file', file); return request('/api/bank-statements', { method: 'POST', body: f }) },
  bankLines: (status = 'unposted') => request(`/api/bank-lines?status=${status}`),
  postBankLine: (id, body) => request(`/api/bank-lines/${id}/post`, { method: 'POST', body: JSON.stringify(body) }),
  postBankFees: () => request('/api/bank-lines/post-fees', { method: 'POST' }),
  reverse: (id) => request(`/api/transactions/${id}/reverse`, { method: 'POST' }),
  users: () => request('/api/users'),
  createUser: (body) => request('/api/users', { method: 'POST', body: JSON.stringify(body) }),
  resetUser: (id) => request(`/api/users/${id}/reset`, { method: 'POST' }),
  setUserActive: (id, active) => request(`/api/users/${id}/active`, { method: 'PATCH', body: JSON.stringify({ active }) }),
}
