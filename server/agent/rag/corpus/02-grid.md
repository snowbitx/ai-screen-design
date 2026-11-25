# grid 绘图区

## grid

直角坐标系（柱状图、折线图、散点图、K 线图）的绘图区。默认 `left: '10%'`、`right: '10%'`、`top: 60`、`bottom: 60`。

```js
grid: {
  left: 24,
  right: 24,
  top: 48,
  bottom: 32,
  containLabel: true
}
```

- `containLabel: true`：把坐标轴标签算进绘图区，标签很长时不会溢出容器，大屏里建议始终开启。
- 多个 grid 时写数组 `grid: [{...}, {...}]`，同时 `xAxis/yAxis` 也要写成数组，并给每个轴设置 `gridIndex`。

## 多图共用画布

```js
grid: [
  { left: '5%', right: '55%', bottom: 40, containLabel: true },
  { left: '55%', right: '5%', bottom: 40, containLabel: true }
],
xAxis: [
  { type: 'category', gridIndex: 0, data: [...] },
  { type: 'category', gridIndex: 1, data: [...] }
],
yAxis: [
  { type: 'value', gridIndex: 0 },
  { type: 'value', gridIndex: 1 }
],
series: [
  { type: 'bar', xAxisIndex: 0, yAxisIndex: 0, data: [...] },
  { type: 'line', xAxisIndex: 1, yAxisIndex: 1, data: [...] }
]
```

## 常见错误

- 忘了 `containLabel`，Y 轴长数字被裁掉。
- 多 grid 时只写了 `gridIndex` 没写 `xAxisIndex/yAxisIndex`，系列画到了第一个坐标系上。
