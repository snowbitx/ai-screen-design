# ai-screen-design 学习笔记

这份笔记不是 API 手册，也不会把每个文件都解释一遍。

我更想回答的是：这个项目从哪里开始看？一个组件是怎么从左边被拖进画布的？改属性后，画布为什么会跟着变？以后忘了，可以顺着哪条线重新想起来？

项目目前还在学习阶段，有些功能只是搭了架子，也有几处代码没有写完。笔记里会直接标出来。

## 先运行起来

```bash
pnpm install
pnpm dev
```

入口很简单：

```text
index.html
  → src/main.ts
  → src/App.vue
  → src/editor/index.vue
```

`main.ts` 创建 Vue 应用，安装 Pinia 和 Router，并全局注册 Icon 组件。`App.vue` 没有走路由，直接渲染 `ScreenEditor`。

Router 虽然已经安装，但目前 `routes` 是空数组。所以现阶段看项目时，可以先忽略路由。

## 打开编辑器后，页面是怎么分区的

主要看 `src/editor/index.vue`。

编辑器上面是一条工具栏，下面从左到右依次是：

```text
物料面板（260px） | 图层面板（160px） | 画布（剩余空间） | 属性面板（360px）
```

三个侧边面板是否显示，保存在 Pinia 的 `panelVisible` 中：

```ts
const panelVisible = reactive({
  material: true,
  layer: true,
  property: true,
})
```

工具栏点击按钮时修改这个对象，`editor/index.vue` 再根据它计算面板宽度。隐藏并不是卸载组件，而是把宽度变成 `0`，配合 `overflow-hidden` 和 `transition-all` 做过渡。

这里顺便注意一个项目自己的 Tailwind 约定：

```css
@theme {
  --spacing: 1px;
}
```

因此 `w-300` 表示 `300px`，`p-20` 表示 `20px`。它和 Tailwind 默认的间距换算不一样。我第一次看到这些类名时，很容易误判尺寸。

## 先分清两个容易混淆的东西

### 物料定义

物料定义可以理解成“组件模板”。文本物料在 `src/material/text/index.ts` 中定义：

```ts
const textMaterial = {
  name: '文本',
  group: 'info',
  icon: 'solar:text-bold',
  setters: [/* 右侧属性配置 */],
  schema: {/* 拖入画布时使用的默认数据 */},
}
```

它告诉编辑器：

- 在物料面板显示什么名称和图标；
- 它属于哪个分组；
- 拖进画布时默认多大、显示什么内容；
- 右侧属性面板可以编辑哪些字段。

这时它还不是画布里的真实节点，所以没有 `id`。

### 节点实例

从左侧拖一个文本到画布后，默认 schema 会被创建成节点：

```ts
interface MaterialSchema {
  type: string
  name: string
  id: string
  locked: boolean
  layout: {
    x: number
    y: number
    width: number
    height: number
  }
  style: Record<string, any>
  props: Record<string, any>
}
```

同一种文本物料可以拖很多次。它们的 `type` 相同，但 `id` 不同，位置、尺寸和内容也可以分别修改。

我现在会这样记：

```text
MaterialDefinition 是货架上的样品
MaterialSchema 是已经放到画布里的那一件
```

## 物料为什么不用一个个手动导入

这部分在 `src/material/index.ts`。

```ts
const materialModules = import.meta.glob('./*/index.ts', { eager: true })

Object.values(materialModules).forEach((materialModule) => {
  materialModule.install(register)
})
```

Vite 会找到 `material` 下每个子目录的 `index.ts`。这些文件都导出一个 `install` 方法，例如文本物料：

```ts
export function install(register) {
  register(textMaterial, TextMaterial)
}
```

`register()` 做了三件事：

```ts
materials.push(material)
componentMap.set(material.schema.type, component)
settersMap.set(material.schema.type, material.setters)
```

这三个容器分别给不同地方使用：

```text
materials      → 左侧物料列表
componentMap   → 画布根据 type 找 Vue 组件
settersMap     → 属性面板根据 type 找表单配置
```

所以新增一种物料时，理想情况下只需要增加一个物料目录，不用再去画布组件里写一串 `if/else`。

## 一个文本是怎么被拖进画布的

我一开始容易把这里和 Moveable 搞混。重新看代码后发现，物料从左侧进入画布，用的是浏览器原生 drag/drop；Moveable 负责的是节点进入画布之后的移动和缩放。

### 第一步：拖动开始

`MaterialItem.vue` 把默认 schema 转成 JSON，放进 `dataTransfer`：

```ts
function onStart(e: DragEvent) {
  e.dataTransfer.setData('scheme', JSON.stringify(props.material.schema))
}
```

这里传的不是整个物料定义。图标、分组、setter 都不用进入画布，只需要节点的默认数据。

### 第二步：在画布释放

`canvas/index.vue` 的 `onDrop()` 取回数据：

```ts
const data = e.dataTransfer.getData('scheme')
const node = createNode(JSON.parse(data))
```

`createNode()` 给它增加一个 UUID。接着根据鼠标落点计算位置：

```ts
node.layout.x = e.offsetX - node.layout.width / 2
node.layout.y = e.offsetY - node.layout.height / 2
```

减去半个宽高，是为了让节点中心落在鼠标释放的位置。如果不减，鼠标位置会成为节点左上角。

最后把节点加入 Pinia，并立即选中：

```ts
editorStore.addNode(node)
editorStore.selectNode(node.id)
```

### 第三步：Vue 把节点渲染出来

画布遍历 `nodes`：

```vue
<component
  :is="getMaterialComponent(node.type)"
  :schema="node"
/>
```

例如 `node.type` 是 `text`，注册表就会返回 `TextMaterial`。文本组件再读取：

```vue
<div :style="schema.style">
  {{ schema.props.content }}
</div>
```

完整过程可以压缩成这一行：

```text
默认 schema → dataTransfer → createNode → nodes → 按 type 找组件 → 渲染
```

忘记时先沿着这条线找，不必从整个项目重新看。

## Pinia 里到底存了什么

核心状态在 `src/stores/editor.ts`。

```ts
const page = ref<PageSchema>({
  canvas: {
    width: 1920,
    height: 1080,
    backgroundColor: '#0d121b',
  },
  nodes: [],
})
```

`page` 是以后适合保存到后端的数据。它包含画布配置和全部节点，没有放面板显隐、当前选中项这种只在编辑时有用的状态。

`nodes` 和 `canvas` 并不是另一份数据：

```ts
const nodes = toRef(page.value, 'nodes')
const canvas = toRef(page.value, 'canvas')
```

它们只是从 `page` 中取出的响应式引用。修改 `nodes`，也就是修改 `page.nodes`。

选中状态用数组保存：

```ts
const selectedNodeIds = ref([])
```

即使只是点选一个节点，也会保存成 `[id]`。这是因为画布还支持框选多个节点。代码再从数组派生单选状态：

```ts
const selectedNodeId = computed(() => {
  return selectedNodeIds.value.length === 1
    ? selectedNodeIds.value[0]
    : null
})

const selectedNode = computed(() => {
  return nodes.value.find((node) => node.id === selectedNodeId.value)
})
```

也就是说：没有选中或选中多个节点时，右侧都不会出现单个节点的属性。

## 点击、框选、移动是怎么接起来的

### 点击节点

节点的 `mousedown` 会调用：

```ts
editorStore.selectNode(node.id)
```

`canvas/index.vue` 监听 `selectedNodeIds`，根据 id 查询对应 DOM，然后把这些 DOM 交给 Moveable：

```ts
watch(selectedNodeIds, (ids) => {
  selectedTarget.value = ids.map((id) => {
    return stageRef.value.querySelector(
      `[data-node-id="${id}"]:not([data-node-locked='true'])`,
    )
  })
})
```

所以 Pinia 保存的是 id，Moveable 真正操作的是 DOM 元素。这是这里两种状态之间的转换点。

### 框选节点

Selecto 找到 `.canvas-node`，框选结束后取出每个 DOM 上的 `data-node-id`：

```ts
const ids = e.selected.map((element) => {
  return element.getAttribute('data-node-id')
})

editorStore.selectNodes(ids)
```

之后的流程和点击选中一样，还是由 `selectedNodeIds` 驱动 Moveable。

### 移动节点

`onDrag()` 同时更新 DOM 和节点数据：

```ts
e.target.style.left = e.left + 'px'
e.target.style.top = e.top + 'px'

node.layout.x = e.left
node.layout.y = e.top
```

为什么不只改 `node.layout`，让 Vue 自己更新 DOM？我的理解是拖动事件很密集，直接更新 DOM 会更跟手；同时更新 DSL，才能让属性面板和以后保存的数据保持一致。

缩放也是同样的思路。除了更新 `width/height`，还会调用 `onDrag(e.drag)`。这是因为从左边或上边缩放时，节点的 `x/y` 也变了。

组拖动没有重新写一套逻辑，而是复用单节点函数：

```ts
function onDragGroup(e: OnDragGroup) {
  e.events.forEach(onDrag)
}
```

这一点写得挺清楚，组操作只负责把多个事件拆开。

## 右侧属性面板为什么能修改不同物料

右侧首先判断有没有选中单个节点：

```vue
<NodeProperty v-if="selectedNode" />
<CanvasProperty v-else />
```

没有选中节点时编辑画布宽高和背景色；选中单个节点时编辑节点。

节点属性分为两部分：

- 所有节点都有的布局属性：宽、高、X、Y；
- 由具体物料决定的组件属性，例如文本内容和颜色。

文本物料里的 setter 是这样的：

```ts
{
  type: 'input',
  label: '内容',
  key: 'props.content',
}
```

`FormCreate.vue` 根据 `type` 选择 Element Plus 控件：

```ts
const componentMap = {
  input: ElInput,
  number: ElInputNumber,
  color: ElColorPicker,
}
```

再通过 `key` 读取或更新节点里的嵌套字段：

```vue
<component
  :is="componentMap[item.type]"
  :modelValue="getValue(formData, item.key)"
  @update:modelValue="(value) => setValue(formData, item.key, value)"
/>
```

比如 `props.content` 会被拆成 `props` 和 `content`，最终修改 `selectedNode.props.content`。这个对象来自 Pinia，所以文本组件会立即重新渲染。

这条链可以记成：

```text
setter 配置 → FormCreate → setValue(selectedNode) → Pinia 数据变化 → 画布更新
```

## 图层面板为什么要反过来显示

画布节点的层级来自数组下标：

```ts
zIndex: index + 1
```

越靠后的节点，`z-index` 越大。图层面板使用：

```css
flex-direction: column-reverse;
```

所以视觉上最高的图层会出现在列表顶部。`vue-draggable-plus` 拖动图层时直接调整 `nodes` 数组，画布的层级也会随数组顺序变化。

这里要小心：代码里的数组顺序和界面看到的顺序是反的。右键菜单中 `moveTop`、`moveBottom` 的映射也因此做了颠倒。

## 样式从哪里来

全局样式入口是 `src/styles/index.css`：

```css
@import 'tailwindcss';
@import './variable.scss';
@import './global.scss';
```

`variable.scss` 里只有两个主要变量：

```css
:root {
  --border-color: #334155;
  --bg-color: #1b2436;
}
```

`functions.scss` 定义了 `bg-mix()`，在各组件中用同一个背景色混合出不同深浅：

```scss
@function bg-mix($value) {
  @return color-mix(in srgb, var(--bg-color), black #{$value + '%'});
}
```

Vite 配置把这个 Sass 文件预先注入每个组件，因此组件里可以直接写 `background: bg-mix(20)`，不用逐个 `@use`。

## 目前代码里没有完成的地方

下面这些不是项目设计的一部分，复习时不要顺手把它们也记成正确写法。

### 1. 当前构建没有通过类型检查

文本物料的 `schema` 缺少 `locked`，但 `MaterialSchema` 把它定义为必填字段。

运行 `pnpm build` 时，Vite 能生成产物，`vue-tsc` 会在这里报错。

### 2. 复制节点后选中的参数传错了

`copyNode()` 最后写的是：

```ts
selectNode(newNode)
```

但 `selectNode()` 接收的是字符串 id，这里应该传 `newNode.id`。

### 3. 置顶和置底查找下标的方式不对

代码在 `selectedNodeIds` 中这样查找：

```ts
selectedNodeIds.value.findIndex((item) => item.id === node.id)
```

`selectedNodeIds` 的元素本身就是字符串，不存在 `item.id`。而且要调整的是 `nodes` 数组，应该从 `nodes` 中查找当前节点的位置。

### 4. 图表物料只是半成品

`src/material/charts/index.ts` 没有提供渲染组件和 setters，schema 也没有完整满足当前类型。因此切换到图表分组时，即使能看到定义，后续渲染和属性编辑链路也没有闭合。

### 5. 切换不同类型的节点时，setter 可能不更新

`NodeProperty.vue` 在 setup 时读取一次：

```ts
const setters = getMaterialSetters(selectedNode.value.type)
```

如果 `NodeProperty` 没有重新挂载，只是从一种物料切换到另一种物料，`setters` 不会随 `selectedNode.type` 重新计算。这里更适合使用 `computed`。

### 6. 一些按钮目前只是界面

撤销、重做、预览、JSON、发布、导入和导出按钮还没有具体逻辑。目录名 `toobar` 也是 `toolbar` 的拼写遗漏。

## 如果过一阵子又忘了，按这个顺序重看

不要从所有文件开始看。只走一遍完整流程：

1. 看 `schema/material.ts`，分清物料定义和节点实例。
2. 看 `material/text/index.ts`，找到文本的默认 schema 和 setters。
3. 看 `material/index.ts`，弄清三个注册容器。
4. 看 `MaterialItem.vue` 的 `dragstart`。
5. 看 `canvas/index.vue` 的 `onDrop()` 和动态组件。
6. 看 `stores/editor.ts` 中 `page`、`nodes` 和选择状态。
7. 看 `NodeProperty.vue` 与 `FormCreate.vue`，走完属性更新。

这七步走完，项目的主要结构基本就回来了。标尺、框选、右键菜单和图层排序都可以等主线想清楚后再看。

## 给自己留一个练习

新增一个图片物料，只实现最小闭环：

```text
src/material/image/
├── index.ts
└── component.vue
```

需要做到：

- 左侧能看到图片物料；
- 拖入画布后有独立 id；
- 图片地址放在 `props.src`；
- 右侧能修改图片地址；
- 拖动和缩放后，`layout` 会同步变化。

做这个练习时，先别复制文本物料。尝试自己回答每个字段最终会被谁读取。卡住后再沿着下面两条线检查：

```text
显示：type → componentMap → component.vue
编辑：type → settersMap → FormCreate → node.props
```

能独立把这两条线接通，就已经理解了这个项目最重要的部分。
