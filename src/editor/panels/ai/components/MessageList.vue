<script setup lang="ts">
import { Icon } from '@iconify/vue'
import MarkdownRender from 'markstream-vue'
import 'markstream-vue/index.css'
defineOptions({
  name: 'MessageList',
})
const props = defineProps(['messages', 'isLoading'])

const messageListRef = useTemplateRef('messageList')
const messageContainerRef = useTemplateRef('messageContainer')

// ai的消息为空不展示消息，最后一条消息为loading时要展示
const visibleMessages = computed(() => {
  const lastIndex = props.messages.length - 1
  return props.messages.filter(
    (item, index) => item.text || (lastIndex === index && props.isLoading),
  )
})
let isScroll = true
onMounted(() => {
  const resizeObserver = new ResizeObserver(() => {
    console.log('高度变化了')
    if (!isScroll) return
    const el = messageContainerRef.value
    el.scrollTop = el.scrollHeight
  })
  resizeObserver.observe(messageListRef.value)
})

function onScroll() {
  const el = messageContainerRef.value
  // 手动滚动时 如果滚动快到底部时 开启自动滚动 否则暂停自动滚动
  isScroll = el.scrollHeight - el.scrollTop - el.clientHeight <= 30
}
</script>

<template>
  <div ref="messageContainer" class="message-container" @scroll="onScroll">
    <div ref="messageList" class="flex flex-col gap-10 py-10">
      <div
        v-for="message in visibleMessages"
        :key="message.id"
        class="message-box flex gap-10 overflow-auto -m-20 p-20"
        :class="message.type"
      >
        <el-avatar class="avatar" :size="28">
          <Icon :icon="message.type === 'human' ? 'mdi:account' : 'mdi:robot-outline'" />
        </el-avatar>
        <div class="message-content">
          <!--        <span v-if="message.text">{{ message.text }}</span>-->
          <MarkdownRender
            v-if="message.text"
            :render-code-blocks-as-pre="false"
            :code-block-props="{ showCopyButton: true }"
            :content="message.text"
            mode="chat"
            html-policy="escape"
            :final="true"
          />
          <span v-else class="typing">...</span>
        </div>
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

.typing {
  animation: typing-animation 1s infinite;
}
@keyframes typing-animation {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
}
</style>
