import type { MaterialSchema } from '@shared/schema/material.ts'
import type { DataSourceSchema, PageSchema } from '@shared/schema/page.ts'
import { NodeJson } from '../spec/index.ts'
import { validate } from '../spec/validate.ts'

/**
 * 任务产物以 patch 形式合并。
 *
 * 为什么不是"任务直接改共享 page"：并行批次里多个任务同时改同一份 page 会互相覆盖
 * （章节二十六的并行调度必须解决的第一个问题）。所以每个任务在自己的页面副本上跑，
 * 结束后只交回"相对基线新增/改动了什么"，由调度器按计划顺序合并。
 */
export interface PagePatch {
  upsertNodes: MaterialSchema[]
  removeNodeIds: string[]
  upsertDataSources: DataSourceSchema[]
  removeDataSourceIds: string[]
  canvas?: Partial<PageSchema['canvas']>
}

export function emptyPatch(): PagePatch {
  return { upsertNodes: [], removeNodeIds: [], upsertDataSources: [], removeDataSourceIds: [] }
}

/**
 * 合并前的运行时校验。
 *
 * 工具产出的节点来自物料目录，结构本来是对的；但模型可以直接写 props/option，
 * 也可能把 layout 写成字符串。这里做两件事：能修的修（数字字段强转），
 * 修不了的丢掉并留下告警——宁可少一个组件，也不要让整个页面渲染失败。
 */
export function sanitizePatch(patch: PagePatch): { patch: PagePatch; warnings: string[] } {
  const warnings: string[] = []
  const nodes: MaterialSchema[] = []

  for (const node of patch.upsertNodes) {
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      const value = Number((node.layout as any)?.[key])
      if (Number.isFinite(value)) (node.layout as any)[key] = value
    }
    const result = validate(NodeJson, node)
    if (result.ok) nodes.push(node)
    else warnings.push(`组件 ${node?.name || node?.id} 结构不合法：${result.errors.join('；')}`)
  }

  return { patch: { ...patch, upsertNodes: nodes }, warnings }
}

export function isPatchEmpty(patch: PagePatch): boolean {
  return (
    !patch.upsertNodes.length &&
    !patch.removeNodeIds.length &&
    !patch.upsertDataSources.length &&
    !patch.removeDataSourceIds.length &&
    !patch.canvas
  )
}

export function diffPage(base: PageSchema, next: PageSchema): PagePatch {
  const patch = emptyPatch()

  const baseNodes = new Map(base.nodes.map((node) => [node.id, node]))
  const nextNodeIds = new Set(next.nodes.map((node) => node.id))

  for (const node of next.nodes) {
    const previous = baseNodes.get(node.id)
    if (!previous || JSON.stringify(previous) !== JSON.stringify(node)) {
      patch.upsertNodes.push(node)
    }
  }
  for (const node of base.nodes) {
    if (!nextNodeIds.has(node.id)) patch.removeNodeIds.push(node.id)
  }

  const baseSources = new Map(base.dataSources.map((source) => [source.id, source]))
  const nextSourceIds = new Set(next.dataSources.map((source) => source.id))
  for (const source of next.dataSources) {
    const previous = baseSources.get(source.id)
    // 接口类型的数据在运行时会变，diff 只看配置字段，避免把运行态数据当变更
    if (
      !previous ||
      JSON.stringify(stripRuntimeData(previous)) !== JSON.stringify(stripRuntimeData(source))
    ) {
      patch.upsertDataSources.push(source)
    }
  }
  for (const source of base.dataSources) {
    if (!nextSourceIds.has(source.id)) patch.removeDataSourceIds.push(source.id)
  }

  if (JSON.stringify(base.canvas) !== JSON.stringify(next.canvas)) {
    patch.canvas = { ...next.canvas }
  }

  return patch
}

function stripRuntimeData(source: DataSourceSchema) {
  if (source.type !== 'api') return source
  return { ...source, data: undefined }
}

export function applyPatch(page: PageSchema, patch: PagePatch): void {
  if (patch.removeNodeIds.length) {
    const removed = new Set(patch.removeNodeIds)
    page.nodes = page.nodes.filter((node) => !removed.has(node.id))
  }
  for (const node of patch.upsertNodes) {
    const index = page.nodes.findIndex((item) => item.id === node.id)
    if (index === -1) page.nodes.push(JSON.parse(JSON.stringify(node)))
    else page.nodes[index] = JSON.parse(JSON.stringify(node))
  }

  if (patch.removeDataSourceIds.length) {
    const removed = new Set(patch.removeDataSourceIds)
    page.dataSources = page.dataSources.filter((source) => !removed.has(source.id))
    // 数据源没了，指向它的组件要解除绑定，否则渲染时取不到数据
    for (const node of page.nodes) {
      if (node.dataId && removed.has(node.dataId)) delete node.dataId
    }
  }
  for (const source of patch.upsertDataSources) {
    const index = page.dataSources.findIndex((item) => item.id === source.id)
    if (index === -1) page.dataSources.push(JSON.parse(JSON.stringify(source)))
    else page.dataSources[index] = JSON.parse(JSON.stringify(source))
  }

  if (patch.canvas) Object.assign(page.canvas, patch.canvas)
}
