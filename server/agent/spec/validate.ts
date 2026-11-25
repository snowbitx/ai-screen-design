import { Check, Errors } from 'typebox/value'
import type { TSchema } from 'typebox'

export interface ValidationResult {
  ok: boolean
  errors: string[]
}

/** 用 JSON Schema 校验任意值，返回可读的字段路径 + 原因 */
export function validate(schema: TSchema, value: unknown): ValidationResult {
  if (Check(schema, value)) return { ok: true, errors: [] }
  const errors = [...Errors(schema, value)]
    .slice(0, 12)
    .map((error) => `${error.instancePath || '/'} ${error.message}`)
  return { ok: false, errors }
}

/** 校验失败直接抛错，错误信息适合回灌给模型重新生成 */
export function assertValid(schema: TSchema, value: unknown, label: string): void {
  const result = validate(schema, value)
  if (!result.ok) {
    throw new Error(`${label} 结构不合法：${result.errors.join('；')}`)
  }
}

/**
 * 页面语义校验：结构之外还要保证引用成立。
 * 结构校验通过但语义不对（数据源缺 url、组件绑了不存在的数据源）同样会渲染失败。
 */
export function validatePageSemantics(page: {
  nodes: { id: string; dataId?: string; type: string }[]
  dataSources: { id: string; type: string; url?: string }[]
}): string[] {
  const errors: string[] = []
  const dataSourceIds = new Set(page.dataSources.map((item) => item.id))
  const nodeIds = new Set(page.nodes.map((item) => item.id))

  if (nodeIds.size !== page.nodes.length) errors.push('存在重复的组件 id')
  if (dataSourceIds.size !== page.dataSources.length) errors.push('存在重复的数据源 id')

  for (const source of page.dataSources) {
    if (source.type === 'api' && !source.url) {
      errors.push(`数据源 ${source.id} 是 api 类型但缺少 url`)
    }
  }
  for (const node of page.nodes) {
    if (node.dataId && !dataSourceIds.has(node.dataId)) {
      errors.push(`组件 ${node.id} 绑定了不存在的数据源 ${node.dataId}`)
    }
  }
  return errors
}
