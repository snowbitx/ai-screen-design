import { debounce } from '@/util'
import { useEditorStore } from '@/stores/editor.ts'
import { storeToRefs } from 'pinia'

export function useCanvasRuler({ moveableRef, canvasRootRef }) {
  const editorStore = useEditorStore()
  // storeToRefs只能解构属性，方法必须手动取
  const { canvas } = storeToRefs(editorStore)
  const palette = {
    bgColor: '#1f2937',
    longfgColor: '#6b7280',
    fontColor: '#9ca3af',
    fontShadowColor: '#0e8da7',
    shadowColor: 'rgba(14, 141, 167, 0.14)',
    lineColor: '#22c55e',
    lineType: 'solid',
    lockLineColor: '#4b5563',
    borderColor: '#374151',
    hoverBg: '#111827',
    hoverColor: '#ffffff',
  }

  const lines = ref({ h: [], v: [] })
  const scale = ref(1)
  const rectWidth = ref(1000)
  const rectHeight = ref(800)
  const canvasWidth = toRef(canvas.value, 'width')
  const canvasHeight = toRef(canvas.value, 'height')
  const canvasStyle = computed(() => {
    return {
      width: canvasWidth.value + 'px',
      height: canvasHeight.value + 'px',
      backgroundColor: canvas.value.backgroundColor,
    }
  })

  function onZoomChange() {
    // 缩放和拖动画布时更新moveable中节点的位置
    moveableRef.value.updateRect()
  }

  const onRootResize = debounce((rect) => {
    rectWidth.value = rect.width
    rectHeight.value = rect.height
  }, 300)

  onMounted(() => {
    const { width, height } = canvasRootRef.value.getBoundingClientRect()
    rectWidth.value = width
    rectHeight.value = height
    // 监听尺寸变化 当画布变更时更新标尺
    const ob = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect
      onRootResize(rect)
    })
    ob.observe(canvasRootRef.value)
    onUnmounted(() => {
      ob.disconnect()
    })
  })
  return {
    canvasWidth,
    canvasHeight,
    canvasStyle,
    rectWidth,
    rectHeight,
    lines,
    scale,
    palette,
    onZoomChange,
  }
}
