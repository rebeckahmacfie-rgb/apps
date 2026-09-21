import { useLiveQuery } from "dexie-react-hooks"
import { db, todayStr } from "../db"
import { BigButton, Card, SectionTitle } from "./ui"

function dayBefore(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  d.setDate(d.getDate() - 1)
  return todayStr(d)
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
}

interface FlareRow {
  id: number
  date: string
  rating: number
  location?: string
  painType?: string
  notes?: string
  dayBeforeSleep?: number
  dayBeforeFluids?: number
  dayOfPressure?: string
  dayBeforePressure?: string
  daysSinceDose: number | null
  missedMedsDayBefore: string[]
}

function useFlares() {
  return useLiveQuery(async () => {
    const list = (await db.symptoms.where("kind").equals("pain").toArray()).filter((s) => s.isFlare)
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
    const missedByDate = new Map<string, string[]>()
    for (const e of missedEvents) {
      if (!missedByDate.has(e.date)) missedByDate.set(e.date, [])
      missedByDate.get(e.date)!.push(e.name)
    }

    function daysSinceDose(dateStr: string): number | null {
      const target = new Date(dateStr + "T00:00:00").getTime()
      let best: number | null = null
      for (const dose of glp1) {
        const doseDate = new Date(dose.date + "T00:00:00").getTime()
        if (doseDate <= target) {
          const diff = Math.round((target - doseDate) / 86400000)
          if (best === null || diff < best) best = diff
        }
      }
      return best
    }

    const rows: FlareRow[] = list
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((s) => {
        const prev = dayBefore(s.date)
        return {
          id: s.id!,
          date: s.date,
          rating: s.rating,
          location: s.location,
          painType: s.painType,
          notes: s.notes,
          dayBeforeSleep: checkinByDate.get(prev)?.sleepHours,
          dayBeforeFluids: ouncesByDate.get(prev),
          dayOfPressure: weatherByDate.get(s.date)?.pressureTrend,
          dayBeforePressure: weatherByDate.get(prev)?.pressureTrend,
          daysSinceDose: daysSinceDose(s.date),
          missedMedsDayBefore: missedByDate.get(prev) ?? [],
        }
      })
    return rows
  }, [])
}

export default function Flares({ onLogFlare }: { onLogFlare: () => void }) {
  const flares = useFlares()

  return (
    <div className="px-4 pb-40 pt-4 flex flex-col gap-4">
      <h1 className="text-xl font-bold">Flares</h1>
      <BigButton className="w-full" style={{ background: "var(--status-critical)" }} onClick={onLogFlare}>
        Log a flare-up
      </BigButton>

      <div>
        <SectionTitle>History</SectionTitle>
        {(!flares || flares.length === 0) && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No flares logged yet.
          </p>
        )}
        <div className="flex flex-col gap-3">
          {flares?.map((f) => (
            <Card key={f.id}>
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold">{fmtDate(f.date)}</div>
                <div className="text-sm font-bold" style={{ color: "var(--status-critical)" }}>
                  Pain {f.rating}/10
                </div>
              </div>
              {(f.location || f.painType) && (
                <div className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                  {[f.location, f.painType].filter(Boolean).join(" · ")}
                </div>
              )}
              <div className="text-xs space-y-0.5" style={{ color: "var(--text-muted)" }}>
                <div>
                  Day before: {f.dayBeforeSleep != null ? `${f.dayBeforeSleep}h sleep` : "no sleep logged"}
                  {f.dayBeforeFluids != null ? ` · ${f.dayBeforeFluids}oz fluids` : ""}
                  {f.dayBeforePressure ? ` · pressure ${f.dayBeforePressure}` : ""}
                </div>
                {f.missedMedsDayBefore.length > 0 && <div>Missed day before: {f.missedMedsDayBefore.join(", ")}</div>}
                <div>
                  Day of: {f.dayOfPressure ? `pressure ${f.dayOfPressure}` : "no weather logged"}
                  {f.daysSinceDose != null ? ` · ${f.daysSinceDose}d since GLP-1 dose` : ""}
                </div>
              </div>
              {f.notes && (
                <div className="text-xs mt-2 italic" style={{ color: "var(--text-secondary)" }}>
                  "{f.notes}"
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
