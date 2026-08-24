<script setup lang="ts">
import type { MaterialSchema } from '@/schema/material.ts'
import { init, type EChartsType } from 'echarts'
import { useDataSource } from '@/composables/useDataSource.ts'
defineOptions({
  name: 'ChartMaterialChart',
})

const props = defineProps<{ schema: MaterialSchema }>()

const chartRef = useTemplateRef('chartRef')
let chart: EChartsType

/**
 * 物料状态来源：编辑器编辑时的相关状态放在editorStore 渲染器在用时就不能在里面取了。所以此处 从editor/index provide注入一个DataSource
 * 编辑时的状态（编辑器在用的时候）
 * 运行时的状态（渲染时）
 */
const dataId = computed(() => props.schema.dataId)
const { data, loading, error, refresh } = useDataSource(dataId)

const option = computed(() => {
  const _option = props.schema.props.option
  return {
    ..._option,
    dataset: {
      ..._option.dataset,
      source: data.value || _option.dataset.source,
    },
  }
})

watch(
  option,
  (newValue) => {
    chart.setOption(newValue)
  },
  { deep: true },
)

onMounted(() => {
  chart = init(chartRef.value)
  console.log('props.schema ==> ', props.schema)
  chart.setOption(option.value)
  const ob = new ResizeObserver(() => {
    chart.resize()
  })
  ob.observe(chartRef.value)
  onBeforeUnmount(() => {
    ob.disconnect()
    chart.dispose()
  })
})

defineExpose({
  refresh,
})
</script>

<template>
  <div v-if="error">
    {{ error }}
  </div>
  <div v-else v-loading="loading" class="chart-material w-full h-full" ref="chartRef">图标</div>
</template>

<style scoped lang="scss"></style>
