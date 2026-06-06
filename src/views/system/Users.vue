<template>
  <div class="users">
    <div class="page-header">
      <h2 class="page-title">
        <el-icon :size="24"><User /></el-icon>
        用户管理
      </h2>
      <p class="page-desc">管理系统中的所有用户账号</p>
    </div>

    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="请输入用户名或姓名"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="角色">
          <el-select
            v-model="searchForm.role"
            placeholder="全部角色"
            clearable
            style="width: 140px"
          >
            <el-option
              v-for="(label, value) in RoleMap"
              :key="value"
              :label="label"
              :value="value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="card-title">用户列表</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增用户
          </el-button>
        </div>
      </template>

      <el-table
        :data="filteredUsers"
        style="width: 100%"
        v-loading="loading"
        empty-text="暂无用户数据"
        stripe
      >
        <el-table-column prop="username" label="用户名" width="140" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column label="角色" width="120">
          <template #default="{ row }">
            <el-tag :type="getRoleTagType(row.role as UserType['role'])">
              {{ RoleMap[row.role as UserType['role']] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="所属门店" min-width="150">
          <template #default="{ row }">
            {{ getStoreName(row.store_id) }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button type="danger" link @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑用户' : '新增用户'"
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
        class="user-form"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" maxlength="20" show-word-limit />
        </el-form-item>
        <el-form-item v-if="!isEdit" label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            maxlength="20"
            show-password
          />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" maxlength="20" show-word-limit />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" placeholder="请选择角色" style="width: 100%">
            <el-option
              v-for="(label, value) in RoleMap"
              :key="value"
              :label="label"
              :value="value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="所属门店" prop="store_id">
          <el-select v-model="form.store_id" placeholder="请选择门店" style="width: 100%">
            <el-option
              v-for="store in stores"
              :key="store.id"
              :label="store.name"
              :value="store.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import {
  User,
  Search,
  Refresh,
  Plus,
  Edit,
  Delete
} from '@element-plus/icons-vue'
import { userApi, storeApi } from '@/api'
import { formatDate, showSuccess, showError, confirm } from '@/utils'
import { RoleMap, type User as UserType, type Store } from '@/types'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const users = ref<UserType[]>([])
const stores = ref<Store[]>([])

const searchForm = reactive({
  keyword: '',
  role: '' as UserType['role'] | ''
})

const form = reactive({
  username: '',
  password: '',
  name: '',
  role: '' as UserType['role'] | '',
  store_id: 0
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { max: 20, message: '用户名不能超过20个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6个字符', trigger: 'blur' },
    { max: 20, message: '密码不能超过20个字符', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { max: 20, message: '姓名不能超过20个字符', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ],
  store_id: [
    { required: true, message: '请选择门店', trigger: 'change' }
  ]
}

const filteredUsers = computed(() => {
  let result = users.value

  if (searchForm.keyword) {
    const keyword = searchForm.keyword.toLowerCase()
    result = result.filter(
      user =>
        user.username.toLowerCase().includes(keyword) ||
        user.name.toLowerCase().includes(keyword)
    )
  }

  if (searchForm.role) {
    result = result.filter(user => user.role === searchForm.role)
  }

  return result
})

function getStoreName(storeId: number): string {
  const store = stores.value.find(s => s.id === storeId)
  return store?.name || '-'
}

function getRoleTagType(role: UserType['role']): '' | 'success' | 'warning' | 'info' | 'primary' | 'danger' {
  const typeMap: Record<UserType['role'], '' | 'success' | 'warning' | 'info' | 'primary' | 'danger'> = {
    admin: 'danger',
    technician: 'primary',
    reception: 'success'
  }
  return typeMap[role] || 'info'
}

async function loadUsers() {
  loading.value = true
  try {
    users.value = await userApi.list()
  } catch (error) {
    showError('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

async function loadStores() {
  try {
    stores.value = await storeApi.list()
  } catch (error) {
    showError('加载门店列表失败')
  }
}

function handleSearch() {
  // 搜索逻辑通过 computed 自动过滤
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.role = ''
}

function handleAdd() {
  isEdit.value = false
  editingId.value = null
  form.username = ''
  form.password = ''
  form.name = ''
  form.role = ''
  form.store_id = stores.value[0]?.id || 0
  dialogVisible.value = true
}

function handleEdit(row: UserType) {
  isEdit.value = true
  editingId.value = row.id
  form.username = row.username
  form.password = ''
  form.name = row.name
  form.role = row.role
  form.store_id = row.store_id
  dialogVisible.value = true
}

async function handleDelete(row: UserType) {
  const confirmed = await confirm(`确定要删除用户"${row.name}"吗？此操作不可撤销。`, '删除确认')
  if (!confirmed) return

  try {
    await userApi.delete(row.id)
    users.value = users.value.filter(u => u.id !== row.id)
    showSuccess('删除成功')
  } catch (error) {
    showError('删除失败')
  }
}

async function handleSubmit() {
  if (!formRef.value) return

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (isEdit.value && editingId.value !== null) {
      const updateData = {
        username: form.username,
        name: form.name,
        role: form.role as UserType['role'],
        store_id: form.store_id
      }
      await userApi.update(editingId.value, updateData)
      const index = users.value.findIndex(u => u.id === editingId.value)
      if (index !== -1) {
        users.value[index] = { ...users.value[index], ...updateData }
      }
      showSuccess('更新成功')
    } else {
      const createData = {
        username: form.username,
        password: form.password,
        name: form.name,
        role: form.role as UserType['role'],
        store_id: form.store_id
      }
      await userApi.create(createData)
      await loadUsers()
      showSuccess('创建成功')
    }
    dialogVisible.value = false
  } catch (error) {
    showError(isEdit.value ? '更新失败' : '创建失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadStores().then(() => {
    loadUsers()
  })
})
</script>

<style scoped lang="scss">
.users {
  .page-header {
    margin-bottom: 20px;

    .page-title {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 0 4px;
      font-size: 20px;
      font-weight: 600;
      color: #303133;
    }

    .page-desc {
      margin: 0;
      color: #909399;
      font-size: 14px;
    }
  }

  .search-card {
    margin-bottom: 16px;

    :deep(.el-card__body) {
      padding: 16px 20px;
    }

    .search-form {
      margin-bottom: 0;
    }
  }

  .table-card {
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .card-title {
        font-weight: 600;
        color: #303133;
      }
    }

    :deep(.el-table) {
      font-size: 13px;
    }
  }

  .user-form {
    padding-right: 20px;
  }
}
</style>
