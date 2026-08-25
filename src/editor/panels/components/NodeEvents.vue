<script setup lang="ts">
import { useEditorStore } from '@/stores/editor.ts'
import { storeToRefs } from 'pinia'
import MonacoEditor from '@/components/MonacoEditor/index.vue'
import { deepClone } from '@/utils'
import type { MaterialEvent } from '@/schema/material.ts'

/**
 * 从DataSource页面复制而来。事件配置和事件源配置结构相似
 */
defineOptions({
  name: 'NodeEvents',
})

const editorStore = useEditorStore()
const { selectedNode } = storeToRefs(editorStore)
/**
 * 深拷贝事件列表
 */
const data = ref(deepClone(selectedNode.value.events || []))
const activeEvent = ref()
function selectEvent(event: MaterialEvent) {
  activeEvent.value = event
}

function onAdd() {
  // 新增数据源
  data.value.push({
    title: '',
    name: '未命名',
    type: '',
    code: '',
  })
  // 寻中当前新增的
  selectEvent(data.value.at(-1))
}

function removeEvent(name: string) {
  data.value = data.value.filter((item) => item.name !== name)
  selectEvent(null)
}

defineExpose({
  save() {
    editorStore.updateNode(selectedNode.value.id, {
      ...selectedNode.value,
      events: data.value,
    })
  },
})
</script>

<template>
  <div class="node-event-container">
    <div class="node-event-sidebar">
      <el-button @click="onAdd" type="primary" size="small">新增</el-button>
      <div
        class="node-event-item"
        :class="{ active: item.name === activeEvent?.name }"
        v-for="item in data"
        :key="item.name"
        @click="selectEvent(item)"
      >
        <span>{{ item.title }}</span>
        <!--        事件冒泡了 不加stop会自动选中-->
        <span @click.stop="removeEvent(item.name)"> <Icon icon="mdi:remove"></Icon></span>
      </div>
    </div>
    <div class="node-event-content">
      <el-form v-if="activeEvent">
        <el-form-item label="标题">
          <el-input v-model="activeEvent.title"></el-input>
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="activeEvent.name"></el-input>
        </el-form-item>
        <el-form-item label="类型">
          <el-input v-model="activeEvent.type"></el-input>
        </el-form-item>
        <el-form-item label="函数体">
          <div class="flex w-full flex-col bg-[#1e1e1e]">
            <div class="flex-none pl-30">function{{ activeEvent.name }} ($context,$node)</div>
            <monaco-editor
              class="flex-1"
              v-model="activeEvent.code"
              lang="javascript"
            ></monaco-editor>
            <div class="flex-none pl-30">}</div>
          </div>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style scoped lang="scss">
.node-event-container {
  display: flex;
  gap: 20px;
  height: 600px;
  .node-event-sidebar {
    width: 200px;
    flex: none;
    overflow: auto;
    border: 1px solid var(--border-color);
    padding: 10px;
    .node-event-item {
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
      margin-top: 10px;
      background-color: bg-mix(80);
      cursor: pointer;
      &.active {
        background: var(--el-color-primary);
      }
    }
  }
  .node-event-content {
    flex: 1;
    border: 1px solid var(--border-color);
    padding: 10px;
    overflow: auto;
  }
}
</style>
