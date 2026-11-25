import { ragIndex } from './index.generated.ts'
import { tokenize } from './tokenize.ts'
import type { RagChunk, RagIndex } from './types.ts'
import { cosineSimilarity, embedTexts, type EmbeddingConfig } from './embedding.ts'

const K1 = 1.2
const B = 0.75

export interface RagSearchOptions {
  topK?: number
  /** 传了就走向量检索，没传或失败退回 BM25 */
  embedding?: EmbeddingConfig
  signal?: AbortSignal
}

function bm25(index: RagIndex, query: string, topK: number): { chunk: RagChunk; score: number }[] {
  const queryTerms = [...new Set(tokenize(query))]
  if (!queryTerms.length) return []
  const total = index.chunks.length
  const avgLength = index.avgLength || 1

  return index.chunks
    .map((chunk) => {
      let score = 0
      for (const term of queryTerms) {
        const df = index.df[term] || 0
        if (!df) continue
        const tf = chunk.tf[term] || 0
        if (!tf) continue
        // 加 0.5 平滑，避免全体命中的词权重为 0
        const idf = Math.log(1 + (total - df + 0.5) / (df + 0.5))
        const norm = tf + K1 * (1 - B + (B * chunk.length) / avgLength)
        score += idf * ((tf * (K1 + 1)) / norm)
      }
      return { chunk, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

/**
 * ECharts 配置知识检索。
 * 默认混合策略：有向量用余弦，没有就用 BM25；两者都拿不到时返回空数组，
 * 由调用方决定"没检索到"怎么提示模型。
 */
export async function searchEchartsDocs(
  query: string,
  options: RagSearchOptions = {},
): Promise<RagChunk[]> {
  const topK = options.topK ?? 4

  if (ragIndex.vectors?.length === ragIndex.chunks.length && options.embedding) {
    const [vector] = (await embedTexts([query], options.embedding, options.signal)) || []
    if (vector) {
      return ragIndex.chunks
        .map((chunk, index) => ({
          chunk,
          score: cosineSimilarity(vector, ragIndex.vectors![index] || []),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map((item) => item.chunk)
    }
  }

  return bm25(ragIndex, query, topK).map((item) => item.chunk)
}

/** 把检索结果拼成给模型的上下文；按字符预算截断，防止挤爆提示词 */
export function formatRagChunks(chunks: RagChunk[], maxChars = 2600): string {
  if (!chunks.length) return ''
  let used = 0
  const parts: string[] = []
  for (const chunk of chunks) {
    const block = `### ${chunk.title}（${chunk.source}）\n${chunk.text}`
    if (used + block.length > maxChars && parts.length) break
    parts.push(block)
    used += block.length
  }
  return parts.join('\n\n')
}

export function ragIndexStats() {
  return {
    chunks: ragIndex.chunks.length,
    mode: ragIndex.mode,
    builtAt: ragIndex.builtAt,
    embeddingModel: ragIndex.embeddingModel,
    hasVectors: Boolean(ragIndex.vectors?.length),
  }
}
