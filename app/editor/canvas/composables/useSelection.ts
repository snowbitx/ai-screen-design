import { useEditorStore } from '@/stores/editor.ts'
import { storeToRefs } from 'pinia'
import type { MaterialSchema } from '@shared/schema/material.ts'

export function useSelection({ stageRef, moveableRef }) {
  const editorStore = useEditorStore()
  const { selectedNodeIds } = storeToRefs(editorStore)
  const selectedTarget = shallowRef<HTMLElement[]>()

  // 选中的节点变化时同步 movable的选中效果  手动更新selectedTarget的就可以删掉了
  watch(
    selectedNodeIds,
    (ids) => {
      selectedTarget.value = ids.map((id) => {
        // id相同不能被锁定
        return stageRef.value.querySelector(`[data-node-id="${id}"]:not([data-node-locked='true'])`)
      })
    },
    { deep: true, flush: 'post' },
  )

  /**
   * 选中节点
   */
  function onSelect(node: MaterialSchema, e: MouseEvent) {
    // 事件会冒泡，避免使用target拿到冒泡的节点，使用currentTarget拿到绑定mouseDown的真实target
    editorStore.selectNode(node.id)
    /**
     * moveable首次拖放进来后直接拖拽不生效，手动触发一下
     */
    nextTick(() => {
      moveableRef.value.dragStart(e)
    })
  }

  function onClearSelected() {
    editorStore.clearSelected()
  }

  function onSelectEnd(e) {
    const ids = e.selected.map((element) => element.getAttribute('data-node-id'))
    editorStore.selectNodes(ids)
  }
  return {
    selectedTarget,
    onSelectEnd,
    onClearSelected,
    onSelect,
  }
}
