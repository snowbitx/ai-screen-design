interface Layout {
  x: number
  y: number
  width: number
  height: number
}
export interface MaterialSchema {
  type: string
  name: string
  id: string
  layout: Layout
  style: Record<string, any>
  props: Record<string, any>
}

export interface MaterialDefinition {
  name: string
  group: string
  icon: string
  // 初始化物料时不需要id，id只在运行时需要 会拖拽drop时存入
  schema: Omit<MaterialSchema, 'id'>
}
