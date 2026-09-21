import { useLiveQuery } from "dexie-react-hooks"
import { useState } from "react"
import { db, getSettings, nowIso, todayStr } from "../db"
import { fetchCurrentWeather, saveWeatherForToday } from "../lib/weather"
import type { MedDefinition } from "../types"
import { Card, GhostButton, QuickTapButton, Sheet, StatusPill } from "./ui"

type Toast = { text: string } | null

function useToast(): [Toast, (t: string) => void] {
  const [toast, setToast] = useState<Toast>(null)
  function show(text: string) {
    setToast({ text })
    setTimeout(() => setToast(null), 1600)
  }
  return [toast, show]
}

async function addDrink(type: "water" | "coffee" | "electrolytes", ounces: number, label?: string) {
  const date = todayStr()
  const timestamp = nowIso()
  await db.drinks.add({ date, timestamp, type, ounces, label })
}

async function repeatLastMeal() {
  const last = await db.food.orderBy("timestamp").last()
  if (!last) return false
  await db.food.add({
    date: todayStr(),
    timestamp: nowIso(),
    description: last.description,
    tags: last.tags,
    notes: last.notes,
  })
  return true
}

interface TodayEntry {
  id: string
  time: string
  label: string
  detail?: string
  onDelete: () => Promise<void>
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function useTodayEntries() {
  return useLiveQuery(async () => {
    const date = todayStr()
    const [food, drinks, activities, symptoms, pots, glp1, digestion, medEvents, checkins, weather, measurements] =
      await Promise.all([
        db.food.where("date").equals(date).toArray(),
        db.drinks.where("date").equals(date).toArray(),
        db.activities.where("date").equals(date).toArray(),
        db.symptoms.where("date").equals(date).toArray(),
        db.potsVitals.where("date").equals(date).toArray(),
        db.glp1Doses.where("date").equals(date).toArray(),
        db.digestion.where("date").equals(date).toArray(),
        db.medEvents.where("date").equals(date).toArray(),
        db.dailyCheckins.where("date").equals(date).toArray(),
        db.weather.where("date").equals(date).toArray(),
        db.bodyMeasurements.where("date").equals(date).toArray(),
      ])

    const entries: TodayEntry[] = []
    for (const f of food)
      entries.push({
        id: `food-${f.id}`,
        time: f.timestamp,
        label: f.description,
        detail: f.tags.join(", "),
        onDelete: async () => db.food.delete(f.id!),
      })
    for (const d of drinks)
      entries.push({
        id: `drink-${d.id}`,
        time: d.timestamp,
        label: `${d.label ?? d.type} · ${d.ounces}oz`,
        onDelete: async () => db.drinks.delete(d.id!),
      })
    for (const a of activities)
      entries.push({
        id: `act-${a.id}`,
        time: a.timestamp,
        label: a.type,
        detail: a.durationMin ? `${a.durationMin} min` : undefined,
        onDelete: async () => db.activities.delete(a.id!),
      })
    for (const s of symptoms)
      entries.push({
        id: `sym-${s.id}`,
        time: s.timestamp,
        label: `${s.name} · ${s.rating}/10${s.isFlare ? " · FLARE" : ""}`,
        detail: s.location,
        onDelete: async () => db.symptoms.delete(s.id!),
      })
    for (const p of pots)
      entries.push({
        id: `pots-${p.id}`,
        time: p.timestamp,
        label: "POTS vitals",
        detail: [
          p.lyingHr ? `lying ${p.lyingHr}bpm` : null,
          p.standingHr ? `standing ${p.standingHr}bpm` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        onDelete: async () => db.potsVitals.delete(p.id!),
      })
    for (const g of glp1)
      entries.push({
        id: `glp-${g.id}`,
        time: g.timestamp,
        label: `${g.drugName} dose`,
        detail: g.site,
        onDelete: async () => db.glp1Doses.delete(g.id!),
      })
    for (const dg of digestion)
      entries.push({
        id: `dig-${dg.id}`,
        time: dg.timestamp,
        label: "Digestion",
        detail: dg.bristolScale ? `Bristol ${dg.bristolScale}` : undefined,
        onDelete: async () => db.digestion.delete(dg.id!),
      })
    for (const m of medEvents.filter((e) => e.kind !== "missed"))
      entries.push({
        id: `med-${m.id}`,
        time: m.timestamp,
        label: m.name,
        detail: m.kind === "one-time" ? "one-time" : undefined,
        onDelete: async () => db.medEvents.delete(m.id!),
      })
    for (const c of checkins)
      entries.push({
        id: `check-${c.id}`,
        time: new Date(date + "T12:00:00").toISOString(),
        label: "Daily check-in",
        detail: c.weightLbs ? `${c.weightLbs} lbs` : undefined,
        onDelete: async () => db.dailyCheckins.delete(c.id!),
      })
    for (const w of weather)
      entries.push({
        id: `weather-${w.id}`,
        time: new Date(date + "T00:01:00").toISOString(),
        label: "Weather",
        detail: w.conditions,
        onDelete: async () => db.weather.delete(w.id!),
      })
    for (const m of measurements)
      entries.push({
        id: `meas-${m.id}`,
        time: m.timestamp,
        label: "Body measurements",
        onDelete: async () => db.bodyMeasurements.delete(m.id!),
      })

    entries.sort((a, b) => b.time.localeCompare(a.time))
    return entries
  }, [])
}

function DailyMedsCard() {
  const date = todayStr()
  const settings = useLiveQuery(() => db.settings.toCollection().first())
  const dailyMeds = useLiveQuery(
    () => db.meds.where("kind").anyOf("daily-am", "daily-pm", "daily").and((m) => m.active).sortBy("sortOrder"),
    [],
  )
  const missedToday = useLiveQuery(
    () => db.medEvents.where({ date, kind: "missed" }).toArray(),
    [date],
  )
  const takenToday = useLiveQuery(
    () => db.medEvents.where({ date, kind: "taken" }).toArray(),
    [date],
  )
  const [pickerOpen, setPickerOpen] = useState(false)

  if (!dailyMeds || dailyMeds.length === 0) return null

  const assumeScheduled = settings?.assumeScheduledDailyMeds ?? true

  async function toggleMissed(med: MedDefinition) {
    const existing = missedToday?.find((e) => e.medId === med.id)
    if (existing) {
      await db.medEvents.delete(existing.id!)
    } else {
      await db.medEvents.add({ medId: med.id, name: med.name, kind: "missed", date, timestamp: nowIso() })
    }
  }

  async function toggleTaken(med: MedDefinition) {
    const existing = takenToday?.find((e) => e.medId === med.id)
    if (existing) {
      await db.medEvents.delete(existing.id!)
    } else {
      await db.medEvents.add({ medId: med.id, name: med.name, kind: "taken", date, timestamp: nowIso() })
    }
  }

  if (!assumeScheduled) {
    return (
      <Card>
        <div className="text-sm font-semibold mb-2">Daily meds</div>
        <div className="flex flex-col gap-2">
          {dailyMeds.map((med) => {
            const taken = takenToday?.some((e) => e.medId === med.id)
            return (
              <button
                key={med.id}
                onClick={() => toggleTaken(med)}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)" }}
              >
                <span>{med.name}</span>
                <StatusPill good={!!taken} label={taken ? "Taken" : "Tap to log"} />
              </button>
            )
          })}
        </div>
      </Card>
    )
  }

  const missedCount = missedToday?.length ?? 0
  const total = dailyMeds.length
  const takenCount = total - missedCount

  return (
    <>
      <button className="w-full text-left" onClick={() => setPickerOpen(true)}>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">
                {missedCount === 0 ? "Daily meds taken" : `${takenCount} of ${total} daily meds taken`}
              </div>
              {missedCount > 0 && (
                <div className="text-xs mt-0.5" style={{ color: "var(--status-critical)" }}>
                  {missedToday!.map((m) => m.name).join(", ")} missed
                </div>
              )}
            </div>
            <StatusPill good={missedCount === 0} label={missedCount === 0 ? "✓" : `${missedCount} missed`} />
          </div>
        </Card>
      </button>
      <Sheet open={pickerOpen} title="Daily meds" onClose={() => setPickerOpen(false)}>
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
          Daily meds are assumed taken. Check anything you missed today.
        </p>
        <div className="flex flex-col gap-2">
          {dailyMeds.map((med) => {
            const missed = missedToday?.some((e) => e.medId === med.id)
            return (
              <button
                key={med.id}
                onClick={() => toggleMissed(med)}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)" }}
              >
                <span>{med.name}</span>
                <StatusPill good={!missed} label={missed ? "Missed" : "Taken"} />
              </button>
            )
          })}
        </div>
      </Sheet>
    </>
  )
}

function WeeklyMedsCard() {
  const weeklyMeds = useLiveQuery(
    () => db.meds.where("kind").equals("weekly").and((m) => m.active).sortBy("sortOrder"),
    [],
  )
  const lastEvents = useLiveQuery(async () => {
    if (!weeklyMeds) return new Map<number, string>()
    const map = new Map<number, string>()
    for (const med of weeklyMeds) {
      const last = await db.medEvents.where({ medId: med.id }).last()
      if (last) map.set(med.id!, last.timestamp)
    }
    return map
  }, [weeklyMeds])

  if (!weeklyMeds || weeklyMeds.length === 0) return null

  async function logNow(med: MedDefinition) {
    await db.medEvents.add({ medId: med.id, name: med.name, kind: "taken", date: todayStr(), timestamp: nowIso() })
  }

  return (
    <Card>
      <div className="text-sm font-semibold mb-2">Weekly</div>
      <div className="flex flex-col gap-2">
        {weeklyMeds.map((med) => {
          const lastIso = lastEvents?.get(med.id!)
          const daysSince = lastIso ? Math.floor((Date.now() - new Date(lastIso).getTime()) / 86400000) : null
          return (
            <button
              key={med.id}
              onClick={() => logNow(med)}
              className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)" }}
            >
              <span>{med.name}</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {daysSince == null ? "Log now" : daysSince === 0 ? "Today" : `${daysSince}d ago · tap to log`}
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function AsNeededMedsCard() {
  const meds = useLiveQuery(
    () => db.meds.where("kind").equals("as-needed").and((m) => m.active).sortBy("sortOrder"),
    [],
  )
  const [, showToast] = useToast()

  if (!meds || meds.length === 0) return null

  async function log(med: MedDefinition) {
    await db.medEvents.add({ medId: med.id, name: med.name, kind: "taken", date: todayStr(), timestamp: nowIso() })
    showToast(`${med.name} logged`)
  }

  return (
    <Card>
      <div className="text-sm font-semibold mb-2">As needed</div>
      <div className="flex gap-2 flex-wrap">
        {meds.map((med) => (
          <button
            key={med.id}
            onClick={() => log(med)}
            className="rounded-full border px-3 py-1.5 text-xs font-medium"
            style={{ borderColor: "var(--border)" }}
          >
            {med.name}
          </button>
        ))}
      </div>
    </Card>
  )
}

function Glp1Card({ onLog }: { onLog: () => void }) {
  const lastDose = useLiveQuery(() => db.glp1Doses.orderBy("timestamp").last(), [])
  const daysSince = lastDose ? Math.floor((Date.now() - new Date(lastDose.timestamp).getTime()) / 86400000) : null

  return (
    <button className="w-full text-left" onClick={onLog}>
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">GLP-1</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {lastDose ? `${lastDose.drugName} · ${lastDose.site} · ${daysSince}d ago` : "No doses logged yet"}
            </div>
          </div>
          <span className="text-xs font-medium" style={{ color: "var(--series-1)" }}>
            Log dose
          </span>
        </div>
      </Card>
    </button>
  )
}

export default function Today({
  onOpenForm,
}: {
  onOpenForm: (form: string) => void
}) {
  const entries = useTodayEntries()
  const settings = useLiveQuery(() => getSettings(), [])
  const [toast, showToast] = useToast()
  const [fetchingWeather, setFetchingWeather] = useState(false)

  async function handleWater() {
    await addDrink("water", 8)
    showToast("Water logged")
  }
  async function handleWater30() {
    await addDrink("water", 30)
    showToast("30oz water logged")
  }
  async function handleCoffee() {
    await addDrink("coffee", 12, "with creamer")
    showToast("Coffee logged")
  }
  async function handleElectrolytes() {
    await addDrink("electrolytes", 16, "electrolyte drink")
    showToast("Electrolytes logged")
  }
  async function handleRepeatMeal() {
    const ok = await repeatLastMeal()
    showToast(ok ? "Last meal repeated" : "No previous meal to repeat")
  }
  async function handleWeather() {
    if (settings?.locationLat == null || settings?.locationLon == null) {
      showToast("Set a location in Setup first")
      return
    }
    setFetchingWeather(true)
    try {
      const w = await fetchCurrentWeather(settings.locationLat, settings.locationLon)
      await saveWeatherForToday(w)
      showToast(`${w.highF}°/${w.lowF}°F · ${w.conditions}`)
    } catch {
      showToast("Couldn't fetch weather")
    } finally {
      setFetchingWeather(false)
    }
  }

  return (
    <div className="px-4 pb-40 pt-4 flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">Today</h1>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      <div>
        <div className="text-sm font-semibold mb-2">Quick taps</div>
        <div className="grid grid-cols-2 gap-2">
          <QuickTapButton label="Water" sub="+8 oz" onClick={handleWater} />
          <QuickTapButton label="Water (30oz)" sub="+30 oz" onClick={handleWater30} />
          <QuickTapButton label="Coffee" sub="12oz with creamer" onClick={handleCoffee} />
          <QuickTapButton label="Electrolytes" sub="+16 oz" onClick={handleElectrolytes} />
          <QuickTapButton label="Repeat last meal" onClick={handleRepeatMeal} />
          <QuickTapButton
            label={fetchingWeather ? "Fetching…" : "Weather"}
            sub={settings?.locationLabel ?? "Set location in Setup"}
            onClick={handleWeather}
          />
        </div>
      </div>

      <DailyMedsCard />
      <Glp1Card onLog={() => onOpenForm("glp1")} />
      <WeeklyMedsCard />
      <AsNeededMedsCard />

      <GhostButton onClick={() => onOpenForm("one-time-med")}>Log a one-time med or supplement</GhostButton>

      <div>
        <div className="text-sm font-semibold mb-2">Today's log</div>
        {(!entries || entries.length === 0) && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Nothing logged yet today.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {entries?.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-xl border px-3 py-2"
              style={{ borderColor: "var(--border)", background: "var(--card-surface)" }}
            >
              <div>
                <div className="text-sm font-medium">{e.label}</div>
                {e.detail && (
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {e.detail}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {fmtTime(e.time)}
                </span>
                <button
                  onClick={() => e.onDelete()}
                  className="text-xs"
                  style={{ color: "var(--status-critical)" }}
                  aria-label="Delete entry"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {toast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium text-white z-40"
          style={{ background: "var(--text-primary)" }}
        >
          {toast.text}
        </div>
      )}
    </div>
  )
}
