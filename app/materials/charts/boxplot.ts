import type { MaterialDefinition } from '@shared/schema/material.ts'
import { chartEventOptions, cartesianSetters } from './common.ts'

// 箱线图物料
export const boxplotMaterial: MaterialDefinition = {
  name: '箱线图',
  group: 'charts',
  icon: 'flat-color-icons:business-contact',
  setters: [
    ...cartesianSetters({
      seriesColorLabel: '箱体色',
      seriesColorKey: 'props.option.series.0.itemStyle.color',
      xFieldLabel: '分组字段',
      xFieldKey: 'props.option.series.0.encode.x',
      yFieldLabel: '数据字段',
      yFieldKey: 'props.option.series.0.encode.y',
    }),
  ],
  eventOptions: chartEventOptions,
  schema: {
    type: 'boxplot-chart',
    name: '箱线图',
    layout: { x: 0, y: 0, width: 440, height: 320 },
    props: {
      option: {
        title: { text: '各季度耗时分布', left: 'center', top: 8, textStyle: { color: '#ffffff', fontSize: 16 } },
        tooltip: { trigger: 'item' },
        grid: { top: 60, right: 24, bottom: 32, left: 48, containLabel: true },
        xAxis: { type: 'category', axisLine: { lineStyle: { color: '#64748b' } }, axisLabel: { color: '#cbd5e1' } },
        yAxis: { type: 'value', axisLabel: { color: '#cbd5e1' }, splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.18)' } } },
        dataset: {
          source: [
            { quarter: 'Q1', data: [620, 632, 655, 670, 700] },
            { quarter: 'Q2', data: [580, 601, 640, 668, 690] },
            { quarter: 'Q3', data: [640, 655, 680, 710, 745] },
            { quarter: 'Q4', data: [600, 618, 650, 682, 720] },
          ],
        },
        series: [
          {
            type: 'boxplot',
            encode: { x: 'quarter', y: 'data' },
            itemStyle: { color: 'rgba(34, 211, 238, 0.35)', borderColor: '#22d3ee' },
          },
        ],
      },
    },
  },
}
