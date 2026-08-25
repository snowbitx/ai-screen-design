import TextMaterial from './component.vue'
import type { MaterialDefinition } from '@/schema/material.ts'

const textMaterial: MaterialDefinition = {
  // 物料元数据
  name: '文本',
  group: 'info',
  icon: 'solar:text-bold',
  // 表单的配置
  setters: [
    {
      type: 'input',
      label: '内容',
      key: 'props.content',
    },
    {
      type: 'color',
      label: '颜色',
      key: 'style.color',
    },
    {
      type: 'number',
      label: '字号',
      key: 'style.fontSize',
    },
  ],
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
      color: '#ff0',
      fontSize: 20,
    },
    props: {
      content: 'hello world',
    },
    events: [
      {
        type: 'click',
        name: 'fn',
        code: 'console.log(123)',
        title: '点击事件',
      },
    ],
  },
}

export function install(regisiter) {
  regisiter(textMaterial, TextMaterial)
}
