import { getValue, setValue } from '@/utils'
/**
 * 撤销栈的最大容量，超出从头部删除
 */
const MAX_HISTORY_LENGTH = 1000
const undoStack = shallowReactive([])
const redoStack = shallowReactive([])

export function useUndoRedo() {
  // 当前是否可以撤销
  const canUndo = computed(() => undoStack.length > 0)
  // 当前是否可以重做
  const canRedo = computed(() => redoStack.length > 0)
  let activeBatch = null
  // 开始按批次处理
  function startBatch() {
    activeBatch = []
  }
  // 提交批次
  function commitBatch() {
    if (activeBatch.length > 0) {
      pushRecord(activeBatch)
    }
    activeBatch = null
  }

  /**
   * [1,2,3,4]
   * 如果栈已经超出了 最大值，把最前面的，移除掉
   */
  function pushRecord(record) {
    undoStack.push(record)
    if (undoStack.length > MAX_HISTORY_LENGTH) {
      undoStack.shift()
      console.log('已经超出记录了，移除首个')
    }
  }
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
    if (activeBatch) {
      const _record = activeBatch.find((item) => item.target === target && item.key === key)
      // 如果之前有直接将新值替换即可
      if (_record) {
        _record.newValue = newValue
      } else {
        activeBatch.push(record)
      }
    } else {
      pushRecord([record])
    }

    setValue(target, key, newValue)

    redoStack.length = 0
  }

  /**
   * 撤销
   */
  function undo() {
    const records = undoStack.pop()
    if (!records) return
    records.toReversed().forEach((record) => {
      const { target, key, oldValue } = record
      // 撤销是退回老值 => oldValue
      setValue(target, key, oldValue)
    })
    // 放入重做的栈中
    redoStack.push(records)
  }
  function redo() {
    const records = redoStack.pop()
    if (!records) return
    records.forEach((record) => {
      const { target, key, newValue } = record
      // 重做是设置为新值 => newValue
      setValue(target, key, newValue)
    })
    // 放入撤销的栈中
    undoStack.push(records)
  }

  return {
    undo,
    redo,
    applyChange,
    canUndo,
    canRedo,
    startBatch,
    commitBatch,
  }
}
