<script setup lang="ts">
import type { PageSchema } from '@shared/schema/page'
import ScreenRenderer from '@/components/ScreenRenderer/index.vue'

defineOptions({
  name: 'ScreenPage',
})

/**
 * 服务端渲染：$fetch 在 SSR 阶段直接调 Nitro 接口拿到页面 schema，
 * 浏览器收到的 HTML 里就有画布内容（原实现是客户端读 localStorage）
 */
const route = useRoute()
const id = computed(() => route.query.id as string)

const pageData = ref<PageSchema | null>(null)
const loadError = ref<string | null>(null)
try {
  pageData.value = await fetchPublishedPage(id.value)
} catch (e: any) {
  loadError.value = e?.message || '页面加载失败'
}
</script>

<template>
  <div v-if="loadError" class="p-40 text-center">{{ loadError }}</div>
  <ScreenRenderer v-else-if="pageData" :page="pageData" />
</template>
