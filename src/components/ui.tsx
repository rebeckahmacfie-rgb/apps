import type { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren, ReactNode } from "react"

export function Card({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={`rounded-2xl border p-4 ${className}`}
      style={{ background: "var(--card-surface)", borderColor: "var(--border)" }}
    >
      {children}
    </div>
  )
}

export function SectionTitle({ children }: PropsWithChildren) {
  return (
    <h2 className="text-sm font-semibold tracking-wide uppercase mb-2" style={{ color: "var(--text-muted)" }}>
      {children}
    </h2>
  )
}

export function BigButton({
  children,
  className = "",
  ...rest
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      {...rest}
      className={`rounded-xl px-4 py-3 font-medium text-sm active:scale-[0.98] transition-transform ${className}`}
      style={{ background: "var(--series-1)", color: "#fff", ...rest.style }}
    >
      {children}
    </button>
  )
}

export function GhostButton({
  children,
  className = "",
  ...rest
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      {...rest}
      className={`rounded-xl px-4 py-3 font-medium text-sm border active:scale-[0.98] transition-transform ${className}`}
      style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
    >
      {children}
    </button>
  )
}

export function FormFooter({
  onSave,
  onDelete,
  saveLabel = "Save",
}: {
  onSave: () => void
  onDelete?: () => void
  saveLabel?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <BigButton className="w-full" onClick={onSave}>
        {saveLabel}
      </BigButton>
      {onDelete && (
        <button onClick={onDelete} className="text-xs font-medium text-center py-1" style={{ color: "var(--status-critical)" }}>
          Delete entry
        </button>
      )}
    </div>
  )
}

export function QuickTapButton({
  label,
  sub,
  onClick,
}: {
  label: string
  sub?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border p-3 text-left active:scale-[0.98] transition-transform"
      style={{ background: "var(--card-surface)", borderColor: "var(--border)" }}
    >
      <div className="text-sm font-semibold">{label}</div>
      {sub && (
        <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {sub}
        </div>
      )}
    </button>
  )
}

export function Field({
  label,
  children,
}: PropsWithChildren<{ label: string }>) {
  return (
    <label className="block mb-3">
      <div className="text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
        {label}
      </div>
      {children}
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border px-3 py-2 text-sm ${props.className ?? ""}`}
      style={{ borderColor: "var(--border)", background: "var(--surface-1)", color: "var(--text-primary)" }}
    />
  )
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border px-3 py-2 text-sm ${props.className ?? ""}`}
      style={{ borderColor: "var(--border)", background: "var(--surface-1)", color: "var(--text-primary)" }}
    />
  )
}

export function Select({
  children,
  ...rest
}: PropsWithChildren<React.SelectHTMLAttributes<HTMLSelectElement>>) {
  return (
    <select
      {...rest}
      className={`w-full rounded-lg border px-3 py-2 text-sm ${rest.className ?? ""}`}
      style={{ borderColor: "var(--border)", background: "var(--surface-1)", color: "var(--text-primary)" }}
    >
      {children}
    </select>
  )
}

export function RatingScale({
  value,
  onChange,
  max = 10,
}: {
  value: number | undefined
  onChange: (v: number) => void
  max?: number
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
        const active = value === n
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="w-8 h-8 rounded-full text-xs font-semibold border"
            style={{
              background: active ? "var(--series-8)" : "var(--surface-1)",
              color: active ? "#fff" : "var(--text-secondary)",
              borderColor: active ? "var(--series-8)" : "var(--border)",
            }}
          >
            {n}
          </button>
        )
      })}
    </div>
  )
}

export function TagPicker({
  options,
  selected,
  onToggle,
}: {
  options: string[]
  selected: string[]
  onToggle: (tag: string) => void
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((tag) => {
        const active = selected.includes(tag)
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggle(tag)}
            className="rounded-full px-3 py-1.5 text-xs font-medium border"
            style={{
              background: active ? "var(--series-1)" : "var(--surface-1)",
              color: active ? "#fff" : "var(--text-secondary)",
              borderColor: active ? "var(--series-1)" : "var(--border)",
            }}
          >
            {tag}
          </button>
        )
      })}
    </div>
  )
}

export function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose} />
      <div
        className="relative rounded-t-2xl max-h-[88vh] flex flex-col"
        style={{ background: "var(--surface-1)" }}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
            style={{ color: "var(--text-muted)" }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto scroll-touch px-4 py-4">{children}</div>
        {footer && (
          <div className="px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function StatusPill({ good, label }: { good: boolean; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        background: good ? "color-mix(in srgb, var(--status-good) 15%, transparent)" : "color-mix(in srgb, var(--status-critical) 15%, transparent)",
        color: good ? "var(--status-good)" : "var(--status-critical)",
      }}
    >
      {label}
    </span>
  )
}
