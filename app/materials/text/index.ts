import TextMaterial from './component.vue'
import { textMaterial } from '@shared/materials/text.ts'

export function install(regisiter) {
  regisiter(textMaterial, TextMaterial)
}
