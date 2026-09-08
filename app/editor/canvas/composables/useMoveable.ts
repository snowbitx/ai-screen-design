import type { OnDrag, OnDragGroup, OnResize, OnResizeGroup } from 'vue3-moveable'
import { useEditorStore } from '@/stores/editor.ts'
import { useUndoRedo } from '@/composables/useUndoRedo.ts'

export function useMoveable(moveableRef) {
  const { applyChange, startBatch, commitBatch } = useUndoRedo()
  const editorStore = useEditorStore()

  // 当 layout 发生变化后，手动更新 moveable 的选框
  watch(
    () =>
      editorStore.nodes.map((node) => {
        return node.layout
      }),
    () => {
      // 手动更新的方法
      moveableRef.value.updateRect(undefined, true)
    },
    {
      flush: 'post',
    },
  )

  function onStart() {
    startBatch()
  }

  function onEnd() {
    commitBatch()
  }
  function onDrag(e: OnDrag) {
    // 动态绑定的style是异步的，所以直接修改dom上的style保证拖动不漂移
    e.target.style.left = e.left + 'px'
    e.target.style.top = e.top + 'px'
    const node = getNodeByTarget(e.target as HTMLElement)
    applyChange(node, 'layout', {
      ...node.layout,
      x: e.left,
      y: e.top,
    })
  }

  function getNodeByTarget(element: HTMLElement) {
    const id = element.getAttribute('data-node-id')
    return editorStore.findNode(id)
  }

  function onResize(e: OnResize) {
    e.target.style.width = e.width + 'px'
    e.target.style.height = e.height + 'px'
    const node = getNodeByTarget(e.target as HTMLElement)
    applyChange(node, 'layout', {
      ...node.layout,
      width: e.width,
      height: e.height,
    })
    // 发现拖动时拖动左边会往右扩大。原因是往左拖动时宽度变了x轴没变，所以要手动更新下x轴和y轴
    onDrag(e.drag)
  }

  function onDragGroup(e: OnDragGroup) {
    // 框选多个拖拽时可拿到多个event数组，此时遍历数组调拖拽即可
    e.events.forEach(onDrag)
  }

  function onResizeGroup(e: OnResizeGroup) {
    e.events.forEach(onResize)
  }

  return {
    onDrag,
    onDragGroup,
    onResize,
    onResizeGroup,
    onStart,
    onEnd,
  }
}
