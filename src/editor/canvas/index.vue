<script setup lang="ts">
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
import type { MaterialSchema } from '@/schema/material.ts'
defineOptions({
  name: 'CanvasRoot',
})
const moveableRef = useTemplateRef('moveableRef')
const stageRef = useTemplateRef('stage')

const selectedTarget = shallowRef<HTMLElement[]>()

const editorStore = useEditorStore()
// storeToRefs只能解构属性，方法必须手动取
const { nodes, selectedNodeIds, canvas } = storeToRefs(editorStore)

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

const canvasWidth = toRef(canvas.value, 'width')
const canvasHeight = toRef(canvas.value, 'height')

const canvasStyle = computed(() => {
  return {
    width: canvasWidth.value + 'px',
    height: canvasHeight.value + 'px',
    backgroundColor: canvas.value.backgroundColor,
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

function onDrop(e: DragEvent) {
  const data = e.dataTransfer.getData('scheme')
  const node = createNode(JSON.parse(data))
  // 拖过来时更新坐标
  node.layout.x = e.offsetX - node.layout.width / 2
  node.layout.y = e.offsetY - node.layout.height / 2
  editorStore.addNode(node)
  // 拖放过来立即选中,此时node还没渲染出来 所以target要通过css取dom上的节点
  editorStore.selectNode(node.id)
}

// 移动：改css  left top
// 尺寸：改css width height

function getNodeStyle(node: MaterialSchema, index: number): CSSProperties {
  return {
    width: node.layout.width + 'px',
    height: node.layout.height + 'px',
    left: node.layout.x + 'px',
    top: node.layout.y + 'px',
    // 图层
    zIndex: index + 1,
  }
}

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
}

function onSelectEnd(e) {
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

const commandMap = {
  copy: () => editorStore.copyNode(editorStore.selectedNode),
  remove: () => editorStore.removeNode(editorStore.selectedNode),
  // 颠倒是因为视觉上 物料反转了
  moveBottom: () => editorStore.moveTop(editorStore.selectedNode),
  moveTop: () => editorStore.moveBottom(editorStore.selectedNode),
  toggleLock: () => {
    editorStore.toggleLock(editorStore.selectedNode)
    // 单选右键锁定后不展示框选状态
    selectedTarget.value = []
  },
}

// 组件节点右键菜单
function onCommand(command: string) {
  commandMap[command]()
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
        <!--        给节点加右键菜单-->
        <el-dropdown
          v-for="(node, index) in nodes"
          :key="node.id"
          trigger="contextmenu"
          @command="onCommand"
        >
          <div
            class="canvas-node"
            :style="getNodeStyle(node, index)"
            :data-node-id="node.id"
            :data-node-locked="node.locked"
            @mousedown="onSelect(node, $event)"
          >
            <component :is="getMaterialComponent(node.type)" :schema="node"></component>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="copy">复制</el-dropdown-item>
              <el-dropdown-item command="remove">移除</el-dropdown-item>
              <el-dropdown-item command="moveTop">置顶</el-dropdown-item>
              <el-dropdown-item command="moveBottom">置底</el-dropdown-item>
              <el-dropdown-item command="toggleLock">{{
                node.locked ? '解锁' : '锁定'
              }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
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
    //@apply relative;
    position: relative;
    .canvas-node {
      //@apply absolute;
      position: absolute;
    }
  }
}
</style>
