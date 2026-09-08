import type { PageSchema } from '@shared/schema/page'

/**
 * 发布页面的存储结构（原 localStorage 的 'screen-published' 挪到服务端）：
 * {
 *   [id]: PageSchema
 * }
 * useStorage 默认挂载文件系统（.data/ 目录），以后可无缝换 Redis 等驱动
 */

const PAGES_KEY = 'pages'

type PageMap = Record<string, PageSchema>

function pagesStorage() {
  return useStorage('data')
}

export async function savePage(page: PageSchema): Promise<string> {
  const storage = pagesStorage()
  const map = (await storage.getItem<PageMap>(PAGES_KEY)) || {}
  const id = page.id || crypto.randomUUID()
  map[id] = JSON.parse(JSON.stringify(page))
  map[id].id = id
  await storage.setItem(PAGES_KEY, map)
  return id
}

export async function getPage(id: string): Promise<PageSchema> {
  const map = (await pagesStorage().getItem<PageMap>(PAGES_KEY)) || {}
  const page = map[id]
  if (!page) {
    throw createError({
      statusCode: 404,
      statusMessage: `id为${id}的页面不存在`,
    })
  }
  return page
}
