import type { AgentChatRequest, AgentStreamEvent } from '@shared/schema/agent.ts'
import type { MaterialDefinition } from '@shared/schema/material.ts'
import { runAgentGraph } from '../../agent/graph/run.ts'
import { registerRun, unregisterRun } from '../../agent/runs.ts'

const MAX_IMAGES = 4
// base64 字符数，约 6MB 原始图；前端已做缩放，这里只兜底
const MAX_IMAGE_CHARS = 8 * 1024 * 1024
const MAX_MATERIALS = 200

/**
 * POST /api/agent/chat —— 大屏 Agent Server（SSE）
 * 入参：{ message, page, history?, selectedNodeIds?, images?, materials?, mode? }
 * 事件：run_start / stage / intent / plan / task / progress / text / tool / action / page / rollback / done / error
 *
 * 前端边收边渲染：plan 出任务列表，task/progress 出进度，page 逐项下发，
 * 取消时服务端回滚并发 rollback 事件。
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<AgentChatRequest>(event)

  if (!body?.message || typeof body.message !== 'string') {
    throw createError({ statusCode: 400, statusMessage: '缺少 message' })
  }
  const page = body.page
  if (!page?.canvas || !Array.isArray(page.nodes) || !Array.isArray(page.dataSources)) {
    throw createError({ statusCode: 400, statusMessage: '缺少合法的 page schema' })
  }

  const selectedNodeIds = Array.isArray(body.selectedNodeIds)
    ? body.selectedNodeIds.filter((id): id is string => typeof id === 'string')
    : []

  const images = (Array.isArray(body.images) ? body.images : [])
    .filter(
      (item) =>
        item?.data && typeof item.mimeType === 'string' && item.mimeType.startsWith('image/'),
    )
    .slice(0, MAX_IMAGES)
  if (images.some((item) => item.data.length > MAX_IMAGE_CHARS)) {
    throw createError({ statusCode: 413, statusMessage: '参考图过大，请压缩后再试' })
  }

  // 前端传来的物料目录快照：只接受有 schema.type 的条目，异常时退回服务端目录
  const materials = (Array.isArray(body.materials) ? body.materials : [])
    .filter((item): item is MaterialDefinition => Boolean(item?.schema?.type))
    .slice(0, MAX_MATERIALS)

  const config = useRuntimeConfig(event)
  const ai = config.ai as {
    provider?: string
    baseUrl?: string
    apiKey?: string
    model?: string
    embedModel?: string
  }

  // 未配置模型时直接返回 JSON 错误，避免先建立 SSE 再报错
  if (!ai.apiKey && process.env.NUXT_AI_MOCK !== '1') {
    throw createError({
      statusCode: 503,
      statusMessage: '未配置 AI 服务（设置 NUXT_AI_API_KEY 环境变量）',
    })
  }

  const stream = createEventStream(event)
  const controller = new AbortController()

  // res 关闭时区分"正常结束"和"客户端断开"：SSE 长连接下 req 的 close 可能提前触发，不能用 req
  event.node.res.on('close', () => {
    if (!event.node.res.writableEnded) controller.abort()
  })

  // 事件必须按序写入，用一个 promise 链串起来
  let chain: Promise<void> = Promise.resolve()
  const emit = (payload: AgentStreamEvent) => {
    chain = chain
      .then(() => stream.push({ event: payload.type, data: JSON.stringify(payload) }))
      .catch(() => {
        // 客户端已断开 / 流已关闭，忽略
      })
  }

  const runId = crypto.randomUUID()
  registerRun(runId, controller)
  emit({ type: 'run_start', runId })

  void (async () => {
    try {
      const result = await runAgentGraph({
        page,
        message: body.message as string,
        history: Array.isArray(body.history) ? body.history : [],
        selectedNodeIds,
        images,
        materials,
        mode: body.mode === 'direct' ? 'direct' : 'plan',
        ai,
        runId,
        signal: controller.signal,
        onEvent: emit,
      })
      // direct 模式没有独立的 page 事件，这里统一补一次；回滚时不再下发 page（rollback 已经带了快照）
      if (!result.aborted) emit({ type: 'page', page: result.page })
      emit({
        type: 'done',
        reply: result.reply,
        actions: result.actions,
        aborted: result.aborted,
        intent: result.intent,
      })
    } catch (error: any) {
      console.error('[agent] 运行失败:', error)
      emit({ type: 'error', message: error?.statusMessage || error?.message || 'Agent 运行失败' })
    } finally {
      unregisterRun(runId)
      await chain
      try {
        await stream.close()
      } catch {
        // 客户端已断开时关闭可能失败，忽略
      }
    }
  })()

  return stream.send()
})
