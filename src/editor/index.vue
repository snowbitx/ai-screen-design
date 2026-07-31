<script setup lang="ts">
import ToolbarLeft from '@/editor/toobar/ToolbarLeft.vue'
import ToolbarRight from '@/editor/toobar/ToolbarRight.vue'
import { useEditorStore } from '@/stores/editor.ts'
import MaterialPanel from '@/editor/panels/material/index.vue'
import LayerPanel from '@/editor/panels/layer/index.vue'
import CanvasRoot from '@/editor/canvas/index.vue'
import PropertyPanel from '@/editor/property/index.vue'
import { storeToRefs } from 'pinia'

defineOptions({
  name: 'ScreenEditor',
})

const { panelVisible } = useEditorStore()

const editorStore = useEditorStore()
const { dataSources } = storeToRefs(editorStore)

// 此处是为了区分编辑器渲染时的状态，将数据源注入给后代组件以便 运行时使用 不直接取editorStore数据
provide('dataSources', dataSources)
const materialWidth = computed(() => (panelVisible.material ? '260px' : 0))
const layerWidth = computed(() => (panelVisible.layer ? '160px' : 0))
const propertyWidth = computed(() => (panelVisible.property ? '360px' : 0))
</script>

<template>
  <div class="editor h-screen select-none">
    <header class="header h-56 flex items-center px-20">
      <ToolbarLeft class="w-300"></ToolbarLeft>
      <div class="flex-1 text-center">title</div>
      <ToolbarRight> </ToolbarRight>
    </header>
    <main class="flex h-[calc(100%-56px)]">
      <!--      物料-->
      <aside class="material overflow-hidden transition-all" :style="{ width: materialWidth }">
        <MaterialPanel />
      </aside>
      <!--      图层-->
      <aside class="layer overflow-hidden transition-all" :style="{ width: layerWidth }">
        <LayerPanel />
      </aside>
      <!--      画布-->
      <CanvasRoot class="canvas flex-1" />
      <!--      属性-->
      <aside class="property overflow-hidden transition-all" :style="{ width: propertyWidth }">
        <PropertyPanel />
      </aside>
    </main>
  </div>
</template>

<style scoped lang="scss">
.editor {
  background: var(--bg-color);
  .header {
    border-bottom: 1px solid var(--border-color);
  }
  .material,
  .layer {
    border-right: 1px solid var(--border-color);
  }
  .property {
    border-left: 1px solid var(--border-color);
  }
}
</style>
