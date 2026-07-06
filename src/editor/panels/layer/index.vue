<script setup lang="ts">
defineOptions({
  name: 'LayerPanel',
})
</script>

<template>
  <!--  此处套一层h-full是因为外层为了切换时隐藏文字加了overflow-hidden-->
  <div class="h-full">
    <div class="h-full layer-panel overflow-auto">
      <div v-for="item in 40" :key="item">
        <span>柱状图</span>
        <span><Icon icon="fluent:list-bar-16-filled"></Icon></span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.layer-panel {
  padding: 10px;
  background: bg-mix(50);
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
