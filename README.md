# ai-screen-design

## 文档

- [项目架构设计文档](./docs/architecture-design.md)
- [项目学习笔记](./docs/project-learning-guide.md)

## 1.redo undo实现方案
- 1.备忘录模式
  存快照，深拷贝，缺点：浪费空间
- 2.命令模式
  保存的修改单基础信息 => {target:App.vue,key:15,newValue:1,oldValue:null}

```ts
/**
 * 命令模式实现撤销重做
 */
const undoStack = []
const redoStack = []
const count = ref(0)

function onClick() {
  const oldValue = count.value
  const newValue = oldValue + 1
  undoStack.push({
    oldValue,
    newValue,
    target: count,
    key: 'value',
  })
  count.value = newValue
  redoStack.length = 0
}

function undo() {
  const record = undoStack.pop()
  if (record) {
    const { target, oldValue, key } = record
    target[key] = oldValue
    // 撤销后才能重做
    redoStack.push(record)
  }
}

function redo() {
  const record = redoStack.pop()
  if (record) {
    const { target, newValue, key } = record
    target[key] = newValue
    undoStack.push(record)
  }
}
```
