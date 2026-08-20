import { createRouter, createWebHistory } from 'vue-router'
import ScreenEditor from '@/editor/index.vue'
import ScreenPreview from '@/pages/preview/index.vue'

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
  ],
})

export default router
