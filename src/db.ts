import Dexie, { type Table } from "dexie"
import {
  DEFAULT_FOOD_TAGS,
  DEFAULT_GLP1_SITES,
  type ActivityEntry,
  type BodyMeasurementEntry,
  type DailyCheckin,
  type DigestionEntry,
  type DrinkEntry,
  type FoodEntry,
  type Glp1DoseEntry,
  type MedDefinition,
  type MedEvent,
  type PotsVitalsEntry,
  type Settings,
  type SymptomEntry,
  type WeatherEntry,
} from "./types"

export class BodyLedgerDB extends Dexie {
  settings!: Table<Settings, number>
  meds!: Table<MedDefinition, number>
  medEvents!: Table<MedEvent, number>
  food!: Table<FoodEntry, number>
  drinks!: Table<DrinkEntry, number>
  activities!: Table<ActivityEntry, number>
  symptoms!: Table<SymptomEntry, number>
  potsVitals!: Table<PotsVitalsEntry, number>
  glp1Doses!: Table<Glp1DoseEntry, number>
  digestion!: Table<DigestionEntry, number>
  dailyCheckins!: Table<DailyCheckin, number>
  weather!: Table<WeatherEntry, number>
  bodyMeasurements!: Table<BodyMeasurementEntry, number>

  constructor() {
    super("body-ledger")
    this.version(1).stores({
      settings: "++id",
      meds: "++id, kind, sortOrder",
      medEvents: "++id, medId, date, kind, timestamp",
      food: "++id, date, timestamp",
      drinks: "++id, date, timestamp, type",
      activities: "++id, date, timestamp",
      symptoms: "++id, date, timestamp, kind",
      potsVitals: "++id, date, timestamp",
      glp1Doses: "++id, date, timestamp",
      digestion: "++id, date, timestamp",
      dailyCheckins: "++id, &date",
      weather: "++id, &date",
      bodyMeasurements: "++id, date, timestamp",
    })
  }
}

export const db = new BodyLedgerDB()

export function todayStr(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

let seeded = false
export async function ensureSeeded() {
  if (seeded) return
  seeded = true
  const existing = await db.settings.toCollection().first()
  if (!existing) {
    await db.settings.add({
      glp1Sites: [...DEFAULT_GLP1_SITES],
      assumeScheduledDailyMeds: true,
      lastFoodTagOptions: [...DEFAULT_FOOD_TAGS],
    })
  }
}

// Read-only on purpose: dexie-react-hooks' useLiveQuery forbids writes inside
// the querier function (ReadOnlyError). Seeding happens once at app boot via
// ensureSeeded(); this always has a non-writing fallback shape to return.
export async function getSettings(): Promise<Settings> {
  const s = await db.settings.toCollection().first()
  if (s) return s
  return {
    glp1Sites: [...DEFAULT_GLP1_SITES],
    assumeScheduledDailyMeds: true,
    lastFoodTagOptions: [...DEFAULT_FOOD_TAGS],
  }
}

export async function updateSettings(patch: Partial<Settings>) {
  const s = await getSettings()
  if (s.id != null) {
    await db.settings.update(s.id, patch)
  } else {
    await db.settings.add({ ...s, ...patch })
  }
}

export async function suggestNextGlp1Site(): Promise<string> {
  const settings = await getSettings()
  const sites = settings.glp1Sites
  if (sites.length === 0) return ""
  const lastDose = await db.glp1Doses.orderBy("timestamp").last()
  if (!lastDose) return sites[0]
  const lastIndex = sites.indexOf(lastDose.site)
  if (lastIndex === -1) return sites[0]
  return sites[(lastIndex + 1) % sites.length]
}
