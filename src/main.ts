import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/user'
import { useStoreStore } from './stores/store'
import './styles/global.scss'

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

const pinia = createPinia()
app.use(pinia)

const userStore = useUserStore()
userStore.restoreSession()

const storeStore = useStoreStore()
if (userStore.isLoggedIn) {
  storeStore.loadStores()
}

app.use(router)
app.use(ElementPlus)

app.mount('#app')
