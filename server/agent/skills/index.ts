import { Type } from 'typebox'
import type { AgentTool } from '@earendil-works/pi-agent-core'
import { techStyleSkill } from './bodies.ts'

/**
 * Skill：一段按需加载的专业规范。
 *
 * 和系统提示的区别在于"体积"——完整规范上千字，每轮都塞进提示词既贵又会稀释
 * 当前任务。所以这里只常驻「id + 一句话描述」，模型判断需要时再 load_skill 取正文。
 */
export interface AgentSkill {
  id: string
  name: string
  description: string
  /** 命中这些关键词时自动预加载，省一次工具往返 */
  triggers: string[]
  body: string
}

export const agentSkills: AgentSkill[] = [
  {
    id: 'tech-style',
    name: '科技风大屏',
    description: '深色科技风大屏的配色、卡片、图表样式和布局规范',
    triggers: ['科技风', '科技感', '深色', '大屏风格', '炫酷', '未来感', 'dark'],
    body: techStyleSkill,
  },
]

export function getSkill(id: string): AgentSkill | undefined {
  return agentSkills.find((skill) => skill.id === id)
}

/** 按关键词匹配 Skill（只匹配 id 或中文触发词） */
export function matchSkills(text: string): AgentSkill[] {
  const lower = text.toLowerCase()
  return agentSkills.filter(
    (skill) =>
      lower.includes(skill.id.toLowerCase()) ||
      skill.triggers.some((trigger) => lower.includes(trigger.toLowerCase())),
  )
}

/** 系统提示里常驻的一行式目录 */
export function describeSkills(): string {
  return agentSkills.map((skill) => `- ${skill.id}｜${skill.name}｜${skill.description}`).join('\n')
}

export function collectSkillBodies(ids: string[]): string {
  return ids
    .map((id) => getSkill(id))
    .filter((skill): skill is AgentSkill => Boolean(skill))
    .map((skill) => skill.body)
    .join('\n\n---\n\n')
}

/** 模型可以主动加载 Skill（不知道 id 时也能先看目录） */
export function createSkillTool(): AgentTool<any> {
  return {
    name: 'load_skill',
    label: '加载设计规范',
    description:
      '加载一份设计规范正文。可用 id 见系统提示的 Skill 目录。写整页布局、调整整体风格、配色前调用一次，按规范落地。',
    parameters: Type.Object({
      id: Type.String({ description: 'Skill id，如 tech-style' }),
    }),
    execute: async (_id: string, params: any) => {
      const skill = getSkill(String(params.id || ''))
      if (!skill) {
        return {
          content: [
            { type: 'text', text: `没有 ${params.id} 这个 Skill。可用：${describeSkills()}` },
          ],
          details: { ok: false },
          isError: true,
        }
      }
      return {
        content: [{ type: 'text', text: skill.body }],
        details: { id: skill.id },
      }
    },
  }
}
