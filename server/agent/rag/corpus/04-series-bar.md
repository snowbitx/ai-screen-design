# series-bar 柱状图

## 最小配置

```js
{
  type: 'bar',
  data: [120, 200, 150],
  barWidth: 18,
  itemStyle: { borderRadius: [4, 4, 0, 0] }
}
```

用 `dataset` + `encode` 时：

```js
{
  type: 'bar',
  encode: { x: 'label', y: 'value' },
  itemStyle: { color: '#22d3ee' }
}
```

## 常用字段

- `barWidth` / `barMaxWidth`：柱宽像素上限，大屏里常设 16~24。
- `barGap`：不同系列之间的间距，百分比或像素。
- `itemStyle.color`：柱子颜色，可以给渐变对象 `{ type: 'linear', x:0,y:0,x2:0,y2:1, colorStops:[...] }`。
- `itemStyle.borderRadius`：圆角，数组形式 `[左上, 右上, 右下, 左下]`。
- `label`：柱顶数值，`{ show: true, position: 'top', color }`。
- `stack`：同名系列堆叠。
- `showBackground`：显示柱底衬底，配合 `backgroundStyle.color` 做"进度条柱"。

## 横向条形图

把 `xAxis/yAxis` 的 type 互换：

```js
xAxis: { type: 'value' },
yAxis: { type: 'category', data: ['A', 'B', 'C'] },
series: [{ type: 'bar', encode: { x: 'value', y: 'label' } }]
```

## 常见错误

- 柱子贴边：`grid` 的 left/right 太小，或没开 `containLabel`。
- `barWidth` 设成大数（如 100）导致柱子重叠。
- 多系列没设 `barGap`，柱子挤在一起。
