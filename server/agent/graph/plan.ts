import type { AgentPlan, AgentPlanTask, AgentTaskType } from '@shared/schema/agent.ts'
import { PlanJson } from '../spec/index.ts'
import { describeMaterials } from '../materials.ts'
import { schemaBlock } from '../prompt.ts'
import { describeSkills } from '../skills/index.ts'
import { completeJson } from './llm.ts'
import { describePage, type AgentState } from './state.ts'

const TASK_TYPES = ['node', 'chart', 'data', 'bind', 'event', 'canvas', 'page'] as const

export const PLANNER_SYSTEM = `你是大屏编辑器的任务规划器。把用户的自然语言需求拆成可执行的任务列表，不直接改画布。

## 任务类型
- node：添加/删除/改属性/改样式/移动组件（除图表 option 以外的一切组件操作）
- chart：添加图表或修改图表 option（ECharts 配置）
- data：新建或修改数据源
- bind：把数据源绑定到组件
- event：为组件生成或删除交互事件
- canvas：画布尺寸/背景
- page：整页生成（用户要"一整套大屏"时用，最多出现一次且必须是唯一任务）

## 拆分规则
1. 有依赖就分开建：先建数据源（data），再建图表（chart），最后绑定（bind），不要塞进同一个任务。
2. 依赖顺序体现在 dependsOn 上，没依赖的任务会并行执行，所以只写真实依赖。
3. 一个任务只做一件事；改 3 个组件可以是 1~3 个任务，但同一批的独立性要准确。
4. 任务数控制在 1~6 个，超过说明需求拆分过细。
5. 只有确实需要整页生成时才用 page；其余情况用具体类型，便于局部回滚。

## 引用前序产物
instruction 里需要用到前序任务生成的 id 时，用占位符：
- \${t1.nodeId}：t1 创建的第一个组件 id
- \${t1.dataSourceId}：t1 创建的第一个数据源 id
执行器会在运行时替换成真实 id。绝不要自己编造 id。

## 可用任务类型
${TASK_TYPES.join(' / ')}

## 可用物料
${describeMaterials()}

${schemaBlock()}

## 可用 Skill
${describeSkills()}`

export async function buildPlan(state: AgentState): Promise<AgentPlan> {
  const plan = await completeJson<AgentPlan>(state.llm, {
    system: PLANNER_SYSTEM,
    schemaName: 'plan',
    user: `## 用户需求
${state.message}

## 意图
${state.intent}（${state.intentReason || ''}）

## 当前画布
${describePage(state)}`,
    schema: PlanJson,
    temperature: 0.2,
    maxTokens: 2000,
  })

  return normalizePlan(plan)
}

/** 语义校验与纠偏：id 唯一、依赖存在且只指向更早的任务、任务数收敛 */
export function normalizePlan(plan: AgentPlan): AgentPlan {
  const tasks: AgentPlanTask[] = []
  const seen = new Set<string>()

  plan.tasks.slice(0, 8).forEach((task, index) => {
    const id = String(task.id || `t${index + 1}`)
    if (seen.has(id)) return
    seen.add(id)
    tasks.push({
      id,
      name: String(task.name || `任务 ${index + 1}`),
      type: (TASK_TYPES.includes(task.type as AgentTaskType) ? task.type : 'node') as AgentTaskType,
      // 只保留指向更早任务的依赖：跨阶段的依赖无法保证顺序，调度器会死等
      dependsOn: (task.dependsOn || []).filter((dep) => seen.has(dep) && dep !== id),
      instruction: String(task.instruction || task.name || ''),
    })
  })

  // 整页任务必须独占，否则和局部任务并发会互相覆盖
  if (tasks.some((task) => task.type === 'page') && tasks.length > 1) {
    const pageTask = tasks.find((task) => task.type === 'page')!
    return { summary: plan.summary, tasks: [{ ...pageTask, dependsOn: [] }] }
  }

  return { summary: plan.summary || '按需求调整页面', tasks }
}

/** 计划里所有任务声明的依赖是否都能满足（调试/日志用） */
export function planDependenciesSatisfied(tasks: AgentPlanTask[]): boolean {
  const done = new Set<string>()
  for (const task of tasks) {
    if (task.dependsOn.some((dep) => !done.has(dep))) return false
    done.add(task.id)
  }
  return true
}
