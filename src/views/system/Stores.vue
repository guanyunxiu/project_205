<template>
  <div class="stores">
    <div class="page-header">
      <h2 class="page-title">
        <el-icon :size="24"><OfficeBuilding /></el-icon>
        门店管理
      </h2>
      <p class="page-desc">管理系统中的所有门店信息</p>
    </div>

    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="请输入门店名称或地址"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
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
          <span class="card-title">门店列表</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增门店
          </el-button>
        </div>
      </template>

      <el-table
        :data="filteredStores"
        style="width: 100%"
        v-loading="loading"
        empty-text="暂无门店数据"
        stripe
      >
        <el-table-column prop="name" label="门店名称" min-width="150" />
        <el-table-column prop="address" label="地址" min-width="250" show-overflow-tooltip />
        <el-table-column prop="phone" label="电话" width="140" />
        <el-table-column prop="contact" label="联系人" width="120" />
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
      :title="isEdit ? '编辑门店' : '新增门店'"
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
        class="store-form"
      >
        <el-form-item label="门店名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入门店名称" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <el-input
            v-model="form.address"
            type="textarea"
            :rows="3"
            placeholder="请输入门店地址"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入联系电话" maxlength="20" />
        </el-form-item>
        <el-form-item label="联系人" prop="contact">
          <el-input v-model="form.contact" placeholder="请输入联系人姓名" maxlength="20" />
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
  OfficeBuilding,
  Search,
  Refresh,
  Plus,
  Edit,
  Delete
} from '@element-plus/icons-vue'
import { storeApi } from '@/api'
import { formatDate, showSuccess, showError, confirm } from '@/utils'
import type { Store } from '@/types'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const stores = ref<Store[]>([])

const searchForm = reactive({
  keyword: ''
})

const form = reactive({
  name: '',
  address: '',
  phone: '',
  contact: ''
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入门店名称', trigger: 'blur' },
    { max: 50, message: '门店名称不能超过50个字符', trigger: 'blur' }
  ],
  address: [
    { required: true, message: '请输入门店地址', trigger: 'blur' },
    { max: 200, message: '地址不能超过200个字符', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { max: 20, message: '电话不能超过20个字符', trigger: 'blur' }
  ],
  contact: [
    { required: true, message: '请输入联系人姓名', trigger: 'blur' },
    { max: 20, message: '联系人姓名不能超过20个字符', trigger: 'blur' }
  ]
}

const filteredStores = computed(() => {
  if (!searchForm.keyword) {
    return stores.value
  }
  const keyword = searchForm.keyword.toLowerCase()
  return stores.value.filter(
    store =>
      store.name.toLowerCase().includes(keyword) ||
      store.address.toLowerCase().includes(keyword)
  )
})

async function loadStores() {
  loading.value = true
  try {
    stores.value = await storeApi.list()
  } catch (error) {
    showError('加载门店列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  // 搜索逻辑通过 computed 自动过滤
}

function handleReset() {
  searchForm.keyword = ''
}

function handleAdd() {
  isEdit.value = false
  editingId.value = null
  form.name = ''
  form.address = ''
  form.phone = ''
  form.contact = ''
  dialogVisible.value = true
}

function handleEdit(row: Store) {
  isEdit.value = true
  editingId.value = row.id
  form.name = row.name
  form.address = row.address
  form.phone = row.phone
  form.contact = row.contact
  dialogVisible.value = true
}

async function handleDelete(row: Store) {
  const confirmed = await confirm(`确定要删除门店"${row.name}"吗？此操作不可撤销。`, '删除确认')
  if (!confirmed) return

  try {
    await storeApi.delete(row.id)
    stores.value = stores.value.filter(s => s.id !== row.id)
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
      await storeApi.update(editingId.value, { ...form })
      const index = stores.value.findIndex(s => s.id === editingId.value)
      if (index !== -1) {
        stores.value[index] = { ...stores.value[index], ...form }
      }
      showSuccess('更新成功')
    } else {
      const result = await storeApi.create({ ...form })
      stores.value.push(result as Store)
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
  loadStores()
})
</script>

<style scoped lang="scss">
.stores {
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

  .store-form {
    padding-right: 20px;
  }
}
</style>
