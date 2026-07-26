import { defineStore } from 'pinia'
import type { MaterialSchema } from '@/schema/material.ts'
import type { PageSchema } from '@/schema/page.ts'
import { useUndoRedo } from '@/editor/useUndoRedo.ts'

export const useEditorStore = defineStore('editor', () => {
  const { applyChange } = useUndoRedo()

  const panelVisible = reactive({
    material: true,
    layer: true,
    property: true,
  })

  const page = ref<PageSchema>({
    canvas: {
      width: 1920,
      height: 1080,
      backgroundColor: '#0d121b',
    },
    // 和下面的nodes是同一个东西，用page 是聚合dsl数据。
    nodes: [],
  })

  /**
   * canvas编辑器数据
   */

  // 当前编辑器组件列表
  const nodes = toRef(page.value, 'nodes')
  const canvas = toRef(page.value, 'canvas')
  // 当前选中节点的id
  const selectedNodeIds = ref([])
  // 支持多选后，拿多选的结构来维护，这样可以共用清除选中
  const selectedNodeId = computed(() => {
    return selectedNodeIds.value.length === 1 ? selectedNodeIds.value[0] : null
  })

  /**
   * 当前选中的节点
   */
  const selectedNode = computed(() => {
    return nodes.value.find((node) => node.id === selectedNodeId.value)
  })

  function setNodes(newNodes) {
    applyChange(nodes, 'value', newNodes)
  }

  function addNode(node: MaterialSchema) {
    setNodes([...nodes.value, node])
  }
  /**
   * 单选方法
   */
  function selectNode(id: string) {
    selectedNodeIds.value = [id]
  }

  function selectNodes(ids: string[]) {
    selectedNodeIds.value = ids
  }

  function findNode(id: string) {
    return nodes.value.find((node) => node.id === id)
  }

  function clearSelected() {
    selectedNodeIds.value = []
  }

  function copyNode(node: MaterialSchema) {
    const newNode = JSON.parse(JSON.stringify(node))
    newNode.id = crypto.randomUUID()
    newNode.layout.x += 20
    newNode.layout.y += 20
    addNode(newNode)
    selectNode(newNode)
  }

  function removeNode(node: MaterialSchema) {
    setNodes(nodes.value.filter((item) => item.id !== node.id))
    selectedNodeIds.value = selectedNodeIds.value.filter((id) => id !== node.id)
  }
  function moveTop(node: MaterialSchema) {
    // [c,a,b,d]
    const index = nodes.value.findIndex((item) => item.id === node.id)
    const splicedNodes = nodes.value.toSpliced(index, 1)
    setNodes([node, ...splicedNodes])
  }
  function moveBottom(node: MaterialSchema) {
    // [c,a,b,d]
    const index = nodes.value.findIndex((item) => item.id === node.id)
    const splicedNodes = nodes.value.toSpliced(index, 1)
    setNodes([...splicedNodes, node])
  }

  function toggleLock(node: MaterialSchema) {
    applyChange(node, 'locked', !node.locked)
  }
  return {
    panelVisible,
    nodes,
    page,
    canvas,
    selectedNode,
    selectNode,
    addNode,
    selectedNodeId,
    selectedNodeIds,
    selectNodes,
    clearSelected,
    findNode,
    copyNode,
    removeNode,
    moveTop,
    moveBottom,
    toggleLock,
  }
})
