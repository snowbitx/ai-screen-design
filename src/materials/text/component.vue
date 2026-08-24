<script setup lang="ts">
defineOptions({
  name: 'TextMaterial',
})

const props = defineProps(['schema'])

const textStyle = computed(() => {
  const style = props.schema.style
  return {
    ...style,
    fontSize: style.fontSize + 'px',
  }
})
</script>

<template>
  <div :style="textStyle || {}">
    {{ schema.props.content }}
  </div>
</template>

<style scoped lang="scss"></style>
