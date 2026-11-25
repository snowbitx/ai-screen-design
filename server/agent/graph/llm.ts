import { parseJsonWithRepair, type ImageContent, type Model } from '@earendil-works/pi-ai'
import type { TSchema } from 'typebox'
import { resolveModel, runtimeModels, type AiRuntimeConfig } from '../model.ts'
import { validate } from '../spec/validate.ts'
import type { EmbeddingConfig } from '../rag/embedding.ts'
import { isMockMode, mockJsonText, mockTextReply } from '../mock.ts'

export interface LlmRuntime {
  model: Model<any>
  apiKey: string
  signal?: AbortSignal
  embedding?: EmbeddingConfig
}

export function createLlmRuntime(ai: AiRuntimeConfig, signal?: AbortSignal): LlmRuntime {
  return {
    model: resolveModel(ai),
    apiKey: ai.apiKey || '',
    signal,
    embedding: {
      baseUrl: ai.baseUrl,
      apiKey: ai.apiKey,
      model: ai.embedModel || process.env.NUXT_AI_EMBED_MODEL,
    },
  }
}

export interface JsonCallOptions {
  system: string
  user: string
  schema: TSchema
  /** 用于 mock 与日志，如 classify / plan / page-plan */
  schemaName: string
  images?: ImageContent[]
  temperature?: number
  maxTokens?: number
  /** 首次失败后再试几次，默认 1 次重试 */
  retries?: number
}

/**
 * 结构化调用：要求模型只输出符合 JSON Schema 的 JSON，并对结果做运行时校验。
 *
 * 为什么不用 function calling 强约束：pi-ai 的 toolChoice 只有 auto/none，
 * 没有"必须调用某工具"的强制模式；所以这里走"提示词约束 + 本地校验 + 失败重试"，
 * 校验不过时把错误回灌给模型再试一次，比解析失败静默返回空对象可控得多。
 */
export async function completeJson<T>(runtime: LlmRuntime, options: JsonCallOptions): Promise<T> {
  const retries = options.retries ?? 1
  const schemaText = JSON.stringify(options.schema)
  let feedback = ''
  let lastError = ''

  for (let attempt = 0; attempt <= retries; attempt++) {
    const user = feedback
      ? `${options.user}\n\n## 上一次输出不合法\n${feedback}\n请修正后重新输出，仍然只输出 JSON。`
      : options.user

    const text = isMockMode()
      ? await mockComplete(options)
      : await completeText(runtime, {
          system: `${options.system}\n\n## 输出格式\n只输出一个 JSON 对象。不要输出 markdown 代码块，不要输出任何解释文字。\n必须满足下面这份 JSON Schema：\n${schemaText}`,
          user,
          images: options.images,
          temperature: options.temperature ?? 0.2,
          maxTokens: options.maxTokens,
        })

    const parsed = extractJson(text)
    if (parsed === undefined) {
      feedback = `输出不是合法 JSON。实际输出（截断）：${text.slice(0, 400)}`
      lastError = feedback
      continue
    }

    const result = validate(options.schema, parsed)
    if (!result.ok) {
      feedback = `JSON 结构不匹配：${result.errors.join('；')}。实际输出：${JSON.stringify(parsed).slice(0, 600)}`
      lastError = feedback
      continue
    }

    return parsed as T
  }

  throw new Error(`${options.schemaName} 生成失败：${lastError || '模型没有返回有效结果'}`)
}

export async function completeText(
  runtime: LlmRuntime,
  options: {
    system: string
    user: string
    images?: ImageContent[]
    temperature?: number
    maxTokens?: number
  },
): Promise<string> {
  const content = options.images?.length
    ? [{ type: 'text' as const, text: options.user }, ...options.images]
    : options.user

  const message = await runtimeModels.completeSimple(
    runtime.model,
    {
      systemPrompt: options.system,
      messages: [{ role: 'user', content, timestamp: Date.now() }],
    },
    {
      apiKey: runtime.apiKey,
      signal: runtime.signal,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    },
  )

  if (message.stopReason === 'error') {
    throw new Error(message.errorMessage || '模型请求失败')
  }
  return collectText(message.content)
}

/** 流式文本：逐字回调，返回完整文本。用于闲聊/解释类回答，也用于最终的总结语。 */
export async function streamText(
  runtime: LlmRuntime,
  options: { system: string; user: string; images?: ImageContent[]; maxTokens?: number },
  onDelta: (delta: string) => void,
): Promise<string> {
  if (isMockMode()) {
    const text = mockTextReply(options.user)
    // 模拟分片，前端能验证流式渲染
    for (const piece of splitChunks(text, 8)) {
      onDelta(piece)
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
    return text
  }

  const content = options.images?.length
    ? [{ type: 'text' as const, text: options.user }, ...options.images]
    : options.user

  const stream = runtimeModels.streamSimple(
    runtime.model,
    { systemPrompt: options.system, messages: [{ role: 'user', content, timestamp: Date.now() }] },
    { apiKey: runtime.apiKey, signal: runtime.signal, maxTokens: options.maxTokens },
  )

  let text = ''
  let errorMessage = ''
  for await (const event of stream) {
    if (event.type === 'text_delta') {
      text += event.delta
      onDelta(event.delta)
    } else if (event.type === 'done') {
      if (event.message.stopReason === 'error') errorMessage = event.message.errorMessage || ''
      const finalText = collectText(event.message.content)
      if (finalText && finalText !== text) {
        // 极少数 provider 的 delta 不完整，用最终消息兜底
        if (finalText.length > text.length) onDelta(finalText.slice(text.length))
        text = finalText
      }
    } else if (event.type === 'error') {
      errorMessage = event.error.errorMessage || '模型请求失败'
    }
  }
  if (errorMessage && !text) throw new Error(errorMessage)
  return text
}

/** 模型层面的致命错误（鉴权/配额/网络），换一种写法重试也没用 */
export function isFatalModelError(error: unknown): boolean {
  const message = String((error as any)?.message || (error as any)?.statusMessage || '')
  return /AccessDenied|Unpurchased|no permission|invalid api key|Unauthorized|quota|rate.?limit|402|403|401|ECONNREFUSED|ENOTFOUND|fetch failed/i.test(
    message,
  )
}

/** 把供应商的原始报错翻成对用户有意义的一句话 */
export function friendlyModelError(error: unknown): string {
  const message = String((error as any)?.message || (error as any)?.statusMessage || '模型调用失败')
  if (/AccessDenied|Unpurchased|no permission/i.test(message)) {
    return '模型服务拒绝访问（配额或权限不足），请检查 NUXT_AI_MODEL 是否已开通'
  }
  if (/401|Invalid api key|Unauthorized/i.test(message)) {
    return '模型鉴权失败，请检查 NUXT_AI_API_KEY'
  }
  if (/402|quota|余额/i.test(message)) {
    return '模型额度不足，请充值或更换模型'
  }
  if (/ECONNREFUSED|ENOTFOUND|fetch failed|timeout/i.test(message)) {
    return '无法连接模型服务，请检查 NUXT_AI_BASE_URL 与网络'
  }
  return message
}

/** mock 模式下的结构化返回；NUXT_AI_MOCK_DELAY_MS 用于模拟真实模型的延迟（测试取消/回滚） */
async function mockComplete(options: JsonCallOptions): Promise<string> {
  const delay = Number(process.env.NUXT_AI_MOCK_DELAY_MS || 0)
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))
  return mockJsonText({
    schemaName: options.schemaName,
    system: options.system,
    user: options.user,
  })
}

function collectText(content: { type: string }[]): string {
  return content
    .filter((part) => part.type === 'text')
    .map((part) => (part as { text?: string }).text || '')
    .join('')
}

function splitChunks(text: string, size: number): string[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size))
  return chunks
}

/**
 * 从模型输出里挖出 JSON。
 * 即使提示词要求"只输出 JSON"，实际仍会遇到 ```json 包裹、前后带一句解释、
 * 结尾多一个逗号等情况，这里逐级降级处理。
 */
export function extractJson(text: string): unknown {
  const trimmed = String(text || '').trim()
  if (!trimmed) return undefined

  const candidates: string[] = []
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) candidates.push(fenced[1].trim())
  candidates.push(trimmed)
  const balanced = sliceBalancedObject(trimmed)
  if (balanced) candidates.push(balanced)

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate)
    } catch {
      // 再试一次宽松修复
    }
    try {
      return parseJsonWithRepair(candidate)
    } catch {
      // 继续下一个候选
    }
  }
  return undefined
}

/** 扫描出第一个完整的 {...}，跳过字符串里的花括号 */
function sliceBalancedObject(text: string): string | undefined {
  const start = text.indexOf('{')
  if (start === -1) return undefined
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i++) {
    const char = text[i]!
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') inString = true
    else if (char === '{') depth++
    else if (char === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return undefined
}
