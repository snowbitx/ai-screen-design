<script setup lang="ts">
defineOptions({
  name: 'MaterialItem',
})
defineProps(['material'])
</script>

<template>
  <div class="material-item">
    <div class="title">{{ material.name }}</div>
    <div class="icon">
      <Icon :icon="material.icon" width="80"></Icon>
    </div>
  </div>
</template>

<style scoped lang="scss">
.material-item {
  cursor: pointer;
  padding: 10px;
  height: 120px;
  background: bg-mix(40);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  transition: all 300ms ease-in-out;
  .title {
    height: 24px;
    font-size: 12px;
    font-weight: 700;
  }
  .icon {
    flex: 1;
    display: flex;
    justify-content: center;
    border: 1px solid var(--border-color);
    border-radius: 4px;
  }
  &:hover {
    transform: translateY(-2px);
    // 当前作用域下的border-color
    --border-color: #5e8382;
  }
}
</style>
