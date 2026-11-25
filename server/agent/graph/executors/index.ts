import type { AgentTool } from '@earendil-works/pi-agent-core'
import { createEchartsRagTool } from '../../rag/tool.ts'
import { formatRagChunks, searchEchartsDocs } from '../../rag/store.ts'
import { collectSkillBodies, createSkillTool } from '../../skills/index.ts'
import type { AgentState, TaskNodeState } from '../state.ts'
import { runTaskAgent, type TaskOutcome } from './base.ts'
import { executePageTask } from './page.ts'

const CHART_TASK_HINT = `## 图表任务要点
1. 先 add_node 建图表（grid 定位），拿到返回的 id。
2. 再用 update_node_props 写 option 增量：至少要有 series[0].encode 和 dataset.source（或绑定数据源）。
3. 深色画布必须显式设置轴标签、分割线、标题的颜色，否则默认黑字看不见。
4. 不确定某个配置项时，用 search_echarts_docs 查一次，别凭记忆写。`

const DATA_TASK_HINT = `## 数据源任务要点
- 数据结构：{ type: 'static' | 'api', id, name, data, url?, interval?, method?, responsePath?, params? }
- static：data 直接写对象数组，字段名要和消费它的图表 encode 一致（label/value 最通用）。
- api：必须给 url，演示用 /api/data（返回 [{label,value}]）；interval 是轮询毫秒，常用 3000~10000。
- 返回值包在 data.list 里时用 responsePath: 'data.list'。`

const BIND_TASK_HINT = `## 绑定任务要点
- 用 bind_data_source 把数据源绑到组件，nodeId 与 dataSourceId 都必须来自依赖产物，不要猜。
- 绑定后组件的 dataset.source 会被数据源数据覆盖，option 里保留 encode 即可。
- 如果指令里的 id 没被替换，说明前序任务失败，直接说明原因，不要创建新数据源顶替。`

const EVENT_TASK_HINT = `## 事件任务要点
- 用 set_node_event 写事件，type 取物料支持的 click / dblclick / vnodeMounted。
- code 里只能调用 context 上的 API，不要用 window、document、fetch。
- 跨组件联动：先 dispatch(目标id, 事件名, payload)，目标组件要有同名事件。
- 刷新数据：refreshNodesByDataId(数据源id) 或 trigger(组件id, 'refresh')。`

const CANVAS_TASK_HINT = `## 画布任务要点
- 用 set_canvas 改尺寸或背景色，只改用户提到的字段。
- 常见尺寸：1920x1080（默认）、2560x1440、3840x2160。改尺寸后原有组件坐标不会自动缩放，需要时用 arrange_grid 重排。`

/** 按任务类型分发到对应执行节点 */
export async function executeTask(
  state: AgentState,
  taskNode: TaskNodeState,
): Promise<TaskOutcome> {
  const { task } = taskNode

  if (task.type === 'page') return executePageTask(state, taskNode)

  const extras: string[] = []
  const tools: AgentTool<any>[] = [createSkillTool()]

  const skills = collectSkillBodies(state.skills)
  if (skills) extras.push(`## 设计规范（已加载）\n${skills}`)

  if (task.type === 'chart') {
    tools.push(createEchartsRagTool(state.llm.embedding))
    // 先自动检索一次，省掉一轮工具往返；模型仍可再调 search_echarts_docs 细化
    const chunks = await searchEchartsDocs(`${task.instruction} ${state.message}`, {
      topK: 3,
      embedding: state.llm.embedding,
      signal: state.llm.signal,
    })
    const context = formatRagChunks(chunks, 1800)
    if (context) extras.push(`## ECharts 参考文档（自动检索）\n${context}`)
    extras.push(CHART_TASK_HINT)
  }

  if (task.type === 'data') extras.push(DATA_TASK_HINT)
  if (task.type === 'bind') extras.push(BIND_TASK_HINT)
  if (task.type === 'event') extras.push(EVENT_TASK_HINT)
  if (task.type === 'canvas') extras.push(CANVAS_TASK_HINT)

  return runTaskAgent(state, taskNode, { tools, extras })
}

export { runTaskAgent } from './base.ts'
export type { TaskOutcome } from './base.ts'
