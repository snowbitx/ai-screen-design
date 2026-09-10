import type { MaterialDefinition } from '@shared/schema/material.ts'
import { chartEventOptions } from './common.ts'

// 漏斗图物料
export const funnelMaterial: MaterialDefinition = {
  name: '漏斗图',
  group: 'charts',
  icon: 'flat-color-icons:filter',
  setters: [
    { type: 'input', label: '标题', key: 'props.option.title.text' },
    { type: 'color', label: '标题色', key: 'props.option.title.textStyle.color' },
    { type: 'select', label: '排序', key: 'props.option.series.0.sort', props: { options: [{ label: '降序', value: 'descending' }, { label: '升序', value: 'ascending' }] } },
    { type: 'input', label: '名称字段', key: 'props.option.series.0.encode.itemName' },
    { type: 'input', label: '数值字段', key: 'props.option.series.0.encode.value' },
  ],
  eventOptions: chartEventOptions,
  schema: {
    type: 'funnel-chart',
    name: '漏斗图',
    layout: { x: 0, y: 0, width: 400, height: 320 },
    props: {
      option: {
        title: { text: '转化漏斗', left: 'center', top: 8, textStyle: { color: '#ffffff', fontSize: 16 } },
        tooltip: { trigger: 'item' },
        series: [
          {
            type: 'funnel',
            left: '12%',
            top: 60,
            bottom: 16,
            width: '76%',
            sort: 'descending',
            gap: 4,
            label: { show: true, position: 'inside', color: '#ffffff', formatter: '{b}: {c}' },
            itemStyle: { borderColor: 'rgba(13, 18, 27, 0.6)', borderWidth: 1 },
            encode: { itemName: 'stage', value: 'count' },
            data: [
              { name: '访问', value: 60000, itemStyle: { color: '#0ea5e9' } },
              { name: '咨询', value: 38000, itemStyle: { color: '#22d3ee' } },
              { name: '订单', value: 20000, itemStyle: { color: '#34d399' } },
              { name: '付款', value: 12000, itemStyle: { color: '#a3e635' } },
              { name: '复购', value: 6000, itemStyle: { color: '#facc15' } },
            ],
          },
        ],
      },
    },
  },
}
