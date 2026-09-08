import type { PageSchema } from '@shared/schema/page'

/**
 * 发布页面：调 Nitro 服务端接口存储（原来是 localStorage）
 * 返回页面 id，用于 /screen?id=xx 访问
 */
export async function publishPage(page: PageSchema): Promise<string> {
  const { id } = await $fetch<{ id: string }>('/api/pages', {
    method: 'POST',
    body: JSON.parse(JSON.stringify(page)),
  })
  page.id = id
  return id
}

/**
 * 服务端获取已发布页面，供 /screen 页 SSR 使用
 */
export function fetchPublishedPage(id: string) {
  return $fetch<PageSchema>(`/api/pages/${id}`)
}
