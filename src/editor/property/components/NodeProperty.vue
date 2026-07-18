<script setup lang="ts">
import { useEditorStore } from '@/stores/editor.ts'
import { storeToRefs } from 'pinia'
import { getMaterialSetters } from '@/material'
import FormCreate from '@/editor/property/components/FormCreate.vue'

defineOptions({
  name: 'NodeProperty',
})
// 不同物料有不同的配置，所以节点属性配置需要动态表单（物料注册时加载配置）

const editorStore = useEditorStore()
const { selectedNode } = storeToRefs(editorStore)
console.log('selectedNode ==> ', selectedNode)
const setters = getMaterialSetters(selectedNode.value.type)
console.log('setters ==> ', setters)

const layoutSetters = [
  {
    label: '宽度',
    key: 'layout.width',
    type: 'number',
    span: 12,
  },
  {
    label: '高度',
    key: 'layout.height',
    type: 'number',
    span: 12,
  },
  {
    label: 'X',
    key: 'layout.x',
    type: 'number',
    span: 12,
  },
  {
    label: 'Y',
    key: 'layout.y',
    type: 'number',
    span: 12,
  },
]
const active = ref('node')
</script>

<template>
  <div class="node-property">
    <el-collapse v-model="active" accordion>
      <el-collapse-item title="布局属性" name="layout">
        <FormCreate :setters="layoutSetters" :formData="selectedNode" />
      </el-collapse-item>
      <el-collapse-item title="组件属性" name="node">
        <FormCreate :setters="setters" :formData="selectedNode" />
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<style scoped lang="scss">
.node-property {
  :deep(.el-collapse) {
    --el-collapse-border-color: var(--border-color);
    --el-collapse-header-height: 48px;
    --el-collapse-header-bg-color: transparent;
    --el-collapse-header-text-color: var(--el-text-color-primary);
    --el-collapse-header-font-size: 13px;
    --el-collapse-content-bg-color: transparent;
    --el-collapse-content-font-size: 13px;
    --el-collapse-content-text-color: var(--el-text-color-primary);
    border-top: 1px solid var(--el-collapse-border-color);
    border-bottom: 1px solid var(--el-collapse-border-color);
    .el-collapse-item__title {
      padding-left: 20px;
    }
  }
}
</style>
