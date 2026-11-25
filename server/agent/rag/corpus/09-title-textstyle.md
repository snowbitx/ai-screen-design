# title 与文字样式

## title

```js
title: {
  text: '月度销售额',
  subtext: '单位：万元',
  left: 16,
  top: 8,
  textStyle: { color: '#e2e8f0', fontSize: 16, fontWeight: 500 },
  subtextStyle: { color: 'rgba(255,255,255,0.45)', fontSize: 12 }
}
```

- `left/top` 支持数字、百分比、`'left' | 'center' | 'right'`。
- `textAlign` 控制文字对齐，`textVerticalAlign` 控制垂直对齐。
- 大屏组件本身已有外层标题时，图表里不要再加 title，避免重复。

## 通用 textStyle

坐标轴标签、图例、系列 label 都接受 `textStyle` 或直接 `color/fontSize`：

```js
axisLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 12 }
label: { color: '#22d3ee', fontSize: 12, fontWeight: 600 }
```

## 字号建议（1920x1080 大屏）

- 图表标题 16~18
- 轴标签 / 图例 12~13
- 数据标签 12~14
- 指标卡数字 28~40

## 常见错误

- 深色背景没改 `textStyle.color`，标题和轴标签仍是默认黑灰。
- 字号写成字符串 `'12px'`，ECharts 只接受数字。
