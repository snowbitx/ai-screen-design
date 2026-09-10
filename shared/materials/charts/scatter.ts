import type { MaterialDefinition } from '@shared/schema/material.ts'
import { chartEventOptions, cartesianSetters } from './common.ts'

// 散点图物料
export const scatterMaterial: MaterialDefinition = {
  name: '散点图',
  group: 'charts',
  icon: 'flat-color-icons:statistical-data',
  setters: [
    ...cartesianSetters({
      seriesColorLabel: '点颜色',
      seriesColorKey: 'props.option.series.0.itemStyle.color',
      xFieldLabel: 'X字段',
      xFieldKey: 'props.option.series.0.encode.x',
      yFieldLabel: 'Y字段',
      yFieldKey: 'props.option.series.0.encode.y',
    }),
    { type: 'number', label: '点大小', key: 'props.option.series.0.symbolSize' },
  ],
  eventOptions: chartEventOptions,
  schema: {
    type: 'scatter-chart',
    name: '散点图',
    layout: { x: 0, y: 0, width: 400, height: 300 },
    props: {
      option: {
        title: { text: '高度体重分布', left: 'center', top: 8, textStyle: { color: '#ffffff', fontSize: 16 } },
        tooltip: { trigger: 'item' },
        grid: { top: 60, right: 24, bottom: 32, left: 48, containLabel: true },
        xAxis: { type: 'value', axisLine: { lineStyle: { color: '#64748b' } }, axisLabel: { color: '#cbd5e1' }, splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.18)' } } },
        yAxis: { type: 'value', axisLabel: { color: '#cbd5e1' }, splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.18)' } } },
        dataset: {
          source: [
            { height: 161, weight: 51 }, { height: 167, weight: 59 }, { height: 174, weight: 68 },
            { height: 158, weight: 46 }, { height: 182, weight: 77 }, { height: 170, weight: 62 },
            { height: 176, weight: 71 }, { height: 165, weight: 55 }, { height: 155, weight: 42 },
            { height: 185, weight: 82 },
          ],
        },
        series: [{ type: 'scatter', symbolSize: 14, itemStyle: { color: '#22d3ee' }, encode: { x: 'height', y: 'weight' } }],
      },
    },
  },
}
