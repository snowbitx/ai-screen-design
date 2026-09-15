<script setup lang="ts">
import MessageList from '@/editor/panels/ai/components/MessageList.vue'
import { useStream } from '@langchain/vue'

defineOptions({
  name: 'AiPanel',
})
const message = ref('')

const { messages, submit, isLoading } = useStream({
  apiUrl: 'http://localhost:2024',
  assistantId: 'screen_design_agent',
  // 可改websoket
  transport: 'sse',
})

function onSubmit() {
  if (!isLoading) return
  submit({
    messages: [
      {
        type: 'human',
        content: message.value,
      },
    ],
  })
  message.value = ''
}

function onkeydown(e: KeyboardEvent) {
  // shift换行时或者中文输入法打字时不发送
  if (e.shiftKey || e.isComposing) return
  e.preventDefault()
  onSubmit()
}
</script>

<template>
  <div class="ai-panel h-full">
    <div class="p-20 h-full flex flex-col">
      <MessageList class="message-list flex-1" :messages="messages"></MessageList>
      <footer class="flex flex-col flex-none gap-10">
        <el-input type="textarea" :rows="4" v-model="message" @keydown.enter="onkeydown"></el-input>
        <el-button type="primary" @click="onSubmit" :loading="isLoading">发送</el-button>
      </footer>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ai-panel {
  background: bg-mix(40);
}
</style>
