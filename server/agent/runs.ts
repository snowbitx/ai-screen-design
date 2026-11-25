/**
 * 运行注册表：记录正在跑的 run 对应的 AbortController。
 *
 * 为什么需要它：用户点"停止"时，如果前端直接 abort fetch，SSE 连接就断了，
 * 服务端算出来的"回滚完成"再也发不回浏览器。所以取消走独立接口，
 * 让服务端有机会先把 rollback 事件推完，再关流。
 */
interface ActiveRun {
  controller: AbortController
  createdAt: number
}

const activeRuns = new Map<string, ActiveRun>()
const MAX_IDLE_MS = 10 * 60 * 1000

export function registerRun(runId: string, controller: AbortController): void {
  activeRuns.set(runId, { controller, createdAt: Date.now() })
  prune()
}

export function cancelRun(runId: string): boolean {
  const run = activeRuns.get(runId)
  if (!run) return false
  run.controller.abort()
  return true
}

export function unregisterRun(runId: string): void {
  activeRuns.delete(runId)
}

export function activeRunCount(): number {
  return activeRuns.size
}

function prune() {
  const now = Date.now()
  for (const [runId, run] of activeRuns) {
    if (now - run.createdAt > MAX_IDLE_MS) activeRuns.delete(runId)
  }
}
