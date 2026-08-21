<script setup lang="ts">
import { getPublishedPage } from '@/utils/publish.ts'
import ScreenRenderer from '@/components/ScreenRenderer/index.vue'
import { useRoute } from 'vue-router'

defineOptions({
  name: 'ScreenPage',
})

const route = useRoute()

/**
 * 从 localStorage 中获取配置，工作中是从后台获取
 */
const page = getPublishedPage(route.query.id as string)
</script>

<template>
  <ScreenRenderer :page="page" />
</template>
