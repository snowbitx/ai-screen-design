# legend 与 tooltip

## legend 图例

```js
legend: {
  show: true,
  top: 0,
  right: 8,
  itemWidth: 10,
  itemHeight: 10,
  textStyle: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  icon: 'roundRect'
}
```

- `top/left/right/bottom` 控位置，数字是像素，字符串可以是 `'center'`。
- 多系列时 `data` 可以显式指定要显示哪些名字。
- 图例太多时用 `type: 'scroll'`。

## tooltip 提示框

```js
tooltip: {
  trigger: 'axis',
  axisPointer: { type: 'shadow' },
  backgroundColor: 'rgba(15,23,42,0.92)',
  borderColor: 'rgba(255,255,255,0.12)',
  textStyle: { color: '#e2e8f0', fontSize: 12 },
  valueFormatter: (value) => `${value} 万`
}
```

- `trigger: 'axis'` 用于直角坐标系（整列触发）；`'item'` 用于饼图、散点图（单点触发）。
- `axisPointer.type`：`'line' | 'shadow' | 'cross'`。柱状图用 `shadow`，折线用 `line`。
- `confine: true`：提示框限制在容器内，避免大屏边缘溢出。

## 常见错误

- 饼图用了 `trigger: 'axis'`，悬浮没有反应。
- tooltip 白色底 + 白字，在深色大屏上看不见。
- `formatter` 写成字符串模板但里面用了函数语法。
