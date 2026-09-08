<script setup lang="ts">
defineOptions({
  name: 'MaterialItem',
})

const props = defineProps(['material'])
function onStart(e: DragEvent) {
  e.dataTransfer?.setData('schema', JSON.stringify(props.material.schema))
}
</script>

<template>
  <div class="material-item" draggable="true" @dragstart="onStart">
    <div class="title">{{ material.name }}</div>
    <div class="icon">
      <Icon :icon="material.icon" width="80"></Icon>
    </div>
  </div>
</template>

<style scoped lang="scss">
.material-item {
  cursor: pointer;
  height: 120px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
  .title {
    height: 20px;
    font-size: 12px;
    font-weight: 600;
    color: var(--foreground);
  }
  .icon {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) - 2px);
    background: var(--muted);
  }
  transition: all 200ms ease-in-out;
  &:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--primary) 50%, var(--border));
    box-shadow: 0 4px 12px color-mix(in srgb, var(--foreground) 10%, transparent);
  }
}
</style>
