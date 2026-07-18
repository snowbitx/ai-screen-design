export function debounce(fn, ms) {
  let timer
  return function (this, ...args) {
    clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, ms)
  }
}

export function getValue(target, key) {
  // key 'props.content'
  const keys = key.split('.')
  while (keys.length) {
    target = target[keys.shift()]
  }
  console.log('target ==> ', target)
  return target
}
// setValue(obj,'props.content')
export function setValue(target, key, value) {
  // key 'props.content' 找到 obj.xxx.props.content的 最后一级props.content即可。
  const keys = key.split('.')
  const lastKey = keys.pop() // 此时keys 已经到了props这级
  const _target = getValue(target, keys.join('.'))
  _target[lastKey] = value
  // return value
}
