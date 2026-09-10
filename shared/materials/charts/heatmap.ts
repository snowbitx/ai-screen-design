import type { MaterialDefinition } from '@shared/schema/material.ts'
import { chartEventOptions, cartesianSetters } from './common.ts'

// 热力图物料
export const heatmapMaterial: MaterialDefinition = {
  name: '热力图',
  group: 'charts',
  icon: 'flat-color-icons:data-recovery',
  setters: [
    ...cartesianSetters({
      xFieldLabel: 'X字段',
      xFieldKey: 'props.option.series.0.encode.x',
      yFieldLabel: 'Y字段',
      yFieldKey: 'props.option.series.0.encode.y',
    }),
    { type: 'input', label: '值字段', key: 'props.option.series.0.encode.value' },
    { type: 'color', label: '最低色', key: 'props.option.visualMap.inRange.color.0' },
    { type: 'color', label: '最高色', key: 'props.option.visualMap.inRange.color.1' },
  ],
  eventOptions: chartEventOptions,
  schema: {
    type: 'heatmap-chart',
    name: '热力图',
    layout: { x: 0, y: 0, width: 460, height: 320 },
    props: {
      option: {
        title: { text: '一周访问热力', left: 'center', top: 8, textStyle: { color: '#ffffff', fontSize: 16 } },
        tooltip: { position: 'top' },
        grid: { top: 60, right: 16, bottom: 60, left: 60, containLabel: true },
        xAxis: { type: 'category', data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'], axisLine: { lineStyle: { color: '#64748b' } }, axisLabel: { color: '#cbd5e1' } },
        yAxis: { type: 'category', data: ['上午', '中午', '下午', '晚间'], axisLine: { lineStyle: { color: '#64748b' } }, axisLabel: { color: '#cbd5e1' } },
        visualMap: {
          min: 0,
          max: 100,
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: 8,
          textStyle: { color: '#cbd5e1' },
          inRange: { color: ['#0ea5e9', '#facc15'] },
        },
        series: [
          {
            type: 'heatmap',
            encode: { x: 'day', y: 'period', value: 'count' },
            label: { show: true, color: '#0d121b' },
            itemStyle: { borderColor: 'rgba(13, 18, 27, 0.4)', borderWidth: 1 },
            data: [
              { day: '周一', period: '上午', count: 42 }, { day: '周一', period: '下午', count: 68 },
              { day: '周二', period: '上午', count: 55 }, { day: '周二', period: '晚间', count: 74 },
              { day: '周三', period: '中午', count: 60 }, { day: '周三', period: '下午', count: 88 },
              { day: '周四', period: '上午', count: 38 }, { day: '周四', period: '晚间', count: 92 },
              { day: '周五', period: '下午', count: 96 }, { day: '周五', period: '晚间', count: 70 },
              { day: '周六', period: '中午', count: 82 }, { day: '周六', period: '下午', count: 64 },
              { day: '周日', period: '上午', count: 30 }, { day: '周日', period: '晚间', count: 48 },
            ],
          },
        ],
      },
    },
  },
}
