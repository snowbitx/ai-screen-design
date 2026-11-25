import type { AgentIntent } from '@shared/schema/agent.ts'
import { IntentJson } from '../spec/index.ts'
import { describeSkills } from '../skills/index.ts'
import { completeJson } from './llm.ts'
import { describePage, type AgentState } from './state.ts'

export const CLASSIFY_SYSTEM = `你是大屏编辑器「AI Screen Design」的意图分类器。
只做分类，不执行任何修改。

## 意图定义
- chat：提问、闲聊、问怎么用、让你解释某个配置。不需要改画布。
- create：新增组件（文本、图表、指标卡、图片位等）。
- modify：修改已有组件的属性或内容（改标题、改文字、改数值展示）。
- layout：位置、尺寸、对齐、排列、网格调整。
- data：数据源的新建/修改/切换（接口地址、轮询、静态数据）。
- event：交互事件（点击、双击、联动、跳转、刷新）。
- chart：图表本身（换图表类型、改 option、配色、坐标轴、图例）。
- page：整页生成或整页重做（"做一个销售大屏""生成一整套"）。
- canvas：画布尺寸、背景色、主题底色。

## 判定规则
- 一句话里既有新建又有数据源时，按"主要目的"归类，后续规划会拆成多个任务。
- 用户提到"这个/选中/它"且当前有选中组件时，优先判定为 modify/layout/chart。
- 没有明确动作、只是询问或感叹，判 chat。

## 可用 Skill
${describeSkills()}
用户明确提到某种风格（如科技风）时，把对应 Skill id 放进 skills；否则空数组。`

export async function classifyIntent(state: AgentState): Promise<{
  intent: AgentIntent
  reason: string
  skills: string[]
}> {
  const recent = state.history
    .slice(-2)
    .map((item) => `${item.role === 'user' ? '用户' : '助手'}：${item.content.slice(0, 120)}`)
    .join('\n')

  const result = await completeJson<{ intent: AgentIntent; reason: string; skills: string[] }>(
    state.llm,
    {
      system: CLASSIFY_SYSTEM,
      schemaName: 'classify',
      user: `## 用户输入
${state.message}

## 当前画布
${describePage(state)}
${recent ? `\n## 最近对话\n${recent}` : ''}`,
      schema: IntentJson,
      temperature: 0,
      maxTokens: 300,
    },
  )

  return {
    intent: result.intent,
    reason: result.reason || '',
    skills: Array.isArray(result.skills) ? result.skills : [],
  }
}
