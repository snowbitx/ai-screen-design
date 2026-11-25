<script setup lang="ts">
import { ElMessage } from 'element-plus'
import type {
  AgentIntent,
  AgentPlanTask,
  AgentRunStage,
  AgentStreamEvent,
  AgentTaskStatus,
} from '@shared/schema/agent.ts'
import { getMaterialCatalog } from '@/materials/index.ts'

defineOptions({
  name: 'AiPanel',
})

interface ChatImage {
  data: string
  mimeType: string
  preview: string
  name: string
}

interface LiveTask {
  id: string
  name: string
  type: string
  status: AgentTaskStatus
  error?: string
  actions?: number
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  actions?: string[]
  images?: string[]
  tasks?: LiveTask[]
  intent?: AgentIntent
}

const editorStore = useEditorStore()
const { page } = toRefs(editorStore)

const input = ref('')
const loading = ref(false)
const error = ref('')
// 会话历史只保留文本，供多轮上下文使用
const history = ref<ChatMessage[]>([])
const listRef = useTemplateRef<HTMLElement>('listRef')

// 流式运行态
const controller = ref<AbortController | null>(null)
const streamingText = ref('')
const runningTools = ref<string[]>([])
const liveActions = ref<string[]>([])

// 计划与进度
const stage = ref<AgentRunStage | ''>('')
const intentInfo = ref<{ intent: AgentIntent; reason: string; skills?: string[] } | null>(null)
const planSummary = ref('')
const liveTasks = ref<LiveTask[]>([])
const progress = ref({ done: 0, total: 0 })
// 本次运行 id 与运行前快照：取消时前端本地兜底回滚
const runId = ref('')
const pageBeforeRun = ref<unknown>(null)

// 参考图
const pendingImages = ref<ChatImage[]>([])
const fileInput = ref<HTMLInputElement>()
const MAX_IMAGES = 3

const STAGE_LABELS: Record<AgentRunStage, string> = {
  classify: '理解需求',
  plan: '拆解任务',
  execute: '执行任务',
  summarize: '整理结果',
}

const INTENT_LABELS: Record<AgentIntent, string> = {
  chat: '问答',
  create: '新增组件',
  modify: '修改组件',
  layout: '调整布局',
  data: '数据源',
  event: '交互事件',
  chart: '图表配置',
  page: '整页生成',
  canvas: '画布设置',
}

const visibleMessages = computed(() => history.value)
const selectionHint = computed(() => {
  const count = editorStore.selectedNodeIds?.length || 0
  return count ? `将针对选中的 ${count} 个组件` : ''
})
const progressPercent = computed(() =>
  progress.value.total ? Math.round((progress.value.done / progress.value.total) * 100) : 0,
)

function scrollToBottom() {
  nextTick(() => {
    listRef.value?.scrollTo({ top: listRef.value.scrollHeight })
  })
}

watch(
  () => [
    history.value.length,
    streamingText.value.length,
    liveActions.value.length,
    liveTasks.value.map((task) => task.status).join(''),
    loading.value,
  ],
  scrollToBottom,
)

function resetRunState() {
  streamingText.value = ''
  runningTools.value = []
  liveActions.value = []
  stage.value = ''
  intentInfo.value = null
  planSummary.value = ''
  liveTasks.value = []
  progress.value = { done: 0, total: 0 }
  runId.value = ''
}

async function send() {
  const text = input.value.trim()
  if (loading.value) return
  if (!text && !pendingImages.value.length) return

  const message = text || '参考这张图生成大屏'
  input.value = ''
  error.value = ''
  loading.value = true
  resetRunState()

  const images = pendingImages.value.slice()
  history.value.push({ role: 'user', content: message, images: images.map((item) => item.preview) })
  pendingImages.value = []

  const ctrl = new AbortController()
  controller.value = ctrl
  // 取消时如果服务端来不及回来，用这份快照本地回滚
  pageBeforeRun.value = JSON.parse(JSON.stringify(page.value))
  // 整次运行的所有页面下发合并成一条撤销记录
  editorStore.beginAiRun()

  try {
    const res = await fetch('/api/agent/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        message,
        // 传给服务端的是纯数据副本，避免 reactive proxy 序列化问题
        page: JSON.parse(JSON.stringify(page.value)),
        history: history.value.slice(0, -1).map(({ role, content }) => ({ role, content })),
        selectedNodeIds: [...(editorStore.selectedNodeIds || [])],
        images: images.map(({ data, mimeType }) => ({ data, mimeType })),
        // 每次请求都带上当前物料目录，服务端以它为准建节点
        materials: JSON.parse(JSON.stringify(getMaterialCatalog())),
        mode: 'plan',
      }),
    })

    if (!res.ok || !res.body) {
      let detail = `请求失败（${res.status}）`
      try {
        const data = await res.json()
        detail = data?.statusMessage || data?.message || detail
      } catch {
        // 非 JSON 错误体，用默认文案
      }
      throw new Error(detail)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let reply = ''
    let actions: string[] = []
    let aborted = false

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const chunks = buffer.split('\n\n')
      // 最后一段可能不完整，留到下一轮
      buffer = chunks.pop() || ''

      for (const chunk of chunks) {
        const payload = parseEvent(chunk)
        if (!payload) continue
        switch (payload.type) {
          case 'run_start':
            runId.value = payload.runId
            break
          case 'stage':
            stage.value = payload.stage
            break
          case 'intent':
            intentInfo.value = {
              intent: payload.intent,
              reason: payload.reason,
              skills: payload.skills,
            }
            break
          case 'plan':
            planSummary.value = payload.summary
            liveTasks.value = payload.tasks.map((task: AgentPlanTask) => ({
              id: task.id,
              name: task.name,
              type: task.type,
              status: 'pending' as AgentTaskStatus,
            }))
            break
          case 'task': {
            const task = liveTasks.value.find((item) => item.id === payload.id)
            if (task) {
              task.status = payload.status
              if (payload.error) task.error = payload.error
              if (payload.actions !== undefined) task.actions = payload.actions
            }
            break
          }
          case 'progress':
            progress.value = { done: payload.done, total: payload.total }
            break
          case 'text':
            streamingText.value += payload.delta
            break
          case 'tool': {
            // 工具可能并行执行，用列表维护，避免一个结束就清空另一个的提示
            const label = payload.label || payload.name
            if (payload.phase === 'start') {
              if (!runningTools.value.includes(label)) runningTools.value.push(label)
            } else {
              runningTools.value = runningTools.value.filter((item) => item !== label)
            }
            break
          }
          case 'action':
            liveActions.value.push(payload.action)
            break
          case 'page':
            editorStore.applyAiPage(payload.page)
            break
          case 'rollback':
            editorStore.applyAiPage(payload.page)
            ElMessage.warning(payload.reason || '已回滚本次改动')
            break
          case 'done':
            reply = payload.reply
            actions = payload.actions
            aborted = payload.aborted
            break
          case 'error':
            throw new Error(payload.message)
        }
      }
    }

    history.value.push({
      role: 'assistant',
      content: reply || streamingText.value || (aborted ? '已停止' : '（没有返回内容）'),
      actions,
      tasks: liveTasks.value.map((task) => ({ ...task })),
      intent: intentInfo.value?.intent,
    })
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      // 连接被强制断开（服务端没来得及回 rollback）：用本地快照兜底恢复
      if (pageBeforeRun.value) editorStore.applyAiPage(pageBeforeRun.value as any)
      history.value.push({
        role: 'assistant',
        content: `${streamingText.value || '已停止'}${streamingText.value ? '\n（已停止）' : ''}`,
        actions: liveActions.value.slice(),
        tasks: liveTasks.value.map((task) => ({ ...task })),
      })
    } else {
      error.value = err?.data?.statusMessage || err?.message || '请求失败'
    }
  } finally {
    editorStore.endAiRun()
    controller.value = null
    runningTools.value = []
    loading.value = false
    streamingText.value = ''
    liveActions.value = []
  }
}

/** 解析 h3 输出的单个 SSE 事件块 */
function parseEvent(chunk: string): AgentStreamEvent | null {
  const dataLines: string[] = []
  for (const line of chunk.split('\n')) {
    if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
  }
  if (!dataLines.length) return null
  try {
    return JSON.parse(dataLines.join('\n')) as AgentStreamEvent
  } catch {
    return null
  }
}

/**
 * 停止：优先走取消接口，让服务端把 rollback 推完再关流；
 * 1.5s 内没等到 done 就强制断开连接。
 */
async function stop() {
  const id = runId.value
  if (!id) {
    controller.value?.abort()
    return
  }
  try {
    await fetch('/api/agent/cancel', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ runId: id }),
    })
    setTimeout(() => {
      if (loading.value) controller.value?.abort()
    }, 1500)
  } catch {
    controller.value?.abort()
  }
}

function clearChat() {
  history.value = []
  error.value = ''
  resetRunState()
}

function taskIcon(status: AgentTaskStatus) {
  switch (status) {
    case 'running':
      return 'svg-spinners:ring-resolver'
    case 'done':
      return 'mdi:check-circle'
    case 'failed':
      return 'mdi:alert-circle'
    case 'skipped':
      return 'mdi:minus-circle'
    default:
      return 'mdi:circle-outline'
  }
}

/* ---------------- 参考图 ---------------- */

function pickFiles() {
  fileInput.value?.click()
}

async function onFilesChange(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files?.length) return
  const room = MAX_IMAGES - pendingImages.value.length
  for (const file of Array.from(files).slice(0, room)) {
    if (!file.type.startsWith('image/')) continue
    try {
      pendingImages.value.push(await compressImage(file))
    } catch {
      ElMessage.error(`图片 ${file.name} 读取失败`)
    }
  }
  if (files.length > room) ElMessage.warning(`最多添加 ${MAX_IMAGES} 张参考图`)
  ;(e.target as HTMLInputElement).value = ''
}

/** 长边压到 1600px 再转 jpeg，控制传输体积（视觉模型不需要原图） */
async function compressImage(file: File): Promise<ChatImage> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const preview = canvas.toDataURL('image/jpeg', 0.85)
  return { data: preview.split(',')[1]!, mimeType: 'image/jpeg', preview, name: file.name }
}

function removeImage(index: number) {
  pendingImages.value.splice(index, 1)
}

// 面板全屏：铺满视口编辑器，再点一次或按 Esc 退出
const fullscreen = ref(false)

function toggleFullscreen() {
  fullscreen.value = !fullscreen.value
}

function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape' && fullscreen.value) fullscreen.value = false
}

onMounted(() => addEventListener('keydown', onEsc))
onBeforeUnmount(() => removeEventListener('keydown', onEsc))

async function copyMessage(msg: ChatMessage) {
  await navigator.clipboard.writeText(msg.content)
  ElMessage.success('复制成功')
}
</script>

<template>
  <!--  全屏时 fixed 铺满视口（zIndex 高于编辑器与 header），普通态由外层 flex 布局控制 -->
  <div class="ai-panel h-full flex flex-col bg-card" :class="{ 'is-fullscreen': fullscreen }">
    <header class="flex items-center justify-between px-16 py-10 border-b border-[--border-color]">
      <span class="flex items-center gap-6 text-13 font-medium">
        <Icon icon="mdi:robot-outline" width="18" />
        AI 助手
      </span>
      <span class="flex items-center gap-4">
        <el-tooltip content="清空会话">
          <el-button text size="small" :disabled="loading" @click="clearChat">
            <Icon icon="mdi:broom" width="16" />
          </el-button>
        </el-tooltip>
        <el-tooltip :content="fullscreen ? '退出全屏' : '全屏'">
          <el-button text size="small" @click="toggleFullscreen">
            <Icon
              :icon="fullscreen ? 'mdi:arrow-collapse-all' : 'mdi:arrow-expand-all'"
              width="16"
            />
          </el-button>
        </el-tooltip>
      </span>
    </header>

    <div ref="listRef" class="flex-1 overflow-auto px-12 py-10 flex flex-col gap-10">
      <template v-if="visibleMessages.length === 0">
        <div class="m-auto text-center text-muted-foreground">
          <Icon icon="mdi:robot-happy-outline" width="36" class="mx-auto mb-8" />
          <p class="text-13">描述你想要的大屏，我来帮你搭建</p>
          <p class="text-12 mt-4 opacity-70">
            例如："加一个销售额柱状图和访问趋势折线图，整齐排列"
          </p>
          <p class="text-12 mt-2 opacity-60">也可以上传参考图，让我照着生成</p>
        </div>
      </template>

      <!-- 外层留出 26px 给悬浮复制按钮，气泡本体不与按钮重叠 -->
      <div
        class="message-wrap flex"
        :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
        v-for="(msg, index) in visibleMessages"
        :key="index"
      >
        <div
          :class="['message', 'message-row', msg.role]"
          class="max-w-90% rounded-8 px-10 py-8 text-13 leading-relaxed whitespace-pre-wrap"
        >
          <div v-if="msg.images?.length" class="flex flex-wrap gap-6 mb-6">
            <img
              v-for="(src, i) in msg.images"
              :key="i"
              :src="src"
              class="chat-image"
              alt="参考图"
            />
          </div>
          <div>{{ msg.content }}</div>
          <!-- 已完成运行的执行计划，点开可回看每一步做了什么 -->
          <div v-if="msg.tasks?.length" class="mt-8 pt-6 border-t border-[--border-color]">
            <div class="text-11 opacity-45 mb-4">
              {{ msg.intent ? INTENT_LABELS[msg.intent] : '执行计划' }} ·
              {{ msg.tasks.filter((t) => t.status === 'done').length }}/{{ msg.tasks.length }}
            </div>
            <div
              v-for="task in msg.tasks"
              :key="task.id"
              class="flex items-start gap-4 text-12 leading-5"
              :class="task.status === 'failed' ? 'text-red-400' : 'opacity-70'"
            >
              <Icon :icon="taskIcon(task.status)" width="12" class="mt-1 shrink-0" />
              <span>
                {{ task.name }}
                <span v-if="task.error" class="opacity-70">（{{ task.error }}）</span>
              </span>
            </div>
          </div>
          <ul v-if="msg.actions?.length" class="mt-6 pl-16 list-disc opacity-60 text-12">
            <li v-for="(action, i) in msg.actions" :key="i">{{ action }}</li>
          </ul>
        </div>
        <el-tooltip content="复制" placement="top">
          <span class="copy-btn" @click="copyMessage(msg)">
            <Icon icon="mdi:content-copy" width="13"></Icon>
          </span>
        </el-tooltip>
      </div>

      <!-- 运行中：阶段 + 计划进度 + 流式正文 -->
      <div
        v-if="loading"
        class="message assistant max-w-90% rounded-8 px-10 py-8 text-13 whitespace-pre-wrap"
      >
        <!-- 阶段 -->
        <div class="flex items-center gap-6 text-12 opacity-70 mb-6">
          <Icon icon="svg-spinners:bars-scale-middle" width="14" />
          <span>{{ stage ? STAGE_LABELS[stage] : '准备中' }}</span>
          <span v-if="intentInfo" class="px-4 py-0.5 rounded-4 bg-white/5 text-11">
            {{ INTENT_LABELS[intentInfo.intent] }}
          </span>
          <span v-if="intentInfo?.skills?.length" class="text-11 opacity-60">
            Skill: {{ intentInfo.skills.join(', ') }}
          </span>
        </div>

        <!-- 计划 + 进度条 -->
        <div v-if="liveTasks.length" class="mb-8">
          <div v-if="planSummary" class="text-12 opacity-70 mb-4">{{ planSummary }}</div>
          <div class="progress-track mb-6">
            <div class="progress-bar" :style="{ width: `${progressPercent}%` }"></div>
          </div>
          <div
            v-for="task in liveTasks"
            :key="task.id"
            class="flex items-start gap-4 text-12 leading-5"
            :class="task.status === 'failed' ? 'text-red-400' : 'opacity-75'"
          >
            <Icon :icon="taskIcon(task.status)" width="12" class="mt-1 shrink-0" />
            <span>
              {{ task.name }}
              <span v-if="task.status === 'done' && task.actions" class="opacity-50">
                · {{ task.actions }} 步
              </span>
              <span v-if="task.error" class="opacity-70">（{{ task.error }}）</span>
            </span>
          </div>
        </div>

        <div v-if="streamingText">{{ streamingText }}</div>
        <div v-else-if="!liveTasks.length" class="flex items-center opacity-70">
          <Icon icon="svg-spinners:ring-resolver" width="14" class="mr-6" />
          正在思考…
        </div>
        <div
          v-for="tool in runningTools"
          :key="tool"
          class="mt-6 flex items-center gap-6 text-12 opacity-70"
        >
          <Icon icon="svg-spinners:ring-resolver" width="14" />
          {{ tool }}
        </div>
        <ul v-if="liveActions.length" class="mt-6 pl-16 list-disc opacity-50 text-12">
          <li v-for="(action, i) in liveActions" :key="i">{{ action }}</li>
        </ul>
      </div>
    </div>

    <p v-if="error" class="px-12 pb-4 text-12 text-red-400">{{ error }}</p>

    <footer class="p-10 border-t border-[--border-color]">
      <!-- 参考图预览 -->
      <div v-if="pendingImages.length" class="flex flex-wrap gap-6 mb-8">
        <div v-for="(img, index) in pendingImages" :key="index" class="image-chip">
          <img :src="img.preview" :alt="img.name" />
          <span class="image-remove" @click="removeImage(index)">
            <Icon icon="mdi:close" width="12" />
          </span>
        </div>
      </div>

      <div class="flex gap-8 items-end">
        <el-tooltip content="添加参考图">
          <el-button
            text
            :disabled="loading || pendingImages.length >= MAX_IMAGES"
            @click="pickFiles"
          >
            <Icon icon="mdi:image-plus" width="18" />
          </el-button>
        </el-tooltip>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          multiple
          class="hidden"
          @change="onFilesChange"
        />
        <el-input
          v-model="input"
          type="textarea"
          :rows="2"
          resize="none"
          placeholder="描述你想要的大屏，Enter 发送，Shift+Enter 换行"
          :disabled="loading"
          @keydown.enter.exact.prevent="send"
        />
        <el-button v-if="loading" @click="stop">
          <Icon icon="mdi:stop" width="16" class="mr-2" />
          停止
        </el-button>
        <el-button v-else type="primary" @click="send">发送</el-button>
      </div>
      <p v-if="selectionHint" class="mt-6 text-11 text-muted-foreground">{{ selectionHint }}</p>
    </footer>
  </div>
</template>

<style scoped lang="scss">
.ai-panel {
  border-left: 1px solid var(--border-color);

  // 全屏态：fixed 脱离 flex 流铺满视口，层级盖过编辑器各面板
  &.is-fullscreen {
    position: fixed;
    inset: 0;
    z-index: 1000;
    width: 100% !important;
    border-left: none;
  }
}

.message.user {
  align-self: flex-end;
  background: color-mix(in srgb, var(--bg-color), #22d3ee 18%);
}

.message.assistant {
  align-self: flex-start;
  background: bg-mix(8);
}

// 气泡本体不再负责对齐（外层 .message-wrap 用 justify-* 排列），覆盖旧的 align-self
.message-row {
  align-self: auto;
  max-width: calc(100% - 30px);
}

// 复制按钮挂在气泡旁边（助手消息在右、用户消息在左），不与文字重叠
.message-wrap {
  position: relative;
  width: 100%;

  .copy-btn {
    position: absolute;
    top: 2px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    cursor: pointer;
    color: var(--muted-foreground);
    opacity: 0;
    transition: all 150ms ease;

    &:hover {
      background: color-mix(in srgb, var(--foreground) 12%, transparent);
      color: var(--foreground);
    }
  }

  // 助手气泡靠左，按钮放右侧；用户气泡靠右，按钮放左侧
  .copy-btn {
    right: 0;
  }

  .message.user ~ .copy-btn {
    right: auto;
    left: 0;
  }

  &:hover .copy-btn {
    opacity: 1;
  }
}

// 气泡本体最大宽度留出按钮空间
.message-row {
  max-width: calc(100% - 30px);
}

// 任务进度条
.progress-track {
  width: 100%;
  height: 3px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--foreground) 10%, transparent);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, #22d3ee, #6366f1);
  transition: width 240ms ease;
}

.chat-image {
  width: 84px;
  height: 60px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.image-chip {
  position: relative;
  width: 56px;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border-color);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .image-remove {
    position: absolute;
    top: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    cursor: pointer;
    color: #fff;
    background: rgb(0 0 0 / 55%);

    &:hover {
      background: rgb(0 0 0 / 75%);
    }
  }
}
</style>
