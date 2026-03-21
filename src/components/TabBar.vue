<script setup lang="ts">
import { useTabStore } from "../composables/useTabStore"
import TabItem from "./TabItem.vue"

const { tabs, activeTabId, setActiveTab } = useTabStore()
</script>

<template>
  <div class="tab-bar">
    <TabItem
      v-for="tab in tabs"
      :key="tab.id"
      :tab="tab"
      :is-active="tab.id === activeTabId"
      @select="setActiveTab"
    />
  </div>
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
