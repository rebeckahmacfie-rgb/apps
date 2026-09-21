import { db } from "../db"

interface ParsedHealthData {
  weightByDate: Map<string, number> // lbs, last reading of the day
  sleepHoursByDate: Map<string, number> // hours asleep, attributed to wake-up date
}

const RECORD_RE = /<Record\b[^>]*\/>/g
const ATTR_RE = /(\w+)="([^"]*)"/g

function parseAttrs(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  let m: RegExpExecArray | null
  ATTR_RE.lastIndex = 0
  while ((m = ATTR_RE.exec(tag))) {
    attrs[m[1]] = m[2]
  }
  return attrs
}

function dateOnly(appleDate: string | undefined): string | null {
  // Apple dates look like "2024-05-01 08:23:00 -0500"
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(appleDate ?? "")
  return m ? m[1] : null
}

export function parseAppleHealthExport(xmlText: string): ParsedHealthData {
  const weightByDate = new Map<string, number>()
  const sleepMsByDate = new Map<string, number>()

  let match: RegExpExecArray | null
  RECORD_RE.lastIndex = 0
  while ((match = RECORD_RE.exec(xmlText))) {
    const tag = match[0]
    if (!tag.includes("BodyMass") && !tag.includes("SleepAnalysis")) continue
    const attrs = parseAttrs(tag)

    if (attrs.type === "HKQuantityTypeIdentifierBodyMass") {
      const date = dateOnly(attrs.startDate)
      const value = parseFloat(attrs.value)
      if (!date || Number.isNaN(value)) continue
      const lbs = attrs.unit === "kg" ? value * 2.20462 : value
      weightByDate.set(date, Math.round(lbs * 10) / 10)
    } else if (attrs.type === "HKCategoryTypeIdentifierSleepAnalysis") {
      const value = attrs.value ?? ""
      if (!value.includes("Asleep") && value !== "HKCategoryValueSleepAnalysisInBed") continue
      const start = attrs.startDate ? new Date(attrs.startDate).getTime() : NaN
      const end = attrs.endDate ? new Date(attrs.endDate).getTime() : NaN
      if (Number.isNaN(start) || Number.isNaN(end) || end <= start) continue
      const date = dateOnly(attrs.endDate)
      if (!date) continue
      sleepMsByDate.set(date, (sleepMsByDate.get(date) ?? 0) + (end - start))
    }
  }

  const sleepHoursByDate = new Map<string, number>()
  for (const [date, ms] of sleepMsByDate) {
    sleepHoursByDate.set(date, Math.round((ms / 3600000) * 10) / 10)
  }

  return { weightByDate, sleepHoursByDate }
}

export interface ImportSummary {
  weightDays: number
  sleepDays: number
  weightWritten: number
  sleepWritten: number
}

export async function importAppleHealthData(
  xmlText: string,
  opts: { overwrite: boolean },
): Promise<ImportSummary> {
  const { weightByDate, sleepHoursByDate } = parseAppleHealthExport(xmlText)
  const dates = new Set([...weightByDate.keys(), ...sleepHoursByDate.keys()])

  let weightWritten = 0
  let sleepWritten = 0

  await db.transaction("rw", db.dailyCheckins, async () => {
    for (const date of dates) {
      const existing = await db.dailyCheckins.where("date").equals(date).first()
      const weight = weightByDate.get(date)
      const sleep = sleepHoursByDate.get(date)
      const patch: { weightLbs?: number; sleepHours?: number } = {}

      if (weight != null && (opts.overwrite || existing?.weightLbs == null)) {
        patch.weightLbs = weight
        weightWritten++
      }
      if (sleep != null && (opts.overwrite || existing?.sleepHours == null)) {
        patch.sleepHours = sleep
        sleepWritten++
      }
      if (Object.keys(patch).length === 0) continue

      if (existing?.id) {
        await db.dailyCheckins.update(existing.id, patch)
      } else {
        await db.dailyCheckins.add({ date, ...patch })
      }
    }
  })

  return { weightDays: weightByDate.size, sleepDays: sleepHoursByDate.size, weightWritten, sleepWritten }
}
