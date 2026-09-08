import { defineStore } from 'pinia'
import type { MaterialSchema } from '@shared/schema/material.ts'
import type { PageSchema } from '@shared/schema/page.ts'
import { useUndoRedo } from '@/composables/useUndoRedo.ts'
import { useTheme } from '@/composables/useTheme.ts'

// 两种主题对应的画布默认背景色
const THEME_CANVAS_BG = {
  light: '#f4f4f5',
  dark: '#0d121b',
}

export const useEditorStore = defineStore('editor', () => {
  const { applyChange } = useUndoRedo()
  const { isClassic } = useTheme()

  const panelVisible = reactive({
    material: true,
    layer: true,
    property: true,
    // AI 面板还是占位样式，默认收起
    ai: false,
  })

  const page = ref<PageSchema>({
    canvas: {
      width: 1920,
      height: 1080,
      // 新建页面时默认背景色跟随编辑器主题（用户可在画布属性里改）
      backgroundColor: isClassic.value ? THEME_CANVAS_BG.dark : THEME_CANVAS_BG.light,
    },
    // 和下面的nodes是同一个东西，用page 是聚合dsl数据。
    nodes: [],
    dataSources: [
      {
        type: 'static',
        id: '123',
        name: '销售数据',
        data: [
          {
            label: '一月',
            value: 100,
          },
          {
            label: '二月',
            value: 200,
          },
          {
            label: '三月',
            value: 300,
          },
        ],
      },
      {
        type: 'static',
        id: '456',
        name: '访问数据',
        data: [
          {
            label: '一月',
            value: 1000,
          },
          {
            label: '二月',
            value: 800,
          },
          {
            label: '三月',
            value: 1100,
          },
        ],
      },
      {
        type: 'api',
        id: '567',
        name: '上升趋势',
        url: '/api/data',
        interval: 2000,
        data: [],
      },
    ],
  })

  /**
   * canvas编辑器数据
   */

  // 当前编辑器组件列表
  const nodes = toRef(page.value, 'nodes')
  const canvas = toRef(page.value, 'canvas')
  const dataSources = toRef(page.value, 'dataSources')

  // 画布背景色还是主题默认值（用户没自定义过）时，切换主题立即跟随，无需刷新
  watch(isClassic, (classic) => {
    const target = classic ? THEME_CANVAS_BG.dark : THEME_CANVAS_BG.light
    if (canvas.value.backgroundColor === THEME_CANVAS_BG.dark || canvas.value.backgroundColor === THEME_CANVAS_BG.light) {
      applyChange(canvas.value, 'backgroundColor', target)
    }
  })

  function setPage(newPage: PageSchema) {
    Object.assign(page.value, newPage)
  }
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

  function updateNode(id, newNode) {
    const newNodes = nodes.value.map((node) => (node.id === id ? newNode : node))
    setNodes(newNodes)
  }
  return {
    panelVisible,
    nodes,
    page,
    canvas,
    dataSources,
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
    updateNode,
    setPage,
  }
})
