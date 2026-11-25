import type { MaterialCatalog } from './materials.ts'
import { DataSourceJson, NodeJson } from './spec/index.ts'

/** 数据绑定约定：图表怎么用数据集渲染（与 app/materials/charts/component.vue 一致） */
export const DATA_CONVENTIONS = `- 直角坐标系图表（柱/折线/面积/散点等）的数据放在 props.option.dataset.source，字段通过 series[0].encode.x/y 映射。
- 饼图/漏斗图用 encode.itemName/value，仪表盘改 series[0].data[0].value。
- dataset.source 用对象数组，每项 key 与 encode 对齐，如 [{label:'一月', value:120}]。
- 已有数据源时优先绑定数据源（dataId），不要在 option 里重复写死同样的数据。
- 用户没有给数据时，按语义生成 4~8 条合理的演示数据。`

/** 事件约定：与 app/runtime/context.ts 的沙箱 API 一致 */
export const EVENT_CONVENTIONS = `- 组件事件存 nodes[].events，形如 { type, name, title, code }，type 取自物料 eventOptions（click / dblclick / vnodeMounted）。
- code 是函数体，直接写语句，不要包 function；沙箱内可用 context、console、Math、JSON。
- 常用 context API：setProp(id,key,value)、setStyle(id,key,value)、setAttribute(id,key,value)、getNode(id)、trigger(id,'refresh')、dispatch(id,eventName,payload)、refreshNodesByDataId(dataId)。
- 生成事件代码时只用画布里真实存在的组件 id，不要编造。`

export function conventionsBlock() {
  return `## 数据约定\n${DATA_CONVENTIONS}\n\n## 事件约定\n${EVENT_CONVENTIONS}`
}

export function materialsBlock(catalog: MaterialCatalog) {
  return `## 可用物料\n${catalog.describe()}`
}

/**
 * 把节点/数据源的 JSON Schema 一起交给模型。
 *
 * 光给"物料目录"还不够：目录只说明了有哪些 type、默认尺寸多大，
 * 但没说明一个节点里到底有哪些字段、哪些必填、string 还是 number。
 * Schema 是同一份结构的机器可读描述，模型照着填，服务端照着校验。
 */
export function schemaBlock() {
  return `## 节点结构（JSON Schema）
${JSON.stringify(NodeJson)}

## 数据源结构（JSON Schema）
${JSON.stringify(DataSourceJson)}`
}
