<template>
  <div class="customers">
    <div class="page-header">
      <h2 class="page-title">
        <el-icon :size="24"><User /></el-icon>
        客户管理
      </h2>
      <p class="page-desc">管理系统中的所有客户信息</p>
    </div>

    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="请输入姓名或电话"
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
          <span class="card-title">客户列表</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增客户
          </el-button>
        </div>
      </template>

      <el-table
        :data="filteredCustomers"
        style="width: 100%"
        v-loading="loading"
        empty-text="暂无客户数据"
        stripe
      >
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="phone" label="电话" width="140" />
        <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button type="danger" link @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
            <el-button type="info" link @click="handleViewVehicles(row)">
              <el-icon><Van /></el-icon>
              查看车辆
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑客户' : '新增客户'"
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
        class="customer-form"
      >
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" maxlength="20" show-word-limit />
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入电话" maxlength="11" show-word-limit />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="vehiclesDialogVisible"
      :title="`${currentCustomerName} 的车辆列表`"
      width="900px"
      destroy-on-close
    >
      <el-table
        :data="customerVehicles"
        style="width: 100%"
        v-loading="vehiclesLoading"
        empty-text="该客户暂无车辆"
        stripe
      >
        <el-table-column prop="plate_number" label="车牌号" width="120" />
        <el-table-column prop="brand" label="品牌" width="100" />
        <el-table-column prop="model" label="车型" width="120" />
        <el-table-column prop="vin" label="VIN" width="180" show-overflow-tooltip />
        <el-table-column prop="frame_number" label="车架号" width="180" show-overflow-tooltip />
        <el-table-column prop="engine_number" label="发动机号" width="150" show-overflow-tooltip />
        <el-table-column prop="color" label="颜色" width="80" />
        <el-table-column prop="mileage" label="里程(km)" width="100" />
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="vehiclesDialogVisible = false">关闭</el-button>
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
  Delete,
  Van
} from '@element-plus/icons-vue'
import { customerApi } from '@/api'
import { formatDate, showSuccess, showError, confirm } from '@/utils'
import type { Customer, Vehicle } from '@/types'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const customers = ref<Customer[]>([])

const vehiclesDialogVisible = ref(false)
const vehiclesLoading = ref(false)
const customerVehicles = ref<Vehicle[]>([])
const currentCustomerName = ref('')

const searchForm = reactive({
  keyword: ''
})

const form = reactive({
  name: '',
  phone: '',
  remark: ''
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { max: 20, message: '姓名不能超过20个字符', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  remark: [
    { max: 200, message: '备注不能超过200个字符', trigger: 'blur' }
  ]
}

const filteredCustomers = computed(() => {
  let result = customers.value

  if (searchForm.keyword) {
    const keyword = searchForm.keyword.toLowerCase()
    result = result.filter(
      customer =>
        customer.name.toLowerCase().includes(keyword) ||
        customer.phone.includes(keyword)
    )
  }

  return result
})

async function loadCustomers() {
  loading.value = true
  try {
    customers.value = await customerApi.list({
      storeId: userStore.user?.store_id
    })
  } catch (error) {
    showError('加载客户列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
}

function handleReset() {
  searchForm.keyword = ''
}

function handleAdd() {
  isEdit.value = false
  editingId.value = null
  form.name = ''
  form.phone = ''
  form.remark = ''
  dialogVisible.value = true
}

function handleEdit(row: Customer) {
  isEdit.value = true
  editingId.value = row.id
  form.name = row.name
  form.phone = row.phone
  form.remark = row.remark
  dialogVisible.value = true
}

async function handleDelete(row: Customer) {
  const confirmed = await confirm(`确定要删除客户"${row.name}"吗？此操作不可撤销。`, '删除确认')
  if (!confirmed) return

  try {
    await customerApi.delete(row.id)
    customers.value = customers.value.filter(c => c.id !== row.id)
    showSuccess('删除成功')
  } catch (error) {
    showError('删除失败')
  }
}

async function handleViewVehicles(row: Customer) {
  currentCustomerName.value = row.name
  vehiclesDialogVisible.value = true
  vehiclesLoading.value = true
  try {
    const result = await customerApi.getWithVehicles(row.id)
    customerVehicles.value = result.vehicles || []
  } catch (error) {
    showError('加载车辆列表失败')
  } finally {
    vehiclesLoading.value = false
  }
}

async function handleSubmit() {
  if (!formRef.value) return

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const storeId = userStore.user?.store_id
    if (!storeId) {
      showError('未获取到门店信息')
      return
    }

    if (isEdit.value && editingId.value !== null) {
      const updateData = {
        name: form.name,
        phone: form.phone,
        remark: form.remark
      }
      await customerApi.update(editingId.value, updateData)
      const index = customers.value.findIndex(c => c.id === editingId.value)
      if (index !== -1) {
        customers.value[index] = { ...customers.value[index], ...updateData }
      }
      showSuccess('更新成功')
    } else {
      const createData = {
        name: form.name,
        phone: form.phone,
        remark: form.remark,
        store_id: storeId
      }
      await customerApi.create(createData)
      await loadCustomers()
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
  loadCustomers()
})
</script>

<style scoped lang="scss">
.customers {
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

  .customer-form {
    padding-right: 20px;
  }
}
</style>
