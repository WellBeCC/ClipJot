<script setup lang="ts">
defineProps<{
  tabName: string
}>()

const emit = defineEmits<{
  copyAndClose: []
  discard: []
  cancel: []
}>()
</script>

<template>
  <Teleport to="body">
    <div class="dialog-backdrop" @click.self="emit('cancel')">
      <div
        class="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="close-dialog-title"
      >
        <h2 id="close-dialog-title" class="dialog__title">Uncopied edits</h2>
        <p class="dialog__message">
          "{{ tabName }}" has edits that haven't been copied to clipboard.
        </p>
        <div class="dialog__actions">
          <button
            class="dialog__btn dialog__btn--secondary"
            @click="emit('discard')"
          >
            Discard
          </button>
          <button
            class="dialog__btn dialog__btn--secondary"
            @click="emit('cancel')"
          >
            Cancel
          </button>
          <button
            class="dialog__btn dialog__btn--primary"
            autofocus
            @click="emit('copyAndClose')"
          >
            Copy &amp; Close
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  background: var(--overlay-backdrop);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: var(--surface-elevated);
  border-radius: 12px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  box-shadow: var(--shadow-lg);
}

.dialog__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.dialog__message {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 20px;
  line-height: 1.5;
}

.dialog__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.dialog__btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background 0.15s;
}

.dialog__btn--primary {
  background: var(--interactive-default);
  color: var(--text-inverse);
}

.dialog__btn--primary:hover {
  background: var(--interactive-hover);
}

.dialog__btn--secondary {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-default);
}

.dialog__btn--secondary:hover {
  background: var(--surface-panel);
}
</style>
