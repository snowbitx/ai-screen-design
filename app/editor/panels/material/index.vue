<script setup lang="ts">
import MaterialItem from '@/editor/panels/components/MaterialItem.vue'
import { getMaterialByGroup, getMaterialGroups } from '@/materials'
defineOptions({
  name: 'MaterialPanel',
})

const activeGroup = ref('charts')

const groups = getMaterialGroups()
const currentMaterials = computed(() => {
  return getMaterialByGroup(activeGroup.value)
})
</script>

<template>
  <div class="material-panel flex h-screen">
    <div class="nav w-50">
      <div
        :class="{ active: activeGroup === item.key }"
        v-for="item in groups"
        :key="item.key"
        @click="activeGroup = item.key"
      >
        <span><Icon :icon="item.icon" width="16"></Icon></span>
        <span>{{ item.name }}</span>
      </div>
    </div>
    <div class="material-list flex-1 p-10 overflow-auto">
      <MaterialItem
        class="mt-10"
        v-for="item in currentMaterials"
        :key="item.name"
        :material="item"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.material-panel {
  background: var(--background);
  .nav {
    border-right: 1px solid var(--border);
    background: var(--muted);
    div {
      height: 50px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 2px;
      font-size: 12px;
      color: var(--muted-foreground);
      cursor: pointer;
      position: relative;
      transition: all 150ms ease;
      &:hover {
        color: var(--foreground);
      }
      &.active {
        background: var(--background);
        color: var(--foreground);
        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 12px;
          bottom: 12px;
          width: 2px;
          border-radius: 1px;
          background: var(--primary);
        }
      }
    }
  }
  .material-list {
    scrollbar-color: color-mix(in srgb, var(--foreground) 25%, transparent) transparent;
    scrollbar-width: thin;
  }
}
</style>
