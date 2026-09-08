<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useEditorStore } from '@/stores/editor.ts'
import { useUndoRedo } from '@/composables/useUndoRedo.ts'
import { useTheme } from '@/composables/useTheme.ts'

defineOptions({
  name: 'ToolbarLeft',
})

const { panelVisible } = useEditorStore()
const { toggle: toggleTheme, isClassic } = useTheme()

const { undo, redo, canUndo, canRedo } = useUndoRedo()
</script>

<template>
  <div class="flex gap-6 toolbar-left">
    <span
      :class="{ active: panelVisible.material }"
      title="物料面板"
      @click="panelVisible.material = !panelVisible.material"
    >
      <Icon icon="mynaui:panel-left-solid"></Icon>
    </span>
    <span
      :class="{ active: panelVisible.property }"
      title="属性面板"
      @click="panelVisible.property = !panelVisible.property"
    >
      <Icon icon="mynaui:panel-right-solid"> </Icon>
    </span>
    <span
      :class="{ active: panelVisible.layer }"
      title="图层"
      @click="panelVisible.layer = !panelVisible.layer"
    >
      <Icon icon="fe:layer"></Icon>
    </span>
    <span
      :class="{ active: panelVisible.ai }"
      title="AI 助手"
      @click="panelVisible.ai = !panelVisible.ai"
    >
      <Icon icon="mdi:robot-outline"></Icon>
    </span>
    <span class="divider"></span>
    <span :class="{ disabled: !canUndo }" title="撤销" @click="undo">
      <Icon icon="ic:baseline-undo"></Icon>
    </span>
    <span :class="{ disabled: !canRedo }" title="重做" @click="redo">
      <Icon icon="ic:baseline-redo"></Icon>
    </span>
    <span class="divider"></span>
    <span :title="isClassic ? '切换到 shadcn 浅色主题' : '切换到经典暗色主题'" @click="toggleTheme">
      <Icon :icon="isClassic ? 'mdi:weather-sunny' : 'mdi:weather-night'"></Icon>
    </span>
  </div>
</template>

<style scoped lang="scss">
.toolbar-left {
  span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    cursor: pointer;
    color: var(--muted-foreground);
    transition: all 150ms ease;

    &:hover {
      background: var(--accent);
      color: var(--accent-foreground);
    }
    &.active {
      background: color-mix(in srgb, var(--primary) 14%, transparent);
      color: var(--primary);
    }
    &.disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
  }
  .divider {
    width: 1px;
    height: 16px;
    background: var(--border);
    border-radius: 0;
    cursor: default;
    margin: 0 4px;
    &:hover {
      background: var(--border);
    }
  }
}
</style>
