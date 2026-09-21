import { db, todayStr } from "../db"
import type { PressureTrend } from "../types"

export interface FetchedWeather {
  conditions: string
  highF: number
  lowF: number
  pressureTrend: PressureTrend
}

const WMO_CONDITIONS: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
}

export function describeWeatherCode(code: number): string {
  return WMO_CONDITIONS[code] ?? "Unknown"
}

export function computePressureTrend(pastHPa: number, nowHPa: number): PressureTrend {
  const delta = nowHPa - pastHPa
  if (delta <= -1) return "falling"
  if (delta >= 1) return "rising"
  return "steady"
}

export function getCurrentPosition(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: 10000 },
    )
  })
}

export async function geocodeCity(name: string): Promise<{ lat: number; lon: number; label: string } | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`
  const res = await fetch(url)
  if (!res.ok) throw new Error("Geocoding failed")
  const data = await res.json()
  const first = data?.results?.[0]
  if (!first) return null
  return {
    lat: first.latitude,
    lon: first.longitude,
    label: [first.name, first.admin1, first.country].filter(Boolean).join(", "),
  }
}

export async function fetchCurrentWeather(lat: number, lon: number): Promise<FetchedWeather> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=weather_code,surface_pressure&hourly=surface_pressure&daily=temperature_2m_max,temperature_2m_min` +
    `&past_days=1&forecast_days=1&temperature_unit=fahrenheit&timezone=auto`
  const res = await fetch(url)
  if (!res.ok) throw new Error("Weather fetch failed")
  const data = await res.json()

  const code = data?.current?.weather_code
  const conditions = typeof code === "number" ? describeWeatherCode(code) : "Unknown"

  const dailyHighs: number[] = data?.daily?.temperature_2m_max ?? []
  const dailyLows: number[] = data?.daily?.temperature_2m_min ?? []
  const highF = Math.round(dailyHighs[dailyHighs.length - 1])
  const lowF = Math.round(dailyLows[dailyLows.length - 1])

  const hourlyPressure: number[] = data?.hourly?.surface_pressure ?? []
  const hourlyTimes: string[] = data?.hourly?.time ?? []
  let idxNow = hourlyTimes.indexOf(data?.current?.time)
  if (idxNow === -1) idxNow = hourlyTimes.length - 1
  const idxPast = Math.max(0, idxNow - 3)
  const pastPressure = hourlyPressure[idxPast]
  const nowPressure = hourlyPressure[idxNow] ?? data?.current?.surface_pressure
  const pressureTrend =
    typeof pastPressure === "number" && typeof nowPressure === "number"
      ? computePressureTrend(pastPressure, nowPressure)
      : "steady"

  return { conditions, highF, lowF, pressureTrend }
}

export async function saveWeatherForToday(w: FetchedWeather) {
  const date = todayStr()
  const existing = await db.weather.where("date").equals(date).first()
  const patch = { conditions: w.conditions, highF: w.highF, lowF: w.lowF, pressureTrend: w.pressureTrend }
  if (existing?.id) {
    await db.weather.update(existing.id, patch)
  } else {
    await db.weather.add({ date, ...patch })
  }
}
