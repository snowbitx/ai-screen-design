import { createProvider, envApiKeyAuth, lazyApi, type Model } from '@earendil-works/pi-ai'
import { builtinModels } from '@earendil-works/pi-ai/providers/all'
import { createMockModel, isMockMode } from './mock.ts'

export interface AiRuntimeConfig {
  provider?: string
  baseUrl?: string
  apiKey?: string
  model?: string
  embedModel?: string
}

const DEFAULT_PROVIDER = 'moonshotai'
const DEFAULT_MODEL_ID = 'kimi-k2-0905-preview'

// pi-ai 0.85 起：Agent 需要显式 streamFn（Models.streamSimple 满足该形状），
// 模型查询与流式请求统一走 builtinModels 实例（内置 provider + 运行时注册的自定义
// provider），auth 走 envApiKeyAuth（请求级 apiKey 优先，其次 env）
export const runtimeModels = builtinModels()

export type RuntimeModels = typeof runtimeModels

function registerRuntimeProvider(provider: string, baseUrl?: string) {
  if (runtimeModels.getProvider(provider)) return
  runtimeModels.setProvider(
    createProvider({
      id: provider,
      name: provider,
      baseUrl: baseUrl || '',
      auth: {
        apiKey: envApiKeyAuth(`API key for ${provider}`, [
          `${provider.toUpperCase().replace(/-/g, '_')}_API_KEY`,
        ]),
      },
      models: [],
      api: lazyApi(() => import('@earendil-works/pi-ai/api/openai-completions')),
    }),
  )
}

export function resolveModel(ai: AiRuntimeConfig): Model<any> {
  // 离线回归模式：用 faux provider 走真实 Agent 循环，模型输出是脚本化的
  if (isMockMode()) return createMockModel(runtimeModels)

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
