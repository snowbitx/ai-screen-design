const materials = [
  {
    name: '柱状图',
    group: 'charts',
    icon: 'fluent-color:list-bar-16',
  },
  {
    name: '文本',
    group: 'info',
    icon: 'solar:text-bold',
  },
]

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
