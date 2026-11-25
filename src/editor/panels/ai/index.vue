<script setup lang="ts">
import MessageList from '@/editor/panels/ai/components/MessageList.vue'
import { useStream } from '@langchain/vue'
import { deleteThreadId, getThreadId, setThreadId } from '@/editor/panels/ai/thread-storage.ts'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor.ts'
import { getAllMaterialSchema } from '@/materials'
import { CanvasSchema } from '@/editor/schema/common.ts'

defineOptions({
  name: 'AiPanel',
})
const message = ref('')

const editorStore = useEditorStore()
const { page, selectedNodeIds } = storeToRefs(editorStore)

const { messages, values, submit, isLoading, stop, client } = useStream({
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

/**
 * update_node 流程：
 * 1. 用户先在画布中选中一个节点
 * 2. 输入修改要求
 * 3. classifyTask 返回 edit/update_node
 * 4. handleEditTask 取得 selectedNodeIds[0]
 * 5. 从 page.nodes 找到当前节点
 * 6. 根据 node.type 找到物料 configSchema
 * 7. 大模型生成修改后的完整节点和回复消息
 * 8. Graph State 输出 update_node action
 * 9. 前端调用 editorStore.updateNode()
 * 10. 画布中的原节点被替换
 */
watch(
  () => values.value.action,
  (action: any) => {
    if (!action) return

    if (action.type === 'add_node') {
      console.log('action.node ==> ', action.node)
      editorStore.addNode(toRaw(action.node))
    } else if (action.type === 'update_node') {
      console.log('action.node ==> ', action.node)
      editorStore.updateNode(action.node.id, toRaw(action.node))
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
