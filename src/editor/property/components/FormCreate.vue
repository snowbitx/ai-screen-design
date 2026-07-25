<script setup lang="ts">
import { getValue } from '@/utils'
import { ElColorPicker, ElInput, ElInputNumber } from 'element-plus'
import { useUndoRedo } from '@/editor/useUndoRedo.ts'
defineProps(['setters', 'formData'])
defineOptions({
  name: 'FormCreate',
})
const componentMap = {
  input: ElInput,
  number: (props) => h(ElInputNumber, { precision: 0, ...props }),
  color: ElColorPicker,
}

const { applyChange } = useUndoRedo()
</script>

<template>
  <el-form class="p-20" size="small" label-width="60px">
    <el-row>
      <el-col v-for="item in setters" :key="item.key" :span="item.span || 24">
        <el-form-item :label="item.label">
          <component
            :is="componentMap[item.type]"
            :modelValue="getValue(formData, item.key)"
            @update:modelValue="(val) => applyChange(formData, item.key, val)"
          />
        </el-form-item>
      </el-col>
    </el-row>
  </el-form>
</template>

<style scoped lang="scss"></style>
