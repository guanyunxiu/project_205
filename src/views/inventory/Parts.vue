<template>
  <div class="parts">
    <div class="page-header">
      <h2 class="page-title">
        <el-icon :size="24"><Goods /></el-icon>
        配件库存
      </h2>
      <p class="page-desc">管理配件信息和库存操作</p>
    </div>

    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="名称/编码/规格"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="分类">
          <el-select
            v-model="searchForm.category"
            placeholder="全部"
            clearable
            style="width: 160px"
          >
            <el-option label="全部" value="" />
            <el-option
              v-for="cat in categories"
              :key="cat"
              :label="cat"
              :value="cat"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="库存预警">
          <el-switch v-model="searchForm.lowStock" active-text="只看预警" />
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
          <span class="card-title">配件列表</span>
          <div class="toolbar">
            <el-button type="primary" @click="handleAdd">
              <el-icon><Plus /></el-icon>
              新增配件
            </el-button>
            <el-button type="success" @click="openStockInDialog">
              <el-icon><Bottom /></el-icon>
              入库
            </el-button>
            <el-button type="warning" @click="openStockOutDialog">
              <el-icon><Top /></el-icon>
              出库
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="parts"
        style="width: 100%"
        v-loading="loading"
        empty-text="暂无配件数据"
        stripe
      >
        <el-table-column prop="code" label="配件编码" width="140" />
        <el-table-column prop="name" label="名称" width="160" />
        <el-table-column prop="spec" label="规格" width="140" />
        <el-table-column prop="unit" label="单位" width="80" />
        <el-table-column label="进价" width="120">
          <template #default="{ row }">
            {{ formatMoney(row.purchase_price) }}
          </template>
        </el-table-column>
        <el-table-column label="售价" width="120">
          <template #default="{ row }">
            {{ formatMoney(row.sale_price) }}
          </template>
        </el-table-column>
        <el-table-column label="库存" width="100">
          <template #default="{ row }">
            <span :class="{ 'text-danger': row.stock <= row.min_stock }">
              {{ formatNumber(row.stock) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="最低库存" width="100">
          <template #default="{ row }">
            {{ formatNumber(row.min_stock) }}
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
            <el-button type="success" link @click="openStockInDialog(row)">入库</el-button>
            <el-button type="warning" link @click="openStockOutDialog(row)">出库</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="partDialogVisible"
      :title="isEdit ? '编辑配件' : '新增配件'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="partFormRef"
        :model="partForm"
        :rules="partFormRules"
        label-width="100px"
      >
        <el-form-item label="配件编码" prop="code">
          <el-input v-model="partForm.code" placeholder="请输入配件编码" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="partForm.name" placeholder="请输入配件名称" />
        </el-form-item>
        <el-form-item label="规格" prop="spec">
          <el-input v-model="partForm.spec" placeholder="请输入规格" />
        </el-form-item>
        <el-form-item label="单位" prop="unit">
          <el-input v-model="partForm.unit" placeholder="如：个、件、套" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="进价" prop="purchase_price">
              <el-input-number
                v-model="partForm.purchase_price"
                :min="0"
                :precision="2"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="售价" prop="sale_price">
              <el-input-number
                v-model="partForm.sale_price"
                :min="0"
                :precision="2"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="初始库存" prop="stock">
              <el-input-number
                v-model="partForm.stock"
                :min="0"
                :precision="0"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="最低库存" prop="min_stock">
              <el-input-number
                v-model="partForm.min_stock"
                :min="0"
                :precision="0"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="分类" prop="category">
          <el-select
            v-model="partForm.category"
            placeholder="请选择或输入分类"
            allow-create
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="cat in categories"
              :key="cat"
              :label="cat"
              :value="cat"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="partForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="partDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmitPart">
          确定
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="stockInDialogVisible"
      title="配件入库"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="stockInFormRef"
        :model="stockInForm"
        :rules="stockInFormRules"
        label-width="80px"
      >
        <el-form-item label="配件" prop="partId">
          <el-select
            v-model="stockInForm.partId"
            placeholder="请选择配件"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="part in parts"
              :key="part.id"
              :label="`${part.name} (${part.code})`"
              :value="part.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="数量" prop="quantity">
          <el-input-number
            v-model="stockInForm.quantity"
            :min="1"
            :precision="0"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="单价" prop="unitPrice">
          <el-input-number
            v-model="stockInForm.unitPrice"
            :min="0"
            :precision="2"
            style="width: 100%"
            placeholder="可选，默认为进价"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="stockInForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="stockInDialogVisible = false">取消</el-button>
        <el-button type="success" :loading="submitting" @click="handleStockIn">
          确认入库
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="stockOutDialogVisible"
      title="配件出库"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="stockOutFormRef"
        :model="stockOutForm"
        :rules="stockOutFormRules"
        label-width="80px"
      >
        <el-form-item label="配件" prop="partId">
          <el-select
            v-model="stockOutForm.partId"
            placeholder="请选择配件"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="part in parts"
              :key="part.id"
              :label="`${part.name} (${part.code}) 库存: ${part.stock}`"
              :value="part.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="数量" prop="quantity">
          <el-input-number
            v-model="stockOutForm.quantity"
            :min="1"
            :max="maxStockOutQuantity"
            :precision="0"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="单价" prop="unitPrice">
          <el-input-number
            v-model="stockOutForm.unitPrice"
            :min="0"
            :precision="2"
            style="width: 100%"
            placeholder="可选，默认为售价"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="stockOutForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="stockOutDialogVisible = false">取消</el-button>
        <el-button type="warning" :loading="submitting" @click="handleStockOut">
          确认出库
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import {
  Goods,
  Search,
  Refresh,
  Plus,
  Bottom,
  Top
} from '@element-plus/icons-vue'
import { partApi } from '@/api'
import {
  formatMoney,
  formatNumber,
  showError,
  showSuccess,
  showWarning,
  confirm
} from '@/utils'
import type { Part } from '@/types'
import { useUserStore } from '@/stores/user'
import type { FormInstance, FormRules } from 'element-plus'

const userStore = useUserStore()

const loading = ref(false)
const submitting = ref(false)
const parts = ref<Part[]>([])
const categories = ref<string[]>([])

const partDialogVisible = ref(false)
const stockInDialogVisible = ref(false)
const stockOutDialogVisible = ref(false)
const isEdit = ref(false)
const currentPartId = ref<number | null>(null)

const partFormRef = ref<FormInstance>()
const stockInFormRef = ref<FormInstance>()
const stockOutFormRef = ref<FormInstance>()

const searchForm = reactive({
  keyword: '',
  category: '',
  lowStock: false
})

const partForm = reactive({
  code: '',
  name: '',
  spec: '',
  unit: '',
  purchase_price: 0,
  sale_price: 0,
  stock: 0,
  min_stock: 0,
  category: '',
  remark: ''
})

const stockInForm = reactive({
  partId: 0,
  quantity: 1,
  unitPrice: undefined as number | undefined,
  remark: ''
})

const stockOutForm = reactive({
  partId: 0,
  quantity: 1,
  unitPrice: undefined as number | undefined,
  remark: ''
})

const partFormRules: FormRules = {
  code: [{ required: true, message: '请输入配件编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入配件名称', trigger: 'blur' }],
  spec: [{ required: true, message: '请输入规格', trigger: 'blur' }],
  unit: [{ required: true, message: '请输入单位', trigger: 'blur' }],
  purchase_price: [{ required: true, message: '请输入进价', trigger: 'blur' }],
  sale_price: [{ required: true, message: '请输入售价', trigger: 'blur' }],
  stock: [{ required: true, message: '请输入初始库存', trigger: 'blur' }],
  min_stock: [{ required: true, message: '请输入最低库存', trigger: 'blur' }],
  category: [{ required: true, message: '请选择或输入分类', trigger: 'change' }]
}

const stockInFormRules: FormRules = {
  partId: [{ required: true, message: '请选择配件', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }]
}

const stockOutFormRules: FormRules = {
  partId: [{ required: true, message: '请选择配件', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }]
}

const maxStockOutQuantity = computed(() => {
  const part = parts.value.find(p => p.id === stockOutForm.partId)
  return part ? part.stock : 0
})

async function loadParts() {
  loading.value = true
  try {
    const params: any = {
      storeId: userStore.user?.store_id
    }
    if (searchForm.keyword) {
      params.keyword = searchForm.keyword
    }
    if (searchForm.category) {
      params.category = searchForm.category
    }
    if (searchForm.lowStock) {
      params.lowStock = true
    }
    parts.value = await partApi.list(params)
  } catch (error) {
    showError('加载配件列表失败')
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try {
    categories.value = await partApi.categories()
  } catch (error) {
    showError('加载分类失败')
  }
}

function handleSearch() {
  loadParts()
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.category = ''
  searchForm.lowStock = false
  loadParts()
}

function handleAdd() {
  isEdit.value = false
  currentPartId.value = null
  Object.assign(partForm, {
    code: '',
    name: '',
    spec: '',
    unit: '',
    purchase_price: 0,
    sale_price: 0,
    stock: 0,
    min_stock: 0,
    category: '',
    remark: ''
  })
  partDialogVisible.value = true
}

function handleEdit(row: Part) {
  isEdit.value = true
  currentPartId.value = row.id
  Object.assign(partForm, {
    code: row.code,
    name: row.name,
    spec: row.spec,
    unit: row.unit,
    purchase_price: row.purchase_price,
    sale_price: row.sale_price,
    stock: row.stock,
    min_stock: row.min_stock,
    category: row.category,
    remark: row.remark
  })
  partDialogVisible.value = true
}

async function handleDelete(row: Part) {
  const ok = await confirm(`确定删除配件"${row.name}"吗？`)
  if (!ok) return

  loading.value = true
  try {
    await partApi.delete(row.id)
    showSuccess('删除成功')
    loadParts()
    loadCategories()
  } catch (error) {
    showError('删除失败')
  } finally {
    loading.value = false
  }
}

async function handleSubmitPart() {
  if (!partFormRef.value) return

  await partFormRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      if (isEdit.value && currentPartId.value) {
        await partApi.update(currentPartId.value, {
          code: partForm.code,
          name: partForm.name,
          spec: partForm.spec,
          unit: partForm.unit,
          purchase_price: partForm.purchase_price,
          sale_price: partForm.sale_price,
          min_stock: partForm.min_stock,
          category: partForm.category,
          remark: partForm.remark
        })
        showSuccess('编辑成功')
      } else {
        await partApi.create({
          code: partForm.code,
          name: partForm.name,
          spec: partForm.spec,
          unit: partForm.unit,
          purchase_price: partForm.purchase_price,
          sale_price: partForm.sale_price,
          stock: partForm.stock,
          min_stock: partForm.min_stock,
          category: partForm.category,
          remark: partForm.remark,
          store_id: userStore.user?.store_id!
        })
        showSuccess('新增成功')
      }
      partDialogVisible.value = false
      loadParts()
      loadCategories()
    } catch (error) {
      showError(isEdit.value ? '编辑失败' : '新增失败')
    } finally {
      submitting.value = false
    }
  })
}

function openStockInDialog(part?: Part) {
  stockInForm.partId = part?.id || 0
  stockInForm.quantity = 1
  stockInForm.unitPrice = part?.purchase_price
  stockInForm.remark = ''
  stockInDialogVisible.value = true
}

async function handleStockIn() {
  if (!stockInFormRef.value) return

  await stockInFormRef.value.validate(async (valid) => {
    if (!valid) return

    const ok = await confirm(`确认入库 ${stockInForm.quantity} 件配件吗？`)
    if (!ok) return

    submitting.value = true
    try {
      await partApi.stockIn({
        partId: stockInForm.partId,
        quantity: stockInForm.quantity,
        unitPrice: stockInForm.unitPrice,
        operatorId: userStore.user?.id,
        remark: stockInForm.remark,
        storeId: userStore.user?.store_id!
      })
      showSuccess('入库成功')
      stockInDialogVisible.value = false
      loadParts()
    } catch (error) {
      showError('入库失败')
    } finally {
      submitting.value = false
    }
  })
}

function openStockOutDialog(part?: Part) {
  stockOutForm.partId = part?.id || 0
  stockOutForm.quantity = 1
  stockOutForm.unitPrice = part?.sale_price
  stockOutForm.remark = ''
  stockOutDialogVisible.value = true
}

async function handleStockOut() {
  if (!stockOutFormRef.value) return

  await stockOutFormRef.value.validate(async (valid) => {
    if (!valid) return

    const part = parts.value.find(p => p.id === stockOutForm.partId)
    if (part && stockOutForm.quantity > part.stock) {
      showWarning('出库数量不能大于库存数量')
      return
    }

    const ok = await confirm(`确认出库 ${stockOutForm.quantity} 件配件吗？`)
    if (!ok) return

    submitting.value = true
    try {
      await partApi.stockOut({
        partId: stockOutForm.partId,
        quantity: stockOutForm.quantity,
        unitPrice: stockOutForm.unitPrice,
        operatorId: userStore.user?.id,
        remark: stockOutForm.remark,
        storeId: userStore.user?.store_id!
      })
      showSuccess('出库成功')
      stockOutDialogVisible.value = false
      loadParts()
    } catch (error) {
      showError('出库失败')
    } finally {
      submitting.value = false
    }
  })
}

onMounted(() => {
  loadParts()
  loadCategories()
})
</script>

<style scoped lang="scss">
.parts {
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

      .toolbar {
        display: flex;
        gap: 8px;
      }
    }

    :deep(.el-table) {
      font-size: 13px;

      .text-danger {
        color: #f56c6c;
        font-weight: 600;
      }
    }
  }
}
</style>
