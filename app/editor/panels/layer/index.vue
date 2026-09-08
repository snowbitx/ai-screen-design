<script setup lang="ts">
import { useEditorStore } from '@/stores/editor.ts'
import { useDraggable } from 'vue-draggable-plus'
defineOptions({
  name: 'LayerPanel',
})

const editorStore = useEditorStore()
const { nodes, selectedNodeIds } = toRefs(editorStore)

useDraggable('.layer-panel', nodes, {
  animation: 150,
})
</script>

<template>
  <!--  此处套一层h-full是因为外层为了切换时隐藏文字加了overflow-hidden-->
  <div class="h-full">
    <div class="h-full layer-panel overflow-auto">
      <div
        v-for="(node, index) in nodes"
        :key="node.id"
        :class="{ active: selectedNodeIds.includes(node.id) }"
        @click="editorStore.selectNode(node.id)"
      >
        <span>{{ node.name }}{{ index + 1 }}</span>
        <span><Icon icon="fluent:list-bar-16-filled"></Icon></span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.layer-panel {
  padding: 10px;
  background: bg-mix(50);
  display: flex;
  flex-direction: column-reverse;
  justify-content: start;
  & > div {
    margin-top: 4px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    padding: 0 10px;
    height: 30px;
    border: 1px solid var(--bg-color);
    background: bg-mix(70);
    font-size: 12px;
    border-radius: 4px;
    &.active {
      background: #0e8ba7;
    }
  }
}
</style>
