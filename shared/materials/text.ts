import type { MaterialDefinition } from '@shared/schema/material.ts'

// 物料的纯数据定义（不依赖 Vue 组件），app 与 server 共用
export const textMaterial: MaterialDefinition = {
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
  eventOptions: [
    {
      label: '点击事件',
      value: 'click',
    },
    {
      label: '双击事件',
      value: 'dblclick',
    },
    {
      label: '组件挂载',
      value: 'vnodeMounted',
    },
    {
      label: 'foo',
      value: 'foo',
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
