import type { MaterialDefinition } from '@shared/schema/material.ts'
import { chartEventOptions } from './common.ts'

// 树图物料
export const treeMaterial: MaterialDefinition = {
  name: '树图',
  group: 'charts',
  icon: 'flat-color-icons:org-unit',
  setters: [
    { type: 'input', label: '标题', key: 'props.option.title.text' },
    { type: 'color', label: '标题色', key: 'props.option.title.textStyle.color' },
    { type: 'select', label: '布局方向', key: 'props.option.series.0.orient', props: { options: [{ label: '横向', value: 'LR' }, { label: '纵向', value: 'TB' }] } },
    { type: 'color', label: '连线色', key: 'props.option.series.0.lineStyle.color' },
    { type: 'color', label: '节点色', key: 'props.option.series.0.itemStyle.color' },
  ],
  eventOptions: chartEventOptions,
  schema: {
    type: 'tree-chart',
    name: '树图',
    layout: { x: 0, y: 0, width: 460, height: 340 },
    props: {
      option: {
        title: { text: '部门结构', left: 'center', top: 8, textStyle: { color: '#ffffff', fontSize: 16 } },
        tooltip: { trigger: 'item' },
        series: [
          {
            type: 'tree',
            orient: 'LR',
            left: '8%',
            right: '16%',
            top: '8%',
            bottom: '8%',
            symbolSize: 10,
            lineStyle: { color: '#475569', width: 1.5 },
            itemStyle: { color: '#22d3ee' },
            label: { position: 'left', verticalAlign: 'middle', align: 'right', color: '#e2e8f0', fontSize: 12 },
            leaves: { label: { position: 'right', verticalAlign: 'middle', align: 'left', color: '#cbd5e1' } },
            expandAndCollapse: true,
            initialTreeDepth: 3,
            data: [
              {
                name: '总部',
                children: [
                  {
                    name: '研发部',
                    children: [
                      { name: '前端组' },
                      { name: '后端组' },
                      { name: '测试组' },
                    ],
                  },
                  {
                    name: '市场部',
                    children: [
                      { name: '国内运营' },
                      { name: '海外拓展' },
                    ],
                  },
                  { name: '人事部' },
                  { name: '财务部' },
                ],
              },
            ],
          },
        ],
      },
    },
  },
}
