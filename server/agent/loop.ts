import { Agent, type AgentMessage } from '@earendil-works/pi-agent-core'
import { createProvider, envApiKeyAuth, lazyApi, type Model } from '@earendil-works/pi-ai'
import { builtinModels } from '@earendil-works/pi-ai/providers/all'
import type { PageSchema } from '@shared/schema/page.ts'
import { describeMaterials } from './materials.ts'
import { createScreenTools, type Workspace } from './tools.ts'

interface AiRuntimeConfig {
  provider?: string
  baseUrl?: string
  apiKey?: string
  model?: string
}

const DEFAULT_PROVIDER = 'moonshotai'
const DEFAULT_MODEL_ID = 'kimi-k2-0905-preview'

// pi-ai 0.85 起：Agent 需要显式 streamFn（Models.streamSimple 满足该形状），
// 模型查询与流式请求统一走 builtinModels 实例（内置 provider + 运行时注册的自定义
// provider），auth 走 envApiKeyAuth（请求级 apiKey 优先，其次 env）
const runtimeModels = builtinModels()

function registerRuntimeProvider(provider: string, baseUrl?: string) {
  if (runtimeModels.getProvider(provider)) return
  runtimeModels.setProvider(createProvider({
    id: provider,
    name: provider,
    baseUrl: baseUrl || '',
    auth: { apiKey: envApiKeyAuth(`API key for ${provider}`, [`${provider.toUpperCase().replace(/-/g, '_')}_API_KEY`]) },
    models: [],
    api: lazyApi(() => import('@earendil-works/pi-ai/api/openai-completions')),
  }))
}

function resolveModel(ai: AiRuntimeConfig): Model<any> {
  const provider = ai.provider || DEFAULT_PROVIDER
  const modelId = ai.model || DEFAULT_MODEL_ID
  registerRuntimeProvider(provider, ai.baseUrl)
  const model = runtimeModels.getModel(provider, modelId)
  if (model) {
    // 目录对象是共享实例，覆盖 baseUrl 必须浅拷贝，避免跨请求污染
    return ai.baseUrl ? { ...model, baseUrl: ai.baseUrl } : model
  }
  // 目录没有该 model 时，按 OpenAI 兼容协议对接（自建网关、代理等）
  return {
    id: modelId,
    name: modelId,
    api: 'openai-completions',
    provider,
    baseUrl: ai.baseUrl || '',
    reasoning: false,
    input: ['text'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  }
}

export function buildSystemPrompt(page: PageSchema) {
  return `你是大屏设计器「AI Screen Design」的编辑助手，直接操作页面 DSL 完成用户的大屏搭建需求。

## 工作方式
- 用户描述需求，你通过工具直接增删改画布组件。所有修改会实时同步到用户的编辑器。
- 需要多步操作时按顺序调用工具，不要一次调用里做互斥的修改。
- 新组件加入后如需继续调整（改样式、绑定数据），使用返回的组件 id。
- 布局优先使用 grid 模式（3 列 5 行），多组件并排时用 arrange_grid 更整齐。
- 操作完成后，用一两句话总结你做了什么。不要复述完整 JSON。

## 画布当前状态
- 尺寸：${page.canvas.width}x${page.canvas.height}，背景色 ${page.canvas.backgroundColor}
- 已有组件 ${page.nodes.length} 个：
${page.nodes.map((node) => `  - ${node.name}｜id=${node.id}｜type=${node.type}`).join('\n') || '  （空画布）'}
- 已有数据源 ${page.dataSources.length} 个：
${page.dataSources.map((item) => `  - ${item.name}｜id=${item.id}｜type=${item.type}`).join('\n') || '  （无）'}

## 可用物料目录
${describeMaterials()}

## 数据约定
- 直角坐标系图表（柱/折线/面积/散点等）的数据放在 props.option.dataset.source，字段通过 series[0].encode.x/y 映射。
- 饼图/漏斗图用 encode.itemName/value，仪表盘改 series[0].data[0].value。
- 静态数据直接写入 dataset.source；要演示轮询数据就用 add_data_source 建 api 数据源（/api/data 返回 [{label,value}]）并绑定组件。
- 用户没有给数据时，按语义生成 4~8 条合理的演示数据。`
}

export interface AgentRunResult {
  reply: string
  actions: string[]
}

/**
 * 跑一次完整的 agent 会话：pi Agent 自主循环调用工具，直到给出最终回复。
 * 所有工具修改都落在传入的同一个 page 对象上（调用方持有引用）。
 */
export async function runScreenAgent(
  page: PageSchema,
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  ai: AiRuntimeConfig,
  signal?: AbortSignal,
): Promise<AgentRunResult> {
  if (!ai.apiKey) {
    throw createError({ statusCode: 503, statusMessage: '未配置 AI 服务（设置 NUXT_AI_API_KEY 环境变量）' })
  }

  const model = resolveModel(ai)
  const workspace: Workspace = { page, actions: [] }

  const agent = new Agent({
    initialState: {
      systemPrompt: buildSystemPrompt(page),
      model,
      thinkingLevel: 'off',
      tools: createScreenTools(workspace),
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
          usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
          stopReason: 'stop',
          timestamp: Date.now(),
        }
      }),
    },
    // 新版 pi-agent-core 必须显式提供 streamFn；Models.streamSimple 即所需形状
    streamFn: (model, context, options) =>
      runtimeModels.streamSimple(model as any, context, { ...options, apiKey: ai.apiKey }),
    getApiKey: () => ai.apiKey,
  })

  let reply = ''
  const unsubscribe = agent.subscribe((event) => {
    if (event.type === 'message_end' && event.message.role === 'assistant') {
      const text = event.message.content
        .filter((part) => part.type === 'text')
        .map((part) => (part as any).text)
        .join('')
      if (text) reply = text
    }
  })

  // 客户端断开时中止 agent 循环
  const onAbort = () => agent.abort()
  signal?.addEventListener('abort', onAbort, { once: true })

  try {
    await agent.prompt(userMessage)
  } finally {
    unsubscribe()
    signal?.removeEventListener('abort', onAbort)
  }

  return { reply, actions: workspace.actions }
}
