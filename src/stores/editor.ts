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
  const selectedNodeIds = ref([])
  // 支持多选后，拿多选的结构来维护，这样可以共用清除选中
  const selectedNodeId = computed(() => {
    return selectedNodeIds.value.length === 1 ? selectedNodeIds.value[0] : null
  })
  // 当前选中的节点
  const selectedNode = computed(() => {
    return nodes.value.find((node) => node.id === selectedNodeId.value)
  })

  function addNode(node: MaterialSchema) {
    nodes.value.push(node)
  }
  /**
   * 单选方法
   */
  function selectNode(id: string) {
    selectedNodeIds.value = [id]
  }
  /**
   * 多选节点
   */
  function selectNodes(ids: string[]) {
    selectedNodeIds.value = ids
  }

  function findNode(id: string) {
    return nodes.value.find((node) => node.id === id)
  }
  function clearSelected() {
    selectedNodeIds.value = []
  }
  return {
    panelVisible,
    nodes,
    selectedNodeId,
    selectedNode,
    selectedNodeIds,
    addNode,
    selectNode,
    clearSelected,
    selectNodes,
    findNode,
  }
})
