<script setup lang="ts">
import CanvasProperty from '@/editor/property/components/CanvasProperty.vue'
import { useEditorStore } from '@/stores/editor.ts'
import { storeToRefs } from 'pinia'
import NodeProperty from '@/editor/property/components/NodeProperty.vue'

defineOptions({
  name: 'PropertyPanel',
})

const editorStore = useEditorStore()
const { selectedNode } = storeToRefs(editorStore)
</script>

<template>
  <div>
    <NodeProperty v-if="selectedNode" />
    <CanvasProperty v-else />
  </div>
</template>

<style scoped lang="scss"></style>
