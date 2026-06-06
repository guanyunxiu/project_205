<template>
  <div class="stock-records">
    <div class="page-header">
      <h2 class="page-title">
        <el-icon :size="24"><Tickets /></el-icon>
        出入库记录
      </h2>
      <p class="page-desc">查看配件出入库历史记录</p>
    </div>

    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="配件">
          <el-select
            v-model="searchForm.partId"
            placeholder="全部配件"
            clearable
            filterable
            style="width: 220px"
          >
            <el-option label="全部配件" :value="undefined" />
            <el-option
              v-for="part in parts"
              :key="part.id"
              :label="`${part.name} (${part.code})`"
              :value="part.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select
            v-model="searchForm.type"
            placeholder="全部"
            clearable
            style="width: 140px"
          >
            <el-option label="全部" :value="undefined" />
            <el-option label="入库" value="in" />
            <el-option label="出库" value="out" />
          </el-select>
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
          <span class="card-title">出入库记录</span>
        </div>
      </template>

      <el-table
        :data="records"
        style="width: 100%"
        v-loading="loading"
        empty-text="暂无记录"
        stripe
      >
        <el-table-column label="时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="配件名称" width="200">
          <template #default="{ row }">
            {{ row.part_name }}
          </template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.type === 'in' ? 'success' : 'warning'">
              {{ row.type === 'in' ? '入库' : '出库' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="数量" width="100">
          <template #default="{ row }">
            {{ formatNumber(row.quantity) }}
          </template>
        </el-table-column>
        <el-table-column label="单价" width="120">
          <template #default="{ row }">
            {{ formatMoney(row.unit_price) }}
          </template>
        </el-table-column>
        <el-table-column label="操作员" width="120">
          <template #default="{ row }">
            {{ row.operator_name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="备注">
          <template #default="{ row }">
            {{ row.remark || '-' }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import {
  Tickets,
  Search,
  Refresh
} from '@element-plus/icons-vue'
import { stockRecordApi, partApi } from '@/api'
import {
  formatDate,
  formatMoney,
  formatNumber,
  showError
} from '@/utils'
import type { StockRecord, Part } from '@/types'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const loading = ref(false)
const records = ref<StockRecord[]>([])
const parts = ref<Part[]>([])

const searchForm = reactive({
  partId: undefined as number | undefined,
  type: undefined as 'in' | 'out' | undefined,
  dateRange: [] as string[]
})

async function loadRecords() {
  loading.value = true
  try {
    const params: any = {
      storeId: userStore.user?.store_id
    }
    if (searchForm.partId) {
      params.partId = searchForm.partId
    }
    if (searchForm.type) {
      params.type = searchForm.type
    }
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }
    records.value = await stockRecordApi.list(params)
  } catch (error) {
    showError('加载记录失败')
  } finally {
    loading.value = false
  }
}

async function loadParts() {
  try {
    parts.value = await partApi.list({ storeId: userStore.user?.store_id })
  } catch (error) {
    showError('加载配件列表失败')
  }
}

function handleSearch() {
  loadRecords()
}

function handleReset() {
  searchForm.partId = undefined
  searchForm.type = undefined
  searchForm.dateRange = []
  loadRecords()
}

onMounted(() => {
  loadParts()
  loadRecords()
})
</script>

<style scoped lang="scss">
.stock-records {
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
