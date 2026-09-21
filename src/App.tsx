import { useState, type ComponentType } from "react"
import { todayStr } from "./db"
import Today from "./components/Today"
import Trends from "./components/Trends"
import Flares from "./components/Flares"
import Setup from "./components/Setup"
import {
  ActivityForm,
  BodyMeasurementsForm,
  DailyCheckinForm,
  DrinkForm,
  FoodForm,
  Glp1Form,
  OneTimeMedForm,
  PotsVitalsForm,
  SymptomForm,
  WeatherForm,
} from "./components/LogForms"
import { Sheet } from "./components/ui"
import { IconFlares, IconSetup, IconToday, IconTrends } from "./components/icons"

type Tab = "today" | "trends" | "flares" | "setup"

const LOG_OPTIONS: { key: string; label: string; sub: string }[] = [
  { key: "food", label: "Food", sub: "What you ate" },
  { key: "drink", label: "Drink", sub: "Ounces, type" },
  { key: "symptom", label: "Symptom", sub: "Pain, digestion or other" },
  { key: "activity", label: "Activity", sub: "Movement, rest" },
  { key: "pots", label: "POTS Vitals", sub: "Lying & standing" },
  { key: "glp1", label: "GLP-1 Dose", sub: "Site rotation" },
  { key: "measurements", label: "Body Measurements", sub: "Waist, hips..." },
  { key: "checkin", label: "Daily Check-In", sub: "Weight, sleep, mood" },
  { key: "weather", label: "Weather", sub: "Conditions, pressure" },
  { key: "one-time-med", label: "One-Time Med", sub: "Benadryl, etc." },
]

const TABS: { key: Tab; label: string; Icon: ComponentType }[] = [
  { key: "today", label: "Today", Icon: IconToday },
  { key: "trends", label: "Trends", Icon: IconTrends },
  { key: "flares", label: "Flares", Icon: IconFlares },
  { key: "setup", label: "Setup", Icon: IconSetup },
]

export default function App() {
  const [tab, setTab] = useState<Tab>("today")
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [activeForm, setActiveForm] = useState<string | null>(null)
  const [editId, setEditId] = useState<number | undefined>(undefined)
  const [logMenuOpen, setLogMenuOpen] = useState(false)

  function openForm(form: string, id?: number) {
    setEditId(id)
    setActiveForm(form)
  }
  function close() {
    setActiveForm(null)
    setEditId(undefined)
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--page-plane)" }}>
      <div className="max-w-md mx-auto relative min-h-screen" style={{ background: "var(--page-plane)" }}>
        {tab === "today" && <Today onOpenForm={openForm} date={selectedDate} onDateChange={setSelectedDate} />}
        {tab === "trends" && <Trends />}
        {tab === "flares" && <Flares onLogFlare={() => openForm("flare")} />}
        {tab === "setup" && <Setup />}

        <button
          onClick={() => setLogMenuOpen(true)}
          className="fixed z-40 rounded-full w-14 h-14 flex items-center justify-center text-2xl font-light shadow-lg"
          style={{
            background: "var(--series-1)",
            color: "#fff",
            right: "max(1rem, calc(50% - 224px + 1rem))",
            bottom: "5.5rem",
          }}
          aria-label="Log something"
        >
          +
        </button>

        <nav
          className="fixed bottom-0 left-0 right-0 border-t flex z-30"
          style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
        >
          <div className="max-w-md mx-auto w-full flex">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex-1 flex flex-col items-center gap-1 py-2.5"
                style={{ color: tab === t.key ? "var(--series-1)" : "var(--text-muted)" }}
              >
                <t.Icon />
                <span className="text-[11px] font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <Sheet
          open={logMenuOpen}
          title={selectedDate === todayStr() ? "Log" : `Log — ${selectedDate}`}
          onClose={() => setLogMenuOpen(false)}
        >
          <div className="grid grid-cols-2 gap-2">
            {LOG_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => {
                  setLogMenuOpen(false)
                  openForm(opt.key)
                }}
                className="rounded-xl border p-3 text-left"
                style={{ borderColor: "var(--border)", background: "var(--card-surface)" }}
              >
                <div className="text-sm font-semibold">{opt.label}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {opt.sub}
                </div>
              </button>
            ))}
          </div>
        </Sheet>

        <FoodForm open={activeForm === "food"} onClose={close} editId={editId} date={selectedDate} />
        <DrinkForm open={activeForm === "drink"} onClose={close} editId={editId} date={selectedDate} />
        <ActivityForm open={activeForm === "activity"} onClose={close} editId={editId} date={selectedDate} />
        <SymptomForm open={activeForm === "symptom"} onClose={close} editId={editId} date={selectedDate} />
        <SymptomForm open={activeForm === "flare"} onClose={close} date={selectedDate} initialFlare />
        <PotsVitalsForm open={activeForm === "pots"} onClose={close} editId={editId} date={selectedDate} />
        <Glp1Form open={activeForm === "glp1"} onClose={close} editId={editId} date={selectedDate} />
        <BodyMeasurementsForm open={activeForm === "measurements"} onClose={close} editId={editId} date={selectedDate} />
        <DailyCheckinForm open={activeForm === "checkin"} onClose={close} date={selectedDate} />
        <WeatherForm open={activeForm === "weather"} onClose={close} date={selectedDate} />
        <OneTimeMedForm open={activeForm === "one-time-med"} onClose={close} editId={editId} date={selectedDate} />
      </div>
    </div>
  )
}
