<script setup lang="ts">
import type { MaterialSchema } from '@/material/types.ts'
import { createNode, getMaterialComponent } from '@/material'
import type { CSSProperties } from 'vue'
import Moveable, {
  type OnDrag,
  type OnResize,
  type OnDragGroup,
  type OnResizeGroup,
} from 'vue3-moveable'
import Selecto from 'vue3-selecto'

import SketchRuler from 'vue3-sketch-ruler'
import 'vue3-sketch-ruler/lib/style.css'
import { useEditorStore } from '@/stores/editor.ts'
import { storeToRefs } from 'pinia'
import { debounce } from '@/util'
defineOptions({
  name: 'CanvasRoot',
})
const moveableRef = useTemplateRef('moveableRef')
const stageRef = useTemplateRef('stage')

const selectedTarget = shallowRef<HTMLElement>()

const editorStore = useEditorStore()
// storeToRefs只能解构属性，方法必须手动取
const { nodes } = storeToRefs(editorStore)

const palette = {
  bgColor: '#1f2937',
  longfgColor: '#6b7280',
  fontColor: '#9ca3af',
  fontShadowColor: '#0e8da7',
  shadowColor: 'rgba(14, 141, 167, 0.14)',
  lineColor: '#22c55e',
  lineType: 'solid',
  lockLineColor: '#4b5563',
  borderColor: '#374151',
  hoverBg: '#111827',
  hoverColor: '#ffffff',
}

const lines = ref({ h: [], v: [] })
const scale = ref(1)
const canvasRoot = useTemplateRef('canvasRoot')
const rectWidth = ref(1000)
const rectHeight = ref(800)

const onRootResize = debounce((rect) => {
  rectWidth.value = rect.width
  rectHeight.value = rect.height
}, 300)

const canvasWidth = ref(1920)
const canvasHeight = ref(1080)
const canvasStyle = computed(() => {
  return {
    width: canvasWidth.value + 'px',
    height: canvasHeight.value + 'px',
  }
})
onMounted(() => {
  const { width, height } = canvasRoot.value.getBoundingClientRect()
  rectWidth.value = width
  rectHeight.value = height
  // 监听尺寸变化 当画布变更时更新标尺
  const ob = new ResizeObserver((entries) => {
    const rect = entries[0].contentRect
    onRootResize(rect)
  })
  ob.observe(canvasRoot.value)
  onUnmounted(() => {
    ob.disconnect()
  })
})

const vm = getCurrentInstance()
function onDrop(e: DragEvent) {
  const data = e.dataTransfer.getData('scheme')
  const node = createNode(JSON.parse(data))
  // 拖过来时更新坐标
  node.layout.x = e.offsetX - node.layout.width / 2
  node.layout.y = e.offsetY - node.layout.height / 2
  editorStore.addNode(node)
  // 拖放过来立即选中,此时node还没渲染出来 所以target要通过css取dom上的节点
  editorStore.selectNode(node.id)
  nextTick(() => {
    // 不使用document查是防止其他页面有相同的选择器，从当前组件根节点开始查找
    selectedTarget.value = vm.proxy.$el.querySelector(`[data-node-id='${node.id}']`)
  })
}

// 移动：改css  left top
// 尺寸：改css width height

function getNodeStyle(node: MaterialSchema): CSSProperties {
  return {
    width: node.layout.width + 'px',
    height: node.layout.height + 'px',
    left: node.layout.x + 'px',
    top: node.layout.y + 'px',
  }
}

/**
 * 选中节点
 */
function onSelect(node: MaterialSchema, e: MouseEvent) {
  // 事件会冒泡，避免使用target拿到冒泡的节点，使用currentTarget拿到绑定mouseDown的真实target
  selectedTarget.value = e.currentTarget as HTMLElement
  editorStore.selectNode(node.id)
  /**
   * moveable首次拖放进来后直接拖拽不生效，手动触发一下
   */
  nextTick(() => {
    moveableRef.value.dragStart(e)
  })
}

function getNodeByTarget(element: HTMLElement) {
  const id = element.getAttribute('data-node-id')
  return editorStore.findNode(id)
}

function onDrag(e: OnDrag) {
  // 动态绑定的style是异步的，所以直接修改dom上的style保证拖动不漂移
  e.target.style.left = e.left + 'px'
  e.target.style.top = e.top + 'px'
  const node = getNodeByTarget(e.target as HTMLElement)
  node.layout.x = e.left
  node.layout.y = e.top
}

function onResize(e: OnResize) {
  e.target.style.width = e.width + 'px'
  e.target.style.height = e.height + 'px'
  const node = getNodeByTarget(e.target as HTMLElement)
  node.layout.width = e.width
  node.layout.height = e.height
  // 发现拖动时拖动左边会往右扩大。原因是往左拖动时宽度变了x轴没变，所以要手动更新下x轴和y轴
  onDrag(e.drag)
}

function onClearSelected() {
  editorStore.clearSelected()
  selectedTarget.value = null
}

function onSelectEnd(e) {
  selectedTarget.value = e.selected
  const ids = e.selected.map((element) => element.getAttribute('data-node-id'))
  editorStore.selectNodes(ids)
}

function onDragGroup(e: OnDragGroup) {
  // 框选多个拖拽时可拿到多个event数组，此时遍历数组调拖拽即可
  e.events.forEach(onDrag)
}

function onResizeGroup(e: OnResizeGroup) {
  e.events.forEach(onResize)
}

function onZoomChange() {
  // 缩放和拖动画布时更新moveable中节点的位置
  moveableRef.value.updateRect()
}
</script>

<template>
  <div class="canvas-root" ref="canvasRoot">
    <SketchRuler
      v-model:scale="scale"
      :thick="20"
      :palette="palette"
      :width="rectWidth"
      :height="rectHeight"
      :canvasWidth="canvasWidth"
      :canvasHeight="canvasHeight"
      :lines="lines"
      @zoomchange="onZoomChange"
    >
      <!--    画布台-->
      <div
        ref="stage"
        class="canvas-stage"
        :style="canvasStyle"
        @dragover.prevent
        @drop="onDrop"
        @mousedown.self="onClearSelected"
      >
        <div
          class="canvas-node"
          v-for="node in nodes"
          :key="node.id"
          :style="getNodeStyle(node)"
          :data-node-id="node.id"
          @mousedown="onSelect(node, $event)"
        >
          <component :is="getMaterialComponent(node.type)" :schema="node"></component>
        </div>
      </div>
    </SketchRuler>

    <!--    框选组件 和moveable为同一个作者-->
    <!--    container拖拽的框要挂在哪个节点下，挂到画布上面-->

    <!--    加v-if是避免在所有容器都可以框选：挂载时stageRef为undefined-->
    <!--    selectedFromInside 选中节点的时候也可以触发选区-->
    <Selecto
      v-if="stageRef"
      :container="stageRef"
      :dragContainer="stageRef"
      :selectedFromInside="false"
      :toggleContinueSelect="'shift'"
      :selectableTargets="['.canvas-node']"
      @selectEnd="onSelectEnd"
    />
    <!--    节点移动缩放组件-->
    <Moveable
      ref="moveableRef"
      :target="selectedTarget"
      :origin="false"
      :resizable="true"
      :draggable="true"
      @drag="onDrag"
      @dragGroup="onDragGroup"
      @resize="onResize"
      @resizeGroup="onResizeGroup"
    />
  </div>
</template>

<style scoped lang="scss">
.canvas-root {
  .canvas-stage {
    background: bg-mix(40);
    //@apply relative;
    position: relative;
    .canvas-node {
      //@apply absolute;
      position: absolute;
    }
  }
}
</style>
