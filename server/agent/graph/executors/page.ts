import type { PageSchema } from '@shared/schema/page.ts'
import { PagePlanJson } from '../../spec/index.ts'
import { completeJson } from '../llm.ts'
import { describePage, type AgentState, type TaskArtifacts, type TaskNodeState } from '../state.ts'
import { collectSkillBodies } from '../../skills/index.ts'
import { conventionsBlock, materialsBlock, schemaBlock } from '../../prompt.ts'
import type { TaskOutcome } from './base.ts'

export const PAGE_SYSTEM = `你是整页规划器。输出一份"页面区块清单"，由服务端负责实例化物料、计算像素布局、建数据源并绑定。

## 栅格
画布按 12 列 × 12 行栅格规划，坐标从 1 开始，左上角是 (1,1)。
- 整宽标题：col=1, spanX=12, spanY=1
- 三个指标卡：spanX=4, spanY=1
- 主图：spanX=6~8, spanY=3~4
- 侧栏：spanX=4~6, spanY=3~4
同一行区块的 spanX 之和等于 12，且 row 相同、spanY 相同，否则会错位。

## 布局套路（1920x1080）
1. row=1：标题（spanX=12, spanY=1）
2. row=2：3 或 4 个指标卡（spanX=4 或 3, spanY=1）
3. row=3~7：主图（spanX=8, spanY=5）+ 侧图（spanX=4, spanY=5）
4. row=8~12：趋势图（spanX=12, spanY=5）或两张各 6 列
不要留空行；区块之间不要重叠。

## 数据
- 每个图表区块尽量带上 data：写清数据源名、kind（static/api）、static 的 rows 字段。
- rows 的字段名必须和该物料的 encode 对齐（直角坐标系用 label/value；饼图用 label/value）。
- api 类型必须给 url（演示可用 /api/data）并可给 interval。
- rows 数量 4~8 条，数值要有区分度，不要全是同一个数。

## 物料
只能用物料目录里的 type。图表 option 片段只写要覆盖的部分（title.text、color 等），不要重写整个 option。`

const GRID_COLUMNS = 12
const GRID_ROWS = 12
const OUTER_MARGIN = 24
const GAP = 16

export interface PageBlock {
  type: string
  name: string
  grid: { col: number; row: number; spanX: number; spanY: number }
  props?: Record<string, any>
  style?: Record<string, any>
  data?: {
    name: string
    kind: 'static' | 'api'
    url?: string
    interval?: number
    rows?: Record<string, any>[]
  }
}

export async function executePageTask(
  state: AgentState,
  taskNode: TaskNodeState,
): Promise<TaskOutcome> {
  const skills = collectSkillBodies(state.skills)
  const plan = await completeJson<{
    title: string
    backgroundColor?: string
    blocks: PageBlock[]
  }>(state.llm, {
    system: `${PAGE_SYSTEM}\n\n${materialsBlock(state.catalog)}\n\n${schemaBlock()}\n\n${conventionsBlock()}\n${skills ? `\n## 设计规范\n${skills}` : ''}`,
    schemaName: 'page-plan',
    schema: PagePlanJson,
    user: `## 用户需求
${state.message}

## 本任务指令
${taskNode.task.instruction}

## 当前画布
${describePage(state)}`,
    temperature: 0.3,
    maxTokens: 3000,
  })

  const page = JSON.parse(JSON.stringify(state.page)) as PageSchema
  const artifacts: TaskArtifacts = { nodeIds: [], dataSourceIds: [] }
  const actions: string[] = []
  const canvas = page.canvas

  if (plan.backgroundColor) canvas.backgroundColor = plan.backgroundColor

  const cellWidth = (canvas.width - OUTER_MARGIN * 2 - GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS
  const cellHeight = (canvas.height - OUTER_MARGIN * 2 - GAP * (GRID_ROWS - 1)) / GRID_ROWS

  // 整页生成是替换语义：先清空旧组件，再按区块落位（数据源保留，供复用）
  page.nodes = []

  // 区块里已经有整宽标题时不再补，避免出现两个标题
  const hasHeader = plan.blocks.some(
    (block) => block.grid?.row === 1 && block.grid?.spanX >= 10 && block.type === 'text',
  )
  if (!hasHeader) {
    const titleNode = buildTitleNode(state, plan.title)
    if (titleNode) {
      page.nodes.push(titleNode)
      artifacts.nodeIds.push(titleNode.id)
      actions.push(`page: 标题「${plan.title}」`)
    }
  }

  for (const block of plan.blocks.slice(0, 14)) {
    const definition = state.catalog.get(block.type)
    if (!definition) {
      actions.push(`page: 跳过未知物料 ${block.type}`)
      continue
    }

    const colSpan = clamp(block.grid.spanX, 1, GRID_COLUMNS)
    const rowSpan = clamp(block.grid.spanY, 1, GRID_ROWS)
    const col = clamp(block.grid.col, 1, GRID_COLUMNS - colSpan + 1)
    const row = clamp(block.grid.row, 1, GRID_ROWS - rowSpan + 1)

    const layout = {
      x: Math.round(OUTER_MARGIN + (col - 1) * (cellWidth + GAP)),
      y: Math.round(OUTER_MARGIN + (row - 1) * (cellHeight + GAP)),
      width: Math.round(colSpan * cellWidth + (colSpan - 1) * GAP),
      height: Math.round(rowSpan * cellHeight + (rowSpan - 1) * GAP),
    }

    const instance = state.catalog.instantiate(block.type, crypto.randomUUID(), layout)
    if (!instance) continue
    instance.name = block.name || definition.name
    instance.props = mergeProps(instance.props, block.props)
    if (block.style) instance.style = { ...instance.style, ...block.style }

    if (block.data) {
      const dataSource = {
        type: block.data.kind,
        id: crypto.randomUUID(),
        name: block.data.name || `${instance.name}数据`,
        data:
          block.data.kind === 'api' ? [] : block.data.rows?.length ? block.data.rows : demoRows(),
        ...(block.data.kind === 'api'
          ? { url: block.data.url || '/api/data', interval: block.data.interval || 5000 }
          : {}),
      }
      page.dataSources.push(dataSource)
      instance.dataId = dataSource.id
      artifacts.dataSourceIds.push(dataSource.id)
    }

    page.nodes.push(instance)
    artifacts.nodeIds.push(instance.id)
    actions.push(`page: ${instance.name} (${block.type}) ${layout.width}x${layout.height}`)
  }

  return { page, actions, artifacts }
}

function buildTitleNode(state: AgentState, title: string) {
  const definition = state.catalog.get('text')
  if (!definition) return undefined
  const node = state.catalog.instantiate('text', crypto.randomUUID(), {
    x: OUTER_MARGIN,
    y: 12,
    width: state.page.canvas.width - OUTER_MARGIN * 2,
    height: 64,
  })
  if (!node) return undefined
  node.name = '页面标题'
  node.props = { ...node.props, content: title }
  node.style = {
    ...node.style,
    color: '#e2e8f0',
    fontSize: '32px',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: '64px',
  }
  return node
}

/**
 * 合并 props：空对象/undefined 直接丢掉。
 * 模型经常吐出 { option: { title: {} } } 这种空壳，直接合并会把默认配置清空，
 * 图表渲染成空白——所以这里递归剔除空值。
 */
export function mergeProps(base: Record<string, any>, patch?: Record<string, any>) {
  if (!patch) return base
  const cleaned = pruneEmpty(patch)
  const result: Record<string, any> = { ...base }
  for (const [key, value] of Object.entries(cleaned)) {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = { ...result[key], ...value }
    } else {
      result[key] = value
    }
  }
  return result
}

export function pruneEmpty<T = any>(value: T): T {
  if (Array.isArray(value)) {
    return value.filter((item) => !isEmptyValue(item)).map((item) => pruneEmpty(item)) as any
  }
  if (isPlainObject(value)) {
    const result: Record<string, any> = {}
    for (const [key, item] of Object.entries(value as Record<string, any>)) {
      if (isEmptyValue(item)) continue
      result[key] = pruneEmpty(item)
    }
    return result as T
  }
  return value
}

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (isPlainObject(value) && Object.keys(value as object).length === 0) return true
  return false
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function clamp(value: number, min: number, max: number) {
  const number = Number(value)
  if (!Number.isFinite(number)) return min
  return Math.min(max, Math.max(min, Math.round(number)))
}

function demoRows() {
  const labels = ['一月', '二月', '三月', '四月', '五月', '六月']
  return labels.map((label, index) => ({
    label,
    value: [120, 200, 160, 240, 180, 300][index],
  }))
}
