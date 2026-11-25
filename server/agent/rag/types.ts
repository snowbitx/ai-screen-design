export interface RagChunk {
  id: string
  /** 文档标题（## 二级标题） */
  title: string
  /** 来源文件，如 02-grid.md */
  source: string
  text: string
  /** BM25 需要：词频与长度 */
  tf: Record<string, number>
  length: number
}

export interface RagIndex {
  version: number
  builtAt: string
  /** 建库时使用的检索模式：bm25 或 embedding（向量可用时） */
  mode: 'bm25' | 'embedding'
  embeddingModel?: string
  chunks: RagChunk[]
  /** 文档频率，用于 idf */
  df: Record<string, number>
  avgLength: number
  /** 与 chunks 一一对应的向量，仅 embedding 模式存在 */
  vectors?: number[][]
}
