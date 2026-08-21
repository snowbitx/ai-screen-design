import type { PageSchema } from '@/schema/page.ts'

/**
 * 存到 localStorage 中的 key
 */
const SCREEN_PUBLISH = 'screen-published'

/**
 * 存储结构
 * {
 *   '123': JSON.stringify(page),
 * }
 */

export function publishPage(page: PageSchema) {
  let value: string | Record<string, PageSchema> = localStorage.getItem(SCREEN_PUBLISH)
  if (value) {
    // 如果之前存过，转成 对象
    value = JSON.parse(value)
  } else {
    // 没有值，改成对象
    value = {}
  }
  // 如果 page.id 存在，直接用，否则创建 UUID
  const id = page.id || crypto.randomUUID()
  value[id] = JSON.parse(JSON.stringify(page))
  page.id = id
  localStorage.setItem(SCREEN_PUBLISH, JSON.stringify(value))
  return id
}

export function getPublishedPage(id: string) {
  const value = localStorage.getItem(SCREEN_PUBLISH)
  if (!value) {
    throw new Error('还没有发布过页面')
  }
  const map = JSON.parse(value)
  const page = map[id]
  if (!page) {
    // localStorage 中不存在这个 id
    throw new Error(`数据库里面没查到id为${id} 的数据`)
  }
  return page
}
