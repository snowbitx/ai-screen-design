<script setup lang="ts">
import type { MaterialSchema } from '@/schema/material.ts'
import { init, type EChartsType } from 'echarts'
defineOptions({
  name: 'ChartMaterialChart',
})

const props = defineProps<{ schema: MaterialSchema }>()

const chartRef = useTemplateRef('chart')
let chart: EChartsType
watch(
  () => props.schema.props.option,
  () => {
    chart.setOption(props.schema.props.option)
  },
  {
    deep: true,
  },
)

onMounted(() => {
  chart = init(chartRef.value)
  console.log('props.schema ==> ', props.schema)
  chart.setOption(props.schema.props.option)
  const ob = new ResizeObserver(() => {
    chart.resize()
  })
  ob.observe(chartRef.value)
  onBeforeUnmount(() => {
    ob.disconnect()
    chart.dispose()
  })
})
</script>

<template>
  <div class="chart-material w-full h-full" ref="chart">图标</div>
</template>

<style scoped lang="scss"></style>
