# ECharts option 顶层结构

## 基本骨架

一个 ECharts 配置是一个普通对象，常用顶层字段：

- `backgroundColor`：画布背景色，如 `'transparent'`、`'#0d121b'`。
- `color`：系列调色盘，数组，按系列顺序取色，如 `['#22d3ee', '#a78bfa']`。
- `title`：标题，`{ text, left, top, textStyle }`。
- `grid`：直角坐标系的绘图区，控制图表四周留白。
- `xAxis` / `yAxis`：直角坐标轴，可以是对象或数组。
- `series`：系列数组，必须显式给出，每项都要有 `type`。
- `dataset`：数据集，`{ source: [...] }`，配合 `series.encode` 做字段映射。
- `legend`、`tooltip`、`dataZoom`、`visualMap`、`toolbox`：交互与辅助组件。
- `animation`：布尔或对象，大屏轮播场景常关掉 `animation: false` 减少重绘。

## 大屏场景的常用约定

- 尺寸由容器决定，配置里不要写死 `width/height`。
- 深色背景时，坐标轴文字、分割线要显式设浅色，否则默认黑字看不清。
- 多图并排时统一 `grid.left/right/bottom/top`，避免图表视觉重心不一致。
- `series` 里每个系列都要 `type`，缺省会报错「series.type should be specified」。

## 常见错误

- 把 `series` 写成对象而不是数组。
- `dataset.source` 给了对象数组，但 `encode` 的字段名和数据 key 不一致，图表空白。
- `option` 里残留 `undefined`，序列化后传到浏览器变成 `null`，会让对应组件失效。
