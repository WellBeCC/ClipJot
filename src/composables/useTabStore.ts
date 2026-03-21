import { shallowRef, ref, computed, triggerRef } from "vue"
import type { Tab } from "../types/tab"
import { createUndoRedo } from "./useUndoRedo"

// Module-level state (singleton)
const tabs = shallowRef<Tab[]>([])
const activeTabId = ref<string>("")

// Initialize with the clipboard tab
function initClipboardTab(): void {
  if (tabs.value.length > 0) return // Already initialized
  const clipboardTab: Tab = {
    id: "clipboard",
    name: "Clipboard",
    type: "clipboard",
    imageUrl: null,
    imageWidth: 0,
    imageHeight: 0,
    copiedSinceLastEdit: true,
    undoRedo: createUndoRedo(),
  }
  tabs.value = [clipboardTab]
  activeTabId.value = "clipboard"
}

export function useTabStore() {
  // Ensure clipboard tab exists
  initClipboardTab()

  const activeTab = computed<Tab | null>(
    () => tabs.value.find((t) => t.id === activeTabId.value) ?? null,
  )

  const clipboardTab = computed<Tab | null>(
    () => tabs.value.find((t) => t.type === "clipboard") ?? null,
  )

  function setActiveTab(tabId: string): void {
    if (tabs.value.some((t) => t.id === tabId)) {
      activeTabId.value = tabId
    }
  }

  function updateClipboardImage(
    url: string | null,
    width: number,
    height: number,
  ): void {
    const clipboard = tabs.value.find((t) => t.type === "clipboard")
    if (!clipboard) return

    // Revoke old URL to prevent memory leak
    if (clipboard.imageUrl) {
      URL.revokeObjectURL(clipboard.imageUrl)
    }

    clipboard.imageUrl = url
    clipboard.imageWidth = width
    clipboard.imageHeight = height
    triggerRef(tabs) // Notify shallowRef watchers
  }

  return {
    tabs,
    activeTabId,
    activeTab,
    clipboardTab,
    setActiveTab,
    updateClipboardImage,
  }
}
