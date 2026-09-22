// src/materials/charts/schema.ts
import { JsonObjectSchema, NodeBaseSchema } from '@/editor/schema/common.ts'
import { z } from 'zod'

const PositionSchema = z
  .union([z.number(), z.enum(['left', 'center', 'right'])])
  .describe('图表元素的位置，可以是像素值或左中右枚举')

const ChartTitleSchema = z
  .object({
    text: z.string().describe('图表标题展示的文字'),
    top: z.union([z.number(), z.string()]).optional().describe('标题距容器顶部的位置'),
    left: PositionSchema.optional().describe('标题的水平位置'),
    textStyle: JsonObjectSchema.optional().describe('ECharts 标题文字样式'),
  })
  .describe('ECharts 标题配置')

// partial代表所有字段都是可选的 不用每个字端都加optional
const ChartLegendSchema = z
  .object({
    top: z.union([z.number(), z.string()]).describe('图例距容器顶部的位置'),
    left: PositionSchema.describe('图例的水平位置'),
    itemWidth: z.number().describe('图例标记宽度'),
    itemHeight: z.number().describe('图例标记高度'),
    show: z.boolean().describe('是否显示图例'),
    textStyle: JsonObjectSchema.describe('ECharts 图例文字样式'),
  })
  .partial()
  .describe('ECharts 图例配置')

const ChartDatasetSchema = z
  .object({
    source: z.array(JsonObjectSchema).describe('ECharts dataset 的行数据；每个对象代表一条记录'),
  })
  .describe('ECharts 内置数据集')

const ChartGridSchema = z
  .object({
    top: z.number().describe('绘图区上边距'),
    right: z.number().describe('绘图区右边距'),
    bottom: z.number().describe('绘图区下边距'),
    left: z.number().describe('绘图区左边距'),
    containLabel: z.boolean().describe('绘图区是否包含坐标轴标签'),
  })
  .partial()
  .describe('直角坐标系绘图区配置')

export const ChartOptionSchema = z
  .object({
    color: z.array(z.string()).optional().describe('图表系列颜色列表'),
    title: ChartTitleSchema,
    legend: ChartLegendSchema.optional(),
    tooltip: JsonObjectSchema.optional().describe('ECharts 提示框配置'),
    dataset: ChartDatasetSchema.optional(),
    grid: ChartGridSchema.optional(),
    xAxis: JsonObjectSchema.optional().describe('ECharts X 轴配置'),
    yAxis: JsonObjectSchema.optional().describe('ECharts Y 轴配置'),
    series: z
      .array(JsonObjectSchema)
      .min(1)
      .describe('ECharts 系列列表，包含真实 type、encode 和样式'),
  })
  .describe('当前图表物料使用的 ECharts Option')

export const ChartConfigSchema = z
  .object({
    props: z
      .object({
        option: ChartOptionSchema,
      })
      .describe('图表物料的业务属性'),
  })
  .describe('图表物料独有的 props 配置')

export function createChartNodeSchema(
  type: 'bar-chart' | 'line-chart' | 'area-chart' | 'pie-chart',
) {
  return NodeBaseSchema.extend({
    type: z.literal(type).describe('图表物料的注册类型'),
    props: z
      .object({
        option: ChartOptionSchema,
      })
      .describe('图表物料组件的 props 属性'),
  })
}
