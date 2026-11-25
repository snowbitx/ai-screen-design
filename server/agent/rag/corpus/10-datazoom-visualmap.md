# 数据缩放与视觉映射

## dataZoom

用于大数据量或需要滚动的类目轴。

```js
dataZoom: [
  { type: 'inside', start: 0, end: 60 },
  { type: 'slider', height: 14, bottom: 8, start: 0, end: 60 }
]
```

- `type: 'inside'`：鼠标滚轮/拖拽缩放，无 UI。
- `type: 'slider'`：底部滑动条，`height` 控制厚度。
- `start/end` 是百分比（0~100）。

## visualMap

把数值映射到颜色或尺寸。

```js
visualMap: {
  min: 0,
  max: 1000,
  calculable: true,
  orient: 'horizontal',
  left: 'center',
  bottom: 0,
  inRange: { color: ['#22d3ee', '#a78bfa', '#f472b6'] },
  textStyle: { color: 'rgba(255,255,255,0.6)' }
}
```

- 连续型用 `min/max`；分段型用 `type: 'piecewise'` + `pieces`。
- 散点图可以用 `dimension` 指定映射到哪个字段。

## 常见错误

- `dataZoom` 用在饼图上（不支持）。
- `visualMap` 没设 `min/max`，颜色全是一个色。
- `slider` 高度给太小（如 6），滑块几乎点不到。
