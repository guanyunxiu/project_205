<template>
  <div class="settlements">
    <div class="page-header">
      <h2 class="page-title">
        <el-icon :size="24"><Money /></el-icon>
        结算管理
      </h2>
      <p class="page-desc">管理和查看所有结算单信息</p>
    </div>

    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="日期">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 280px"
          />
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
          <span class="card-title">结算列表</span>
          <div class="total-revenue">
            <span class="label">总营收：</span>
            <span class="amount">{{ formatMoney(totalRevenue) }}</span>
          </div>
        </div>
      </template>

      <el-table
        :data="settlements"
        style="width: 100%"
        v-loading="loading"
        empty-text="暂无结算数据"
        stripe
      >
        <el-table-column prop="settlement_no" label="结算单号" width="180" />
        <el-table-column prop="order_no" label="工单号" width="160" />
        <el-table-column prop="customer_name" label="客户" width="120" />
        <el-table-column prop="plate_number" label="车牌号" width="120" />
        <el-table-column label="总金额" width="120">
          <template #default="{ row }">
            {{ formatMoney(row.total_amount) }}
          </template>
        </el-table-column>
        <el-table-column label="优惠" width="120">
          <template #default="{ row }">
            {{ formatMoney(row.discount) }}
          </template>
        </el-table-column>
        <el-table-column label="实收金额" width="120">
          <template #default="{ row }">
            <span class="text-primary font-semibold">{{ formatMoney(row.actual_amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="支付方式" width="100">
          <template #default="{ row }">
            {{ PaymentMethodMap[row.payment_method as keyof typeof PaymentMethodMap] }}
          </template>
        </el-table-column>
        <el-table-column label="操作时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleViewDetail(row)">
              <el-icon><View /></el-icon>
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="settlementDialogVisible"
      title="结算详情"
      width="700px"
      :close-on-click-modal="false"
    >
      <div v-if="currentSettlement" class="settlement-detail">
        <div class="detail-section">
          <h4 class="section-title">基本信息</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="结算单号">{{ currentSettlement.settlement_no }}</el-descriptions-item>
            <el-descriptions-item label="工单号">{{ currentSettlement.order_no }}</el-descriptions-item>
            <el-descriptions-item label="客户">{{ currentSettlement.customer_name }}</el-descriptions-item>
            <el-descriptions-item label="车牌号">{{ currentSettlement.plate_number }}</el-descriptions-item>
            <el-descriptions-item label="支付方式">{{ PaymentMethodMap[currentSettlement.payment_method as keyof typeof PaymentMethodMap] }}</el-descriptions-item>
            <el-descriptions-item label="操作人">{{ currentSettlement.operator_name }}</el-descriptions-item>
            <el-descriptions-item label="操作时间" :span="2">
              {{ formatDate(currentSettlement.created_at) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-section">
          <h4 class="section-title">费用汇总</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="总金额">{{ formatMoney(currentSettlement.total_amount) }}</el-descriptions-item>
            <el-descriptions-item label="优惠">{{ formatMoney(currentSettlement.discount) }}</el-descriptions-item>
            <el-descriptions-item label="实收金额" :span="2">
              <span class="text-primary text-lg font-semibold">{{ formatMoney(currentSettlement.actual_amount) }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>

      <template #footer>
        <el-button @click="settlementDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handlePrint">
          <el-icon><Printer /></el-icon>
          打印
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="createDialogVisible"
      title="工单结算"
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-if="currentWorkOrder" class="create-settlement">
        <div class="detail-section">
          <h4 class="section-title">工单信息</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="工单号">{{ currentWorkOrder.order_no }}</el-descriptions-item>
            <el-descriptions-item label="客户">{{ currentWorkOrder.customer_name }}</el-descriptions-item>
            <el-descriptions-item label="车牌号">{{ currentWorkOrder.plate_number }}</el-descriptions-item>
            <el-descriptions-item label="服务类型">
              {{ ServiceTypeMap[currentWorkOrder.service_type as keyof typeof ServiceTypeMap] }}
            </el-descriptions-item>
            <el-descriptions-item label="故障描述" :span="2">
              {{ currentWorkOrder.fault_description }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-section">
          <h4 class="section-title">费用明细</h4>
          <el-tabs v-model="activeTab">
            <el-tab-pane label="工时项目" name="labor">
              <el-table :data="laborItems" border>
                <el-table-column prop="name" label="项目名称" />
                <el-table-column prop="quantity" label="数量" width="100" />
                <el-table-column label="单价" width="120">
                  <template #default="{ row }">
                    {{ formatMoney(row.unit_price) }}
                  </template>
                </el-table-column>
                <el-table-column label="金额" width="120">
                  <template #default="{ row }">
                    {{ formatMoney(row.amount) }}
                  </template>
                </el-table-column>
              </el-table>
              <div class="subtotal">
                <span>工时费小计：</span>
                <span class="amount">{{ formatMoney(laborTotal) }}</span>
              </div>
            </el-tab-pane>
            <el-tab-pane label="配件项目" name="part">
              <el-table :data="partItems" border>
                <el-table-column prop="name" label="配件名称" />
                <el-table-column prop="quantity" label="数量" width="100" />
                <el-table-column label="单价" width="120">
                  <template #default="{ row }">
                    {{ formatMoney(row.unit_price) }}
                  </template>
                </el-table-column>
                <el-table-column label="金额" width="120">
                  <template #default="{ row }">
                    {{ formatMoney(row.amount) }}
                  </template>
                </el-table-column>
              </el-table>
              <div class="subtotal">
                <span>配件费小计：</span>
                <span class="amount">{{ formatMoney(partTotal) }}</span>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>

        <div class="detail-section">
          <h4 class="section-title">费用汇总</h4>
          <el-form :model="settlementForm" label-width="100px">
            <el-descriptions :column="2" border class="summary-desc">
              <el-descriptions-item label="工时费">{{ formatMoney(laborTotal) }}</el-descriptions-item>
              <el-descriptions-item label="配件费">{{ formatMoney(partTotal) }}</el-descriptions-item>
              <el-descriptions-item label="总金额" :span="2">
                <span class="text-lg font-semibold">{{ formatMoney(totalAmount) }}</span>
              </el-descriptions-item>
            </el-descriptions>
            <el-form-item label="优惠金额" class="mt-4">
              <el-input-number
                v-model="settlementForm.discount"
                :min="0"
                :max="totalAmount"
                :precision="2"
                style="width: 200px"
                @change="calculateActual"
              />
            </el-form-item>
            <el-form-item label="实收金额">
              <span class="text-primary text-xl font-semibold">{{ formatMoney(settlementForm.actual_amount) }}</span>
            </el-form-item>
            <el-form-item label="支付方式">
              <el-radio-group v-model="settlementForm.payment_method">
                <el-radio value="cash">现金</el-radio>
                <el-radio value="wechat">微信</el-radio>
                <el-radio value="alipay">支付宝</el-radio>
                <el-radio value="credit">记账</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-form>
        </div>
      </div>

      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmitSettlement">
          确认结算
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  Money,
  Search,
  Refresh,
  View,
  Printer
} from '@element-plus/icons-vue'
import { settlementApi, workOrderApi } from '@/api'
import {
  formatDate,
  formatMoney,
  showError,
  showSuccess,
  showWarning,
  confirm
} from '@/utils'
import type { Settlement, WorkOrder, OrderItem, PaymentMethod } from '@/types'
import { PaymentMethodMap, ServiceTypeMap } from '@/types'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const userStore = useUserStore()

const loading = ref(false)
const submitting = ref(false)
const settlements = ref<Settlement[]>([])
const settlementDialogVisible = ref(false)
const createDialogVisible = ref(false)
const currentSettlement = ref<Settlement | null>(null)
const currentWorkOrder = ref<WorkOrder | null>(null)
const activeTab = ref('labor')

const searchForm = reactive({
  dateRange: [] as string[]
})

const settlementForm = reactive({
  work_order_id: 0,
  total_amount: 0,
  discount: 0,
  actual_amount: 0,
  paid_amount: 0,
  payment_method: 'cash' as PaymentMethod
})

const totalRevenue = computed(() => {
  return settlements.value.reduce((sum, item) => sum + item.actual_amount, 0)
})

const laborItems = computed<OrderItem[]>(() => {
  return currentWorkOrder.value?.items?.filter(item => item.type === 'labor') || []
})

const partItems = computed<OrderItem[]>(() => {
  return currentWorkOrder.value?.items?.filter(item => item.type === 'part') || []
})

const laborTotal = computed(() => {
  return laborItems.value.reduce((sum, item) => sum + item.amount, 0)
})

const partTotal = computed(() => {
  return partItems.value.reduce((sum, item) => sum + item.amount, 0)
})

const totalAmount = computed(() => {
  return laborTotal.value + partTotal.value
})

function calculateActual() {
  settlementForm.actual_amount = Math.max(0, totalAmount.value - settlementForm.discount)
  settlementForm.paid_amount = settlementForm.actual_amount
}

async function loadSettlements() {
  loading.value = true
  try {
    const params: any = {
      storeId: userStore.user?.store_id
    }
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }
    settlements.value = await settlementApi.list(params)
  } catch (error) {
    showError('加载结算列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  loadSettlements()
}

function handleReset() {
  searchForm.dateRange = []
  loadSettlements()
}

async function handleViewDetail(row: Settlement) {
  try {
    currentSettlement.value = await settlementApi.get(row.id)
    settlementDialogVisible.value = true
  } catch (error) {
    showError('获取结算详情失败')
  }
}

function handlePrint() {
  window.print()
}

async function openSettlementDialog(workOrderId: number) {
  try {
    currentWorkOrder.value = await workOrderApi.get(workOrderId)
    settlementForm.work_order_id = workOrderId
    settlementForm.total_amount = totalAmount.value
    settlementForm.discount = 0
    calculateActual()
    createDialogVisible.value = true
  } catch (error) {
    showError('获取工单详情失败')
  }
}

async function handleSubmitSettlement() {
  if (!settlementForm.payment_method) {
    showWarning('请选择支付方式')
    return
  }

  const ok = await confirm('确认结算此工单？')
  if (!ok) return

  submitting.value = true
  try {
    await settlementApi.create({
      work_order_id: settlementForm.work_order_id,
      total_amount: totalAmount.value,
      discount: settlementForm.discount,
      actual_amount: settlementForm.actual_amount,
      paid_amount: settlementForm.paid_amount,
      payment_method: settlementForm.payment_method,
      operator_id: userStore.user?.id,
      store_id: userStore.user?.store_id!
    })
    showSuccess('结算成功')
    createDialogVisible.value = false
    loadSettlements()
  } catch (error) {
    showError('结算失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadSettlements()

  const workOrderId = route.query.workOrderId
  if (workOrderId) {
    openSettlementDialog(Number(workOrderId))
  }
})
</script>

<style scoped lang="scss">
.settlements {
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

      .total-revenue {
        .label {
          color: #909399;
        }
        .amount {
          color: #f56c6c;
          font-size: 18px;
          font-weight: 600;
        }
      }
    }

    :deep(.el-table) {
      font-size: 13px;
    }
  }

  .settlement-detail,
  .create-settlement {
    .detail-section {
      margin-bottom: 20px;

      &:last-child {
        margin-bottom: 0;
      }

      .section-title {
        margin: 0 0 12px;
        font-size: 14px;
        font-weight: 600;
        color: #303133;
        padding-left: 8px;
        border-left: 3px solid #409eff;
      }
    }

    .subtotal {
      margin-top: 12px;
      text-align: right;
      font-size: 14px;

      .amount {
        font-weight: 600;
        color: #f56c6c;
      }
    }

    .summary-desc {
      margin-bottom: 16px;
    }

    .mt-4 {
      margin-top: 16px;
    }

    .text-primary {
      color: #409eff;
    }

    .text-lg {
      font-size: 16px;
    }

    .text-xl {
      font-size: 20px;
    }

    .font-semibold {
      font-weight: 600;
    }
  }
}
</style>
