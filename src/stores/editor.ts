import { defineStore } from 'pinia'

export const useEditorStore = defineStore('editor', () => {
  const panelVisible = reactive({
    material: true,
    layer: true,
    property: true,
  })
  return {
    panelVisible: panelVisible,
  }
})
