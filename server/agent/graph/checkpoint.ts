import type { PageSchema } from '@shared/schema/page.ts'
import type { AgentPlan } from '@shared/schema/agent.ts'

/**
 * 运行级检查点。
 *
 * 课程里的 checkpointer 是给 LangGraph 用的持久化状态；这里是一个轻量等价物：
 * 每次 run 记下入口页面快照 + 计划 + 当前任务下标，用于
 * 1) 取消/失败时回滚到 run 前；
 * 2) 需要时按 runId 排查"第几项任务把页面改坏了"。
 *
 * 生产环境应换成持久化存储（SQLite/Postgres），进程重启后仍能恢复。
 */
export interface RunCheckpoint {
  runId: string
  createdAt: number
  updatedAt: number
  snapshot: PageSchema
  plan?: AgentPlan
  currentTaskIndex: number
  status: 'running' | 'done' | 'aborted' | 'failed'
}

const MAX_CHECKPOINTS = 50
const checkpoints = new Map<string, RunCheckpoint>()

export function createCheckpoint(runId: string, snapshot: PageSchema): RunCheckpoint {
  const now = Date.now()
  const checkpoint: RunCheckpoint = {
    runId,
    createdAt: now,
    updatedAt: now,
    snapshot: JSON.parse(JSON.stringify(snapshot)),
    currentTaskIndex: -1,
    status: 'running',
  }
  checkpoints.set(runId, checkpoint)
  pruneCheckpoints()
  return checkpoint
}

export function updateCheckpoint(
  runId: string,
  patch: Partial<Pick<RunCheckpoint, 'plan' | 'currentTaskIndex' | 'status'>>,
): void {
  const checkpoint = checkpoints.get(runId)
  if (!checkpoint) return
  Object.assign(checkpoint, patch, { updatedAt: Date.now() })
}

export function getCheckpoint(runId: string): RunCheckpoint | undefined {
  return checkpoints.get(runId)
}

/** 取快照的深拷贝，避免调用方把检查点里的对象改掉 */
export function checkpointSnapshot(runId: string): PageSchema | undefined {
  const checkpoint = checkpoints.get(runId)
  return checkpoint ? JSON.parse(JSON.stringify(checkpoint.snapshot)) : undefined
}

function pruneCheckpoints() {
  if (checkpoints.size <= MAX_CHECKPOINTS) return
  const sorted = [...checkpoints.values()].sort((a, b) => a.updatedAt - b.updatedAt)
  for (const item of sorted.slice(0, checkpoints.size - MAX_CHECKPOINTS)) {
    checkpoints.delete(item.runId)
  }
}
