import type { MaterialDefinition, MaterialSchema } from '@/schema/material.ts'
// 存放所有的物料
const materials: MaterialDefinition[] = []

// 每个物料注册时都和对应的组件建立关联关系 text => TextMaterial  bar=>ChartMaterial
const componentMap = new Map()
const settersMap = new Map()

export function register(material: MaterialDefinition, component: Component) {
  materials.push(material)
  componentMap.set(material.schema.type, component)
  settersMap.set(material.schema.type, material.setters)
}

//默认是异步，eager是true则变成同步
const materialModules = import.meta.glob('./*/index.ts', { eager: true })

Object.values(materialModules).forEach((materialModule) => {
  // @ts-expect-error 忽略ts错误
  materialModule.install(register)
})

export const groups = [
  {
    name: '图表',
    icon: 'solar:chart-bold',
    key: 'charts',
  },
  {
    name: '信息',
    icon: 'materials-symbols:info',
    key: 'info',
  },
]

export function getMaterialByGroup(group: string) {
  return materials.filter((item) => item.group === group)
}

export function getMaterialGroups() {
  return groups
}

// 通过schema中的type找到对应的组件
export function getMaterialComponent(type: string) {
  return componentMap.get(type)
}
// 通过schema中的type找到对应的表单配置getters
export function getMaterialSetters(type: string) {
  return settersMap.get(type)
}

// 创建物料实例 存的物料dsl
export function createNode(node: MaterialSchema) {
  return {
    ...node,
    id: window.crypto.randomUUID(),
  }
}
