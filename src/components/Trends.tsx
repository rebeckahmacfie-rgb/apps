import { useLiveQuery } from "dexie-react-hooks"
import { useMemo, useState } from "react"
import { db, getSettings, todayStr } from "../db"
import { computeFlareFactors } from "../lib/flareAnalysis"
import { MEASUREMENT_LABELS, MEASUREMENT_SITES, type MeasurementSite } from "../types"
import { Card, SectionTitle, Select } from "./ui"
import { LineChart, PainCalendar, PairedBarChart, SimpleBarChart, type Point } from "./charts"

function lastNDates(n: number): string[] {
  const arr: string[] = []
  const d = new Date()
  d.setDate(d.getDate() - (n - 1))
  for (let i = 0; i < n; i++) {
    arr.push(todayStr(d))
    d.setDate(d.getDate() + 1)
  }
  return arr
}

function shortLabel(date: string) {
  const d = new Date(date + "T00:00:00")
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function WeightTrend() {
  const settings = useLiveQuery(() => getSettings(), [])
  const checkins = useLiveQuery(() => db.dailyCheckins.orderBy("date").toArray(), [])
  const dates = lastNDates(90)

  const points: Point[] = useMemo(() => {
    const byDate = new Map((checkins ?? []).map((c) => [c.date, c.weightLbs]))
    return dates.map((d) => ({ x: 0, y: byDate.get(d) ?? null, label: shortLabel(d) }))
  }, [checkins, dates])

  const latest = [...(checkins ?? [])].reverse().find((c) => c.weightLbs != null)

  return (
    <Card>
      <SectionTitle>Weight</SectionTitle>
      {latest && (
        <div className="mb-1 text-2xl font-bold">
          {latest.weightLbs} <span className="text-sm font-normal" style={{ color: "var(--text-muted)" }}>lbs</span>
        </div>
      )}
      <LineChart points={points} unit=" lb" goal={settings?.goalWeightLbs} goalLabel={settings?.goalWeightLbs ? `Goal ${settings.goalWeightLbs}` : undefined} />
    </Card>
  )
}

function PainCalendarCard() {
  const symptoms = useLiveQuery(() => db.symptoms.where("kind").equals("pain").toArray(), [])
  const data = useMemo(() => {
    const map = new Map<string, { date: string; maxPain?: number; isFlare: boolean }>()
    for (const s of symptoms ?? []) {
      const entry = map.get(s.date) ?? { date: s.date, isFlare: false }
      entry.maxPain = Math.max(entry.maxPain ?? 0, s.rating)
      entry.isFlare = entry.isFlare || s.isFlare
      map.set(s.date, entry)
    }
    return Array.from(map.values())
  }, [symptoms])

  return (
    <Card>
      <SectionTitle>Pain calendar · last 12 weeks</SectionTitle>
      <PainCalendar data={data} />
    </Card>
  )
}

type TimelineFactor = "pressure" | "sleep" | "fluids"

function Timeline() {
  const [factor, setFactor] = useState<TimelineFactor>("sleep")
  const dates = lastNDates(30)
  const symptoms = useLiveQuery(() => db.symptoms.where("kind").equals("pain").toArray(), [])
  const checkins = useLiveQuery(() => db.dailyCheckins.toArray(), [])
  const weather = useLiveQuery(() => db.weather.toArray(), [])
  const drinks = useLiveQuery(() => db.drinks.toArray(), [])

  const painPoints: Point[] = useMemo(() => {
    const byDate = new Map<string, number>()
    for (const s of symptoms ?? []) byDate.set(s.date, Math.max(byDate.get(s.date) ?? 0, s.rating))
    return dates.map((d) => ({ x: 0, y: byDate.has(d) ? byDate.get(d)! : null, label: shortLabel(d) }))
  }, [symptoms, dates])

  const factorPoints: Point[] = useMemo(() => {
    if (factor === "sleep") {
      const byDate = new Map((checkins ?? []).map((c) => [c.date, c.sleepHours ?? null]))
      return dates.map((d) => ({ x: 0, y: byDate.get(d) ?? null, label: shortLabel(d) }))
    }
    if (factor === "fluids") {
      const byDate = new Map<string, number>()
      for (const dr of drinks ?? []) byDate.set(dr.date, (byDate.get(dr.date) ?? 0) + (dr.ounces || 0))
      return dates.map((d) => ({ x: 0, y: byDate.has(d) ? byDate.get(d)! : null, label: shortLabel(d) }))
    }
    // pressure: falling=0, steady=1, rising=2
    const byDate = new Map((weather ?? []).map((w) => [w.date, w.pressureTrend]))
    return dates.map((d) => {
      const t = byDate.get(d)
      const y = t === "falling" ? 0 : t === "steady" ? 1 : t === "rising" ? 2 : null
      return { x: 0, y, label: shortLabel(d) }
    })
  }, [factor, checkins, drinks, weather, dates])

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <SectionTitle>Timeline</SectionTitle>
        <Select value={factor} onChange={(e) => setFactor(e.target.value as TimelineFactor)} className="w-32">
          <option value="sleep">vs. Sleep</option>
          <option value="fluids">vs. Fluids</option>
          <option value="pressure">vs. Pressure</option>
        </Select>
      </div>
      <div className="text-xs font-medium mb-1" style={{ color: "var(--series-8)" }}>
        Pain
      </div>
      <LineChart points={painPoints} color="var(--series-8)" height={110} />
      <div className="text-xs font-medium mt-3 mb-1" style={{ color: "var(--series-1)" }}>
        {factor === "sleep" ? "Sleep (hrs)" : factor === "fluids" ? "Fluids (oz)" : "Pressure (falling→rising)"}
      </div>
      <LineChart points={factorPoints} color="var(--series-1)" height={110} />
    </Card>
  )
}

function SymptomsByDose() {
  const symptoms = useLiveQuery(() => db.symptoms.where("kind").equals("pain").toArray(), [])
  const doses = useLiveQuery(() => db.glp1Doses.orderBy("timestamp").toArray(), [])

  const bars = useMemo(() => {
    if (!symptoms || !doses || doses.length === 0) return []
    const buckets = new Map<number, number[]>()
    for (const s of symptoms) {
      const target = new Date(s.date + "T00:00:00").getTime()
      let best: number | null = null
      for (const dose of doses) {
        const doseDate = new Date(dose.date + "T00:00:00").getTime()
        if (doseDate <= target) {
          const diff = Math.round((target - doseDate) / 86400000)
          if (best === null || diff < best) best = diff
        }
      }
      if (best != null && best <= 10) {
        if (!buckets.has(best)) buckets.set(best, [])
        buckets.get(best)!.push(s.rating)
      }
    }
    return Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, ratings]) => ({ label: `d${day}`, value: ratings.reduce((a, b) => a + b, 0) / ratings.length }))
  }, [symptoms, doses])

  return (
    <Card>
      <SectionTitle>Symptoms by days since dose</SectionTitle>
      <SimpleBarChart bars={bars} color="var(--series-7)" unit="avg pain" />
    </Card>
  )
}

function BodyMeasurements() {
  const measurements = useLiveQuery(() => db.bodyMeasurements.orderBy("date").toArray(), [])
  const [selected, setSelected] = useState<MeasurementSite | null>(null)

  const summary = useMemo(() => {
    if (!measurements || measurements.length === 0) return []
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 90)
    const cutoffStr = todayStr(cutoff)
    return MEASUREMENT_SITES.map((site) => {
      const withValue = measurements.filter((m) => m[site] != null)
      if (withValue.length === 0) return null
      const latest = withValue[withValue.length - 1]
      const older = withValue.filter((m) => m.date >= cutoffStr)[0] ?? withValue[0]
      const change = (latest[site] as number) - (older[site] as number)
      return { site, latest: latest[site] as number, change }
    }).filter((x): x is { site: MeasurementSite; latest: number; change: number } => x != null)
  }, [measurements])

  const totalChange = summary.reduce((sum, s) => sum + s.change, 0)

  const points: Point[] = useMemo(() => {
    if (!selected || !measurements) return []
    return measurements
      .filter((m) => m[selected] != null)
      .map((m) => ({ x: 0, y: m[selected] as number, label: shortLabel(m.date) }))
  }, [selected, measurements])

  if (!measurements || measurements.length === 0) return null

  return (
    <Card>
      <SectionTitle>Body measurements · 90 days</SectionTitle>
      <div className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
        Total change across all sites: <strong>{totalChange >= 0 ? "+" : ""}{totalChange.toFixed(1)}"</strong>
      </div>
      <div className="flex flex-col gap-1 mb-2">
        {summary.map((s) => (
          <button
            key={s.site}
            onClick={() => setSelected(s.site)}
            className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm"
            style={{ background: selected === s.site ? "var(--surface-1)" : "transparent" }}
          >
            <span>{MEASUREMENT_LABELS[s.site]}</span>
            <span style={{ color: "var(--text-secondary)" }}>
              {s.latest}" ({s.change >= 0 ? "+" : ""}
              {s.change.toFixed(1)}")
            </span>
          </button>
        ))}
      </div>
      {selected && <LineChart points={points} unit="&quot;" color="var(--series-4)" />}
    </Card>
  )
}

function FlareFactors() {
  const [analysis, setAnalysis] = useState<Awaited<ReturnType<typeof computeFlareFactors>> | null>(null)

  useLiveQuery(async () => {
    const result = await computeFlareFactors()
    setAnalysis(result)
    return result
  }, [])

  if (!analysis) return null

  if (!analysis.hasEnoughData) {
    return (
      <Card>
        <SectionTitle>What comes before flares</SectionTitle>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Log a pain rating (even 0-1 on good days) for at least 14 days to start seeing patterns. {analysis.daysLogged} logged so far.
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <SectionTitle>What comes before flares</SectionTitle>
      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
        Comparing {analysis.flareDayCount} flare days against your other logged days. Hints, not proof.
      </p>
      <PairedBarChart rows={analysis.factors.map((f) => ({ label: f.label, flareValue: f.flareValue, nonFlareValue: f.nonFlareValue, unit: f.isPercent ? "%" : ` ${f.unit}` }))} />
    </Card>
  )
}

export default function Trends() {
  return (
    <div className="px-4 pb-40 pt-4 flex flex-col gap-4">
      <h1 className="text-xl font-bold">Trends</h1>
      <WeightTrend />
      <PainCalendarCard />
      <Timeline />
      <SymptomsByDose />
      <BodyMeasurements />
      <FlareFactors />
    </div>
  )
}
