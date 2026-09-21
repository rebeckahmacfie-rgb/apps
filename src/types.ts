export type MedKind = "daily-am" | "daily-pm" | "daily" | "weekly" | "as-needed"

export interface MedDefinition {
  id?: number
  name: string
  kind: MedKind
  active: boolean
  sortOrder: number
}

export type MedEventKind = "taken" | "missed" | "one-time"

export interface MedEvent {
  id?: number
  medId?: number // absent for one-time meds
  name: string // denormalized so history reads fine even if med def changes/deleted
  kind: MedEventKind
  date: string // YYYY-MM-DD local
  timestamp: string // ISO
  notes?: string
}

export interface FoodEntry {
  id?: number
  date: string
  timestamp: string
  description: string
  tags: string[]
  notes?: string
}

export type DrinkType = "water" | "coffee" | "electrolytes" | "tea" | "soda" | "alcohol" | "other"

export interface DrinkEntry {
  id?: number
  date: string
  timestamp: string
  type: DrinkType
  label?: string
  ounces: number
  notes?: string
}

export interface ActivityEntry {
  id?: number
  date: string
  timestamp: string
  type: string
  durationMin?: number
  intensity?: number // 1-10
  notes?: string
}

export type PainType = "sharp" | "dull" | "burning" | "cramping" | "throbbing" | "stabbing" | "other"

export interface SymptomEntry {
  id?: number
  date: string
  timestamp: string
  kind: "pain" | "general"
  name: string // e.g. "Pain flare", "Nausea", "Brain fog", "Fatigue"
  rating: number // 1-10
  location?: string
  painType?: PainType
  isFlare: boolean
  notes?: string
}

export interface PotsVitalsEntry {
  id?: number
  date: string
  timestamp: string
  lyingHr?: number
  lyingSystolic?: number
  lyingDiastolic?: number
  standingHr?: number
  standingSystolic?: number
  standingDiastolic?: number
  minutesStanding?: number
  notes?: string
}

export interface Glp1DoseEntry {
  id?: number
  date: string
  timestamp: string
  drugName: string
  doseMg?: number
  site: string
  notes?: string
}

export interface DigestionEntry {
  id?: number
  date: string
  timestamp: string
  bristolScale?: number // 1-7
  bloating?: number // 1-10
  nausea?: number // 1-10
  reflux?: number // 1-10
  notes?: string
}

export type CycleFlow = "none" | "spotting" | "light" | "medium" | "heavy"

export interface DailyCheckin {
  id?: number
  date: string // unique
  weightLbs?: number
  sleepHours?: number
  sleepQuality?: number // 1-10
  energy?: number // 1-10
  mood?: number // 1-10
  stress?: number // 1-10
  cycleDay?: number
  cycleFlow?: CycleFlow
  notes?: string
}

export type PressureTrend = "falling" | "steady" | "rising"

export interface WeatherEntry {
  id?: number
  date: string // unique
  conditions?: string
  highF?: number
  lowF?: number
  pressureTrend?: PressureTrend
  notes?: string
}

export const MEASUREMENT_SITES = [
  "waist",
  "hips",
  "chestBust",
  "neck",
  "upperArm",
  "thigh",
  "calf",
] as const
export type MeasurementSite = (typeof MEASUREMENT_SITES)[number]

export const MEASUREMENT_LABELS: Record<MeasurementSite, string> = {
  waist: "Waist (at navel)",
  hips: "Hips",
  chestBust: "Chest / bust",
  neck: "Neck",
  upperArm: "Upper arm",
  thigh: "Thigh",
  calf: "Calf",
}

export interface BodyMeasurementEntry {
  id?: number
  date: string
  timestamp: string
  waist?: number
  hips?: number
  chestBust?: number
  neck?: number
  upperArm?: number
  thigh?: number
  calf?: number
  notes?: string
}

export interface Settings {
  id?: number
  goalWeightLbs?: number
  glp1Sites: string[]
  assumeScheduledDailyMeds: boolean
  lastFoodTagOptions: string[]
  locationLat?: number
  locationLon?: number
  locationLabel?: string
}

export const DEFAULT_GLP1_SITES = [
  "Left abdomen",
  "Right abdomen",
  "Left thigh",
  "Right thigh",
  "Left arm",
  "Right arm",
]

export const DEFAULT_FOOD_TAGS = [
  "ultra-processed",
  "high-sodium",
  "dairy",
  "gluten",
  "high-fat",
  "spicy",
  "sugar",
  "caffeine",
  "alcohol",
  "fried",
]
