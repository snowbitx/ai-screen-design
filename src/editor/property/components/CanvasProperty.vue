<script setup lang="ts">
import { useEditorStore } from '@/stores/editor.ts'
import { storeToRefs } from 'pinia'

defineOptions({
  name: 'CanvasProperty',
})

const editorStore = useEditorStore()
const { canvas } = storeToRefs(editorStore)
</script>

<template>
  <div>
    <el-form class="p-20" size="small" label-width="60px">
      <el-form-item label="宽度">
        <el-input-number v-model="canvas.width"></el-input-number>
      </el-form-item>
      <el-form-item label="高度">
        <el-input-number v-model="canvas.height"></el-input-number>
      </el-form-item>
      <el-form-item label="背景色">
        <el-color-picker v-model="canvas.backgroundColor"></el-color-picker>
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped lang="scss"></style>
