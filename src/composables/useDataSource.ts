import type { DataSourceSchema } from '@/schema/page.ts'
import axios from 'axios'

export function useDataSource(dataId: Ref<string>) {
  const dataSources = inject<Ref<DataSourceSchema[]>>('dataSources')
  /**
   * id,name,type:static|api  后续需要拿到type分开
   */
  const source = computed(() => {
    return dataSources.value.find((item) => item.id === dataId.value)
  })

  const data = ref()
  let timer
  async function loadData() {
    if (!source.value) return
    if (source.value.type === 'api') {
      const url = source.value.url
      try {
        const res = await axios.get(url, {
          params: source.value.params,
        })
        data.value = res.data
      } finally {
        // 没有在外面写 setInterval轮询，是考虑到接口可能未返回
        if (source.value.interval) {
          timer = setTimeout(loadData, source.value.interval)
        }
      }
    } else {
      data.value = source.value.data
    }
  }

  onBeforeUnmount(() => {
    clearTimeout(timer)
  })

  watch(source, loadData, { immediate: true })

  // 组件消费的data chart的源数据
  return {
    data,
  }
}
