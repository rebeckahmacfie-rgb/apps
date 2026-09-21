import { useLiveQuery } from "dexie-react-hooks"
import { useEffect, useState } from "react"
import { db, getSettings, suggestNextGlp1Site, timestampFor, toTimeInputValue, todayStr } from "../db"
import {
  MEASUREMENT_LABELS,
  MEASUREMENT_SITES,
  type CycleFlow,
  type DrinkType,
  type PainType,
  type PressureTrend,
} from "../types"
import { fetchCurrentWeather } from "../lib/weather"
import { Field, FormFooter, GhostButton, RatingScale, Select, Sheet, TagPicker, TextArea, TextInput } from "./ui"

interface FormProps {
  open: boolean
  onClose: () => void
  editId?: number
  /** Target date (YYYY-MM-DD) for a NEW entry. Ignored when editing. Defaults to today. */
  date?: string
}

function TimeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="Time">
      <TextInput type="time" value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  )
}

/** Whether to show/require the time picker: always when editing, or when creating on a non-today date. */
function shouldShowTime(editId: number | undefined, targetDate: string) {
  return editId != null || targetDate !== todayStr()
}

export function FoodForm({ open, onClose, editId, date }: FormProps) {
  const targetDate = date ?? todayStr()
  const existing = useLiveQuery(() => (editId != null ? db.food.get(editId) : undefined), [editId])
  const settings = useLiveQuery(() => getSettings(), [])
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [notes, setNotes] = useState("")
  const [time, setTime] = useState("")
  const showTime = shouldShowTime(editId, targetDate)

  useEffect(() => {
    if (!open) return
    if (editId != null) {
      if (!existing) return
      setDescription(existing.description)
      setTags(existing.tags)
      setNotes(existing.notes ?? "")
      setTime(toTimeInputValue(existing.timestamp))
    } else {
      setDescription("")
      setTags([])
      setNotes("")
      setTime(targetDate !== todayStr() ? toTimeInputValue(new Date().toISOString()) : "")
    }
  }, [open, editId, existing, targetDate])

  async function save() {
    if (!description.trim()) return
    const payload = { description: description.trim(), tags, notes: notes || undefined }
    if (editId != null && existing) {
      await db.food.update(editId, { ...payload, timestamp: timestampFor(existing.date, time) })
    } else {
      await db.food.add({ date: targetDate, timestamp: timestampFor(targetDate, time), ...payload })
    }
    onClose()
  }

  async function remove() {
    if (editId != null) await db.food.delete(editId)
    onClose()
  }

  return (
    <Sheet
      open={open}
      title={editId != null ? "Edit food" : "Log food"}
      onClose={onClose}
      footer={<FormFooter onSave={save} onDelete={editId != null ? remove : undefined} />}
    >
      {showTime && <TimeField value={time} onChange={setTime} />}
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

export function DrinkForm({ open, onClose, editId, date }: FormProps) {
  const targetDate = date ?? todayStr()
  const existing = useLiveQuery(() => (editId != null ? db.drinks.get(editId) : undefined), [editId])
  const [type, setType] = useState<DrinkType>("water")
  const [ounces, setOunces] = useState(8)
  const [label, setLabel] = useState("")
  const [notes, setNotes] = useState("")
  const [time, setTime] = useState("")
  const showTime = shouldShowTime(editId, targetDate)

  useEffect(() => {
    if (!open) return
    if (editId != null) {
      if (!existing) return
      setType(existing.type)
      setOunces(existing.ounces)
      setLabel(existing.label ?? "")
      setNotes(existing.notes ?? "")
      setTime(toTimeInputValue(existing.timestamp))
    } else {
      setType("water")
      setOunces(8)
      setLabel("")
      setNotes("")
      setTime(targetDate !== todayStr() ? toTimeInputValue(new Date().toISOString()) : "")
    }
  }, [open, editId, existing, targetDate])

  async function save() {
    const payload = { type, ounces, label: label || undefined, notes: notes || undefined }
    if (editId != null && existing) {
      await db.drinks.update(editId, { ...payload, timestamp: timestampFor(existing.date, time) })
    } else {
      await db.drinks.add({ date: targetDate, timestamp: timestampFor(targetDate, time), ...payload })
    }
    onClose()
  }

  async function remove() {
    if (editId != null) await db.drinks.delete(editId)
    onClose()
  }

  return (
    <Sheet
      open={open}
      title={editId != null ? "Edit drink" : "Log drink"}
      onClose={onClose}
      footer={<FormFooter onSave={save} onDelete={editId != null ? remove : undefined} />}
    >
      {showTime && <TimeField value={time} onChange={setTime} />}
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

export function ActivityForm({ open, onClose, editId, date }: FormProps) {
  const targetDate = date ?? todayStr()
  const existing = useLiveQuery(() => (editId != null ? db.activities.get(editId) : undefined), [editId])
  const [type, setType] = useState("")
  const [durationMin, setDurationMin] = useState<number | "">("")
  const [intensity, setIntensity] = useState<number | undefined>(undefined)
  const [notes, setNotes] = useState("")
  const [time, setTime] = useState("")
  const showTime = shouldShowTime(editId, targetDate)

  useEffect(() => {
    if (!open) return
    if (editId != null) {
      if (!existing) return
      setType(existing.type)
      setDurationMin(existing.durationMin ?? "")
      setIntensity(existing.intensity)
      setNotes(existing.notes ?? "")
      setTime(toTimeInputValue(existing.timestamp))
    } else {
      setType("")
      setDurationMin("")
      setIntensity(undefined)
      setNotes("")
      setTime(targetDate !== todayStr() ? toTimeInputValue(new Date().toISOString()) : "")
    }
  }, [open, editId, existing, targetDate])

  async function save() {
    if (!type.trim()) return
    const payload = {
      type: type.trim(),
      durationMin: durationMin === "" ? undefined : Number(durationMin),
      intensity,
      notes: notes || undefined,
    }
    if (editId != null && existing) {
      await db.activities.update(editId, { ...payload, timestamp: timestampFor(existing.date, time) })
    } else {
      await db.activities.add({ date: targetDate, timestamp: timestampFor(targetDate, time), ...payload })
    }
    onClose()
  }

  async function remove() {
    if (editId != null) await db.activities.delete(editId)
    onClose()
  }

  return (
    <Sheet
      open={open}
      title={editId != null ? "Edit activity" : "Log activity"}
      onClose={onClose}
      footer={<FormFooter onSave={save} onDelete={editId != null ? remove : undefined} />}
    >
      {showTime && <TimeField value={time} onChange={setTime} />}
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

export function SymptomForm({ open, onClose, editId, date, initialFlare = false }: FormProps & { initialFlare?: boolean }) {
  const targetDate = date ?? todayStr()
  const existing = useLiveQuery(() => (editId != null ? db.symptoms.get(editId) : undefined), [editId])
  const [kind, setKind] = useState<"pain" | "general">("pain")
  const [name, setName] = useState("Pain")
  const [rating, setRating] = useState<number | undefined>(undefined)
  const [location, setLocation] = useState("")
  const [painType, setPainType] = useState<PainType>("sharp")
  const [isFlare, setIsFlare] = useState(initialFlare)
  const [notes, setNotes] = useState("")
  const [time, setTime] = useState("")
  const showTime = shouldShowTime(editId, targetDate)

  useEffect(() => {
    if (!open) return
    if (editId != null) {
      if (!existing) return
      setKind(existing.kind)
      setName(existing.name)
      setRating(existing.rating)
      setLocation(existing.location ?? "")
      setPainType(existing.painType ?? "sharp")
      setIsFlare(existing.isFlare)
      setNotes(existing.notes ?? "")
      setTime(toTimeInputValue(existing.timestamp))
    } else {
      setKind("pain")
      setName("Pain")
      setRating(undefined)
      setLocation("")
      setPainType("sharp")
      setIsFlare(initialFlare)
      setNotes("")
      setTime(targetDate !== todayStr() ? toTimeInputValue(new Date().toISOString()) : "")
    }
  }, [open, editId, existing, initialFlare, targetDate])

  async function save() {
    if (!rating) return
    const payload = {
      kind,
      name: kind === "pain" ? "Pain" : name,
      rating,
      location: kind === "pain" ? location || undefined : undefined,
      painType: kind === "pain" ? painType : undefined,
      isFlare: kind === "pain" ? isFlare : false,
      notes: notes || undefined,
    }
    if (editId != null && existing) {
      await db.symptoms.update(editId, { ...payload, timestamp: timestampFor(existing.date, time) })
    } else {
      await db.symptoms.add({ date: targetDate, timestamp: timestampFor(targetDate, time), ...payload })
    }
    onClose()
  }

  async function remove() {
    if (editId != null) await db.symptoms.delete(editId)
    onClose()
  }

  return (
    <Sheet
      open={open}
      title={editId != null ? "Edit symptom" : "Log symptom"}
      onClose={onClose}
      footer={<FormFooter onSave={save} onDelete={editId != null ? remove : undefined} />}
    >
      {showTime && <TimeField value={time} onChange={setTime} />}
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

export function PotsVitalsForm({ open, onClose, editId, date }: FormProps) {
  const targetDate = date ?? todayStr()
  const existing = useLiveQuery(() => (editId != null ? db.potsVitals.get(editId) : undefined), [editId])
  const [lyingHr, setLyingHr] = useState<number | "">("")
  const [lyingSystolic, setLyingSystolic] = useState<number | "">("")
  const [lyingDiastolic, setLyingDiastolic] = useState<number | "">("")
  const [standingHr, setStandingHr] = useState<number | "">("")
  const [standingSystolic, setStandingSystolic] = useState<number | "">("")
  const [standingDiastolic, setStandingDiastolic] = useState<number | "">("")
  const [minutesStanding, setMinutesStanding] = useState<number | "">("")
  const [notes, setNotes] = useState("")
  const [time, setTime] = useState("")
  const showTime = shouldShowTime(editId, targetDate)

  useEffect(() => {
    if (!open) return
    if (editId != null) {
      if (!existing) return
      setLyingHr(existing.lyingHr ?? "")
      setLyingSystolic(existing.lyingSystolic ?? "")
      setLyingDiastolic(existing.lyingDiastolic ?? "")
      setStandingHr(existing.standingHr ?? "")
      setStandingSystolic(existing.standingSystolic ?? "")
      setStandingDiastolic(existing.standingDiastolic ?? "")
      setMinutesStanding(existing.minutesStanding ?? "")
      setNotes(existing.notes ?? "")
      setTime(toTimeInputValue(existing.timestamp))
    } else {
      setLyingHr("")
      setLyingSystolic("")
      setLyingDiastolic("")
      setStandingHr("")
      setStandingSystolic("")
      setStandingDiastolic("")
      setMinutesStanding("")
      setNotes("")
      setTime(targetDate !== todayStr() ? toTimeInputValue(new Date().toISOString()) : "")
    }
  }, [open, editId, existing, targetDate])

  async function save() {
    const payload = {
      lyingHr: lyingHr === "" ? undefined : Number(lyingHr),
      lyingSystolic: lyingSystolic === "" ? undefined : Number(lyingSystolic),
      lyingDiastolic: lyingDiastolic === "" ? undefined : Number(lyingDiastolic),
      standingHr: standingHr === "" ? undefined : Number(standingHr),
      standingSystolic: standingSystolic === "" ? undefined : Number(standingSystolic),
      standingDiastolic: standingDiastolic === "" ? undefined : Number(standingDiastolic),
      minutesStanding: minutesStanding === "" ? undefined : Number(minutesStanding),
      notes: notes || undefined,
    }
    if (editId != null && existing) {
      await db.potsVitals.update(editId, { ...payload, timestamp: timestampFor(existing.date, time) })
    } else {
      await db.potsVitals.add({ date: targetDate, timestamp: timestampFor(targetDate, time), ...payload })
    }
    onClose()
  }

  async function remove() {
    if (editId != null) await db.potsVitals.delete(editId)
    onClose()
  }

  return (
    <Sheet
      open={open}
      title={editId != null ? "Edit POTS vitals" : "POTS vitals"}
      onClose={onClose}
      footer={<FormFooter onSave={save} onDelete={editId != null ? remove : undefined} />}
    >
      {showTime && <TimeField value={time} onChange={setTime} />}
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

export function Glp1Form({ open, onClose, editId, date }: FormProps) {
  const targetDate = date ?? todayStr()
  const existing = useLiveQuery(() => (editId != null ? db.glp1Doses.get(editId) : undefined), [editId])
  const settings = useLiveQuery(() => getSettings(), [])
  const suggestedSite = useLiveQuery(() => (editId == null ? suggestNextGlp1Site() : undefined), [open, editId])
  const [drugName, setDrugName] = useState("")
  const [doseMg, setDoseMg] = useState<number | "">("")
  const [site, setSite] = useState("")
  const [notes, setNotes] = useState("")
  const [time, setTime] = useState("")
  const showTime = shouldShowTime(editId, targetDate)

  useEffect(() => {
    if (!open) return
    if (editId != null) {
      if (!existing) return
      setDrugName(existing.drugName)
      setDoseMg(existing.doseMg ?? "")
      setSite(existing.site)
      setNotes(existing.notes ?? "")
      setTime(toTimeInputValue(existing.timestamp))
    } else {
      setDrugName("")
      setDoseMg("")
      setSite("")
      setNotes("")
      setTime(targetDate !== todayStr() ? toTimeInputValue(new Date().toISOString()) : "")
    }
  }, [open, editId, existing, targetDate])

  const effectiveSite = site || suggestedSite || ""

  async function save() {
    if (!drugName.trim() || !effectiveSite) return
    const payload = { drugName: drugName.trim(), doseMg: doseMg === "" ? undefined : Number(doseMg), site: effectiveSite, notes: notes || undefined }
    if (editId != null && existing) {
      await db.glp1Doses.update(editId, { ...payload, timestamp: timestampFor(existing.date, time) })
    } else {
      await db.glp1Doses.add({ date: targetDate, timestamp: timestampFor(targetDate, time), ...payload })
    }
    onClose()
  }

  async function remove() {
    if (editId != null) await db.glp1Doses.delete(editId)
    onClose()
  }

  return (
    <Sheet
      open={open}
      title={editId != null ? "Edit GLP-1 dose" : "Log GLP-1 dose"}
      onClose={onClose}
      footer={<FormFooter onSave={save} onDelete={editId != null ? remove : undefined} />}
    >
      {showTime && <TimeField value={time} onChange={setTime} />}
      <Field label="Medication">
        <TextInput autoFocus value={drugName} onChange={(e) => setDrugName(e.target.value)} placeholder="e.g. Zepbound, Wegovy" />
      </Field>
      <Field label="Dose (mg, optional)">
        <TextInput type="number" value={doseMg} onChange={(e) => setDoseMg(e.target.value === "" ? "" : Number(e.target.value))} />
      </Field>
      <Field label={suggestedSite ? `Injection site (suggested: ${suggestedSite})` : "Injection site"}>
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

export function DigestionForm({ open, onClose, editId, date }: FormProps) {
  const targetDate = date ?? todayStr()
  const existing = useLiveQuery(() => (editId != null ? db.digestion.get(editId) : undefined), [editId])
  const [bristolScale, setBristolScale] = useState<number | undefined>(undefined)
  const [bloating, setBloating] = useState<number | undefined>(undefined)
  const [nausea, setNausea] = useState<number | undefined>(undefined)
  const [reflux, setReflux] = useState<number | undefined>(undefined)
  const [notes, setNotes] = useState("")
  const [time, setTime] = useState("")
  const showTime = shouldShowTime(editId, targetDate)

  useEffect(() => {
    if (!open) return
    if (editId != null) {
      if (!existing) return
      setBristolScale(existing.bristolScale)
      setBloating(existing.bloating)
      setNausea(existing.nausea)
      setReflux(existing.reflux)
      setNotes(existing.notes ?? "")
      setTime(toTimeInputValue(existing.timestamp))
    } else {
      setBristolScale(undefined)
      setBloating(undefined)
      setNausea(undefined)
      setReflux(undefined)
      setNotes("")
      setTime(targetDate !== todayStr() ? toTimeInputValue(new Date().toISOString()) : "")
    }
  }, [open, editId, existing, targetDate])

  async function save() {
    const payload = { bristolScale, bloating, nausea, reflux, notes: notes || undefined }
    if (editId != null && existing) {
      await db.digestion.update(editId, { ...payload, timestamp: timestampFor(existing.date, time) })
    } else {
      await db.digestion.add({ date: targetDate, timestamp: timestampFor(targetDate, time), ...payload })
    }
    onClose()
  }

  async function remove() {
    if (editId != null) await db.digestion.delete(editId)
    onClose()
  }

  return (
    <Sheet
      open={open}
      title={editId != null ? "Edit digestion" : "Log digestion"}
      onClose={onClose}
      footer={<FormFooter onSave={save} onDelete={editId != null ? remove : undefined} />}
    >
      {showTime && <TimeField value={time} onChange={setTime} />}
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

export function BodyMeasurementsForm({ open, onClose, editId, date }: FormProps) {
  const targetDate = date ?? todayStr()
  const existing = useLiveQuery(() => (editId != null ? db.bodyMeasurements.get(editId) : undefined), [editId])
  const lastEntry = useLiveQuery(
    () => db.bodyMeasurements.orderBy("timestamp").filter((m) => m.id !== editId).last(),
    [open, editId],
  )
  const [values, setValues] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState("")
  const [time, setTime] = useState("")
  const showTime = shouldShowTime(editId, targetDate)

  useEffect(() => {
    if (!open) return
    if (editId != null) {
      if (!existing) return
      const v: Record<string, string> = {}
      for (const site of MEASUREMENT_SITES) {
        const val = existing[site]
        if (val != null) v[site] = String(val)
      }
      setValues(v)
      setNotes(existing.notes ?? "")
      setTime(toTimeInputValue(existing.timestamp))
    } else {
      setValues({})
      setNotes("")
      setTime(targetDate !== todayStr() ? toTimeInputValue(new Date().toISOString()) : "")
    }
  }, [open, editId, existing, targetDate])

  async function save() {
    const parsed: Record<string, number> = {}
    for (const site of MEASUREMENT_SITES) {
      const v = values[site]
      if (v) parsed[site] = Number(v)
    }
    if (Object.keys(parsed).length === 0) return
    if (editId != null && existing) {
      await db.bodyMeasurements.update(editId, { ...parsed, notes: notes || undefined, timestamp: timestampFor(existing.date, time) })
    } else {
      await db.bodyMeasurements.add({ date: targetDate, timestamp: timestampFor(targetDate, time), ...parsed, notes: notes || undefined })
    }
    onClose()
  }

  async function remove() {
    if (editId != null) await db.bodyMeasurements.delete(editId)
    onClose()
  }

  return (
    <Sheet
      open={open}
      title={editId != null ? "Edit body measurements" : "Body measurements"}
      onClose={onClose}
      footer={<FormFooter onSave={save} onDelete={editId != null ? remove : undefined} />}
    >
      {showTime && <TimeField value={time} onChange={setTime} />}
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

export function DailyCheckinForm({ open, onClose, date }: FormProps) {
  const targetDate = date ?? todayStr()
  const existing = useLiveQuery(() => db.dailyCheckins.where("date").equals(targetDate).first(), [targetDate, open])
  const [weightLbs, setWeightLbs] = useState<number | "">("")
  const [sleepHours, setSleepHours] = useState<number | "">("")
  const [sleepQuality, setSleepQuality] = useState<number | undefined>(undefined)
  const [energy, setEnergy] = useState<number | undefined>(undefined)
  const [mood, setMood] = useState<number | undefined>(undefined)
  const [stress, setStress] = useState<number | undefined>(undefined)
  const [cycleDay, setCycleDay] = useState<number | "">("")
  const [cycleFlow, setCycleFlow] = useState<CycleFlow>("none")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (!open) return
    if (existing) {
      setWeightLbs(existing.weightLbs ?? "")
      setSleepHours(existing.sleepHours ?? "")
      setSleepQuality(existing.sleepQuality)
      setEnergy(existing.energy)
      setMood(existing.mood)
      setStress(existing.stress)
      setCycleDay(existing.cycleDay ?? "")
      setCycleFlow(existing.cycleFlow ?? "none")
      setNotes(existing.notes ?? "")
    } else {
      setWeightLbs("")
      setSleepHours("")
      setSleepQuality(undefined)
      setEnergy(undefined)
      setMood(undefined)
      setStress(undefined)
      setCycleDay("")
      setCycleFlow("none")
      setNotes("")
    }
  }, [open, existing])

  async function save() {
    const payload = {
      date: targetDate,
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

  async function remove() {
    if (existing?.id) await db.dailyCheckins.delete(existing.id)
    onClose()
  }

  return (
    <Sheet
      open={open}
      title={targetDate === todayStr() ? "Daily check-in" : `Check-in — ${targetDate}`}
      onClose={onClose}
      footer={<FormFooter onSave={save} onDelete={existing ? remove : undefined} />}
    >
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

export function WeatherForm({ open, onClose, date }: FormProps) {
  const targetDate = date ?? todayStr()
  const existing = useLiveQuery(() => db.weather.where("date").equals(targetDate).first(), [targetDate, open])
  const settings = useLiveQuery(() => getSettings(), [open])
  const [conditions, setConditions] = useState("")
  const [highF, setHighF] = useState<number | "">("")
  const [lowF, setLowF] = useState<number | "">("")
  const [pressureTrend, setPressureTrend] = useState<PressureTrend>("steady")
  const [notes, setNotes] = useState("")
  const [autofillBusy, setAutofillBusy] = useState(false)
  const [autofillStatus, setAutofillStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (existing) {
      setConditions(existing.conditions ?? "")
      setHighF(existing.highF ?? "")
      setLowF(existing.lowF ?? "")
      setPressureTrend(existing.pressureTrend ?? "steady")
      setNotes(existing.notes ?? "")
    } else {
      setConditions("")
      setHighF("")
      setLowF("")
      setPressureTrend("steady")
      setNotes("")
    }
  }, [open, existing])

  async function autofill() {
    if (settings?.locationLat == null || settings?.locationLon == null) {
      setAutofillStatus("Set a location in Setup first.")
      return
    }
    if (targetDate !== todayStr()) {
      setAutofillStatus("Autofill only works for today's weather.")
      return
    }
    setAutofillBusy(true)
    setAutofillStatus(null)
    try {
      const w = await fetchCurrentWeather(settings.locationLat, settings.locationLon)
      setConditions(w.conditions)
      setHighF(w.highF)
      setLowF(w.lowF)
      setPressureTrend(w.pressureTrend)
    } catch {
      setAutofillStatus("Couldn't fetch weather — check your connection.")
    } finally {
      setAutofillBusy(false)
    }
  }

  async function save() {
    const payload = {
      date: targetDate,
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

  async function remove() {
    if (existing?.id) await db.weather.delete(existing.id)
    onClose()
  }

  return (
    <Sheet
      open={open}
      title={targetDate === todayStr() ? "Today's weather" : `Weather — ${targetDate}`}
      onClose={onClose}
      footer={<FormFooter onSave={save} onDelete={existing ? remove : undefined} />}
    >
      {targetDate === todayStr() && (
        <GhostButton className="w-full mb-2" onClick={autofill} disabled={autofillBusy}>
          {autofillBusy ? "Fetching…" : "Autofill from location"}
        </GhostButton>
      )}
      {autofillStatus && (
        <p className="text-xs mb-3" style={{ color: "var(--status-critical)" }}>
          {autofillStatus}
        </p>
      )}
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

export function OneTimeMedForm({ open, onClose, editId, date }: FormProps) {
  const targetDate = date ?? todayStr()
  const existing = useLiveQuery(() => (editId != null ? db.medEvents.get(editId) : undefined), [editId])
  const [name, setName] = useState("")
  const [notes, setNotes] = useState("")
  const [time, setTime] = useState("")
  const showTime = shouldShowTime(editId, targetDate)

  useEffect(() => {
    if (!open) return
    if (editId != null) {
      if (!existing) return
      setName(existing.name)
      setNotes(existing.notes ?? "")
      setTime(toTimeInputValue(existing.timestamp))
    } else {
      setName("")
      setNotes("")
      setTime(targetDate !== todayStr() ? toTimeInputValue(new Date().toISOString()) : "")
    }
  }, [open, editId, existing, targetDate])

  async function save() {
    if (!name.trim()) return
    if (editId != null && existing) {
      await db.medEvents.update(editId, {
        name: name.trim(),
        notes: notes || undefined,
        timestamp: timestampFor(existing.date, time),
      })
    } else {
      await db.medEvents.add({
        name: name.trim(),
        kind: "one-time",
        date: targetDate,
        timestamp: timestampFor(targetDate, time),
        notes: notes || undefined,
      })
    }
    onClose()
  }

  async function remove() {
    if (editId != null) await db.medEvents.delete(editId)
    onClose()
  }

  return (
    <Sheet
      open={open}
      title={editId != null ? "Edit med" : "One-time med or supplement"}
      onClose={onClose}
      footer={<FormFooter onSave={save} onDelete={editId != null ? remove : undefined} />}
    >
      {showTime && <TimeField value={time} onChange={setTime} />}
      <Field label="Name">
        <TextInput autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Benadryl, 5-day antibiotic course" />
      </Field>
      <Field label="Notes (optional)">
        <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Sheet>
  )
}
