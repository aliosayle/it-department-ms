/**
 * Hides the DevExtreme evaluation banner (`dx-license`).
 *
 * The panel uses **inline `!important` styles**, so stylesheet rules often lose. The
 * built-in dismiss is a **`div`**, not a `<button>` — we click `lastElementChild` to set
 * `DxLicense.closed` (see DevExtreme `trial_panel.client.js`).
 *
 * A **throttled** MutationObserver on `document.body` re-runs dismiss at most every
 * `THROTTLE_MS` so DataGrid DOM updates do not freeze the tab.
 */

const THROTTLE_MS = 500

function dismissLicensePanels() {
  document.querySelectorAll('dx-license').forEach((node) => {
    const el = node as HTMLElement
    const closeControl = el.lastElementChild
    if (closeControl instanceof HTMLElement) {
      closeControl.click()
      return
    }
    const fallback = el.querySelector<HTMLElement>('div[style*="cursor: pointer"]')
    fallback?.click()
  })
}

export function hideDevExtremeWatermark(): () => void {
  dismissLicensePanels()

  let lastRun = 0
  const observer = new MutationObserver(() => {
    const now = Date.now()
    if (now - lastRun < THROTTLE_MS) return
    lastRun = now
    dismissLicensePanels()
  })
  observer.observe(document.body, { childList: true, subtree: true })

  const timeouts = [0, 400, 1200, 3000, 8000].map((ms) =>
    window.setTimeout(dismissLicensePanels, ms),
  )

  const interval = window.setInterval(dismissLicensePanels, 20_000)

  return () => {
    observer.disconnect()
    timeouts.forEach((id) => window.clearTimeout(id))
    window.clearInterval(interval)
  }
}
