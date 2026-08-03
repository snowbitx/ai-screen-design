import type { MaterialSchema } from '@/schema/material.ts'

interface CanvasSchema {
  width: number
  height: number
  backgroundColor: string
}

// 页面DSL设计
export interface PageSchema {
  canvas: CanvasSchema
  nodes: MaterialSchema[]
  dataSources: DataSourceSchema[]
}

export interface DataSourceSchema {
  /**
   * 数据源类型 静态类型/接口请求
   */
  type: 'static' | 'api'
  id: string
  name: string
  data: any
  // 接口请求的 api 数据源需要url
  url?: string
  // 接口轮询
  interval?: number
  // 预设参数
  params: Record<string, any>
}
