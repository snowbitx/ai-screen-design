# dataset 与 encode

## dataset

```js
dataset: {
  source: [
    { label: '一月', value: 120, rate: 0.12 },
    { label: '二月', value: 200, rate: 0.18 }
  ]
}
```

`source` 可以是对象数组（按字段名映射），也可以是二维数组（配合 `sourceHeader: true` 用第一行做字段名）。

## encode

`encode` 把数据字段映射到视觉通道：

```js
series: [{
  type: 'bar',
  encode: {
    x: 'label',      // x 轴用哪个字段
    y: 'value',      // y 轴用哪个字段
    tooltip: ['label', 'value'],
    itemName: 'label' // 饼图/漏斗图用
  }
}]
```

- 直角坐标系：`x` / `y`。
- 饼图、漏斗图：`itemName` / `value`。
- 地图：`name`。
- 散点图：`x` / `y` / `symbolSize` / `itemName`。

## 字段名一致性

`dataSources[].data` 的每一项 key 必须和 `encode` 里写的字段一致。
后端接口返回 `[{ label, value }]` 时，`encode.x` 就写 `'label'`。

## 常见错误

- `dataset.source` 是空数组，但 `series.data` 也没有，图空白。
- `encode.y` 写了不存在的字段，坐标轴 range 退化成 0~1。
- 多个系列共用一个 dataset，但每个系列都要写自己的 `encode`。
