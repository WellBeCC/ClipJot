import { createApp } from "vue";
import "./assets/reset.css";
import "./assets/flexoki.css";
import "./assets/tokens.css";
import App from "./App.vue";
import { useSettings } from "./composables/useSettings";
import { useGlobalHotkey } from "./composables/useGlobalHotkey";
import { useKeyboard } from "./composables/useKeyboard";
import { readClipboardImage } from "./composables/useClipboard";
import { useTabStore } from "./composables/useTabStore";

// Initialize settings — applies persisted theme (or system default) immediately
useSettings();

createApp(App).mount("#app");

// Register global keyboard shortcuts after app is mounted
useKeyboard();

// Register global hotkey after app is mounted
const { registerHotkey } = useGlobalHotkey();
registerHotkey().then((success) => {
  if (!success) {
    console.warn("Global hotkey registration failed — shortcut may be in use");
  }
});

// Read clipboard on app launch — populate the clipboard tab with current image
console.log("[ClipJot] main.ts: initiating clipboard read on launch...");
readClipboardImage().then((image) => {
  console.log("[ClipJot] main.ts: clipboard read result:", image);
  const { updateClipboardImage } = useTabStore();
  if (image) {
    console.log("[ClipJot] main.ts: updating clipboard tab with image:", image.width, "x", image.height);
    updateClipboardImage(image.url, image.width, image.height);
  } else {
    console.log("[ClipJot] main.ts: no image returned from clipboard read");
  }
}).catch((err) => {
  console.error("[ClipJot] main.ts: clipboard read promise rejected:", err);
});

