<template>
  <div class="work-orders">
    <div class="page-header">
      <h2 class="page-title">
        <el-icon :size="24"><Document /></el-icon>
        维保工单
      </h2>
      <p class="page-desc">管理和查看所有维保工单信息</p>
    </div>

    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 140px">
            <el-option label="全部" value="" />
            <el-option
              v-for="(item, key) in OrderStatusMap"
              :key="key"
              :label="item.label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="工单号/客户/车牌"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
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
          <span class="card-title">工单列表</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新建工单
          </el-button>
        </div>
      </template>

      <el-table
        :data="workOrders"
        style="width: 100%"
        v-loading="loading"
        empty-text="暂无工单数据"
        stripe
      >
        <el-table-column prop="order_no" label="工单号" width="160" />
        <el-table-column prop="customer_name" label="客户" width="120" />
        <el-table-column prop="plate_number" label="车牌号" width="120" />
        <el-table-column label="服务类型" width="100">
          <template #default="{ row }">
            {{ ServiceTypeMap[row.service_type as keyof typeof ServiceTypeMap] }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="OrderStatusMap[row.status as keyof typeof OrderStatusMap].type as any">
              {{ OrderStatusMap[row.status as keyof typeof OrderStatusMap].label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="120">
          <template #default="{ row }">
            {{ formatMoney(row.total_amount) }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Document,
  Search,
  Refresh,
  Plus,
  View
} from '@element-plus/icons-vue'
import { workOrderApi } from '@/api'
import { formatDate, formatMoney, showError } from '@/utils'
import type { WorkOrder } from '@/types'
import { OrderStatusMap, ServiceTypeMap } from '@/types'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const workOrders = ref<WorkOrder[]>([])

const searchForm = reactive({
  status: '',
  keyword: '',
  dateRange: [] as string[]
})

async function loadWorkOrders() {
  loading.value = true
  try {
    const params: any = {
      storeId: userStore.user?.store_id
    }
    if (searchForm.status) {
      params.status = searchForm.status
    }
    if (searchForm.keyword) {
      params.keyword = searchForm.keyword
    }
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }
    workOrders.value = await workOrderApi.list(params)
  } catch (error) {
    showError('加载工单列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  loadWorkOrders()
}

function handleReset() {
  searchForm.status = ''
  searchForm.keyword = ''
  searchForm.dateRange = []
  loadWorkOrders()
}

function handleAdd() {
  router.push('/work-orders/new')
}

function handleViewDetail(row: WorkOrder) {
  router.push(`/work-orders/${row.id}`)
}

onMounted(() => {
  loadWorkOrders()
})
</script>

<style scoped lang="scss">
.work-orders {
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
}
</style>
