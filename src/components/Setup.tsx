import { useLiveQuery } from "dexie-react-hooks"
import { useState } from "react"
import { db, getSettings, updateSettings } from "../db"
import { exportAllCsv, exportDailySummaryCsv, exportFullBackupJson } from "../lib/export"
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
      <Preferences />
      <ExportData />
    </div>
  )
}
