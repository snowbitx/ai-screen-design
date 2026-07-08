<script setup lang="ts">
import type { MaterialSchema } from '@/material/types.ts'
import { createNode, getMaterialComponent } from '@/material'
import type { CSSProperties } from 'vue'
import Moveable, { type OnDrag, type OnResize } from 'vue3-moveable'
import { useEditorStore } from '@/stores/editor.ts'
import { storeToRefs } from 'pinia'
defineOptions({
  name: 'CanvasRoot',
})
const moveableRef = useTemplateRef('moveableRef')

const selectedTarget = shallowRef<HTMLElement>()

const editorStore = useEditorStore()
// storeToRefs只能解构属性，方法必须手动取
const { nodes, selectedNode } = storeToRefs(editorStore)

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

function onDrag(e: OnDrag) {
  console.log('onDrag', e, selectedNode.value)
  // 动态绑定的style是异步的，所以直接修改dom上的style保证拖动不漂移
  selectedTarget.value.style.left = e.left + 'px'
  selectedTarget.value.style.top = e.top + 'px'

  selectedNode.value.layout.x = e.left
  selectedNode.value.layout.y = e.top
}

function onResize(e: OnResize) {
  console.log('onResize', e, selectedNode.value)
  selectedTarget.value.style.width = e.width + 'px'
  selectedTarget.value.style.height = e.height + 'px'

  selectedNode.value.layout.width = e.width
  selectedNode.value.layout.height = e.height
  // 发现拖动时拖动左边会往右扩大。原因是往左拖动时宽度变了x轴没变，所以要手动更新下x轴和y轴
  onDrag(e.drag)
}

function onClearSelected() {
  editorStore.clearSelected()
  selectedTarget.value = null
}
</script>

<template>
  <div class="canvas-root">
    <!--    画布台-->
    <div class="canvas-stage" @dragover.prevent @drop="onDrop" @mousedown.self="onClearSelected">
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
    <Moveable
      ref="moveableRef"
      :target="selectedTarget"
      :origin="false"
      :resizable="true"
      :draggable="true"
      @drag="onDrag"
      @resize="onResize"
    />
  </div>
</template>

<style scoped lang="scss">
.canvas-root {
  .canvas-stage {
    width: 600px;
    height: 600px;
    background: bg-mix(40);
    margin: 100px;
    //@apply relative;
    position: relative;
    .canvas-node {
      //@apply absolute;
      position: absolute;
    }
  }
}
</style>
