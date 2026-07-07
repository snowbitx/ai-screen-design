import type { MaterialDefinition } from '@/material/types.ts'

const materials: MaterialDefinition[] = []
export function register(material: MaterialDefinition) {
  materials.push(material)
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
    icon: 'material-symbols:info',
    key: 'info',
  },
]

export function getMaterialByGroup(group: string) {
  return materials.filter((item) => item.group === group)
}

export function getMaterialGroups() {
  return groups
}
