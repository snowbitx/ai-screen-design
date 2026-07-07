<script setup lang="ts">
defineOptions({
  name: 'TextMaterial',
})

defineProps(['schema'])
</script>

<template>
  <div :style="schema.style">
    {{ schema.props.content }}
  </div>
</template>

<style scoped lang="scss"></style>
