import { Agent, type AgentMessage } from '@earendil-works/pi-agent-core'
import type { ImageContent } from '@earendil-works/pi-ai'
import type { PageSchema } from '@shared/schema/page.ts'
import type { MaterialDefinition } from '@shared/schema/material.ts'
import type { AgentImageInput, AgentRunResult, AgentStreamEvent } from '@shared/schema/agent.ts'
import { conventionsBlock, materialsBlock, schemaBlock } from './prompt.ts'
import { createMaterialCatalog, defaultMaterialCatalog } from './materials.ts'
import { describeDataShape, formatDataShape } from './data.ts'
import { resolveModel, runtimeModels, type AiRuntimeConfig } from './model.ts'
import { createScreenTools, type Workspace } from './tools.ts'

export function buildSystemPrompt(
  page: PageSchema,
  selectedNodeIds: string[] = [],
  catalog = defaultMaterialCatalog,
) {
  const selected = page.nodes.filter((node) => selectedNodeIds.includes(node.id))
  const selectionInfo = selected.length
    ? selected.map((node) => `  - ${node.name}｜id=${node.id}｜type=${node.type}`).join('\n')
    : '  （未选中任何组件）'

  return `你是大屏设计器「AI Screen Design」的编辑助手，直接操作页面 DSL 完成用户的大屏搭建需求。

## 工作方式
- 用户描述需求，你通过工具直接增删改画布组件。所有修改会实时同步到用户的编辑器。
- 需要多步操作时按顺序调用工具，不要一次调用里做互斥的修改。
- 新组件加入后如需继续调整（改样式、绑定数据），使用返回的组件 id。
- 布局优先使用 grid 模式（3 列 5 行），多组件并排时用 arrange_grid 更整齐。
- 操作完成后，用一两句话总结你做了什么。不要复述完整 JSON。

## 当前选中
${selectionInfo}
- 用户说"这个 / 选中的 / 它"时，优先操作上面这些组件，不要重新猜 id。

## 画布当前状态
- 尺寸：${page.canvas.width}x${page.canvas.height}，背景色 ${page.canvas.backgroundColor}
- 已有组件 ${page.nodes.length} 个：
${page.nodes.map((node) => `  - ${node.name}｜id=${node.id}｜type=${node.type}`).join('\n') || '  （空画布）'}
- 已有数据源 ${page.dataSources.length} 个：
${page.dataSources.map((item) => `  - ${item.name}｜id=${item.id}｜type=${item.type}｜${formatDataShape(describeDataShape(item.data))}`).join('\n') || '  （无）'}

${materialsBlock(catalog)}

${schemaBlock()}

${conventionsBlock()}`
}

export interface ScreenAgentOptions {
  page: PageSchema
  message: string
  history: { role: 'user' | 'assistant'; content: string }[]
  selectedNodeIds?: string[]
  images?: AgentImageInput[]
  /** 前端物料快照 */
  materials?: MaterialDefinition[]
  ai: AiRuntimeConfig
  signal?: AbortSignal
  onEvent?: (event: AgentStreamEvent) => void
}

/**
 * 直连模式：pi Agent 自主循环调用工具，直到给出最终回复。
 * 不经过意图识别与任务规划，适合单点小改动，也作为规划失败时的兜底路径。
 * 所有工具修改都落在传入的同一个 page 对象上（调用方持有引用）。
 */
export async function runScreenAgent(options: ScreenAgentOptions): Promise<AgentRunResult> {
  const {
    page,
    message,
    history,
    selectedNodeIds = [],
    images = [],
    materials,
    ai,
    signal,
    onEvent,
  } = options

  if (!ai.apiKey) {
    throw createError({
      statusCode: 503,
      statusMessage: '未配置 AI 服务（设置 NUXT_AI_API_KEY 环境变量）',
    })
  }

  const emit = (event: AgentStreamEvent) => {
    try {
      onEvent?.(event)
    } catch {
      // 客户端已断开时忽略上报失败，不打断 agent 循环
    }
  }

  const catalog = createMaterialCatalog(materials)
  const model = resolveModel(ai)
  const workspace: Workspace = { page, actions: [], selectedNodeIds }
  const tools = createScreenTools(workspace, catalog)
  const toolLabels = new Map(tools.map((tool) => [tool.name, tool.label]))

  const agent = new Agent({
    initialState: {
      systemPrompt: buildSystemPrompt(page, selectedNodeIds, catalog),
      model,
      thinkingLevel: 'off',
      tools,
      messages: history.map((item): AgentMessage => {
        if (item.role === 'user') {
          return { role: 'user', content: item.content, timestamp: Date.now() }
        }
        // 历史里的 assistant 只需要文本回放，字段补齐到 AssistantMessage 形状
        return {
          role: 'assistant',
          content: [{ type: 'text', text: item.content }],
          api: model.api,
          provider: model.provider,
          model: model.id,
          usage: {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 0,
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
          },
          stopReason: 'stop',
          timestamp: Date.now(),
        }
      }),
    },
    // 新版 pi-agent-core 必须显式提供 streamFn；Models.streamSimple 即所需形状
    streamFn: (model, context, streamOptions) =>
      runtimeModels.streamSimple(model as any, context, { ...streamOptions, apiKey: ai.apiKey }),
    getApiKey: () => ai.apiKey,
  })

  let reply = ''
  let aborted = false
  let runError = ''
  let actionCursor = 0

  const unsubscribe = agent.subscribe((event) => {
    if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
      emit({ type: 'text', delta: event.assistantMessageEvent.delta })
      return
    }

    if (event.type === 'tool_execution_start') {
      emit({
        type: 'tool',
        phase: 'start',
        name: event.toolName,
        label: toolLabels.get(event.toolName),
      })
      return
    }

    if (event.type === 'tool_execution_end') {
      emit({
        type: 'tool',
        phase: 'end',
        name: event.toolName,
        label: toolLabels.get(event.toolName),
        ok: !event.isError,
      })
      // 并行模式下完成顺序可能乱序，按 actions 队列补齐尚未下发的动作
      while (actionCursor < workspace.actions.length) {
        emit({ type: 'action', action: workspace.actions[actionCursor++] })
      }
      return
    }

    if (event.type === 'message_end' && event.message.role === 'assistant') {
      if (event.message.stopReason === 'error' && event.message.errorMessage) {
        runError = event.message.errorMessage
      }
      const text = event.message.content
        .filter((part) => part.type === 'text')
        .map((part) => (part as any).text)
        .join('')
      if (text) reply = text
    }
  })

  // 客户端断开时中止 agent 循环
  const onAbort = () => {
    aborted = true
    agent.abort()
  }
  signal?.addEventListener('abort', onAbort, { once: true })
  if (signal?.aborted) onAbort()

  try {
    const imageContents: ImageContent[] = images
      .filter((item) => item?.data)
      .map((item) => ({ type: 'image', data: item.data, mimeType: item.mimeType || 'image/png' }))
    if (imageContents.length) {
      await agent.prompt(message, imageContents)
    } else {
      await agent.prompt(message)
    }
  } catch (error) {
    if (!aborted) throw error
  } finally {
    unsubscribe()
    signal?.removeEventListener('abort', onAbort)
  }

  if (runError && !aborted) {
    throw new Error(runError)
  }

  return { reply, actions: workspace.actions, page, aborted }
}
