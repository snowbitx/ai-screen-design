import type { AssistantMessage, Context, Model } from '@earendil-works/pi-ai'
import {
  fauxAssistantMessage,
  fauxProvider,
  fauxToolCall,
  type FauxProviderHandle,
} from '@earendil-works/pi-ai/providers/faux'

/**
 * 离线 Mock 模式（NUXT_AI_MOCK=1）。
 *
 * 用途：模型网关不可用 / 没配额时，仍然能把「意图 → 计划 → 调度 → 执行 → 进度」
 * 整条链路跑通并回归测试。它不是假能力：走的是真实的 pi Agent 循环、真实的工具
 * 执行和 patch 合并，只是把"模型说什么"换成了确定性脚本。
 *
 * 生产环境不要打开。
 */
export function isMockMode(): boolean {
  return process.env.NUXT_AI_MOCK === '1'
}

let handle: FauxProviderHandle | null = null

export function createMockModel(models: { setProvider: (provider: any) => void }): Model<any> {
  if (!handle) {
    handle = fauxProvider({ provider: 'mock', models: [{ id: 'mock-model' }] })
    models.setProvider(handle.provider)
    // faux 是固定队列，且并行任务会同时出队：预置足够多的脚本，
    // 每个出队时按 context 现算，等价于"无限脚本"。
    handle.setResponses(Array.from({ length: 500 }, () => mockResponse))
  }
  return handle.getModel()
}

function systemOf(context: Context): string {
  return context.systemPrompt || ''
}

function lastUserText(context: Context): string {
  for (let i = context.messages.length - 1; i >= 0; i--) {
    const message: any = context.messages[i]
    if (message.role === 'user') {
      if (typeof message.content === 'string') return message.content
      const text = (message.content || [])
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join('')
      return text
    }
  }
  return ''
}

function lastToolResult(context: Context): string {
  const message: any = context.messages[context.messages.length - 1]
  if (message?.role !== 'toolResult') return ''
  return (message.content || [])
    .filter((part: any) => part.type === 'text')
    .map((part: any) => part.text)
    .join('')
}

function mockResponse(context: Context): AssistantMessage {
  const system = systemOf(context)
  const user = lastUserText(context)

  if (system.includes('意图分类器')) return fauxAssistantMessage(mockIntent(user))
  if (system.includes('任务规划器')) return fauxAssistantMessage(mockPlan(user))
  if (system.includes('整页规划器')) return fauxAssistantMessage(mockPagePlan(user))

  // 任务执行器：一次工具调用，拿到结果后收尾
  if (system.includes('任务执行器')) {
    if (lastToolResult(context)) {
      return fauxAssistantMessage('本任务已完成，页面已更新。')
    }
    const toolCall = mockTaskToolCall(system, user)
    return fauxAssistantMessage(toolCall ? [toolCall] : '没有需要执行的操作。')
  }

  return fauxAssistantMessage(mockTextReply(user))
}

export function mockJsonText(input: { schemaName: string; system: string; user: string }): string {
  if (input.schemaName === 'classify') return mockIntent(input.user)
  if (input.schemaName === 'plan') return mockPlan(input.user)
  if (input.schemaName === 'page-plan') return mockPagePlan(input.user)
  return '{}'
}

export function mockTextReply(user: string): string {
  return `（Mock 模式）收到需求：${String(user).slice(0, 60)}。当前没有接入真实模型，这条回复用于验证链路。`
}

/** 从拼好的 user 提示词里取出"用户原话"部分，避免关键词误命中提示词骨架 */
function extractUserText(prompt: string): string {
  const match = prompt.match(/## 用户(?:输入|需求)?\s*\n([\s\S]*?)(?:\n## |$)/)
  return (match?.[1] || prompt).trim()
}

function mockIntent(prompt: string): string {
  const text = extractUserText(prompt)
  // 提问句式优先判 chat，避免"怎么绑定数据源"被关键词带进编辑流程
  const isQuestion = /[？?]$|怎么|如何|为什么|是什么|能不能|可以吗/.test(text)
  const intent = isQuestion
    ? 'chat'
    : /整页|整套|整个大屏|生成.{0,10}大屏|做.{0,10}大屏/.test(text)
      ? 'page'
      : /数据源|接口|轮询/.test(text)
        ? 'data'
        : /事件|点击|联动/.test(text)
          ? 'event'
          : /画布|背景色|分辨率/.test(text)
            ? 'canvas'
            : /排列|布局|对齐/.test(text)
              ? 'layout'
              : /图表|柱状|折线|饼图|仪表盘/.test(text)
                ? 'chart'
                : /改|调整|换成|改成/.test(text)
                  ? 'modify'
                  : /加|添加|新增|创建|来一个/.test(text)
                    ? 'create'
                    : 'chat'
  const skills = /科技风|科技感|深色/.test(text) ? ['tech-style'] : []
  return JSON.stringify({ intent, reason: 'mock 关键词匹配', skills })
}

function mockPlan(prompt: string): string {
  const text = extractUserText(prompt)

  // 整页生成：单个 page 任务，和真实规划器的规则一致
  if (/整页|整套|整个大屏|生成.{0,10}大屏|做.{0,10}大屏/.test(text)) {
    return JSON.stringify({
      summary: '整页生成大屏',
      tasks: [
        {
          id: 't1',
          name: '生成整页内容',
          type: 'page',
          dependsOn: [],
          instruction: '按需求生成整页内容，包含标题、指标区和图表区。',
        },
      ],
    })
  }
  // 并行调度用：两个互不依赖的任务 + 一个依赖任务
  if (/同时|分别|并行/.test(text)) {
    return JSON.stringify({
      summary: '并行处理两件互不依赖的事',
      tasks: [
        {
          id: 't1',
          name: '调整画布',
          type: 'canvas',
          dependsOn: [],
          instruction: '把背景改成深色',
        },
        {
          id: 't2',
          name: '添加文本',
          type: 'node',
          dependsOn: [],
          instruction: '在画布加一个文本组件',
        },
        {
          id: 't3',
          name: '绑定数据源',
          type: 'bind',
          dependsOn: ['t2'],
          instruction: '绑定数据源到 ${t2.nodeId}。',
        },
      ],
    })
  }

  const tasks: any[] = []
  const needsData = /数据源|接口|轮询|绑定/.test(text)
  const chartType = /折线/.test(text)
    ? 'line-chart'
    : /饼/.test(text)
      ? 'pie-chart'
      : /仪表/.test(text)
        ? 'gauge-chart'
        : 'bar-chart'

  if (needsData) {
    tasks.push({
      id: 't1',
      name: '创建数据源',
      type: 'data',
      dependsOn: [],
      instruction: '创建一个静态数据源，名称为「演示数据」，数据用 6 条月度数据。',
    })
  }

  tasks.push({
    id: `t${tasks.length + 1}`,
    name: /折线|饼|仪表/.test(text) ? '添加图表' : '添加柱状图',
    type: 'chart',
    dependsOn: tasks.length ? ['t1'] : [],
    instruction: `在画布左上角添加一个 ${chartType}，标题「演示图表」，使用深色配色。`,
  })

  if (needsData) {
    tasks.push({
      id: `t${tasks.length + 1}`,
      name: '绑定数据源',
      type: 'bind',
      dependsOn: ['t1', 't2'],
      instruction: '把数据源 ${t1.dataSourceId} 绑定到组件 ${t2.nodeId}。',
    })
  }

  return JSON.stringify({ summary: '按 mock 计划添加图表与数据源', tasks })
}

function mockPagePlan(prompt: string): string {
  const rows = [
    { label: '一月', value: 120 },
    { label: '二月', value: 200 },
    { label: '三月', value: 160 },
    { label: '四月', value: 240 },
  ]
  const title =
    extractUserText(prompt)
      .replace(/[，。！\s]/g, '')
      .slice(0, 12) || '数据大屏'
  return JSON.stringify({
    title,
    backgroundColor: '#0d121b',
    blocks: [
      {
        type: 'text',
        name: '页面标题',
        grid: { col: 1, row: 1, spanX: 12, spanY: 1 },
        props: { content: title },
        style: { color: '#e2e8f0', fontSize: '32px', fontWeight: '600', textAlign: 'center' },
      },
      {
        type: 'bar-chart',
        name: '月度柱状图',
        grid: { col: 1, row: 2, spanX: 6, spanY: 3 },
        props: { option: { title: { text: '月度趋势' } } },
        data: { name: '月度数据', kind: 'static', rows },
      },
      {
        type: 'pie-chart',
        name: '占比饼图',
        grid: { col: 7, row: 2, spanX: 6, spanY: 3 },
        props: { option: { title: { text: '渠道占比' } } },
        data: { name: '渠道数据', kind: 'static', rows },
      },
    ],
  })
}

function mockTaskToolCall(system: string, user: string) {
  const type = system.match(/## 任务类型\s*\n+\s*(\w+)/)?.[1] || 'node'
  const dataSourceIds = [...system.matchAll(/dataSourceId=([0-9a-f-]{8,})/gi)].map(
    (match) => match[1],
  )
  const nodeIds = [...system.matchAll(/nodeId=([0-9a-f-]{8,})/gi)].map((match) => match[1])

  switch (type) {
    case 'chart':
      return fauxToolCall('add_node', {
        type: /折线/.test(user) ? 'line-chart' : /饼/.test(user) ? 'pie-chart' : 'bar-chart',
        name: '演示图表',
        mode: 'grid',
        col: 1,
        row: 2,
        spanX: 1,
        spanY: 2,
      })
    case 'data':
      return fauxToolCall('add_data_source', { name: '演示数据源', type: 'static' })
    case 'bind':
      return dataSourceIds.length && nodeIds.length
        ? fauxToolCall('bind_data_source', {
            nodeId: nodeIds[0],
            dataSourceId: dataSourceIds[0],
          })
        : null
    case 'event':
      return nodeIds.length
        ? fauxToolCall('set_node_event', {
            nodeId: nodeIds[0],
            type: 'click',
            code: 'console.log("clicked")',
          })
        : null
    case 'canvas':
      return fauxToolCall('set_canvas', { backgroundColor: '#0d121b' })
    case 'page':
      return null
    default:
      return fauxToolCall('add_node', { type: 'text', name: '文本' })
  }
}
