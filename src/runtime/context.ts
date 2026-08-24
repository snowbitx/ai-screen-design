import type { MaterialSchema } from '@/schema/material.ts'
import type { PageSchema } from '@/schema/page.ts'
import { setValue } from '@/utils'

// 运行时
interface RuntimeContext {
  getNode(id: string): MaterialSchema
  // 修改节点属性
  setAttribute(id: string, key: string, value: any): void
  setProp(id: string, key: string, value: any): void
  setStyle(id: string, key: string, value: any): void
  registerNodeInstance(instance: Record<string, any>): void
  // 触发制定节点的实例的方法
  trigger(id: string, name: string, ...args: any[]): void
  // 通过dataId刷新所有组件中的数据
  refreshNodesByDataId(dataId: string): void
}

export function createRuntimeContext(page: Ref<PageSchema>): RuntimeContext {
  let instanceMap = {}
  const getNode: RuntimeContext['getNode'] = (id) => {
    return page.value.nodes.find((node) => node.id === id)
  }

  const setAttribute: RuntimeContext['setAttribute'] = (id, key, value): void => {
    const node = getNode(id)
    if (!node) {
      console.warn(`Cannot set attribute ${id} in runtime context`)
      return
    }
    setValue(node, key, value)
  }

  // 同改属性 只是setValue node.props
  const setProp: RuntimeContext['setProp'] = (id, key, value): void => {
    setAttribute(id, `props.${key}`, value)
  }

  const setStyle: RuntimeContext['setStyle'] = (id: string, key: string, value: any): void => {
    setAttribute(id, `style.${key}`, value)
  }

  const registerNodeInstance: RuntimeContext['registerNodeInstance'] = (instance) => {
    instanceMap = instance
  }

  const trigger: RuntimeContext['trigger'] = (id, name, ...args): void => {
    const instance = instanceMap[id]
    if (!instance) {
      console.warn(`Cannot set attribute ${id} in runtime context`)
      return
    }
    // 假设调用组件方法，那么trigger返回方法返回值
    return instance?.[name](...args)
  }

  const refreshNodesByDataId: RuntimeContext['refreshNodesByDataId'] = (dataId: string): void => {
    // 通过数据源id找到节点 遍历调刷新
    const nodes = page.value.nodes.filter((node) => node.dataId === dataId)
    nodes.forEach((node) => {
      trigger(node.id, 'refresh')
    })
  }
  return {
    getNode,
    setAttribute,
    setProp,
    setStyle,
    registerNodeInstance,
    trigger,
    refreshNodesByDataId,
  }
}
