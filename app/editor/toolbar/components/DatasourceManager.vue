<script setup lang="ts">
import { useEditorStore } from '@/stores/editor.ts'
import { storeToRefs } from 'pinia'
import MonacoEditor from '@/components/MonacoEditor/index.vue'
import { deepClone } from '@/utils'
import { fetchData } from '@/composables/useDataSource.ts'

defineOptions({
  name: 'DatasourceManager',
})

const editorStore = useEditorStore()
const { dataSources } = storeToRefs(editorStore)
/**
 * 深拷贝数据,params和data需要转为字符串
 */
const data = ref(
  deepClone(dataSources.value).map((item) => {
    return {
      ...item,
      data: item.data ? JSON.stringify(item.data, null, 2) : undefined,
      params: item.params ? JSON.stringify(item.params, null, 2) : undefined,
    }
  }),
)
const responseText = ref()
const activeSource = ref()
function selectDataSource(source) {
  activeSource.value = source
}

function onAdd() {
  // 新增数据源
  data.value.push({
    id: crypto.randomUUID(),
    name: '未命名',
    type: 'static',
    data: '',
    params: '{}',
  })
  // 寻中当前新增的
  selectDataSource(data.value.at(-1))
}

function removeDataSource(id: string) {
  data.value = data.value.filter((item) => item.id !== id)
  selectDataSource(null)
}

function onRequest() {
  fetchData({
    ...activeSource.value,
    params: activeSource.value.params ? JSON.parse(activeSource.value.params) : undefined,
  }).then((res) => {
    responseText.value = JSON.stringify(res, null, 2)
  })
}

defineExpose({
  save() {
    // 更新页面数据源
    editorStore.page.dataSources = deepClone(data.value).map((item) => {
      return {
        ...item,
        data: item.data ? JSON.parse(item.data) : undefined,
        params: item.params ? JSON.parse(item.params) : undefined,
      }
    })
  },
})
</script>

<template>
  <div class="data-source-container">
    <div class="data-source-sidebar">
      <el-button @click="onAdd" type="primary" size="small">新增</el-button>
      <div
        class="data-source-item"
        :class="{ active: item.id === activeSource?.id }"
        v-for="item in data"
        :key="item.id"
        @click="selectDataSource(item)"
      >
        <span>{{ item.name }}</span>
        <!--        事件冒泡了 不加stop会自动选中-->
        <span @click.stop="removeDataSource(item.id)"> <Icon icon="mdi:remove"></Icon></span>
      </div>
    </div>
    <div class="data-source-content">
      <el-form v-if="activeSource">
        <el-form-item label="名称">
          <el-input v-model="activeSource.name"></el-input>
        </el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="activeSource.type">
            <el-radio-button label="静态" value="static"></el-radio-button>
            <el-radio-button label="API" value="api"></el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="数据" v-if="activeSource.type === 'static'">
          <monaco-editor v-model="activeSource.data"></monaco-editor>
        </el-form-item>
        <div v-else>
          <!--     API 数据源     -->
          <el-form-item label="请求地址">
            <el-input v-model="activeSource.url"></el-input>
          </el-form-item>
          <el-form-item label="请求方法">
            <el-radio-group v-model="activeSource.method">
              <el-radio-button label="GET" value="get"></el-radio-button>
              <el-radio-button label="POST" value="post"></el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="轮训周期">
            <el-input v-model="activeSource.interval"></el-input>
          </el-form-item>
          <el-form-item label="参数">
            <monaco-editor v-model="activeSource.params"></monaco-editor>
          </el-form-item>
          <el-form-item label="响应路径">
            <el-input v-model="activeSource.responsePath"></el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="onRequest">请求预览</el-button>
          </el-form-item>
          <el-form-item label="预览数据">
            <MonacoEditor v-model="responseText"></MonacoEditor>
          </el-form-item>
        </div>
      </el-form>
    </div>
  </div>
</template>

<style scoped lang="scss">
.data-source-container {
  display: flex;
  gap: 20px;
  height: 600px;
  .data-source-sidebar {
    width: 200px;
    flex: none;
    overflow: auto;
    border: 1px solid var(--border-color);
    padding: 10px;
    .data-source-item {
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
  .data-source-content {
    flex: 1;
    border: 1px solid var(--border-color);
    padding: 10px;
    overflow: auto;
  }
}
</style>
