import ChartMaterial from './component.vue'
import { barMaterial } from './bar.ts'
import { areaMaterial } from './area.ts'
import { lineMaterial } from './line.ts'
import { pieMaterial } from './pie.ts'
import { scatterMaterial } from './scatter.ts'
import { radarMaterial } from './radar.ts'
import { candlestickMaterial } from './candlestick.ts'
import { funnelMaterial } from './funnel.ts'
import { gaugeMaterial } from './gauge.ts'
import { heatmapMaterial } from './heatmap.ts'
import { boxplotMaterial } from './boxplot.ts'
import { sunburstMaterial } from './sunburst.ts'
import { treeMaterial } from './tree.ts'
import { treemapMaterial } from './treemap.ts'
import { sankeyMaterial } from './sankey.ts'

const chartsMaterial = [
  barMaterial,
  areaMaterial,
  lineMaterial,
  pieMaterial,
  scatterMaterial,
  radarMaterial,
  candlestickMaterial,
  funnelMaterial,
  gaugeMaterial,
  heatmapMaterial,
  boxplotMaterial,
  sunburstMaterial,
  treeMaterial,
  treemapMaterial,
  sankeyMaterial,
]

export function install(register) {
  chartsMaterial.forEach((material) => {
    // 遍历所有的图表物料，全部注册
    register(material, ChartMaterial)
  })
}
