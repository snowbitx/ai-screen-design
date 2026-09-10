import ChartMaterial from './component.vue'
import { chartMaterials } from '@shared/materials/charts/index.ts'

export function install(register) {
  chartMaterials.forEach((material) => {
    // 遍历所有的图表物料，全部注册
    register(material, ChartMaterial)
  })
}
