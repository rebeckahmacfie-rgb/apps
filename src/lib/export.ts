import { db } from "../db"

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ""
  const headers = Array.from(rows.reduce((set, r) => { Object.keys(r).forEach((k) => set.add(k)); return set }, new Set<string>()))
  const escape = (v: unknown) => {
    if (v == null) return ""
    const s = Array.isArray(v) ? v.join("; ") : String(v)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [headers.join(",")]
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","))
  }
  return lines.join("\n")
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const TABLES = [
  "food",
  "drinks",
  "activities",
  "symptoms",
  "potsVitals",
  "glp1Doses",
  "digestion",
  "dailyCheckins",
  "weather",
  "bodyMeasurements",
  "medEvents",
  "meds",
] as const

export async function exportAllCsv() {
  const stamp = new Date().toISOString().slice(0, 10)
  for (const table of TABLES) {
    const rows = await (db as any)[table].toArray()
    if (rows.length === 0) continue
    download(`body-ledger-${table}-${stamp}.csv`, toCsv(rows), "text/csv")
  }
}

export async function exportDailySummaryCsv() {
  const stamp = new Date().toISOString().slice(0, 10)
  const [checkins, symptoms, drinks, measurements, weather] = await Promise.all([
    db.dailyCheckins.toArray(),
    db.symptoms.toArray(),
    db.drinks.toArray(),
    db.bodyMeasurements.toArray(),
    db.weather.toArray(),
  ])

  const dates = new Set<string>()
  ;[...checkins, ...symptoms, ...drinks, ...measurements, ...weather].forEach((r: any) => dates.add(r.date))

  const painByDate = new Map<string, number>()
  const flareByDate = new Map<string, boolean>()
  for (const s of symptoms) {
    if (s.kind === "pain") {
      painByDate.set(s.date, Math.max(painByDate.get(s.date) ?? 0, s.rating))
      if (s.isFlare) flareByDate.set(s.date, true)
    }
  }
  const fluidsByDate = new Map<string, number>()
  for (const d of drinks) fluidsByDate.set(d.date, (fluidsByDate.get(d.date) ?? 0) + (d.ounces || 0))

  const checkinByDate = new Map(checkins.map((c) => [c.date, c]))
  const weatherByDate = new Map(weather.map((w) => [w.date, w]))
  const measByDate = new Map(measurements.map((m) => [m.date, m]))

  const rows = Array.from(dates)
    .sort()
    .map((date) => {
      const c = checkinByDate.get(date)
      const w = weatherByDate.get(date)
      const m = measByDate.get(date)
      return {
        date,
        weightLbs: c?.weightLbs,
        sleepHours: c?.sleepHours,
        sleepQuality: c?.sleepQuality,
        energy: c?.energy,
        mood: c?.mood,
        stress: c?.stress,
        maxPain: painByDate.get(date),
        flareUp: flareByDate.get(date) ? "yes" : "",
        fluidOz: fluidsByDate.get(date),
        weatherConditions: w?.conditions,
        pressureTrend: w?.pressureTrend,
        waist: m?.waist,
        hips: m?.hips,
      }
    })

  download(`body-ledger-daily-summary-${stamp}.csv`, toCsv(rows), "text/csv")
}

export async function exportFullBackupJson() {
  const stamp = new Date().toISOString().slice(0, 10)
  const data: Record<string, unknown> = { exportedAt: new Date().toISOString(), version: 1 }
  for (const table of TABLES) {
    data[table] = await (db as any)[table].toArray()
  }
  data.settings = await db.settings.toArray()
  download(`body-ledger-backup-${stamp}.json`, JSON.stringify(data, null, 2), "application/json")
}
