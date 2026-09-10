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

// 纯数据聚合入口：app 端注册组件时引用，server 端 Agent 物料目录也引用
export const chartMaterials = [
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
