<script setup lang="ts">
import { useEditorStore } from '@/stores/editor.ts'
import { storeToRefs } from 'pinia'
import type { MaterialSchema } from '@/schema/material.ts'
import type { CSSProperties } from 'vue'
import { getMaterialComponent } from '@/material'

defineOptions({
  name: 'ScreenPreview',
})

const editorStore = useEditorStore()
const { nodes, canvas, dataSources } = storeToRefs(editorStore)

const scale = ref(0)
const left = ref(0)
const top = ref(0)
provide('dataSources', dataSources)

const canvasStyle = computed(() => {
  return {
    width: canvas.value.width + 'px',
    height: canvas.value.height + 'px',
    backgroundColor: canvas.value.backgroundColor,
    transform: `translate(${left.value}px,${top.value}px) scale(${scale.value})`,
    transformOrigin: 'left top',
  }
})

// editor组件用过 获取节点的样式
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

function init() {
  const y = window.innerHeight / canvas.value.height
  const x = window.innerWidth / canvas.value.width
  // 取最小值，保持缩放比例 否则画布组件会变形
  scale.value = Math.min(x, y)

  // 使用translate位移保证缩放后位置居中
  left.value = (window.innerWidth - canvas.value.width * scale.value) / 2
  top.value = (window.innerHeight - canvas.value.height * scale.value) / 2
}
onMounted(() => {
  init()
  addEventListener('resize', init)
  onBeforeUnmount(() => {
    removeEventListener('resize', init)
  })
})
</script>

<template>
  <div class="preview-container">
    <div class="canvas-root" :style="canvasStyle">
      <div
        class="canvas-node"
        v-for="(node, index) in nodes"
        :key="node.id"
        :style="getNodeStyle(node, index)"
      >
        <component :is="getMaterialComponent(node.type)" :schema="node"></component>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.preview-container {
  width: 100vw;
  height: 100vh;
  .canvas-root {
    position: relative;
    .canvas-node {
      position: absolute;
    }
  }
}
</style>
