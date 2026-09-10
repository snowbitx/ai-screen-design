import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-09-08',
  devtools: { enabled: true },

  modules: ['@pinia/nuxt', ['@element-plus/nuxt', { cache: true }]],

  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      title: 'AI Screen Design',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },

  css: ['~/assets/main.css'],

  // Agent Server 的 LLM 配置，通过环境变量注入：
  // NUXT_AI_PROVIDER / NUXT_AI_MODEL / NUXT_AI_BASE_URL / NUXT_AI_API_KEY
  runtimeConfig: {
    ai: {
      provider: 'moonshotai',
      model: 'kimi-k2-0905-preview',
      baseUrl: '',
      apiKey: '',
    },
  },

  alias: {
    // 存量代码都用 @/xxx 导入，保持不变
    '@': fileURLToPath(new URL('./app', import.meta.url)),
    // schema 放在 shared/ 供 app 和 server 共用类型
    '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
  },

  // 原 tsconfig 的 strict: false；存量代码大量依赖隐式 any，先对齐，后续可逐步开启
  typescript: {
    strict: false,
    typeCheck: false,
  },

  vite: {
    plugins: [tailwindcss()],
    css: {
      preprocessorOptions: {
        scss: {
          // scss变量规范写法，否则不生效，在这里预处理会在每个模板中预加载
          additionalData: `@use '@/assets/css/functions.scss' as *;`,
        },
      },
    },
  },

  routeRules: {
    '/': { redirect: '/editor' },
    // 编辑器/预览依赖大量浏览器 API（monaco、moveable、Pinia 内存态），关掉 SSR
    '/editor': { ssr: false },
    '/preview': { ssr: false },
    // 发布页数据由 server/api 提供，走真 SSR
    '/screen': { ssr: true },
  },
})
