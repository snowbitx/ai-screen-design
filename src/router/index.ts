import { createRouter, createWebHistory } from 'vue-router'
import ScreenEditor from '@/editor/index.vue'
import ScreenPreview from '@/pages/preview/index.vue'
import ScreenPage from '@/pages/screen/index.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/editor',
    },
    {
      path: '/editor',
      component: ScreenEditor,
    },
    {
      path: '/preview',
      component: ScreenPreview,
    },
    {
      path: '/screen',
      alias: '/Screen',
      component: ScreenPage,
    },
  ],
})

export default router
