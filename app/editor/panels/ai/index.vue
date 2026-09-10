<script setup lang="ts">
import type { PageSchema } from '@shared/schema/page.ts'

defineOptions({
  name: 'AiPanel',
})

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  actions?: string[]
}

const editorStore = useEditorStore()
const { page } = toRefs(editorStore)

const input = ref('')
const loading = ref(false)
const error = ref('')
// 会话历史只保留文本，供多轮上下文使用
const history = ref<ChatMessage[]>([])
const listRef = useTemplateRef<HTMLElement>('listRef')

const visibleMessages = computed(() => history.value)

watch(
  () => history.value.length,
  async () => {
    await nextTick()
    listRef.value?.scrollTo({ top: listRef.value.scrollHeight })
  },
)

async function send() {
  const message = input.value.trim()
  if (!message || loading.value) return

  input.value = ''
  error.value = ''
  loading.value = true
  history.value.push({ role: 'user', content: message })

  try {
    const res = await $fetch<{ reply: string; actions: string[]; page: PageSchema }>('/api/agent/chat', {
      method: 'POST',
      body: {
        message,
        // 传给服务端的是纯数据副本，避免 reactive proxy 序列化问题
        page: JSON.parse(JSON.stringify(page.value)),
        history: history.value.slice(0, -1).map(({ role, content }) => ({ role, content })),
      },
    })
    editorStore.applyAiPage(res.page)
    history.value.push({ role: 'assistant', content: res.reply, actions: res.actions })
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || '请求失败'
  } finally {
    loading.value = false
  }
}

function clearChat() {
  history.value = []
  error.value = ''
}
</script>

<template>
  <div class="ai-panel h-full flex flex-col bg-card">
    <header class="flex items-center justify-between px-16 py-10 border-b border-[--border-color]">
      <span class="flex items-center gap-6 text-13 font-medium">
        <Icon icon="mdi:robot-outline" width="18" />
        AI 助手
      </span>
      <el-tooltip content="清空会话">
        <el-button text size="small" @click="clearChat">
          <Icon icon="mdi:broom" width="16" />
        </el-button>
      </el-tooltip>
    </header>

    <div ref="listRef" class="flex-1 overflow-auto px-12 py-10 flex flex-col gap-10">
      <template v-if="visibleMessages.length === 0">
        <div class="m-auto text-center text-muted-foreground">
          <Icon icon="mdi:robot-happy-outline" width="36" class="mx-auto mb-8" />
          <p class="text-13">描述你想要的大屏，我来帮你搭建</p>
          <p class="text-12 mt-4 opacity-70">例如："加一个销售额柱状图和访问趋势折线图，整齐排列"</p>
        </div>
      </template>

      <div
        v-for="(msg, index) in visibleMessages"
        :key="index"
        :class="['message', msg.role]"
        class="max-w-90% rounded-8 px-10 py-8 text-13 leading-relaxed whitespace-pre-wrap"
      >
        <div>{{ msg.content }}</div>
        <ul v-if="msg.actions?.length" class="mt-6 pl-16 list-disc opacity-60 text-12">
          <li v-for="(action, i) in msg.actions" :key="i">{{ action }}</li>
        </ul>
      </div>

      <div v-if="loading" class="message assistant max-w-90% rounded-8 px-10 py-8 text-13">
        <Icon icon="svg-spinners:bars-scale-middle" width="16" class="mr-6 align-middle" />
        正在思考…
      </div>
    </div>

    <p v-if="error" class="px-12 pb-4 text-12 text-red-400">{{ error }}</p>

    <footer class="p-10 border-t border-[--border-color]">
      <div class="flex gap-8 items-end">
        <el-input
          v-model="input"
          type="textarea"
          :rows="2"
          resize="none"
          placeholder="描述你想要的大屏，Enter 发送，Shift+Enter 换行"
          :disabled="loading"
          @keydown.enter.exact.prevent="send"
        />
        <el-button type="primary" :loading="loading" @click="send">发送</el-button>
      </div>
    </footer>
  </div>
</template>

<style scoped lang="scss">
.ai-panel {
  border-left: 1px solid var(--border-color);
}

.message.user {
  align-self: flex-end;
  background: color-mix(in srgb, var(--bg-color), #22d3ee 18%);
}

.message.assistant {
  align-self: flex-start;
  background: bg-mix(8);
}
</style>
