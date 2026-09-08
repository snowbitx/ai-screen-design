<script setup lang="ts">
import { Icon } from '@iconify/vue'
import MonacoEditor from '@/components/MonacoEditor/index.vue'
import { useEditorStore } from '@/stores/editor.ts'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import DatasourceManager from '@/editor/toolbar/components/DatasourceManager.vue'
import { useRouter } from 'vue-router'
import { publishPage } from '@/utils/publish.ts'

defineOptions({
  name: 'ToolbarRight',
})

const router = useRouter()
const editorStore = useEditorStore()
const { page } = storeToRefs(editorStore)
const visible = ref(false)
const dataSourceVisible = ref(false)
const dataSourceManagerRef = useTemplateRef('dataSourceManagerRef')

const jsonText = ref('')

function previewJson() {
  visible.value = true
  jsonText.value = JSON.stringify(page.value, null, 2)
}

function onConfirm() {
  const newPage = JSON.parse(jsonText.value)
  editorStore.setPage(newPage)
  visible.value = false
}

function onExport() {
  const json = JSON.stringify(page.value, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'screen-design.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

const inputRef = useTemplateRef('inputRef')

async function onFileChange(e) {
  const file: File = e.target.files[0]
  if (!file) return
  const text = await file.text()
  try {
    const newPage = JSON.parse(text)
    editorStore.setPage(newPage)
    ElMessage.success('导入成功')
  } catch {
    ElMessage.error('请检查json是否合法')
  }
}
function onImport() {
  inputRef.value.click()
}

function openDataSource() {
  dataSourceVisible.value = true
}

function onSave() {
  // 调用 DataSourceManager 中暴漏的方法
  dataSourceManagerRef.value.save()
  dataSourceVisible.value = false
}

function onPreview() {
  router.push('/preview')
}

async function onPublish() {
  try {
    const id = await publishPage(page.value)
    router.push(`/screen?id=${id}`)
  } catch {
    ElMessage.error('发布失败，请重试')
  }
}
</script>

<template>
  <div class="flex gap-20 toolbar-right justify-end">
    <span @click="onPreview">
      <Icon icon="material-symbols:preview"></Icon>
    </span>
    <span @click="previewJson">
      <Icon icon="codicon:json"> </Icon>
    </span>
    <span @click="onPublish">
      <Icon icon="fluent-mdl2:web-publish"></Icon>
    </span>
    <span @click="openDataSource">
      <Icon icon="mdi:database"></Icon>
    </span>
    <span @click="onImport">
      <icon icon="mdi:import"></icon>
    </span>
    <span @click="onExport">
      <icon icon="mdi:export"></icon>
    </span>
    <input type="file" v-show="false" ref="inputRef" @change="onFileChange" />
    <el-drawer destroy-on-close title="编辑 JSON" size="800" v-model="visible">
      <MonacoEditor v-model="jsonText" />
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" @click="onConfirm">确认</el-button>
      </template>
    </el-drawer>
    <el-dialog destroy-on-close title="数据源配置" v-model="dataSourceVisible" width="800">
      <!--   数据源管理   -->
      <DatasourceManager ref="dataSourceManagerRef"></DatasourceManager>
      <template #footer>
        <el-button @click="dataSourceVisible = false">取消</el-button>
        <el-button @click="onSave" type="primary">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.toolbar-right {
  span {
    border: 1px solid #3b465b;
    border-radius: 4px;
    cursor: pointer;
  }
}
</style>
