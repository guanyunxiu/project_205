import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import { authApi } from '@/api'
import { showSuccess, showError } from '@/utils'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const token = ref<string>('')

  const isLoggedIn = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isTechnician = computed(() => user.value?.role === 'technician')
  const isReception = computed(() => user.value?.role === 'reception')

  async function login(username: string, password: string): Promise<boolean> {
    try {
      const result = await authApi.login(username, password)
      if (result.success) {
        user.value = result.user
        token.value = btoa(JSON.stringify(result.user))
        localStorage.setItem('auto_repair_user', JSON.stringify(result.user))
        localStorage.setItem('auto_repair_token', token.value)
        showSuccess('登录成功')
        return true
      } else {
        showError(result.message || '登录失败')
        return false
      }
    } catch (error) {
      showError('登录异常')
      return false
    }
  }

  function logout() {
    user.value = null
    token.value = ''
    localStorage.removeItem('auto_repair_user')
    localStorage.removeItem('auto_repair_token')
  }

  function restoreSession() {
    const savedUser = localStorage.getItem('auto_repair_user')
    const savedToken = localStorage.getItem('auto_repair_token')
    if (savedUser && savedToken) {
      try {
        user.value = JSON.parse(savedUser)
        token.value = savedToken
      } catch {
        logout()
      }
    }
  }

  return {
    user,
    token,
    isLoggedIn,
    isAdmin,
    isTechnician,
    isReception,
    login,
    logout,
    restoreSession
  }
})
