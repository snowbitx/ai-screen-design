# 仪表盘、雷达图与其他系列

## gauge 仪表盘

```js
{
  type: 'gauge',
  startAngle: 210,
  endAngle: -30,
  min: 0,
  max: 100,
  radius: '85%',
  progress: { show: true, width: 10, itemStyle: { color: '#22d3ee' } },
  axisLine: { lineStyle: { width: 10, color: [[1, 'rgba(255,255,255,0.08)']] } },
  pointer: { width: 4, itemStyle: { color: '#22d3ee' } },
  axisLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 10, distance: 12 },
  detail: { valueAnimation: true, color: '#e2e8f0', fontSize: 24, offsetCenter: [0, '60%'] },
  data: [{ value: 72, name: '完成率' }],
  title: { color: 'rgba(255,255,255,0.55)', fontSize: 12 }
}
```

仪表盘不用 `dataset`，数值写在 `series[0].data[0].value`。

## radar 雷达图

```js
radar: {
  indicator: [
    { name: '质量', max: 100 },
    { name: '速度', max: 100 },
    { name: '成本', max: 100 }
  ],
  axisName: { color: 'rgba(255,255,255,0.65)' },
  splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
},
series: [{ type: 'radar', data: [{ value: [80, 65, 90], name: '本期' }] }]
```

## funnel 漏斗图

```js
{
  type: 'funnel',
  left: '10%', width: '80%',
  sort: 'descending',
  gap: 2,
  encode: { itemName: 'label', value: 'value' },
  label: { position: 'inside', color: '#fff' }
}
```

## scatter 散点图

```js
{
  type: 'scatter',
  symbolSize: 8,
  encode: { x: 'x', y: 'y', itemName: 'label' },
  itemStyle: { color: '#a78bfa', opacity: 0.75 }
}
```

## 常见错误

- 仪表盘把数值写进 `series.data` 而不是 `series[0].data[0].value`，指针不动。
- 雷达图没定义 `radar.indicator`，直接报错。
- 漏斗图 `sort` 写成 `'asc'`，应该是 `'ascending' | 'descending' | 'none'`。
