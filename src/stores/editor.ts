import { defineStore } from 'pinia'

import type { MaterialSchema } from '@/schema/material.ts'
import type { PageSchema } from '@/schema/page.ts'

export const useEditorStore = defineStore('editor', () => {
  // 布局组件控制物料，图层，属性面板的现实隐藏
  const panelVisible = reactive({
    material: true,
    layer: true,
    property: true,
  })

  // 方便保存数据，和后端交互
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

  function copyNode(node: MaterialSchema) {
    console.log(111)
    // 转json是因为和后端交互需要用json 所以此处用json做深拷贝
    const newNode = JSON.parse(JSON.stringify(node))
    newNode.id = crypto.randomUUID()
    newNode.layout.x += 20
    newNode.layout.y += 20
    addNode(newNode)
    selectNode(newNode)
  }
  function removeNode(node: MaterialSchema) {
    nodes.value = nodes.value.filter((item) => item.id !== node.id)
    selectedNodeIds.value = selectedNodeIds.value.filter((id) => id !== node.id)
  }
  // 置顶 删掉当前放到最前面
  function moveTop(node: MaterialSchema) {
    const index = selectedNodeIds.value.findIndex((item) => item.id === node.id)
    nodes.value.splice(index, 1)
    nodes.value.unshift(node)
  }
  function moveBottom(node: MaterialSchema) {
    const index = selectedNodeIds.value.findIndex((item) => item.id === node.id)
    nodes.value.splice(index, 1)
    nodes.value.push(node)
  }

  // 切换锁定
  function toggleLock(node: MaterialSchema) {
    node.locked = !node.locked
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
    canvas,
    copyNode,
    removeNode,
    moveTop,
    moveBottom,
    toggleLock,
  }
})
