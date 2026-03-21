<script setup lang="ts">
import { ref } from "vue"
import { useTabStore } from "../composables/useTabStore"
import TabItem from "./TabItem.vue"
import CloseWarningDialog from "./CloseWarningDialog.vue"

const { tabs, activeTabId, setActiveTab, closeTab, renameTab } = useTabStore()

/** Tab ID pending close confirmation (null = no dialog open) */
const pendingCloseTabId = ref<string | null>(null)
const pendingCloseTabName = ref("")

function handleClose(tabId: string): void {
  const tab = tabs.value.find((t) => t.id === tabId)
  if (!tab || tab.type === "clipboard") return

  // Close-warning matrix:
  // No edits since copy (copiedSinceLastEdit=true) → close directly
  // Has uncopied edits (copiedSinceLastEdit=false) → show warning
  const hasUncopiedEdits = !tab.copiedSinceLastEdit && tab.undoRedo.isEdited.value

  if (hasUncopiedEdits) {
    pendingCloseTabId.value = tabId
    pendingCloseTabName.value = tab.name
  } else {
    closeTab(tabId)
  }
}

function handleCopyAndClose(): void {
  if (pendingCloseTabId.value) {
    // TODO: integrate with actual clipboard copy when export pipeline is ready
    closeTab(pendingCloseTabId.value)
  }
  pendingCloseTabId.value = null
  pendingCloseTabName.value = ""
}

function handleDiscard(): void {
  if (pendingCloseTabId.value) {
    closeTab(pendingCloseTabId.value)
  }
  pendingCloseTabId.value = null
  pendingCloseTabName.value = ""
}

function handleCancelClose(): void {
  pendingCloseTabId.value = null
  pendingCloseTabName.value = ""
}

function handleRename(tabId: string, newName: string): void {
  renameTab(tabId, newName)
}
</script>

<template>
  <div class="tab-bar">
    <TabItem
      v-for="tab in tabs"
      :key="tab.id"
      :tab="tab"
      :is-active="tab.id === activeTabId"
      @select="setActiveTab"
      @close="handleClose"
      @rename="handleRename"
    />
  </div>

  <CloseWarningDialog
    v-if="pendingCloseTabId"
    :tab-name="pendingCloseTabName"
    @copy-and-close="handleCopyAndClose"
    @discard="handleDiscard"
    @cancel="handleCancelClose"
  />
</template>

<style scoped>
.tab-bar {
  display: flex;
  flex-wrap: wrap;
  flex-shrink: 0;
  min-height: 36px;
  background: var(--surface-panel);
  border-bottom: 1px solid var(--border-subtle);
  padding: 0 8px;
  align-items: center;
}
</style>
