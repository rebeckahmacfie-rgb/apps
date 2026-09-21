import { useState } from "react"
import Today from "./components/Today"
import Trends from "./components/Trends"
import Flares from "./components/Flares"
import Setup from "./components/Setup"
import {
  ActivityForm,
  BodyMeasurementsForm,
  DailyCheckinForm,
  DigestionForm,
  DrinkForm,
  FoodForm,
  Glp1Form,
  OneTimeMedForm,
  PotsVitalsForm,
  SymptomForm,
  WeatherForm,
} from "./components/LogForms"
import { Sheet } from "./components/ui"

type Tab = "today" | "trends" | "flares" | "setup"

const LOG_OPTIONS: { key: string; label: string; sub: string }[] = [
  { key: "food", label: "Food", sub: "What you ate" },
  { key: "drink", label: "Drink", sub: "Ounces, type" },
  { key: "symptom", label: "Symptom", sub: "Pain or other" },
  { key: "activity", label: "Activity", sub: "Movement, rest" },
  { key: "pots", label: "POTS vitals", sub: "Lying & standing" },
  { key: "glp1", label: "GLP-1 dose", sub: "Site rotation" },
  { key: "digestion", label: "Digestion", sub: "Bristol, bloating" },
  { key: "measurements", label: "Body measurements", sub: "Waist, hips..." },
  { key: "checkin", label: "Daily check-in", sub: "Weight, sleep, mood" },
  { key: "weather", label: "Weather", sub: "Conditions, pressure" },
  { key: "one-time-med", label: "One-time med", sub: "Benadryl, etc." },
]

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "today", label: "Today", icon: "●" },
  { key: "trends", label: "Trends", icon: "▲" },
  { key: "flares", label: "Flares", icon: "✦" },
  { key: "setup", label: "Setup", icon: "⚙" },
]

export default function App() {
  const [tab, setTab] = useState<Tab>("today")
  const [activeForm, setActiveForm] = useState<string | null>(null)
  const [logMenuOpen, setLogMenuOpen] = useState(false)

  const close = () => setActiveForm(null)

  return (
    <div className="min-h-screen" style={{ background: "var(--page-plane)" }}>
      <div className="max-w-md mx-auto relative min-h-screen" style={{ background: "var(--page-plane)" }}>
        {tab === "today" && <Today onOpenForm={setActiveForm} />}
        {tab === "trends" && <Trends />}
        {tab === "flares" && <Flares onLogFlare={() => setActiveForm("flare")} />}
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
                className="flex-1 flex flex-col items-center gap-0.5 py-2.5"
                style={{ color: tab === t.key ? "var(--series-1)" : "var(--text-muted)" }}
              >
                <span className="text-base leading-none">{t.icon}</span>
                <span className="text-[11px] font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <Sheet open={logMenuOpen} title="Log" onClose={() => setLogMenuOpen(false)}>
          <div className="grid grid-cols-2 gap-2">
            {LOG_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => {
                  setLogMenuOpen(false)
                  setActiveForm(opt.key)
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

        <FoodForm open={activeForm === "food"} onClose={close} />
        <DrinkForm open={activeForm === "drink"} onClose={close} />
        <ActivityForm open={activeForm === "activity"} onClose={close} />
        <SymptomForm open={activeForm === "symptom"} onClose={close} />
        <SymptomForm open={activeForm === "flare"} onClose={close} initialFlare />
        <PotsVitalsForm open={activeForm === "pots"} onClose={close} />
        <Glp1Form open={activeForm === "glp1"} onClose={close} />
        <DigestionForm open={activeForm === "digestion"} onClose={close} />
        <BodyMeasurementsForm open={activeForm === "measurements"} onClose={close} />
        <DailyCheckinForm open={activeForm === "checkin"} onClose={close} />
        <WeatherForm open={activeForm === "weather"} onClose={close} />
        <OneTimeMedForm open={activeForm === "one-time-med"} onClose={close} />
      </div>
    </div>
  )
}
