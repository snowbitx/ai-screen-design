<script setup lang="ts">
import { Icon } from '@iconify/vue'

defineOptions({
  name: 'MessageList',
})
defineProps(['messages'])
</script>

<template>
  <div class="message-container">
    <div
      v-for="message in messages"
      :key="message.id"
      class="message-box flex gap-10 overflow-auto -m-20 p-20"
      :class="message.type"
    >
      <el-avatar class="avatar" :size="28">
        <Icon :icon="message.type === 'human' ? 'mdi:account' : 'mdi:robot-outline'" />
      </el-avatar>
      <div class="message-content">
        {{ message.text }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.message-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  .message-content {
    background: #1b3039;
    padding: 8px 10px;
    border-radius: 4px 12px;
    max-width: 85%;
  }
  &.human {
    flex-direction: row-reverse;
    .message-content {
      border-radius: 4px 12px;
    }
    .avatar {
      --el-avatar-bg-color: #3b465b;
    }
  }
  &.ai {
    .avatar {
      --el-avatar-bg-color: #299467;
    }
  }
  .text {
    padding: 8px 10px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    line-height: 1.5;
  }
}
.message-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}
</style>
