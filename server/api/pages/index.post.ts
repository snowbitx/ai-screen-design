// POST /api/pages —— 发布页面（原 publishPage 的 localStorage 写入挪到这里）
import type { PageSchema } from '@shared/schema/page'

export default defineEventHandler(async (event) => {
  const page = await readBody<PageSchema>(event)
  if (!page || !page.canvas || !Array.isArray(page.nodes)) {
    throw createError({ statusCode: 400, statusMessage: '页面 schema 不合法' })
  }
  const id = await savePage(page)
  return { id }
})
