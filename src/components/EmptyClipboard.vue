<script setup lang="ts">
// Empty clipboard placeholder — shown when no image is available
import { computed } from "vue"
import { RefreshCw } from "lucide-vue-next"
import { useSettings } from "../composables/useSettings"

const { hotkey } = useSettings()

const isMac = navigator.userAgent.includes("Mac")

/** Convert Tauri shortcut format (e.g. "CommandOrControl+Shift+J") to a human-readable label. */
const displayShortcut = computed(() => {
  let s = hotkey.value
  if (isMac) {
    s = s.replace("CommandOrControl", "Cmd").replace("Meta", "Cmd")
  } else {
    s = s.replace("CommandOrControl", "Ctrl").replace("Meta", "Win")
  }
  return s
})
</script>

<template>
  <div class="empty-clipboard">
    <div class="empty-clipboard__icon">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      </svg>
    </div>
    <h2 class="empty-clipboard__title">No image in clipboard</h2>
    <p class="empty-clipboard__hint">
      Copy an image to your clipboard, then press
      <kbd>{{ displayShortcut }}</kbd> or click
      <span class="toolbar-btn-preview" aria-label="Refresh clipboard button">
        <RefreshCw :size="12" stroke-width="2" />
      </span>
      in the toolbar to open it here.
    </p>
  </div>
</template>

<style scoped>
.empty-clipboard {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px;
  text-align: center;
}

.empty-clipboard__icon {
  color: var(--text-disabled);
  opacity: 0.6;
}

.empty-clipboard__title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.empty-clipboard__hint {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  max-width: 300px;
  line-height: 1.5;
}

kbd {
  display: inline-block;
  padding: 2px 6px;
  font-size: 12px;
  font-family: inherit;
  background: var(--surface-panel);
  border: 1px solid var(--border-default);
  border-radius: 4px;
  box-shadow: var(--shadow-sm);
}

.toolbar-btn-preview {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 5px;
  background: var(--surface-panel);
  border: 1px solid var(--border-default);
  border-radius: 4px;
  box-shadow: var(--shadow-sm);
  vertical-align: middle;
  color: var(--text-secondary);
}
</style>
