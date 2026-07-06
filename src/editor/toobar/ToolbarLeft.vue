<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useEditorStore } from '@/stores/editor.ts'

defineOptions({
  name: 'ToolbarLeft',
})

const { panelVisible } = useEditorStore()
</script>

<template>
  <div class="flex gap-20 toolbar-left">
    <span
      :class="{ active: panelVisible.material }"
      @click="panelVisible.material = !panelVisible.material"
    >
      <Icon icon="mynaui:panel-left-solid"></Icon>
    </span>
    <span
      :class="{ active: panelVisible.property }"
      @click="panelVisible.property = !panelVisible.property"
    >
      <Icon icon="mynaui:panel-right-solid"> </Icon>
    </span>
    <span :class="{ active: panelVisible.layer }" @click="panelVisible.layer = !panelVisible.layer">
      <Icon icon="fe:layer"></Icon>
    </span>
    <span>
      <icon icon="material-symbols:undo"></icon>
    </span>
    <span>
      <icon icon="material-symbols:redo"></icon>
    </span>
  </div>
</template>

<style scoped lang="scss">
.toolbar-left {
  span {
    border: 1px solid #3b465b;
    border-radius: 4px;
    cursor: pointer;
    &.active {
      background-color: #299467;
    }
  }
}
</style>
