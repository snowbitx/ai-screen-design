<script setup lang="ts">
import type { MaterialSchema } from '@/material/types.ts'
import { createNode, getMaterialComponent } from '@/material'

defineOptions({
  name: 'CanvasRoot',
})
// MaterialSchema
const nodes = ref<MaterialSchema[]>([])

function onDrop(e: DragEvent) {
  const data = e.dataTransfer.getData('scheme')
  const node = createNode(JSON.parse(data))
  nodes.value.push(node)
}
</script>

<template>
  <div class="canvas-root">
    <!--    画布台-->
    <div class="canvas-stage" @dragover.prevent @drop="onDrop">
      <div v-for="node in nodes" :key="node.id">
        <component :is="getMaterialComponent(node.type)" :schema="node"></component>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.canvas-root {
  .canvas-stage {
    width: 600px;
    height: 600px;
    background: bg-mix(40);
    margin: 100px;
  }
}
</style>
