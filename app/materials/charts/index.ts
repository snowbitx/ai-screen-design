import ChartMaterial from './component.vue'
import { barMaterial } from './bar.ts'
import { areaMaterial } from './area.ts'
import { lineMaterial } from './line.ts'
import { pieMaterial } from './pie.ts'

const chartsMaterial = [barMaterial, areaMaterial, lineMaterial, pieMaterial]

export function install(register) {
  chartsMaterial.forEach((material) => {
    // 遍历所有的图表物料，全部注册
    register(material, ChartMaterial)
  })
}
