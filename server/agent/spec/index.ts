import { Type } from 'typebox'

/**
 * 编辑器 PLC（页面 DSL）的运行时 Schema。
 *
 * 之前 shared/schema 只有 TS interface，约束只存在于编译期；模型生成的结构
 * 一路没有任何校验。这里用 TypeBox 把结构描述成 JSON Schema：
 * 1. 可以原样塞进提示词，让模型看到"字段是什么类型、哪些必填"；
 * 2. 可以在服务端对模型输出做运行时校验；
 * 3. 和 shared/materials 的默认 DSL 是同一份事实来源（材料本身也是 JSON）。
 *
 * TypeBox 的 Type.Object 产物就是标准 JSON Schema，不需要 zod→json 的转换步骤。
 */

export const LayoutJson = Type.Object({
  x: Type.Number({ description: '左边距像素' }),
  y: Type.Number({ description: '上边距像素' }),
  width: Type.Number({ description: '宽度像素' }),
  height: Type.Number({ description: '高度像素' }),
})

export const MaterialEventJson = Type.Object({
  type: Type.String({ description: '事件类型：click / dblclick / vnodeMounted' }),
  name: Type.String({ description: '事件名，用于跨组件 dispatch' }),
  title: Type.String({ description: '事件标题' }),
  code: Type.String({ description: '事件函数体，直接写语句，不包 function' }),
})

export const NodeJson = Type.Object({
  id: Type.String({ description: '组件唯一 id' }),
  type: Type.String({ description: '物料类型，如 bar-chart / text' }),
  name: Type.String({ description: '组件显示名' }),
  locked: Type.Optional(Type.Boolean()),
  layout: LayoutJson,
  style: Type.Optional(Type.Record(Type.String(), Type.Any(), { description: '内联 CSS 样式' })),
  props: Type.Record(Type.String(), Type.Any(), {
    description: '组件属性；图表组件是 { option: EChartsOption }，文本组件是 { content }',
  }),
  dataId: Type.Optional(Type.String({ description: '绑定的数据源 id' })),
  events: Type.Optional(Type.Array(MaterialEventJson)),
})

export const DataSourceJson = Type.Object({
  id: Type.String(),
  name: Type.String(),
  type: Type.Union([Type.Literal('static'), Type.Literal('api')], {
    description: 'static=静态数据，api=接口轮询',
  }),
  data: Type.Any({ description: 'static 是数据数组；api 是最近一次返回值（可为空数组）' }),
  url: Type.Optional(Type.String({ description: 'api 类型必填' })),
  interval: Type.Optional(Type.Number({ description: 'api 轮询间隔毫秒' })),
  params: Type.Optional(Type.Record(Type.String(), Type.Any())),
  method: Type.Optional(Type.Union([Type.Literal('get'), Type.Literal('post')])),
  responsePath: Type.Optional(Type.String({ description: '响应取值路径，如 data.list' })),
})

export const CanvasJson = Type.Object({
  width: Type.Number({ description: '画布宽，默认 1920' }),
  height: Type.Number({ description: '画布高，默认 1080' }),
  backgroundColor: Type.String({ description: 'CSS 颜色值' }),
})

export const PageJson = Type.Object({
  canvas: CanvasJson,
  nodes: Type.Array(NodeJson),
  dataSources: Type.Array(DataSourceJson),
})

/** 意图分类输出 */
export const IntentJson = Type.Object({
  intent: Type.Union(
    [
      Type.Literal('chat'),
      Type.Literal('create'),
      Type.Literal('modify'),
      Type.Literal('layout'),
      Type.Literal('data'),
      Type.Literal('event'),
      Type.Literal('chart'),
      Type.Literal('page'),
      Type.Literal('canvas'),
    ],
    { description: '用户这句话的意图' },
  ),
  reason: Type.String({ description: '一句话说明判断依据' }),
  skills: Type.Array(Type.String(), { description: '需要加载的 Skill id，没有就空数组' }),
})

export const TaskTypeJson = Type.Union([
  Type.Literal('node'),
  Type.Literal('chart'),
  Type.Literal('data'),
  Type.Literal('bind'),
  Type.Literal('event'),
  Type.Literal('canvas'),
  Type.Literal('page'),
])

export const PlanTaskJson = Type.Object({
  id: Type.String({ description: 't1、t2…' }),
  name: Type.String({ description: '给用户看的中文任务名' }),
  type: TaskTypeJson,
  dependsOn: Type.Array(Type.String(), { description: '依赖的任务 id' }),
  instruction: Type.String({
    description: '执行指令，可引用前序产物：${t1.nodeId} / ${t1.dataSourceId}',
  }),
})

export const PlanJson = Type.Object({
  summary: Type.String({ description: '一句话概述本次要完成的改动' }),
  tasks: Type.Array(PlanTaskJson, { description: '按执行顺序排列的任务' }),
})

/** 整页生成：先出区块，再由服务端实例化物料 */
export const PageBlockJson = Type.Object({
  type: Type.String({ description: '物料类型，只能取自物料目录' }),
  name: Type.String({ description: '组件名' }),
  grid: Type.Object({
    col: Type.Number({ description: '起始列，1-12 栅格' }),
    row: Type.Number({ description: '起始行' }),
    spanX: Type.Number({ description: '跨几列' }),
    spanY: Type.Number({ description: '跨几行' }),
  }),
  props: Type.Optional(
    Type.Record(Type.String(), Type.Any(), { description: '要覆盖的默认 props 片段' }),
  ),
  style: Type.Optional(Type.Record(Type.String(), Type.Any())),
  data: Type.Optional(
    Type.Object({
      name: Type.String({ description: '数据源名' }),
      kind: Type.Union([Type.Literal('static'), Type.Literal('api')]),
      url: Type.Optional(Type.String()),
      interval: Type.Optional(Type.Number()),
      rows: Type.Optional(
        Type.Array(Type.Record(Type.String(), Type.Any()), {
          description: 'static 数据行，字段名要和 encode 对应',
        }),
      ),
    }),
  ),
})

export const PagePlanJson = Type.Object({
  title: Type.String({ description: '页面标题' }),
  backgroundColor: Type.Optional(Type.String({ description: '画布背景色' })),
  blocks: Type.Array(PageBlockJson, { description: '页面区块，按行从上到下' }),
})
