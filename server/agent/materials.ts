import { chartMaterials } from '@shared/materials/charts/index.ts'
import { textMaterial } from '@shared/materials/text.ts'
import type { MaterialDefinition } from '@shared/schema/material.ts'

/**
 * 服务端物料目录：与前端共享同一份纯数据定义。
 * AI 工具只能从这份目录创建节点，保证 type/props 与前端渲染器兼容。
 */
export const materialCatalog: MaterialDefinition[] = [...chartMaterials, textMaterial]

export function getDefinition(type: string): MaterialDefinition | undefined {
  return materialCatalog.find((item) => item.schema.type === type)
}

/**
 * 从物料定义生成节点实例：深拷贝默认 DSL，补充运行时 id 与落点坐标。
 * 与前端 createNode + 拖放落点的逻辑等价。
 */
export function instantiateMaterial(type: string, id: string, layout?: Partial<MaterialDefinition['schema']['layout']>) {
  const definition = getDefinition(type)
  if (!definition) return undefined
  const node = JSON.parse(JSON.stringify(definition.schema))
  node.id = id
  if (layout) Object.assign(node.layout, layout)
  return node
}

/**
 * 生成给 LLM 的物料目录说明：type、名称、适用场景与数据字段提示。
 * 数据字段从默认 schema 的 encode/dataset 推导，保证与真实渲染一致。
 */
export function describeMaterials(): string {
  return materialCatalog
    .map((item) => {
      const s = item.schema as any
      const option = s.props?.option
      let dataHint = ''
      if (option?.dataset?.source?.length) {
        dataHint = `数据字段示例：${JSON.stringify(option.dataset.source[0])}`
      } else if (option?.series?.[0]?.encode) {
        dataHint = `encode 字段：${JSON.stringify(option.series[0].encode)}`
      } else if (option?.series?.[0]?.data?.length) {
        dataHint = `series.data 示例：${JSON.stringify(option.series[0].data[0])}`
      }
      return `- type=${s.type}｜${item.name}｜默认尺寸 ${s.layout.width}x${s.layout.height}${dataHint ? `｜${dataHint}` : ''}`
    })
    .join('\n')
}
