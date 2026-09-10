import type { PageSchema } from '@shared/schema/page.ts'
import { runScreenAgent } from '../../agent/loop'

/**
 * POST /api/agent/chat —— 大屏 Agent Server
 * 入参：{ message: string, page: PageSchema, history?: {role, content}[] }
 * 返回：{ reply, actions, page }，page 是工具修改后的完整 DSL，前端整体应用
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    message?: string
    page?: PageSchema
    history?: { role: 'user' | 'assistant'; content: string }[]
  }>(event)

  if (!body?.message || typeof body.message !== 'string') {
    throw createError({ statusCode: 400, statusMessage: '缺少 message' })
  }
  const page = body.page
  if (!page?.canvas || !Array.isArray(page.nodes) || !Array.isArray(page.dataSources)) {
    throw createError({ statusCode: 400, statusMessage: '缺少合法的 page schema' })
  }

  const config = useRuntimeConfig(event)
  const ai = config.ai as {
    provider?: string
    baseUrl?: string
    apiKey?: string
    model?: string
  }

  try {
    const { reply, actions } = await runScreenAgent(
      page,
      body.message,
      Array.isArray(body.history) ? body.history : [],
      ai,
      event.node.req.aborted ? undefined : getRequestSignal(event),
    )
    return { reply, actions, page }
  } catch (error: any) {
    if (error?.statusCode) throw error
    console.error('[agent] 运行失败:', error)
    throw createError({
      statusCode: 502,
      statusMessage: `Agent 运行失败：${error?.message || '未知错误'}`,
    })
  }
})

/**
 * 把 Node 请求的中断转成 AbortSignal（Nitro h3 v1 没有 getRequestSignal，这里兜底实现）
 */
function getRequestSignal(event: any): AbortSignal | undefined {
  const controller = new AbortController()
  event.node.req.on('close', () => {
    if (event.node.res.writableEnded) return
    controller.abort()
  })
  return controller.signal
}
