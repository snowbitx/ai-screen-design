import type { MaterialDefinition } from '@shared/schema/material.ts'
import { chartEventOptions, cartesianSetters } from './common.ts'

// K线图物料
export const candlestickMaterial: MaterialDefinition = {
  name: 'K线图',
  group: 'charts',
  icon: 'flat-color-icons:combo-chart',
  setters: [
    ...cartesianSetters({
      seriesColorLabel: '阳线色',
      seriesColorKey: 'props.option.series.0.itemStyle.color',
      xFieldLabel: '日期字段',
      xFieldKey: 'props.option.series.0.encode.x',
    }),
    { type: 'color', label: '阴线色', key: 'props.option.series.0.itemStyle.color0' },
  ],
  eventOptions: chartEventOptions,
  schema: {
    type: 'candlestick-chart',
    name: 'K线图',
    layout: { x: 0, y: 0, width: 480, height: 320 },
    props: {
      option: {
        title: { text: '月度K线', left: 'center', top: 8, textStyle: { color: '#ffffff', fontSize: 16 } },
        tooltip: { trigger: 'axis' },
        grid: { top: 60, right: 24, bottom: 32, left: 56, containLabel: true },
        xAxis: { type: 'category', axisLine: { lineStyle: { color: '#64748b' } }, axisLabel: { color: '#cbd5e1' } },
        yAxis: { scale: true, axisLabel: { color: '#cbd5e1' }, splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.18)' } } },
        dataset: {
          source: [
            { date: '1月', data: [20, 34, 10, 38] },
            { date: '2月', data: [34, 45, 30, 42] },
            { date: '3月', data: [45, 40, 32, 36] },
            { date: '4月', data: [36, 52, 33, 50] },
            { date: '5月', data: [50, 48, 41, 44] },
            { date: '6月', data: [44, 58, 42, 56] },
          ],
        },
        series: [
          {
            type: 'candlestick',
            encode: { x: 'date', y: 'data' },
            itemStyle: { color: '#22c55e', color0: '#ef4444', borderColor: '#22c55e', borderColor0: '#ef4444' },
          },
        ],
      },
    },
  },
}
