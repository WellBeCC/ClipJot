import { ref, watch } from "vue"
import { invoke } from "@tauri-apps/api/core"

export type ThemeSetting = "light" | "dark" | "system"

const STORAGE_PREFIX = "clipjot-settings-"

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch {
    // Silently ignore storage errors (quota, private browsing)
  }
}

// Module-level state (singleton)
const theme = ref<ThemeSetting>(loadFromStorage<ThemeSetting>("theme", "system"))
const autoCopyOnClose = ref<boolean>(loadFromStorage<boolean>("autoCopyOnClose", true))
const tabNamePattern = ref<string>(loadFromStorage<string>("tabNamePattern", "HH:mm:ss"))
const hotkey = ref<string>(
  loadFromStorage<string>("hotkey", "CommandOrControl+Shift+J"),
)
const zoomSensitivity = ref<number>(
  loadFromStorage<number>("zoomSensitivity", 3),
)
const autostart = ref<boolean>(loadFromStorage<boolean>("autostart", false))
const showInTray = ref<boolean>(loadFromStorage<boolean>("showInTray", true))

// Persist each setting on change
watch(theme, (v) => saveToStorage("theme", v))
watch(autoCopyOnClose, (v) => saveToStorage("autoCopyOnClose", v))
watch(tabNamePattern, (v) => saveToStorage("tabNamePattern", v))
watch(hotkey, (v) => saveToStorage("hotkey", v))
watch(zoomSensitivity, (v) => saveToStorage("zoomSensitivity", v))
watch(autostart, (v) => saveToStorage("autostart", v))
watch(showInTray, (v) => saveToStorage("showInTray", v))
watch(showInTray, (v) => {
  invoke("set_tray_mode", { enabled: v }).catch(() => {
    // not in Tauri context
  })
})

/** Resolve effective theme (accounting for "system" preference). */
function resolveTheme(setting: ThemeSetting): "light" | "dark" {
  if (setting === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  }
  return setting
}

/** Apply theme class to document root. */
function applyTheme(setting: ThemeSetting): void {
  const effective = resolveTheme(setting)
  if (effective === "dark") {
    document.documentElement.classList.add("theme-dark")
  } else {
    document.documentElement.classList.remove("theme-dark")
  }
}

// Apply theme immediately on module load
applyTheme(theme.value)

// React to theme changes
watch(theme, (v) => applyTheme(v))

// Listen for OS theme changes when set to "system"
if (typeof window !== "undefined") {
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (theme.value === "system") {
        applyTheme("system")
      }
    })
}

// Update functions
function setTheme(value: ThemeSetting): void {
  theme.value = value
}

function setAutoCopyOnClose(value: boolean): void {
  autoCopyOnClose.value = value
}

function setTabNamePattern(value: string): void {
  tabNamePattern.value = value
}

function setHotkey(value: string): void {
  hotkey.value = value
}

function setZoomSensitivity(value: number): void {
  zoomSensitivity.value = Math.max(1, Math.min(5, value))
}

function setAutostart(value: boolean): void {
  autostart.value = value
}

function setShowInTray(value: boolean): void {
  showInTray.value = value
}

export function useSettings() {
  return {
    // Reactive state
    theme,
    autoCopyOnClose,
    tabNamePattern,
    hotkey,
    zoomSensitivity,
    autostart,
    showInTray,

    // Update functions
    setTheme,
    setAutoCopyOnClose,
    setTabNamePattern,
    setHotkey,
    setZoomSensitivity,
    setAutostart,
    setShowInTray,

    // Utilities
    applyTheme,
    resolveTheme,
  }
}
