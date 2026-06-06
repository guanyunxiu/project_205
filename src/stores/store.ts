import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Store } from '@/types'
import { storeApi } from '@/api'
import { showSuccess, showError } from '@/utils'

export const useStoreStore = defineStore('store', () => {
  const stores = ref<Store[]>([])
  const currentStore = ref<Store | null>(null)
  const loading = ref(false)

  async function loadStores() {
    try {
      loading.value = true
      stores.value = await storeApi.list()
      if (stores.value.length > 0 && !currentStore.value) {
        currentStore.value = stores.value[0]
      }
    } catch (error) {
      showError('加载门店列表失败')
    } finally {
      loading.value = false
    }
  }

  async function createStore(data: Omit<Store, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const result = await storeApi.create(data)
      stores.value.push(result as Store)
      showSuccess('门店创建成功')
      return true
    } catch (error) {
      showError('创建门店失败')
      return false
    }
  }

  async function updateStore(id: number, data: Partial<Store>) {
    try {
      const result = await storeApi.update(id, data)
      const index = stores.value.findIndex(s => s.id === id)
      if (index !== -1) {
        stores.value[index] = result as Store
      }
      if (currentStore.value?.id === id) {
        currentStore.value = result as Store
      }
      showSuccess('门店更新成功')
      return true
    } catch (error) {
      showError('更新门店失败')
      return false
    }
  }

  async function deleteStore(id: number) {
    try {
      await storeApi.delete(id)
      stores.value = stores.value.filter(s => s.id !== id)
      if (currentStore.value?.id === id) {
        currentStore.value = stores.value[0] || null
      }
      showSuccess('门店删除成功')
      return true
    } catch (error) {
      showError('删除门店失败')
      return false
    }
  }

  function setCurrentStore(store: Store) {
    currentStore.value = store
  }

  return {
    stores,
    currentStore,
    loading,
    loadStores,
    createStore,
    updateStore,
    deleteStore,
    setCurrentStore
  }
})
