import type { MaterialDefinition } from '@shared/schema/material.ts'
import { chartEventOptions } from './common.ts'

// 仪表盘物料
export const gaugeMaterial: MaterialDefinition = {
  name: '仪表盘',
  group: 'charts',
  icon: 'flat-color-icons:display',
  setters: [
    { type: 'input', label: '标题', key: 'props.option.title.text' },
    { type: 'color', label: '标题色', key: 'props.option.title.textStyle.color' },
    { type: 'input', label: '名称', key: 'props.option.series.0.name' },
    { type: 'number', label: '最小值', key: 'props.option.series.0.min' },
    { type: 'number', label: '最大值', key: 'props.option.series.0.max' },
    { type: 'color', label: '指针色', key: 'props.option.series.0.anchor.itemStyle.color' },
  ],
  eventOptions: chartEventOptions,
  schema: {
    type: 'gauge-chart',
    name: '仪表盘',
    layout: { x: 0, y: 0, width: 360, height: 320 },
    props: {
      option: {
        title: { text: '完成率', left: 'center', top: 8, textStyle: { color: '#ffffff', fontSize: 16 } },
        series: [
          {
            type: 'gauge',
            name: '完成率',
            min: 0,
            max: 100,
            center: ['50%', '60%'],
            radius: '80%',
            startAngle: 210,
            endAngle: -30,
            progress: { show: true, width: 14, itemStyle: { color: '#22d3ee' } },
            axisLine: { lineStyle: { width: 14, color: [[1, 'rgba(148, 163, 184, 0.25)']] } },
            axisTick: { show: false },
            splitLine: { length: 8, lineStyle: { color: '#64748b' } },
            axisLabel: { color: '#cbd5e1', distance: 20, fontSize: 10 },
            pointer: { itemStyle: { color: '#22d3ee' } },
            anchor: { show: true, size: 12, itemStyle: { color: '#22d3ee' } },
            title: { color: '#cbd5e1', offsetCenter: [0, '72%'] },
            detail: { valueAnimation: true, fontSize: 22, color: '#ffffff', offsetCenter: [0, '48%'], formatter: '{value}%' },
            data: [{ value: 72 }],
          },
        ],
      },
    },
  },
}
