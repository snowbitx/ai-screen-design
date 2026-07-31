import type { DataSourceSchema } from '@/schema/page.ts'

export function useDataSource(dataId: Ref<string>) {
  const dataSources = inject<Ref<DataSourceSchema[]>>('dataSources')
  /**
   * id,name,type:static|api  后续需要拿到type分开
   */
  const source = computed(() => {
    return dataSources.value.find((item) => item.id === dataId.value)
  })
  // 组件消费的data chart的源数据
  const data = computed(() => source.value?.data)
  return {
    data,
  }
}
