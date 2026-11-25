export interface EmbeddingConfig {
  baseUrl?: string
  apiKey?: string
  model?: string
}

/**
 * OpenAI 兼容的 embeddings 调用。
 *
 * pi-ai 只提供 chat 与图片生成，没有 embedding 接口，所以向量化单独走
 * `/embeddings`。网关不支持 / 没配额时返回 null，检索层自动退回 BM25，
 * 不影响主流程——RAG 是增强，不该成为单点故障。
 */
export async function embedTexts(
  texts: string[],
  config: EmbeddingConfig,
  signal?: AbortSignal,
): Promise<number[][] | null> {
  const baseUrl = (config.baseUrl || process.env.NUXT_AI_BASE_URL || '').replace(/\/$/, '')
  const apiKey = config.apiKey || process.env.NUXT_AI_API_KEY
  const model = config.model || process.env.NUXT_AI_EMBED_MODEL
  if (!baseUrl || !apiKey || !model || !texts.length) return null

  try {
    const response = await fetch(`${baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input: texts }),
      signal,
    })
    if (!response.ok) return null
    const payload: any = await response.json()
    const data = Array.isArray(payload?.data) ? payload.data : []
    const vectors = data
      .sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0))
      .map((item: any) => item.embedding)
    if (vectors.length !== texts.length || !Array.isArray(vectors[0])) return null
    return vectors as number[][]
  } catch {
    return null
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length)
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < length; i++) {
    dot += a[i]! * b[i]!
    normA += a[i]! * a[i]!
    normB += b[i]! * b[i]!
  }
  if (!normA || !normB) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}
