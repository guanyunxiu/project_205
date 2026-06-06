<template>
  <div class="reports">
    <div class="page-header">
      <h2 class="page-title">
        <el-icon :size="24"><DataAnalysis /></el-icon>
        数据报表
      </h2>
      <p class="page-desc">查看营收和工单统计数据</p>
    </div>

    <el-card class="content-card" shadow="never">
      <div class="card-toolbar">
        <el-tabs v-model="activeTab" class="report-tabs">
          <el-tab-pane label="今日报表" name="daily" />
          <el-tab-pane label="月度报表" name="monthly" />
        </el-tabs>
        <div class="export-section">
          <el-date-picker
            v-model="exportDateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 280px"
          />
          <el-button type="success" :loading="exporting" @click="handleExport">
            <el-icon><Download /></el-icon>
            导出 Excel
          </el-button>
        </div>
      </div>

      <div v-if="activeTab === 'daily'" v-loading="loading" class="daily-report">
        <el-row :gutter="20" class="stat-cards">
          <el-col :span="8">
            <div class="stat-card revenue">
              <div class="stat-icon">
                <el-icon :size="32"><Money /></el-icon>
              </div>
              <div class="stat-info">
                <p class="stat-label">今日营收</p>
                <p class="stat-value">{{ formatMoney(dailyData.revenue || 0) }}</p>
              </div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="stat-card orders">
              <div class="stat-icon">
                <el-icon :size="32"><Document /></el-icon>
              </div>
              <div class="stat-info">
                <p class="stat-label">今日工单量</p>
                <p class="stat-value">{{ formatNumber(dailyData.orderCount || 0) }}</p>
              </div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="stat-card customers">
              <div class="stat-icon">
                <el-icon :size="32"><User /></el-icon>
              </div>
              <div class="stat-info">
                <p class="stat-label">今日新增客户</p>
                <p class="stat-value">{{ formatNumber(dailyData.newCustomerCount || 0) }}</p>
              </div>
            </div>
          </el-col>
        </el-row>

        <div class="chart-section">
          <h4 class="section-title">工单状态分布</h4>
          <div class="status-distribution">
            <div
              v-for="(item, key) in dailyData.statusDistribution || {}"
              :key="key"
              class="status-item"
            >
              <div class="status-header">
                <span class="status-label">
                  <el-tag :type="OrderStatusMap[key as unknown as OrderStatus].type as any" size="small">
                    {{ OrderStatusMap[key as unknown as OrderStatus].label }}
                  </el-tag>
                </span>
                <span class="status-count">{{ item }} 单</span>
              </div>
              <el-progress
                :percentage="calculatePercentage(item, dailyData.orderCount)"
                :stroke-width="12"
                :show-text="false"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'monthly'" v-loading="loading" class="monthly-report">
        <div class="month-selector">
          <el-date-picker
            v-model="monthPicker"
            type="month"
            placeholder="选择年月"
            value-format="YYYY-MM"
            @change="loadMonthlyReport"
          />
        </div>

        <el-row :gutter="20" class="stat-cards">
          <el-col :span="12">
            <div class="stat-card revenue">
              <div class="stat-icon">
                <el-icon :size="32"><Money /></el-icon>
              </div>
              <div class="stat-info">
                <p class="stat-label">月度营收</p>
                <p class="stat-value">{{ formatMoney(monthlyData.revenue || 0) }}</p>
              </div>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="stat-card orders">
              <div class="stat-icon">
                <el-icon :size="32"><Document /></el-icon>
              </div>
              <div class="stat-info">
                <p class="stat-label">月度工单量</p>
                <p class="stat-value">{{ formatNumber(monthlyData.orderCount || 0) }}</p>
              </div>
            </div>
          </el-col>
        </el-row>

        <div class="chart-section">
          <h4 class="section-title">每日营收趋势</h4>
          <div class="bar-chart">
            <div class="chart-y-axis">
              <span>{{ formatMoney(maxRevenue) }}</span>
              <span>{{ formatMoney(maxRevenue / 2) }}</span>
              <span>¥0.00</span>
            </div>
            <div class="chart-bars">
              <div
                v-for="(item, index) in monthlyData.dailyRevenue || []"
                :key="index"
                class="bar-item"
              >
                <div class="bar-wrapper">
                  <div
                    class="bar"
                    :style="{ height: calculateBarHeight(item.revenue) + '%' }"
                    :title="`${item.date}: ${formatMoney(item.revenue)}`"
                  />
                </div>
                <span class="bar-label">{{ item.date }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import {
  DataAnalysis,
  Download,
  Money,
  Document,
  User
} from '@element-plus/icons-vue'
import { reportApi } from '@/api'
import {
  formatMoney,
  formatNumber,
  showError,
  showSuccess,
  showWarning
} from '@/utils'
import { OrderStatusMap } from '@/types'
import type { OrderStatus } from '@/types'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const loading = ref(false)
const exporting = ref(false)
const activeTab = ref('daily')
const monthPicker = ref(dayjs().format('YYYY-MM'))
const exportDateRange = ref<string[]>([])

const dailyData = reactive<Record<string, any>>({})
const monthlyData = reactive<Record<string, any>>({})

const maxRevenue = computed(() => {
  const revenues = monthlyData.dailyRevenue?.map((item: any) => item.revenue) || []
  const max = Math.max(...revenues, 0)
  return max > 0 ? max : 100
})

function calculatePercentage(value: number, total: number): number {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

function calculateBarHeight(value: number): number {
  if (!maxRevenue.value) return 0
  return (value / maxRevenue.value) * 100
}

async function loadDailyReport() {
  loading.value = true
  try {
    const data = await reportApi.daily({
      date: dayjs().format('YYYY-MM-DD'),
      storeId: userStore.user?.store_id
    })
    Object.assign(dailyData, data || {})
  } catch (error) {
    showError('加载今日报表失败')
  } finally {
    loading.value = false
  }
}

async function loadMonthlyReport() {
  if (!monthPicker.value) return

  const [year, month] = monthPicker.value.split('-').map(Number)
  loading.value = true
  try {
    const data = await reportApi.monthly({
      year,
      month,
      storeId: userStore.user?.store_id
    })
    Object.assign(monthlyData, data || {})
  } catch (error) {
    showError('加载月度报表失败')
  } finally {
    loading.value = false
  }
}

async function handleExport() {
  if (!exportDateRange.value || exportDateRange.value.length !== 2) {
    showWarning('请选择导出日期范围')
    return
  }

  exporting.value = true
  try {
    const data = await reportApi.exportRevenue({
      startDate: exportDateRange.value[0],
      endDate: exportDateRange.value[1],
      storeId: userStore.user?.store_id
    })

    const exportData = data.map((item: any) => ({
      '结算单号': item.settlement_no,
      '工单号': item.order_no,
      '客户': item.customer_name,
      '车牌号': item.plate_number,
      '总金额': item.total_amount,
      '优惠': item.discount,
      '实收金额': item.actual_amount,
      '支付方式': PaymentMethodLabel[item.payment_method as keyof typeof PaymentMethodLabel],
      '操作时间': item.created_at
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '营收明细')

    worksheet['!cols'] = [
      { wch: 18 },
      { wch: 18 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 20 }
    ]

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const fileName = `营收明细_${exportDateRange.value[0]}_${exportDateRange.value[1]}.xlsx`
    saveAs(blob, fileName)

    showSuccess('导出成功')
  } catch (error) {
    showError('导出失败')
  } finally {
    exporting.value = false
  }
}

const PaymentMethodLabel: Record<string, string> = {
  cash: '现金',
  wechat: '微信',
  alipay: '支付宝',
  credit: '记账'
}

onMounted(() => {
  loadDailyReport()
  loadMonthlyReport()
})
</script>

<style scoped lang="scss">
.reports {
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

  .content-card {
    :deep(.el-card__body) {
      padding: 20px;
    }

    .card-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #ebeef5;

      .report-tabs {
        :deep(.el-tabs__header) {
          margin-bottom: 0;
        }
      }

      .export-section {
        display: flex;
        gap: 12px;
        align-items: center;
      }
    }

    .stat-cards {
      margin-bottom: 32px;

      .stat-card {
        display: flex;
        align-items: center;
        gap: 20px;
        padding: 24px;
        border-radius: 8px;
        background: #fff;
        box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.08);

        &.revenue {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          .stat-icon, .stat-label, .stat-value {
            color: #fff;
          }
        }

        &.orders {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          .stat-icon, .stat-label, .stat-value {
            color: #fff;
          }
        }

        &.customers {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          .stat-icon, .stat-label, .stat-value {
            color: #fff;
          }
        }

        .stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
        }

        .stat-info {
          .stat-label {
            margin: 0 0 4px;
            font-size: 14px;
            opacity: 0.9;
          }

          .stat-value {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
        }
      }
    }

    .chart-section {
      .section-title {
        margin: 0 0 20px;
        font-size: 16px;
        font-weight: 600;
        color: #303133;
        padding-left: 8px;
        border-left: 3px solid #409eff;
      }

      .status-distribution {
        .status-item {
          margin-bottom: 16px;

          &:last-child {
            margin-bottom: 0;
          }

          .status-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;

            .status-count {
              font-size: 14px;
              color: #606266;
            }
          }
        }
      }
    }

    .monthly-report {
      .month-selector {
        margin-bottom: 24px;
      }
    }

    .bar-chart {
      display: flex;
      height: 300px;
      padding: 16px;
      background: #fafafa;
      border-radius: 8px;

      .chart-y-axis {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding-right: 12px;
        font-size: 12px;
        color: #909399;
        width: 80px;
        text-align: right;
      }

      .chart-bars {
        display: flex;
        flex: 1;
        align-items: flex-end;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 30px;
        position: relative;

        .bar-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          min-width: 40px;

          .bar-wrapper {
            display: flex;
            align-items: flex-end;
            height: 240px;
            width: 100%;
            justify-content: center;

            .bar {
              width: 32px;
              background: linear-gradient(180deg, #409eff 0%, #66b1ff 100%);
              border-radius: 4px 4px 0 0;
              transition: height 0.3s ease;
              min-height: 2px;
              cursor: pointer;

              &:hover {
                background: linear-gradient(180deg, #66b1ff 0%, #79bbff 100%);
              }
            }
          }

          .bar-label {
            position: absolute;
            bottom: 8px;
            font-size: 11px;
            color: #909399;
          }
        }
      }
    }
  }
}
</style>
