import { cancelRun, activeRunCount } from '../../agent/runs.ts'

/**
 * POST /api/agent/cancel —— 取消一次正在运行的 Agent 任务
 * 入参：{ runId }
 * 不直接断开 SSE，而是通知服务端中止 agent 循环并下发 rollback + done，
 * 前端因此能收到"已回滚"的确认。
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ runId?: string }>(event)
  if (!body?.runId) {
    throw createError({ statusCode: 400, statusMessage: '缺少 runId' })
  }
  const cancelled = cancelRun(body.runId)
  return { ok: cancelled, active: activeRunCount() }
})
