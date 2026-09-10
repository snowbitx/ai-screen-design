<script setup lang="ts">
import { editor } from 'monaco-editor'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import { useTheme } from '@/composables/useTheme.ts'

defineOptions({
  name: 'MonacoEditor',
})

window.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') return new JsonWorker()
    if (label === 'javascript' || label == 'typescript') return new TsWorker()
    return new EditorWorker()
  },
}

const props = defineProps<{ lang?: string }>()

const modelValue = defineModel<string>()

const { isClassic } = useTheme()

const editorElement = ref()

// Monaco 主题色只接受真实色值，读不到 CSS 变量，
// 这里和 themes.css 的两套主题变量保持一致：
// shadcn 浅色 --card 为 oklch(1 0 0)（白色），classic 暗色 --card 为 #1b2436
const EDITOR_THEMES = {
  shadcn: {
    name: 'editor-shadcn',
    base: 'vs',
    background: '#ffffff',
  },
  classic: {
    name: 'editor-classic',
    base: 'vs-dark',
    background: '#1b2436',
  },
} as const

function defineEditorTheme(target: (typeof EDITOR_THEMES)[keyof typeof EDITOR_THEMES]) {
  editor.defineTheme(target.name, {
    base: target.base,
    inherit: true,
    rules: [],
    colors: {
      'editor.background': target.background,
      'editorGutter.background': target.background,
      // 行高亮跟随底色加深一点，避免浅色下高亮不可见
      'editor.lineHighlightBackground': target.base === 'vs' ? '#f4f4f5' : '#243147',
    },
  })
}

let instance
onMounted(() => {
  defineEditorTheme(EDITOR_THEMES.shadcn)
  defineEditorTheme(EDITOR_THEMES.classic)
  instance = editor.create(editorElement.value, {
    value: modelValue.value,
    theme: isClassic.value ? EDITOR_THEMES.classic.name : EDITOR_THEMES.shadcn.name,
    language: props.lang || 'json',
    fontSize: 14,
    tabSize: 2,
    // 自适应父节点的宽高
    automaticLayout: true,
  })
  instance.onDidChangeModelContent(() => {
    modelValue.value = instance.getValue()
  })

  onBeforeUnmount(() => {
    instance.dispose()
  })
})

watch(modelValue, (newVal) => {
  if (newVal === instance.getValue()) return
  instance.setValue(newVal)
})

watch(isClassic, (classic) => {
  editor.setTheme(classic ? EDITOR_THEMES.classic.name : EDITOR_THEMES.shadcn.name)
})
</script>

<template>
  <div class="editor-container" ref="editorElement"></div>
</template>

<style scoped lang="scss">
.editor-container {
  height: 100%;
  min-height: 400px;
  width: 100%;
}
</style>
