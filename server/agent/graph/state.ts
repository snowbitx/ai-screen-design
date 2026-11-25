import type { PageSchema } from '@shared/schema/page.ts'
import type {
  AgentImageInput,
  AgentIntent,
  AgentPlan,
  AgentPlanTask,
  AgentStreamEvent,
  AgentTaskStatus,
} from '@shared/schema/agent.ts'
import type { LlmRuntime } from './llm.ts'
import type { MaterialCatalog } from '../materials.ts'
import { describeDataShape, formatDataShape } from '../data.ts'

export type EmitFn = (event: AgentStreamEvent) => void

export interface TaskArtifacts {
  /** 本任务创建/修改的组件 id，前序任务可用 ${tX.nodeId} 引用 */
  nodeIds: string[]
  /** 本任务创建的数据源 id，前序任务可用 ${tX.dataSourceId} 引用 */
  dataSourceIds: string[]
  note?: string
}

export interface TaskNodeState {
  task: AgentPlanTask
  status: AgentTaskStatus
  error?: string
  actions: string[]
  artifacts?: TaskArtifacts
  /** 计划数组下标，对应章节里的 currentTaskIndex */
  index: number
}

export interface AgentState {
  /** 权威工作副本：所有任务最终都合并到这里 */
  page: PageSchema
  /** 运行入口快照，取消/失败时回滚用 */
  snapshot: PageSchema
  message: string
  history: { role: 'user' | 'assistant'; content: string }[]
  selectedNodeIds: string[]
  images: AgentImageInput[]
  catalog: MaterialCatalog
  llm: LlmRuntime
  emit: EmitFn

  intent?: AgentIntent
  intentReason?: string
  skills: string[]

  plan?: AgentPlan
  tasks: TaskNodeState[]
  /** 当前执行到第几项（-1 表示还没开始） */
  currentTaskIndex: number

  actions: string[]
  aborted: boolean
}

export function clonePage(page: PageSchema): PageSchema {
  return JSON.parse(JSON.stringify(page))
}

export function createState(input: {
  page: PageSchema
  message: string
  history?: { role: 'user' | 'assistant'; content: string }[]
  selectedNodeIds?: string[]
  images?: AgentImageInput[]
  catalog: MaterialCatalog
  llm: LlmRuntime
  emit: EmitFn
}): AgentState {
  return {
    page: input.page,
    snapshot: clonePage(input.page),
    message: input.message,
    history: input.history || [],
    selectedNodeIds: input.selectedNodeIds || [],
    images: input.images || [],
    catalog: input.catalog,
    llm: input.llm,
    emit: input.emit,
    skills: [],
    tasks: [],
    currentTaskIndex: -1,
    actions: [],
    aborted: false,
  }
}

/** 画布摘要：每次调用模型都带上，避免模型"看不见"当前 DSL */
export function describePage(state: AgentState, page: PageSchema = state.page): string {
  const selected = new Set(state.selectedNodeIds)
  const nodes = page.nodes
    .map((node) => {
      const flags = [
        selected.has(node.id) ? '选中' : '',
        node.dataId ? `dataId=${node.dataId}` : '',
        node.events?.length ? `events=${node.events.map((event) => event.type).join(',')}` : '',
      ]
        .filter(Boolean)
        .join('｜')
      return `- ${node.name}｜id=${node.id}｜type=${node.type}｜x=${node.layout.x},y=${node.layout.y},w=${node.layout.width},h=${node.layout.height}${flags ? `｜${flags}` : ''}`
    })
    .join('\n')

  const sources = page.dataSources
    .map(
      (source) =>
        `- ${source.name}｜id=${source.id}｜type=${source.type}${source.url ? `｜url=${source.url}` : ''}｜${formatDataShape(describeDataShape(source.data))}`,
    )
    .join('\n')

  return `画布 ${page.canvas.width}x${page.canvas.height}，背景 ${page.canvas.backgroundColor}
组件（${page.nodes.length}）：
${nodes || '（空）'}
数据源（${page.dataSources.length}）：
${sources || '（无）'}`
}

export function totalActions(state: AgentState): number {
  return state.tasks.reduce((sum, item) => sum + item.actions.length, 0)
}

export function markTask(
  state: AgentState,
  node: TaskNodeState,
  status: AgentTaskStatus,
  extra: { error?: string; actions?: number } = {},
) {
  node.status = status
  if (extra.error) node.error = extra.error
  state.emit({
    type: 'task',
    id: node.task.id,
    name: node.task.name,
    status,
    error: extra.error,
    actions: extra.actions,
  })
  const done = state.tasks.filter((item) => item.status === 'done').length
  state.emit({ type: 'progress', done, total: state.tasks.length })
}
