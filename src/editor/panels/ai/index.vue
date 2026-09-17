<script setup lang="ts">
import MessageList from '@/editor/panels/ai/components/MessageList.vue'
import { useStream } from '@langchain/vue'
import { deleteThreadId, getThreadId, setThreadId } from '@/editor/panels/ai/thread-storage.ts'

defineOptions({
  name: 'AiPanel',
})
const message = ref('')

const { messages, submit, isLoading, stop, client } = useStream({
  apiUrl: 'http://localhost:2024',
  assistantId: 'screen_design_agent',
  // 可改websoket
  transport: 'sse',
  threadId: getThreadId(),
  onThreadId(threadId) {
    // 和ai交互时传给commands接口的threadId 将之前的uuid传入useStream可以实现持久化，内部会调
    setThreadId(threadId)
  },
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

function onStop() {
  stop()
}

// 删掉会话id 也就是清空历史记录
async function onDelete() {
  const id = getThreadId()
  await client.threads.delete(id)
  deleteThreadId()
  location.reload()
}
</script>

<template>
  <div class="ai-panel h-full">
    <div class="p-20 h-full flex flex-col">
      <span class="cursor-pointer translate-z-1" @click="onDelete">
        <Icon icon="ant-design:delete-outlined"></Icon>
      </span>

      <MessageList
        class="message-list flex-1"
        :messages="messages"
        :isLoading="isLoading"
      ></MessageList>
      <footer class="flex flex-col flex-none gap-10">
        <el-input type="textarea" :rows="4" v-model="message" @keydown.enter="onkeydown"></el-input>
        <el-button v-if="!isLoading" type="primary" @click="onSubmit" :loading="isLoading"
          >发送</el-button
        >
        <el-button type="danger" @click="onStop">停止</el-button>
      </footer>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ai-panel {
  background: bg-mix(40);
}
</style>
