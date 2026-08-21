<script setup lang="ts">
import type { MaterialSchema } from '@/schema/material.ts'
import { getMaterialComponent } from '@/materials'
import type { PageSchema } from '@/schema/page.ts'

defineOptions({
  name: 'ScreenRenderer',
})

const props = defineProps<{ page: PageSchema }>()

const canvas = computed(() => props.page.canvas)
const dataSources = computed(() => props.page.dataSources)
const nodes = computed(() => props.page.nodes)

const scale = ref(1)
const left = ref(0)
const top = ref(0)

provide('dataSources', dataSources)

const canvasStyle = computed(() => {
  return {
    width: canvas.value.width + 'px',
    height: canvas.value.height + 'px',
    backgroundColor: canvas.value.backgroundColor,
    transform: `translate(${left.value}px, ${top.value}px) scale(${scale.value})`,
    transformOrigin: 'left top',
  }
})

function getNodeStyle(node: MaterialSchema, index: number) {
  return {
    width: node.layout.width + 'px',
    height: node.layout.height + 'px',
    left: node.layout.x + 'px',
    top: node.layout.y + 'px',
    zIndex: index + 1,
  }
}

function init() {
  // 缩放比例计算
  const y = window.innerHeight / canvas.value.height
  const x = window.innerWidth / canvas.value.width
  // 谁小用谁的
  scale.value = Math.min(x, y)
  // 水平垂直居中计算
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
