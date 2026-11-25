import { chartMaterials } from '@shared/materials/charts/index.ts'
import { textMaterial } from '@shared/materials/text.ts'
import type { MaterialDefinition } from '@shared/schema/material.ts'

/**
 * 物料目录：与前端共享同一份纯数据定义。
 * AI 只能从这份目录创建节点，保证 type/props 与前端渲染器兼容。
 *
 * 目录可以是"请求级"的——前端会把自己当前的物料快照随请求发上来（章节八：
 * 每次请求都传递最新物料 Schema），这样前端新增/调整物料后，AI 不用等服务端发版。
 */
export interface MaterialCatalog {
  definitions: MaterialDefinition[]
  get(type: string): MaterialDefinition | undefined
  instantiate(type: string, id: string, layout?: Record<string, number>): any
  describe(): string
}

function normalize(definitions: MaterialDefinition[]): MaterialDefinition[] {
  const seen = new Set<string>()
  const list: MaterialDefinition[] = []
  for (const item of definitions) {
    const type = item?.schema?.type
    if (!type || typeof type !== 'string' || seen.has(type)) continue
    if (!item.schema.layout) continue
    seen.add(type)
    list.push(item)
  }
  return list
}

export function createMaterialCatalog(input?: MaterialDefinition[]): MaterialCatalog {
  const definitions = input?.length ? normalize(input) : [...chartMaterials, textMaterial]

  const get = (type: string) => definitions.find((item) => item.schema.type === type)

  return {
    definitions,
    get,
    instantiate(type, id, layout) {
      const definition = get(type)
      if (!definition) return undefined
      // 深拷贝默认 DSL，避免多个节点共享同一份 props 引用
      const node = JSON.parse(JSON.stringify(definition.schema))
      node.id = id
      if (layout) Object.assign(node.layout, layout)
      return node
    },
    describe() {
      return definitions
        .map((item) => {
          const schema = item.schema as any
          const option = schema.props?.option
          let dataHint = ''
          if (option?.dataset?.source?.length) {
            dataHint = `数据字段示例：${JSON.stringify(option.dataset.source[0])}`
          } else if (option?.series?.[0]?.encode) {
            dataHint = `encode 字段：${JSON.stringify(option.series[0].encode)}`
          } else if (option?.series?.[0]?.data?.length) {
            dataHint = `series.data 示例：${JSON.stringify(option.series[0].data[0])}`
          }
          const events = item.eventOptions?.length
            ? `｜事件 ${item.eventOptions.map((event) => event.value).join('/')}`
            : ''
          return `- type=${schema.type}｜${item.name}｜默认尺寸 ${schema.layout.width}x${schema.layout.height}${dataHint}${events}`
        })
        .join('\n')
    },
  }
}

/** 默认目录（不传前端快照时的兜底） */
export const defaultMaterialCatalog = createMaterialCatalog()

export function getDefinition(type: string) {
  return defaultMaterialCatalog.get(type)
}

export function instantiateMaterial(type: string, id: string, layout?: Record<string, number>) {
  return defaultMaterialCatalog.instantiate(type, id, layout)
}

export function describeMaterials() {
  return defaultMaterialCatalog.describe()
}
