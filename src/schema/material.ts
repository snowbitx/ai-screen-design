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
  locked?: boolean
  layout: Layout
  style: Record<string, any>
  props: Record<string, any>
}

interface SetterSchema {
  // 严格要求有 key label type
  key: String
  label: String
  type: String
  [key: string]: any
}
export interface MaterialDefinition {
  name: string
  group: string
  icon: string
  setters: SetterSchema[]
  // 初始化物料时不需要id，id只在运行时需要 会拖拽drop时存入
  schema: Omit<MaterialSchema, 'id'>
}
