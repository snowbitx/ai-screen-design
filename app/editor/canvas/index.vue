<script setup lang="ts">
import { createNode, getMaterialComponent } from '@/materials'
import type { CSSProperties } from 'vue'
import Selecto from 'vue3-selecto'
import Moveable from 'vue3-moveable'
import SketchRuler from 'vue3-sketch-ruler'
import 'vue3-sketch-ruler/lib/style.css'
import { useEditorStore } from '@/stores/editor.ts'
import { storeToRefs } from 'pinia'
import type { MaterialSchema } from '@shared/schema/material.ts'
import { useCanvasRuler } from '@/editor/canvas/composables/useCanvasRuler.ts'
import { useMoveable } from '@/editor/canvas/composables/useMoveable.ts'
import { useSelection } from '@/editor/canvas/composables/useSelection.ts'
defineOptions({
  name: 'CanvasRoot',
})

const editorStore = useEditorStore()
// storeToRefs只能解构属性，方法必须手动取
const { nodes } = storeToRefs(editorStore)

const canvasRootRef = useTemplateRef('canvasRoot')
const moveableRef = useTemplateRef('moveable')
const stageRef = useTemplateRef('stage')
const {
  canvasWidth,
  canvasHeight,
  canvasStyle,
  rectHeight,
  rectWidth,
  lines,
  scale,
  palette,
  onZoomChange,
} = useCanvasRuler({ canvasRootRef, moveableRef })

const { onDrag, onDragGroup, onResize, onResizeGroup, onStart, onEnd } = useMoveable(moveableRef)

const { selectedTarget, onSelectEnd, onSelect, onClearSelected } = useSelection({
  moveableRef,
  stageRef,
})

function onDrop(e: DragEvent) {
  const data = e.dataTransfer?.getData('schema')
  if (!data) return
  const node = createNode(JSON.parse(data))
  // 拖过来时更新坐标
  node.layout.x = e.offsetX - node.layout.width / 2
  node.layout.y = e.offsetY - node.layout.height / 2
  editorStore.addNode(node)
  // 拖放过来立即选中,此时node还没渲染出来 所以target要通过css取dom上的节点
  editorStore.selectNode(node.id)
}

// 移动：改css  left top
// 尺寸：改css width height

function getNodeStyle(node: MaterialSchema, index: number): CSSProperties {
  return {
    width: node.layout.width + 'px',
    height: node.layout.height + 'px',
    left: node.layout.x + 'px',
    top: node.layout.y + 'px',
    // 图层
    zIndex: index + 1,
  }
}

const commandMap = {
  copy: () => editorStore.copyNode(editorStore.selectedNode),
  remove: () => editorStore.removeNode(editorStore.selectedNode),
  // 颠倒是因为视觉上 物料反转了
  moveBottom: () => editorStore.moveTop(editorStore.selectedNode),
  moveTop: () => editorStore.moveBottom(editorStore.selectedNode),
  toggleLock: () => {
    editorStore.toggleLock(editorStore.selectedNode)
    // 单选右键锁定后不展示框选状态
    selectedTarget.value = []
  },
}

// 组件节点右键菜单
function onCommand(command: string) {
  commandMap[command]()
}
</script>

<template>
  <div class="canvas-root" ref="canvasRoot">
    <!--
      stage 放回 SketchRuler 默认插槽（canvasedit 容器）：
      缩放/居中由库内 panzoom 接管（对齐线上参考站的行为）。
      注意不要给 stage 绑会频繁变化的 :key——插槽内容重建会让
      panzoom 与 DOM 脱钩，缩放后拖放全部失效。
    -->
    <SketchRuler
      v-model:scale="scale"
      :thick="20"
      :palette="palette"
      :width="rectWidth"
      :height="rectHeight"
      :canvasWidth="canvasWidth"
      :canvasHeight="canvasHeight"
      :lines="lines"
      @zoomchange="onZoomChange"
    >
      <!--    画布台-->
      <div
        ref="stage"
        class="canvas-stage"
        :style="canvasStyle"
        @dragover.prevent
        @drop="onDrop"
        @mousedown.self="onClearSelected"
      >
        <!--        给节点加右键菜单-->
        <el-dropdown
          v-for="(node, index) in nodes"
          :key="node.id"
          trigger="contextmenu"
          @command="onCommand"
        >
          <div
            class="canvas-node"
            :style="getNodeStyle(node, index)"
            :data-node-id="node.id"
            :data-node-locked="node.locked"
            @mousedown="onSelect(node, $event)"
          >
            <component :is="getMaterialComponent(node.type)" :schema="node"></component>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="copy">复制</el-dropdown-item>
              <el-dropdown-item command="remove">移除</el-dropdown-item>
              <el-dropdown-item command="moveTop">置顶</el-dropdown-item>
              <el-dropdown-item command="moveBottom">置底</el-dropdown-item>
              <el-dropdown-item command="toggleLock">{{
                node.locked ? '解锁' : '锁定'
              }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </SketchRuler>

    <!--    框选组件 和moveable为同一个作者-->
    <!--    container拖拽的框要挂在哪个节点下，挂到画布上面-->

    <!--    加v-if是避免在所有容器都可以框选：挂载时stageRef为undefined-->
    <!--    selectedFromInside 选中节点的时候也可以触发选区-->
    <Selecto
      v-if="stageRef"
      :container="stageRef"
      :dragContainer="stageRef"
      :selectedFromInside="false"
      :toggleContinueSelect="'shift'"
      :selectableTargets="['.canvas-node']"
      @selectEnd="onSelectEnd"
    />
    <!--    节点移动缩放组件-->
    <Moveable
      ref="moveable"
      :target="selectedTarget"
      :draggable="true"
      :resizable="true"
      :origin="false"
      @drag="onDrag"
      @dragStart="onStart"
      @dragEnd="onEnd"
      @dragGroup="onDragGroup"
      @dragGroupStart="onStart"
      @dragGroupEnd="onEnd"
      @resize="onResize"
      @resizeGroup="onResizeGroup"
      @resizeStart="onStart"
      @resizeEnd="onEnd"
      @resizeGroupStart="onStart"
      @resizeGroupEnd="onEnd"
    ></Moveable>
  </div>
</template>

<style scoped lang="scss">
.canvas-root {
  position: relative;
  overflow: hidden;
  // 画布台底色：与画布同底但由标尺库的 canvasedit-parent 渲染，
  // 画布靠投影区分边界（对齐参考站做法）
  background: var(--muted);
  //创建新的层级上下文 只在当前canvas-root下生效
  isolation: isolate;
  // stage 在 SketchRuler 的 canvasedit 插槽内，缩放/居中交给库管理
  .canvas-stage {
    transform-origin: 0 0;
    // 画布边界：投影让画布从工作区里"浮"出来（参考站同款单层投影）
    box-shadow: 0 2px 16px color-mix(in srgb, var(--foreground) 12%, transparent);
    .canvas-node {
      position: absolute;
    }
  }
}
</style>
