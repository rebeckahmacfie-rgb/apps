import { db, todayStr } from "../db"

export interface FlareFactorResult {
  key: string
  label: string
  flareValue: number
  nonFlareValue: number
  unit: string
  isPercent: boolean
  flareCount: number
  nonFlareCount: number
  direction: "higher" | "lower"
}

export interface FlareAnalysis {
  hasEnoughData: boolean
  daysLogged: number
  flareDayCount: number
  factors: FlareFactorResult[]
}

const MIN_DAYS_LOGGED = 14

function dayBefore(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  d.setDate(d.getDate() - 1)
  return todayStr(d)
}

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : NaN
}

function pct(bools: boolean[]): number {
  return bools.length ? (bools.filter(Boolean).length / bools.length) * 100 : NaN
}

export async function computeFlareFactors(): Promise<FlareAnalysis> {
  const painEntries = await db.symptoms.where("kind").equals("pain").toArray()
  const dateSet = new Set(painEntries.map((e) => e.date))
  const daysLogged = dateSet.size

  if (daysLogged < MIN_DAYS_LOGGED) {
    return { hasEnoughData: false, daysLogged, flareDayCount: 0, factors: [] }
  }

  const flareDates = new Set(painEntries.filter((e) => e.isFlare).map((e) => e.date))
  const allDates = Array.from(dateSet)

  const [checkins, weather, drinks, glp1, missedEvents] = await Promise.all([
    db.dailyCheckins.toArray(),
    db.weather.toArray(),
    db.drinks.toArray(),
    db.glp1Doses.orderBy("timestamp").toArray(),
    db.medEvents.where("kind").equals("missed").toArray(),
  ])

  const checkinByDate = new Map(checkins.map((c) => [c.date, c]))
  const weatherByDate = new Map(weather.map((w) => [w.date, w]))
  const ouncesByDate = new Map<string, number>()
  for (const d of drinks) ouncesByDate.set(d.date, (ouncesByDate.get(d.date) || 0) + (d.ounces || 0))
  const missedDatesSet = new Set(missedEvents.map((e) => e.date))

  function daysSinceDose(dateStr: string): number | null {
    const target = new Date(dateStr + "T00:00:00").getTime()
    let best: number | null = null
    for (const dose of glp1) {
      const doseDate = new Date(dose.date + "T00:00:00").getTime()
      if (doseDate <= target) {
        const diffDays = Math.round((target - doseDate) / 86400000)
        if (best === null || diffDays < best) best = diffDays
      }
    }
    return best
  }

  const rows = allDates.map((date) => {
    const prev = dayBefore(date)
    const checkin = checkinByDate.get(prev)
    const w = weatherByDate.get(prev)
    return {
      date,
      isFlare: flareDates.has(date),
      sleepHours: checkin?.sleepHours,
      fluidOunces: ouncesByDate.get(prev),
      missedMed: missedDatesSet.has(prev),
      pressureFalling: w?.pressureTrend === "falling",
      daysSinceDose: daysSinceDose(date),
    }
  })

  const flareRows = rows.filter((r) => r.isFlare)
  const nonFlareRows = rows.filter((r) => !r.isFlare)

  const factors: FlareFactorResult[] = []

  function pushNumeric(
    key: string,
    label: string,
    unit: string,
    pick: (r: (typeof rows)[number]) => number | null | undefined,
    direction: "higher" | "lower",
  ) {
    const f = flareRows.map(pick).filter((x): x is number => x != null)
    const n = nonFlareRows.map(pick).filter((x): x is number => x != null)
    if (f.length < 3 || n.length < 3) return
    factors.push({
      key,
      label,
      flareValue: avg(f),
      nonFlareValue: avg(n),
      unit,
      isPercent: false,
      flareCount: f.length,
      nonFlareCount: n.length,
      direction,
    })
  }

  function pushBool(
    key: string,
    label: string,
    pick: (r: (typeof rows)[number]) => boolean,
  ) {
    const f = flareRows.map(pick)
    const n = nonFlareRows.map(pick)
    if (f.length < 3 || n.length < 3) return
    factors.push({
      key,
      label,
      flareValue: pct(f),
      nonFlareValue: pct(n),
      unit: "%",
      isPercent: true,
      flareCount: f.length,
      nonFlareCount: n.length,
      direction: "higher",
    })
  }

  pushNumeric("sleep", "Sleep the night before", "hrs", (r) => r.sleepHours, "lower")
  pushNumeric("fluids", "Fluids the day before", "oz", (r) => r.fluidOunces, "lower")
  pushNumeric("daysSinceDose", "Days since GLP-1 dose", "days", (r) => r.daysSinceDose, "lower")
  pushBool("pressureFalling", "Barometric pressure falling the day before", (r) => r.pressureFalling)
  pushBool("missedMed", "A daily med was missed the day before", (r) => r.missedMed)

  // Rank by relative effect size (normalized gap), biggest divergence first.
  factors.sort((a, b) => {
    const scoreA = Math.abs(a.flareValue - a.nonFlareValue) / (Math.abs(a.nonFlareValue) || 1)
    const scoreB = Math.abs(b.flareValue - b.nonFlareValue) / (Math.abs(b.nonFlareValue) || 1)
    return scoreB - scoreA
  })

  return { hasEnoughData: true, daysLogged, flareDayCount: flareDates.size, factors }
}
