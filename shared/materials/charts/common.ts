import type { EventOption } from '@shared/schema/material.ts'

/**
 * 图表类物料通用事件选项（点击/双击/渲染完成）
 */
export const chartEventOptions: EventOption[] = [
  { label: '点击事件', value: 'click' },
  { label: '双击事件', value: 'dblclick' },
  { label: '组件挂载', value: 'vnodeMounted' },
]

/**
 * 带直角坐标系的图表通用 setters（标题/图例/网格边距）
 */
export function cartesianSetters(opts: {
  seriesColorLabel?: string
  seriesColorKey?: string
  xFieldLabel?: string
  xFieldKey?: string
  yFieldLabel?: string
  yFieldKey?: string
}) {
  const setters: any[] = [
    { type: 'input', label: '标题', key: 'props.option.title.text' },
    { type: 'color', label: '标题色', key: 'props.option.title.textStyle.color' },
    { type: 'checkbox', label: '图例显示', key: 'props.option.legend.show' },
    {
      type: 'select',
      label: '对齐',
      key: 'props.option.title.left',
      props: {
        options: [
          { label: '左对齐', value: 'left' },
          { label: '居中', value: 'center' },
          { label: '右对齐', value: 'right' },
        ],
      },
    },
  ]
  if (opts.seriesColorKey) {
    setters.push({ type: 'color', label: opts.seriesColorLabel || '颜色', key: opts.seriesColorKey })
  }
  if (opts.xFieldKey) {
    setters.push({ type: 'input', label: opts.xFieldLabel || 'X字段', key: opts.xFieldKey })
  }
  if (opts.yFieldKey) {
    setters.push({ type: 'input', label: opts.yFieldLabel || 'Y字段', key: opts.yFieldKey })
  }
  setters.push(
    { type: 'number', label: '上边距', key: 'props.option.grid.top', span: 12 },
    { type: 'number', label: '右边距', key: 'props.option.grid.right', span: 12 },
    { type: 'number', label: '下边距', key: 'props.option.grid.bottom', span: 12 },
    { type: 'number', label: '左边距', key: 'props.option.grid.left', span: 12 },
  )
  return setters
}
