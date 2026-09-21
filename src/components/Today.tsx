import { useLiveQuery } from "dexie-react-hooks"
import { useState } from "react"
import { db, getSettings, timestampFor, todayStr } from "../db"
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
  await db.drinks.add({ date, timestamp: timestampFor(date, ""), type, ounces, label })
}

async function repeatLastMeal() {
  const last = await db.food.orderBy("timestamp").last()
  if (!last) return false
  const date = todayStr()
  await db.food.add({
    date,
    timestamp: timestampFor(date, ""),
    description: last.description,
    tags: last.tags,
    notes: last.notes,
  })
  return true
}

interface DayEntry {
  id: string
  time: string
  label: string
  detail?: string
  formType: string
  recordId: number
  onDelete: () => Promise<void>
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function useEntriesForDate(date: string) {
  return useLiveQuery(async () => {
    const [food, drinks, activities, symptoms, pots, glp1, medEvents, checkins, weather, measurements] =
      await Promise.all([
        db.food.where("date").equals(date).toArray(),
        db.drinks.where("date").equals(date).toArray(),
        db.activities.where("date").equals(date).toArray(),
        db.symptoms.where("date").equals(date).toArray(),
        db.potsVitals.where("date").equals(date).toArray(),
        db.glp1Doses.where("date").equals(date).toArray(),
        db.medEvents.where("date").equals(date).toArray(),
        db.dailyCheckins.where("date").equals(date).toArray(),
        db.weather.where("date").equals(date).toArray(),
        db.bodyMeasurements.where("date").equals(date).toArray(),
      ])

    const entries: DayEntry[] = []
    for (const f of food)
      entries.push({
        id: `food-${f.id}`,
        time: f.timestamp,
        label: f.description,
        detail: f.tags.join(", "),
        formType: "food",
        recordId: f.id!,
        onDelete: async () => db.food.delete(f.id!),
      })
    for (const d of drinks)
      entries.push({
        id: `drink-${d.id}`,
        time: d.timestamp,
        label: `${d.label ?? d.type} · ${d.ounces}oz`,
        formType: "drink",
        recordId: d.id!,
        onDelete: async () => db.drinks.delete(d.id!),
      })
    for (const a of activities)
      entries.push({
        id: `act-${a.id}`,
        time: a.timestamp,
        label: a.type,
        detail: a.durationMin ? `${a.durationMin} min` : undefined,
        formType: "activity",
        recordId: a.id!,
        onDelete: async () => db.activities.delete(a.id!),
      })
    for (const s of symptoms)
      entries.push({
        id: `sym-${s.id}`,
        time: s.timestamp,
        label:
          s.kind === "digestion"
            ? `Digestion · Bristol ${s.rating}`
            : `${s.name} · ${s.rating}/10${s.isFlare ? " · FLARE" : ""}`,
        detail:
          s.kind === "digestion"
            ? [s.bloating ? `bloating ${s.bloating}` : null, s.nausea ? `nausea ${s.nausea}` : null, s.reflux ? `reflux ${s.reflux}` : null]
                .filter(Boolean)
                .join(" · ")
            : s.location,
        formType: "symptom",
        recordId: s.id!,
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
        formType: "pots",
        recordId: p.id!,
        onDelete: async () => db.potsVitals.delete(p.id!),
      })
    for (const g of glp1)
      entries.push({
        id: `glp-${g.id}`,
        time: g.timestamp,
        label: `${g.drugName} dose`,
        detail: g.site,
        formType: "glp1",
        recordId: g.id!,
        onDelete: async () => db.glp1Doses.delete(g.id!),
      })
    for (const m of medEvents.filter((e) => e.kind !== "missed"))
      entries.push({
        id: `med-${m.id}`,
        time: m.timestamp,
        label: m.name,
        detail: m.kind === "one-time" ? "one-time" : undefined,
        formType: "one-time-med",
        recordId: m.id!,
        onDelete: async () => db.medEvents.delete(m.id!),
      })
    for (const c of checkins)
      entries.push({
        id: `check-${c.id}`,
        time: new Date(date + "T12:00:00").toISOString(),
        label: "Daily check-in",
        detail: c.weightLbs ? `${c.weightLbs} lbs` : undefined,
        formType: "checkin",
        recordId: c.id!,
        onDelete: async () => db.dailyCheckins.delete(c.id!),
      })
    for (const w of weather)
      entries.push({
        id: `weather-${w.id}`,
        time: new Date(date + "T00:01:00").toISOString(),
        label: "Weather",
        detail: w.conditions,
        formType: "weather",
        recordId: w.id!,
        onDelete: async () => db.weather.delete(w.id!),
      })
    for (const m of measurements)
      entries.push({
        id: `meas-${m.id}`,
        time: m.timestamp,
        label: "Body measurements",
        formType: "measurements",
        recordId: m.id!,
        onDelete: async () => db.bodyMeasurements.delete(m.id!),
      })

    entries.sort((a, b) => b.time.localeCompare(a.time))
    return entries
  }, [date])
}

function DailyMedsCard({ date }: { date: string }) {
  const settings = useLiveQuery(() => db.settings.toCollection().first())
  const dailyMeds = useLiveQuery(
    () => db.meds.where("kind").anyOf("daily-am", "daily-pm", "daily").and((m) => m.active).sortBy("sortOrder"),
    [],
  )
  const missedForDate = useLiveQuery(() => db.medEvents.where({ date, kind: "missed" }).toArray(), [date])
  const takenForDate = useLiveQuery(() => db.medEvents.where({ date, kind: "taken" }).toArray(), [date])
  const [pickerOpen, setPickerOpen] = useState(false)

  if (!dailyMeds || dailyMeds.length === 0) return null

  const assumeScheduled = settings?.assumeScheduledDailyMeds ?? true

  async function toggleMissed(med: MedDefinition) {
    const existing = missedForDate?.find((e) => e.medId === med.id)
    if (existing) {
      await db.medEvents.delete(existing.id!)
    } else {
      await db.medEvents.add({ medId: med.id, name: med.name, kind: "missed", date, timestamp: timestampFor(date, "") })
    }
  }

  async function toggleTaken(med: MedDefinition) {
    const existing = takenForDate?.find((e) => e.medId === med.id)
    if (existing) {
      await db.medEvents.delete(existing.id!)
    } else {
      await db.medEvents.add({ medId: med.id, name: med.name, kind: "taken", date, timestamp: timestampFor(date, "") })
    }
  }

  if (!assumeScheduled) {
    return (
      <Card>
        <div className="text-sm font-semibold mb-2">Daily Meds</div>
        <div className="flex flex-col gap-2">
          {dailyMeds.map((med) => {
            const taken = takenForDate?.some((e) => e.medId === med.id)
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

  const missedCount = missedForDate?.length ?? 0
  const total = dailyMeds.length
  const takenCount = total - missedCount

  return (
    <>
      <button className="w-full text-left" onClick={() => setPickerOpen(true)}>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">
                {missedCount === 0 ? "Daily Meds Taken" : `${takenCount} of ${total} Daily Meds Taken`}
              </div>
              {missedCount > 0 && (
                <div className="text-xs mt-0.5" style={{ color: "var(--status-critical)" }}>
                  {missedForDate!.map((m) => m.name).join(", ")} missed
                </div>
              )}
            </div>
            <StatusPill good={missedCount === 0} label={missedCount === 0 ? "✓" : `${missedCount} missed`} />
          </div>
        </Card>
      </button>
      <Sheet open={pickerOpen} title="Daily Meds" onClose={() => setPickerOpen(false)}>
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
          Daily meds are assumed taken. Check anything that was missed.
        </p>
        <div className="flex flex-col gap-2">
          {dailyMeds.map((med) => {
            const missed = missedForDate?.some((e) => e.medId === med.id)
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

function WeeklyMedsCard({ date }: { date: string }) {
  const isToday = date === todayStr()
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

  async function logForDate(med: MedDefinition) {
    await db.medEvents.add({ medId: med.id, name: med.name, kind: "taken", date, timestamp: timestampFor(date, "") })
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
              onClick={() => logForDate(med)}
              className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)" }}
            >
              <span>{med.name}</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {daysSince == null
                  ? isToday
                    ? "Log now"
                    : "Log for this day"
                  : `${daysSince}d ago${isToday ? " · tap to log" : " · tap to log for this day"}`}
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function AsNeededMedsCard({ date }: { date: string }) {
  const isToday = date === todayStr()
  const meds = useLiveQuery(
    () => db.meds.where("kind").equals("as-needed").and((m) => m.active).sortBy("sortOrder"),
    [],
  )
  const [, showToast] = useToast()

  if (!meds || meds.length === 0) return null

  async function log(med: MedDefinition) {
    await db.medEvents.add({ medId: med.id, name: med.name, kind: "taken", date, timestamp: timestampFor(date, "") })
    showToast(`${med.name} logged${isToday ? "" : " for this day"}`)
  }

  return (
    <Card>
      <div className="text-sm font-semibold mb-2">As Needed</div>
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
            Log Dose
          </span>
        </div>
      </Card>
    </button>
  )
}

function DateNav({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const isToday = date === todayStr()

  function shift(deltaDays: number) {
    const d = new Date(date + "T00:00:00")
    d.setDate(d.getDate() + deltaDays)
    const next = todayStr(d)
    if (next > todayStr()) return
    onChange(next)
  }

  function label() {
    if (isToday) return "Today"
    const d = new Date(date + "T00:00:00")
    const y = new Date()
    y.setDate(y.getDate() - 1)
    if (date === todayStr(y)) return "Yesterday"
    return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
  }

  return (
    <div className="flex items-center justify-between">
      <button
        onClick={() => shift(-1)}
        aria-label="Previous day"
        className="w-9 h-9 rounded-full flex items-center justify-center text-xl shrink-0"
        style={{ color: "var(--text-secondary)" }}
      >
        ‹
      </button>
      <div className="flex flex-col items-center gap-0.5">
        <h1 className="text-xl font-bold">{label()}</h1>
        <input
          type="date"
          value={date}
          max={todayStr()}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="text-xs bg-transparent text-center"
          style={{ color: "var(--text-muted)" }}
        />
      </div>
      <button
        onClick={() => shift(1)}
        disabled={isToday}
        aria-label="Next day"
        className="w-9 h-9 rounded-full flex items-center justify-center text-xl shrink-0"
        style={{ color: isToday ? "var(--gridline)" : "var(--text-secondary)" }}
      >
        ›
      </button>
    </div>
  )
}

export default function Today({
  onOpenForm,
  date,
  onDateChange,
}: {
  onOpenForm: (form: string, editId?: number) => void
  date: string
  onDateChange: (d: string) => void
}) {
  const isToday = date === todayStr()
  const entries = useEntriesForDate(date)
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
      <DateNav date={date} onChange={onDateChange} />

      {!isToday && (
        <button onClick={() => onDateChange(todayStr())} className="text-xs font-medium self-center -mt-3" style={{ color: "var(--series-1)" }}>
          Jump to today
        </button>
      )}

      {isToday ? (
        <div>
          <div className="text-sm font-semibold mb-2">Quick Taps</div>
          <div className="grid grid-cols-2 gap-2">
            <QuickTapButton label="Water" sub="+8 oz" onClick={handleWater} />
            <QuickTapButton label="Water (30 oz)" sub="+30 oz" onClick={handleWater30} />
            <QuickTapButton label="Coffee" sub="12oz with creamer" onClick={handleCoffee} />
            <QuickTapButton label="Electrolytes" sub="+16 oz" onClick={handleElectrolytes} />
            <QuickTapButton label="Repeat Last Meal" onClick={handleRepeatMeal} />
            <QuickTapButton
              label={fetchingWeather ? "Fetching…" : "Weather"}
              sub={settings?.locationLabel ?? "Set location in Setup"}
              onClick={handleWeather}
            />
          </div>
        </div>
      ) : (
        <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
          Use the + button to add entries for this day.
        </p>
      )}

      <DailyMedsCard date={date} />
      <Glp1Card onLog={() => onOpenForm("glp1")} />
      <WeeklyMedsCard date={date} />
      <AsNeededMedsCard date={date} />

      <GhostButton onClick={() => onOpenForm("one-time-med")}>Log A One-Time Med Or Supplement</GhostButton>

      <div>
        <div className="text-sm font-semibold mb-2 text-center">{isToday ? "Today's Log" : "Log For This Day"}</div>
        {(!entries || entries.length === 0) && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {isToday ? "Nothing logged yet today." : "Nothing logged for this day."}
          </p>
        )}
        <div className="flex flex-col gap-2">
          {entries?.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-xl border px-3 py-2"
              style={{ borderColor: "var(--border)", background: "var(--card-surface)" }}
            >
              <button className="text-left flex-1" onClick={() => onOpenForm(e.formType, e.recordId)}>
                <div className="text-sm font-medium">{e.label}</div>
                {e.detail && (
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {e.detail}
                  </div>
                )}
              </button>
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
