// GET /api/data?date=xxxx —— 原 src/mock/data.ts（mockjs 拦截 XHR）改为真实服务端接口
export default defineEventHandler((event) => {
  const query = getQuery(event)
  const date = (query.date as string) || ''

  // 原来用 mockjs 生成的模拟数据，这里直接生成等价数据
  const labels = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月']
  const list = labels.map((label) => ({
    label,
    value: Math.floor(Math.random() * 900) + 100,
    date,
  }))
  return list
})
