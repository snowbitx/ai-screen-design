// src/editor/schema/common.ts
import { z } from 'zod'

// 描述键名为字符串、值为任意 JSON 值的普通对象。
export const JsonObjectSchema = z.record(z.string(), z.json())

// 描述所有物料节点共用的位置和尺寸信息。
export const LayoutSchema = z
  .object({
    x: z.number().describe('节点左上角相对画布的横坐标'),
    y: z.number().describe('节点左上角相对画布的纵坐标'),
    width: z.number().describe('节点在画布中的显示宽度'),
    height: z.number().describe('节点在画布中的显示高度'),
  })
  .describe('所有物料共用的画布布局')

// 描述物料节点可持久化的事件配置，不包含运行时 handler。
export const EventSchema = z
  .object({
    type: z.string().describe('Vue 组件触发的事件类型'),
    name: z.string().describe('事件名称'),
    title: z.string().describe('属性面板展示的事件标题'),
    code: z
      .string()
      .describe(
        '确认应用后由 Vue runtime 执行的事件函数体，将会传递给 new Function(code) 生成的函数',
      ),
  })
  .describe('事件配置，包含事件类型、名称、标题和函数体代码')

// 描述所有物料节点共用的基础字段。
export const NodeBaseSchema = z
  .object({
    type: z.string().describe('物料注册表中的真实物料类型'),
    name: z.string().describe('当前节点在编辑器中的名称'),
    id: z.string().describe('当前节点 ID，编辑器内唯一'),
    locked: z.boolean().optional().describe('是否锁定节点，锁定后无法移动或编辑'),
    layout: LayoutSchema,
    dataId: z.string().optional().describe('节点绑定的数据源 ID，用于数据驱动的物料'),
    events: z.array(EventSchema).optional().describe('节点已配置的事件列表'),
  })
  .describe('所有物料节点共用的基础字段')

// 描述大屏画布的尺寸和背景配置。
export const CanvasSchema = z
  .object({
    width: z.number().describe('大屏画布的宽度'),
    height: z.number().describe('大屏画布的高度'),
    backgroundColor: z.string().describe('画布背景颜色'),
  })
  .describe('当前大屏的画布配置')

// 描述数据源的结构。
export const DataSourceSchema = z
  .object({
    type: z
      .enum(['static', 'api'])
      .describe('数据源类型：静态数据或 API 数据，static = 静态数据，api = API 数据'),
    id: z.string().describe('当前页面内唯一的数据源 ID，可以绑定到物料节点的 dataId 中'),
    name: z.string().describe('数据源在编辑器中的名称'),
    data: z.json().describe('数据源当前承载的 JSON 数据'),
    url: z.string().optional().describe('API 数据源的请求地址'),
    method: z.enum(['get', 'post']).optional().describe('API 数据源的请求方法'),
    responsePath: z.string().max(500).optional().describe('从 API 响应中读取数据的字段路径'),
    interval: z.number().optional().describe('API 数据源的轮询间隔，单位为毫秒'),
    params: JsonObjectSchema.optional().describe('API 请求发送的预设参数'),
  })
  .describe('编辑器当前支持的数据源结构')
