<script setup lang="ts">
import MessageList from '@/editor/panels/ai/components/MessageList.vue'
import { useStream } from '@langchain/vue'
import { deleteThreadId, getThreadId, setThreadId } from '@/editor/panels/ai/thread-storage.ts'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor.ts'
import { getAllMaterialSchema } from '@/materials'
import { CanvasSchema } from '@/editor/schema/common.ts'
import { deepClone } from '@/utils'

defineOptions({
  name: 'AiPanel',
})
const message = ref('')

const editorStore = useEditorStore()
const { page, selectedNodeIds } = storeToRefs(editorStore)

const activeRunId = ref<string | null>(null)

const { messages, values, submit, isLoading, stop, client } = useStream({
  apiUrl: 'http://localhost:2024',
  assistantId: 'screen_design_agent',
  // 可改websoket
  transport: 'sse',
  threadId: getThreadId(),
  onThreadId: setThreadId,
  onCreated({ runId }) {
    activeRunId.value = runId
  },
})

const actionMethodMap = {
  add_node: 'addNode',
  update_node: 'updateNode',
  remove_node: 'removeNode',
} as const

watch(
  () => values.value.actions,
  (actions: any[]) => {
    if (!actions?.length) return

    for (const action of actions) {
      const method = actionMethodMap[action.type]
      if (!method) continue
      editorStore[method](deepClone(toRaw(action.node)))
    }
  },
)

function onSubmit() {
  console.log('page.value ==> ', page.value)
  if (isLoading.value) return
  submit({
    messages: [
      {
        type: 'human',
        content: message.value,
      },
    ],
    page: page.value,
    selectedNodeIds: selectedNodeIds.value,
    schema: {
      material: getAllMaterialSchema(),
      canvas: CanvasSchema.toJSONSchema(),
    },
  })
  message.value = ''
}

function onkeydown(e: KeyboardEvent) {
  // shift换行时或者中文输入法打字时不发送
  if (e.shiftKey || e.isComposing) return
  e.preventDefault()
  onSubmit()
}

async function onStop() {
  const threadId = getThreadId()
  const runId = activeRunId.value
  if (!threadId || !runId) return

  await client.runs.cancel(threadId, runId, true, 'rollback')

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
        <el-button v-else type="danger" @click="onStop">停止</el-button>
      </footer>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ai-panel {
  background: bg-mix(40);
}
</style>
