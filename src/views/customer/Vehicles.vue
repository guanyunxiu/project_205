<template>
  <div class="vehicles">
    <div class="page-header">
      <h2 class="page-title">
        <el-icon :size="24"><Van /></el-icon>
        车辆管理
      </h2>
      <p class="page-desc">管理系统中的所有车辆信息</p>
    </div>

    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="请输入车牌号/品牌/车型/车主姓名"
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
          <span class="card-title">车辆列表</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增车辆
          </el-button>
        </div>
      </template>

      <el-table
        :data="filteredVehicles"
        style="width: 100%"
        v-loading="loading"
        empty-text="暂无车辆数据"
        stripe
      >
        <el-table-column prop="plate_number" label="车牌号" width="120" />
        <el-table-column prop="brand" label="品牌" width="100" />
        <el-table-column prop="model" label="车型" width="120" />
        <el-table-column prop="vin" label="VIN" width="160" show-overflow-tooltip />
        <el-table-column prop="frame_number" label="车架号" width="160" show-overflow-tooltip />
        <el-table-column prop="engine_number" label="发动机号" width="140" show-overflow-tooltip />
        <el-table-column prop="customer_name" label="车主姓名" width="100" />
        <el-table-column prop="customer_phone" label="车主电话" width="130" />
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
            <el-button type="success" link @click="handleViewServiceHistory(row)">
              <el-icon><Document /></el-icon>
              维保记录
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑车辆' : '新增车辆'"
      width="600px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
        class="vehicle-form"
      >
        <el-form-item label="车主" prop="customer_id">
          <el-select
            v-model="form.customer_id"
            placeholder="请选择车主"
            style="width: 100%"
            filterable
          >
            <el-option
              v-for="customer in customers"
              :key="customer.id"
              :label="`${customer.name} - ${customer.phone}`"
              :value="customer.id"
            />
          </el-select>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="车牌号" prop="plate_number">
              <el-input v-model="form.plate_number" placeholder="请输入车牌号" maxlength="10" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="品牌" prop="brand">
              <el-input v-model="form.brand" placeholder="请输入品牌" maxlength="20" show-word-limit />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="车型" prop="model">
              <el-input v-model="form.model" placeholder="请输入车型" maxlength="30" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="颜色" prop="color">
              <el-input v-model="form.color" placeholder="请输入颜色" maxlength="10" show-word-limit />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="VIN" prop="vin">
          <el-input v-model="form.vin" placeholder="请输入VIN码" maxlength="17" show-word-limit />
        </el-form-item>
        <el-form-item label="车架号" prop="frame_number">
          <el-input v-model="form.frame_number" placeholder="请输入车架号" maxlength="30" show-word-limit />
        </el-form-item>
        <el-form-item label="发动机号" prop="engine_number">
          <el-input v-model="form.engine_number" placeholder="请输入发动机号" maxlength="30" show-word-limit />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="里程(km)" prop="mileage">
              <el-input-number v-model="form.mileage" :min="0" :precision="0" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
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
      v-model="serviceHistoryDialogVisible"
      :title="`${currentVehiclePlate} 的维保记录`"
      width="1000px"
      destroy-on-close
    >
      <el-table
        :data="serviceHistory"
        style="width: 100%"
        v-loading="serviceHistoryLoading"
        empty-text="该车辆暂无维保记录"
        stripe
      >
        <el-table-column prop="order_no" label="工单号" width="140" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="OrderStatusMap[row.status as OrderStatus].type">
              {{ OrderStatusMap[row.status as OrderStatus].label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="服务类型" width="100">
          <template #default="{ row }">
            {{ ServiceTypeMap[row.service_type as ServiceType] }}
          </template>
        </el-table-column>
        <el-table-column prop="fault_description" label="故障描述" min-width="150" show-overflow-tooltip />
        <el-table-column prop="technician_name" label="技师" width="100" />
        <el-table-column label="工时费" width="100">
          <template #default="{ row }">
            ¥{{ row.labor_fee.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="配件费" width="100">
          <template #default="{ row }">
            ¥{{ row.parts_fee.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="优惠" width="100">
          <template #default="{ row }">
            ¥{{ row.discount.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="总金额" width="100">
          <template #default="{ row }">
            ¥{{ row.total_amount.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="serviceHistoryDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import {
  Van,
  Search,
  Refresh,
  Plus,
  Edit,
  Delete,
  Document
} from '@element-plus/icons-vue'
import { vehicleApi, customerApi } from '@/api'
import { formatDate, showSuccess, showError, confirm } from '@/utils'
import {
  type Vehicle,
  type Customer,
  type WorkOrder,
  type OrderStatus,
  type ServiceType,
  OrderStatusMap,
  ServiceTypeMap
} from '@/types'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const vehicles = ref<Vehicle[]>([])
const customers = ref<Customer[]>([])

const serviceHistoryDialogVisible = ref(false)
const serviceHistoryLoading = ref(false)
const serviceHistory = ref<WorkOrder[]>([])
const currentVehiclePlate = ref('')

const searchForm = reactive({
  keyword: ''
})

const form = reactive({
  customer_id: 0,
  plate_number: '',
  brand: '',
  model: '',
  vin: '',
  frame_number: '',
  engine_number: '',
  color: '',
  mileage: 0,
  remark: ''
})

const rules: FormRules = {
  customer_id: [
    { required: true, message: '请选择车主', trigger: 'change' }
  ],
  plate_number: [
    { required: true, message: '请输入车牌号', trigger: 'blur' },
    { max: 10, message: '车牌号不能超过10个字符', trigger: 'blur' }
  ],
  brand: [
    { required: true, message: '请输入品牌', trigger: 'blur' },
    { max: 20, message: '品牌不能超过20个字符', trigger: 'blur' }
  ],
  model: [
    { required: true, message: '请输入车型', trigger: 'blur' },
    { max: 30, message: '车型不能超过30个字符', trigger: 'blur' }
  ],
  vin: [
    { max: 17, message: 'VIN码不能超过17个字符', trigger: 'blur' }
  ],
  frame_number: [
    { max: 30, message: '车架号不能超过30个字符', trigger: 'blur' }
  ],
  engine_number: [
    { max: 30, message: '发动机号不能超过30个字符', trigger: 'blur' }
  ],
  color: [
    { max: 10, message: '颜色不能超过10个字符', trigger: 'blur' }
  ],
  mileage: [
    { type: 'number', min: 0, message: '里程不能为负数', trigger: 'blur' }
  ],
  remark: [
    { max: 200, message: '备注不能超过200个字符', trigger: 'blur' }
  ]
}

const filteredVehicles = computed(() => {
  let result = vehicles.value

  if (searchForm.keyword) {
    const keyword = searchForm.keyword.toLowerCase()
    result = result.filter(
      vehicle =>
        vehicle.plate_number.toLowerCase().includes(keyword) ||
        vehicle.brand.toLowerCase().includes(keyword) ||
        vehicle.model.toLowerCase().includes(keyword) ||
        (vehicle.customer_name && vehicle.customer_name.toLowerCase().includes(keyword))
    )
  }

  return result
})

async function loadVehicles() {
  loading.value = true
  try {
    vehicles.value = await vehicleApi.list({
      storeId: userStore.user?.store_id
    })
  } catch (error) {
    showError('加载车辆列表失败')
  } finally {
    loading.value = false
  }
}

async function loadCustomers() {
  try {
    customers.value = await customerApi.list({
      storeId: userStore.user?.store_id
    })
  } catch (error) {
    showError('加载客户列表失败')
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
  form.customer_id = customers.value[0]?.id || 0
  form.plate_number = ''
  form.brand = ''
  form.model = ''
  form.vin = ''
  form.frame_number = ''
  form.engine_number = ''
  form.color = ''
  form.mileage = 0
  form.remark = ''
  dialogVisible.value = true
}

function handleEdit(row: Vehicle) {
  isEdit.value = true
  editingId.value = row.id
  form.customer_id = row.customer_id
  form.plate_number = row.plate_number
  form.brand = row.brand
  form.model = row.model
  form.vin = row.vin
  form.frame_number = row.frame_number
  form.engine_number = row.engine_number
  form.color = row.color
  form.mileage = row.mileage
  form.remark = row.remark
  dialogVisible.value = true
}

async function handleDelete(row: Vehicle) {
  const confirmed = await confirm(`确定要删除车辆"${row.plate_number}"吗？此操作不可撤销。`, '删除确认')
  if (!confirmed) return

  try {
    await vehicleApi.delete(row.id)
    vehicles.value = vehicles.value.filter(v => v.id !== row.id)
    showSuccess('删除成功')
  } catch (error) {
    showError('删除失败')
  }
}

async function handleViewServiceHistory(row: Vehicle) {
  currentVehiclePlate.value = row.plate_number
  serviceHistoryDialogVisible.value = true
  serviceHistoryLoading.value = true
  try {
    serviceHistory.value = await vehicleApi.getServiceHistory(row.id)
  } catch (error) {
    showError('加载维保记录失败')
  } finally {
    serviceHistoryLoading.value = false
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
        customer_id: form.customer_id,
        plate_number: form.plate_number,
        brand: form.brand,
        model: form.model,
        vin: form.vin,
        frame_number: form.frame_number,
        engine_number: form.engine_number,
        color: form.color,
        mileage: form.mileage,
        remark: form.remark
      }
      await vehicleApi.update(editingId.value, updateData)
      const index = vehicles.value.findIndex(v => v.id === editingId.value)
      if (index !== -1) {
        const customer = customers.value.find(c => c.id === form.customer_id)
        vehicles.value[index] = {
          ...vehicles.value[index],
          ...updateData,
          customer_name: customer?.name,
          customer_phone: customer?.phone
        }
      }
      showSuccess('更新成功')
    } else {
      const createData = {
        customer_id: form.customer_id,
        plate_number: form.plate_number,
        brand: form.brand,
        model: form.model,
        vin: form.vin,
        frame_number: form.frame_number,
        engine_number: form.engine_number,
        color: form.color,
        mileage: form.mileage,
        remark: form.remark,
        store_id: storeId
      }
      await vehicleApi.create(createData)
      await loadVehicles()
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
  loadCustomers().then(() => {
    loadVehicles()
  })
})
</script>

<style scoped lang="scss">
.vehicles {
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

  .vehicle-form {
    padding-right: 20px;
  }
}
</style>
