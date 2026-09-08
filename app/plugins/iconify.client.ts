import { Icon } from '@iconify/vue'

// 原 main.ts 里 app.component('Icon', Icon) 的等价实现：
// 插件里 nuxtApp.vueApp.app.component 即全局注册，.client.ts 保证只在浏览器端执行
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('Icon', Icon)
})
