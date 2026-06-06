<template>
  <div class="work-order-detail">
    <div class="page-header">
      <div class="header-left">
        <el-button text @click="handleBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h2 class="page-title">
          <el-icon :size="24"><Document /></el-icon>
          工单详情
          <span class="order-no">{{ workOrder?.order_no }}</span>
          <el-tag
            v-if="workOrder"
            :type="OrderStatusMap[workOrder.status].type as any"
            size="large"
            class="status-tag"
          >
            {{ OrderStatusMap[workOrder.status].label }}
          </el-tag>
        </h2>
      </div>
      <p class="page-desc">工单号：{{ workOrder?.order_no }}</p>
    </div>

    <el-card class="info-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="card-title">基本信息</span>
          <div class="action-buttons">
            <el-button
              v-if="workOrder?.status === 'pending'"
              type="primary"
              @click="openTakeOrderDialog"
            >
              <el-icon><Check /></el-icon>
              接单
            </el-button>
            <el-button
              v-if="workOrder?.status === 'repairing'"
              type="success"
              @click="handleCompleteRepair"
            >
              <el-icon><CircleCheck /></el-icon>
              完成维修
            </el-button>
            <el-button
              v-if="workOrder?.status === 'settling'"
              type="warning"
              @click="handleSettle"
            >
              <el-icon><Money /></el-icon>
              去结算
            </el-button>
            <el-button
              v-if="workOrder && workOrder.status !== 'completed' && workOrder.status !== 'cancelled'"
              type="danger"
              @click="handleCancel"
            >
              <el-icon><Close /></el-icon>
              取消工单
            </el-button>
          </div>
        </div>
      </template>

      <el-descriptions :column="2" border v-loading="loading">
        <el-descriptions-item label="客户姓名">
          {{ workOrder?.customer_name }}
        </el-descriptions-item>
        <el-descriptions-item label="联系电话">
          {{ workOrder?.customer_phone }}
        </el-descriptions-item>
        <el-descriptions-item label="车牌号">
          {{ workOrder?.plate_number }}
        </el-descriptions-item>
        <el-descriptions-item label="车型">
          {{ workOrder?.brand }} {{ workOrder?.model }}
        </el-descriptions-item>
        <el-descriptions-item label="服务类型">
          {{ workOrder ? ServiceTypeMap[workOrder.service_type] : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="技师">
          {{ workOrder?.technician_name || '未分配' }}
        </el-descriptions-item>
        <el-descriptions-item label="接待员">
          {{ workOrder?.receptionist_name || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ workOrder ? formatDate(workOrder.created_at) : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="故障描述" :span="2">
          {{ workOrder?.fault_description }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card class="items-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="card-title">维修项目</span>
          <div class="action-buttons">
            <el-button
              type="primary"
              :disabled="!canEditItems"
              @click="openAddLaborDialog"
            >
              <el-icon><Plus /></el-icon>
              添加工时
            </el-button>
            <el-button
              type="success"
              :disabled="!canEditItems"
              @click="openAddPartDialog"
            >
              <el-icon><Goods /></el-icon>
              添加配件
            </el-button>
          </div>
        </div>
      </template>

      <el-tabs v-model="activeTab" class="items-tabs">
        <el-tab-pane label="工时项目" name="labor">
          <el-table
            :data="laborItems"
            style="width: 100%"
            empty-text="暂无工时项目"
            stripe
          >
            <el-table-column prop="name" label="项目名称" />
            <el-table-column prop="quantity" label="工时数" width="100" />
            <el-table-column label="单价(元)" width="120">
              <template #default="{ row }">
                {{ formatMoney(row.unit_price) }}
              </template>
            </el-table-column>
            <el-table-column label="金额(元)" width="120">
              <template #default="{ row }">
                {{ formatMoney(row.amount) }}
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
            <el-table-column label="操作" width="100" v-if="canEditItems">
              <template #default="{ row }">
                <el-button type="danger" link @click="handleRemoveItem(row)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="配件项目" name="part">
          <el-table
            :data="partItems"
            style="width: 100%"
            empty-text="暂无配件项目"
            stripe
          >
            <el-table-column prop="name" label="配件名称" />
            <el-table-column prop="quantity" label="数量" width="100" />
            <el-table-column label="单价(元)" width="120">
              <template #default="{ row }">
                {{ formatMoney(row.unit_price) }}
              </template>
            </el-table-column>
            <el-table-column label="金额(元)" width="120">
              <template #default="{ row }">
                {{ formatMoney(row.amount) }}
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
            <el-table-column label="操作" width="100" v-if="canEditItems">
              <template #default="{ row }">
                <el-button type="danger" link @click="handleRemoveItem(row)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>

      <el-divider />

      <div class="fee-summary">
        <div class="fee-row">
          <span class="fee-label">工时费：</span>
          <span class="fee-value">{{ formatMoney(workOrder?.labor_fee || 0) }}</span>
        </div>
        <div class="fee-row">
          <span class="fee-label">配件费：</span>
          <span class="fee-value">{{ formatMoney(workOrder?.parts_fee || 0) }}</span>
        </div>
        <div class="fee-row discount-row">
          <span class="fee-label">
            优惠：
            <el-button
              v-if="canEditItems"
              type="primary"
              link
              size="small"
              @click="openDiscountDialog"
            >
              修改
            </el-button>
          </span>
          <span class="fee-value discount-value">-{{ formatMoney(workOrder?.discount || 0) }}</span>
        </div>
        <el-divider />
        <div class="fee-row total-row">
          <span class="fee-label">总金额：</span>
          <span class="fee-value total-value">{{ formatMoney(workOrder?.total_amount || 0) }}</span>
        </div>
      </div>
    </el-card>

    <el-dialog
      v-model="takeOrderDialogVisible"
      title="接单"
      width="400px"
      destroy-on-close
    >
      <el-form
        ref="takeOrderFormRef"
        :model="takeOrderForm"
        :rules="takeOrderRules"
        label-width="80px"
      >
        <el-form-item label="选择技师" prop="technicianId">
          <el-select v-model="takeOrderForm.technicianId" placeholder="请选择技师" style="width: 100%">
            <el-option
              v-for="tech in technicians"
              :key="tech.id"
              :label="tech.name"
              :value="tech.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="takeOrderDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleTakeOrder">确定接单</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="addLaborDialogVisible"
      title="添加工时项目"
      width="450px"
      destroy-on-close
    >
      <el-form
        ref="addLaborFormRef"
        :model="addLaborForm"
        :rules="addLaborRules"
        label-width="80px"
      >
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="addLaborForm.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="工时数" prop="quantity">
          <el-input-number
            v-model="addLaborForm.quantity"
            :min="0.5"
            :step="0.5"
            :precision="1"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="单价(元)" prop="unitPrice">
          <el-input-number
            v-model="addLaborForm.unitPrice"
            :min="0"
            :precision="2"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="金额(元)">
          <span class="amount-preview">{{ formatMoney(addLaborForm.quantity * addLaborForm.unitPrice) }}</span>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="addLaborForm.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addLaborDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleAddLabor">添加</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="addPartDialogVisible"
      title="添加配件项目"
      width="600px"
      destroy-on-close
    >
      <el-form
        ref="addPartFormRef"
        :model="addPartForm"
        :rules="addPartRules"
        label-width="80px"
      >
        <el-form-item label="搜索配件">
          <el-input
            v-model="partSearchKeyword"
            placeholder="搜索配件名称或编码"
            clearable
            @keyup.enter="searchParts"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
            <template #append>
              <el-button @click="searchParts">搜索</el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="选择配件" prop="partId">
          <el-select
            v-model="addPartForm.partId"
            placeholder="请选择配件"
            filterable
            style="width: 100%"
            @change="onPartSelect"
          >
            <el-option
              v-for="part in parts"
              :key="part.id"
              :label="`${part.name} (库存: ${part.stock}) - ${formatMoney(part.sale_price)}`"
              :value="part.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="selectedPart" label="库存">
          <el-tag :type="selectedPart.stock > 0 ? 'success' : 'danger'">
            {{ selectedPart.stock > 0 ? `库存充足 (${selectedPart.stock})` : '库存不足' }}
          </el-tag>
        </el-form-item>
        <el-form-item label="数量" prop="quantity">
          <el-input-number
            v-model="addPartForm.quantity"
            :min="1"
            :max="selectedPart?.stock || 999"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="单价(元)">
          <span>{{ formatMoney(addPartForm.unitPrice) }}</span>
        </el-form-item>
        <el-form-item label="金额(元)">
          <span class="amount-preview">{{ formatMoney(addPartForm.quantity * addPartForm.unitPrice) }}</span>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="addPartForm.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addPartDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleAddPart">添加</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="discountDialogVisible"
      title="修改优惠"
      width="400px"
      destroy-on-close
    >
      <el-form
        ref="discountFormRef"
        :model="discountForm"
        :rules="discountRules"
        label-width="80px"
      >
        <el-form-item label="优惠金额(元)" prop="discount">
          <el-input-number
            v-model="discountForm.discount"
            :min="0"
            :precision="2"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="discountDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleApplyDiscount">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import {
  Document,
  ArrowLeft,
  Check,
  CircleCheck,
  Money,
  Close,
  Plus,
  Goods,
  Search
} from '@element-plus/icons-vue'
import { workOrderApi, partApi, userApi } from '@/api'
import { formatDate, formatMoney, showSuccess, showError, confirm } from '@/utils'
import type { WorkOrder, OrderItem, Part, User, OrderStatus } from '@/types'
import { OrderStatusMap, ServiceTypeMap } from '@/types'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const orderId = computed(() => Number(route.params.id))

const loading = ref(false)
const submitting = ref(false)
const workOrder = ref<WorkOrder | null>(null)
const activeTab = ref('labor')

const technicians = ref<User[]>([])
const parts = ref<Part[]>([])
const partSearchKeyword = ref('')
const selectedPart = computed(() => {
  return parts.value.find(p => p.id === addPartForm.partId)
})

const takeOrderDialogVisible = ref(false)
const addLaborDialogVisible = ref(false)
const addPartDialogVisible = ref(false)
const discountDialogVisible = ref(false)

const takeOrderFormRef = ref<FormInstance>()
const addLaborFormRef = ref<FormInstance>()
const addPartFormRef = ref<FormInstance>()
const discountFormRef = ref<FormInstance>()

const takeOrderForm = reactive({
  technicianId: 0
})

const addLaborForm = reactive({
  name: '',
  quantity: 1,
  unitPrice: 0,
  remark: ''
})

const addPartForm = reactive({
  partId: 0,
  quantity: 1,
  unitPrice: 0,
  remark: ''
})

const discountForm = reactive({
  discount: 0
})

const takeOrderRules: FormRules = {
  technicianId: [
    { required: true, message: '请选择技师', trigger: 'change' }
  ]
}

const addLaborRules: FormRules = {
  name: [
    { required: true, message: '请输入项目名称', trigger: 'blur' }
  ],
  quantity: [
    { required: true, message: '请输入工时数', trigger: 'blur' }
  ],
  unitPrice: [
    { required: true, message: '请输入单价', trigger: 'blur' }
  ]
}

const addPartRules: FormRules = {
  partId: [
    { required: true, message: '请选择配件', trigger: 'change' }
  ],
  quantity: [
    { required: true, message: '请输入数量', trigger: 'blur' }
  ]
}

const discountRules: FormRules = {
  discount: [
    { required: true, message: '请输入优惠金额', trigger: 'blur' }
  ]
}

const laborItems = computed(() => {
  return workOrder.value?.items?.filter(item => item.type === 'labor') || []
})

const partItems = computed(() => {
  return workOrder.value?.items?.filter(item => item.type === 'part') || []
})

const canEditItems = computed(() => {
  return workOrder.value?.status === 'repairing' || workOrder.value?.status === 'settling'
})

async function loadWorkOrder() {
  loading.value = true
  try {
    workOrder.value = await workOrderApi.get(orderId.value)
  } catch (error) {
    showError('加载工单详情失败')
  } finally {
    loading.value = false
  }
}

async function loadTechnicians() {
  try {
    const users = await userApi.list()
    technicians.value = users.filter(u => u.role === 'technician')
  } catch (error) {
    showError('加载技师列表失败')
  }
}

async function loadParts() {
  try {
    parts.value = await partApi.list({
      storeId: userStore.user?.store_id
    })
  } catch (error) {
    showError('加载配件列表失败')
  }
}

async function searchParts() {
  try {
    parts.value = await partApi.list({
      keyword: partSearchKeyword.value,
      storeId: userStore.user?.store_id
    })
  } catch (error) {
    showError('搜索配件失败')
  }
}

function onPartSelect() {
  const part = selectedPart.value
  if (part) {
    addPartForm.unitPrice = part.sale_price
    if (addPartForm.quantity > part.stock) {
      addPartForm.quantity = part.stock
    }
  }
}

function handleBack() {
  router.back()
}

function openTakeOrderDialog() {
  takeOrderForm.technicianId = 0
  takeOrderDialogVisible.value = true
}

async function handleTakeOrder() {
  const valid = await takeOrderFormRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    await workOrderApi.updateStatus(orderId.value, 'repairing' as OrderStatus, takeOrderForm.technicianId)
    showSuccess('接单成功')
    takeOrderDialogVisible.value = false
    await loadWorkOrder()
  } catch (error) {
    showError('接单失败')
  } finally {
    submitting.value = false
  }
}

async function handleCompleteRepair() {
  const confirmed = await confirm('确定要完成维修吗？完成后将进入待结算状态。', '完成确认')
  if (!confirmed) return

  submitting.value = true
  try {
    await workOrderApi.updateStatus(orderId.value, 'settling' as OrderStatus)
    showSuccess('维修已完成，进入待结算')
    await loadWorkOrder()
  } catch (error) {
    showError('操作失败')
  } finally {
    submitting.value = false
  }
}

function handleSettle() {
  router.push(`/settlements?orderId=${orderId.value}`)
}

async function handleCancel() {
  const confirmed = await confirm('确定要取消此工单吗？此操作不可撤销。', '取消确认')
  if (!confirmed) return

  submitting.value = true
  try {
    await workOrderApi.updateStatus(orderId.value, 'cancelled' as OrderStatus)
    showSuccess('工单已取消')
    await loadWorkOrder()
  } catch (error) {
    showError('取消失败')
  } finally {
    submitting.value = false
  }
}

function openAddLaborDialog() {
  addLaborForm.name = ''
  addLaborForm.quantity = 1
  addLaborForm.unitPrice = 0
  addLaborForm.remark = ''
  addLaborDialogVisible.value = true
}

async function handleAddLabor() {
  const valid = await addLaborFormRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const item = {
      type: 'labor' as const,
      name: addLaborForm.name,
      quantity: addLaborForm.quantity,
      unit_price: addLaborForm.unitPrice,
      amount: addLaborForm.quantity * addLaborForm.unitPrice,
      remark: addLaborForm.remark
    }
    await workOrderApi.addItem(orderId.value, item)
    showSuccess('添加工时成功')
    addLaborDialogVisible.value = false
    await loadWorkOrder()
  } catch (error) {
    showError('添加失败')
  } finally {
    submitting.value = false
  }
}

function openAddPartDialog() {
  partSearchKeyword.value = ''
  addPartForm.partId = 0
  addPartForm.quantity = 1
  addPartForm.unitPrice = 0
  addPartForm.remark = ''
  addPartDialogVisible.value = true
  loadParts()
}

async function handleAddPart() {
  const valid = await addPartFormRef.value?.validate().catch(() => false)
  if (!valid) return

  if (selectedPart.value && addPartForm.quantity > selectedPart.value.stock) {
    showError(`库存不足，当前库存：${selectedPart.value.stock}`)
    return
  }

  submitting.value = true
  try {
    const item = {
      type: 'part' as const,
      name: selectedPart.value?.name || '',
      quantity: addPartForm.quantity,
      unit_price: addPartForm.unitPrice,
      amount: addPartForm.quantity * addPartForm.unitPrice,
      part_id: addPartForm.partId,
      remark: addPartForm.remark
    }
    await workOrderApi.addItem(orderId.value, item)
    showSuccess('添加配件成功')
    addPartDialogVisible.value = false
    await loadWorkOrder()
  } catch (error) {
    showError('添加失败')
  } finally {
    submitting.value = false
  }
}

async function handleRemoveItem(row: OrderItem) {
  const confirmed = await confirm(`确定要删除"${row.name}"吗？`, '删除确认')
  if (!confirmed) return

  try {
    await workOrderApi.removeItem(row.id)
    showSuccess('删除成功')
    await loadWorkOrder()
  } catch (error) {
    showError('删除失败')
  }
}

function openDiscountDialog() {
  discountForm.discount = workOrder.value?.discount || 0
  discountDialogVisible.value = true
}

async function handleApplyDiscount() {
  const valid = await discountFormRef.value?.validate().catch(() => false)
  if (!valid) return

  const totalBeforeDiscount = (workOrder.value?.labor_fee || 0) + (workOrder.value?.parts_fee || 0)
  if (discountForm.discount > totalBeforeDiscount) {
    showError('优惠金额不能大于总金额')
    return
  }

  submitting.value = true
  try {
    await workOrderApi.applyDiscount(orderId.value, discountForm.discount)
    showSuccess('优惠已应用')
    discountDialogVisible.value = false
    await loadWorkOrder()
  } catch (error) {
    showError('操作失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadWorkOrder()
  loadTechnicians()
})
</script>

<style scoped lang="scss">
.work-order-detail {
  .page-header {
    margin-bottom: 20px;

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .page-title {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 0 4px;
      font-size: 20px;
      font-weight: 600;
      color: #303133;

      .order-no {
        font-size: 16px;
        color: #909399;
        font-weight: normal;
      }

      .status-tag {
        margin-left: 8px;
      }
    }

    .page-desc {
      margin: 0 0 0 56px;
      color: #909399;
      font-size: 14px;
    }
  }

  .info-card {
    margin-bottom: 16px;

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .card-title {
        font-weight: 600;
        color: #303133;
      }

      .action-buttons {
        display: flex;
        gap: 8px;
      }
    }

    :deep(.el-descriptions) {
      font-size: 13px;
    }
  }

  .items-card {
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .card-title {
        font-weight: 600;
        color: #303133;
      }

      .action-buttons {
        display: flex;
        gap: 8px;
      }
    }

    .items-tabs {
      :deep(.el-table) {
        font-size: 13px;
      }
    }

    .fee-summary {
      padding: 10px 20px;

      .fee-row {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        padding: 6px 0;

        .fee-label {
          color: #606266;
          font-size: 14px;
        }

        .fee-value {
          min-width: 120px;
          text-align: right;
          font-size: 14px;
          color: #303133;
        }

        &.discount-row {
          .discount-value {
            color: #67c23a;
          }
        }

        &.total-row {
          font-weight: 600;

          .fee-label {
            font-size: 16px;
          }

          .total-value {
            font-size: 20px;
            color: #f56c6c;
          }
        }
      }

      .amount-preview {
        color: #f56c6c;
        font-weight: 600;
        font-size: 16px;
      }
    }
  }
}
</style>
