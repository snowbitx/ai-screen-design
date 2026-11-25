# xAxis 与 yAxis 坐标轴

## 通用字段

- `type`：`'category' | 'value' | 'time' | 'log'`。类目轴用 `category`，数值轴用 `value`。
- `name`：轴名称，单位常写在这里，如 `'销售额（万元）'`。
- `boundaryGap`：类目轴默认 `true`（点在格子中间），折线图想从边缘开始设 `false`。
- `axisLine`：轴线，`{ show, lineStyle: { color } }`。
- `axisTick`：刻度线，`{ show }`。
- `axisLabel`：轴标签，`{ color, fontSize, rotate, formatter, interval }`。
- `splitLine`：网格线，`{ show, lineStyle: { color, type: 'dashed' } }`。
- `min` / `max`：固定取值范围；`scale: true` 让数值轴不强制从 0 开始。

## 类目轴数据

```js
xAxis: { type: 'category', data: ['一月', '二月', '三月'] }
```

用 `dataset` 时可以不写 `data`，由 `series.encode.x` 指定类目字段。

## 深色大屏样式

```js
xAxis: {
  type: 'category',
  data: labels,
  axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
  axisTick: { show: false },
  axisLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 12 }
},
yAxis: {
  type: 'value',
  splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
  axisLabel: { color: 'rgba(255,255,255,0.65)' }
}
```

## 常见错误

- 类目轴忘了给 `data`，也没用 `encode`，图上什么都没有。
- 折线图没设 `boundaryGap: false`，线两端离边框很远。
- 轴 `type` 写成 `'category'` 却塞了数字，标签重复错乱。
