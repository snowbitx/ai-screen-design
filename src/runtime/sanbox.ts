// 在沙箱中运行代码
export function runSanBox(code: string, scope: Record<string, any>) {
  const globalKeys = new Set(['console', 'Math', 'JSON'])
  const sanBox = new Proxy(scope, {
    // 变量不去外层作用域找
    has() {
      return true
    },
    get(target, key) {
      // 过滤`Symbol.unscopables`属性
      if (key === Symbol.unscopables) return
      if (Object.hasOwn(target, key)) {
        return target[key as string]
      }
      if (globalKeys.has(key as string)) {
        const value = globalThis[key]
        return typeof value === 'function' ? value.bind(globalThis) : value
      }
    },
  })
  // function sanBox(sanBox){
  //    with(sanBox){
  //       ${code}
  //      }
  // }
  const fn = new Function(
    'sanBox',
    `
     const asyncFn = async () => {
       with(sanBox){
        ${code}
       }
     }
     asyncFn()
    `,
  )
  fn(sanBox)
}
