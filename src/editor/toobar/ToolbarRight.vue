<script setup lang="ts">
import { Icon } from '@iconify/vue'

defineOptions({
  name: 'ToolbarRight',
})
</script>

<template>
  <div class="flex gap-20 toolbar-right justify-end">
    <span>
      <Icon icon="material-symbols:preview"></Icon>
    </span>
    <span>
      <Icon icon="codicon:json"> </Icon>
    </span>
    <span>
      <Icon icon="fluent-mdl2:web-publish"></Icon>
    </span>
    <span>
      <icon icon="mdi:import"></icon>
    </span>
    <span>
      <icon icon="mdi:export"></icon>
    </span>
  </div>
</template>

<style scoped lang="scss">
.toolbar-right {
  span {
    border: 1px solid #3b465b;
    border-radius: 4px;
    cursor: pointer;
  }
}
</style>
