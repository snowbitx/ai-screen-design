import { defineStore } from 'pinia'
import type { MaterialSchema } from '@/material/types.ts'

export const useEditorStore = defineStore('editor', () => {
  // 布局组件控制物料，图层，属性面板的现实隐藏
  const panelVisible = reactive({
    material: true,
    layer: true,
    property: true,
  })

  /**
   * canvas编辑器数据
   */

  // 当前编辑器组件列表
  const nodes = ref<MaterialSchema[]>([])
  // 当前选中节点的id
  const selectedNodeId = ref()
  // 当前选中的节点
  const selectedNode = computed(() => {
    return nodes.value.find((node) => node.id === selectedNodeId.value)
  })

  function addNode(node: MaterialSchema) {
    nodes.value.push(node)
  }

  function selectNode(id: string) {
    selectedNodeId.value = id
  }

  function clearSelected() {
    selectedNodeId.value = null
  }
  return {
    panelVisible,
    nodes,
    selectedNodeId,
    selectedNode,
    addNode,
    selectNode,
    clearSelected,
  }
})
