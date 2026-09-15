/**
 * Theme, resolved before React mounts.
 *
 * Applied by a blocking script in index.html rather than in an effect, because
 * a theme decided after first paint means every dark-mode user sees a white
 * flash on every load. That flash is the single most visible way a UI admits
 * it was bolted together.
 */

const KEY = 'asw.theme'

export const getStoredTheme = () => localStorage.getItem(KEY)

export const resolveTheme = () =>
  getStoredTheme() ??
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

export function applyTheme (theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem(KEY, theme)
}

export function toggleTheme () {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  return next
}
