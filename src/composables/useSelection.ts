import { ref, computed } from "vue"

const selectedIds = ref<Set<string>>(new Set())

export function useSelection() {
  function select(id: string, additive = false): void {
    if (additive) {
      const newSet = new Set(selectedIds.value)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      selectedIds.value = newSet
    } else {
      selectedIds.value = new Set([id])
    }
  }

  function deselect(): void {
    selectedIds.value = new Set()
  }

  function isSelected(id: string): boolean {
    return selectedIds.value.has(id)
  }

  const hasSelection = computed(() => selectedIds.value.size > 0)

  return {
    selectedIds,
    select,
    deselect,
    isSelected,
    hasSelection,
  }
}
