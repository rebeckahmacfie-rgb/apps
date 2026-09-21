import { useLiveQuery } from "dexie-react-hooks"
import { useState } from "react"
import { db, getSettings, nowIso, suggestNextGlp1Site, todayStr } from "../db"
import {
  MEASUREMENT_LABELS,
  MEASUREMENT_SITES,
  type CycleFlow,
  type DrinkType,
  type PainType,
  type PressureTrend,
} from "../types"
import { BigButton, Field, RatingScale, Select, Sheet, TagPicker, TextArea, TextInput } from "./ui"

interface FormProps {
  open: boolean
  onClose: () => void
}

export function FoodForm({ open, onClose }: FormProps) {
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [notes, setNotes] = useState("")
  const settings = useLiveQuery(() => getSettings(), [])

  async function save() {
    if (!description.trim()) return
    await db.food.add({ date: todayStr(), timestamp: nowIso(), description: description.trim(), tags, notes: notes || undefined })
    setDescription("")
    setTags([])
    setNotes("")
    onClose()
  }

  return (
    <Sheet open={open} title="Log food" onClose={onClose} footer={<BigButton className="w-full" onClick={save}>Save</BigButton>}>
      <Field label="What did you eat?">
        <TextInput autoFocus value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Grilled chicken salad" />
      </Field>
      <Field label="Tags">
        <TagPicker options={settings?.lastFoodTagOptions ?? []} selected={tags} onToggle={(t) => setTags((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))} />
      </Field>
      <Field label="Notes (optional)">
        <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Sheet>
  )
}

const DRINK_TYPES: { value: DrinkType; label: string }[] = [
  { value: "water", label: "Water" },
  { value: "coffee", label: "Coffee" },
  { value: "electrolytes", label: "Electrolytes" },
  { value: "tea", label: "Tea" },
  { value: "soda", label: "Soda" },
  { value: "alcohol", label: "Alcohol" },
  { value: "other", label: "Other" },
]

export function DrinkForm({ open, onClose }: FormProps) {
  const [type, setType] = useState<DrinkType>("water")
  const [ounces, setOunces] = useState(8)
  const [label, setLabel] = useState("")
  const [notes, setNotes] = useState("")

  async function save() {
    await db.drinks.add({ date: todayStr(), timestamp: nowIso(), type, ounces, label: label || undefined, notes: notes || undefined })
    setLabel("")
    setNotes("")
    onClose()
  }

  return (
    <Sheet open={open} title="Log drink" onClose={onClose} footer={<BigButton className="w-full" onClick={save}>Save</BigButton>}>
      <Field label="Type">
        <Select value={type} onChange={(e) => setType(e.target.value as DrinkType)}>
          {DRINK_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Ounces">
        <TextInput type="number" value={ounces} onChange={(e) => setOunces(Number(e.target.value))} />
      </Field>
      <Field label="Label (optional)">
        <TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. with creamer" />
      </Field>
      <Field label="Notes (optional)">
        <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Sheet>
  )
}

export function ActivityForm({ open, onClose }: FormProps) {
  const [type, setType] = useState("")
  const [durationMin, setDurationMin] = useState<number | "">("")
  const [intensity, setIntensity] = useState<number | undefined>(undefined)
  const [notes, setNotes] = useState("")

  async function save() {
    if (!type.trim()) return
    await db.activities.add({
      date: todayStr(),
      timestamp: nowIso(),
      type: type.trim(),
      durationMin: durationMin === "" ? undefined : Number(durationMin),
      intensity,
      notes: notes || undefined,
    })
    setType("")
    setDurationMin("")
    setIntensity(undefined)
    setNotes("")
    onClose()
  }

  return (
    <Sheet open={open} title="Log activity" onClose={onClose} footer={<BigButton className="w-full" onClick={save}>Save</BigButton>}>
      <Field label="Activity">
        <TextInput autoFocus value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g. Walk, PT exercises, rest" />
      </Field>
      <Field label="Duration (minutes)">
        <TextInput type="number" value={durationMin} onChange={(e) => setDurationMin(e.target.value === "" ? "" : Number(e.target.value))} />
      </Field>
      <Field label="Intensity (1-10)">
        <RatingScale value={intensity} onChange={setIntensity} />
      </Field>
      <Field label="Notes (optional)">
        <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Sheet>
  )
}

const PAIN_TYPES: PainType[] = ["sharp", "dull", "burning", "cramping", "throbbing", "stabbing", "other"]
const GENERAL_SYMPTOMS = ["Nausea", "Fatigue", "Brain fog", "Dizziness", "Headache", "Joint pain", "Bloating", "Rash", "Other"]

export function SymptomForm({ open, onClose, initialFlare = false }: FormProps & { initialFlare?: boolean }) {
  const [kind, setKind] = useState<"pain" | "general">("pain")
  const [name, setName] = useState("Pain")
  const [rating, setRating] = useState<number | undefined>(undefined)
  const [location, setLocation] = useState("")
  const [painType, setPainType] = useState<PainType>("sharp")
  const [isFlare, setIsFlare] = useState(initialFlare)
  const [notes, setNotes] = useState("")

  async function save() {
    if (!rating) return
    await db.symptoms.add({
      date: todayStr(),
      timestamp: nowIso(),
      kind,
      name: kind === "pain" ? "Pain" : name,
      rating,
      location: kind === "pain" ? location || undefined : undefined,
      painType: kind === "pain" ? painType : undefined,
      isFlare: kind === "pain" ? isFlare : false,
      notes: notes || undefined,
    })
    setRating(undefined)
    setLocation("")
    setIsFlare(false)
    setNotes("")
    onClose()
  }

  return (
    <Sheet open={open} title="Log symptom" onClose={onClose} footer={<BigButton className="w-full" onClick={save}>Save</BigButton>}>
      <Field label="Type">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setKind("pain")}
            className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium"
            style={{ borderColor: "var(--border)", background: kind === "pain" ? "var(--series-1)" : "var(--surface-1)", color: kind === "pain" ? "#fff" : "var(--text-primary)" }}
          >
            Pain
          </button>
          <button
            type="button"
            onClick={() => setKind("general")}
            className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium"
            style={{ borderColor: "var(--border)", background: kind === "general" ? "var(--series-1)" : "var(--surface-1)", color: kind === "general" ? "#fff" : "var(--text-primary)" }}
          >
            Other symptom
          </button>
        </div>
      </Field>
      {kind === "general" && (
        <Field label="Symptom">
          <Select value={name} onChange={(e) => setName(e.target.value)}>
            {GENERAL_SYMPTOMS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Severity (1-10)">
        <RatingScale value={rating} onChange={setRating} />
      </Field>
      {kind === "pain" && (
        <>
          <Field label="Location">
            <TextInput value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. lower abdomen, lower back" />
          </Field>
          <Field label="Pain type">
            <Select value={painType} onChange={(e) => setPainType(e.target.value as PainType)}>
              {PAIN_TYPES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
          <label className="flex items-center gap-2 mb-3">
            <input type="checkbox" checked={isFlare} onChange={(e) => setIsFlare(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm font-medium">This is a flare-up</span>
          </label>
        </>
      )}
      <Field label="Notes (optional)">
        <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Sheet>
  )
}

export function PotsVitalsForm({ open, onClose }: FormProps) {
  const [lyingHr, setLyingHr] = useState<number | "">("")
  const [lyingSystolic, setLyingSystolic] = useState<number | "">("")
  const [lyingDiastolic, setLyingDiastolic] = useState<number | "">("")
  const [standingHr, setStandingHr] = useState<number | "">("")
  const [standingSystolic, setStandingSystolic] = useState<number | "">("")
  const [standingDiastolic, setStandingDiastolic] = useState<number | "">("")
  const [minutesStanding, setMinutesStanding] = useState<number | "">("")
  const [notes, setNotes] = useState("")

  async function save() {
    await db.potsVitals.add({
      date: todayStr(),
      timestamp: nowIso(),
      lyingHr: lyingHr === "" ? undefined : Number(lyingHr),
      lyingSystolic: lyingSystolic === "" ? undefined : Number(lyingSystolic),
      lyingDiastolic: lyingDiastolic === "" ? undefined : Number(lyingDiastolic),
      standingHr: standingHr === "" ? undefined : Number(standingHr),
      standingSystolic: standingSystolic === "" ? undefined : Number(standingSystolic),
      standingDiastolic: standingDiastolic === "" ? undefined : Number(standingDiastolic),
      minutesStanding: minutesStanding === "" ? undefined : Number(minutesStanding),
      notes: notes || undefined,
    })
    onClose()
  }

  return (
    <Sheet open={open} title="POTS vitals" onClose={onClose} footer={<BigButton className="w-full" onClick={save}>Save</BigButton>}>
      <div className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
        LYING
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Field label="HR"><TextInput type="number" value={lyingHr} onChange={(e) => setLyingHr(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
        <Field label="Systolic"><TextInput type="number" value={lyingSystolic} onChange={(e) => setLyingSystolic(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
        <Field label="Diastolic"><TextInput type="number" value={lyingDiastolic} onChange={(e) => setLyingDiastolic(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
      </div>
      <div className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
        STANDING
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Field label="HR"><TextInput type="number" value={standingHr} onChange={(e) => setStandingHr(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
        <Field label="Systolic"><TextInput type="number" value={standingSystolic} onChange={(e) => setStandingSystolic(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
        <Field label="Diastolic"><TextInput type="number" value={standingDiastolic} onChange={(e) => setStandingDiastolic(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
      </div>
      <Field label="Minutes standing (optional)">
        <TextInput type="number" value={minutesStanding} onChange={(e) => setMinutesStanding(e.target.value === "" ? "" : Number(e.target.value))} />
      </Field>
      <Field label="Notes (optional)">
        <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Sheet>
  )
}

export function Glp1Form({ open, onClose }: FormProps) {
  const settings = useLiveQuery(() => getSettings(), [])
  const suggestedSite = useLiveQuery(() => suggestNextGlp1Site(), [open])
  const [drugName, setDrugName] = useState("")
  const [doseMg, setDoseMg] = useState<number | "">("")
  const [site, setSite] = useState("")
  const [notes, setNotes] = useState("")

  const effectiveSite = site || suggestedSite || ""

  async function save() {
    if (!drugName.trim() || !effectiveSite) return
    await db.glp1Doses.add({
      date: todayStr(),
      timestamp: nowIso(),
      drugName: drugName.trim(),
      doseMg: doseMg === "" ? undefined : Number(doseMg),
      site: effectiveSite,
      notes: notes || undefined,
    })
    setDoseMg("")
    setSite("")
    setNotes("")
    onClose()
  }

  return (
    <Sheet open={open} title="Log GLP-1 dose" onClose={onClose} footer={<BigButton className="w-full" onClick={save}>Save</BigButton>}>
      <Field label="Medication">
        <TextInput autoFocus value={drugName} onChange={(e) => setDrugName(e.target.value)} placeholder="e.g. Zepbound, Wegovy" />
      </Field>
      <Field label="Dose (mg, optional)">
        <TextInput type="number" value={doseMg} onChange={(e) => setDoseMg(e.target.value === "" ? "" : Number(e.target.value))} />
      </Field>
      <Field label={`Injection site${suggestedSite ? ` (suggested: ${suggestedSite})` : ""}`}>
        <Select value={effectiveSite} onChange={(e) => setSite(e.target.value)}>
          {(settings?.glp1Sites ?? []).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Notes (optional)">
        <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Sheet>
  )
}

export function DigestionForm({ open, onClose }: FormProps) {
  const [bristolScale, setBristolScale] = useState<number | undefined>(undefined)
  const [bloating, setBloating] = useState<number | undefined>(undefined)
  const [nausea, setNausea] = useState<number | undefined>(undefined)
  const [reflux, setReflux] = useState<number | undefined>(undefined)
  const [notes, setNotes] = useState("")

  async function save() {
    await db.digestion.add({ date: todayStr(), timestamp: nowIso(), bristolScale, bloating, nausea, reflux, notes: notes || undefined })
    onClose()
  }

  return (
    <Sheet open={open} title="Log digestion" onClose={onClose} footer={<BigButton className="w-full" onClick={save}>Save</BigButton>}>
      <Field label="Bristol scale (1-7)">
        <RatingScale value={bristolScale} onChange={setBristolScale} max={7} />
      </Field>
      <Field label="Bloating (1-10)">
        <RatingScale value={bloating} onChange={setBloating} />
      </Field>
      <Field label="Nausea (1-10)">
        <RatingScale value={nausea} onChange={setNausea} />
      </Field>
      <Field label="Reflux (1-10)">
        <RatingScale value={reflux} onChange={setReflux} />
      </Field>
      <Field label="Notes (optional)">
        <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Sheet>
  )
}

export function BodyMeasurementsForm({ open, onClose }: FormProps) {
  const lastEntry = useLiveQuery(() => db.bodyMeasurements.orderBy("timestamp").last(), [open])
  const [values, setValues] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState("")

  async function save() {
    const parsed: Record<string, number> = {}
    for (const site of MEASUREMENT_SITES) {
      const v = values[site]
      if (v) parsed[site] = Number(v)
    }
    if (Object.keys(parsed).length === 0) return
    await db.bodyMeasurements.add({ date: todayStr(), timestamp: nowIso(), ...parsed, notes: notes || undefined })
    setValues({})
    setNotes("")
    onClose()
  }

  return (
    <Sheet open={open} title="Body measurements" onClose={onClose} footer={<BigButton className="w-full" onClick={save}>Save</BigButton>}>
      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
        Inches. Fill in only what you measured.
      </p>
      {MEASUREMENT_SITES.map((site) => (
        <Field key={site} label={`${MEASUREMENT_LABELS[site]}${lastEntry?.[site] ? ` · last ${lastEntry[site]}"` : ""}`}>
          <TextInput
            type="number"
            step="0.1"
            value={values[site] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [site]: e.target.value }))}
          />
        </Field>
      ))}
      <Field label="Notes (optional)">
        <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Sheet>
  )
}

const CYCLE_FLOWS: CycleFlow[] = ["none", "spotting", "light", "medium", "heavy"]

export function DailyCheckinForm({ open, onClose }: FormProps) {
  const date = todayStr()
  const existing = useLiveQuery(() => db.dailyCheckins.where("date").equals(date).first(), [date, open])
  const [weightLbs, setWeightLbs] = useState<number | "">("")
  const [sleepHours, setSleepHours] = useState<number | "">("")
  const [sleepQuality, setSleepQuality] = useState<number | undefined>(undefined)
  const [energy, setEnergy] = useState<number | undefined>(undefined)
  const [mood, setMood] = useState<number | undefined>(undefined)
  const [stress, setStress] = useState<number | undefined>(undefined)
  const [cycleDay, setCycleDay] = useState<number | "">("")
  const [cycleFlow, setCycleFlow] = useState<CycleFlow>("none")
  const [notes, setNotes] = useState("")

  async function save() {
    const payload = {
      date,
      weightLbs: weightLbs === "" ? undefined : Number(weightLbs),
      sleepHours: sleepHours === "" ? undefined : Number(sleepHours),
      sleepQuality,
      energy,
      mood,
      stress,
      cycleDay: cycleDay === "" ? undefined : Number(cycleDay),
      cycleFlow,
      notes: notes || undefined,
    }
    if (existing?.id) {
      await db.dailyCheckins.update(existing.id, payload)
    } else {
      await db.dailyCheckins.add(payload)
    }
    onClose()
  }

  return (
    <Sheet open={open} title="Daily check-in" onClose={onClose} footer={<BigButton className="w-full" onClick={save}>Save</BigButton>}>
      <Field label="Weight (lbs)">
        <TextInput type="number" step="0.1" value={weightLbs} onChange={(e) => setWeightLbs(e.target.value === "" ? "" : Number(e.target.value))} />
      </Field>
      <Field label="Sleep (hours)">
        <TextInput type="number" step="0.1" value={sleepHours} onChange={(e) => setSleepHours(e.target.value === "" ? "" : Number(e.target.value))} />
      </Field>
      <Field label="Sleep quality (1-10)">
        <RatingScale value={sleepQuality} onChange={setSleepQuality} />
      </Field>
      <Field label="Energy (1-10)">
        <RatingScale value={energy} onChange={setEnergy} />
      </Field>
      <Field label="Mood (1-10)">
        <RatingScale value={mood} onChange={setMood} />
      </Field>
      <Field label="Stress (1-10)">
        <RatingScale value={stress} onChange={setStress} />
      </Field>
      <Field label="Cycle day (optional)">
        <TextInput type="number" value={cycleDay} onChange={(e) => setCycleDay(e.target.value === "" ? "" : Number(e.target.value))} />
      </Field>
      <Field label="Cycle flow">
        <Select value={cycleFlow} onChange={(e) => setCycleFlow(e.target.value as CycleFlow)}>
          {CYCLE_FLOWS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Notes (optional)">
        <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Sheet>
  )
}

const PRESSURE_TRENDS: PressureTrend[] = ["falling", "steady", "rising"]

export function WeatherForm({ open, onClose }: FormProps) {
  const date = todayStr()
  const existing = useLiveQuery(() => db.weather.where("date").equals(date).first(), [date, open])
  const [conditions, setConditions] = useState("")
  const [highF, setHighF] = useState<number | "">("")
  const [lowF, setLowF] = useState<number | "">("")
  const [pressureTrend, setPressureTrend] = useState<PressureTrend>("steady")
  const [notes, setNotes] = useState("")

  async function save() {
    const payload = {
      date,
      conditions: conditions || undefined,
      highF: highF === "" ? undefined : Number(highF),
      lowF: lowF === "" ? undefined : Number(lowF),
      pressureTrend,
      notes: notes || undefined,
    }
    if (existing?.id) {
      await db.weather.update(existing.id, payload)
    } else {
      await db.weather.add(payload)
    }
    onClose()
  }

  return (
    <Sheet open={open} title="Today's weather" onClose={onClose} footer={<BigButton className="w-full" onClick={save}>Save</BigButton>}>
      <Field label="Conditions">
        <TextInput value={conditions} onChange={(e) => setConditions(e.target.value)} placeholder="e.g. Overcast, rain" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="High (°F)"><TextInput type="number" value={highF} onChange={(e) => setHighF(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
        <Field label="Low (°F)"><TextInput type="number" value={lowF} onChange={(e) => setLowF(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
      </div>
      <Field label="Barometric pressure">
        <Select value={pressureTrend} onChange={(e) => setPressureTrend(e.target.value as PressureTrend)}>
          {PRESSURE_TRENDS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Notes (optional)">
        <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Sheet>
  )
}

export function OneTimeMedForm({ open, onClose }: FormProps) {
  const [name, setName] = useState("")
  const [notes, setNotes] = useState("")

  async function save() {
    if (!name.trim()) return
    await db.medEvents.add({ name: name.trim(), kind: "one-time", date: todayStr(), timestamp: nowIso(), notes: notes || undefined })
    setName("")
    setNotes("")
    onClose()
  }

  return (
    <Sheet open={open} title="One-time med or supplement" onClose={onClose} footer={<BigButton className="w-full" onClick={save}>Save</BigButton>}>
      <Field label="Name">
        <TextInput autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Benadryl, 5-day antibiotic course" />
      </Field>
      <Field label="Notes (optional)">
        <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Sheet>
  )
}
