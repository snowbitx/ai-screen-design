import type { PageSchema } from '@shared/schema/page.ts'
import type { MaterialDefinition } from '@shared/schema/material.ts'
import type {
  AgentChatHistoryItem,
  AgentImageInput,
  AgentIntent,
  AgentPlan,
  AgentPlanTask,
  AgentRunResult,
} from '@shared/schema/agent.ts'
import type { ImageContent } from '@earendil-works/pi-ai'
import { createMaterialCatalog } from '../materials.ts'
import type { AiRuntimeConfig } from '../model.ts'
import { runScreenAgent } from '../loop.ts'
import { isMockMode } from '../mock.ts'
import { describeSkills, matchSkills } from '../skills/index.ts'
import { createLlmRuntime, friendlyModelError, isFatalModelError, streamText } from './llm.ts'
import { classifyIntent } from './classify.ts'
import { buildPlan } from './plan.ts'
import { runPlan } from './scheduler.ts'
import { createCheckpoint, updateCheckpoint } from './checkpoint.ts'
import { createState, describePage, type EmitFn } from './state.ts'

export interface RunGraphOptions {
  page: PageSchema
  message: string
  history?: AgentChatHistoryItem[]
  selectedNodeIds?: string[]
  images?: AgentImageInput[]
  /** 前端物料快照，不传则用服务端共享目录 */
  materials?: MaterialDefinition[]
  /** plan=先规划再执行；direct=跳过规划，单轮自主工具循环 */
  mode?: 'plan' | 'direct'
  ai: AiRuntimeConfig
  runId?: string
  signal?: AbortSignal
  onEvent?: EmitFn
}

const CHAT_SYSTEM = `你是大屏设计器「AI Screen Design」的助手。用户这次不是在让你改画布，而是在提问或聊天。
用中文回答，简洁直接。涉及画布现状时基于下面提供的真实状态回答，不要编造组件或数据源。
如果用户其实是想改画布，明确告诉他可以直接说"帮我改/加/删"，你会进入编辑模式。

## 可用 Skill
${describeSkills()}`

/**
 * 一次完整的 Agent 运行：意图 → 计划 → 依赖调度执行 → 汇总。
 *
 * 这是"图"的入口。和直接让 Agent 自由循环相比，多了三层可控性：
 * - 计划可见：先出任务列表，再动手，用户能看到 AI 打算做什么；
 * - 顺序可控：依赖任务串行、无依赖任务并行；
 * - 过程可回滚：每个任务合并后增量下发，取消时回滚到 run 前快照。
 */
export async function runAgentGraph(options: RunGraphOptions): Promise<AgentRunResult> {
  const runId = options.runId || crypto.randomUUID()
  const emit: EmitFn = (event) => {
    try {
      options.onEvent?.(event)
    } catch {
      // 客户端断开时忽略上报失败
    }
  }

  const apiKey = options.ai.apiKey || ''
  // 离线 mock 模式不需要真实 key（走 faux provider）
  if (!apiKey && !isMockMode()) {
    throw createError({
      statusCode: 503,
      statusMessage: '未配置 AI 服务（设置 NUXT_AI_API_KEY 环境变量）',
    })
  }

  const catalog = createMaterialCatalog(options.materials)
  const llm = createLlmRuntime({ ...options.ai, apiKey }, options.signal)
  const state = createState({
    page: JSON.parse(JSON.stringify(options.page)),
    message: options.message,
    history: options.history,
    selectedNodeIds: options.selectedNodeIds,
    images: options.images,
    catalog,
    llm,
    emit,
  })

  createCheckpoint(runId, state.snapshot)
  const onAbort = () => {
    state.aborted = true
  }
  options.signal?.addEventListener('abort', onAbort, { once: true })

  try {
    if (options.mode === 'direct') {
      return await runDirect(options, emit)
    }

    // ---- 意图识别 ----
    emit({ type: 'stage', stage: 'classify' })
    const classified = await classifyIntentSafely(state)
    state.intent = classified.intent
    state.intentReason = classified.reason
    state.skills = mergeSkills(classified.skills, state.message)
    emit({
      type: 'intent',
      intent: state.intent,
      reason: state.intentReason,
      skills: state.skills,
    })

    if (state.intent === 'chat' && !state.aborted) {
      const reply = await answerChat(state)
      const result: AgentRunResult = {
        reply,
        actions: [],
        page: state.page,
        aborted: state.aborted,
        intent: state.intent,
      }
      updateCheckpoint(runId, { status: state.aborted ? 'aborted' : 'done' })
      return result
    }

    // 意图识别期间就被取消：直接回滚，不进规划
    if (state.aborted) return abortResult(state)

    // ---- 任务规划 ----
    emit({ type: 'stage', stage: 'plan' })
    let plan
    try {
      plan = await buildPlan(state)
    } catch (error: any) {
      // 模型本身不可用时回退没有意义，直接把原因抛给前端
      if (isFatalModelError(error)) throw error
      // 规划输出不合法不该让整次请求失败：退回自主工具循环，至少能完成用户的意图
      console.warn('[agent] 规划失败，回退 direct 模式：', error?.message)
      return await runDirect(options, emit)
    }

    if (!plan.tasks.length) return await runDirect(options, emit)

    state.plan = plan
    state.tasks = plan.tasks.map((task, index) => ({
      task,
      status: 'pending' as const,
      actions: [],
      index,
    }))
    emit({ type: 'plan', summary: plan.summary, tasks: plan.tasks })
    emit({ type: 'progress', done: 0, total: plan.tasks.length })
    updateCheckpoint(runId, { plan })

    // ---- 执行 ----
    emit({ type: 'stage', stage: 'execute' })
    await runPlan(state)

    // ---- 收尾 ----
    if (state.aborted) {
      updateCheckpoint(runId, { status: 'aborted' })
      return abortResult(state, plan)
    }

    emit({ type: 'stage', stage: 'summarize' })
    const reply = summarize(state, plan.tasks)
    emit({ type: 'text', delta: reply })
    updateCheckpoint(runId, { status: 'done' })

    return {
      reply,
      actions: state.actions,
      page: state.page,
      aborted: false,
      intent: state.intent,
      plan,
    }
  } catch (error) {
    updateCheckpoint(runId, { status: 'failed' })
    if (isFatalModelError(error)) {
      throw createError({ statusCode: 502, statusMessage: friendlyModelError(error) })
    }
    throw error
  } finally {
    options.signal?.removeEventListener('abort', onAbort)
  }
}

/** 取消收尾：把入口快照回滚给前端，并结束本次 run */
function abortResult(state: ReturnType<typeof createState>, plan?: AgentPlan): AgentRunResult {
  state.emit({ type: 'rollback', page: state.snapshot, reason: '用户取消，已回滚到运行前' })
  return {
    reply: '已停止并回滚本次改动。',
    actions: [],
    page: state.snapshot,
    aborted: true,
    intent: state.intent,
    plan,
  }
}

async function classifyIntentSafely(state: ReturnType<typeof createState>) {
  try {
    return await classifyIntent(state)
  } catch (error: any) {
    // 鉴权/配额/网络问题的重试没有意义，直接抛出去让前端提示
    if (isFatalModelError(error)) throw error
    console.warn('[agent] 意图识别失败，按 create 处理：', error?.message)
    return {
      intent: 'create' as AgentIntent,
      reason: '意图识别失败，按新增处理',
      skills: matchSkills(state.message).map((skill) => skill.id),
    }
  }
}

function mergeSkills(detected: string[], message: string): string[] {
  const ids = new Set(detected.filter(Boolean))
  for (const skill of matchSkills(message)) ids.add(skill.id)
  return [...ids]
}

async function answerChat(state: ReturnType<typeof createState>): Promise<string> {
  const images: ImageContent[] = (state.images || [])
    .filter((item) => item?.data)
    .map((item) => ({ type: 'image', data: item.data, mimeType: item.mimeType || 'image/png' }))

  const history = state.history
    .slice(-6)
    .map((item) => `${item.role === 'user' ? '用户' : '助手'}：${item.content.slice(0, 300)}`)
    .join('\n')

  return streamText(
    state.llm,
    {
      system: `${CHAT_SYSTEM}\n\n## 当前页面\n${describePage(state)}`,
      user: `${history ? `## 最近对话\n${history}\n\n` : ''}## 用户\n${state.message}`,
      images,
      maxTokens: 1200,
    },
    (delta) => state.emit({ type: 'text', delta }),
  )
}

/** 汇总语：用任务结果拼，不再多花一次模型调用 */
function summarize(state: ReturnType<typeof createState>, tasks: AgentPlanTask[]): string {
  const doneTasks = state.tasks.filter((item) => item.status === 'done')
  const failedTasks = state.tasks.filter((item) => item.status === 'failed')

  if (!doneTasks.length && failedTasks.length) {
    return `这次没能完成：${failedTasks.map((item) => `${item.task.name}（${item.error || '失败'}）`).join('；')}`
  }

  const addedNodes = state.page.nodes.length - state.snapshot.nodes.length
  const addedSources = state.page.dataSources.length - state.snapshot.dataSources.length
  const delta: string[] = []
  if (addedNodes > 0) delta.push(`新增 ${addedNodes} 个组件`)
  if (addedNodes < 0) delta.push(`删除了 ${-addedNodes} 个组件`)
  if (addedSources > 0) delta.push(`新增 ${addedSources} 个数据源`)

  const lines = [
    `已完成 ${doneTasks.length}/${tasks.length} 项：${doneTasks.map((item) => item.task.name).join('、')}。`,
  ]
  if (delta.length) lines.push(`画布变化：${delta.join('，')}。`)
  if (failedTasks.length) {
    lines.push(
      `未完成：${failedTasks.map((item) => item.task.name).join('、')}（${failedTasks[0]?.error || '失败'}）。`,
    )
  }
  return lines.join('')
}

/** 直连模式：跳过规划，交给 pi Agent 自主循环（兼容旧行为 / 规划失败兜底） */
async function runDirect(options: RunGraphOptions, emit: EmitFn): Promise<AgentRunResult> {
  const result = await runScreenAgent({
    page: options.page,
    message: options.message,
    history: options.history || [],
    selectedNodeIds: options.selectedNodeIds,
    images: options.images,
    materials: options.materials,
    ai: options.ai,
    signal: options.signal,
    onEvent: emit,
  })
  return { ...result, intent: options.mode === 'direct' ? undefined : 'create' }
}
