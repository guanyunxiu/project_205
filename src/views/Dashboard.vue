<template>
  <div class="dashboard">
    <div class="page-header">
      <h2 class="page-title">
        <el-icon :size="24"><DataAnalysis /></el-icon>
        首页仪表盘
      </h2>
      <p class="page-desc">欢迎使用汽修维保管理系统</p>
    </div>

    <el-row :gutter="20" class="stats-row">
      <el-col :xs="12" :sm="6" v-for="stat in stats" :key="stat.label">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon" :style="{ backgroundColor: stat.color }">
              <el-icon :size="28" color="#fff">
                <component :is="stat.icon" />
              </el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="content-row">
      <el-col :lg="12" :md="24">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="card-title">
                <el-icon><PieChart /></el-icon>
                今日工单状态分布
              </span>
            </div>
          </template>
          <div class="status-distribution">
            <div
              v-for="item in statusDistribution"
              :key="item.status"
              class="status-item"
            >
              <div class="status-info">
                <el-tag :type="item.type" size="large">
                  {{ item.label }}
                </el-tag>
                <span class="status-count">{{ item.count }} 单</span>
              </div>
              <div class="status-bar">
                <div
                  class="status-progress"
                  :style="{
                    width: `${item.percentage}%`,
                    backgroundColor: item.barColor
                  }"
                ></div>
              </div>
              <span class="status-percentage">{{ item.percentage }}%</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :lg="12" :md="24">
        <el-card class="table-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="card-title">
                <el-icon><Document /></el-icon>
                最近工单
              </span>
              <el-button type="primary" link @click="goToWorkOrders">
                查看全部 <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </template>
          <el-table
            :data="recentOrders"
            style="width: 100%"
            v-loading="loadingOrders"
            empty-text="暂无工单数据"
          >
            <el-table-column prop="order_no" label="工单号" width="130" />
            <el-table-column prop="customer_name" label="客户" width="100" />
            <el-table-column prop="plate_number" label="车牌号" width="100" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="OrderStatusMap[row.status].type" size="small">
                  {{ OrderStatusMap[row.status].label }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="金额" width="100">
              <template #default="{ row }">
                <span class="amount">¥{{ row.total_amount?.toFixed(2) || '0.00' }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import {
  DataAnalysis,
  Money,
  Document,
  UserFilled,
  Warning,
  PieChart,
  ArrowRight
} from '@element-plus/icons-vue'
import { reportApi, workOrderApi } from '@/api'
import { useStoreStore } from '@/stores/store'
import { OrderStatusMap, type WorkOrder } from '@/types'

const router = useRouter()
const storeStore = useStoreStore()

const dailyData = ref<any>(null)
const recentOrders = ref<WorkOrder[]>([])
const loadingOrders = ref(false)

const stats = computed(() => [
  {
    label: '今日营收',
    value: `¥${dailyData.value?.revenue?.toFixed(2) || '0.00'}`,
    icon: Money,
    color: '#67C23A'
  },
  {
    label: '今日工单',
    value: dailyData.value?.orderCount || 0,
    icon: Document,
    color: '#409EFF'
  },
  {
    label: '今日新增客户',
    value: dailyData.value?.newCustomerCount || 0,
    icon: UserFilled,
    color: '#E6A23C'
  },
  {
    label: '库存预警',
    value: dailyData.value?.lowStockCount || 0,
    icon: Warning,
    color: '#F56C6C'
  }
])

const statusDistribution = computed(() => {
  const orders = recentOrders.value
  const total = orders.length || 1

  const statusCounts: Record<string, number> = {
    pending: 0,
    repairing: 0,
    settling: 0,
    completed: 0,
    cancelled: 0
  }

  orders.forEach(order => {
    if (statusCounts[order.status] !== undefined) {
      statusCounts[order.status]++
    }
  })

  const statusConfig = [
    { status: 'pending', label: '待接单', type: 'info', barColor: '#909399' },
    { status: 'repairing', label: '维修中', type: 'warning', barColor: '#E6A23C' },
    { status: 'settling', label: '待结算', type: 'primary', barColor: '#409EFF' },
    { status: 'completed', label: '已完成', type: 'success', barColor: '#67C23A' },
    { status: 'cancelled', label: '已取消', type: 'danger', barColor: '#F56C6C' }
  ]

  return statusConfig.map(item => ({
    ...item,
    count: statusCounts[item.status],
    percentage: Math.round((statusCounts[item.status] / total) * 100)
  }))
})

async function loadDailyData() {
  try {
    const today = dayjs().format('YYYY-MM-DD')
    const params = {
      date: today,
      storeId: storeStore.currentStore?.id
    }
    dailyData.value = await reportApi.daily(params)
  } catch (error) {
    console.error('加载日报数据失败', error)
  }
}

async function loadRecentOrders() {
  loadingOrders.value = true
  try {
    const params = {
      storeId: storeStore.currentStore?.id
    }
    const orders = await workOrderApi.list(params)
    recentOrders.value = orders.slice(0, 6)
  } catch (error) {
    console.error('加载工单列表失败', error)
  } finally {
    loadingOrders.value = false
  }
}

function goToWorkOrders() {
  router.push('/work-orders')
}

onMounted(() => {
  loadDailyData()
  loadRecentOrders()
})
</script>

<style scoped lang="scss">
.dashboard {
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

  .stats-row {
    margin-bottom: 20px;

    .stat-card {
      :deep(.el-card__body) {
        padding: 20px;
      }

      .stat-content {
        display: flex;
        align-items: center;
        gap: 16px;

        .stat-icon {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stat-info {
          .stat-value {
            font-size: 24px;
            font-weight: 600;
            color: #303133;
            line-height: 1.2;
          }

          .stat-label {
            font-size: 14px;
            color: #909399;
            margin-top: 4px;
          }
        }
      }
    }
  }

  .content-row {
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .card-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        color: #303133;
      }
    }

    .status-distribution {
      .status-item {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px 0;
        border-bottom: 1px solid #f0f0f0;

        &:last-child {
          border-bottom: none;
        }

        .status-info {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 140px;
          flex-shrink: 0;

          .status-count {
            font-size: 14px;
            color: #606266;
            font-weight: 500;
          }
        }

        .status-bar {
          flex: 1;
          height: 8px;
          background-color: #f0f0f0;
          border-radius: 4px;
          overflow: hidden;

          .status-progress {
            height: 100%;
            border-radius: 4px;
            transition: width 0.3s ease;
          }
        }

        .status-percentage {
          width: 50px;
          text-align: right;
          font-size: 14px;
          color: #909399;
          font-weight: 500;
        }
      }
    }

    .table-card {
      :deep(.el-table) {
        font-size: 13px;
      }

      .amount {
        color: #f56c6c;
        font-weight: 600;
      }
    }
  }
}
</style>
