# series-pie 饼图与环形图

## 基本配置

```js
{
  type: 'pie',
  radius: ['45%', '70%'],
  center: ['50%', '55%'],
  encode: { itemName: 'label', value: 'value' },
  label: { show: true, color: 'rgba(255,255,255,0.75)', formatter: '{b} {d}%' },
  labelLine: { length: 8, length2: 8 }
}
```

- `radius` 单值如 `'70%'` 是实心饼；数组 `[内径, 外径]` 是环形图。
- `center` 圆心位置，相对容器百分比。
- `roseType: 'radius'` 南丁格尔玫瑰图。
- `itemStyle.borderRadius` 圆角扇区（ECharts 5+）。
- `label.formatter`：`{b}` 名称、`{c}` 数值、`{d}` 百分比。
- `emphasis.scale`：悬浮放大，大屏里通常关闭 `emphasis: { scale: false }`。

## 数据格式

饼图不使用 `dataset.encode.x/y`，用 `itemName/value`。数据必须是对象数组：

```js
data: [
  { name: '直接访问', value: 335 },
  { name: '邮件营销', value: 310 }
]
```

用 `dataset` 时字段名要和 `encode.itemName/value` 对齐（source 里的 key 可以是 `label`，encode 指过去即可）。

## 常见错误

- 用 `encode.x/y` 配饼图，图是空的。
- `data` 给成 `[1,2,3]` 纯数字，没有名称。
- 环形图内径写死像素，容器缩放后比例失真，应该用百分比。
