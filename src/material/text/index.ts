import type { MaterialDefinition } from '@/material/types.ts'

const textMaterial: MaterialDefinition = {
  // 物料元数据
  name: '文本',
  group: 'info',
  icon: 'solar:text-bold',
  // DSL设计
  schema: {
    type: 'text',
    name: '普通文本',
    layout: {
      x: 0,
      y: 0,
      width: 300,
      height: 50,
    },
    style: {
      color: 'black',
    },
    props: {
      content: 'hello world',
    },
  },
}

export function install(regisiter) {
  regisiter(textMaterial)
}
