/**
 * ECharts 配置知识库建库脚本。
 *
 *   pnpm rag:build
 *
 * 1. 读 server/agent/rag/corpus/*.md，按 `## 二级标题` 切块；
 * 2. 计算 TF / DF / 平均长度（BM25 需要）；
 * 3. 配置了 NUXT_AI_EMBED_MODEL 时顺便算向量（失败自动退回 BM25）；
 * 4. 产出 server/agent/rag/index.generated.ts（运行时直接 import，避免读文件）。
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tokenize, termFrequency } from '../server/agent/rag/tokenize.ts'
import { embedTexts } from '../server/agent/rag/embedding.ts'
import type { RagChunk, RagIndex } from '../server/agent/rag/types.ts'

const here = dirname(fileURLToPath(import.meta.url))
const corpusDir = join(here, '../server/agent/rag/corpus')
const outputFile = join(here, '../server/agent/rag/index.generated.ts')

interface RawDoc {
  title: string
  source: string
  text: string
}

async function loadCorpus(): Promise<RawDoc[]> {
  const files = (await readdir(corpusDir)).filter((file) => file.endsWith('.md')).sort()
  const docs: RawDoc[] = []

  for (const file of files) {
    const content = await readFile(join(corpusDir, file), 'utf8')
    const lines = content.split('\n')
    const docTitle = (lines.find((line) => line.startsWith('# ')) || '').replace(/^#\s*/, '').trim()

    const fallbackTitle = docTitle || file.replace(/^\d+-|\.md$/g, '')
    let currentSection = ''
    let buffer: string[] = []
    const flush = () => {
      const text = buffer.join('\n').trim()
      // 块标题带上前缀文档名，检索结果单看标题也能知道上下文
      const title = currentSection ? `${fallbackTitle} › ${currentSection}` : fallbackTitle
      if (text) docs.push({ title, source: file, text })
      buffer = []
    }

    for (const line of lines) {
      if (line.startsWith('## ')) {
        flush()
        currentSection = line.replace(/^##\s*/, '').trim()
        continue
      }
      if (line.startsWith('# ')) continue
      buffer.push(line)
    }
    flush()
  }

  return docs
}

async function main() {
  const docs = await loadCorpus()
  if (!docs.length) throw new Error(`没有找到语料，检查 ${corpusDir}`)

  const chunks: RagChunk[] = docs.map((doc, index) => {
    const tokens = tokenize(`${doc.title} ${doc.text}`)
    return {
      id: `c${String(index + 1).padStart(3, '0')}`,
      title: doc.title,
      source: doc.source,
      text: doc.text,
      tf: termFrequency(tokens),
      length: tokens.length,
    }
  })

  const df: Record<string, number> = {}
  for (const chunk of chunks) {
    for (const term of Object.keys(chunk.tf)) df[term] = (df[term] || 0) + 1
  }
  const avgLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0) / chunks.length

  const index: RagIndex = {
    version: 1,
    builtAt: new Date().toISOString(),
    mode: 'bm25',
    chunks,
    df,
    avgLength: Number(avgLength.toFixed(2)),
  }

  const embeddingModel = process.env.NUXT_AI_EMBED_MODEL
  if (embeddingModel) {
    const vectors: number[][] = []
    for (let i = 0; i < chunks.length; i += 16) {
      const batch = chunks.slice(i, i + 16)
      const result = await embedTexts(
        batch.map((chunk) => `${chunk.title}\n${chunk.text}`),
        { model: embeddingModel },
      )
      if (!result) {
        console.warn(`[rag] embedding 调用失败，退回 BM25（模型 ${embeddingModel}）`)
        vectors.length = 0
        break
      }
      vectors.push(...result)
    }
    if (vectors.length === chunks.length) {
      index.mode = 'embedding'
      index.embeddingModel = embeddingModel
      index.vectors = vectors.map((vector) =>
        // 保留 5 位小数，减小产物体积
        vector.map((value) => Number(value.toFixed(5))),
      )
    }
  }

  const banner = `// 该文件由 scripts/build-rag.ts 生成，请勿手工编辑。\n// 语料：server/agent/rag/corpus/*.md\nimport type { RagIndex } from './types.ts'\n\nexport const ragIndex: RagIndex = `
  await writeFile(outputFile, `${banner}${JSON.stringify(index, null, 2)}\n`, 'utf8')

  const size = JSON.stringify(index).length
  console.log(
    `[rag] 建库完成：${chunks.length} 块 / ${Object.keys(df).length} 词 / 模式 ${index.mode} / 约 ${(size / 1024).toFixed(0)}KB`,
  )
}

await main()
