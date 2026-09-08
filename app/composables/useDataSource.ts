import type { DataSourceSchema } from '@shared/schema/page.ts'
import axios from 'axios'
import { getValue } from '@/utils'

export function useDataSource(dataId: Ref<string>) {
  const dataSources = inject<Ref<DataSourceSchema[]>>('dataSources')
  const loading = ref(false)
  const error = ref()
  let timer
  const source = computed(() => {
    return dataSources.value.find((item) => item.id === dataId.value)
  })

  // 图表数据 由静态或者接口返回
  const data = ref()

  async function loadData(params?: Record<string, any>) {
    clearTimeout(timer)
    if (!source.value) return
    if (source.value.type === 'api') {
      try {
        loading.value = true
        data.value = await fetchData(source.value, params)
      } catch (e) {
        console.log('e ==> ', e)
      } finally {
        loading.value = false
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

  watch(source, () => loadData(), { immediate: true })

  // 组件消费的data chart的源数据
  return {
    data,
    loading,
    error,
    refresh: loadData,
  }
}

const requestMap = {}
export async function fetchData(source: DataSourceSchema, data?: Record<string, any>) {
  const search = new URLSearchParams()
  const params = Object.fromEntries(search.entries())
  const url = source.url
  const queryParms = {
    ...params,
    ...source.params,
    // 手动传递的优先级更高 比如手动调刷新
    ...data,
  }
  // 适配 相同的数据源同时发请求时 可以复用
  const paramsKey = source.method === 'get' ? 'params' : 'data'

  const config = {
    url,
    method: source.method || 'GET',
    [paramsKey]: queryParms,
  }
  const key = JSON.stringify(config)
  if (requestMap[key]) {
    return requestMap[key]
  }
  const promise = axios
    .request(config)
    .then((res) => getValue(res.data, source.responsePath))
    .finally(() => {
      delete requestMap[key]
    })
  requestMap[key] = promise
  return promise
}
