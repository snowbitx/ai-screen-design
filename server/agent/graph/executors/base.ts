import { Agent, type AgentTool } from '@earendil-works/pi-agent-core'
import type { PageSchema } from '@shared/schema/page.ts'
import { runtimeModels } from '../../model.ts'
import { conventionsBlock, materialsBlock, schemaBlock } from '../../prompt.ts'
import { createScreenTools } from '../../tools.ts'
import { clonePage, type AgentState, type TaskArtifacts, type TaskNodeState } from '../state.ts'

export interface TaskOutcome {
  page: PageSchema
  actions: string[]
  artifacts: TaskArtifacts
}

/** 单任务里最多允许的工具调用次数，防止模型在一个任务里无限循环 */
const MAX_TOOL_CALLS = 10

/**
 * 替换指令里的前序产物占位符：${t1.nodeId} → 真实 id。
 * 这就是"数据源还没创建，图表怎么知道它的 ID"的答案——规划阶段写占位符，
 * 执行阶段按已完成任务的产物替换。
 */
export function resolveRefs(text: string, artifacts: Record<string, TaskArtifacts>): string {
  return text.replace(/\$\{(\w+)\.(nodeId|dataSourceId)\}/g, (raw, taskId: string, key: string) => {
    const value =
      key === 'nodeId' ? artifacts[taskId]?.nodeIds[0] : artifacts[taskId]?.dataSourceIds[0]
    return value || raw
  })
}

/** 把已完成任务的产物列给执行器，模型才知道能引用哪些 id */
export function describeArtifacts(
  tasks: TaskNodeState[],
  artifacts: Record<string, TaskArtifacts>,
): string {
  const lines = tasks
    .filter((item) => item.status === 'done')
    .flatMap((item) => {
      const value = artifacts[item.task.id]
      const parts: string[] = []
      if (value?.nodeIds.length) parts.push(`nodeId=${value.nodeIds.join(',')}`)
      if (value?.dataSourceIds.length) parts.push(`dataSourceId=${value.dataSourceIds.join(',')}`)
      return parts.length ? [`- ${item.task.id}（${item.task.name}）：${parts.join('｜')}`] : []
    })
  return lines.length ? lines.join('\n') : '（无）'
}

export function buildTaskSystemPrompt(
  state: AgentState,
  taskNode: TaskNodeState,
  artifacts: Record<string, TaskArtifacts>,
  extras: string[] = [],
): string {
  const { task } = taskNode
  return `你是大屏编辑器的任务执行器。只执行下面这一件事，不要顺手做别的。

## 任务类型
${task.type}

## 任务名
${task.name}

## 依赖产物（可引用的 id）
${describeArtifacts(state.tasks, artifacts)}

## 画布当前状态
${describePageCompact(state.page)}

${materialsBlock(state.catalog)}

${schemaBlock()}

${conventionsBlock()}

${extras.join('\n\n')}

## 执行要求
- 完成后用一句话说明做了什么，包括新建组件的 id。
- 不要输出 JSON，不要复述配置。
- 如果指令里的占位符没有替换成真实 id，先看上面的依赖产物，找不到就如实说明失败原因。`
}

function describePageCompact(page: PageSchema): string {
  const nodes = page.nodes
    .map(
      (node) =>
        `- ${node.name}｜id=${node.id}｜type=${node.type}｜x=${node.layout.x},y=${node.layout.y},w=${node.layout.width},h=${node.layout.height}${node.dataId ? `｜dataId=${node.dataId}` : ''}`,
    )
    .join('\n')
  const sources = page.dataSources
    .map((source) => `- ${source.name}｜id=${source.id}｜type=${source.type}`)
    .join('\n')
  return `画布 ${page.canvas.width}x${page.canvas.height}
组件：\n${nodes || '（空）'}
数据源：\n${sources || '（无）'}`
}

export interface RunTaskAgentOptions {
  tools?: AgentTool<any>[]
  extras?: string[]
  maxToolCalls?: number
}

/**
 * 用 pi Agent 跑一个任务：任务有自己的页面副本、自己的工具集、自己的工具预算。
 * 返回的是"任务完成后的页面副本"，调度器拿它和基线做 diff 得到 patch。
 */
export async function runTaskAgent(
  state: AgentState,
  taskNode: TaskNodeState,
  options: RunTaskAgentOptions = {},
): Promise<TaskOutcome> {
  const page = clonePage(state.page)
  const workspace = { page, actions: [] as string[], selectedNodeIds: state.selectedNodeIds }
  const tools = [...createScreenTools(workspace, state.catalog), ...(options.tools || [])]
  const toolLabels = new Map(tools.map((tool) => [tool.name, tool.label]))
  const artifacts: Record<string, TaskArtifacts> = {}
  for (const item of state.tasks) {
    if (item.artifacts) artifacts[item.task.id] = item.artifacts
  }

  const agent = new Agent({
    initialState: {
      systemPrompt: buildTaskSystemPrompt(state, taskNode, artifacts, options.extras),
      model: state.llm.model,
      thinkingLevel: 'off',
      tools,
      messages: [],
    },
    streamFn: (model, context, streamOptions) =>
      runtimeModels.streamSimple(model as any, context, {
        ...streamOptions,
        apiKey: state.llm.apiKey,
        signal: state.llm.signal,
      }),
    getApiKey: () => state.llm.apiKey,
  })

  const limit = options.maxToolCalls ?? MAX_TOOL_CALLS
  let toolCalls = 0
  let runError = ''
  let overflow = false

  const unsubscribe = agent.subscribe((event) => {
    if (event.type === 'tool_execution_start') {
      toolCalls++
      state.emit({
        type: 'tool',
        phase: 'start',
        name: event.toolName,
        label: toolLabels.get(event.toolName),
        taskId: taskNode.task.id,
      })
      if (toolCalls > limit) {
        overflow = true
        agent.abort()
      }
      return
    }
    if (event.type === 'tool_execution_end') {
      state.emit({
        type: 'tool',
        phase: 'end',
        name: event.toolName,
        label: toolLabels.get(event.toolName),
        ok: !event.isError,
        taskId: taskNode.task.id,
      })
      return
    }
    if (event.type === 'message_end' && event.message.role === 'assistant') {
      if (event.message.stopReason === 'error' && event.message.errorMessage) {
        runError = event.message.errorMessage
      }
    }
  })

  const instruction = resolveRefs(taskNode.task.instruction, artifacts)

  try {
    await agent.prompt(instruction)
  } catch (error: any) {
    if (!state.aborted && !overflow) throw error
  } finally {
    unsubscribe()
  }

  if (runError && !state.aborted) throw new Error(runError)

  const beforeNodeIds = new Set(state.page.nodes.map((node) => node.id))
  const beforeSourceIds = new Set(state.page.dataSources.map((source) => source.id))

  return {
    page,
    actions: workspace.actions,
    artifacts: {
      nodeIds: page.nodes.filter((node) => !beforeNodeIds.has(node.id)).map((node) => node.id),
      dataSourceIds: page.dataSources
        .filter((source) => !beforeSourceIds.has(source.id))
        .map((source) => source.id),
      note: overflow ? `工具调用超过 ${limit} 次，已中止本任务` : undefined,
    },
  }
}

/** 任务失败时用的空结果 */
export function failedOutcome(page: PageSchema): TaskOutcome {
  return {
    page,
    actions: [],
    artifacts: { nodeIds: [], dataSourceIds: [] },
  }
}
