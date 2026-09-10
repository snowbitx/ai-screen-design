import type { MaterialDefinition } from '@shared/schema/material.ts'
import { chartEventOptions } from './common.ts'

// 雷达图物料
export const radarMaterial: MaterialDefinition = {
  name: '雷达图',
  group: 'charts',
  icon: 'flat-color-icons:radar-plot',
  setters: [
    { type: 'input', label: '标题', key: 'props.option.title.text' },
    { type: 'color', label: '标题色', key: 'props.option.title.textStyle.color' },
    { type: 'checkbox', label: '图例显示', key: 'props.option.legend.show' },
    { type: 'color', label: '线颜色', key: 'props.option.series.0.lineStyle.color' },
    { type: 'color', label: '填充色', key: 'props.option.series.0.areaStyle.color' },
    { type: 'number', label: '雷达半径', key: 'props.option.radar.radius' },
  ],
  eventOptions: chartEventOptions,
  schema: {
    type: 'radar-chart',
    name: '雷达图',
    layout: { x: 0, y: 0, width: 420, height: 320 },
    props: {
      option: {
        title: { text: '预算与开销', left: 'center', top: 8, textStyle: { color: '#ffffff', fontSize: 16 } },
        tooltip: {},
        legend: { bottom: 8, textStyle: { color: '#cbd5e1' }, itemWidth: 12, itemHeight: 8 },
        radar: {
          radius: '62%',
          center: ['50%', '52%'],
          axisName: { color: '#cbd5e1' },
          splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.3)' } },
          splitArea: { areaStyle: { color: ['rgba(148, 163, 184, 0.06)', 'rgba(148, 163, 184, 0.12)'] } },
          indicator: [
            { name: '销售', max: 100 },
            { name: '管理', max: 100 },
            { name: '技术', max: 100 },
            { name: '客服', max: 100 },
            { name: '研发', max: 100 },
            { name: '市场', max: 100 },
          ],
        },
        series: [
          {
            type: 'radar',
            data: [
              { value: [65, 48, 90, 74, 88, 60], name: '预算分配', lineStyle: { color: '#22d3ee', width: 2 }, itemStyle: { color: '#22d3ee' }, areaStyle: { color: 'rgba(34, 211, 238, 0.25)' } },
              { value: [50, 66, 70, 88, 62, 78], name: '实际开销', lineStyle: { color: '#a78bfa', width: 2 }, itemStyle: { color: '#a78bfa' }, areaStyle: { color: 'rgba(167, 139, 250, 0.2)' } },
            ],
          },
        ],
      },
    },
  },
}
