import type { MaterialDefinition } from '@shared/schema/material.ts'

export const barMaterial: MaterialDefinition = {
  name: '柱状图',
  group: 'charts',
  icon: 'fluent-color:list-bar-16',
  setters: [
    {
      type: 'input',
      label: '标题',
      key: 'props.option.title.text',
    },
    {
      type: 'color',
      label: '标题色',
      key: 'props.option.title.textStyle.color',
    },
    {
      type: 'checkbox', // ElCheckbox
      label: '图例显示',
      key: 'props.option.legend.show',
    },
    {
      type: 'select', // ElSelect
      label: '对齐',
      key: 'props.option.title.left',
      props: {
        // 下拉配置项
        options: [
          { label: '左对齐', value: 'left' },
          { label: '居中', value: 'center' },
          { label: '右对齐', value: 'right' },
        ],
      },
    },
    {
      type: 'color',
      label: '柱颜色',
      key: 'props.option.series.0.itemStyle.color',
    },
    {
      type: 'input',
      label: 'X字段',
      key: 'props.option.series.0.encode.x',
    },
    {
      type: 'input',
      label: 'Y字段',
      key: 'props.option.series.0.encode.y',
    },
    {
      type: 'number',
      label: '上边距',
      key: 'props.option.grid.top',
      span: 12,
    },
    {
      type: 'number',
      label: '右边距',
      key: 'props.option.grid.right',
      span: 12,
    },
    {
      type: 'number',
      label: '下边距',
      key: 'props.option.grid.bottom',
      span: 12,
    },
    {
      type: 'number',
      label: '左边距',
      key: 'props.option.grid.left',
      span: 12,
    },
  ],
  schema: {
    type: 'bar-chart',
    name: '柱状图',
    layout: {
      x: 0,
      y: 0,
      width: 400,
      height: 260,
    },
    props: {
      // echarts 的配置项
      option: {
        legend: {
          top: 38,
          left: 'center',
          itemWidth: 12,
          itemHeight: 8,
          show: true,
          textStyle: {
            color: '#cbd5e1',
          },
        },
        title: {
          text: '销售额统计',
          top: 8,
          left: 'center',
          textStyle: {
            color: '#ffffff',
            fontSize: 16,
          },
        },
        tooltip: {},
        dataset: {
          source: [
            { month: '一月', sales: 120 },
            { month: '二月', sales: 200 },
            { month: '三月', sales: 150 },
            { month: '四月', sales: 80 },
            { month: '五月', sales: 170 },
            { month: '六月', sales: 240 },
          ],
        },
        grid: {
          top: 86,
          right: 24,
          bottom: 32,
          left: 48,
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          axisLine: {
            lineStyle: {
              color: '#64748b',
            },
          },
          axisLabel: {
            color: '#cbd5e1',
          },
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            color: '#cbd5e1',
          },
          splitLine: {
            lineStyle: {
              color: 'rgba(148, 163, 184, 0.18)',
            },
          },
        },
        series: [
          {
            name: '销售额',
            type: 'bar',
            barWidth: '45%',
            encode: {
              x: 'month',
              y: 'sales',
            },
            itemStyle: {
              color: '#22d3ee',
              borderRadius: [4, 4, 0, 0],
            },
          },
        ],
      },
    },
  },
}
