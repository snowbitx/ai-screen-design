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
}
