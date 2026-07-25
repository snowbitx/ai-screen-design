import { getValue, setValue } from '@/utils'

const undoStack = shallowReactive([])
const redoStack = shallowReactive([])

export function useUndoRedo() {
  // 当前是否可以撤销
  const canUndo = computed(() => undoStack.length > 0)
  // 当前是否可以重做
  const canRedo = computed(() => redoStack.length > 0)

  function applyChange(target, key, newValue) {
    // 改变之前
    const oldValue = getValue(target, key)

    if (oldValue === newValue) return

    const record = {
      target,
      key,
      newValue,
      oldValue,
    }

    undoStack.push(record)

    setValue(target, key, newValue)

    redoStack.length = 0
  }

  /**
   * 撤销
   */
  function undo() {
    const record = undoStack.pop()
    if (!record) return

    const { target, key, oldValue } = record
    // 撤销是退回老值 => oldValue
    setValue(target, key, oldValue)
    // 放入重做的栈中
    redoStack.push(record)
  }
  function redo() {
    const record = redoStack.pop()
    if (!record) return

    const { target, key, newValue } = record
    // 重做是设置为新值 => newValue
    setValue(target, key, newValue)
    // 放入撤销的栈中
    undoStack.push(record)
  }

  return {
    undo,
    redo,
    applyChange,
    canUndo,
    canRedo,
  }
}
