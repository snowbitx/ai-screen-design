// GET /api/pages/:id —— 获取已发布页面（原 getPublishedPage 挪到这里）
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '缺少页面 id' })
  }
  return await getPage(id)
})
