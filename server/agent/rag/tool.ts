import { Type } from 'typebox'
import type { AgentTool } from '@earendil-works/pi-agent-core'
import { formatRagChunks, searchEchartsDocs } from './store.ts'
import type { EmbeddingConfig } from './embedding.ts'

/**
 * 把 ECharts 知识库封装成 Agent 可调用的 Tool。
 * 和"直接把全部文档塞进提示词"相比，这里是按需检索：只在模型不确定字段名、
 * 或需要确认某个配置项的合法取值时才查，省 token 也避免无关文档干扰。
 */
export function createEchartsRagTool(embedding?: EmbeddingConfig): AgentTool<any> {
  return {
    name: 'search_echarts_docs',
    label: '检索 ECharts 配置文档',
    description:
      '检索 ECharts 官方配置知识库，返回相关配置项说明与常见错误。写图表 option 前如果对字段名/取值不确定，先查一次；query 用中文描述你要解决的问题，比如「柱状图柱子太挤」「饼图怎么映射字段」。',
    parameters: Type.Object({
      query: Type.String({ description: '检索问题，中文自然语言' }),
      topK: Type.Optional(Type.Number({ description: '返回几条，默认 3' })),
    }),
    execute: async (_id: string, params: any) => {
      const chunks = await searchEchartsDocs(String(params.query || ''), {
        topK: Math.min(5, Math.max(1, Number(params.topK) || 3)),
        embedding,
      })
      if (!chunks.length) {
        return {
          content: [{ type: 'text', text: '知识库没有命中相关条目，请按现有物料默认配置改写。' }],
          details: { count: 0 },
        }
      }
      return {
        content: [
          {
            type: 'text',
            text: formatRagChunks(chunks),
          },
        ],
        details: { count: chunks.length, sources: chunks.map((chunk) => chunk.source) },
      }
    },
  }
}
