const chartMaterial = {
  name: '柱状图',
  group: 'charts',
  icon: 'fluent-color:list-bar-16',
  schema: {
    type: 'charts',
    name: '柱状图',
    layout: {
      x: 0,
      y: 0,
      width: 300,
      height: 50,
    },
    props: {
      options: {},
    },
  },
}

export function install(regisiter) {
  regisiter(chartMaterial)
}
