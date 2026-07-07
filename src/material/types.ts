interface Layout {
  x: number
  y: number
  width: number
  height: number
}
interface MaterialSchema {
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
  // dsl中不需要id id为基础唯一标识
  schema: Omit<MaterialSchema, 'id'>
}
