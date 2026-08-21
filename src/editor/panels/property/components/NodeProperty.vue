<script setup lang="ts">
import { useEditorStore } from '@/stores/editor.ts'
import { storeToRefs } from 'pinia'
import { getMaterialSetters } from '@/materials'
import FormCreate from '@/editor/panels/property/components/FormCreate.vue'
import MonacoEditor from '@/components/MonacoEditor/index.vue'
import DataSource from '@/editor/panels/property/components/DataSource.vue'

defineOptions({
  name: 'NodeProperty',
})
// 不同物料有不同的配置，所以节点属性配置需要动态表单（物料注册时加载配置）

const editorStore = useEditorStore()
const { selectedNode } = storeToRefs(editorStore)
console.log('selectedNode ==> ', selectedNode)
const setters = computed(() => {
  return getMaterialSetters(selectedNode.value.type)
})
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
const activeTab = ref('property')
const active = ref('node')
const jsonVisible = ref(false)
const jsonText = ref('')
function previewJson() {
  jsonText.value = JSON.stringify(selectedNode.value, null, 2)
  jsonVisible.value = true
}

function onConfirm() {
  // 拿到新节点
  const newNode = JSON.parse(jsonText.value)
  // 更新
  editorStore.updateNode(selectedNode.value.id, {
    ...newNode,
    // id type 不能改，沿用之前的
    id: selectedNode.value.id,
    type: selectedNode.value.type,
  })
  // 关掉抽屉
  jsonVisible.value = false
}
</script>

<template>
  <div class="node-property">
    <div class="node-title">
      <span>{{ selectedNode.name }}</span>
      <div class="flex gap-20">
        <!--        <span class="cursor-pointer" @click="eventVisible = true">-->
        <!--          <Icon icon="codicon:symbol-event"></Icon>-->
        <!--        </span>-->
        <span class="cursor-pointer" @click="previewJson">
          <Icon icon="si:json-duotone"></Icon>
        </span>
      </div>
    </div>
    <el-tabs v-model="activeTab" stretch>
      <el-tab-pane label="属性" name="property">
        <el-collapse v-model="active" accordion>
          <el-collapse-item title="布局属性" name="layout">
            <form-create :setters="layoutSetters" :formData="selectedNode"></form-create>
          </el-collapse-item>
          <el-collapse-item title="组件属性" name="node">
            <form-create :setters="setters" :formData="selectedNode"></form-create>
          </el-collapse-item>
        </el-collapse>
      </el-tab-pane>
      <el-tab-pane label="数据源" name="data-source">
        <DataSource />
      </el-tab-pane>
    </el-tabs>

    <el-drawer :destroy-on-close="true" v-model="jsonVisible" title="编辑 JSON" size="800">
      <MonacoEditor v-model="jsonText" />

      <template #footer>
        <el-button @click="jsonVisible = false">取消</el-button>
        <el-button type="primary" @click="onConfirm">确认</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped lang="scss">
.node-property {
  .node-title {
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: bg-mix(40);
    font-weight: 600;
    padding: 0 20px;
  }
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
