/**
 * 轻量分词：ASCII 词 + 中文单字 + 中文二元组。
 * 不引第三方分词器，够用且建库/检索两边行为完全一致
 * （建库脚本 scripts/build-rag.ts 也 import 这个文件）。
 */
export function tokenize(text: string): string[] {
  const lower = String(text || '').toLowerCase()
  const tokens: string[] = []

  for (const match of lower.matchAll(/[a-z0-9]+(?:[._-][a-z0-9]+)*/g)) {
    tokens.push(match[0])
  }

  for (const segment of lower.match(/[\u4e00-\u9fa5]+/g) || []) {
    for (let i = 0; i < segment.length; i++) {
      tokens.push(segment[i]!)
      if (i + 1 < segment.length) tokens.push(segment.slice(i, i + 2))
    }
  }

  return tokens
}

export function termFrequency(tokens: string[]): Record<string, number> {
  const tf: Record<string, number> = {}
  for (const token of tokens) tf[token] = (tf[token] || 0) + 1
  return tf
}
