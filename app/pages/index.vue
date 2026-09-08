// 原 router 里 path: '/' redirect: '/editor' 的等价实现
<script setup lang="ts">
definePageMeta({
  redirect: '/editor',
})
</script>

<template>
  <div />
</template>
