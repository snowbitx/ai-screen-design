<script setup lang="ts">
import { editor } from 'monaco-editor'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

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

const editorElement = ref()

let instance
onMounted(() => {
  instance = editor.create(editorElement.value, {
    value: modelValue.value,
    theme: 'vs-dark',
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
