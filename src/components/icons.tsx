import type { ReactNode } from "react"

function IconBase({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      {children}
    </svg>
  )
}

export function IconToday() {
  return (
    <IconBase>
      <path d="M12 3.3a1 1 0 0 1 .64.23l8 6.7A1 1 0 0 1 21 11v8.5a1 1 0 0 1-1 1h-4.25a1 1 0 0 1-1-1V15a1 1 0 0 0-1-1h-1.5a1 1 0 0 0-1 1v4.5a1 1 0 0 1-1 1H4.75a1 1 0 0 1-1-1V11a1 1 0 0 1 .36-.77l8-6.7A1 1 0 0 1 12 3.3Z" />
    </IconBase>
  )
}

export function IconTrends() {
  return (
    <IconBase>
      <rect x="4" y="13" width="4" height="7.2" rx="1.4" />
      <rect x="10" y="8.8" width="4" height="11.4" rx="1.4" />
      <rect x="16" y="4.5" width="4" height="15.7" rx="1.4" />
    </IconBase>
  )
}

export function IconFlares() {
  return (
    <IconBase>
      <path d="M12 2c.55 3.7 1.65 6.15 3.5 8S19.8 12.45 22 13c-3.7.55-6.15 1.65-8 3.5S12.55 20.3 12 22c-.55-3.7-1.65-6.15-3.5-8S4.2 11.55 2 11c3.7-.55 6.15-1.65 8-3.5S11.45 3.7 12 2Z" />
    </IconBase>
  )
}

export function IconSetup() {
  return (
    <IconBase>
      <circle cx="7" cy="7" r="2.6" />
      <rect x="10.8" y="5.9" width="9.7" height="2.2" rx="1.1" />
      <rect x="3.5" y="15.9" width="9.7" height="2.2" rx="1.1" />
      <circle cx="17" cy="17" r="2.6" />
    </IconBase>
  )
}
