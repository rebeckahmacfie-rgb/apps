import { useLiveQuery } from "dexie-react-hooks"
import { useState, type ChangeEvent } from "react"
import { db, getSettings, updateSettings } from "../db"
import { exportAllCsv, exportDailySummaryCsv, exportFullBackupJson } from "../lib/export"
import { geocodeCity, getCurrentPosition } from "../lib/weather"
import { importAppleHealthData } from "../lib/appleHealthImport"
import type { MedDefinition, MedKind } from "../types"
import { BigButton, Card, Field, GhostButton, SectionTitle, Select, TextInput } from "./ui"

const KIND_LABELS: Record<MedKind, string> = {
  "daily-am": "Daily · morning",
  "daily-pm": "Daily · evening",
  daily: "Daily",
  weekly: "Weekly",
  "as-needed": "As needed",
}

function MedsManager() {
  const meds = useLiveQuery(() => db.meds.orderBy("sortOrder").toArray(), [])
  const [name, setName] = useState("")
  const [kind, setKind] = useState<MedKind>("daily")

  async function addMed() {
    if (!name.trim()) return
    const count = await db.meds.count()
    await db.meds.add({ name: name.trim(), kind, active: true, sortOrder: count })
    setName("")
  }

  async function removeMed(med: MedDefinition) {
    await db.meds.delete(med.id!)
  }

  async function toggleActive(med: MedDefinition) {
    await db.meds.update(med.id!, { active: !med.active })
  }

  return (
    <Card>
      <SectionTitle>Meds & supplements</SectionTitle>
      <div className="flex flex-col gap-2 mb-3">
        {meds?.map((med) => (
          <div key={med.id} className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: "var(--border)" }}>
            <div>
              <div className="text-sm font-medium">{med.name}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {KIND_LABELS[med.kind]}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleActive(med)} className="text-xs font-medium" style={{ color: "var(--series-1)" }}>
                {med.active ? "Active" : "Inactive"}
              </button>
              <button onClick={() => removeMed(med)} className="text-xs" style={{ color: "var(--status-critical)" }}>
                Remove
              </button>
            </div>
          </div>
        ))}
        {(!meds || meds.length === 0) && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Add your meds and supplements below.
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Propranolol" className="flex-1" />
        <Select value={kind} onChange={(e) => setKind(e.target.value as MedKind)} className="w-32">
          {Object.entries(KIND_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <button onClick={addMed} className="mt-2 text-sm font-medium" style={{ color: "var(--series-1)" }}>
        + Add
      </button>
    </Card>
  )
}

function Glp1SitesManager() {
  const settings = useLiveQuery(() => getSettings(), [])
  const [newSite, setNewSite] = useState("")

  async function addSite() {
    if (!newSite.trim() || !settings) return
    await updateSettings({ glp1Sites: [...settings.glp1Sites, newSite.trim()] })
    setNewSite("")
  }

  async function removeSite(site: string) {
    if (!settings) return
    await updateSettings({ glp1Sites: settings.glp1Sites.filter((s) => s !== site) })
  }

  return (
    <Card>
      <SectionTitle>GLP-1 injection sites</SectionTitle>
      <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
        Rotation order — each dose suggests the next site in this list.
      </p>
      <div className="flex flex-col gap-2 mb-2">
        {settings?.glp1Sites.map((site) => (
          <div key={site} className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: "var(--border)" }}>
            <span className="text-sm">{site}</span>
            <button onClick={() => removeSite(site)} className="text-xs" style={{ color: "var(--status-critical)" }}>
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <TextInput value={newSite} onChange={(e) => setNewSite(e.target.value)} placeholder="e.g. Left arm" className="flex-1" />
        <button onClick={addSite} className="text-sm font-medium px-2" style={{ color: "var(--series-1)" }}>
          + Add
        </button>
      </div>
    </Card>
  )
}

function GoalWeight() {
  const settings = useLiveQuery(() => getSettings(), [])

  return (
    <Card>
      <SectionTitle>Goal weight</SectionTitle>
      <Field label="Goal (lbs)">
        <TextInput
          key={settings?.id ?? "loading"}
          type="number"
          defaultValue={settings?.goalWeightLbs ?? ""}
          onBlur={(e) => updateSettings({ goalWeightLbs: e.target.value === "" ? undefined : Number(e.target.value) })}
        />
      </Field>
    </Card>
  )
}

function Preferences() {
  const settings = useLiveQuery(() => getSettings(), [])
  return (
    <Card>
      <SectionTitle>Preferences</SectionTitle>
      <label className="flex items-center justify-between">
        <span className="text-sm">Assume scheduled daily meds taken</span>
        <input
          type="checkbox"
          checked={settings?.assumeScheduledDailyMeds ?? true}
          onChange={(e) => updateSettings({ assumeScheduledDailyMeds: e.target.checked })}
          className="w-5 h-5"
        />
      </label>
    </Card>
  )
}

function LocationSettings() {
  const settings = useLiveQuery(() => getSettings(), [])
  const [city, setCity] = useState("")
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function useCurrentLocation() {
    setBusy(true)
    setStatus(null)
    try {
      const { lat, lon } = await getCurrentPosition()
      await updateSettings({ locationLat: lat, locationLon: lon, locationLabel: "Current location" })
      setStatus("Location saved.")
    } catch {
      setStatus("Couldn't get your location — check permissions, or search a city below.")
    } finally {
      setBusy(false)
    }
  }

  async function searchCity() {
    if (!city.trim()) return
    setBusy(true)
    setStatus(null)
    try {
      const result = await geocodeCity(city.trim())
      if (!result) {
        setStatus("Couldn't find that city.")
      } else {
        await updateSettings({ locationLat: result.lat, locationLon: result.lon, locationLabel: result.label })
        setStatus(`Saved: ${result.label}`)
        setCity("")
      }
    } catch {
      setStatus("Search failed — check your connection.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <SectionTitle>Weather location</SectionTitle>
      <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
        {settings?.locationLabel ? `Saved: ${settings.locationLabel}` : "No location saved yet — needed for the weather quick tap and autofill."}
      </p>
      <GhostButton className="w-full mb-2" onClick={useCurrentLocation} disabled={busy}>
        Use current location
      </GhostButton>
      <div className="flex gap-2">
        <TextInput value={city} onChange={(e) => setCity(e.target.value)} placeholder="Search a city" className="flex-1" />
        <button onClick={searchCity} disabled={busy} className="text-sm font-medium px-2" style={{ color: "var(--series-1)" }}>
          Save
        </button>
      </div>
      {status && (
        <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
          {status}
        </p>
      )}
    </Card>
  )
}

function HealthImport() {
  const [overwrite, setOverwrite] = useState(false)
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setBusy(true)
    setSummary(null)
    try {
      const text = await file.text()
      const result = await importAppleHealthData(text, { overwrite })
      const totalFound = result.weightDays + result.sleepDays
      const totalWritten = result.weightWritten + result.sleepWritten
      if (totalFound === 0) {
        setSummary("No weight or sleep records found in that file.")
      } else {
        const skippedNote = totalWritten < totalFound ? " Some days already had a value and were skipped — check “Overwrite” to replace them." : ""
        setSummary(
          `Found weight for ${result.weightDays} day${result.weightDays === 1 ? "" : "s"} and sleep for ${result.sleepDays} night${result.sleepDays === 1 ? "" : "s"}. Wrote ${totalWritten} value${totalWritten === 1 ? "" : "s"} into your daily check-ins.${skippedNote}`,
        )
      }
    } catch {
      setSummary("That file couldn't be read as an Apple Health export.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <SectionTitle>Import from Apple Health</SectionTitle>
      <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
        In the Health app: profile icon → Export All Health Data. Unzip the download on your phone or computer,
        then choose the <code>export.xml</code> file here. Brings in weight and sleep into your daily check-ins.
        Large exports (multiple years) can take a minute.
      </p>
      <label className="flex items-center gap-2 mb-2">
        <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} className="w-4 h-4" />
        <span className="text-sm">Overwrite existing values</span>
      </label>
      <input type="file" accept=".xml" onChange={handleFile} disabled={busy} className="text-sm" />
      {busy && (
        <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
          Importing…
        </p>
      )}
      {summary && (
        <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
          {summary}
        </p>
      )}
    </Card>
  )
}

function ExportData() {
  return (
    <Card>
      <SectionTitle>Export</SectionTitle>
      <div className="flex flex-col gap-2">
        <GhostButton onClick={() => exportDailySummaryCsv()}>Daily summary (CSV)</GhostButton>
        <GhostButton onClick={() => exportAllCsv()}>All logs by category (CSV)</GhostButton>
        <BigButton onClick={() => exportFullBackupJson()}>Full backup (JSON)</BigButton>
      </div>
    </Card>
  )
}

export default function Setup() {
  return (
    <div className="px-4 pb-40 pt-4 flex flex-col gap-4">
      <h1 className="text-xl font-bold">Setup</h1>
      <GoalWeight />
      <MedsManager />
      <Glp1SitesManager />
      <LocationSettings />
      <HealthImport />
      <Preferences />
      <ExportData />
    </div>
  )
}
