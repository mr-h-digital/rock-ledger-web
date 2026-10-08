import { useEffect, useState } from 'react'

const KEY = 'ledger-theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')

export function getThemePref() {
  const v = localStorage.getItem(KEY)
  return v === 'light' || v === 'dark' ? v : 'system'
}

function apply(pref) {
  const root = document.documentElement
  if (pref === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', pref)
  // Keep the mobile browser bar in step with a manually chosen theme
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    if (!m.dataset.media) m.dataset.media = m.getAttribute('media') || ''
    if (pref === 'system') m.setAttribute('media', m.dataset.media)
    else m.setAttribute('media', m.dataset.media.includes(pref) ? 'all' : 'not all')
  })
}

/** Returns [preference, setPreference, isDark]. Preference is 'system' | 'light' | 'dark', remembered per device. */
export function useTheme() {
  const [pref, setPref] = useState(getThemePref)
  const [systemDark, setSystemDark] = useState(media.matches)

  useEffect(() => {
    const onChange = (e) => setSystemDark(e.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    apply(pref)
    if (pref === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, pref)
  }, [pref])

  return [pref, setPref, pref === 'dark' || (pref === 'system' && systemDark)]
}
