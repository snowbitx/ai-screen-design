<script setup lang="ts">
import MessageList from '@/editor/panels/ai/components/MessageList.vue'

defineOptions({
  name: 'AiPanel',
})
const message = ref('')
const messages = ref([
  {
    id: '1',
    type: 'human',
    text: '你好，你什么模型',
  },
  {
    id: '2',
    type: 'ai',
    text: '你好我是gpt',
  },
])
</script>

<template>
  <div class="ai-panel h-full">
    <div class="p-20 h-full flex flex-col">
      <MessageList class="message-list flex-1" :messages="messages"></MessageList>
      <footer class="flex flex-col flex-none gap-10">
        <el-input type="textarea" :rows="4" v-model="message"></el-input>
        <el-button type="primary">发送</el-button>
      </footer>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ai-panel {
  background: bg-mix(40);
}
</style>
