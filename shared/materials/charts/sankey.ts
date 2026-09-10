import type { MaterialDefinition } from '@shared/schema/material.ts'
import { chartEventOptions } from './common.ts'

// 桑基图物料
export const sankeyMaterial: MaterialDefinition = {
  name: '桑基图',
  group: 'charts',
  icon: 'flat-color-icons:flow-chart',
  setters: [
    { type: 'input', label: '标题', key: 'props.option.title.text' },
    { type: 'color', label: '标题色', key: 'props.option.title.textStyle.color' },
    { type: 'color', label: '连线色', key: 'props.option.series.0.lineStyle.color' },
    { type: 'number', label: '节点间距', key: 'props.option.series.0.nodeGap' },
  ],
  eventOptions: chartEventOptions,
  schema: {
    type: 'sankey-chart',
    name: '桑基图',
    layout: { x: 0, y: 0, width: 480, height: 340 },
    props: {
      option: {
        title: { text: '能量流向', left: 'center', top: 8, textStyle: { color: '#ffffff', fontSize: 16 } },
        tooltip: { trigger: 'item' },
        series: [
          {
            type: 'sankey',
            left: '6%',
            right: '10%',
            top: 48,
            bottom: '6%',
            nodeWidth: 14,
            nodeGap: 12,
            emphasis: { focus: 'adjacency' },
            lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.4 },
            label: { color: '#e2e8f0', fontSize: 12 },
            itemStyle: { borderColor: '#0d121b' },
            data: [
              { name: '电厂', itemStyle: { color: '#f59e0b' } },
              { name: '风电', itemStyle: { color: '#22d3ee' } },
              { name: '光伏', itemStyle: { color: '#facc15' } },
              { name: '工业', itemStyle: { color: '#34d399' } },
              { name: '居民', itemStyle: { color: '#a78bfa' } },
              { name: '商业', itemStyle: { color: '#f472b6' } },
            ],
            links: [
              { source: '电厂', target: '工业', value: 320 },
              { source: '电厂', target: '居民', value: 240 },
              { source: '电厂', target: '商业', value: 160 },
              { source: '风电', target: '居民', value: 140 },
              { source: '风电', target: '商业', value: 90 },
              { source: '光伏', target: '工业', value: 110 },
              { source: '光伏', target: '居民', value: 80 },
            ],
          },
        ],
      },
    },
  },
}
