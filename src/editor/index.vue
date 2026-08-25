<script setup lang="ts">
import ToolbarLeft from '@/editor/toolbar/ToolbarLeft.vue'
import ToolbarRight from '@/editor/toolbar/ToolbarRight.vue'
import { useEditorStore } from '@/stores/editor.ts'
import MaterialPanel from '@/editor/panels/material/index.vue'
import LayerPanel from '@/editor/panels/layer/index.vue'
import CanvasRoot from '@/editor/canvas/index.vue'
import PropertyPanel from '@/editor/panels/property/index.vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { getPublishedPage } from '@/utils/publish.ts'

defineOptions({
  name: 'ScreenEditor',
})

const route = useRoute()

const editorStore = useEditorStore()
const pageId = route.query.id

if (pageId) {
  // 如果 pageId 有，去查询数据库（localStorage）
  const page = getPublishedPage(pageId as string)
  editorStore.setPage(page)
}

const { dataSources } = storeToRefs(editorStore)

provide('dataSources', dataSources)

const materialWidth = computed(() => (editorStore.panelVisible.material ? '260px' : '0'))
const layerWidth = computed(() => (editorStore.panelVisible.layer ? '160px' : '0'))
const propertyWidth = computed(() => (editorStore.panelVisible.property ? '360px' : '0'))
</script>

<template>
  <div class="editor h-screen select-none">
    <header class="header h-56 flex items-center px-20">
      <ToolbarLeft class="w-300" />
      <div class="flex-1 text-center">title</div>
      <ToolbarRight class="w-300" />
    </header>
    <main class="editor-main flex">
      <!--   物料   -->
      <MaterialPanel
        class="material overflow-hidden transition-all"
        :style="{ width: materialWidth }"
      />
      <!--   图层   -->
      <LayerPanel class="layer overflow-hidden transition-all" :style="{ width: layerWidth }" />

      <!--   画布   -->
      <CanvasRoot class="canvas flex-1" />
      <!--   属性   -->
      <PropertyPanel
        class="property overflow-hidden transition-all"
        :style="{ width: propertyWidth }"
      />
    </main>
  </div>
</template>

<style scoped lang="scss">
.editor {
  background: var(--bg-color);
  .header {
    border-bottom: 1px solid var(--border-color);
  }
  .editor-main {
    height: calc(100% - 56px);
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
