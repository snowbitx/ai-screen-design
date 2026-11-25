# series-line 折线图与面积图

## 折线图

```js
{
  type: 'line',
  smooth: true,
  showSymbol: false,
  lineStyle: { width: 2, color: '#22d3ee' },
  areaStyle: { opacity: 0.15 },
  encode: { x: 'label', y: 'value' }
}
```

## 常用字段

- `smooth: true | 0~1`：平滑曲线，数值越大越圆。
- `showSymbol`：是否显示拐点，数据点多时设 `false`。
- `symbol: 'circle' | 'emptyCircle' | 'none'`，`symbolSize` 控制点大小。
- `lineStyle.width`：线宽，大屏里 2~3 比较清楚。
- `areaStyle`：面积填充，`{ opacity: 0.15 }` 或渐变对象；不写就是纯折线。
- `step: 'start' | 'middle' | 'end'`：阶梯线。
- `stack`：堆叠面积图。

## 渐变面积

```js
areaStyle: {
  color: {
    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [
      { offset: 0, color: 'rgba(34,211,238,0.45)' },
      { offset: 1, color: 'rgba(34,211,238,0)' }
    ]
  }
}
```

## 双 Y 轴

```js
yAxis: [
  { type: 'value', name: '销量' },
  { type: 'value', name: '增速', axisLabel: { formatter: '{value}%' } }
],
series: [
  { type: 'line', yAxisIndex: 0, encode: { x: 'label', y: 'value' } },
  { type: 'line', yAxisIndex: 1, encode: { x: 'label', y: 'rate' } }
]
```

## 常见错误

- 单点数据画不出线：`series.data` 只有一个元素，需要至少两个点。
- 折线图没关 `boundaryGap`（类目轴），线两端留白。
- 面积图开了 `stack` 但数据量级差太多，小值系列被压平。
