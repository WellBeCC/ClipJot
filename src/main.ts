import { createApp } from "vue";
import "./assets/reset.css";
import "./assets/flexoki.css";
import "./assets/tokens.css";
import App from "./App.vue";
import { useSettings } from "./composables/useSettings";
import { useGlobalHotkey } from "./composables/useGlobalHotkey";

// Initialize settings — applies persisted theme (or system default) immediately
useSettings();

createApp(App).mount("#app");

// Register global hotkey after app is mounted
const { registerHotkey } = useGlobalHotkey();
registerHotkey().then((success) => {
  if (!success) {
    console.warn("Global hotkey registration failed — shortcut may be in use");
  }
});
