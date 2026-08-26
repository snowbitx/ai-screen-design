<script setup lang="ts">
import type { MaterialSchema } from '@/schema/material.ts'
import { getMaterialComponent } from '@/materials'
import type { PageSchema } from '@/schema/page.ts'
import { createRuntimeContext } from '@/runtime/context.ts'
import { runSanBox } from '@/runtime/sanbox.ts'

defineOptions({
  name: 'ScreenRenderer',
})

const props = defineProps<{ page: PageSchema }>()
const runtimePage = ref(props.page)
const context = createRuntimeContext(runtimePage)
const canvas = computed(() => runtimePage.value.canvas)
const dataSources = computed(() => runtimePage.value.dataSources)
const nodes = computed(() => runtimePage.value.nodes)

const scale = ref(1)
const left = ref(0)
const top = ref(0)

provide('dataSources', dataSources)

const canvasStyle = computed(() => {
  return {
    width: canvas.value.width + 'px',
    height: canvas.value.height + 'px',
    backgroundColor: canvas.value.backgroundColor,
    transform: `translate(${left.value}px, ${top.value}px) scale(${scale.value})`,
    transformOrigin: 'left top',
  }
})

function getNodeStyle(node: MaterialSchema, index: number) {
  return {
    width: node.layout.width + 'px',
    height: node.layout.height + 'px',
    left: node.layout.x + 'px',
    top: node.layout.y + 'px',
    zIndex: index + 1,
  }
}

function init() {
  // 缩放比例计算
  const y = window.innerHeight / canvas.value.height
  const x = window.innerWidth / canvas.value.width
  // 谁小用谁的
  scale.value = Math.min(x, y)
  // 水平垂直居中计算
  left.value = (window.innerWidth - canvas.value.width * scale.value) / 2
  top.value = (window.innerHeight - canvas.value.height * scale.value) / 2
}

// 将物料组件实例注册到context上
function registerNodeInstance() {
  const refs = {}
  for (const key in refs) {
    // 取第0个是因为ref可能重复所以是数组
    refs[key] = vm[key][0]
  }
  context.registerNodeInstance(refs)
}

const vm = getCurrentInstance()
onMounted(() => {
  registerNodeInstance()
  init()
  addEventListener('resize', init)
  onBeforeUnmount(() => {
    removeEventListener('resize', init)
  })
})
// 创建组件绑定的事件函数
function createEvents(node: MaterialSchema) {
  const listeners = {}
  const events = node.events || []
  events.forEach((event) => {
    // {
    //   type: 'click',
    //   name: 'fn',
    //   运行时希望点击时拿到context和node节点，$是防重名
    //   code: 'console.log($context,$node,123)',
    // },
    if (event.handler) {
      listeners[event.type] = event.handler
      return
    }
    event.handler = listeners[event.type] = (payload) => {
      runSanBox(event.code, { $context: context, $node: node, $payload: payload })
      // 前面的都是形参，最后是函数体
      const fn = new Function('$context', '$node', '$payload', event.code)
      fn(context, node, payload)
    }
  })
  return listeners
}
</script>

<template>
  <div class="preview-container">
    <div class="canvas-root" :style="canvasStyle">
      <div
        class="canvas-node"
        v-for="(node, index) in nodes"
        :key="node.id"
        :style="getNodeStyle(node, index)"
      >
        <component
          :ref="node.id"
          :is="getMaterialComponent(node.type)"
          :schema="node"
          v-on="createEvents(node)"
        ></component>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.preview-container {
  width: 100vw;
  height: 100vh;
  .canvas-root {
    position: relative;
    .canvas-node {
      position: absolute;
    }
  }
}
</style>
