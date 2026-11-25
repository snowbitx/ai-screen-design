import type { MaterialSchema } from '@shared/schema/material.ts'

export interface DataShape {
  rows: number
  fields: { name: string; type: string }[]
}

/**
 * 推断数据源结构。
 * 章节十八的前置：只说"数据源"模型不知道里面有什么字段，绑定图表时 encode 只能瞎猜。
 * 这里从真实数据推断字段名和类型，作为结构化描述放进提示词和工具返回。
 */
export function describeDataShape(data: unknown): DataShape | null {
  if (!Array.isArray(data) || !data.length) return null
  const sample = data.find((row) => row && typeof row === 'object')
  if (!sample) return null
  return {
    rows: data.length,
    fields: Object.entries(sample as Record<string, unknown>).map(([name, value]) => ({
      name,
      type: valueType(value),
    })),
  }
}

export function formatDataShape(shape: DataShape | null): string {
  if (!shape) return '（无数据）'
  const fields = shape.fields.map((field) => `${field.name}:${field.type}`).join(', ')
  return `${shape.rows} 行｜字段 ${fields}`
}

function valueType(value: unknown): string {
  if (Array.isArray(value)) return 'array'
  if (value === null) return 'null'
  return typeof value
}

/**
 * 把图表的 encode 对齐到数据源真实字段。
 *
 * 绑定数据源后组件的 dataset.source 会被数据源数据整体替换，
 * 如果图表还按旧字段（month/sales）映射，绑完就是一张空图。
 * 这里按"第一个文本字段做类目、第一个数值字段做数值"兜底改写 encode，
 * 并在返回值里说明改了什么，方便模型/用户核对。
 */
export function alignChartEncode(
  node: MaterialSchema,
  data: unknown,
): { changed: boolean; encode?: Record<string, any>; reason?: string } {
  const shape = describeDataShape(data)
  if (!shape) return { changed: false }

  const option: any = (node.props as any)?.option
  const series = Array.isArray(option?.series) ? option.series : []
  const target = series.find((item: any) => item?.encode) || series[0]
  if (!target) return { changed: false }

  const keys = shape.fields.map((field) => field.name)
  const numeric = shape.fields.filter((field) => field.type === 'number').map((field) => field.name)
  const text = shape.fields.filter((field) => field.type === 'string').map((field) => field.name)
  const category = text[0] || keys[0]
  const value = numeric[0] || keys[1] || keys[0]

  const isPieLike = target.type === 'pie' || target.type === 'funnel'
  const encode: Record<string, any> = { ...target.encode }

  if (isPieLike) {
    const valid =
      keys.includes(encode.itemName) &&
      (keys.includes(encode.value) || typeof encode.value === 'number')
    if (valid) return { changed: false, encode }
    encode.itemName = category
    encode.value = value
  } else {
    const valid = keys.includes(encode.x) && keys.includes(encode.y)
    if (valid) return { changed: false, encode }
    encode.x = category
    encode.y = value
  }

  target.encode = encode
  return {
    changed: true,
    encode,
    reason: `数据源字段是 [${keys.join(', ')}]，图表 encode 已对齐为 ${JSON.stringify(encode)}`,
  }
}
