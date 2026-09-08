<script setup lang="ts">
// 原 src/editor/index.vue 就是编辑器主体，路径引用（@/editor/index.vue）
// Nuxt 组件自动导入只扫 app/components，editor 目录下的组件需显式引入
import ScreenEditor from '@/editor/index.vue'
</script>

<template>
  <ScreenEditor />
</template>
