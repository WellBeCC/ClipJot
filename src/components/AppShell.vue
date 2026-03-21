<script setup lang="ts">
import TabBar from "./TabBar.vue";
import Toolbar from "./Toolbar.vue";
import SubToolbar from "./SubToolbar.vue";
import CanvasViewport from "./CanvasViewport.vue";
</script>

<template>
  <div class="app-shell">
    <TabBar />
    <Toolbar />
    <SubToolbar />
    <CanvasViewport />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: var(--surface-app);
  color: var(--text-primary);
}
</style>
