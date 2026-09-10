import type { MaterialDefinition } from '@shared/schema/material.ts'
import { chartEventOptions } from './common.ts'

// 矩形树图物料
export const treemapMaterial: MaterialDefinition = {
  name: '矩形树图',
  group: 'charts',
  icon: 'flat-color-icons:grid',
  setters: [
    { type: 'input', label: '标题', key: 'props.option.title.text' },
    { type: 'color', label: '标题色', key: 'props.option.title.textStyle.color' },
    { type: 'number', label: '间隙', key: 'props.option.series.0.itemStyle.gapWidth' },
    { type: 'select', label: '层级', key: 'props.option.series.0.leafDepth', props: { options: [{ label: '全部展开', value: '-1' }, { label: '两层', value: '2' }, { label: '三层', value: '3' }] } },
  ],
  eventOptions: chartEventOptions,
  schema: {
    type: 'treemap-chart',
    name: '矩形树图',
    layout: { x: 0, y: 0, width: 460, height: 340 },
    props: {
      option: {
        title: { text: '仓库占比', left: 'center', top: 8, textStyle: { color: '#ffffff', fontSize: 16 } },
        tooltip: { formatter: '{b}: {c}' },
        series: [
          {
            type: 'treemap',
            left: '4%',
            right: '4%',
            top: 48,
            bottom: '4%',
            roam: false,
            nodeClick: 'zoomToNode',
            breadcrumb: { show: false },
            label: { color: '#ffffff', fontSize: 12, formatter: '{b}' },
            upperLabel: { show: true, height: 22, color: '#e2e8f0' },
            itemStyle: { borderColor: '#0d121b', gapWidth: 2 },
            levels: [
              { itemStyle: { borderColor: '#334155', borderWidth: 2, gapWidth: 2 } },
              { colorSaturation: [0.3, 0.6], itemStyle: { borderColorSaturation: 0.7, gapWidth: 2, borderWidth: 1 } },
            ],
            data: [
              {
                name: '前端',
                itemStyle: { color: '#0ea5e9' },
                children: [
                  { name: '组件库', value: 420 },
                  { name: '业务页面', value: 680 },
                  { name: '工具函数', value: 180 },
                ],
              },
              {
                name: '后端',
                itemStyle: { color: '#22c55e' },
                children: [
                  { name: '网关', value: 260 },
                  { name: '微服务', value: 740 },
                  { name: '定时任务', value: 120 },
                ],
              },
              {
                name: '数据',
                itemStyle: { color: '#a78bfa' },
                children: [
                  { name: 'ETL', value: 340 },
                  { name: '报表', value: 520 },
                ],
              },
            ],
          },
        ],
      },
    },
  },
}
