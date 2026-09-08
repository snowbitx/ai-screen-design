<script setup lang="ts">
import { useEditorStore } from '@/stores/editor.ts'
import { storeToRefs } from 'pinia'

defineOptions({
  name: 'DataSource',
})

const editorStore = useEditorStore()

const { dataSources, selectedNode } = storeToRefs(editorStore)
</script>

<template>
  <el-form class="px-20">
    <el-form-item label="数据源">
      <el-select v-model="selectedNode.dataId" placeholder="请选择数据源">
        <el-option
          v-for="item in dataSources"
          :key="item.id"
          :label="item.name"
          :value="item.id"
        ></el-option>
      </el-select>
    </el-form-item>
  </el-form>
</template>

<style scoped lang="scss"></style>
