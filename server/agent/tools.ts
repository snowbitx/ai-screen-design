import { Type } from '@mariozechner/pi-ai'
import type { AgentTool } from '@mariozechner/pi-agent-core'
import type { PageSchema } from '@shared/schema/page.ts'
import { instantiateMaterial, getDefinition } from './materials.ts'

export interface Workspace {
  page: PageSchema
  /** 本次会话执行过的工具调用摘要，返回给前端展示 */
  actions: string[]
}

function uuid() {
  return globalThis.crypto.randomUUID()
}

function summarize(toolName: string, detail: string) {
  return `${toolName}: ${detail}`
}

function findNode(page: PageSchema, id: string) {
  return page.nodes.find((node) => node.id === id)
}

/**
 * 大屏编辑工具集：所有修改都作用在传入的 Workspace.page 上。
 * 布局参数用网格布局辅助计算（3 列 5 行），同时保留精确坐标参数。
 */
export function createScreenTools(workspace: Workspace): AgentTool<any>[] {
  const { page } = workspace

  const gridCell = (col: number, row: number, spanX = 1, spanY = 1) => {
    const cellW = page.canvas.width / 3
    const cellH = page.canvas.height / 5
    return {
      x: Math.round((col - 1) * cellW),
      y: Math.round((row - 1) * cellH),
      width: Math.round(cellW * spanX),
      height: Math.round(cellH * spanY),
    }
  }

  const setLayoutTool: AgentTool<any> = {
    name: 'set_node_layout',
    label: '设置组件位置尺寸',
    description:
      '设置某个组件的位置和尺寸。优先用 grid：col/row 取 1-3 / 1-5，表示 3 列 5 行网格中的格子（左上角为 1,1），spanX/spanY 表示跨几格，省略时由组件默认尺寸决定。precision 模式直接给 x/y/width/height 像素值。',
    parameters: Type.Object({
      id: Type.String({ description: '组件 id' }),
      mode: Type.Optional(
        Type.Union([Type.Literal('grid'), Type.Literal('precision')], {
          description: 'grid=网格布局，precision=像素精确定位',
        }),
      ),
      col: Type.Optional(Type.Number({ description: '网格列 1-3' })),
      row: Type.Optional(Type.Number({ description: '网格行 1-5' })),
      spanX: Type.Optional(Type.Number({ description: '横向跨几格，默认 1' })),
      spanY: Type.Optional(Type.Number({ description: '纵向跨几格，默认 1' })),
      x: Type.Optional(Type.Number()),
      y: Type.Optional(Type.Number()),
      width: Type.Optional(Type.Number()),
      height: Type.Optional(Type.Number()),
    }),
    execute: async (_id: string, params: any) => {
      const node = findNode(page, params.id)
      if (!node) throw new Error(`组件 ${params.id} 不存在`)
      const layout =
        params.mode === 'precision'
          ? {
              x: params.x ?? node.layout.x,
              y: params.y ?? node.layout.y,
              width: params.width ?? node.layout.width,
              height: params.height ?? node.layout.height,
            }
          : {
              ...gridCell(params.col ?? 1, params.row ?? 1, params.spanX, params.spanY),
              // 未指定跨距时保留组件默认宽高
              ...(params.spanX === undefined && params.mode !== 'precision' ? { width: node.layout.width } : {}),
              ...(params.spanY === undefined && params.mode !== 'precision' ? { height: node.layout.height } : {}),
            }
      Object.assign(node.layout, layout)
      workspace.actions.push(summarize('set_node_layout', `${node.name}(${node.id}) → ${JSON.stringify(node.layout)}`))
      return { content: [{ type: 'text', text: `已更新 ${node.name} 的布局：${JSON.stringify(node.layout)}` }], details: node.layout }
    },
  }

  const addNodeTool: AgentTool<any> = {
    name: 'add_node',
    label: '添加组件',
    description:
      '向画布添加一个新组件。type 必须从物料目录中选择。支持 grid 或 precision 两种布局参数（同 set_node_layout）。添加成功后返回新组件 id，后续修改需要用它。',
    parameters: Type.Object({
      type: Type.String({ description: '物料类型，如 bar-chart、line-chart、text、pie-chart' }),
      name: Type.Optional(Type.String({ description: '组件显示名，默认用物料名' })),
      mode: Type.Optional(Type.Union([Type.Literal('grid'), Type.Literal('precision')])),
      col: Type.Optional(Type.Number()),
      row: Type.Optional(Type.Number()),
      spanX: Type.Optional(Type.Number()),
      spanY: Type.Optional(Type.Number()),
      x: Type.Optional(Type.Number()),
      y: Type.Optional(Type.Number()),
      width: Type.Optional(Type.Number()),
      height: Type.Optional(Type.Number()),
    }),
    execute: async (_id: string, params: any) => {
      const definition = getDefinition(params.type)
      if (!definition) {
        throw new Error(`未知物料类型 ${params.type}，可用类型见系统提示中的物料目录`)
      }
      const id = uuid()
      const layout =
        params.mode === 'precision'
          ? { x: params.x ?? 0, y: params.y ?? 0, width: params.width, height: params.height }
          : gridCell(params.col ?? 1, params.row ?? 1, params.spanX, params.spanY)
      const node: any = instantiateMaterial(params.type, id, {
        x: layout.x,
        y: layout.y,
        ...(layout.width ? { width: layout.width } : {}),
        ...(layout.height ? { height: layout.height } : {}),
      })
      if (params.name) node.name = params.name
      page.nodes.push(node)
      workspace.actions.push(summarize('add_node', `${node.name}(${id}) type=${params.type} layout=${JSON.stringify(node.layout)}`))
      return {
        content: [{ type: 'text', text: `已添加 ${node.name}，id=${id}，布局 ${JSON.stringify(node.layout)}` }],
        details: { id, layout: node.layout },
      }
    },
  }

  const updateNodePropsTool: AgentTool<any> = {
    name: 'update_node_props',
    label: '修改组件属性',
    description:
      '把一组属性合并进组件的 props（浅合并到顶层 key，如 option、content）。图表组件用 option 传 echarts 配置的增量片段；文本组件用 content 传文字。undefined 的值不会被覆盖。',
    parameters: Type.Object({
      id: Type.String({ description: '组件 id' }),
      props: Type.Record(Type.String(), Type.Unknown({ description: '要合并的属性片段' })),
    }),
    execute: async (_id: string, params: any) => {
      const node: any = findNode(page, params.id)
      if (!node) throw new Error(`组件 ${params.id} 不存在`)
      const patch = JSON.parse(JSON.stringify(params.props))
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) continue
        if (value !== null && typeof value === 'object' && !Array.isArray(value) && typeof node.props?.[key] === 'object' && node.props[key] !== null) {
          // 对象做浅合并，数组整体替换
          Object.assign(node.props[key], value)
        } else {
          node.props[key] = value
        }
      }
      workspace.actions.push(summarize('update_node_props', `${node.name}(${node.id}) props += ${JSON.stringify(patch)}`))
      return { content: [{ type: 'text', text: `已更新 ${node.name} 的属性` }], details: { props: node.props } }
    },
  }

  const setNodeStyleTool: AgentTool<any> = {
    name: 'set_node_style',
    label: '修改组件样式',
    description: '合并设置组件的内联样式（style），如 color、fontSize、fontWeight、background 等 CSS 属性。',
    parameters: Type.Object({
      id: Type.String({ description: '组件 id' }),
      style: Type.Record(Type.String(), Type.Unknown({ description: 'CSS 样式键值对' })),
    }),
    execute: async (_id: string, params: any) => {
      const node: any = findNode(page, params.id)
      if (!node) throw new Error(`组件 ${params.id} 不存在`)
      node.style = { ...node.style, ...JSON.parse(JSON.stringify(params.style)) }
      workspace.actions.push(summarize('set_node_style', `${node.name}(${node.id}) style=${JSON.stringify(node.style)}`))
      return { content: [{ type: 'text', text: `已更新 ${node.name} 的样式` }], details: { style: node.style } }
    },
  }

  const removeNodeTool: AgentTool<any> = {
    name: 'remove_node',
    label: '删除组件',
    description: '从画布删除一个组件。',
    parameters: Type.Object({
      id: Type.String({ description: '组件 id' }),
    }),
    execute: async (_id: string, params: any) => {
      const index = page.nodes.findIndex((node) => node.id === params.id)
      if (index === -1) throw new Error(`组件 ${params.id} 不存在`)
      const [removed] = page.nodes.splice(index, 1)
      workspace.actions.push(summarize('remove_node', `${removed.name}(${removed.id})`))
      return { content: [{ type: 'text', text: `已删除 ${removed.name}` }], details: { id: removed.id } }
    },
  }

  const duplicateNodeTool: AgentTool<any> = {
    name: 'duplicate_node',
    label: '复制组件',
    description: '复制一个组件，新组件默认在原组件右下偏移 40px。',
    parameters: Type.Object({
      id: Type.String({ description: '组件 id' }),
    }),
    execute: async (_id: string, params: any) => {
      const source = findNode(page, params.id)
      if (!source) throw new Error(`组件 ${params.id} 不存在`)
      const copy = JSON.parse(JSON.stringify(source))
      copy.id = uuid()
      copy.layout.x += 40
      copy.layout.y += 40
      page.nodes.push(copy)
      workspace.actions.push(summarize('duplicate_node', `${source.name}(${source.id}) → ${copy.id}`))
      return { content: [{ type: 'text', text: `已复制为 ${copy.name}，id=${copy.id}` }], details: { id: copy.id } }
    },
  }

  const setCanvasTool: AgentTool<any> = {
    name: 'set_canvas',
    label: '设置画布',
    description: '设置画布尺寸与背景色。width/height 不传则保持不变。',
    parameters: Type.Object({
      width: Type.Optional(Type.Number()),
      height: Type.Optional(Type.Number()),
      backgroundColor: Type.Optional(Type.String({ description: 'CSS 颜色值，如 #0d121b' })),
    }),
    execute: async (_id: string, params: any) => {
      if (params.width !== undefined) page.canvas.width = params.width
      if (params.height !== undefined) page.canvas.height = params.height
      if (params.backgroundColor !== undefined) page.canvas.backgroundColor = params.backgroundColor
      workspace.actions.push(summarize('set_canvas', JSON.stringify(page.canvas)))
      return { content: [{ type: 'text', text: `画布已更新：${JSON.stringify(page.canvas)}` }], details: page.canvas }
    },
  }

  const arrangeGridTool: AgentTool<any> = {
    name: 'arrange_grid',
    label: '网格排列',
    description:
      '按 3 列网格自动排列指定组件（按传入顺序从左到右、从上到下排满）。适合"把这些组件整齐排一下"这类需求。',
    parameters: Type.Object({
      ids: Type.Array(Type.String(), { description: '按排列顺序的组件 id 列表' }),
      columns: Type.Optional(Type.Number({ description: '列数，默认 3' })),
    }),
    execute: async (_id: string, params: any) => {
      const columns = Math.max(1, params.columns ?? 3)
      const cellW = page.canvas.width / columns
      const cellH = page.canvas.height / Math.ceil(params.ids.length / columns)
      params.ids.forEach((id, index) => {
        const node = findNode(page, id)
        if (!node) return
        node.layout = {
          x: Math.round((index % columns) * cellW),
          y: Math.round(Math.floor(index / columns) * cellH),
          width: Math.round(cellW),
          height: Math.round(cellH),
        }
      })
      workspace.actions.push(summarize('arrange_grid', `${params.ids.length} 个组件 ${columns} 列排列`))
      return { content: [{ type: 'text', text: `已按 ${columns} 列排列 ${params.ids.length} 个组件` }], details: { count: params.ids.length } }
    },
  }

  const addDataSourceTool: AgentTool<any> = {
    name: 'add_data_source',
    label: '添加数据源',
    description:
      '为画布添加数据源，并可选绑定到某个组件。static 用内置演示数据；api 需要给 url（本服务提供 /api/data 演示接口，返回 [{label,value}]）。绑定后组件即用该数据渲染。',
    parameters: Type.Object({
      name: Type.String({ description: '数据源名称' }),
      type: Type.Union([Type.Literal('static'), Type.Literal('api')], { description: 'static=静态数据，api=接口轮询' }),
      url: Type.Optional(Type.String({ description: 'api 类型必填，如 /api/data' })),
      interval: Type.Optional(Type.Number({ description: 'api 轮询间隔毫秒，如 2000' })),
      bindNodeId: Type.Optional(Type.String({ description: '要绑定该数据源的组件 id' })),
    }),
    execute: async (_id: string, params: any) => {
      if (params.type === 'api' && !params.url) {
        throw new Error('api 类型数据源必须提供 url')
      }
      const dataSource: any = {
        type: params.type,
        id: uuid(),
        name: params.name,
        data: params.type === 'static' ? demoStaticData(params.name) : [],
      }
      if (params.url) dataSource.url = params.url
      if (params.interval) dataSource.interval = params.interval
      page.dataSources.push(dataSource)
      let bindText = ''
      if (params.bindNodeId) {
        const node = findNode(page, params.bindNodeId)
        if (!node) throw new Error(`组件 ${params.bindNodeId} 不存在，数据源已添加但未绑定`)
        node.dataId = dataSource.id
        bindText = `，并已绑定到 ${node.name}`
      }
      workspace.actions.push(summarize('add_data_source', `${params.name}(${dataSource.id}) type=${params.type}${bindText}`))
      return {
        content: [{ type: 'text', text: `已添加数据源 ${params.name}，id=${dataSource.id}${bindText}` }],
        details: { id: dataSource.id },
      }
    },
  }

  const bindDataSourceTool: AgentTool<any> = {
    name: 'bind_data_source',
    label: '绑定数据源',
    description: '把已有数据源绑定到组件。',
    parameters: Type.Object({
      nodeId: Type.String({ description: '组件 id' }),
      dataSourceId: Type.String({ description: '数据源 id' }),
    }),
    execute: async (_id: string, params: any) => {
      const node = findNode(page, params.nodeId)
      if (!node) throw new Error(`组件 ${params.nodeId} 不存在`)
      if (!page.dataSources.some((item) => item.id === params.dataSourceId)) {
        throw new Error(`数据源 ${params.dataSourceId} 不存在`)
      }
      node.dataId = params.dataSourceId
      workspace.actions.push(summarize('bind_data_source', `${node.name} ← ${params.dataSourceId}`))
      return { content: [{ type: 'text', text: `已把数据源绑定到 ${node.name}` }], details: { nodeId: node.id } }
    },
  }

  const listNodesTool: AgentTool<any> = {
    name: 'list_nodes',
    label: '列出组件',
    description: '列出当前画布所有组件的 id、名称、类型与布局。',
    parameters: Type.Object({}),
    execute: async () => {
      const lines = page.nodes.map(
        (node) => `${node.name}｜id=${node.id}｜type=${node.type}｜layout=${JSON.stringify(node.layout)}｜dataId=${node.dataId ?? '无'}`,
      )
      workspace.actions.push(summarize('list_nodes', `${page.nodes.length} 个组件`))
      return { content: [{ type: 'text', text: lines.join('\n') || '画布为空' }], details: { count: page.nodes.length } }
    },
  }

  return [
    addNodeTool,
    updateNodePropsTool,
    setNodeStyleTool,
    setLayoutTool,
    removeNodeTool,
    duplicateNodeTool,
    arrangeGridTool,
    setCanvasTool,
    addDataSourceTool,
    bindDataSourceTool,
    listNodesTool,
  ]
}

function demoStaticData(name: string) {
  const labels = ['一月', '二月', '三月', '四月', '五月', '六月']
  return labels.map((label, index) => ({ label, value: Math.round((Math.sin(index + name.length) + 1.5) * 100) }))
}
