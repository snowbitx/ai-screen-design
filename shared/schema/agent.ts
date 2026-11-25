import type { MaterialDefinition } from './material.ts'
import type { PageSchema } from './page.ts'

/** 参考图：base64（不带 data: 前缀）+ mimeType */
export interface AgentImageInput {
  data: string
  mimeType: string
}

export interface AgentChatHistoryItem {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentChatRequest {
  message: string
  page: PageSchema
  history?: AgentChatHistoryItem[]
  /** 当前编辑器选中的节点，AI 说"这个/选中的"时用它定位 */
  selectedNodeIds?: string[]
  /** 参考图，需要模型支持视觉输入 */
  images?: AgentImageInput[]
  /** 前端本次运行时的物料目录快照，服务端优先使用它建节点（前后端物料可能不同步） */
  materials?: MaterialDefinition[]
  /** 运行模式：plan=先规划再执行（默认），direct=单轮自主工具循环 */
  mode?: 'plan' | 'direct'
}

/** 意图分类结果，决定走对话还是走任务规划 */
export type AgentIntent =
  | 'chat'
  | 'create'
  | 'modify'
  | 'layout'
  | 'data'
  | 'event'
  | 'chart'
  | 'page'
  | 'canvas'

/** 任务类型决定用哪个执行节点 */
export type AgentTaskType = 'node' | 'chart' | 'data' | 'bind' | 'event' | 'canvas' | 'page'

export interface AgentPlanTask {
  /** 计划内唯一 id，如 t1、t2 */
  id: string
  /** 展示给用户的任务名，如「创建销售数据源」 */
  name: string
  type: AgentTaskType
  /** 依赖的任务 id，必须等它们完成 */
  dependsOn: string[]
  /** 交给执行节点的自然语言指令，可引用 ${t1.nodeId} / ${t1.dataSourceId} */
  instruction: string
}

export interface AgentPlan {
  /** 一句话概述这次要做什么 */
  summary: string
  tasks: AgentPlanTask[]
}

export type AgentRunStage = 'classify' | 'plan' | 'execute' | 'summarize'

export type AgentTaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped'

/**
 * Agent 流式事件协议（SSE 的 event 名与 type 一致）。
 * 前端按事件增量渲染：阶段 → 意图 → 计划 → 任务进度 → 正文/工具 → 页面 → 结束。
 */
export type AgentStreamEvent =
  | { type: 'run_start'; runId: string }
  | { type: 'stage'; stage: AgentRunStage }
  | { type: 'intent'; intent: AgentIntent; reason: string; skills?: string[] }
  | { type: 'plan'; summary: string; tasks: AgentPlanTask[] }
  | {
      type: 'task'
      id: string
      status: AgentTaskStatus
      name?: string
      error?: string
      actions?: number
    }
  | { type: 'progress'; done: number; total: number }
  | { type: 'text'; delta: string }
  | {
      type: 'tool'
      phase: 'start' | 'end'
      name: string
      label?: string
      ok?: boolean
      /** 任务 id，前端可把工具调用归到某个任务下 */
      taskId?: string
      summary?: string
    }
  | { type: 'action'; action: string; taskId?: string }
  | { type: 'page'; page: PageSchema }
  | { type: 'rollback'; page: PageSchema; reason: string }
  | { type: 'done'; reply: string; actions: string[]; aborted: boolean; intent?: AgentIntent }
  | { type: 'error'; message: string }

export interface AgentRunResult {
  reply: string
  actions: string[]
  page: PageSchema
  aborted: boolean
  intent?: AgentIntent
  plan?: AgentPlan
}
