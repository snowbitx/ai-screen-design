import type { MaterialDefinition } from '@shared/schema/material.ts'
import { chartEventOptions } from './common.ts'

// 旭日图物料
export const sunburstMaterial: MaterialDefinition = {
  name: '旭日图',
  group: 'charts',
  icon: 'flat-color-icons:doughnut-chart',
  setters: [
    { type: 'input', label: '标题', key: 'props.option.title.text' },
    { type: 'color', label: '标题色', key: 'props.option.title.textStyle.color' },
    { type: 'number', label: '内半径', key: 'props.option.series.0.radius.0' },
    { type: 'number', label: '外半径', key: 'props.option.series.0.radius.1' },
    { type: 'select', label: '旋转排布', key: 'props.option.series.0.rotate', props: { options: [{ label: '径向', value: 'radial' }, { label: '切向', value: 'tangential' }] } },
  ],
  eventOptions: chartEventOptions,
  schema: {
    type: 'sunburst-chart',
    name: '旭日图',
    layout: { x: 0, y: 0, width: 420, height: 360 },
    props: {
      option: {
        title: { text: '支出构成', left: 'center', top: 8, textStyle: { color: '#ffffff', fontSize: 16 } },
        tooltip: {},
        series: [
          {
            type: 'sunburst',
            radius: ['12%', '88%'],
            center: ['50%', '54%'],
            rotate: 'radial',
            label: { color: '#0d121b', fontSize: 11 },
            itemStyle: { borderColor: '#0d121b', borderWidth: 1.5 },
            data: [
              {
                name: '居住',
                itemStyle: { color: '#0ea5e9' },
                children: [
                  { name: '房租', value: 3200 },
                  { name: '水电', value: 480 },
                  { name: '物业', value: 260 },
                ],
              },
              {
                name: '餐饮',
                itemStyle: { color: '#22d3ee' },
                children: [
                  { name: '外卖', value: 1450 },
                  { name: '下馆子', value: 860 },
                  { name: '食材', value: 620 },
                ],
              },
              {
                name: '出行',
                itemStyle: { color: '#34d399' },
                children: [
                  { name: '通勤', value: 320 },
                  { name: '打车', value: 540 },
                ],
              },
              {
                name: '娱乐',
                itemStyle: { color: '#a78bfa' },
                children: [
                  { name: '订阅', value: 180 },
                  { name: '游戏', value: 300 },
                  { name: '电影', value: 160 },
                ],
              },
            ],
          },
        ],
      },
    },
  },
}
