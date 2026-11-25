import { validatePageSemantics } from '../spec/validate.ts'
import { applyPatch, diffPage, isPatchEmpty, sanitizePatch, type PagePatch } from './patch.ts'
import { markTask, type AgentState, type TaskArtifacts, type TaskNodeState } from './state.ts'
import { executeTask } from './executors/index.ts'

export interface ScheduleOptions {
  /** 同一批里最多并行几个任务 */
  maxParallel?: number
}

interface TaskRunResult {
  node: TaskNodeState
  patch: PagePatch
  actions: string[]
  artifacts: TaskArtifacts
  error?: string
}

/**
 * 依赖感知的任务调度器。
 *
 * 每一轮：
 * 1. 找出依赖全部完成的任务（ready）与依赖失败的（skip）；
 * 2. ready 里的任务并行执行，各自在页面副本上产出 patch；
 * 3. 按计划顺序合并 patch，写回 state.page 并通知前端增量刷新；
 * 4. 全部完成后结束，中途允许 abort。
 */
export async function runPlan(state: AgentState, options: ScheduleOptions = {}): Promise<void> {
  const maxParallel = Math.max(1, options.maxParallel ?? 3)
  const done = new Set<string>()
  const failed = new Set<string>()

  while (true) {
    if (state.aborted) return

    const ready: TaskNodeState[] = []
    for (const node of state.tasks) {
      if (node.status !== 'pending') continue
      const deps = node.task.dependsOn
      if (deps.some((dep) => failed.has(dep))) {
        markTask(state, node, 'skipped', { error: '依赖任务失败' })
        failed.add(node.task.id)
        continue
      }
      if (deps.every((dep) => done.has(dep))) ready.push(node)
    }

    if (!ready.length) return

    const batch = ready.slice(0, maxParallel)
    const base = JSON.parse(JSON.stringify(state.page))
    for (const node of batch) markTask(state, node, 'running')

    const results = await runWithConcurrency(batch, maxParallel, async (node) => {
      state.currentTaskIndex = node.index
      try {
        const outcome = await executeTask(state, node)
        return {
          node,
          patch: diffPage(base, outcome.page),
          actions: outcome.actions,
          artifacts: outcome.artifacts,
        } satisfies TaskRunResult
      } catch (error: any) {
        return {
          node,
          patch: diffPage(base, base),
          error: error?.message || '任务执行失败',
          actions: [],
          artifacts: { nodeIds: [], dataSourceIds: [] },
        } satisfies TaskRunResult
      }
    })

    // 取消后不再合并任何结果：页面上已下发的部分由 rollback 恢复
    if (state.aborted) return

    // 按计划顺序合并，保证结果可复现
    for (const result of results.sort((a, b) => a.node.index - b.node.index)) {
      const { node } = result
      if (result.error) {
        markTask(state, node, 'failed', { error: result.error })
        failed.add(node.task.id)
        continue
      }

      if (!isPatchEmpty(result.patch)) {
        const { patch, warnings } = sanitizePatch(result.patch)
        applyPatch(state.page, patch)
        const problems = [...warnings, ...validatePageSemantics(state.page)]
        if (problems.length) {
          // 结构/语义问题不阻断（页面还能用），但要留痕并让前端看到
          node.error = problems.join('；')
        }
      }

      node.actions = result.actions
      node.artifacts = result.artifacts
      state.actions.push(...result.actions)
      for (const action of result.actions) {
        state.emit({ type: 'action', action, taskId: node.task.id })
      }

      markTask(state, node, 'done', { actions: result.actions.length })
      done.add(node.task.id)

      // 每合并完一个任务就下发一次页面，用户能看到"逐项落地"
      state.emit({ type: 'page', page: state.page })
    }
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = Array.from({ length: items.length })
  let cursor = 0

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = cursor++
      if (index >= items.length) return
      results[index] = await worker(items[index]!)
    }
  })

  await Promise.all(runners)
  return results
}
