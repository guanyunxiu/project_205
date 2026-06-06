<template>
  <el-container class="main-container">
    <el-aside width="220px" class="sidebar">
      <div class="logo">
        <el-icon :size="28" color="#409EFF">
          <Tools />
        </el-icon>
        <span class="title">汽修维保管理</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        class="menu"
        background-color="#1f2d3d"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item
          v-for="item in filteredMenus"
          :key="item.path"
          :index="item.path"
        >
          <el-icon>
            <component :is="item.meta.icon" />
          </el-icon>
          <template #title>{{ item.meta.title }}</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-dropdown
            v-if="storeStore.stores.length > 0"
            @command="handleStoreChange"
          >
            <span class="store-info">
              <el-icon :size="16"><OfficeBuilding /></el-icon>
              <span>{{ storeStore.currentStore?.name || '请选择门店' }}</span>
              <el-icon :size="12"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="store in storeStore.stores"
                  :key="store.id"
                  :command="store"
                >
                  {{ store.name }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>

        <div class="header-right">
          <el-dropdown @command="handleUserCommand">
            <span class="user-info">
              <el-avatar :size="32" :icon="UserFilled" />
              <span class="user-name">{{ userStore.user?.name }}</span>
              <el-tag size="small" :type="roleTagType">
                {{ RoleMap[userStore.user?.role || 'admin'] }}
              </el-tag>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>
                  个人信息
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Tools,
  OfficeBuilding,
  ArrowDown,
  UserFilled,
  User,
  SwitchButton
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useStoreStore } from '@/stores/store'
import { RoleMap } from '@/types'
import type { RouteRecordRaw } from 'vue-router'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const storeStore = useStoreStore()

const activeMenu = computed(() => route.path)

const filteredMenus = computed(() => {
  const mainRoute = router.options.routes.find(
    (r: RouteRecordRaw) => r.path === '/'
  )
  if (!mainRoute?.children) return []

  return mainRoute.children
    .filter((child: RouteRecordRaw) => {
      if (child.meta?.hidden) return false
      const roles = child.meta?.roles as string[] | undefined
      if (roles && userStore.user?.role) {
        return roles.includes(userStore.user.role)
      }
      return true
    })
    .map((child: RouteRecordRaw) => ({
      path: `/${child.path}`,
      meta: child.meta
    }))
})

const roleTagType = computed(() => {
  const role = userStore.user?.role
  if (role === 'admin') return 'danger'
  if (role === 'technician') return 'warning'
  return 'primary'
})

function handleStoreChange(store: any) {
  storeStore.setCurrentStore(store)
  ElMessage.success(`已切换到 ${store.name}`)
}

async function handleUserCommand(command: string) {
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      userStore.logout()
      router.push('/login')
      ElMessage.success('已退出登录')
    } catch {
      // 用户取消
    }
  } else if (command === 'profile') {
    ElMessage.info('个人信息功能开发中')
  }
}

onMounted(() => {
  if (userStore.isLoggedIn && storeStore.stores.length === 0) {
    storeStore.loadStores()
  }
})
</script>

<style scoped lang="scss">
.main-container {
  height: 100vh;
}

.sidebar {
  background-color: #1f2d3d;
  display: flex;
  flex-direction: column;

  .logo {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: #fff;
    background-color: #18222e;
    border-bottom: 1px solid #2d3e50;

    .title {
      font-size: 18px;
      font-weight: 600;
    }
  }

  .menu {
    flex: 1;
    border-right: none;
  }
}

.header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;

  .header-left {
    .store-info {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      color: #606266;
      padding: 6px 12px;
      border-radius: 4px;
      transition: background-color 0.2s;

      &:hover {
        background-color: #f5f7fa;
      }
    }
  }

  .header-right {
    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      padding: 6px 12px;
      border-radius: 4px;
      transition: background-color 0.2s;

      &:hover {
        background-color: #f5f7fa;
      }

      .user-name {
        color: #303133;
        font-weight: 500;
      }
    }
  }
}

.main {
  background-color: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}
</style>
