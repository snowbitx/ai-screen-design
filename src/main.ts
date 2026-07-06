import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import './styles/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'

import { Icon } from '@iconify/vue'
const app = createApp(App)

app.use(createPinia())
app.use(router)
app.component(Icon.name, Icon)
app.component('Icon', Icon)
app.mount('#app')
